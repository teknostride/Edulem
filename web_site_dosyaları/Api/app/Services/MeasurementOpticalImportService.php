<?php

namespace App\Services;

use App\Models\MeasurementTrial;
use App\Models\MeasurementTrialBooklet;
use App\Models\MeasurementTrialImport;
use App\Models\MeasurementTrialResult;
use App\Models\Student;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Storage;
use PhpOffice\PhpSpreadsheet\IOFactory;

class MeasurementOpticalImportService
{
    public function import(MeasurementTrial $trial, ?MeasurementTrialBooklet $booklet, UploadedFile $file, int $userId): array
    {
        $tenantId = (int) $trial->tenant_id;
        $disk = 'local';
        $folder = "tenants/{$tenantId}/measurement/optical";
        $path = Storage::disk($disk)->putFile($folder, $file);

        $import = MeasurementTrialImport::create([
            'tenant_id' => $tenantId,
            'trial_id' => $trial->id,
            'booklet_id' => $booklet?->id,
            'file_path' => $path,
            'original_name' => $file->getClientOriginalName(),
            'status' => 'processing',
            'imported_by' => $userId,
            'imported_at' => now(),
        ]);

        try {
            $rows = $this->readRows($disk, $path);

            $summary = [
                'processed' => 0,
                'inserted' => 0,
                'updated' => 0,
                'skipped' => 0,
            ];
            $errors = [];

            foreach ($rows as $i => $row) {
                $summary['processed']++;

                $schoolNo = trim((string) ($row['school_no'] ?? $row['okul_no'] ?? $row['schoolNo'] ?? ''));
                $answersRaw = (string) ($row['answers'] ?? $row['cevaplar'] ?? $row['answers_raw'] ?? '');
                $bookletName = trim((string) ($row['booklet'] ?? $row['kitapcik'] ?? $row['booklet_name'] ?? ''));

                if ($schoolNo === '') {
                    $summary['skipped']++;
                    $errors[] = ['row' => $i + 1, 'error' => 'school_no boş'];
                    continue;
                }

                $student = Student::query()
                    ->where('tenant_id', $tenantId)
                    ->where('school_no', $schoolNo)
                    ->first();

                if (!$student) {
                    $summary['skipped']++;
                    $errors[] = ['row' => $i + 1, 'error' => 'Öğrenci bulunamadı', 'school_no' => $schoolNo];
                    continue;
                }

                $targetBooklet = $booklet;
                if (!$targetBooklet && $bookletName !== '') {
                    $targetBooklet = MeasurementTrialBooklet::query()
                        ->where('trial_id', $trial->id)
                        ->where('name', $bookletName)
                        ->first();
                }

                if (!$targetBooklet) {
                    $summary['skipped']++;
                    $errors[] = ['row' => $i + 1, 'error' => 'Kitapçık bulunamadı', 'school_no' => $schoolNo];
                    continue;
                }

                $answerKey = $this->normalizeAnswerKey($targetBooklet->answer_key);
                if (empty($answerKey)) {
                    $summary['skipped']++;
                    $errors[] = ['row' => $i + 1, 'error' => 'Cevap anahtarı boş', 'booklet' => $targetBooklet->name];
                    continue;
                }

                $answers = $this->normalizeAnswers($answersRaw, count($answerKey));

                $correct = 0;
                $wrong = 0;
                $blank = 0;

                foreach ($answerKey as $idx => $key) {
                    $a = $answers[$idx] ?? '';
                    if ($a === '') {
                        $blank++;
                        continue;
                    }
                    if ($a === $key) {
                        $correct++;
                    } else {
                        $wrong++;
                    }
                }

                $net = $correct - ($wrong * 0.25);

                $result = MeasurementTrialResult::query()
                    ->where('trial_id', $trial->id)
                    ->where('student_id', $student->id)
                    ->first();

                $payload = [
                    'tenant_id' => $tenantId,
                    'trial_id' => $trial->id,
                    'student_id' => $student->id,
                    'booklet_id' => $targetBooklet->id,
                    'correct' => $correct,
                    'wrong' => $wrong,
                    'blank' => $blank,
                    'net' => round($net, 2),
                    'raw_answers' => $answers,
                    'calculated_at' => now(),
                ];

                if ($result) {
                    $result->update($payload);
                    $summary['updated']++;
                } else {
                    MeasurementTrialResult::create($payload);
                    $summary['inserted']++;
                }
            }

            $import->update([
                'status' => 'completed',
                'summary' => $summary,
                'errors' => $errors,
            ]);

            return [
                'import' => $import->fresh(),
                'summary' => $summary,
                'errors' => $errors,
            ];
        } catch (\Throwable $e) {
            $import->update([
                'status' => 'failed',
                'errors' => [['error' => $e->getMessage()]],
            ]);

            throw $e;
        }
    }

    private function readRows(string $disk, string $path): array
    {
        $absolute = Storage::disk($disk)->path($path);
        $ext = strtolower(pathinfo($absolute, PATHINFO_EXTENSION));

        if ($ext === 'csv') {
            return $this->readCsv($absolute);
        }

        if (in_array($ext, ['xlsx', 'xls'], true)) {
            return $this->readSpreadsheet($absolute);
        }

        throw new \RuntimeException('Desteklenmeyen dosya türü: ' . $ext);
    }

    private function readCsv(string $absolutePath): array
    {
        $handle = fopen($absolutePath, 'r');
        if (!$handle) {
            throw new \RuntimeException('CSV dosyası açılamadı');
        }

        $rows = [];
        $headers = null;
        while (($data = fgetcsv($handle, 0, ',')) !== false) {
            if ($headers === null) {
                $headers = array_map(fn ($h) => $this->normalizeHeader($h), $data);
                continue;
            }

            if ($headers === []) {
                continue;
            }

            $row = [];
            foreach ($headers as $idx => $h) {
                if ($h === '') {
                    continue;
                }
                $row[$h] = $data[$idx] ?? null;
            }
            if ($row !== []) {
                $rows[] = $row;
            }
        }
        fclose($handle);

        return $rows;
    }

    private function readSpreadsheet(string $absolutePath): array
    {
        $spreadsheet = IOFactory::load($absolutePath);
        $sheet = $spreadsheet->getActiveSheet();
        $raw = $sheet->toArray(null, true, true, true);

        if (count($raw) < 2) {
            return [];
        }

        $headerRow = array_shift($raw);
        $headers = [];
        foreach ($headerRow as $col => $value) {
            $headers[$col] = $this->normalizeHeader((string) $value);
        }

        $rows = [];
        foreach ($raw as $r) {
            $row = [];
            foreach ($headers as $col => $key) {
                if ($key === '') {
                    continue;
                }
                $row[$key] = $r[$col] ?? null;
            }
            if ($row !== []) {
                $rows[] = $row;
            }
        }

        return $rows;
    }

    private function normalizeHeader(string $header): string
    {
        $h = strtolower(trim($header));
        $h = str_replace([' ', '-', '\t', '\n', '\r'], '_', $h);
        $h = preg_replace('/_+/', '_', $h);
        return $h ?? '';
    }

    private function normalizeAnswerKey($answerKey): array
    {
        if (is_string($answerKey)) {
            $answerKey = str_split(preg_replace('/\s+/', '', strtoupper($answerKey)));
        }

        if (!is_array($answerKey)) {
            return [];
        }

        $out = [];
        foreach ($answerKey as $v) {
            $val = strtoupper(trim((string) $v));
            if ($val === '-' || $val === '_' || $val === '0') {
                $val = '';
            }
            $out[] = $val;
        }

        while (!empty($out) && end($out) === '') {
            array_pop($out);
        }

        return $out;
    }

    private function normalizeAnswers(string $answersRaw, int $expectedCount): array
    {
        $raw = strtoupper(trim($answersRaw));
        $raw = preg_replace('/\s+/', '', $raw);
        $raw = str_replace(['.', ',', ';', '|'], '', $raw);

        $arr = str_split($raw);
        $out = [];
        for ($i = 0; $i < $expectedCount; $i++) {
            $v = $arr[$i] ?? '';
            $v = strtoupper(trim((string) $v));
            if ($v === '-' || $v === '_' || $v === '0') {
                $v = '';
            }
            $out[] = $v;
        }

        return $out;
    }
}
