<?php

namespace App\Http\Controllers;

use App\Models\OmrCourse;
use App\Models\OmrTopic;
use App\Models\OmrTemplate;
use App\Models\OmrExam;
use App\Models\OmrExamCourse;
use App\Models\OmrAnswerKey;
use App\Models\OmrResult;
use App\Models\OmrSession;
use App\Models\Student;
use App\Models\ScheduledSms;
use App\Models\SmsReport;
use App\Services\IletibilgiService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;
use Barryvdh\DomPDF\Facade\Pdf;
use PhpOffice\PhpSpreadsheet\Spreadsheet;
use PhpOffice\PhpSpreadsheet\Writer\Xlsx;
use PhpOffice\PhpSpreadsheet\Reader\Xlsx as XlsxReader;
use PhpOffice\PhpSpreadsheet\IOFactory;

class OmrController extends ApiController
{
    private const BOOKLETS = ['A', 'B', 'C', 'D'];

    private function parseExamIdsFromRequest(Request $request, int $fallbackExamId): array
    {
        $raw = $request->get('exam_ids', []);

        // Sometimes frontend may send a single string like "5:1" or "5,1" etc.
        if (is_string($raw)) {
            preg_match_all('/\d+/', $raw, $m);
            $ids = array_map('intval', $m[0] ?? []);
            $ids = array_values(array_filter($ids, fn($x) => $x > 0));
            return !empty($ids) ? $ids : [$fallbackExamId];
        }

        $ids = array_filter(array_map('intval', (array) $raw));
        return !empty($ids) ? array_values($ids) : [$fallbackExamId];
    }

    private function normalizeCourseNameKey(string $name): string
    {
        $name = trim($this->toUtf8($name));
        $name = preg_replace('/\s+/u', ' ', $name) ?? $name;
        $name = mb_strtolower($name, 'UTF-8');
        return $name;
    }

    private function resolveRoleName(): ?string
    {
        $user = auth()->user();
        if (!$user) {
            return null;
        }

        $name = $user->role?->name
            ?? ($user->role_name ?? null)
            ?? ($user->role ?? null)
            ?? null;

        if ($name) {
            return $name;
        }

        $roleId = $user->role_id ?? null;
        if ($roleId) {
            $dbName = DB::table('roles')->where('id', (int) $roleId)->value('name');
            if (is_string($dbName) && $dbName !== '') {
                return $dbName;
            }
        }

        return null;
    }

    private function isStaffOrAdmin(?\App\Models\User $user): bool
    {
        if (!$user) {
            return false;
        }
        if (!empty($user->is_superadmin)) {
            return true;
        }

        $roleName = $user->role?->name
            ?? ($user->role_name ?? null)
            ?? ($user->role ?? null)
            ?? $this->resolveRoleName();

        $staffRoles = [
            'owner',
            'Admin',
            'admin',
            'SuperAdmin',
            'super_admin',
            'Müdür',
            'Müdür Yardımcısı',
            'Kampüs Müdürü',
            'Genel Müdür',
            'Rehberlik',
            'guidance',
            'Rehber Öğretmen',
            'rehber_teacher',
            'guidance_teacher',
            'Rehberlik Öğretmeni',
            'Öğrenci İşleri',
            'student_affairs',
            'ogrenci_isleri',
        ];

        return in_array($roleName, $staffRoles, true);
    }

    private function toUtf8(string $value): string
    {
        if ($value === '') {
            return '';
        }

        if (mb_detect_encoding($value, 'UTF-8', true)) {
            return $value;
        }

        return mb_convert_encoding($value, 'UTF-8', 'Windows-1254,ISO-8859-9,ISO-8859-1,UTF-8');
    }

    private function utf8izeMixed(mixed $value): mixed
    {
        if (is_string($value)) {
            return $this->toUtf8($value);
        }

        if (is_array($value)) {
            foreach ($value as $k => $v) {
                $value[$k] = $this->utf8izeMixed($v);
            }
            return $value;
        }

        if ($value instanceof \Illuminate\Support\Collection) {
            return $value->map(fn($item) => $this->utf8izeMixed($item))->values()->all();
        }

        if (is_object($value) && method_exists($value, 'toArray')) {
            return $this->utf8izeMixed($value->toArray());
        }

        return $value;
    }

    private function normalizeNameKey(string $value): string
    {
        $value = $this->toUtf8(trim($value));
        if ($value === '') {
            return '';
        }

        $value = mb_strtoupper($value, 'UTF-8');
        $value = strtr($value, [
            'İ' => 'I',
            'I' => 'I',
            'Ş' => 'S',
            'Ğ' => 'G',
            'Ü' => 'U',
            'Ö' => 'O',
            'Ç' => 'C',
            'Â' => 'A',
            'Ê' => 'E',
            'Î' => 'I',
            'Ô' => 'O',
            'Û' => 'U',
        ]);

        return preg_replace('/[^A-Z0-9]/u', '', $value) ?? '';
    }

    private function normalizeTcNo(string $value): string
    {
        $digits = preg_replace('/\D+/', '', $this->toUtf8(trim($value))) ?? '';
        return $digits;
    }

    private function normalizeNameTokens(string $value): array
    {
        $value = $this->toUtf8(trim($value));
        if ($value === '') {
            return [];
        }

        $value = mb_strtoupper($value, 'UTF-8');
        $value = strtr($value, [
            'İ' => 'I',
            'I' => 'I',
            'Ş' => 'S',
            'Ğ' => 'G',
            'Ü' => 'U',
            'Ö' => 'O',
            'Ç' => 'C',
            'Â' => 'A',
            'Ê' => 'E',
            'Î' => 'I',
            'Ô' => 'O',
            'Û' => 'U',
        ]);

        $value = preg_replace('/[^A-Z0-9\s]/u', ' ', $value) ?? '';
        $parts = preg_split('/\s+/', trim($value)) ?: [];

        $tokens = [];
        foreach ($parts as $p) {
            $p = trim((string) $p);
            if ($p === '') continue;
            if (strlen($p) <= 1) continue;
            $tokens[] = $p;
        }

        $tokens = array_values(array_unique($tokens));
        sort($tokens);
        return $tokens;
    }

    private function nameSimilarityScore(string $a, string $b): float
    {
        $ta = $this->normalizeNameTokens($a);
        $tb = $this->normalizeNameTokens($b);
        if (count($ta) === 0 || count($tb) === 0) {
            return 0.0;
        }

        $setA = array_fill_keys($ta, true);
        $setB = array_fill_keys($tb, true);
        $intersect = 0;
        foreach ($setA as $k => $_) {
            if (isset($setB[$k])) $intersect++;
        }

        $tokenScore = $intersect / max(count($setA), count($setB));

        $ka = $this->normalizeNameKey($a);
        $kb = $this->normalizeNameKey($b);
        if ($ka === '' || $kb === '') {
            return $tokenScore;
        }

        $maxLen = max(strlen($ka), strlen($kb));
        if ($maxLen === 0) {
            return $tokenScore;
        }

        $dist = levenshtein($ka, $kb);
        $levScore = max(0.0, 1.0 - ($dist / $maxLen));
        return (0.7 * $tokenScore) + (0.3 * $levScore);
    }

    private function buildStudentLookup(int $tenantId): array
    {
        $students = Student::where('tenant_id', $tenantId)
            ->where('is_active', true)
            ->with(['classroom:id,name'])
            ->select(['id', 'tc_no', 'school_no', 'name', 'classroom_id'])
            ->get();

        $byTcNo = [];
        $bySchoolNo = [];
        $byName = [];

        foreach ($students as $student) {
            $tcNo = $this->normalizeTcNo((string) ($student->tc_no ?? ''));
            if ($tcNo !== '' && !isset($byTcNo[$tcNo])) {
                $byTcNo[$tcNo] = $student;
            }

            $schoolNo = trim((string) ($student->school_no ?? ''));
            if ($schoolNo !== '' && !isset($bySchoolNo[$schoolNo])) {
                $bySchoolNo[$schoolNo] = $student;
            }

            $nameKey = $this->normalizeNameKey((string) ($student->name ?? ''));
            if ($nameKey !== '') {
                $byName[$nameKey] = $byName[$nameKey] ?? [];
                $byName[$nameKey][] = $student;
            }
        }

        return [$byTcNo, $byName, $bySchoolNo, $students];
    }

    private function parseOmrRows(array $lines, array $rules): array
    {
        $rows = [];
        foreach ($lines as $lineNo => $line) {
            $rawLine = rtrim((string) $line, "\r\n");
            $parsedFields = [];
            foreach (['tc_no', 'school_no', 'full_name', 'classroom_section', 'gender'] as $f) {
                if (!empty($rules[$f])) {
                    $parsedFields[$f] = $this->extractField($rawLine, $rules[$f]);
                }
            }

            foreach (($rules['custom_fields'] ?? []) as $cf) {
                $key = (string) ($cf['key'] ?? '');
                if ($key !== '') {
                    $parsedFields[$key] = $this->extractField($rawLine, $cf);
                }
            }

            $bookletType = strtoupper($this->extractField($rawLine, $rules['booklet_type'] ?? []));
            if (!in_array($bookletType, self::BOOKLETS, true)) {
                $bookletType = 'A';
            }

            $rawAnswers = [];
            foreach (($rules['courses'] ?? []) as $courseRule) {
                $cId = (int) ($courseRule['course_id'] ?? 0);
                if ($cId <= 0) {
                    continue;
                }
                $rawAnswers[$cId] = $this->extractRawField($rawLine, $courseRule);
            }

            $rows[] = [
                'row_no' => $lineNo + 1,
                'txt_tc_no' => (string) ($parsedFields['tc_no'] ?? ''),
                'txt_full_name' => (string) ($parsedFields['full_name'] ?? ''),
                'txt_school_no' => (string) ($parsedFields['school_no'] ?? ''),
                'txt_classroom_section' => (string) ($parsedFields['classroom_section'] ?? ''),
                'txt_gender' => (string) ($parsedFields['gender'] ?? ''),
                'booklet_type' => $bookletType,
                'parsed_fields' => $parsedFields,
                'raw_answers' => $rawAnswers,
                'match_status' => 'unmatched',
                'matched_by' => null,
                'db_student_id' => null,
                'db_student_name' => null,
            ];
        }

        return $rows;
    }

    private function applyAutoMatch(array $rows, int $tenantId): array
    {
        [$studentsByTcNo, $studentsByName, $studentsBySchoolNo, $students] = $this->buildStudentLookup($tenantId);

        $matched = 0;
        foreach ($rows as &$row) {
            $row['match_status'] = 'unmatched';
            $row['matched_by'] = null;
            $row['db_student_id'] = null;
            $row['db_student_name'] = null;
            $row['match_suggestions'] = [];

            $tcNo = $this->normalizeTcNo((string) (($row['parsed_fields']['tc_no'] ?? null) ?? ($row['txt_tc_no'] ?? '')));
            $nameKey = $this->normalizeNameKey((string) ($row['txt_full_name'] ?? ''));
            $schoolNo = trim((string) ($row['txt_school_no'] ?? ''));

            if ($tcNo !== '' && isset($studentsByTcNo[$tcNo])) {
                $student = $studentsByTcNo[$tcNo];
                $row['db_student_id'] = $student->id;
                $row['db_student_name'] = $student->name;
                $row['match_status'] = 'matched';
                $row['matched_by'] = 'tc_no';
                $matched++;
                continue;
            }

            $nameCandidates = $nameKey !== '' ? ($studentsByName[$nameKey] ?? []) : [];
            if (count($nameCandidates) === 1) {
                $student = $nameCandidates[0];
                $row['db_student_id'] = $student->id;
                $row['db_student_name'] = $student->name;
                $row['match_status'] = 'matched';
                $row['matched_by'] = 'full_name';
                $matched++;
                continue;
            }

            if ($schoolNo !== '' && isset($studentsBySchoolNo[$schoolNo])) {
                $student = $studentsBySchoolNo[$schoolNo];
                $row['db_student_id'] = $student->id;
                $row['db_student_name'] = $student->name;
                $row['match_status'] = 'matched';
                $row['matched_by'] = 'school_no';
                $matched++;
                continue;
            }

            $rawName = (string) ($row['txt_full_name'] ?? '');
            if (trim($rawName) !== '' && count($students) > 0) {
                $candidates = [];
                foreach ($students as $s) {
                    $score = $this->nameSimilarityScore($rawName, (string) ($s->name ?? ''));
                    if ($score <= 0) continue;
                    $candidates[] = [
                        'id' => (int) $s->id,
                        'name' => (string) ($s->name ?? ''),
                        'school_no' => (string) ($s->school_no ?? ''),
                        'classroom_name' => (string) ($s->classroom?->name ?? ''),
                        'score' => round($score * 100, 1),
                    ];
                }

                usort($candidates, fn($a, $b) => ($b['score'] <=> $a['score']));
                $row['match_suggestions'] = array_slice($candidates, 0, 5);
            }
        }

        return [$rows, $matched];
    }

    private function calculateMatchedRows(OmrExam $exam, array $rows): array
    {
        $answerMap = $this->buildBookletAnswerMap($exam->id);
        $coeffMap = $this->buildExamCourseCoefficientMap($exam->id, $exam->exam_type);
        $tenantId = $this->tenantId();

        $calculatedRows = [];
        $skipped = 0;
        $errors = [];

        $students = Student::where('tenant_id', $tenantId)
            ->whereIn('id', collect($rows)->pluck('db_student_id')->filter()->map(fn($v) => (int) $v)->unique()->values())
            ->select(['id', 'school_no', 'name'])
            ->get()
            ->keyBy('id');

        foreach ($rows as $row) {
            try {
                $studentId = (int) ($row['db_student_id'] ?? 0);
                if ($studentId <= 0 || !isset($students[$studentId])) {
                    $skipped++;
                    $errors[] = 'Satır ' . ((int) ($row['row_no'] ?? 0)) . ': geçerli öğrenci eşleşmesi yok.';
                    continue;
                }

                $bookletType = strtoupper((string) ($row['booklet_type'] ?? 'A'));
                if (!in_array($bookletType, self::BOOKLETS, true)) {
                    $bookletType = 'A';
                }

                $rawAnswers = (array) ($row['raw_answers'] ?? []);
                $calc = $this->calculateResultScoresFromRaw(
                    $exam,
                    $rawAnswers,
                    $bookletType,
                    $answerMap,
                    $coeffMap
                );

                $parsedFields = (array) ($row['parsed_fields'] ?? []);
                $parsedFields['_matched_by'] = (string) ($row['matched_by'] ?? 'manual');

                $calculatedRows[] = [
                    'row_no' => (int) ($row['row_no'] ?? 0),
                    'db_student_id' => $studentId,
                    'db_student_name' => (string) ($students[$studentId]->name ?? ($row['db_student_name'] ?? '')),
                    'student_no' => (string) ($students[$studentId]->school_no ?? ($row['txt_school_no'] ?? '')),
                    'booklet_type' => $bookletType,
                    'raw_answers' => $rawAnswers,
                    'parsed_fields' => $parsedFields,
                    'course_scores' => $calc['course_scores'],
                    'total_net' => $calc['total_net'],
                    'total_point' => $calc['total_point'],
                    'matched_by' => (string) ($row['matched_by'] ?? 'manual'),
                ];
            } catch (\Throwable $ex) {
                $skipped++;
                $errors[] = 'Satır ' . ((int) ($row['row_no'] ?? 0)) . ': ' . $this->toUtf8((string) $ex->getMessage());
            }
        }

        return [$calculatedRows, $skipped, array_slice($errors, 0, 20)];
    }

    private function persistCalculatedRows(OmrExam $exam, array $rows): array
    {
        $tenantId = $this->tenantId();
        $batchId = time();
        $imported = 0;
        $skipped = 0;
        $errors = [];

        $students = Student::where('tenant_id', $tenantId)
            ->whereIn('id', collect($rows)->pluck('db_student_id')->filter()->map(fn($v) => (int) $v)->unique()->values())
            ->select(['id', 'school_no'])
            ->get()
            ->keyBy('id');

        foreach ($rows as $row) {
            try {
                $studentId = (int) ($row['db_student_id'] ?? 0);
                if ($studentId <= 0 || !isset($students[$studentId])) {
                    $skipped++;
                    $errors[] = 'Satır ' . ((int) ($row['row_no'] ?? 0)) . ': geçerli öğrenci bulunamadı.';
                    continue;
                }

                OmrResult::updateOrCreate(
                    ['exam_id' => $exam->id, 'student_id' => $studentId],
                    [
                        'tenant_id' => $tenantId,
                        'student_no' => (string) ($students[$studentId]->school_no ?? ($row['student_no'] ?? '')),
                        'booklet_type' => strtoupper((string) ($row['booklet_type'] ?? 'A')),
                        'raw_answers' => (array) ($row['raw_answers'] ?? []),
                        'parsed_fields' => (array) ($row['parsed_fields'] ?? []),
                        'course_scores' => (array) ($row['course_scores'] ?? []),
                        'total_net' => (float) ($row['total_net'] ?? 0),
                        'total_point' => (float) ($row['total_point'] ?? 0),
                        'import_batch_id' => $batchId,
                        'calculated_at' => now(),
                    ]
                );
                $imported++;
            } catch (\Throwable $ex) {
                $skipped++;
                $errors[] = 'Satır ' . ((int) ($row['row_no'] ?? 0)) . ': ' . $this->toUtf8((string) $ex->getMessage());
            }
        }

        $this->recalculateRanks((int) $exam->id);

        return [$imported, $skipped, array_slice($errors, 0, 20)];
    }

    private function tenantId(): int
    {
        return (int) auth()->user()?->tenant_id;
    }

    private function ensureAccess(): ?JsonResponse
    {
        $role = $this->resolveRoleName();
        $allowed = [
            'owner',
            'Admin',
            'admin',
            'SuperAdmin',
            'super_admin',
            'Müdür',
            'Müdür Yardımcısı',
            'Kampüs Müdürü',
            'Genel Müdür',
            'Rehberlik',
            'guidance',
            'Rehber Öğretmen',
            'rehber_teacher',
            'guidance_teacher',
            'Rehberlik Öğretmeni',
            'Öğrenci İşleri',
            'student_affairs',
            'ogrenci_isleri',
            'Öğretmen',
            'teacher',
            'Öğrenci',
            'student',
            'Veli',
            'guardian',
            'parent',
        ];
        return in_array($role, $allowed, true)
            ? null
            : $this->error('Bu işlem için yetkiniz bulunmamaktadır.', [], 403);
    }

    private function defaultBookletQnoMap(int $questionNo): array
    {
        return [
            'booklet_a_qno' => $questionNo,
            'booklet_b_qno' => null,
            'booklet_c_qno' => null,
            'booklet_d_qno' => null,
        ];
    }

    private function effectiveExamIdsForExam(OmrExam $exam): array
    {
        $mergedIds = array_values(array_filter(array_map('intval', (array) ($exam->merged_exam_ids ?? []))));
        return !empty($mergedIds) ? $mergedIds : [(int) $exam->id];
    }

    private function resolveEffectiveExamIds(array $examIds): array
    {
        $ids = array_values(array_unique(array_filter(array_map('intval', $examIds))));
        if (empty($ids)) return [];

        $exams = OmrExam::where('tenant_id', $this->tenantId())
            ->whereIn('id', $ids)
            ->get(['id', 'merged_exam_ids']);

        $out = [];
        foreach ($exams as $e) {
            $merged = array_values(array_filter(array_map('intval', (array) ($e->merged_exam_ids ?? []))));
            if (!empty($merged)) {
                $out = array_merge($out, $merged);
            } else {
                $out[] = (int) $e->id;
            }
        }
        $out = array_values(array_unique(array_filter(array_map('intval', $out))));
        sort($out);
        return $out;
    }

    /**
     * @param OmrExam|object $exam
     */
    private function isExamConfigured($exam): bool
    {
        $mergedIds = array_values(array_filter(array_map('intval', (array) ($exam->merged_exam_ids ?? []))));
        if (!empty($mergedIds)) {
            $exams = OmrExam::where('tenant_id', $this->tenantId())
                ->whereIn('id', $mergedIds)
                ->get(['id', 'configured_at']);
            if ($exams->count() !== count($mergedIds)) return false;

            foreach ($mergedIds as $eid) {
                $courseCount = OmrExamCourse::where('exam_id', (int) $eid)->count();
                $answerCount = OmrAnswerKey::where('exam_id', (int) $eid)->count();
                $confAt = $exams->firstWhere('id', (int) $eid)?->configured_at;
                if (!($courseCount > 0 && $answerCount > 0 && !empty($confAt))) return false;
            }
            return true;
        }

        $courseCount = OmrExamCourse::where('exam_id', $exam->id)->count();
        $answerCount = OmrAnswerKey::where('exam_id', $exam->id)->count();
        $resultsCount = $exam->results_count ?? OmrResult::where('exam_id', $exam->id)->count();
        
        return $courseCount > 0 && ($answerCount > 0 || $resultsCount > 0) && !empty($exam->configured_at);
    }

    private function extractField(string $line, array $rule): string
    {
        $start = $this->resolveRuleStart($rule);
        $startIndex = $start - 1;
        $length = intval($this->resolveRuleLength($rule));
        if ($length <= 0) {
            return '';
        }

        $extracted = mb_substr($line, $startIndex, $length, 'UTF-8');

        return trim($this->toUtf8((string) $extracted));
    }

    private function extractRawField(string $line, array $rule): string
    {
        $start = $this->resolveRuleStart($rule);
        $startIndex = $start - 1;
        $length = intval($this->resolveRuleLength($rule));
        if ($length <= 0) {
            return '';
        }

        $extracted = (string) mb_substr($line, $startIndex, $length, 'UTF-8');
        return str_replace(' ', '_', str_pad($extracted, $length, '_'));
    }

    private function resolveRuleStart(array $rule): int
    {
        $oneBasedStart = array_key_exists('start_position', $rule)
            ? (int) $rule['start_position']
            : (int) ($rule['start'] ?? 1);

        // Template UI is 1-based; treat 0 or 1 as first character.
        return $oneBasedStart <= 1 ? 1 : $oneBasedStart;
    }

    private function resolveRuleLength(array $rule): int
    {
        if (array_key_exists('field_length', $rule)) {
            return max(0, (int) $rule['field_length']);
        }

        return max(0, (int) ($rule['length'] ?? 0));
    }

    private function normalizeFieldRules(array $rules): array
    {
        $required = ['tc_no', 'school_no', 'full_name', 'classroom_section', 'gender', 'booklet_type'];
        foreach ($required as $f) {
            if (!isset($rules[$f])) {
                $rules[$f] = null;
            }
        }
        $rules['custom_fields'] = is_array($rules['custom_fields'] ?? null) ? $rules['custom_fields'] : [];
        $rules['courses'] = is_array($rules['courses'] ?? null) ? $rules['courses'] : [];
        return $rules;
    }

    private function buildExamCourseCoefficientMap(int $id, ?string $examType = null): array
    {
        $examCourses = OmrExamCourse::where('exam_id', $id)->get();
        if ($examCourses->isNotEmpty()) {
            return $examCourses->pluck('coefficient', 'course_id')
                ->map(fn($v) => (float) $v)
                ->toArray();
        }

        $typeKey = (string) ($examType ?: 'lgs');
        return OmrCourse::where('tenant_id', $this->tenantId())
            ->pluck('coefficients', 'id')
            ->map(function ($coeffs) use ($typeKey) {
                $arr = is_array($coeffs) ? $coeffs : [];
                return (float) ($arr[$typeKey] ?? 1.0);
            })
            ->toArray();
    }

    public static function compareOmrAnswer(?string $given, ?string $expect): string
    {
        $given = strtoupper(trim((string) $given));
        $expect = strtoupper(trim((string) $expect));

        if ($given === '' || in_array($given, ['-', '0', ' ', '.', '_'], true)) {
            return 'blank';
        }

        if ($expect === '*' || $expect === 'T' || $expect === 'X') {
            return 'correct';
        }

        if ($given === $expect) {
            return 'correct';
        }

        if (strlen($expect) > 1 && in_array($given, str_split($expect), true)) {
            return 'correct';
        }

        return 'wrong';
    }

    public function calculateResultScoresFromRaw(OmrExam $exam, array $rawAnswers, string $bookletType, array $answerMap, array $coeffMap): array
    {
        $bookletType = strtoupper(trim($bookletType));
        if (!in_array($bookletType, self::BOOKLETS, true)) {
            $bookletType = 'A';
        }

        $penalty = is_numeric($exam->wrong_penalty) ? (float) $exam->wrong_penalty : null;
        $courseScores = [];
        $totalNet = 0.0;
        $totalPoint = 0.0;

        foreach ($rawAnswers as $courseId => $answers) {
            $cId = (int) $courseId;
            if ($cId <= 0) continue;
            if (is_array($answers)) {
                $answers = implode('', $answers);
            } else {
                $answers = (string) ($answers ?? '');
            }
            $keyMap = $answerMap[$cId][$bookletType] ?? $answerMap[$cId]['A'] ?? [];
            if (empty($keyMap)) {
                continue;
            }

            $correct = 0;
            $wrong = 0;
            $blank = 0;

            foreach ($keyMap as $qno => $mapped) {
                $idx = (int) $qno - 1;
                $given = ($idx >= 0 && isset($answers[$idx])) ? strtoupper(trim((string) $answers[$idx])) : '';

                $status = self::compareOmrAnswer($given, $mapped['answer'] ?? '');
                if ($status === 'correct') {
                    $correct++;
                } elseif ($status === 'blank') {
                    $blank++;
                } else {
                    $wrong++;
                }
            }

            $net = (float) $correct;
            if ($penalty !== null && $penalty > 0) {
                $net = $correct - ($wrong / $penalty);
            }
            $point = round($net * ($coeffMap[$cId] ?? 1.0), 3);

            $courseScores[$cId] = [
                'correct' => $correct,
                'wrong'   => $wrong,
                'blank'   => $blank,
                'net'     => round($net, 3),
                'point'   => $point,
            ];
            $totalNet += $net;
            $totalPoint += $point;
        }

        return [
            'course_scores' => $courseScores,
            'total_net'     => round($totalNet, 3),
            'total_point'   => round($totalPoint, 3),
        ];
    }

    public function recalculateExamResults(int $examId): int
    {
        $exam = OmrExam::where('tenant_id', $this->tenantId())->find($examId);
        if (!$exam) return 0;

        $results = OmrResult::where('exam_id', $examId)->get();
        if ($results->isEmpty()) return 0;

        $answerMap = $this->buildBookletAnswerMap($examId);
        $coeffMap = $this->buildExamCourseCoefficientMap($examId, $exam->exam_type);

        $updatedCount = 0;
        foreach ($results as $result) {
            $rawAnswers = (array) ($result->raw_answers ?? []);
            if (empty($rawAnswers)) continue;

            $calc = $this->calculateResultScoresFromRaw(
                $exam,
                $rawAnswers,
                (string) ($result->booklet_type ?? 'A'),
                $answerMap,
                $coeffMap
            );

            $result->update([
                'course_scores' => $calc['course_scores'],
                'total_net'     => $calc['total_net'],
                'total_point'   => $calc['total_point'],
                'calculated_at' => now(),
            ]);
            $updatedCount++;
        }

        $this->recalculateRanks($examId);
        return $updatedCount;
    }

    private function buildBookletAnswerMap(int $id): array
    {
        $map = [];
        $keys = OmrAnswerKey::where('exam_id', $id)->get();
        if ($keys->isEmpty()) {
            return $map;
        }

        $distinctBookletRows = false;
        foreach ($keys as $k) {
            $bt = strtoupper(trim((string) $k->booklet_type));
            if ($bt !== '' && $bt !== 'A') {
                $distinctBookletRows = true;
                break;
            }
        }

        if ($distinctBookletRows) {
            foreach ($keys as $key) {
                $cId = (int) $key->course_id;
                $booklet = strtoupper(trim((string) $key->booklet_type)) ?: 'A';
                $qno = (int) $key->question_no;
                if ($qno <= 0) {
                    $qno = (int) ($key->booklet_a_qno ?? 0);
                }
                if ($qno <= 0) continue;

                $map[$cId][$booklet][$qno] = [
                    'answer'        => strtoupper(trim((string) $key->correct_answer)),
                    'canonical_qno' => $qno,
                    'topic_id'      => $key->topic_id,
                ];
            }
        } else {
            foreach ($keys as $key) {
                $cId = (int) $key->course_id;
                $canonical = (int) $key->question_no;
                $answer = strtoupper(trim((string) $key->correct_answer));

                $qA = (int) ($key->booklet_a_qno ?: $canonical);
                $qB = (int) ($key->booklet_b_qno ?: 0);
                $qC = (int) ($key->booklet_c_qno ?: 0);
                $qD = (int) ($key->booklet_d_qno ?: 0);

                if ($qA > 0) {
                    $map[$cId]['A'][$qA] = [
                        'answer'        => $answer,
                        'canonical_qno' => $canonical,
                        'topic_id'      => $key->topic_id,
                    ];
                }
                if ($qB > 0) {
                    $map[$cId]['B'][$qB] = [
                        'answer'        => $answer,
                        'canonical_qno' => $canonical,
                        'topic_id'      => $key->topic_id,
                    ];
                }
                if ($qC > 0) {
                    $map[$cId]['C'][$qC] = [
                        'answer'        => $answer,
                        'canonical_qno' => $canonical,
                        'topic_id'      => $key->topic_id,
                    ];
                }
                if ($qD > 0) {
                    $map[$cId]['D'][$qD] = [
                        'answer'        => $answer,
                        'canonical_qno' => $canonical,
                        'topic_id'      => $key->topic_id,
                    ];
                }
            }
        }

        foreach ($map as $cId => $bMap) {
            $aKeys = $bMap['A'] ?? [];
            if (!empty($aKeys)) {
                foreach (self::BOOKLETS as $booklet) {
                    if (empty($map[$cId][$booklet])) {
                        $map[$cId][$booklet] = $aKeys;
                    }
                }
            }
        }

        return $map;
    }

    private function recalculateRanks(int $id): void
    {
        $results = OmrResult::where('exam_id', $id)
            ->orderByDesc('total_point')
            ->orderByDesc('total_net')
            ->get();

        foreach ($results as $rank => $result) {
            /** @var OmrResult $result */
            $result->update(['rank' => $rank + 1]);
        }
    }

    private function buildStudentTopicAnalysis(OmrResult $result, ?\Illuminate\Support\Collection $answerKeys = null): array
    {
        $examId = (int) $result->exam_id;
        $answerMap = $this->buildBookletAnswerMap($examId);
        $booklet = strtoupper(trim((string) $result->booklet_type)) ?: 'A';
        if (!in_array($booklet, self::BOOKLETS, true)) {
            $booklet = 'A';
        }

        $rawKeys = $answerKeys ?? OmrAnswerKey::where('exam_id', $examId)->with(['topic:id,name', 'course:id,name'])->get();
        $keyMeta = [];
        foreach ($rawKeys as $ak) {
            $keyMeta[(int) $ak->course_id][(int) $ak->question_no] = $ak;
        }

        $rawAnswers = (array) ($result->raw_answers ?? []);
        $topicAnalysis = [];

        foreach ($answerMap as $courseId => $bookletData) {
            $cId = (int) $courseId;
            $keyMap = $bookletData[$booklet] ?? $bookletData['A'] ?? [];
            if (empty($keyMap)) continue;

            $rawStr = (string) ($rawAnswers[(string) $cId] ?? $rawAnswers[$cId] ?? '');

            foreach ($keyMap as $studentQno => $qInfo) {
                $canonicalQno = (int) ($qInfo['canonical_qno'] ?? $studentQno);
                $expect = strtoupper(trim((string) ($qInfo['answer'] ?? '')));
                $given = strtoupper(trim((string) ($rawStr[$studentQno - 1] ?? '')));

                $status = self::compareOmrAnswer($given, $expect);

                $ak = $keyMeta[$cId][$canonicalQno] ?? null;
                $topicId = (int) ($qInfo['topic_id'] ?? $ak?->topic_id ?? 0);
                $topicName = (string) ($ak?->topic?->name ?? 'Belirtilmemiş');
                $courseName = (string) ($ak?->course?->name ?? ('Ders ' . $cId));

                $key = $cId . '_' . $topicId;
                if (!isset($topicAnalysis[$key])) {
                    $topicAnalysis[$key] = [
                        'topic_id'    => $topicId,
                        'topic_name'  => $topicName,
                        'course_id'   => $cId,
                        'course_name' => $courseName,
                        'correct'     => 0,
                        'wrong'       => 0,
                        'blank'       => 0,
                        'total'       => 0,
                    ];
                }

                $topicAnalysis[$key][$status]++;
                $topicAnalysis[$key]['total']++;
            }
        }

        foreach ($topicAnalysis as &$item) {
            $item['success_rate'] = $item['total'] > 0 ? round(($item['correct'] / $item['total']) * 100, 1) : 0.0;
        }

        return array_values($topicAnalysis);
    }

    // COURSES
    public function coursesIndex(): JsonResponse
    {
        if ($e = $this->ensureAccess()) return $e;
        $courses = OmrCourse::where('tenant_id', $this->tenantId())
            ->withCount('topics')->orderBy('sort_order')->orderBy('name')->get();
        return $this->success(['courses' => $courses]);
    }

    public function coursesStore(Request $request): JsonResponse
    {
        if ($e = $this->ensureAccess()) return $e;
        $data = $request->validate([
            'name' => 'required|string|max:100',
            'code' => 'nullable|string|max:20',
            'coefficients' => 'nullable|array',
            'sort_order' => 'nullable|integer|min:0',
            'is_active' => 'nullable|boolean',
        ]);
        $data['tenant_id'] = $this->tenantId();

        $existing = OmrCourse::where('tenant_id', $this->tenantId())
            ->whereRaw('LOWER(TRIM(name)) = ?', [mb_strtolower(trim($data['name']))])
            ->first();
        if ($existing) {
            return $this->success(['course' => $existing], 'Ders zaten mevcut, seçildi.', 200);
        }

        return $this->success(['course' => OmrCourse::create($data)], 'Ders oluşturuldu.', 201);
    }

    public function coursesUpdate(Request $request, int $id): JsonResponse
    {
        if ($e = $this->ensureAccess()) return $e;
        $course = OmrCourse::where('tenant_id', $this->tenantId())->findOrFail($id);
        $data = $request->validate([
            'name' => 'sometimes|required|string|max:100',
            'code' => 'nullable|string|max:20',
            'coefficients' => 'nullable|array',
            'sort_order' => 'nullable|integer|min:0',
            'is_active' => 'nullable|boolean',
        ]);
        $course->update($data);
        return $this->success(['course' => $course->fresh()], 'Ders güncellendi.');
    }

    public function coursesDestroy(int $id): JsonResponse
    {
        if ($e = $this->ensureAccess()) return $e;
        OmrCourse::where('tenant_id', $this->tenantId())->findOrFail($id)->delete();
        return $this->success([], 'Ders silindi.');
    }

    // TOPICS
    public function topicsIndex(int $courseId): JsonResponse
    {
        if ($e = $this->ensureAccess()) return $e;
        OmrCourse::where('tenant_id', $this->tenantId())->findOrFail($courseId);
        $topics = OmrTopic::where('tenant_id', $this->tenantId())
            ->where('course_id', $courseId)->orderBy('sort_order')->orderBy('name')->get();
        return $this->success(['topics' => $topics]);
    }

    public function topicsStore(Request $request, int $courseId): JsonResponse
    {
        if ($e = $this->ensureAccess()) return $e;
        OmrCourse::where('tenant_id', $this->tenantId())->findOrFail($courseId);
        $data = $request->validate([
            'name' => 'required|string|max:200',
            'type' => 'nullable|in:topic,objective',
            'sort_order' => 'nullable|integer|min:0',
        ]);
        $data['tenant_id'] = $this->tenantId();
        $data['course_id'] = $courseId;
        return $this->success(['topic' => OmrTopic::create($data)], 'Konu/Kazanım oluşturuldu.', 201);
    }

    public function topicsBulkStore(Request $request, int $courseId): JsonResponse
    {
        if ($e = $this->ensureAccess()) return $e;
        OmrCourse::where('tenant_id', $this->tenantId())->findOrFail($courseId);
        $request->validate([
            'text'         => 'required|string',
            'type'         => 'nullable|in:topic,objective',
            'start_order'  => 'nullable|integer|min:0',
        ]);

        $type       = $request->input('type', 'topic');
        $startOrder = (int) $request->input('start_order', 0);
        $tenantId   = $this->tenantId();

        $lines = array_values(array_filter(
            array_map('trim', explode("\n", $request->input('text'))),
            fn($l) => $l !== ''
        ));

        if (empty($lines)) {
            return $this->error('Eklenecek satır bulunamadı.', [], 422);
        }

        $now  = now();
        $rows = [];
        foreach ($lines as $i => $line) {
            $rows[] = [
                'tenant_id'  => $tenantId,
                'course_id'  => $courseId,
                'name'       => mb_substr($line, 0, 200),
                'type'       => $type,
                'sort_order' => $startOrder + $i,
                'created_at' => $now,
                'updated_at' => $now,
            ];
        }

        DB::beginTransaction();
        DB::table('omr_topics')->insert($rows);
        DB::commit();

        $topics = OmrTopic::where('tenant_id', $tenantId)
            ->where('course_id', $courseId)
            ->orderBy('sort_order')->orderBy('name')->get();

        return $this->success(['topics' => $topics, 'inserted' => count($rows)], count($rows) . ' konu/kazanım eklendi.', 201);
    }

    public function topicsUpdate(Request $request, int $courseId, int $id): JsonResponse
    {
        if ($e = $this->ensureAccess()) return $e;
        $topic = OmrTopic::where('tenant_id', $this->tenantId())->where('course_id', $courseId)->findOrFail($id);
        $data = $request->validate([
            'name' => 'sometimes|required|string|max:200',
            'type' => 'nullable|in:topic,objective',
            'sort_order' => 'nullable|integer|min:0',
        ]);
        $topic->update($data);
        return $this->success(['topic' => $topic->fresh()], 'Konu/Kazanım güncellendi.');
    }

    public function topicsDestroy(int $courseId, int $id): JsonResponse
    {
        if ($e = $this->ensureAccess()) return $e;
        OmrTopic::where('tenant_id', $this->tenantId())->where('course_id', $courseId)->findOrFail($id)->delete();
        return $this->success([], 'Konu/Kazanım silindi.');
    }

    // OMR TEMPLATES
    public function templatesIndex(): JsonResponse
    {
        if ($e = $this->ensureAccess()) return $e;
        return $this->success([
            'templates' => OmrTemplate::where('tenant_id', $this->tenantId())
                ->orderByDesc('id')
                ->get(),
        ]);
    }

    public function templatesStore(Request $request): JsonResponse
    {
        if ($e = $this->ensureAccess()) return $e;
        $data = $request->validate([
            'name' => 'required|string|max:200',
            'exam_type' => 'required|string|max:30',
            'field_rules' => 'required|array',
            'field_rules.tc_no.start' => 'nullable|integer|min:0',
            'field_rules.tc_no.length' => 'nullable|integer|min:1',
            'field_rules.school_no.start' => 'required|integer|min:0',
            'field_rules.school_no.length' => 'required|integer|min:1',
            'field_rules.full_name.start' => 'nullable|integer|min:0',
            'field_rules.full_name.length' => 'nullable|integer|min:1',
            'field_rules.classroom_section.start' => 'nullable|integer|min:0',
            'field_rules.classroom_section.length' => 'nullable|integer|min:1',
            'field_rules.gender.start' => 'nullable|integer|min:0',
            'field_rules.gender.length' => 'nullable|integer|min:1',
            'field_rules.booklet_type.start' => 'required|integer|min:0',
            'field_rules.booklet_type.length' => 'required|integer|min:1',
            'field_rules.custom_fields' => 'nullable|array',
            'field_rules.custom_fields.*.key' => 'required_with:field_rules.custom_fields|string|max:100',
            'field_rules.custom_fields.*.label' => 'nullable|string|max:200',
            'field_rules.custom_fields.*.start' => 'required_with:field_rules.custom_fields|integer|min:0',
            'field_rules.custom_fields.*.length' => 'required_with:field_rules.custom_fields|integer|min:1',
            'field_rules.courses' => 'nullable|array',
            'field_rules.courses.*.course_id' => 'required_with:field_rules.courses|integer|exists:omr_courses,id',
            'field_rules.courses.*.start' => 'required_with:field_rules.courses|integer|min:0',
            'field_rules.courses.*.length' => 'required_with:field_rules.courses|integer|min:1',
            'notes' => 'nullable|string',
            'is_active' => 'nullable|boolean',
        ]);

        $data['field_rules'] = $this->normalizeFieldRules($data['field_rules']);
        $data['tenant_id'] = $this->tenantId();
        $data['created_by'] = auth()->id();
        return $this->success(['template' => OmrTemplate::create($data)], 'OMR şablonu oluşturuldu.', 201);
    }

    public function templatesShow(int $id): JsonResponse
    {
        if ($e = $this->ensureAccess()) return $e;
        return $this->success(['template' => OmrTemplate::where('tenant_id', $this->tenantId())->findOrFail($id)]);
    }

    public function templatesUpdate(Request $request, int $id): JsonResponse
    {
        if ($e = $this->ensureAccess()) return $e;
        $template = OmrTemplate::where('tenant_id', $this->tenantId())->findOrFail($id);
        $data = $request->validate([
            'name' => 'sometimes|required|string|max:200',
            'exam_type' => 'sometimes|required|string|max:30',
            'field_rules' => 'sometimes|required|array',
            'notes' => 'nullable|string',
            'is_active' => 'nullable|boolean',
        ]);

        if (isset($data['field_rules'])) {
            $data['field_rules'] = $this->normalizeFieldRules($data['field_rules']);
        }
        $template->update($data);
        return $this->success(['template' => $template->fresh()], 'OMR şablonu güncellendi.');
    }

    public function templatesDestroy(int $id): JsonResponse
    {
        if ($e = $this->ensureAccess()) return $e;
        OmrTemplate::where('tenant_id', $this->tenantId())->findOrFail($id)->delete();
        return $this->success([], 'OMR şablonu silindi.');
    }

    // EXAMS
    public function examsIndex(Request $request): JsonResponse
    {
        if ($e = $this->ensureAccess()) return $e;
        
        try {
            $user = auth()->user();
            $query = OmrExam::where('tenant_id', $this->tenantId())
                ->with(['template:id,name', 'creator:id,name'])
                ->withCount(['results', 'examCourses', 'answerKeys']);
            
            // Apply role-based visibility filter for non-admin/non-staff users
            if ($user) {
                $roleName = $user->role?->name ?? $this->resolveRoleName();
                
                // For non-admin/non-staff roles, apply visibility scope
                if (!$this->isStaffOrAdmin($user)) {
                    // Veli/Parent - only exams with share_roles.parent = true
                    if (in_array($roleName, ['Veli', 'Parent', 'Guardian', 'guardian', 'parent'], true)) {
                        $query->whereJsonContains('share_roles->parent', true);
                    }
                    // Öğretmen/Teacher - show shared exams or unrestricted exams
                    elseif (in_array($roleName, ['Öğretmen', 'Teacher', 'teacher'], true)) {
                        $query->where(function ($q) {
                            $q->whereJsonContains('share_roles->teacher', true)
                              ->orWhereNull('share_roles')
                              ->orWhereRaw("JSON_UNQUOTE(JSON_EXTRACT(share_roles, '$.teacher')) != 'false'");
                        });
                    }
                    // Other roles (grade coordinators, class teachers) - automatic by education_level_ids
                    else {
                        $userEducationLevels = $user->education_level_ids ?? [];
                        if (!empty($userEducationLevels)) {
                            // Get grade levels from classrooms that belong to user's education_level_ids (any season)
                            $gradeLevels = \App\Models\Classroom::withoutGlobalScope(\App\Scopes\SeasonScope::class)
                                ->whereIn('education_level_id', $userEducationLevels)
                                ->pluck('grade_level')
                                ->filter()
                                ->unique()
                                ->toArray();
                            
                            if (!empty($gradeLevels)) {
                                // Build level patterns (e.g., "8.SINIF", "9.SINIF")
                                $levelPatterns = [];
                                foreach ($gradeLevels as $grade) {
                                    $levelPatterns[] = $grade . '.SINIF';
                                }
                                // Include YKS for grade 12
                                if (in_array(12, $gradeLevels, true)) {
                                    $levelPatterns[] = 'YKS';
                                }
                                $query->whereIn('level', $levelPatterns);
                            }
                        }
                    }
                }
            }
            
            if ($request->filled('exam_type')) $query->where('exam_type', $request->get('exam_type'));
            if ($request->filled('status')) $query->where('status', $request->get('status'));

            $exams = $query->orderByDesc('exam_date')->orderByDesc('id')->get();
            $exams->transform(function ($exam) {
                /** @var OmrExam $exam */
                $exam->is_configured = $this->isExamConfigured($exam);

                $mergedIds = array_values(array_filter(array_map('intval', (array) ($exam->merged_exam_ids ?? []))));
                if (!empty($mergedIds)) {
                    $exam->results_count = (int) OmrResult::whereIn('exam_id', $mergedIds)->distinct('student_id')->count('student_id');
                    $exam->exam_courses_count = (int) OmrExamCourse::whereIn('exam_id', $mergedIds)->count();
                    $exam->answer_keys_count = (int) OmrAnswerKey::whereIn('exam_id', $mergedIds)->count();
                }
                return $exam;
            });

            return $this->success(['exams' => $this->utf8izeMixed($exams)]);
        } catch (\Throwable $th) {
            Log::error('OmrController examsIndex error: ' . $th->getMessage(), [
                'trace' => $th->getTraceAsString(),
            ]);
            return $this->error('Sınavlar listelenirken bir hata oluştu: ' . $th->getMessage(), [], 500);
        }
    }

    public function examsStore(Request $request): JsonResponse
    {
        if ($e = $this->ensureAccess()) return $e;
        try {
            $data = $request->validate([
                'name' => 'required|string|max:255',
                'exam_type' => 'required|string|max:30',
                'session' => 'nullable|string|max:30',
                'level' => 'nullable|string|max:20',
                'exam_date' => 'nullable|date',
                'share_roles' => 'nullable|array',
                'share_roles.parent' => 'nullable|boolean',
                'share_roles.teacher' => 'nullable|boolean',
            ]);

            $data['duration'] = null;
            $data['season'] = null;
            $data['test_code'] = null;
            $data['wrong_penalty'] = $data['exam_type'] === 'LGS' ? 3 : ($data['exam_type'] === 'YKS-TYT' || $data['exam_type'] === 'YKS-AYT' || $data['exam_type'] === 'YKS-DIL' ? 4 : null);
            $data['omr_template_id'] = null;
            $data['status'] = 'draft';
            $data['share_roles'] = $data['share_roles'] ?? null;
            $data['configured_at'] = null;
            $data['tenant_id'] = $this->tenantId();
            $data['created_by'] = auth()->id();
            return $this->success(['exam' => OmrExam::create($data)->load('template')], 'Sınav oluşturuldu.', 201);
        } catch (\Illuminate\Validation\ValidationException $ve) {
            throw $ve;
        } catch (\Throwable $th) {
            Log::error('OmrController examsStore error: ' . $th->getMessage(), [
                'trace' => $th->getTraceAsString(),
            ]);
            return $this->error('Sınav oluşturulurken bir hata oluştu: ' . $th->getMessage(), [], 500);
        }
    }

    public function examsMerge(Request $request): JsonResponse
    {
        if ($e = $this->ensureAccess()) return $e;
        $tenantId = $this->tenantId();

        $data = $request->validate([
            'name' => 'required|string|max:255',
            'exam_ids' => 'required|array|min:2',
            'exam_ids.*' => 'required|integer',
        ]);

        $examIds = array_values(array_unique(array_filter(array_map('intval', (array) ($data['exam_ids'] ?? [])))));
        if (count($examIds) < 2) return $this->error('En az 2 sınav seçilmelidir.', [], 422);

        $exams = OmrExam::where('tenant_id', $tenantId)->whereIn('id', $examIds)->get();
        if ($exams->count() !== count($examIds)) return $this->error('Seçilen sınavların bazıları bulunamadı.', [], 422);

        $first = $exams->first();
        $merged = OmrExam::create([
            'tenant_id' => $tenantId,
            'name' => $data['name'],
            'exam_type' => (string) ($first?->exam_type ?? 'Diğer'),
            'session' => null,
            'level' => $first?->level,
            'exam_date' => $first?->exam_date,
            'duration' => null,
            'season' => null,
            'test_code' => null,
            'wrong_penalty' => $first?->wrong_penalty,
            'omr_template_id' => null,
            'status' => 'active',
            'configured_at' => now(),
            'merged_exam_ids' => $examIds,
            'created_by' => auth()->id(),
        ]);

        return $this->success(['exam' => $merged], 'Sınavlar birleştirildi.', 201);
    }

    public function examsShow(int $id): JsonResponse
    {
        if ($e = $this->ensureAccess()) return $e;
        $exam = OmrExam::where('tenant_id', $this->tenantId())
            ->with([
                'template',
                'creator:id,name',
                'answerKeys.course',
                'answerKeys.topic',
                'examCourses.course:id,name,code',
            ])
            ->findOrFail($id);

        // Check role-based visibility
        $user = auth()->user();
        if ($user) {
            $roleName = $user->role?->name ?? $this->resolveRoleName();
            
            // For non-admin/non-staff roles, verify visibility (creator can always view)
            if (!$this->isStaffOrAdmin($user) && (int) $exam->created_by !== (int) $user->id) {
                // Veli/Parent - check share_roles.parent
                if (in_array($roleName, ['Veli', 'Parent', 'Guardian', 'guardian', 'parent'], true)) {
                    if (empty($exam->share_roles) || empty($exam->share_roles['parent'])) {
                        return $this->error('Bu sınavı görüntüleme yetkiniz bulunmamaktadır.', [], 403);
                    }
                }
                // Öğretmen/Teacher - check share_roles.teacher (only forbid if explicitly false)
                elseif (in_array($roleName, ['Öğretmen', 'Teacher', 'teacher'], true)) {
                    if (isset($exam->share_roles['teacher']) && $exam->share_roles['teacher'] === false) {
                        return $this->error('Bu sınavı görüntüleme yetkiniz bulunmamaktadır.', [], 403);
                    }
                }
                // Other roles - check education_level_ids matching exam.level
                else {
                    $canView = false;
                    $userEducationLevels = $user->education_level_ids ?? [];
                    if (!empty($userEducationLevels) && !empty($exam->level)) {
                        // Extract grade from exam level
                        $examGrade = null;
                        if (preg_match('/^(\d+)/', $exam->level, $matches)) {
                            $examGrade = (int) $matches[1];
                        } elseif (stripos($exam->level, 'YKS') !== false) {
                            $examGrade = 12;
                        }
                        
                        if ($examGrade) {
                            $gradeLevels = \App\Models\Classroom::withoutGlobalScope(\App\Scopes\SeasonScope::class)
                                ->whereIn('education_level_id', $userEducationLevels)
                                ->pluck('grade_level')
                                ->filter()
                                ->unique()
                                ->toArray();
                            
                            if (in_array($examGrade, $gradeLevels, true)) {
                                $canView = true;
                            }
                        }
                    }
                    
                    if (!$canView) {
                        return $this->error('Bu sınavı görüntüleme yetkiniz bulunmamaktadır.', [], 403);
                    }
                }
            }
        }

        if (!empty($exam->omr_template_id) && ($exam->examCourses()->count() === 0 || $exam->answerKeys()->count() === 0)) {
            $this->applyTemplateToExam($exam);
            $exam->refresh();
        }

        $answerKeysByCourse = $exam->answerKeys
            ->groupBy('course_id')
            ->map(function ($keys, $courseId) {
            return [
                'course_id' => $courseId,
                'course_name' => $keys->first()->course?->name,
                'questions' => $keys->sortBy('question_no')->values()->map(fn($k) => [
                        'id' => $k->id,
                        'question_no' => $k->question_no,
                        'booklet_a_qno' => $k->booklet_a_qno,
                        'booklet_b_qno' => $k->booklet_b_qno,
                        'booklet_c_qno' => $k->booklet_c_qno,
                        'booklet_d_qno' => $k->booklet_d_qno,
                        'correct_answer' => $k->correct_answer,
                        'topic_id' => $k->topic_id,
                        'topic_name' => $k->topic?->name,
                    ]),
            ];
        })->values();

        $exam->is_configured = $this->isExamConfigured($exam);

        return $this->success([
            'exam' => $exam,
            'exam_courses' => $exam->examCourses,
            'answer_keys' => $answerKeysByCourse,
        ]);
    }

    public function examsUpdate(Request $request, int $id): JsonResponse
    {
        if ($e = $this->ensureAccess()) return $e;
        $exam = OmrExam::where('tenant_id', $this->tenantId())->findOrFail($id);
        $oldTemplateId = $exam->omr_template_id;
        $data = $request->validate([
            'name' => 'sometimes|required|string|max:255',
            'exam_type' => 'sometimes|required|string|max:30',
            'session' => 'nullable|string|max:30',
            'level' => 'nullable|string|max:20',
            'exam_date' => 'nullable|date',
            'duration' => 'nullable|integer|min:1',
            'season' => 'nullable|string|max:20',
            'test_code' => 'nullable|string|max:50',
            'wrong_penalty' => 'nullable|numeric|min:0|max:10',
            'omr_template_id' => 'nullable|integer|exists:omr_templates,id',
            'status' => 'nullable|in:draft,active,archived',
            'configured_at' => 'nullable|date',
            'share_roles' => 'nullable|array',
            'share_roles.parent' => 'nullable|boolean',
            'share_roles.teacher' => 'nullable|boolean',
        ]);
        $exam->update($data);

        // Şablon seçildiğinde veya değiştiğinde şablondaki dersleri, soru sayılarını ve cevap anahtarını otomatik aktar
        if (!empty($exam->omr_template_id) && ($oldTemplateId != $exam->omr_template_id || OmrExamCourse::where('exam_id', $exam->id)->count() === 0)) {
            $this->applyTemplateToExam($exam);
        }

        return $this->success(['exam' => $exam->fresh()], 'Sınav güncellendi.');
    }

    private function applyTemplateToExam(OmrExam $exam): void
    {
        if (empty($exam->omr_template_id)) return;

        $template = OmrTemplate::where('tenant_id', $this->tenantId())->find($exam->omr_template_id);
        if (!$template || empty($template->field_rules)) return;

        $fieldRules = (array) $template->field_rules;
        $courses = $fieldRules['courses'] ?? [];
        if (!is_array($courses) || empty($courses)) return;

        $tenantId = $this->tenantId();
        $coursesMap = OmrCourse::where('tenant_id', $tenantId)->get()->keyBy('id');

        DB::transaction(function () use ($exam, $courses, $coursesMap, $tenantId) {
            $existingCourses = OmrExamCourse::where('exam_id', $exam->id)->get()->keyBy('course_id');

            foreach ($courses as $idx => $cRow) {
                $cid = (int) ($cRow['course_id'] ?? 0);
                if ($cid <= 0) continue;

                $qCount = (int) ($cRow['length'] ?? 20);
                $cObj = $coursesMap[$cid] ?? null;

                $existing = $existingCourses[$cid] ?? null;
                if ($existing) {
                    $existing->update([
                        'question_count' => $qCount,
                        'sort_order'     => $idx + 1,
                    ]);
                } else {
                    $coef = 1.0;
                    if ($cObj && !empty($cObj->coefficients) && isset($cObj->coefficients[$exam->exam_type])) {
                        $coef = (float) $cObj->coefficients[$exam->exam_type];
                    }
                    OmrExamCourse::create([
                        'tenant_id'      => $tenantId,
                        'exam_id'        => $exam->id,
                        'course_id'      => $cid,
                        'coefficient'    => $coef,
                        'question_count' => $qCount,
                        'sort_order'     => $idx + 1,
                    ]);
                }

                // Cevap anahtarı satırlarını oluştur (1..qCount)
                for ($q = 1; $q <= $qCount; $q++) {
                    $defaultMap = $this->defaultBookletQnoMap($q);
                    OmrAnswerKey::firstOrCreate(
                        [
                            'exam_id'     => $exam->id,
                            'course_id'   => $cid,
                            'question_no' => $q,
                        ],
                        [
                            'booklet_type'   => 'A',
                            'booklet_a_qno'  => $defaultMap['booklet_a_qno'] ?? $q,
                            'booklet_b_qno'  => $defaultMap['booklet_b_qno'] ?? null,
                            'booklet_c_qno'  => $defaultMap['booklet_c_qno'] ?? null,
                            'booklet_d_qno'  => $defaultMap['booklet_d_qno'] ?? null,
                            'correct_answer' => 'A',
                            'topic_id'       => null,
                        ]
                    );
                }
            }
        });
    }

    public function examCoursesSync(Request $request, int $id): JsonResponse
    {
        if ($e = $this->ensureAccess()) return $e;
        $exam = OmrExam::where('tenant_id', $this->tenantId())->findOrFail($id);
        $data = $request->validate([
            'courses' => 'required|array|min:1',
            'courses.*.course_id' => 'required|integer|exists:omr_courses,id',
            'courses.*.coefficient' => 'required|numeric|min:0',
            'courses.*.question_count' => 'nullable|integer|min:0',
            'courses.*.sort_order' => 'nullable|integer|min:0|max:255',
        ]);

        DB::transaction(function () use ($exam, $data) {
            OmrExamCourse::where('exam_id', $exam->id)->delete();
            foreach ($data['courses'] as $row) {
                OmrExamCourse::create([
                    'tenant_id' => $this->tenantId(),
                    'exam_id' => $exam->id,
                    'course_id' => (int) $row['course_id'],
                    'coefficient' => (float) $row['coefficient'],
                    'question_count' => (int) ($row['question_count'] ?? 0),
                    'sort_order' => (int) ($row['sort_order'] ?? 0),
                ]);
            }
        });

        return $this->success([], 'Sınav dersleri ve katsayıları kaydedildi.');
    }

    public function examConfigureFinalize(Request $request, int $id): JsonResponse
    {
        if ($e = $this->ensureAccess()) return $e;
        $exam = OmrExam::where('tenant_id', $this->tenantId())->findOrFail($id);

        if (OmrExamCourse::where('exam_id', $exam->id)->count() === 0) {
            return $this->error('Önce sınava en az bir ders eklenmelidir.', [], 422);
        }
        if (OmrAnswerKey::where('exam_id', $exam->id)->count() === 0) {
            return $this->error('Önce cevap anahtarı girilmelidir.', [], 422);
        }

        $exam->update([
            'configured_at' => now(),
            'status' => $exam->status === 'draft' ? 'active' : $exam->status,
        ]);

        return $this->success(['exam' => $exam->fresh()], 'Sınav yapılandırması tamamlandı.');
    }

    public function examsDestroy(int $id): JsonResponse
    {
        if ($e = $this->ensureAccess()) return $e;
        OmrExam::where('tenant_id', $this->tenantId())->findOrFail($id)->delete();
        return $this->success([], 'Sınav silindi.');
    }

    // ANSWER KEYS
    public function answerKeysBulkSave(Request $request, int $id): JsonResponse
    {
        if ($e = $this->ensureAccess()) return $e;
        $exam = OmrExam::where('tenant_id', $this->tenantId())->findOrFail($id);

        if (OmrExamCourse::where('exam_id', $exam->id)->count() === 0) {
            return $this->error('Önce sınava dersler eklenmeli ve katsayılar belirlenmelidir.', [], 422);
        }

        $request->validate([
            'keys' => 'required|array|min:1',
            'keys.*.course_id' => 'required|integer|exists:omr_courses,id',
            'keys.*.question_no' => 'required|integer|min:1',
            'keys.*.booklet_a_qno' => 'nullable|integer|min:1',
            'keys.*.booklet_b_qno' => 'nullable|integer|min:1',
            'keys.*.booklet_c_qno' => 'nullable|integer|min:1',
            'keys.*.booklet_d_qno' => 'nullable|integer|min:1',
            'keys.*.correct_answer' => 'required|in:A,B,C,D,E',
            'keys.*.topic_id' => 'nullable|integer|exists:omr_topics,id',
            'keys.*.custom_topic_text' => 'nullable|string|max:200',
        ]);

        $tenantId = $this->tenantId();

        DB::transaction(function () use ($exam, $request, $tenantId) {
            foreach ($request->input('keys') as $key) {
                $topicId = $key['topic_id'] ?? null;

                // Eğer manuel kazanım metni gönderildiyse, aynı isimli topic yoksa yarat
                $customText = trim((string)($key['custom_topic_text'] ?? ''));
                if ($customText !== '' && $topicId === null) {
                    $existing = OmrTopic::where('tenant_id', $tenantId)
                        ->where('course_id', $key['course_id'])
                        ->where('name', $customText)
                        ->first();
                    if ($existing) {
                        $topicId = $existing->id;
                    } else {
                        $newTopic = OmrTopic::create([
                            'tenant_id'  => $tenantId,
                            'course_id'  => $key['course_id'],
                            'name'       => mb_substr($customText, 0, 200),
                            'type'       => 'objective',
                            'sort_order' => 0,
                        ]);
                        $topicId = $newTopic->id;
                    }
                }

                $defaultMap = $this->defaultBookletQnoMap((int) $key['question_no']);
                OmrAnswerKey::updateOrCreate(
                    [
                        'exam_id' => $exam->id,
                        'course_id' => $key['course_id'],
                        'question_no' => $key['question_no'],
                    ],
                    [
                        'booklet_type' => 'A',
                        'booklet_a_qno' => $key['booklet_a_qno'] ?? $defaultMap['booklet_a_qno'],
                        'booklet_b_qno' => $key['booklet_b_qno'] ?? $defaultMap['booklet_b_qno'],
                        'booklet_c_qno' => $key['booklet_c_qno'] ?? $defaultMap['booklet_c_qno'],
                        'booklet_d_qno' => $key['booklet_d_qno'] ?? $defaultMap['booklet_d_qno'],
                        'correct_answer' => strtoupper($key['correct_answer']),
                        'topic_id' => $topicId,
                    ]
                );
            }
        });
        $this->recalculateExamResults($exam->id);
        return $this->success([], 'Cevap anahtarı kaydedildi.');
    }

    // ANSWER KEY - Excel Template Download
    public function downloadAnswerKeyTemplate(int $id): \Symfony\Component\HttpFoundation\BinaryFileResponse|JsonResponse
    {
        try {
            if ($e = $this->ensureAccess()) return $e;
            $exam = OmrExam::where('tenant_id', $this->tenantId())->find($id);
            if (!$exam) {
                return $this->error('Sınav bulunamadı (ID: ' . $id . ')', [], 404);
            }
            
            $examCourses = OmrExamCourse::where('exam_id', $exam->id)
                ->with('course:id,name')
                ->orderBy('sort_order')
                ->get();
                
            if ($examCourses->isEmpty()) {
                return $this->error('Önce sınava ders eklenmeli.', [], 422);
            }

        $spreadsheet = new Spreadsheet();
        $sheet = $spreadsheet->getActiveSheet();
        $sheet->setTitle('Cevap Anahtarı Şablonu');

        // Top merged header (Row 1)
        /** @var \Carbon\Carbon|null $examDateObj */
        $examDateObj = $exam->exam_date;
        $examDateStr = $examDateObj ? $examDateObj->format('d.m.Y') : '';
        $topHeaderText = "{$exam->id} - {$exam->exam_type} - {$exam->name} - {$examDateStr} => A Kitapçığı CEVAP ANAHTARI";
        $sheet->setCellValue('A1', $topHeaderText);
        $sheet->mergeCells('A1:L1');
        $sheet->getStyle('A1')->getAlignment()->setHorizontal(\PhpOffice\PhpSpreadsheet\Style\Alignment::HORIZONTAL_CENTER);
        $sheet->getStyle('A1')->getFont()->setBold(true)->setSize(14)->getColor()->setRGB('FFFFFF');
        $sheet->getStyle('A1')->getFill()->setFillType(\PhpOffice\PhpSpreadsheet\Style\Fill::FILL_SOLID)
            ->getStartColor()->setRGB('4F81BD');

        // Column Headers (Row 2)
        $headers = [
            'ID', 'Ders Grubu', 'Ders', 'Soru No', 'Doğru Cevap', 'Doğru Cevap 2', 'Doğru Cevap 3', 
            'Konu Kodu veya Konu Adı', 'B Kitapçığı Karşılığı', 'C Kitapçığı Karşılığı', 'D Kitapçığı Karşılığı', 
            'Soru Çözüm Video Bağlantısı'
        ];
        foreach ($headers as $col => $header) {
            $sheet->setCellValue([$col + 1, 2], $header);
        }
        
        $headerStyle = $sheet->getStyle([1, 2, 12, 2]);
        $headerStyle->getFont()->setBold(true);
        $headerStyle->getFill()->setFillType(\PhpOffice\PhpSpreadsheet\Style\Fill::FILL_SOLID)
            ->getStartColor()->setRGB('A6A6A6'); // Gray color as per image
        $headerStyle->getFont()->getColor()->setRGB('FFFFFF');

        $rowNum = 3;
        foreach ($examCourses as $ec) {
            $courseName = $ec->course?->name ?? 'Ders ' . $ec->course_id;
            $qCount = $ec->question_count ?: 20;
            
            for ($q = 1; $q <= $qCount; $q++) {
                $sheet->setCellValue([1, $rowNum], ''); // ID (Empty)
                $sheet->setCellValue([2, $rowNum], ''); // Ders Grubu (Empty)
                $sheet->setCellValue([3, $rowNum], $courseName);
                $sheet->setCellValue([4, $rowNum], $q);
                $sheet->setCellValue([5, $rowNum], 'A'); // Doğru Cevap
                $sheet->setCellValue([6, $rowNum], '');  // Doğru Cevap 2
                $sheet->setCellValue([7, $rowNum], '');  // Doğru Cevap 3
                $sheet->setCellValue([8, $rowNum], '');  // Konu Kodu/Adı
                $sheet->setCellValue([9, $rowNum], $q);  // B Karşılığı (Default same qno)
                $sheet->setCellValue([10, $rowNum], $q); // C Karşılığı
                $sheet->setCellValue([11, $rowNum], $q); // D Karşılığı
                $sheet->setCellValue([12, $rowNum], ''); // Video URL
                $rowNum++;
            }
        }

        foreach (range(1, 12) as $col) {
            $sheet->getColumnDimensionByColumn($col)->setAutoSize(true);
        }

        $topicsSheet = $spreadsheet->createSheet();
        $topicsSheet->setTitle('Konu Listesi');
        $topicsSheet->setCellValue([1, 1], 'Ders');
        $topicsSheet->setCellValue([2, 1], 'Konu/Kazanım ID');
        $topicsSheet->setCellValue([3, 1], 'Konu/Kazanım Adı');
        
        $topicsHeaderStyle = $topicsSheet->getStyle([1, 1, 3, 1]);
        $topicsHeaderStyle->getFont()->setBold(true);
        $topicsHeaderStyle->getFill()->setFillType(\PhpOffice\PhpSpreadsheet\Style\Fill::FILL_SOLID)
            ->getStartColor()->setRGB('70AD47');
        $topicsHeaderStyle->getFont()->getColor()->setRGB('FFFFFF');

        $topicRow = 2;
        foreach ($examCourses as $ec) {
            $courseName = $ec->course?->name ?? 'Ders ' . $ec->course_id;
            $topics = OmrTopic::where('tenant_id', $this->tenantId())
                ->where('course_id', $ec->course_id)
                ->orderBy('sort_order')
                ->orderBy('name')
                ->get();
            
            foreach ($topics as $topic) {
                $topicsSheet->setCellValue([1, $topicRow], $courseName);
                $topicsSheet->setCellValue([2, $topicRow], $topic->id);
                $topicsSheet->setCellValue([3, $topicRow], $topic->name);
                $topicRow++;
            }
        }
        
        foreach (range(1, 3) as $col) {
            $topicsSheet->getColumnDimensionByColumn($col)->setAutoSize(true);
        }

        $spreadsheet->setActiveSheetIndex(0);

        $writer = new Xlsx($spreadsheet);
        $tempFile = tempnam(sys_get_temp_dir(), 'answer_key_template_') . '.xlsx';
        $writer->save($tempFile);
        
        $filename = 'cevap_anahtari_sablonu_' . $exam->id . '.xlsx';
        
            return response()->download($tempFile, $filename, [
                'Content-Type' => 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
            ])->deleteFileAfterSend(true);
        } catch (\Exception $ex) {
            return $this->error('Hata: ' . $ex->getMessage(), [], 500);
        }
    }

    // ANSWER KEY - Import from Excel
    public function importAnswerKeysFromExcel(Request $request, int $id): JsonResponse
    {
        if ($e = $this->ensureAccess()) return $e;
        $exam = OmrExam::where('tenant_id', $this->tenantId())->findOrFail($id);

        if (OmrExamCourse::where('exam_id', $exam->id)->count() === 0) {
            return $this->error('Önce sınava dersler eklenmeli.', [], 422);
        }

        $request->validate([
            'file' => 'required|file|mimes:xlsx,xls|max:2048',
        ]);

        $file = $request->file('file');
        
        try {
            // Support both .xlsx and .xls by choosing reader dynamically
            $reader = IOFactory::createReaderForFile($file->getPathname());
            $reader->setReadDataOnly(true);
            $spreadsheet = $reader->load($file->getPathname());
            $sheet = $spreadsheet->getActiveSheet();
            $data = $sheet->toArray();

            if (empty($data) || count($data) < 3) {
                return $this->error('Excel dosyası boş veya geçersiz (Başlıklar dahil min 3 satır olmalı).', [], 422);
            }

            // Skip top merged header (Row 1) and column headers (Row 2)
            $data = array_slice($data, 2);

            $keys = [];
            $errors = [];
            $courseMap = [];
            
            $examCourses = OmrExamCourse::where('exam_id', $exam->id)
                ->with('course:id,name')
                ->get();
            foreach ($examCourses as $ec) {
                $rawName = (string) ($ec->course?->name ?? '');
                if ($rawName === '') continue;
                $courseMap[$rawName] = $ec->course_id;
                $courseMap[$this->normalizeCourseNameKey($rawName)] = $ec->course_id;
            }

            $rowNum = 3; // Data starts at Row 3
            foreach ($data as $row) {
                // If column indices (2:Course or 3:Qno) are empty, skip
                if (empty($row[2]) || empty($row[3])) {
                    $rowNum++;
                    continue;
                }

                $courseName = trim((string)($row[2] ?? ''));
                $questionNo = (int)($row[3] ?? 0);
                if ($questionNo < 1) {
                    $errors[] = "Satır {$rowNum}: Soru no geçersiz.";
                    $rowNum++;
                    continue;
                }
                $bookletA   = $row[3] ?? null; // A is same as QNo
                $bookletB   = $row[8] ?? null;
                $bookletC   = $row[9] ?? null;
                $bookletD   = $row[10] ?? null;
                $correctAnswer = strtoupper(trim((string)($row[4] ?? 'A')));
                $topicName  = trim((string)($row[7] ?? ''));

                $courseId = $courseMap[$courseName]
                    ?? $courseMap[$this->normalizeCourseNameKey($courseName)]
                    ?? null;
                if (!$courseId) {
                    $errors[] = "Satır {$rowNum}: '{$courseName}' dersi bulunamadı.";
                    $rowNum++;
                    continue;
                }

                if (!in_array($correctAnswer, ['A', 'B', 'C', 'D', 'E'], true)) {
                    $correctAnswer = 'A';
                }

                $key = [
                    'course_id' => $courseId,
                    'question_no' => $questionNo,
                    'booklet_a_qno' => is_numeric($bookletA) ? (int)$bookletA : $questionNo,
                    'booklet_b_qno' => is_numeric($bookletB) ? (int)$bookletB : null,
                    'booklet_c_qno' => is_numeric($bookletC) ? (int)$bookletC : null,
                    'booklet_d_qno' => is_numeric($bookletD) ? (int)$bookletD : null,
                    'correct_answer' => $correctAnswer,
                    'topic_id' => null,
                    'custom_topic_text' => null,
                ];

                if (!empty($topicName)) {
                    $topicName = mb_substr($topicName, 0, 200);
                    $topic = OmrTopic::where('tenant_id', $this->tenantId())
                        ->where('course_id', $courseId)
                        ->where('name', $topicName)
                        ->first();
                    
                    if ($topic) {
                        $key['topic_id'] = $topic->id;
                    } else {
                        $key['custom_topic_text'] = $topicName;
                    }
                }

                $keys[] = $key;
                $rowNum++;
            }

            if (empty($keys)) {
                return $this->error('Import edilecek geçerli veri bulunamadı.', ['errors' => $errors], 422);
            }

            $request->merge(['keys' => $keys]);
            return $this->answerKeysBulkSave($request, $id);

        } catch (\Throwable $ex) {
            return $this->error('Excel işlenirken hata: ' . $ex->getMessage(), [], 500);
        }
    }

    // OMR FILE IMPORT - STAGING LAYER
    public function importPreview(Request $request, int $id): JsonResponse
    {
        if ($e = $this->ensureAccess()) return $e;
        $exam = OmrExam::where('tenant_id', $this->tenantId())
            ->with(['template'])
            ->findOrFail($id);

        $data = $request->validate([
            'exam_id' => 'nullable|integer',
            'template_id' => 'nullable|integer',
            'parsed_rows' => 'required|array|min:1',
            'parsed_rows.*.row_no' => 'nullable|integer|min:1',
            'parsed_rows.*.txt_tc_no' => 'nullable|string|max:30',
            'parsed_rows.*.txt_full_name' => 'nullable|string|max:255',
            'parsed_rows.*.txt_school_no' => 'nullable|string|max:100',
            'parsed_rows.*.txt_classroom_section' => 'nullable|string|max:120',
            'parsed_rows.*.txt_gender' => 'nullable|string|max:30',
            'parsed_rows.*.booklet_type' => 'nullable|string|max:2',
            'parsed_rows.*.parsed_fields' => 'nullable|array',
            'parsed_rows.*.raw_answers' => 'nullable|array',
        ]);

        if (!$exam->template) return $this->error('Bu sınava OMR şablonu atanmamış.', [], 422);
        if (empty($exam->configured_at)) return $this->error('Sınav henüz yapılandırılmamış. Önce yapılandırmayı tamamlayın.', [], 422);

        $rows = [];
        foreach ($data['parsed_rows'] as $i => $row) {
            $booklet = strtoupper((string) ($row['booklet_type'] ?? 'A'));
            if (!in_array($booklet, self::BOOKLETS, true)) {
                $booklet = 'A';
            }

            $rows[] = [
                'row_no' => (int) ($row['row_no'] ?? ($i + 1)),
                'txt_tc_no' => trim((string) ($row['txt_tc_no'] ?? '')),
                'txt_full_name' => trim((string) ($row['txt_full_name'] ?? '')),
                'txt_school_no' => trim((string) ($row['txt_school_no'] ?? '')),
                'txt_classroom_section' => trim((string) ($row['txt_classroom_section'] ?? '')),
                'txt_gender' => trim((string) ($row['txt_gender'] ?? '')),
                'booklet_type' => $booklet,
                'parsed_fields' => is_array($row['parsed_fields'] ?? null) ? $row['parsed_fields'] : [],
                'raw_answers' => is_array($row['raw_answers'] ?? null) ? $row['raw_answers'] : [],
                'match_status' => 'unmatched',
                'matched_by' => null,
                'db_student_id' => null,
                'db_student_name' => null,
            ];
        }

        [$rows, $matched] = $this->applyAutoMatch($rows, $this->tenantId());
        $total = count($rows);

        return $this->success([
            'rows' => $this->utf8izeMixed($rows),
            'summary' => [
                'total_rows' => $total,
                'matched_rows' => $matched,
                'unmatched_rows' => $total - $matched,
            ],
        ], 'Satırlar alındı, otomatik eşleştirme tamamlandı.');
    }

    public function importAutoMatch(Request $request, int $id): JsonResponse
    {
        if ($e = $this->ensureAccess()) return $e;
        OmrExam::where('tenant_id', $this->tenantId())->findOrFail($id);

        $data = $request->validate([
            'rows' => 'required|array|min:1',
            'rows.*.row_no' => 'required|integer|min:1',
            'rows.*.txt_tc_no' => 'nullable|string|max:30',
            'rows.*.txt_full_name' => 'nullable|string|max:255',
            'rows.*.txt_school_no' => 'nullable|string|max:100',
            'rows.*.booklet_type' => 'nullable|string|max:2',
            'rows.*.parsed_fields' => 'nullable|array',
            'rows.*.raw_answers' => 'nullable|array',
        ]);

        [$rows, $matched] = $this->applyAutoMatch($data['rows'], $this->tenantId());
        $total = count($rows);

        return $this->success([
            'rows' => $this->utf8izeMixed($rows),
            'summary' => [
                'total_rows' => $total,
                'matched_rows' => $matched,
                'unmatched_rows' => $total - $matched,
            ],
        ], 'Otomatik eşleştirme tamamlandı.');
    }

    public function studentsSearch(Request $request, int $id): JsonResponse
    {
        if ($e = $this->ensureAccess()) return $e;
        $exam = OmrExam::where('tenant_id', $this->tenantId())->findOrFail($id);

        $q = trim((string) $request->get('q', ''));
        $limit = min(max((int) $request->get('limit', 50), 1), 200);
        $inExam = (bool) $request->get('in_exam', false);

        $query = Student::where('tenant_id', $this->tenantId())
            ->where('is_active', true)
            ->select(['id', 'name', 'school_no', 'classroom_id'])
            ->with('classroom:id,name')
            ->orderBy('name');

        if ($q !== '') {
            $query->where(function ($inner) use ($q) {
                $inner->where('name', 'like', "%{$q}%")
                    ->orWhere('school_no', 'like', "%{$q}%");
            });
        }

        if ($inExam) {
            $effectiveExamIds = $this->effectiveExamIdsForExam($exam);
            $query->whereIn('id', OmrResult::whereIn('exam_id', $effectiveExamIds)->select('student_id'));
        }

        $students = $query->limit($limit)->get();

        return $this->success(['students' => $students]);
    }

    public function importFinalize(Request $request, int $id): JsonResponse
    {
        if ($e = $this->ensureAccess()) return $e;
        $exam = OmrExam::where('tenant_id', $this->tenantId())
            ->with(['answerKeys.course', 'template', 'examCourses'])
            ->findOrFail($id);

        if (!$exam->template) return $this->error('Bu sınava OMR şablonu atanmamış.', [], 422);
        if (empty($exam->configured_at)) return $this->error('Sınav henüz yapılandırılmamış. Önce yapılandırmayı tamamlayın.', [], 422);

        $data = $request->validate([
            'rows' => 'required|array|min:1',
            'rows.*.row_no' => 'required|integer|min:1',
            'rows.*.db_student_id' => 'nullable|integer|exists:students,id',
            'rows.*.booklet_type' => 'nullable|string|max:2',
            'rows.*.raw_answers' => 'nullable|array',
            'rows.*.parsed_fields' => 'nullable|array',
            'rows.*.txt_school_no' => 'nullable|string|max:100',
            'rows.*.matched_by' => 'nullable|string|max:40',
        ]);

        $allRows = $data['rows'];
        $matchedRows = collect($allRows)->filter(fn($r) => !empty($r['db_student_id']))->values()->all();
        $skippedUnmatched = count($allRows) - count($matchedRows);

        if (count($matchedRows) === 0) {
            return $this->error('En az 1 satır eşleştirilmeden hesaplama yapılamaz.', [], 422);
        }

        [$calculatedRows] = $this->calculateMatchedRows($exam, $matchedRows);
        [$imported, $skipped, $errors] = $this->persistCalculatedRows($exam, $calculatedRows);
        $skipped += $skippedUnmatched;
        if ($skippedUnmatched > 0) {
            array_unshift($errors, $skippedUnmatched . ' satır eşleşmediği için atlandı.');
        }
        $exam->update(['status' => $exam->status === 'draft' ? 'active' : $exam->status]);

        return $this->success([
            'imported' => $imported,
            'skipped' => $skipped,
            'errors' => $errors,
        ], "{$imported} öğrenci sonucu hesaplandı ve kaydedildi.");
    }

    public function importCalculate(Request $request, int $id): JsonResponse
    {
        if ($e = $this->ensureAccess()) return $e;
        $exam = OmrExam::where('tenant_id', $this->tenantId())
            ->with(['answerKeys.course', 'template', 'examCourses'])
            ->findOrFail($id);

        if (!$exam->template) return $this->error('Bu sınava OMR şablonu atanmamış.', [], 422);
        if (empty($exam->configured_at)) return $this->error('Sınav henüz yapılandırılmamış. Önce yapılandırmayı tamamlayın.', [], 422);

        $data = $request->validate([
            'rows' => 'required|array|min:1',
            'rows.*.row_no' => 'required|integer|min:1',
            'rows.*.db_student_id' => 'nullable|integer|exists:students,id',
            'rows.*.booklet_type' => 'nullable|string|max:2',
            'rows.*.raw_answers' => 'nullable|array',
            'rows.*.parsed_fields' => 'nullable|array',
            'rows.*.txt_school_no' => 'nullable|string|max:100',
            'rows.*.matched_by' => 'nullable|string|max:40',
        ]);

        $allRows = $data['rows'];
        $matchedRows = collect($allRows)->filter(fn($r) => !empty($r['db_student_id']))->values()->all();
        $skippedUnmatched = count($allRows) - count($matchedRows);

        if (count($matchedRows) === 0) {
            return $this->error('En az 1 satır eşleştirilmeden hesaplama yapılamaz.', [], 422);
        }

        [$calculatedRows, $skipped, $errors] = $this->calculateMatchedRows($exam, $matchedRows);
        $skipped += $skippedUnmatched;
        if ($skippedUnmatched > 0) {
            array_unshift($errors, $skippedUnmatched . ' satır eşleşmediği için atlandı.');
        }

        return $this->success([
            'rows' => $this->utf8izeMixed($calculatedRows),
            'summary' => [
                'calculated' => count($calculatedRows),
                'skipped' => $skipped,
            ],
            'errors' => $errors,
        ], 'Eşleşen satırlar hesaplandı. Kaydetme için onay bekleniyor.');
    }

    public function importSave(Request $request, int $id): JsonResponse
    {
        if ($e = $this->ensureAccess()) return $e;
        $exam = OmrExam::where('tenant_id', $this->tenantId())
            ->with(['template'])
            ->findOrFail($id);

        if (!$exam->template) return $this->error('Bu sınava OMR şablonu atanmamış.', [], 422);
        if (empty($exam->configured_at)) return $this->error('Sınav henüz yapılandırılmamış. Önce yapılandırmayı tamamlayın.', [], 422);

        $data = $request->validate([
            'rows' => 'required|array|min:1',
            'rows.*.row_no' => 'required|integer|min:1',
            'rows.*.db_student_id' => 'required|integer|exists:students,id',
            'rows.*.student_no' => 'nullable|string|max:100',
            'rows.*.booklet_type' => 'required|string|max:2',
            'rows.*.raw_answers' => 'required|array',
            'rows.*.parsed_fields' => 'nullable|array',
            'rows.*.course_scores' => 'required|array',
            'rows.*.total_net' => 'required|numeric',
            'rows.*.total_point' => 'required|numeric',
        ]);

        [$imported, $skipped, $errors] = $this->persistCalculatedRows($exam, $data['rows']);
        $exam->update(['status' => $exam->status === 'draft' ? 'active' : $exam->status]);

        return $this->success([
            'imported' => $imported,
            'skipped' => $skipped,
            'errors' => $errors,
            'exam_status' => (string) $exam->fresh()->status,
        ], "{$imported} sonuç kaydedildi.");
    }

    // RESULTS
    public function resultsIndex(Request $request, int $id): JsonResponse
    {
        if ($e = $this->ensureAccess()) return $e;
        $exam = OmrExam::where('tenant_id', $this->tenantId())
            ->with(['examCourses.course:id,name'])
            ->findOrFail($id);

        $mergedIds = array_values(array_filter(array_map('intval', (array) ($exam->merged_exam_ids ?? []))));
        $targetExamIds = !empty($mergedIds) ? $mergedIds : [$id];

        $query = OmrResult::whereIn('exam_id', $targetExamIds)
            ->with(['student:id,name,school_no,classroom_id', 'student.classroom:id,name']);
        if ($request->filled('classroom_id'))
            $query->whereHas('student', fn($q) => $q->where('classroom_id', (int)$request->get('classroom_id')));

        if (empty($mergedIds)) {
            return $this->resultsIndexSimple($request, $exam, $query);
        }

        return $this->resultsIndexMerged($exam, $query, $mergedIds);
    }

    private function resultsIndexSimple(Request $request, OmrExam $exam, $query): JsonResponse
    {
        $query->orderBy('rank');
        $perPage = min((int)$request->get('per_page', 50), 200);
        $results = $query->paginate($perPage);
        $courseHeaders = $this->buildResultHeaders($exam, $results->items());
        return $this->success(['results' => $results->items(), 'pagination' => [
            'current_page' => $results->currentPage(), 'last_page' => $results->lastPage(), 'total' => $results->total(),
        ], 'course_headers' => $courseHeaders]);
    }

    private function resultsIndexMerged(OmrExam $exam, $query, array $mergedIds): JsonResponse
    {
        $all = $query->get();
        $combined = $all->groupBy('student_id')->map(function ($rows) {
            $first = $rows->first();
            $courseAgg = [];
            foreach ($rows as $r) {
                foreach ((array) ($r->course_scores ?? []) as $cid => $s) {
                    $cid = (int) $cid;
                    if (!isset($courseAgg[$cid])) {
                        $courseAgg[$cid] = ['correct' => 0, 'wrong' => 0, 'blank' => 0, 'net' => 0.0, 'point' => 0.0];
                    }
                    $courseAgg[$cid]['correct'] += (int) ($s['correct'] ?? 0);
                    $courseAgg[$cid]['wrong']   += (int) ($s['wrong'] ?? 0);
                    $courseAgg[$cid]['blank']   += (int) ($s['blank'] ?? 0);
                    $courseAgg[$cid]['net']     += (float) ($s['net'] ?? 0);
                    $courseAgg[$cid]['point']   += (float) ($s['point'] ?? 0);
                }
            }
            $totalNet   = array_sum(array_map(fn($v) => (float) ($v['net'] ?? 0), $courseAgg));
            $totalPoint = array_sum(array_map(fn($v) => (float) ($v['point'] ?? 0), $courseAgg));
            return [
                'id'           => (int) ($first?->id ?? 0),
                'student_id'   => (int) ($first?->student_id ?? $first?->student?->id ?? 0),
                'student_no'   => (string) ($first?->student_no ?? ''),
                'booklet_type' => 'M',
                'total_net'    => round($totalNet, 3),
                'total_point'  => round($totalPoint, 3),
                'rank'         => 0,
                'course_scores'=> $courseAgg,
                'student'      => $first?->student,
            ];
        })->values();

        $sorted = $combined->sortByDesc('total_point')->values();
        $sorted = $sorted->map(function ($row, $idx) {
            $row['rank'] = $idx + 1;
            return $row;
        });

        $courseHeaders = $this->buildResultHeaders($exam, $sorted->toArray());
        return $this->success([
            'results'         => $sorted,
            'pagination'      => ['current_page' => 1, 'last_page' => 1, 'total' => $sorted->count()],
            'course_headers'  => $courseHeaders,
            'merged_exam_ids' => $mergedIds,
        ]);
    }

    public function resultUpdate(Request $request, int $id, int $resultId): JsonResponse
    {
        if ($e = $this->ensureAccess()) return $e;
        $exam = OmrExam::where('tenant_id', $this->tenantId())->findOrFail($id);
        $result = OmrResult::where('exam_id', $id)->findOrFail($resultId);

        $data = $request->validate([
            'student_id' => 'nullable|integer|exists:students,id',
            'course_scores' => 'nullable|array',
            'course_scores.*.correct' => 'required_with:course_scores|integer|min:0',
            'course_scores.*.wrong' => 'required_with:course_scores|integer|min:0',
        ]);

        $coeffMap = $this->buildExamCourseCoefficientMap($exam->id, $exam->exam_type);
        $penalty = $exam->wrong_penalty;
        $currentScores = (array) ($result->course_scores ?? []);
        $updatedScores = $currentScores;

        if (!empty($data['course_scores'])) {
            foreach ((array) $data['course_scores'] as $courseId => $score) {
                $cId = (int) $courseId;
                $correct = max(0, (int) ($score['correct'] ?? 0));
                $wrong = max(0, (int) ($score['wrong'] ?? 0));

                $examCourse = $exam->examCourses?->firstWhere('course_id', $cId);
                $courseQCount = (int) ($examCourse?->question_count ?? 0);
                $answerLen = strlen((string) (($result->raw_answers ?? [])[(string) $cId] ?? (($result->raw_answers ?? [])[$cId] ?? '')));
                $totalQuestions = max($answerLen, $courseQCount);
                $blank = max(0, $totalQuestions - $correct - $wrong);
                $net = (float) $correct;
                if ($penalty !== null && $penalty > 0) {
                    $net = $correct - ($wrong / $penalty);
                }
                $point = round($net * ($coeffMap[$cId] ?? 1.0), 3);

                $updatedScores[$cId] = [
                    'correct' => $correct,
                    'wrong' => $wrong,
                    'blank' => $blank,
                    'net' => round($net, 3),
                    'point' => $point,
                ];
            }
        }

        $totalNet = collect($updatedScores)->sum(fn($row) => (float) ($row['net'] ?? 0));
        $totalPoint = collect($updatedScores)->sum(fn($row) => (float) ($row['point'] ?? 0));

        $payload = [
            'course_scores' => $updatedScores,
            'total_net' => round($totalNet, 3),
            'total_point' => round($totalPoint, 3),
            'calculated_at' => now(),
        ];

        if (!empty($data['student_id']) && (int) $data['student_id'] !== (int) $result->student_id) {
            $student = Student::where('tenant_id', $this->tenantId())->findOrFail((int) $data['student_id']);
            $payload['student_id'] = (int) $student->id;
            $payload['student_no'] = (string) ($student->school_no ?? $result->student_no);
        }

        $result->update($payload);
        $this->recalculateRanks($id);

        return $this->success([
            'result' => $result->fresh()->load(['student:id,name,school_no,classroom_id', 'student.classroom:id,name']),
        ], 'Sonuç güncellendi.');
    }

    public function resultDestroy(int $id, int $resultId): JsonResponse
    {
        if ($e = $this->ensureAccess()) return $e;
        OmrExam::where('tenant_id', $this->tenantId())->findOrFail($id);
        $result = OmrResult::where('exam_id', $id)->findOrFail($resultId);
        $result->delete();
        $this->recalculateRanks($id);

        return $this->success([], 'Sonuç silindi.');
    }

    public function resultsRecalculate(int $id): JsonResponse
    {
        if ($e = $this->ensureAccess()) return $e;
        $exam = OmrExam::where('tenant_id', $this->tenantId())->findOrFail($id);

        $mergedIds = array_values(array_filter(array_map('intval', (array) ($exam->merged_exam_ids ?? []))));
        $targetExamIds = !empty($mergedIds) ? $mergedIds : [$id];

        $totalUpdated = 0;
        foreach ($targetExamIds as $targetId) {
            $totalUpdated += $this->recalculateExamResults($targetId);
        }

        return $this->success([
            'updated_count' => $totalUpdated,
        ], "{$totalUpdated} öğrenci sonucu başarıyla yeniden hesaplandı.");
    }

    public function resultStudent(int $id, int $studentId): JsonResponse
    {
        if ($e = $this->ensureAccess()) return $e;
        $exam = OmrExam::where('tenant_id', $this->tenantId())->findOrFail($id);
        $result = OmrResult::where('exam_id', $id)->where('student_id', $studentId)
            ->with(['student:id,name,school_no', 'exam'])->firstOrFail();

        $rawAnswers = (array) ($result->raw_answers ?? []);
        if (!empty($rawAnswers)) {
            $aMap = $this->buildBookletAnswerMap($id);
            $cMap = $this->buildExamCourseCoefficientMap($id, $exam->exam_type);
            $calc = $this->calculateResultScoresFromRaw($exam, $rawAnswers, (string) ($result->booklet_type ?? 'A'), $aMap, $cMap);
            if ((float) $result->total_net !== (float) $calc['total_net'] || $result->course_scores != $calc['course_scores']) {
                $result->update([
                    'course_scores' => $calc['course_scores'],
                    'total_net'     => $calc['total_net'],
                    'total_point'   => $calc['total_point'],
                    'calculated_at' => now(),
                ]);
                $result->refresh();
            }
        }

        $topicAnalysis = $this->buildStudentTopicAnalysis($result);

        return $this->success(['result' => $result, 'topic_analysis' => $topicAnalysis, 'parsed_fields' => $result->parsed_fields]);
    }

    // ANALYTICS – Level 1: General exam analytics
    public function analytics(Request $request, int $id): JsonResponse
    {
        if ($e = $this->ensureAccess()) return $e;
        $tenantId = $this->tenantId();
        $exam = OmrExam::where('tenant_id', $tenantId)->findOrFail($id);

        $examIds = $this->parseExamIdsFromRequest($request, $id);
        $validIds = OmrExam::where('tenant_id', $tenantId)->whereIn('id', $examIds)->pluck('id')->toArray();
        if (empty($validIds)) return $this->error('Geçerli sınav bulunamadı.', [], 422);

        $expanded = $this->resolveEffectiveExamIds($validIds);
        if (!empty($expanded)) $validIds = $expanded;

        $mergedIds = count($validIds) > 1
            ? array_values($validIds)
            : array_values(array_filter(array_map('intval', (array) ($exam->merged_exam_ids ?? []))));

        $targetExamIds = !empty($mergedIds) ? $mergedIds : [(int) $id];

        $query = OmrResult::whereIn('exam_id', $targetExamIds);
        if ($request->filled('classroom_id')) {
            $query->whereHas('student', fn($q) => $q->where('classroom_id', (int) $request->get('classroom_id')));
        }

        $binSize = max(0.1, (float) $request->get('bin_size', 5));
        $resultsForAnalysis = $this->analyticsGetResultsForAnalysis($query, $mergedIds);

        $summary = $this->analyticsGetSummary($resultsForAnalysis);
        $distribution = $this->analyticsGetDistribution($resultsForAnalysis, $binSize);
        $classAverages = $this->analyticsGetClassAverages($query, $mergedIds);
        $courseAverages = $this->calculateExamCourseAverages($resultsForAnalysis);
        $courseDistributions = $this->analyticsGetCourseDistributions($resultsForAnalysis, $courseAverages->toArray(), $binSize);
        $topicData = $this->analyticsGetTopicData($request, $query, $id, $mergedIds, $resultsForAnalysis);

        return $this->success($this->utf8izeMixed(array_merge([
            'summary' => $summary,
            'distribution' => $distribution,
            'class_averages' => $classAverages,
            'course_averages' => $courseAverages,
            'course_distributions' => $courseDistributions,
            'merged_exam_ids' => $mergedIds,
        ], $topicData)));
    }


    private function analyticsGetResultsForAnalysis($query, array $mergedIds)
    {
        if (empty($mergedIds)) {
            return (clone $query)->select(['id', 'student_id', 'booklet_type', 'raw_answers', 'course_scores', 'total_net'])->get();
        }

        $all = (clone $query)->select(['student_id', 'course_scores', 'total_net', 'total_point'])->get();
        return $all->groupBy('student_id')->map(function ($rows) {
            $courseAgg = [];
            $totalNet = 0.0;
            $totalPoint = 0.0;
            foreach ($rows as $r) {
                $totalNet += (float) ($r->total_net ?? 0);
                $totalPoint += (float) ($r->total_point ?? 0);
                foreach ((array) ($r->course_scores ?? []) as $cid => $s) {
                    $cid = (int) $cid;
                    if (!isset($courseAgg[$cid])) {
                        $courseAgg[$cid] = ['correct' => 0, 'wrong' => 0, 'blank' => 0, 'net' => 0.0, 'point' => 0.0];
                    }
                    $courseAgg[$cid]['correct'] += (int) ($s['correct'] ?? 0);
                    $courseAgg[$cid]['wrong']   += (int) ($s['wrong'] ?? 0);
                    $courseAgg[$cid]['blank']   += (int) ($s['blank'] ?? 0);
                    $courseAgg[$cid]['net']     += (float) ($s['net'] ?? 0);
                    $courseAgg[$cid]['point']   += (float) ($s['point'] ?? 0);
                }
            }
            return (object) [
                'student_id' => (int) ($rows->first()?->student_id ?? 0),
                'course_scores' => $courseAgg,
                'total_net' => $totalNet,
                'total_point' => $totalPoint,
            ];
        })->values();
    }

    private function analyticsGetSummary($resultsForAnalysis)
    {
        $totalNets = $resultsForAnalysis->map(fn($r) => (float) ($r->total_net ?? 0))->values()->toArray();
        $summaryObj = $this->calcDescriptiveStats($totalNets);
        return [
            'total' => count($totalNets),
            'avg_net' => (float) ($summaryObj['mean'] ?? 0),
            'median_net' => (float) ($summaryObj['median'] ?? 0),
            'mode_net' => (float) ($summaryObj['mode'] ?? 0),
            'min_net' => count($totalNets) ? min($totalNets) : 0,
            'max_net' => count($totalNets) ? max($totalNets) : 0,
            'stddev_net' => (float) ($summaryObj['stddev'] ?? 0),
            'variance' => (float) ($summaryObj['variance'] ?? 0),
        ];
    }

    private function analyticsGetDistribution($resultsForAnalysis, float $binSize)
    {
        $totalNets = $resultsForAnalysis->map(fn($r) => (float) ($r->total_net ?? 0))->values()->toArray();
        $bins = [];
        foreach ($totalNets as $net) {
            $idx = (int) floor($net / $binSize);
            $bins[$idx] = ($bins[$idx] ?? 0) + 1;
        }
        ksort($bins);
        return collect($bins)->map(function ($count, $idx) use ($binSize) {
            return [
                'start' => round(((int) $idx) * $binSize, 2),
                'end' => round((((int) $idx) + 1) * $binSize, 2),
                'count' => (int) $count,
            ];
        })->values();
    }

    private function analyticsGetClassAverages($query, array $mergedIds)
    {
        if (!empty($mergedIds)) {
            $all = (clone $query)->with(['student:id,classroom_id', 'student.classroom:id,name'])->get();
            $byClass = $all->filter(fn($r) => $r->student && $r->student->classroom)
                ->groupBy(fn($r) => (int) $r->student->classroom_id);
            return $byClass->map(function ($rows, $cid) {
                $netsByStudent = $rows->groupBy('student_id')->map(fn($rr) => (float) $rr->sum('total_net'));
                $vals = $netsByStudent->values()->toArray();
                return [
                    'classroom_id' => (int) $cid,
                    'classroom_name' => (string) ($rows->first()->student->classroom->name ?? ''),
                    'total' => count($vals),
                    'avg_net' => count($vals) ? round(array_sum($vals) / count($vals), 2) : 0,
                ];
            })->values()->sortByDesc('avg_net')->values();
        }
        
        return (clone $query)
            ->join('students', 'students.id', '=', 'omr_results.student_id')
            ->join('classrooms', 'classrooms.id', '=', 'students.classroom_id')
            ->selectRaw('classrooms.id as classroom_id, classrooms.name as classroom_name, COUNT(*) as total, AVG(omr_results.total_net) as avg_net')
            ->groupBy('classrooms.id', 'classrooms.name')->orderByDesc('avg_net')->get();
    }

    private function analyticsGetCourseDistributions($resultsForAnalysis, array $courseAverages, float $binSize)
    {
        $courseNamesById = collect($courseAverages)->mapWithKeys(fn($r) => [(int) ($r['course_id'] ?? 0) => (string) ($r['course_name'] ?? '')])->all();
        $courseNetsById = [];
        foreach ($resultsForAnalysis as $r) {
            foreach ((array) ($r->course_scores ?? []) as $courseId => $score) {
                $cid = (int) $courseId;
                if ($cid <= 0) continue;
                $courseNetsById[$cid] = $courseNetsById[$cid] ?? [];
                $courseNetsById[$cid][] = (float) ($score['net'] ?? 0);
            }
        }
        return collect($courseNetsById)->map(function ($vals, $cid) use ($binSize, $courseNamesById) {
            $bins = [];
            foreach ((array) $vals as $v) {
                $idx = (int) floor(((float) $v) / $binSize);
                $bins[$idx] = ($bins[$idx] ?? 0) + 1;
            }
            ksort($bins);
            $dist = [];
            foreach ($bins as $idx => $count) {
                $dist[] = [
                    'start' => round($idx * $binSize, 2),
                    'end' => round(($idx + 1) * $binSize, 2),
                    'count' => (int) $count,
                ];
            }
            return [
                'course_id' => (int) $cid,
                'course_name' => (string) ($courseNamesById[(int) $cid] ?? ('Ders ' . (int) $cid)),
                'distribution' => $dist,
            ];
        })->values()->sortBy('course_name')->values();
    }

    private function analyticsGetTopicData(Request $request, $query, int $id, array $mergedIds, $resultsForAnalysis)
    {
        $mostMissedQuestions = [];
        $mostMissedTopics = [];
        $studentTopicAnalysis = [];
        if (empty($mergedIds)) {
            $answerKeys = OmrAnswerKey::where('exam_id', $id)
                ->with(['topic:id,name,type', 'course:id,name'])
                ->get();
            $questionDifficulty = $this->buildQuestionDifficulty($resultsForAnalysis, $answerKeys);
            $topicDifficulty = $this->extractTopicDifficulty($questionDifficulty);
            $mostMissedQuestions = $questionDifficulty->take(20)->values();
            $mostMissedTopics = $topicDifficulty->take(20)->values();

            if ($request->filled('student_id')) {
                $studentResult = (clone $query)->where('student_id', (int) $request->get('student_id'))->first();
                if ($studentResult) {
                    /** @var OmrResult $studentResult */
                    $studentTopicAnalysis = $this->buildStudentTopicAnalysis($studentResult, $answerKeys);
                }
            }
        }
        return [
            'most_missed_questions' => $mostMissedQuestions,
            'most_missed_topics' => $mostMissedTopics,
            'student_topic_analysis' => $studentTopicAnalysis,
        ];
    }


    // ANALYTICS – Level 2: Class drill-down (supports multiple exam_ids)
    public function analyticsClass(Request $request, int $id): JsonResponse
    {
        if ($e = $this->ensureAccess()) return $e;
        $tenantId = $this->tenantId();

        $rootExam = OmrExam::where('tenant_id', $tenantId)->findOrFail($id);

        $classroomId = (int) $request->get('classroom_id');
        if (!$classroomId) return $this->error('classroom_id gerekli.', [], 422);

        $examIds = $this->parseExamIdsFromRequest($request, $id);
        $validIds = OmrExam::where('tenant_id', $tenantId)->whereIn('id', $examIds)->pluck('id')->toArray();
        if (empty($validIds)) return $this->error('Geçerli sınav bulunamadı.', [], 422);

        $expanded = $this->resolveEffectiveExamIds($validIds);
        if (!empty($expanded)) $validIds = $expanded;

        $mergedIds = array_values(array_filter(array_map('intval', (array) ($rootExam->merged_exam_ids ?? []))));
        $isMerged = !empty($mergedIds);

        [$examAvg, $classNets, $classResults] = $this->analyticsClassGetNets($validIds, $classroomId, $isMerged);

        $classAvg = count($classNets) ? round(array_sum($classNets) / count($classNets), 2) : 0;
        $extStats = $this->calcDescriptiveStats($classNets);
        $students = $this->analyticsClassBuildStudents($classResults, $isMerged, $classAvg, $validIds);

        $belowAvg = collect($students)->filter(fn($r) => $r['below_avg'])->values();
        $courseAverages = $this->aggregateCourseAverages($classResults, $isMerged);

        $answerKeys = OmrAnswerKey::whereIn('exam_id', $validIds)->with(['topic:id,name', 'course:id,name'])->get();
        $topicDifficulty = $this->buildTopicDifficulty($classResults, $answerKeys);

        return $this->success($this->utf8izeMixed([
            'class_avg' => $classAvg,
            'exam_avg' => $examAvg,
            'class_stats' => $extStats,
            'student_count' => count($classNets),
            'students' => $students,
            'below_avg' => $belowAvg,
            'course_averages' => $courseAverages,
            'topic_difficulty' => $topicDifficulty->take(20)->values(),
            'exam_ids' => $validIds,
            'exam_count' => count($validIds),
        ]));
    }

    private function analyticsClassGetNets(array $validIds, int $classroomId, bool $isMerged)
    {
        $allNetsQuery = OmrResult::whereIn('exam_id', $validIds);
        if ($isMerged) {
            $allNetsResult = $allNetsQuery->get()
                ->groupBy('student_id')
                ->map(fn($rows) => (float)$rows->sum('total_net'))
                ->values()
                ->toArray();
        } else {
            $allNetsResult = $allNetsQuery->pluck('total_net')->map(fn($v) => (float)$v)->toArray();
        }
        $examAvg = count($allNetsResult) ? round(array_sum($allNetsResult) / count($allNetsResult), 2) : 0;

        $classResults = OmrResult::whereIn('exam_id', $validIds)
            ->whereHas('student', fn($q) => $q->where('classroom_id', $classroomId))
            ->with(['student:id,name,school_no,classroom_id'])
            ->get();

        if ($isMerged) {
            $classNets = $classResults->groupBy('student_id')
                ->map(fn($rows) => (float)$rows->sum('total_net'))
                ->values()
                ->toArray();
        } else {
            $classNets = $classResults->pluck('total_net')->map(fn($v) => (float)$v)->toArray();
        }

        return [$examAvg, $classNets, $classResults];
    }

    private function analyticsClassBuildStudents($classResults, bool $isMerged, float $classAvg, array $validIds)
    {
        $students = $classResults
            ->groupBy('student_id')
            ->map(function ($rows) use ($isMerged) {
                $first = $rows->first();
                $totalNet = $isMerged ? (float)$rows->sum('total_net') : (float)$rows->avg('total_net');
                $totalPoint = $isMerged ? (float)$rows->sum('total_point') : (float)$rows->avg('total_point');
                
                return [
                    'id' => (int) $first->student_id,
                    'name' => (string) ($first->student?->name ?? ''),
                    'school_no' => (string) ($first->student?->school_no ?? ''),
                    'total_net' => round($totalNet, 2),
                    'total_point' => round($totalPoint, 2),
                    'rank' => 0,
                    'below_avg' => false,
                    'result_id' => (int) ($first->id ?? 0),
                ];
            })->values();

        $students = $students->sortByDesc('total_point')->values()->map(function ($row, $idx) use ($classAvg) {
            $row['rank'] = $idx + 1;
            $row['below_avg'] = ((float) $row['total_net']) < $classAvg;
            return $row;
        });

        return $this->applyTScores($students->toArray(), $validIds);
    }


    /**
     * ANALYTICS – Level 3: Student drill-down (supports multiple exam_ids)
     *
     * @suppress PHP6613
     */
    public function analyticsStudent(Request $request, int $id): JsonResponse
    {
        if ($e = $this->ensureAccess()) return $e;
        $tenantId = $this->tenantId();

        $rootExam = OmrExam::where('tenant_id', $tenantId)->findOrFail($id);

        $studentId = (int) $request->get('student_id');
        if (!$studentId) return $this->error('student_id gerekli.', [], 422);

        // Collect exam IDs: if exam_ids[] provided use those, otherwise use route examId
        $examIds = $this->parseExamIdsFromRequest($request, $id);
        $validIds = OmrExam::where('tenant_id', $tenantId)->whereIn('id', $examIds)->pluck('id')->toArray();
        if (empty($validIds)) return $this->error('Geçerli sınav bulunamadı.', [], 422);

        // If root exam is a merged exam, expand to underlying exam IDs
        $expanded = $this->resolveEffectiveExamIds($validIds);
        if (!empty($expanded)) $validIds = $expanded;

        // Fetch all results for this student across selected exams
        $studentResults = OmrResult::whereIn('exam_id', $validIds)
            ->where('student_id', $studentId)
            ->with(['student:id,name,school_no,classroom_id', 'student.classroom:id,name', 'exam'])
            ->get();

        if ($studentResults->isEmpty()) {
            return $this->error('Öğrenci bu sınavlarda sonuç bulunamadı.', [], 422);
        }

        // Auto-recalculate any results for this student if raw_answers is present
        try {
            $examMap = OmrExam::whereIn('id', $validIds)->get()->keyBy('id');
            foreach ($studentResults as $rs) {
                $rawAnswers = (array) ($rs->raw_answers ?? []);
                if (!empty($rawAnswers)) {
                    $examObj = $examMap[$rs->exam_id] ?? $rootExam;
                    if ($examObj) {
                        $aMap = $this->buildBookletAnswerMap($rs->exam_id);
                        $cMap = $this->buildExamCourseCoefficientMap($rs->exam_id, (string) ($examObj->exam_type ?? 'lgs'));
                        $calc = $this->calculateResultScoresFromRaw($examObj, $rawAnswers, (string) ($rs->booklet_type ?? 'A'), $aMap, $cMap);

                        if ((float) $rs->total_net !== (float) $calc['total_net'] || $rs->course_scores != $calc['course_scores']) {
                            $rs->update([
                                'course_scores' => $calc['course_scores'],
                                'total_net'     => $calc['total_net'],
                                'total_point'   => $calc['total_point'],
                                'calculated_at' => now(),
                            ]);
                            $rs->refresh();
                        }
                    }
                }
            }
        } catch (\Throwable $calcEx) {
            \Log::warning('analyticsStudent auto-recalc warning: ' . $calcEx->getMessage());
        }

        $firstResult = $studentResults->first();
        $student = $firstResult->student;
        $classroomId = $student?->classroom_id;

        $isMerged = !empty(array_values(array_filter(array_map('intval', (array) ($rootExam->merged_exam_ids ?? [])))));
        $examSummaries = $this->buildStudentExamSummaries($studentResults, $validIds);
        $meta = $this->buildStudentAnalyticsMetadata($studentResults, $validIds, $classroomId, $isMerged);

        $courseScores = $this->aggregateStudentCourseScores($studentResults, $isMerged);

        // Aggregate wrong/blank questions across all exams
        $answerKeys = OmrAnswerKey::whereIn('exam_id', $validIds)
            ->with(['topic:id,name,type', 'course:id,name'])
            ->orderBy('course_id')->orderBy('question_no')
            ->get()->groupBy('exam_id');

        $allQuestions = $this->analyzeStudentQuestions($studentResults, $answerKeys);
        $questionDetail = array_values(array_filter($allQuestions, fn($q) => $q['status'] !== 'correct'));

        // Topic analysis aggregated across selected exams
        $topicAnalysis = $this->aggregateStudentTopicAnalysis($studentResults, $answerKeys, $rootExam->wrong_penalty);

        // Aggregate result object (averaged)
        $aggregatedResult = [
            'id'           => $firstResult->id,
            'total_net'    => $isMerged ? (float)$studentResults->sum('total_net') : $meta['avg_net'],
            'total_point'  => $isMerged ? (float)$studentResults->sum('total_point') : $meta['avg_point'],
            'rank'         => (int)$firstResult->rank,
            'booklet_type' => $firstResult->booklet_type,
        ];

        $patchedResults = $this->applyTScores(collect([$aggregatedResult]), $validIds);
        $aggregatedResult = $patchedResults[0] ?? $aggregatedResult;

        return $this->success($this->utf8izeMixed([
            'student'               => $student,
            'result'                => $aggregatedResult,
            'exam_summaries'        => $examSummaries,
            'exam_stats'            => $meta['exam_stats'],
            'exam_avg'              => $meta['exam_avg'],
            'class_avg'             => $meta['class_avg'],
            'percentile'            => $meta['percentile'],
            'exam_total'            => $meta['exam_total'],
            'course_scores'         => collect($courseScores)->values(),
            'wrong_blank_questions' => $questionDetail,
            'questions'             => $allQuestions,
            'topic_analysis'        => $topicAnalysis,
            'exam_ids'              => $validIds,
            'exam_count'            => count($validIds),
        ]));
    }

    // ANALYTICS – Correlation Matrix (Pearson between courses)
    public function analyticsCorrelation(Request $request, int $id): JsonResponse
    {
        if ($e = $this->ensureAccess()) return $e;
        $tenantId = $this->tenantId();
        OmrExam::where('tenant_id', $tenantId)->findOrFail($id);

        $classroomId = $request->filled('classroom_id') ? (int)$request->get('classroom_id') : null;
        $studentId   = $request->filled('student_id') ? (int)$request->get('student_id') : null;

        // Optional multi-exam correlation
        $examIds = array_filter(array_map('intval', (array)$request->get('exam_ids', [])));
        if (empty($examIds)) $examIds = [$id];
        $validExamIds = OmrExam::where('tenant_id', $tenantId)->whereIn('id', $examIds)->pluck('id')->toArray();
        if (empty($validExamIds)) return $this->error('Geçerli sınav bulunamadı.', [], 422);

        $query = OmrResult::whereIn('exam_id', $validExamIds)->select(['exam_id', 'student_id', 'course_scores']);
        if ($classroomId) {
            $query->whereHas('student', fn($q) => $q->where('classroom_id', $classroomId));
        }
        if ($studentId) {
            $query->where('student_id', $studentId);
        }

        $results = $query->get();
        if ($results->count() < 3) {
            return $this->success(['matrix' => [], 'course_names' => [], 'message' => 'Yeterli veri yok (min 3 öğrenci).']);
        }

        // Collect per-course net arrays
        $courseNets = [];
        foreach ($results as $r) {
            foreach ((array)($r->course_scores ?? []) as $cid => $score) {
                $courseNets[(int)$cid][] = (float)($score['net'] ?? 0);
            }
        }

        // Keep only courses with enough samples
        $courseNets = array_filter($courseNets, fn($arr) => count($arr) >= 3);
        if (count($courseNets) < 2) {
            return $this->success(['matrix' => [], 'course_names' => [], 'message' => 'Yeterli ders verisi yok.']);
        }

        $courseIds = array_keys($courseNets);
        $courseNames = OmrCourse::whereIn('id', $courseIds)->pluck('name', 'id');

        // Pearson correlation matrix
        $matrix = [];
        foreach ($courseIds as $ci) {
            $row = [];
            foreach ($courseIds as $cj) {
                $row[(int)$cj] = round($this->pearsonCorrelation($courseNets[$ci], $courseNets[$cj]), 3);
            }
            $matrix[(int)$ci] = $row;
        }

        $courseLabels = collect($courseIds)->map(fn($id) => [
            'id'   => (int)$id,
            'name' => (string)($courseNames[$id] ?? ('Ders ' . $id)),
        ])->values();

        return $this->success($this->utf8izeMixed([
            'matrix'       => $matrix,
            'course_labels'=> $courseLabels,
        ]));
    }

    // ANALYTICS – Multi-exam comparison
    public function analyticsCompare(Request $request, int $id): JsonResponse
    {
        if ($e = $this->ensureAccess()) return $e;
        OmrExam::where('tenant_id', $this->tenantId())->findOrFail($id);

        $examIds = array_filter(array_map('intval', (array)$request->get('exam_ids', [])));
        if (count($examIds) < 2) return $this->error('En az 2 sınav seçin.', [], 422);

        // Validate all exams belong to tenant
        $validIds = OmrExam::where('tenant_id', $this->tenantId())
            ->whereIn('id', $examIds)->pluck('id')->toArray();

        $exams = OmrExam::whereIn('id', $validIds)->orderBy('exam_date')->get();

        $studentId  = $request->filled('student_id')  ? (int)$request->get('student_id')  : null;
        $classroomId= $request->filled('classroom_id') ? (int)$request->get('classroom_id') : null;

        $series = [];
        foreach ($exams as $exam) {
            /** @var OmrExam $exam */
            $series[] = $this->buildExamCompareSeries($exam, $classroomId, $studentId);
        }

        // All course names across all exams
        $allCourseIds = collect($series)->flatMap(fn($s) => collect($s['course_avgs'])->pluck('course_id'))->unique()->values()->toArray();
        $courseNames  = OmrCourse::whereIn('id', $allCourseIds)->pluck('name', 'id');
        $courseLabels = collect($allCourseIds)->map(fn($id) => ['id' => (int)$id, 'name' => (string)($courseNames[$id] ?? ('Ders ' . $id))])->values();

        return $this->success($this->utf8izeMixed([
            'series'        => $series,
            'course_labels' => $courseLabels,
        ]));
    }

    // ─── Private stat helpers ───────────────────────────────────────────────

    private function calcDescriptiveStats(array $values): array
    {
        $n = count($values);
        if ($n === 0) return ['mean' => 0, 'median' => 0, 'mode' => 0, 'variance' => 0, 'stddev' => 0];

        sort($values);
        $mean = array_sum($values) / $n;

        // Median
        $mid = intdiv($n, 2);
        $median = ($n % 2 === 0) ? round(($values[$mid - 1] + $values[$mid]) / 2, 2) : round($values[$mid], 2);

        // Mode (most frequent rounded-to-1dp value)
        $freq = [];
        foreach ($values as $v) {
            $key = (string)round($v, 1);
            $freq[$key] = ($freq[$key] ?? 0) + 1;
        }
        arsort($freq);
        $mode = (float)array_key_first($freq);

        // Variance
        $variance = array_sum(array_map(fn($v) => ($v - $mean) ** 2, $values)) / $n;

        return [
            'mean'     => round($mean, 2),
            'median'   => $median,
            'mode'     => round($mode, 2),
            'variance' => round($variance, 2),
            'stddev'   => round(sqrt($variance), 2),
        ];
    }

    private function pearsonCorrelation(array $x, array $y): float
    {
        $n = min(count($x), count($y));
        if ($n < 2) return 0.0;
        $x = array_slice($x, 0, $n);
        $y = array_slice($y, 0, $n);

        $meanX = array_sum($x) / $n;
        $meanY = array_sum($y) / $n;

        $num = 0.0; $denX = 0.0; $denY = 0.0;
        for ($i = 0; $i < $n; $i++) {
            $dx = $x[$i] - $meanX;
            $dy = $y[$i] - $meanY;
            $num  += $dx * $dy;
            $denX += $dx * $dx;
            $denY += $dy * $dy;
        }
        $den = sqrt($denX * $denY);
        return $den > 0 ? $num / $den : 0.0;
    }

    private function linearRegression(array $x, array $y): array
    {
        $n = min(count($x), count($y));
        if ($n < 2) return ['slope' => 0, 'intercept' => 0, 'r_squared' => 0];

        $meanX = array_sum($x) / $n;
        $meanY = array_sum($y) / $n;

        $num = 0.0; $den = 0.0;
        for ($i = 0; $i < $n; $i++) {
            $num += ($x[$i] - $meanX) * ($y[$i] - $meanY);
            $den += ($x[$i] - $meanX) ** 2;
        }
        $slope     = $den > 0 ? $num / $den : 0.0;
        $intercept = $meanY - $slope * $meanX;

        // R²
        $ssTot = array_sum(array_map(fn($yi) => ($yi - $meanY) ** 2, $y));
        $ssRes = 0.0;
        for ($i = 0; $i < $n; $i++) $ssRes += ($y[$i] - ($slope * $x[$i] + $intercept)) ** 2;
        $rSquared = $ssTot > 0 ? 1 - $ssRes / $ssTot : 0.0;

        return ['slope' => round($slope, 4), 'intercept' => round($intercept, 4), 'r_squared' => round($rSquared, 4)];
    }

    private function buildExamCompareSeries(OmrExam $exam, ?int $classroomId, ?int $studentId): array
    {
        $q = OmrResult::where('exam_id', $exam->id);
        if ($classroomId) $q->whereHas('student', fn($sq) => $sq->where('classroom_id', $classroomId));
        if ($studentId)   $q->where('student_id', $studentId);
 
        $agg = (clone $q)->selectRaw('AVG(total_net) as avg_net, MIN(total_net) as min_net, MAX(total_net) as max_net, COUNT(*) as total')->first();
 
        $courseAgg = [];
        foreach ((clone $q)->select(['course_scores'])->get() as $r) {
            foreach ((array)($r->course_scores ?? []) as $cid => $score) {
                $cid = (int)$cid;
                if (!isset($courseAgg[$cid])) $courseAgg[$cid] = ['sum' => 0.0, 'count' => 0];
                $courseAgg[$cid]['sum'] += (float)($score['net'] ?? 0);
                $courseAgg[$cid]['count']++;
            }
        }
        $courseAvgs = collect($courseAgg)->map(fn($row, $cid) => [
            'course_id' => (int)$cid,
            'avg_net'   => round($row['sum'] / max(1, $row['count']), 2),
        ])->values();
 
        $nets = (clone $q)->orderBy('total_net')->pluck('total_net')->map(fn($v) => (float)$v)->values()->toArray();
        $regression = $this->linearRegression(array_keys($nets), $nets);
 
        /** @var \Carbon\Carbon|null $examDate */
        $examDate = $exam->exam_date;
 
        return [
            'exam_id'     => (int)$exam->id,
            'exam_name'   => (string)$exam->name,
            'exam_date'   => $examDate ? $examDate->format('Y-m-d') : null,
            'exam_type'   => (string)$exam->exam_type,
            'avg_net'     => round((float)($agg->avg_net ?? 0), 2),
            'min_net'     => round((float)($agg->min_net ?? 0), 2),
            'max_net'     => round((float)($agg->max_net ?? 0), 2),
            'total'       => (int)($agg->total ?? 0),
            'course_avgs' => $courseAvgs,
            'regression'  => $regression,
        ];
    }
 
    private function buildStudentExamSummaries(\Illuminate\Support\Collection $studentResults, array $validIds): \Illuminate\Support\Collection
    {
        $examNames = OmrExam::whereIn('id', $validIds)->pluck('name', 'id');
        return $studentResults->map(function ($r) use ($examNames) {
            return [
                'exam_id'     => $r->exam_id,
                'exam_name'   => (string)($examNames[$r->exam_id] ?? ('Sınav ' . $r->exam_id)),
                'total_net'   => round((float)$r->total_net, 2),
                'total_point' => round((float)$r->total_point, 2),
                'rank'        => (int)$r->rank,
                'booklet_type'=> $r->booklet_type,
            ];
        })->sortBy('exam_id')->values();
    }
 
    private function buildResultHeaders(OmrExam $exam, array $items): array
    {
        $headers = $exam->examCourses
            ->sortBy(fn($row) => (int) ($row->sort_order ?? 0))
            ->map(fn($row) => [
                'course_id' => (int) $row->course_id,
                'course_name' => (string) ($row->course?->name ?? ('Ders ' . (int) $row->course_id)),
            ])
            ->values()
            ->toArray();
 
        if (empty($headers)) {
            $courseIds = collect($items)
                ->flatMap(function($r) {
                    $scores = is_array($r) ? ($r['course_scores'] ?? []) : ($r->course_scores ?? []);
                    if (is_string($scores)) $scores = json_decode($scores, true);
                    return array_keys((array) $scores);
                })
                ->map(fn($id) => (int) $id)
                ->unique()
                ->values();
            $courseNames = OmrCourse::whereIn('id', $courseIds)->pluck('name', 'id');
            $headers = $courseIds->map(fn($id) => [
                'course_id' => $id,
                'course_name' => (string) ($courseNames[$id] ?? ('Ders ' . $id)),
            ])->toArray();
        }

        // Order headers according to real exam conventions for LGS/YKS when possible
        $examType = (string) ($exam->exam_type ?? '');
        usort($headers, function ($a, $b) use ($examType) {
            $ra = $this->courseOrderRank($examType, (string) ($a['course_name'] ?? ''));
            $rb = $this->courseOrderRank($examType, (string) ($b['course_name'] ?? ''));
            if ($ra !== $rb) return $ra <=> $rb;
            $an = mb_strtolower((string) ($a['course_name'] ?? ''), 'UTF-8');
            $bn = mb_strtolower((string) ($b['course_name'] ?? ''), 'UTF-8');
            return strcoll($an, $bn);
        });

        return $headers;
    }

    private function courseOrderRank(string $examType, string $courseName): int
    {
        $n = mb_strtolower(trim($this->toUtf8($courseName)), 'UTF-8');
        $n = preg_replace('/\s+/u', ' ', $n) ?? $n;

        // LGS official-like order
        if (stripos($examType, 'LGS') !== false) {
            $map = [
                'türkçe' => 10,
                'turkce' => 10,
                'inkılap' => 20,
                'inkilap' => 20,
                't.c. inkılap' => 20,
                'din' => 30,
                'din kültürü' => 30,
                'yabancı dil' => 40,
                'yabanci dil' => 40,
                'ingilizce' => 40,
                'matematik' => 50,
                'fen' => 60,
                'fen bilimleri' => 60,
            ];
            foreach ($map as $k => $rank) {
                if (str_contains($n, $k)) return $rank;
            }
        }

        // YKS common order (TYT/AYT)
        if (stripos($examType, 'YKS') !== false) {
            $map = [
                'türkçe' => 10,
                'turkce' => 10,
                'matematik' => 20,
                'geometri' => 25,
                'fizik' => 40,
                'kimya' => 41,
                'biyoloji' => 42,
                'tarih' => 60,
                'coğrafya' => 61,
                'cografya' => 61,
                'felsefe' => 62,
                'edebiyat' => 70,
                'sosyal' => 80,
                'fen' => 81,
            ];
            foreach ($map as $k => $rank) {
                if (str_contains($n, $k)) return $rank;
            }
        }

        return 999;
    }
 
    private function extractTopicDifficulty(\Illuminate\Support\Collection $questionDifficulty): \Illuminate\Support\Collection
    {
        return $questionDifficulty->groupBy('topic_id')
            ->map(function ($rows) {
                $rows = collect($rows);
                $total = (int) $rows->sum('total');
                $wrong = (int) $rows->sum('wrong');
                $blank = (int) $rows->sum('blank');
                
                // Track unique students who made mistakes in this topic
                $wrongStudents = new \Illuminate\Support\Collection();
                foreach($rows as $r) {
                    if (isset($r['wrong_student_ids'])) {
                        foreach($r['wrong_student_ids'] as $sid) $wrongStudents->push($sid);
                    }
                }
                $wrongCount = $wrongStudents->unique()->count();

                return [
                    'topic_id'    => (int) ($rows->first()['topic_id'] ?? 0),
                    'topic_name'  => (string) ($rows->first()['topic_name'] ?? 'Belirtilmemiş'),
                    'total'       => $total,
                    'wrong'       => $wrong,
                    'blank'       => $blank,
                    'wrong_count' => $wrongCount,
                    'wrong_ratio' => $total > 0 ? round(($wrong / $total) * 100, 2) : 0,
                ];
            })
            ->sortByDesc('wrong_ratio')
            ->values();
    }
 
    private function buildQuestionDifficulty(\Illuminate\Support\Collection $results, \Illuminate\Support\Collection $answerKeys): \Illuminate\Support\Collection
    {
        $questionStats = [];
        /** @var OmrAnswerKey $ak */
        foreach ($answerKeys as $ak) {
            $courseId = (int) $ak->course_id;
            $canonicalQno = (int) $ak->question_no;
            $qKey = $courseId . '-' . $canonicalQno;
            if (!isset($questionStats[$qKey])) {
                $questionStats[$qKey] = [
                    'course_id'   => $courseId,
                    'course_name' => (string) ($ak->course?->name ?? ''),
                    'question_no' => $canonicalQno,
                    'topic_id'    => (int) ($ak->topic_id ?? 0),
                    'topic_name'  => (string) ($ak->topic?->name ?? 'Belirtilmemiş'),
                    'correct'     => 0,
                    'wrong'       => 0,
                    'blank'       => 0,
                    'total'       => 0,
                    'wrong_student_ids' => [],
                ];
            }
        }
 
        /** @var OmrResult $result */
        foreach ($results as $result) {
            $booklet = strtoupper((string) $result->booklet_type);
            /** @var OmrAnswerKey $ak */
            foreach ($answerKeys as $ak) {
                $status = $this->determineQuestionStatus($booklet, $ak, $result);
                if ($status) {
                    $courseId = (int) $ak->course_id;
                    $canonicalQno = (int) $ak->question_no;
                    $qKey = $courseId . '-' . $canonicalQno;
                    $questionStats[$qKey][$status]++;
                    $questionStats[$qKey]['total']++;
                    if ($status === 'wrong') {
                        $questionStats[$qKey]['wrong_student_ids'][] = (int) $result->student_id;
                    }
                }
            }
        }
 
        return collect($questionStats)->map(function ($row) {
            $total = max(1, (int) $row['total']);
            $row['wrong_ratio']   = round(($row['wrong'] / $total) * 100, 2);
            $row['blank_ratio']   = round(($row['blank'] / $total) * 100, 2);
            $row['success_ratio'] = round(($row['correct'] / $total) * 100, 2);
            return $row;
        })->sortByDesc('wrong_ratio')->values();
    }
 
    private function determineQuestionStatus(string $booklet, OmrAnswerKey $ak, OmrResult $result): ?string
    {
        $booklet = strtoupper(trim($booklet)) ?: 'A';
        $canonicalQno = (int) $ak->question_no;
        $mappedQno = match ($booklet) {
            'B' => $ak->booklet_b_qno ?: $ak->booklet_a_qno ?: $canonicalQno,
            'C' => $ak->booklet_c_qno ?: $ak->booklet_a_qno ?: $canonicalQno,
            'D' => $ak->booklet_d_qno ?: $ak->booklet_a_qno ?: $canonicalQno,
            default => $ak->booklet_a_qno ?: $canonicalQno,
        };
        if (!$mappedQno || $mappedQno <= 0) {
            return null;
        }
        $courseId = (int) $ak->course_id;
        $rawAnswers = (array) ($result->raw_answers ?? []);
        $rawStr = (string) ($rawAnswers[(string) $courseId] ?? $rawAnswers[$courseId] ?? '');
        $given = strtoupper(trim((string) ($rawStr[$mappedQno - 1] ?? '')));

        /** @var string $expect */
        $expect = strtoupper(trim((string) $ak->correct_answer));

        return self::compareOmrAnswer($given, $expect);
    }
 
    private function buildStudentAnalyticsMetadata(\Illuminate\Support\Collection $studentResults, array $validIds, ?int $classroomId, bool $isMerged = false): array
    {
        $avgNet   = round($isMerged ? $studentResults->sum('total_net') : ($studentResults->sum('total_net') / max(1, count($studentResults))), 2);
        $avgPoint = round($isMerged ? $studentResults->sum('total_point') : $studentResults->avg('total_point'), 2);
 
        $allNetsResult = OmrResult::whereIn('exam_id', $validIds)
            ->orderBy('total_net')->pluck('total_net')->map(fn($v) => (float)$v)->values()->toArray();
        $examStats = $this->calcDescriptiveStats($allNetsResult);
        $examTotal = count($allNetsResult);
        $examAvg   = round((float)($examStats['mean'] ?? 0), 2);
 
        $classAvg = 0.0;
        if ($classroomId) {
            $classResultsQuery = OmrResult::whereIn('exam_id', $validIds)
                ->whereHas('student', fn($q) => $q->where('classroom_id', $classroomId));
            
            if ($isMerged) {
                $classStudentNets = $classResultsQuery->get()->groupBy('student_id')->map(fn($r) => $r->sum('total_net'))->values();
                $classAvg = round($classStudentNets->avg() ?? 0, 2);
            } else {
                $classAvg = round((float)($classResultsQuery->avg('total_net') ?? 0), 2);
            }
        }
 
        $allNetsResultSorted = $allNetsResult;
        sort($allNetsResultSorted);
        $belowCount = count(array_filter($allNetsResultSorted, fn($n) => $n < $avgNet));
        $percentile = $examTotal > 0 ? round(($belowCount / $examTotal) * 100, 1) : 0;
 
        return [
            'avg_net'    => $avgNet,
            'avg_point'  => $avgPoint,
            'exam_stats' => $examStats,
            'exam_total' => $examTotal,
            'exam_avg'   => $examAvg,
            'class_avg'  => $classAvg,
            'percentile' => $percentile,
        ];
    }
 
    private function calculateExamCourseAverages(\Illuminate\Support\Collection $results): \Illuminate\Support\Collection
    {
        $courseAgg = [];
        foreach ($results as $result) {
            foreach ((array) ($result->course_scores ?? []) as $courseId => $score) {
                $cid = (int) $courseId;
                if (!isset($courseAgg[$cid])) {
                    $courseAgg[$cid] = [
                        'course_id' => $cid,
                        'total_net' => 0.0,
                        'total_point' => 0.0,
                        'correct' => 0,
                        'wrong' => 0,
                        'blank' => 0,
                        'student_count' => 0,
                    ];
                }
                $courseAgg[$cid]['total_net'] += (float) ($score['net'] ?? 0);
                $courseAgg[$cid]['total_point'] += (float) ($score['point'] ?? 0);
                $courseAgg[$cid]['correct'] += (int) ($score['correct'] ?? 0);
                $courseAgg[$cid]['wrong'] += (int) ($score['wrong'] ?? 0);
                $courseAgg[$cid]['blank'] += (int) ($score['blank'] ?? 0);
                $courseAgg[$cid]['student_count']++;
            }
        }
 
        $courseNames = OmrCourse::whereIn('id', array_keys($courseAgg))->pluck('name', 'id');
        return collect($courseAgg)->map(function ($row) use ($courseNames) {
            $count = max(1, (int) $row['student_count']);
            return [
                'course_id'   => (int) $row['course_id'],
                'course_name' => (string) ($courseNames[$row['course_id']] ?? ('Ders ' . $row['course_id'])),
                'avg_net'     => round($row['total_net'] / $count, 2),
                'avg_point'   => round($row['total_point'] / $count, 2),
                'correct'     => (int) $row['correct'],
                'wrong'       => (int) $row['wrong'],
                'blank'       => (int) $row['blank'],
            ];
        })->sortByDesc('avg_net')->values();
    }
 
    private function analyzeStudentQuestions(\Illuminate\Support\Collection $studentResults, \Illuminate\Support\Collection $answerKeys): array
    {
        $questions = [];
        foreach ($studentResults as $result) {
            $examId = (int) $result->exam_id;
            $answerMap = $this->buildBookletAnswerMap($examId);
            $booklet = strtoupper(trim((string) $result->booklet_type)) ?: 'A';
            if (!in_array($booklet, self::BOOKLETS, true)) {
                $booklet = 'A';
            }

            $rawKeys = $answerKeys->get($examId, collect());
            $canonicalKeyMeta = [];
            foreach ($rawKeys as $ak) {
                $canonicalKeyMeta[(int) $ak->course_id][(int) $ak->question_no] = $ak;
            }

            $rawAnswers = (array) ($result->raw_answers ?? []);

            foreach ($answerMap as $courseId => $bookletData) {
                $cId = (int) $courseId;
                $keyMap = $bookletData[$booklet] ?? $bookletData['A'] ?? [];
                if (empty($keyMap)) continue;

                $rawVal = $rawAnswers[(string) $cId] ?? $rawAnswers[$cId] ?? '';
                $rawStr = is_array($rawVal) ? implode('', $rawVal) : (string) $rawVal;

                ksort($keyMap);

                foreach ($keyMap as $studentQno => $qInfo) {
                    $canonicalQno = (int) ($qInfo['canonical_qno'] ?? $studentQno);
                    $expect = strtoupper(trim((string) ($qInfo['answer'] ?? '')));
                    $given = ($studentQno >= 1 && isset($rawStr[$studentQno - 1]))
                        ? strtoupper(trim((string) $rawStr[$studentQno - 1]))
                        : '';

                    $status = self::compareOmrAnswer($given, $expect);

                    $akMeta = $canonicalKeyMeta[$cId][$canonicalQno] ?? null;
                    $topicName = (string) ($akMeta?->topic?->name ?? 'Belirtilmemiş');
                    $courseName = (string) ($akMeta?->course?->name ?? ('Ders ' . $cId));

                    $questions[] = [
                        'exam_id'        => $examId,
                        'exam_name'      => (string) ($result->exam?->name ?? ''),
                        'course_id'      => $cId,
                        'course_name'    => $courseName,
                        'question_no'    => $canonicalQno,
                        'student_qno'    => (int) $studentQno,
                        'topic_id'       => (int) ($qInfo['topic_id'] ?? $akMeta?->topic_id ?? 0),
                        'topic_name'     => $topicName,
                        'topic_type'     => (string) ($akMeta?->topic?->type ?? 'topic'),
                        'given_answer'   => ($given === '' || in_array($given, ['-', '0', ' ', '.', '_'], true)) ? '-' : $given,
                        'correct_answer' => $expect,
                        'status'         => $status,
                    ];
                }
            }
        }
        return $questions;
    }

    private function analyzeStudentWrongQuestions(\Illuminate\Support\Collection $studentResults, \Illuminate\Support\Collection $answerKeys): array
    {
        return array_values(array_filter($this->analyzeStudentQuestions($studentResults, $answerKeys), fn($q) => $q['status'] !== 'correct'));
    }

    private function aggregateStudentTopicAnalysis(\Illuminate\Support\Collection $studentResults, \Illuminate\Support\Collection $answerKeys, ?float $penalty = null): array
    {
        $allQuestions = $this->analyzeStudentQuestions($studentResults, $answerKeys);
        $topicMap = [];

        foreach ($allQuestions as $q) {
            $courseId = $q['course_id'];
            $topicId = $q['topic_id'];
            $topicName = $q['topic_name'];
            $courseName = $q['course_name'];

            $key = $courseId . '_' . $topicId . '_' . $topicName;
            if (!isset($topicMap[$key])) {
                $topicMap[$key] = [
                    'topic_id'    => $topicId,
                    'topic_name'  => $topicName,
                    'course_id'   => $courseId,
                    'course_name' => $courseName,
                    'correct'     => 0,
                    'wrong'       => 0,
                    'blank'       => 0,
                    'total'       => 0,
                ];
            }

            $topicMap[$key][$q['status']]++;
            $topicMap[$key]['total']++;
        }

        foreach ($topicMap as &$item) {
            $item['success_rate'] = $item['total'] > 0 
                ? round(($item['correct'] / $item['total']) * 100, 1) 
                : 0.0;
            if ($penalty !== null && $penalty > 0) {
                $item['net'] = round($item['correct'] - ($item['wrong'] / $penalty), 2);
            } else {
                $item['net'] = (float) $item['correct'];
            }
        }

        usort($topicMap, function($a, $b) {
            $cmp = strcmp($a['course_name'], $b['course_name']);
            if ($cmp !== 0) return $cmp;
            if ($b['wrong'] !== $a['wrong']) return $b['wrong'] <=> $a['wrong'];
            return $a['success_rate'] <=> $b['success_rate'];
        });

        return array_values($topicMap);
    }
 
    /**
     * Aggregate course scores for a student across one or multiple results.
     */
    private function aggregateStudentCourseScores($studentResults, bool $isMerged = false): array
    {
        $aggregated = [];
        foreach ($studentResults as $rs) {
            $scores = $rs->course_scores;
            if (is_string($scores)) $scores = json_decode($scores, true);
            if (is_object($scores)) $scores = json_decode(json_encode($scores), true);
            if (!is_array($scores)) continue;

            foreach ($scores as $key => $data) {
                // Determine ID: check data first, then fallback to key
                $cid = (int) ($data['course_id'] ?? $key);
                if ($cid <= 0) continue;

                if (!isset($aggregated[$cid])) {
                    $aggregated[$cid] = [
                        'course_id' => $cid,
                        'correct' => 0,
                        'wrong' => 0,
                        'blank' => 0,
                        'net' => 0.0,
                    ];
                }
                $aggregated[$cid]['correct'] += (int) ($data['correct'] ?? 0);
                $aggregated[$cid]['wrong'] += (int) ($data['wrong'] ?? 0);
                $aggregated[$cid]['blank'] += (int) ($data['blank'] ?? 0);
                $aggregated[$cid]['net'] += (float) ($data['net'] ?? 0);
            }
        }

        if (!empty($aggregated)) {
            $courseNames = OmrCourse::whereIn('id', array_keys($aggregated))->pluck('name', 'id');
            foreach ($aggregated as $cid => &$item) {
                $item['course_name'] = (string) ($courseNames[$cid] ?? ('Ders ' . $cid));
            }
        }
        
        return array_values($aggregated);
    }

    /**
     * Apply T-Score weighted point calculation (100-500 scale) to match teacher dashboard.
     * Replicates the frontend calculateZScore/calculateTScore/calculateASP/scaleTo500 logic.
     *
     * @param  mixed  $students  Collection or array of student rows (must have 'id' or 'student_id')
     * @param  array  $examIds   The exam IDs to compute stats over
     * @return array  Students with updated total_point and rank
     */
    private function applyTScores($students, array $examIds): array
    {
        $students = collect($students);
        if ($students->isEmpty() || empty($examIds)) return [];

        // Fetch ALL results for these exams to build global mean/stdDev per course
        $allResults = OmrResult::whereIn('exam_id', $examIds)
            ->select(['student_id', 'course_scores'])
            ->get();
        if ($allResults->isEmpty()) return $students->toArray();

        // Collect per-course net arrays (one value per student-exam result)
        $courseNetsGlobal = [];
        foreach ($allResults as $r) {
            $scores = (array) ($r->course_scores ?? []);
            foreach ($scores as $cid => $s) {
                $cid = (int) $cid;
                $courseNetsGlobal[$cid][] = (float) ($s['net'] ?? 0);
            }
        }

        if (empty($courseNetsGlobal)) return $students->toArray();

        $courseNames = OmrCourse::whereIn('id', array_keys($courseNetsGlobal))->pluck('name', 'id');

        // Build config per course: weight, mean, stdDev, maxQuestions
        $configs = [];
        foreach ($courseNetsGlobal as $cid => $nets) {
            $count = count($nets);
            $mean  = $count > 0 ? array_sum($nets) / $count : 0;
            $variance = 0;
            foreach ($nets as $n) {
                $variance += pow($n - $mean, 2);
            }
            $stdDev = $count > 0 ? sqrt($variance / $count) : 0;

            // Determine weight from course name (Türkçe/Matematik/Fen → 4, others → 1)
            $cname = mb_strtolower((string) ($courseNames[$cid] ?? ''), 'UTF-8');
            $weight = 1;
            if (str_contains($cname, 'türkçe') || str_contains($cname, 'matematik') || str_contains($cname, 'fen')) {
                $weight = 4;
            }

            $configs[$cid] = [
                'weight'       => $weight,
                'mean'         => $mean,
                'stdDev'       => $stdDev > 0.1 ? $stdDev : 3.0,
                'maxQuestions' => $count > 0 ? max($nets) : 20,
            ];
        }

        // Compute minTASP (all nets = 0) and maxTASP (all nets = max)
        $minTASP = 0.0;
        $maxTASP = 0.0;
        foreach ($configs as $cfg) {
            $zMin     = (0 - $cfg['mean']) / $cfg['stdDev'];
            $tMin     = 50 + (10 * $zMin);
            $minTASP += $tMin * $cfg['weight'];

            $zMax     = ($cfg['maxQuestions'] - $cfg['mean']) / $cfg['stdDev'];
            $tMax     = 50 + (10 * $zMax);
            $maxTASP += $tMax * $cfg['weight'];
        }

        $range = $maxTASP - $minTASP;

        // Calculate T-Score for each student
        $patched = $students->map(function ($s) use ($examIds, $configs, $minTASP, $range) {
            $sid = is_array($s)
                ? (int) ($s['id'] ?? $s['student_id'] ?? 0)
                : (int) ($s->id ?? $s->student_id ?? 0);
            if (!$sid) return $s;

            // Aggregate this student's nets per course across all exams
            $sResults    = OmrResult::whereIn('exam_id', $examIds)->where('student_id', $sid)->get();
            $studentNets = [];
            foreach ($sResults as $sr) {
                foreach ((array) ($sr->course_scores ?? []) as $cid => $sc) {
                    $cid = (int) $cid;
                    $studentNets[$cid] = ($studentNets[$cid] ?? 0) + (float) ($sc['net'] ?? 0);
                }
            }

            // Sum TASP across all courses
            $studentTASP = 0.0;
            foreach ($configs as $cid => $cfg) {
                $net = $studentNets[$cid] ?? 0;
                $z   = ($net - $cfg['mean']) / $cfg['stdDev'];
                $t   = 50 + (10 * $z);
                $studentTASP += $t * $cfg['weight'];
            }

            // Scale to 100-500
            $tScore = $range > 0
                ? 100 + (($studentTASP - $minTASP) / $range) * 400
                : 300;
            $tScore = max(100, min(500, round($tScore, 2)));

            if (is_array($s)) {
                $s['total_point'] = $tScore;
            } else {
                $s->total_point = $tScore;
            }
            return $s;
        });

        // Re-rank by descending total_point
        $sorted = $patched->sortByDesc(function ($s) {
            return (float) (is_array($s) ? ($s['total_point'] ?? 0) : ($s->total_point ?? 0));
        })->values();

        return $sorted->map(function ($s, $idx) {
            if (is_array($s)) {
                $s['rank'] = $idx + 1;
            } else {
                $s->rank = $idx + 1;
            }
            return $s;
        })->toArray();
    }

    /**
     * Calculate averages per course for a group of results.
     */
    private function aggregateCourseAverages($results, bool $isMerged = false): array
    {
        if ($results->isEmpty()) return [];

        $courseNets = []; // course_id => [student_id => net, ...]
        
        foreach ($results as $rs) {
            $studentId = (int)$rs->student_id;
            $scores = $rs->course_scores;
            if (is_string($scores)) $scores = json_decode($scores, true);
            if (is_object($scores)) $scores = json_decode(json_encode($scores), true);
            if (!is_array($scores)) continue;

            foreach ($scores as $courseId => $data) {
                $cid = (int)$courseId;
                if ($cid <= 0) continue;

                if (!isset($courseNets[$cid])) $courseNets[$cid] = [
                    'course_name' => $data['course_name'] ?? ('Ders ' . $cid),
                    'student_nets' => []
                ];
                
                if (!isset($courseNets[$cid]['student_nets'][$studentId])) {
                    $courseNets[$cid]['student_nets'][$studentId] = 0;
                }
                $courseNets[$cid]['student_nets'][$studentId] += (float) ($data['net'] ?? 0);
            }
        }

        $courseIds = array_keys($courseNets);
        $courseNames = OmrCourse::whereIn('id', $courseIds)->pluck('name', 'id');

        $averages = [];
        foreach ($courseNets as $cid => $info) {
            $nets = array_values($info['student_nets']);
            $count = count($nets);
            $realName = $courseNames[$cid] ?? $info['course_name'];
            $averages[] = [
                'course_id' => $cid,
                'course_name' => $realName,
                'average_net' => $count > 0 ? round(array_sum($nets) / $count, 2) : 0,
                'count' => $count
            ];
        }

        // Sort averages descending by average_net
        usort($averages, fn($a, $b) => $b['average_net'] <=> $a['average_net']);

        return $averages;
    }
 
    private function mapClassStudentResults(\Illuminate\Support\Collection $classResults, float $classAvg): \Illuminate\Support\Collection
    {
        $netsByStudent = $classResults->groupBy('student_id')->map(fn($rows) => round($rows->avg('total_net'), 2));
 
        return $netsByStudent->map(function ($avgNet, $studentId) use ($classResults, $classAvg) {
            $firstResult = $classResults->firstWhere('student_id', $studentId);
            return [
                'id'          => $studentId,
                'name'        => $firstResult?->student?->name ?? '',
                'school_no'   => $firstResult?->student?->school_no ?? '',
                'total_net'   => $avgNet,
                'total_point' => round($classResults->where('student_id', $studentId)->avg('total_point'), 2),
                'rank'        => 0,
                'below_avg'   => $avgNet < $classAvg,
                'result_id'   => $firstResult?->id,
            ];
        })->sortByDesc('total_net')->values()->map(function ($s, $idx) {
            $s['rank'] = $idx + 1;
            return $s;
        });
    }
 
    private function buildTopicDifficulty($results, $answerKeys): \Illuminate\Support\Collection
    {
        $topicStats = [];
        foreach ($results as $result) {
            $booklet = strtoupper((string)$result->booklet_type);
            foreach ($answerKeys as $ak) {
                $status = $this->determineQuestionStatus($booklet, $ak, $result);
                if (!$status) continue;
                $tid    = (int)($ak->topic_id ?? 0);
                if (!isset($topicStats[$tid])) {
                    $topicStats[$tid] = [
                        'topic_id'   => $tid,
                        'topic_name' => (string)($ak->topic?->name ?? 'Belirtilmemiş'),
                        'course_id'  => (int)$ak->course_id,
                        'course_name'=> (string)($ak->course?->name ?? ''),
                        'correct' => 0, 'wrong' => 0, 'blank' => 0, 'total' => 0,
                        'wrong_student_ids' => [],
                    ];
                }
                $topicStats[$tid][$status]++;
                $topicStats[$tid]['total']++;
                if ($status === 'wrong') {
                    $topicStats[$tid]['wrong_student_ids'][] = (int) $result->student_id;
                }
            }
        }
        return collect($topicStats)->map(function ($row) {
            $total = max(1, $row['total']);
            $row['wrong_ratio']   = round(($row['wrong'] / $total) * 100, 2);
            $row['success_ratio'] = round(($row['correct'] / $total) * 100, 2);
            $row['wrong_count']   = count(array_unique($row['wrong_student_ids']));
            unset($row['wrong_student_ids']);
            return $row;
        })->sortByDesc('wrong_ratio')->values();
    }

    // SESSION MERGING
    public function sessionsIndex(): JsonResponse
    {
        if ($e = $this->ensureAccess()) return $e;
        $sessions = OmrSession::where('tenant_id', $this->tenantId())->orderByDesc('id')->get();

        // Enrich sessions with exam names and details
        $enriched = $sessions->map(function ($session) {
            $examIds = $session->exam_ids ?? [];
            if (empty($examIds)) return $session;

            $exams = OmrExam::whereIn('id', $examIds)->get(['id', 'name', 'exam_type', 'exam_date', 'level']);
            $examNames = $exams->pluck('name')->implode(', ');
            $displayName = $session->name && trim($session->name) !== '' ? $session->name : $examNames;

            $session->display_name = $displayName;
            $session->exam_names = $exams->pluck('name')->toArray();
            $session->exams = $exams;
            return $session;
        });

        return $this->success(['sessions' => $enriched]);
    }

    public function sessionsStore(Request $request): JsonResponse
    {
        if ($e = $this->ensureAccess()) return $e;
        $data = $request->validate([
            'name' => 'required|string|max:255',
            'exam_type' => 'required|string|max:30',
            'exam_date' => 'nullable|date',
            'exam_ids' => 'required|array|min:2',
            'exam_ids.*' => 'integer|exists:omr_exams,id',
        ]);
        $data['tenant_id'] = $this->tenantId();
        $data['created_by'] = auth()->id();
        $session = OmrSession::create($data);
        $this->calculateSession($session);
        return $this->success(['session' => $session->fresh()], 'Oturum oluşturuldu ve hesaplandı.', 201);
    }

    public function sessionsShow(int $id): JsonResponse
    {
        if ($e = $this->ensureAccess()) return $e;
        $session = OmrSession::where('tenant_id', $this->tenantId())->findOrFail($id);
        $examIds = array_values(array_filter(array_map('intval', (array) ($session->exam_ids ?? []))));
        $exams = OmrExam::where('tenant_id', $this->tenantId())
            ->whereIn('id', $examIds)
            ->get(['id', 'name', 'exam_type', 'exam_date', 'level', 'status']);

        $sessionData = $session->toArray();
        $sessionData['exams'] = $exams;
        return $this->success(['session' => $sessionData]);
    }

    public function sessionsRecalculate(int $id): JsonResponse
    {
        if ($e = $this->ensureAccess()) return $e;
        $session = OmrSession::where('tenant_id', $this->tenantId())->findOrFail($id);
        $this->calculateSession($session);
        return $this->success(['session' => $session->fresh()], 'Oturum yeniden hesaplandı.');
    }

    public function sessionsDestroy(int $id): JsonResponse
    {
        if ($e = $this->ensureAccess()) return $e;
        OmrSession::where('tenant_id', $this->tenantId())->findOrFail($id)->delete();
        return $this->success([], 'Oturum silindi.');
    }

    // ─── REPORT CARD ──────────────────────────────────────────────────────────

    /**
     * Build a single student's card data from one or more OmrExam records.
     * $exams: Collection of OmrExam (with loaded examCourses.course & answerKeys.topic)
     * $result: OmrResult (single exam) OR null for multi-exam session card
     * $results: array keyed by exam_id -> OmrResult (for multi-exam)
     * $schoolRank / $schoolTotal / $classRank / $classTotal: pre-computed rank info
     */
    private function buildCardData(
        \Illuminate\Support\Collection $exams,
        array                          $resultsByExamId,
        Student                        $student,
        ?int                           $schoolRank,
        ?int                           $schoolTotal,
        ?int                           $classRank,
        ?int                           $classTotal,
        string                         $sessionName,
        string                         $season = '',
        ?array                         $preloadedAnswerKeys = null,
        ?array                         $preloadedExamTotals = null,
        ?float                         $schoolAvg = null,
        ?float                         $classAvg = null
    ): array {
        $totalNet     = 0.0;
        $totalPoint   = 0.0;
        $totalCorrect = 0;
        $totalWrong   = 0;
        $totalBlank   = 0;

        $courseRows  = [];
        $topicAgg    = [];
        $sessionRows = [];
        $examsMeta   = [];
        $examDate    = null;
        $examType    = null;
        $booklet     = 'A';

        foreach ($exams as $exam) {
            if (!$examDate && $exam->exam_date) {
                $examDate = $exam->exam_date->format('d.m.Y');
            }
            if (!$examType && $exam->exam_type) {
                $examType = $exam->exam_type;
            }

            $result = $resultsByExamId[$exam->id] ?? null;

            $examsMeta[] = [
                'name'      => $exam->name,
                'session'   => $exam->session,
                'exam_date' => $exam->exam_date?->format('d.m.Y'),
            ];

            $resNet          = is_array($result) ? ($result['total_net'] ?? null) : $result?->total_net;
            $resPoint        = is_array($result) ? ($result['total_point'] ?? null) : $result?->total_point;
            $resRank         = is_array($result) ? ($result['rank'] ?? null) : $result?->rank;
            $resBooklet      = is_array($result) ? ($result['booklet_type'] ?? null) : $result?->booklet_type;
            $resCourseScores = is_array($result) ? ($result['course_scores'] ?? []) : ($result?->course_scores ?? []);
            $resRawAnswers   = is_array($result) ? ($result['raw_answers'] ?? []) : ($result?->raw_answers ?? []);

            if ($resBooklet) {
                $booklet = strtoupper(trim((string) $resBooklet));
            }

            // Per-session summary row (for multi-exam display)
            $sessRow = [
                'name'        => $exam->session ?? $exam->name,
                'total_net'   => $resNet,
                'total_point' => $resPoint,
                'rank'        => $resRank,
                'exam_total'  => $result ? ($preloadedExamTotals[$exam->id] ?? OmrResult::where('exam_id', $exam->id)->count()) : null,
                'booklet_type'=> $resBooklet,
            ];
            $sessionRows[] = $sessRow;

            if ($result) {
                $totalNet   += (float) $resNet;
                $totalPoint += (float) $resPoint;
            }

            // Answer keys for this exam
            $answerKeys = $preloadedAnswerKeys[$exam->id] ?? OmrAnswerKey::where('exam_id', $exam->id)
                ->with(['topic:id,name', 'course:id,name'])
                ->orderBy('course_id')->orderBy('question_no')
                ->get();

            $keysByCourse = $answerKeys->groupBy(fn($ak) => (int) $ak->course_id);

            // Process each course
            $scores = (array) $resCourseScores;
            $rawAnswers = (array) $resRawAnswers;

            foreach ($exam->examCourses->sortBy('sort_order') as $ec) {
                $cid   = (int) $ec->course_id;
                $score = $scores[$cid] ?? $scores[(string) $cid] ?? null;

                $cCorrect = (int) ($score['correct'] ?? 0);
                $cWrong   = (int) ($score['wrong']   ?? 0);
                $cBlank   = (int) ($score['blank']   ?? 0);
                $cNet     = isset($score['net']) ? (float) $score['net'] : 0.0;

                $courseKeys = $keysByCourse->get($cid, collect());
                $uniqueQuestions = $courseKeys->groupBy(fn($ak) => (int) $ak->question_no);
                $questionCount = $cCorrect + $cWrong + $cBlank;
                if ($questionCount === 0) {
                    $questionCount = $uniqueQuestions->count();
                }

                $totalCorrect += $cCorrect;
                $totalWrong   += $cWrong;
                $totalBlank   += $cBlank;

                $successRate = $questionCount > 0 ? round(($cNet / $questionCount) * 100, 2) : 0.0;

                // Raw answer string for this course
                $rawStr = (string) ($rawAnswers[(string) $cid] ?? $rawAnswers[$cid] ?? '');

                // Booklet question lookup: targetQ (student's booklet position) -> [key, group]
                $bookletKeyMap = [];
                foreach ($uniqueQuestions as $qNo => $qGroup) {
                    $first = $qGroup->first();
                    if (!$first) continue;
                    $targetQ = match ($booklet) {
                        'B' => (int) ($first->booklet_b_qno ?: $first->booklet_a_qno ?: $qNo),
                        'C' => (int) ($first->booklet_c_qno ?: $first->booklet_a_qno ?: $qNo),
                        'D' => (int) ($first->booklet_d_qno ?: $first->booklet_a_qno ?: $qNo),
                        default => (int) ($first->booklet_a_qno ?: $qNo),
                    };
                    if ($targetQ > 0) {
                        $bookletKeyMap[$targetQ] = [
                            'key'   => $first,
                            'group' => $qGroup,
                        ];
                    }
                }

                $maxQ = !empty($bookletKeyMap) ? max(array_keys($bookletKeyMap)) : $questionCount;
                $maxQ = max($maxQ, $questionCount);

                // Prepare 4 blocks of 10 characters
                $keyBlocks = ['', '', '', ''];
                $studentBlocks = ['', '', '', ''];

                for ($b = 0; $b < 4; $b++) {
                    $startQ = $b * 10 + 1;
                    $endQ   = ($b + 1) * 10;
                    if ($startQ > $maxQ) {
                        continue;
                    }

                    $hasAny = false;
                    $kList = [];
                    $sList = [];

                    for ($q = $startQ; $q <= $endQ; $q++) {
                        if (isset($bookletKeyMap[$q])) {
                            $hasAny = true;
                            $item   = $bookletKeyMap[$q];
                            $ak     = $item['key'];
                            $qGroup = $item['group'];

                            $expect = strtoupper(trim((string) $ak->correct_answer));
                            $given  = strtoupper(trim((string) ($rawStr[$q - 1] ?? '')));
                            $status = self::compareOmrAnswer($given, $expect);

                            $kList[] = $expect !== '' ? $expect : ' ';

                            if ($status === 'correct') {
                                $sList[] = $expect;
                            } elseif ($status === 'wrong') {
                                $sList[] = strtolower($given);
                            } else {
                                $sList[] = ' ';
                            }

                            // Topic aggregation
                            $topicNames = $qGroup
                                ->map(fn($itemAk) => trim((string) ($itemAk->topic?->name ?? ($itemAk->custom_topic_text ?? ''))))
                                ->filter(fn($name) => $name !== '')
                                ->unique()
                                ->values()
                                ->all();
                            $topicLabel = count($topicNames) > 0 ? implode(', ', $topicNames) : null;
                            if ($topicLabel) {
                                if (!isset($topicAgg[$topicLabel])) {
                                    $topicAgg[$topicLabel] = [
                                        'name'    => $topicLabel,
                                        'count'   => 0,
                                        'correct' => 0,
                                        'wrong'   => 0,
                                        'blank'   => 0,
                                    ];
                                }
                                $topicAgg[$topicLabel]['count']++;
                                if ($status === 'correct') {
                                    $topicAgg[$topicLabel]['correct']++;
                                } elseif ($status === 'wrong') {
                                    $topicAgg[$topicLabel]['wrong']++;
                                } else {
                                    $topicAgg[$topicLabel]['blank']++;
                                }
                            }
                        } else {
                            $kList[] = ' ';
                            $sList[] = ' ';
                        }
                    }

                    if ($hasAny) {
                        $keyBlocks[$b]     = implode(' ', $kList);
                        $studentBlocks[$b] = implode(' ', $sList);
                    }
                }

                $courseRows[] = [
                    'course_name'            => $ec->course?->name ?? "Ders #{$cid}",
                    'session'                => $exam->session,
                    'question_count'         => $questionCount,
                    'correct'                => $cCorrect,
                    'wrong'                  => $cWrong,
                    'blank'                  => $cBlank,
                    'net'                    => $cNet,
                    'net_formatted'          => number_format($cNet, 2, ',', '.'),
                    'success_rate'           => $successRate,
                    'success_rate_formatted' => number_format($successRate, 2, ',', '.'),
                    'key_blocks'             => $keyBlocks,
                    'student_blocks'         => $studentBlocks,
                ];
            }
        }

        // Topic calculations
        foreach ($topicAgg as &$t) {
            $t['percent'] = $t['count'] > 0 ? round(($t['correct'] / $t['count']) * 100) : 0;
        }
        unset($t);

        $topicList = array_values($topicAgg);
        $topicTotalCount   = array_sum(array_column($topicList, 'count'));
        $topicTotalCorrect = array_sum(array_column($topicList, 'correct'));
        $topicTotalWrong   = array_sum(array_column($topicList, 'wrong'));
        $topicTotalPercent = $topicTotalCount > 0 ? round(($topicTotalCorrect / $topicTotalCount) * 100) : 0;

        $half = (int) ceil(count($topicList) / 2);
        $topicsLeft  = array_slice($topicList, 0, $half);
        $topicsRight = array_slice($topicList, $half);

        $totalQuestions = $totalCorrect + $totalWrong + $totalBlank;
        $totalSuccessRate = $totalQuestions > 0 ? round(($totalNet / $totalQuestions) * 100, 2) : 0.0;

        $percentile = null;
        if ($schoolTotal && $schoolRank) {
            $percentile = round((($schoolTotal - $schoolRank) / $schoolTotal) * 100, 1);
        }

        return [
            'student_name'           => $student->name,
            'student_no'             => $student->school_no,
            'classroom'              => $student->classroom?->name,
            'school_name'            => $student->school?->name ?? null,
            'session_name'           => $sessionName,
            'season'                 => $season,
            'exam_date'              => $examDate,
            'exam_type'              => $examType ?: 'LGS',
            'booklet'                => $booklet,
            'field'                  => $student->classroom?->branch ?? '',
            'exams_meta'             => $examsMeta,
            'sessions'               => $sessionRows,
            'total_questions'        => $totalQuestions,
            'total_correct'          => $totalCorrect,
            'total_wrong'            => $totalWrong,
            'total_blank'            => $totalBlank,
            'total_net'              => $totalNet,
            'total_net_formatted'    => number_format($totalNet, 2, ',', '.'),
            'total_success_rate'     => $totalSuccessRate,
            'total_success_rate_formatted' => number_format($totalSuccessRate, 2, ',', '.'),
            'total_point'            => $totalPoint,
            'total_point_formatted'  => number_format($totalPoint, 3, ',', '.'),
            'school_rank'            => $schoolRank,
            'school_total'           => $schoolTotal,
            'class_rank'             => $classRank,
            'class_total'            => $classTotal,
            'school_avg'             => $schoolAvg,
            'school_avg_formatted'   => $schoolAvg !== null ? number_format($schoolAvg, 2, ',', '.') : '—',
            'class_avg'              => $classAvg,
            'class_avg_formatted'    => $classAvg !== null ? number_format($classAvg, 2, ',', '.') : '—',
            'percentile'             => $percentile,
            'course_rows'            => $courseRows,
            'topics_left'            => $topicsLeft,
            'topics_right'           => $topicsRight,
            'topic_summary'          => [
                'count'   => $topicTotalCount,
                'correct' => $topicTotalCorrect,
                'wrong'   => $topicTotalWrong,
                'percent' => $topicTotalPercent,
            ],
            // backwards-compatibility
            'topic_rows'             => $topicList,
            'answer_rows'            => [],
        ];
    }

    /**
     * Pre-load exam collection with required relations.
     */
    private function loadExamsForCard(array $examIds): \Illuminate\Support\Collection
    {
        return OmrExam::whereIn('id', $examIds)
            ->with(['examCourses' => fn($q) => $q->with('course:id,name')->orderBy('sort_order')])
            ->get()
            ->keyBy('id');
    }

    /**
     * Compute school & class ranks for a student within a set of exams.
     * For multi-exam: uses combined total_net sum. For single exam: uses rank column.
     */
    private function computeStudentRanks(
        int    $studentId,
        array  $examIds,
        ?int   $classroomId
    ): array {
        if (count($examIds) === 1) {
            $result = OmrResult::withoutGlobalScope(\App\Scopes\SeasonScope::class)
                ->where('exam_id', $examIds[0])
                ->where('student_id', $studentId)->first();
            $schoolTotal = OmrResult::withoutGlobalScope(\App\Scopes\SeasonScope::class)
                ->where('exam_id', $examIds[0])->count();
            $schoolRank  = $result?->rank;

            $schoolAvgVal = OmrResult::withoutGlobalScope(\App\Scopes\SeasonScope::class)
                ->where('exam_id', $examIds[0])
                ->avg('total_point');
            $schoolAvg = $schoolAvgVal !== null ? round((float)$schoolAvgVal, 2) : null;

            $classRank = null;
            $classTotal = null;
            $classAvg = null;
            if ($classroomId) {
                $classResults = OmrResult::withoutGlobalScope(\App\Scopes\SeasonScope::class)
                    ->where('exam_id', $examIds[0])
                    ->whereHas('student', fn($q) => $q->where('classroom_id', $classroomId))
                    ->orderByDesc('total_net')->get();
                $classTotal = $classResults->count();
                $classAvg = $classTotal > 0 ? round((float)$classResults->avg('total_point'), 2) : null;
                foreach ($classResults as $i => $cr) {
                    if ($cr->student_id === $studentId) { $classRank = $i + 1; break; }
                }
            }
            return [$schoolRank, $schoolTotal, $classRank, $classTotal, $schoolAvg, $classAvg];
        }

        // Multi-exam: sum total_net and total_point per student across all exams
        $allStudentSums = DB::table('omr_results')
            ->whereIn('exam_id', $examIds)
            ->selectRaw('student_id, SUM(total_net) as sum_net, SUM(total_point) as sum_point')
            ->groupBy('student_id')
            ->orderByDesc('sum_net')
            ->get();

        $schoolTotal = $allStudentSums->count();
        $schoolAvg   = $schoolTotal > 0 ? round((float)$allStudentSums->avg('sum_point'), 2) : null;
        $schoolRank  = null;
        foreach ($allStudentSums as $i => $row) {
            if ((int) $row->student_id === $studentId) { $schoolRank = $i + 1; break; }
        }

        $classRank = null;
        $classTotal = null;
        $classAvg = null;
        if ($classroomId) {
            $classStudentIds = Student::where('classroom_id', $classroomId)->pluck('id')->toArray();
            $classSums = $allStudentSums->filter(fn($r) => in_array((int)$r->student_id, $classStudentIds))->values();
            $classTotal = $classSums->count();
            $classAvg = $classTotal > 0 ? round((float)$classSums->avg('sum_point'), 2) : null;
            foreach ($classSums as $i => $row) {
                if ((int) $row->student_id === $studentId) { $classRank = $i + 1; break; }
            }
        }
        return [$schoolRank, $schoolTotal, $classRank, $classTotal, $schoolAvg, $classAvg];
    }

    /** GET /omr/exams/{id}/report-card?student_id=X  — single student, single exam */
    public function reportCardExam(Request $request, int $id): \Symfony\Component\HttpFoundation\Response
    {
        if ($e = $this->ensureAccess()) return $e;
        $tenantId = $this->tenantId();
        $exam     = OmrExam::where('tenant_id', $tenantId)->findOrFail($id);

        $studentId = (int) $request->input('student_id');
        $student   = Student::where('tenant_id', $tenantId)->with('classroom:id,name')->findOrFail($studentId);

        $rawMerged = $exam->merged_exam_ids;
        if (is_string($rawMerged)) {
            $rawMerged = json_decode($rawMerged, true);
        }
        $mergedIds = array_values(array_filter(array_map('intval', (array) ($rawMerged ?? []))));
        $examIds = !empty($mergedIds) ? $mergedIds : [$id];

        $results = OmrResult::withoutGlobalScope(\App\Scopes\SeasonScope::class)
            ->whereIn('exam_id', $examIds)
            ->where('student_id', $studentId)
            ->get()
            ->keyBy('exam_id');

        if ($results->isEmpty()) {
            abort(404, 'Bu öğrenci için sınav sonucu bulunamadı.');
        }

        $exams = $this->loadExamsForCard($examIds);
        [$schoolRank, $schoolTotal, $classRank, $classTotal, $schoolAvg, $classAvg] = $this->computeStudentRanks(
            $studentId, $examIds, $student->classroom_id
        );

        $tenantName = \App\Models\Tenant::find($tenantId)?->name ?? 'Okul';
        $card = $this->buildCardData(
            $exams, $results->all(), $student,
            $schoolRank, $schoolTotal, $classRank, $classTotal,
            $exam->name, (string) ($exam->season ?? ''),
            null, null,
            $schoolAvg, $classAvg
        );

        $pdf = Pdf::loadView('omr.report_card', ['cards' => [$card], 'tenantName' => $tenantName])
            ->setPaper('a4', 'portrait');

        $filename = 'karne_' . preg_replace('/[^a-zA-Z0-9_-]/', '_', $student->name) . '.pdf';
        return $pdf->download($filename);
    }

    /** GET /omr/sessions/{id}/report-card?student_id=X  — single student, session */
    public function reportCardSession(Request $request, int $id): \Symfony\Component\HttpFoundation\Response
    {
        if ($e = $this->ensureAccess()) return $e;
        $tenantId = $this->tenantId();
        $session  = OmrSession::where('tenant_id', $tenantId)->findOrFail($id);
        $examIds  = $session->exam_ids ?? [];

        $studentId = (int) $request->input('student_id');
        $student   = Student::where('tenant_id', $tenantId)->with('classroom:id,name')->findOrFail($studentId);

        $exams   = $this->loadExamsForCard($examIds);
        $results = OmrResult::withoutGlobalScope(\App\Scopes\SeasonScope::class)
            ->whereIn('exam_id', $examIds)
            ->where('student_id', $studentId)
            ->get()
            ->keyBy('exam_id');

        [$schoolRank, $schoolTotal, $classRank, $classTotal, $schoolAvg, $classAvg] = $this->computeStudentRanks(
            $studentId, $examIds, $student->classroom_id
        );

        $tenantName = \App\Models\Tenant::find($tenantId)?->name ?? 'Okul';
        $card = $this->buildCardData(
            $exams, $results->all(), $student,
            $schoolRank, $schoolTotal, $classRank, $classTotal,
            $session->name, (string) ($session->exam_type ?? ''),
            null, null,
            $schoolAvg, $classAvg
        );

        $pdf = Pdf::loadView('omr.report_card', ['cards' => [$card], 'tenantName' => $tenantName])
            ->setPaper('a4', 'portrait');

        $filename = 'karne_' . preg_replace('/[^a-zA-Z0-9_-]/', '_', $student->name) . '.pdf';
        return $pdf->download($filename);
    }

    /** GET /omr/exams/{id}/report-card/bulk?classroom_id=X  — all students (optionally filtered by class) */
    public function reportCardBulkExam(Request $request, int $id): \Symfony\Component\HttpFoundation\Response
    {
        ini_set('memory_limit', '1G');
        ini_set('max_execution_time', '300');

        if ($e = $this->ensureAccess()) return $e;
        $tenantId = $this->tenantId();
        $exam     = OmrExam::where('tenant_id', $tenantId)->findOrFail($id);

        $rawMerged = $exam->merged_exam_ids;
        if (is_string($rawMerged)) {
            $rawMerged = json_decode($rawMerged, true);
        }
        $mergedIds = array_values(array_filter(array_map('intval', (array) ($rawMerged ?? []))));
        if (!empty($mergedIds)) {
            return $this->reportCardBulkMergedExam($request, $exam, $mergedIds);
        }

        $query = OmrResult::withoutGlobalScope(\App\Scopes\SeasonScope::class)
            ->where('exam_id', $id)
            ->with(['student' => fn($q) => $q->with('classroom:id,name')]);
        if ($request->filled('classroom_id'))
            $query->whereHas('student', fn($q) => $q->where('classroom_id', (int) $request->input('classroom_id')));

        $results = $query->orderBy('rank')->get();
        if ($results->isEmpty()) abort(404, 'Bu sınav için sonuç bulunamadı.');

        // Pre-calculate all ranks and statistics for performance
        $allResults = OmrResult::withoutGlobalScope(\App\Scopes\SeasonScope::class)
            ->where('exam_id', $id)
            ->with(['student:id,classroom_id'])
            ->get();
        $examTotals = [$id => $allResults->count()];
        $classroomRankings = $this->calculateClassroomRankings($allResults);

        $exams = $this->loadExamsForCard([$id]);
        $preloadedAnswerKeys = $this->preloadExamAnswerKeys($exams);

        $tenantName = \App\Models\Tenant::find($tenantId)?->name ?? 'Okul';
        $schoolTotal = $examTotals[$id];
        $schoolAvg = $schoolTotal > 0 ? round((float) $allResults->avg('total_point'), 2) : null;

        $cards = $this->buildBulkExamCards(
            $results,
            $classroomRankings,
            $exams,
            $exam,
            $id,
            $schoolTotal,
            $preloadedAnswerKeys,
            $examTotals,
            $schoolAvg
        );

        $pdf = Pdf::loadView('omr.report_card', ['cards' => $cards, 'tenantName' => $tenantName])
            ->setPaper('a4', 'portrait');

        $filename = 'karne_toplu_' . preg_replace('/[^a-zA-Z0-9_-]/', '_', $exam->name) . '.pdf';
        return $pdf->download($filename);
    }

    private function reportCardBulkMergedExam(Request $request, OmrExam $exam, array $mergedIds): \Symfony\Component\HttpFoundation\Response
    {
        $tenantId = $this->tenantId();
        $studentIdQuery = OmrResult::withoutGlobalScope(\App\Scopes\SeasonScope::class)
            ->whereIn('exam_id', $mergedIds)
            ->distinct()
            ->pluck('student_id');

        $studentsQuery = Student::where('tenant_id', $tenantId)
            ->whereIn('id', $studentIdQuery)
            ->with('classroom:id,name');
        if ($request->filled('classroom_id')) {
            $studentsQuery->where('classroom_id', (int) $request->input('classroom_id'));
        }

        $students = $studentsQuery->get();
        if ($students->isEmpty()) abort(404, 'Bu birleşik sınav için sonuç bulunamadı.');

        $exams      = $this->loadExamsForCard($mergedIds);
        $tenantName = \App\Models\Tenant::find($tenantId)?->name ?? 'Okul';

        $allResults = OmrResult::withoutGlobalScope(\App\Scopes\SeasonScope::class)
            ->whereIn('exam_id', $mergedIds)
            ->whereIn('student_id', $students->pluck('id'))
            ->get();
        $resultMap = [];
        foreach ($allResults as $r) {
            $resultMap[$r->student_id][$r->exam_id] = $r;
        }

        $allStudentSums = DB::table('omr_results')
            ->whereIn('exam_id', $mergedIds)
            ->selectRaw('student_id, SUM(total_net) as sum_net, SUM(total_point) as sum_point')
            ->groupBy('student_id')
            ->orderByDesc('sum_net')
            ->get();
        $schoolTotal = $allStudentSums->count();
        $schoolAvg = $schoolTotal > 0 ? round((float) $allStudentSums->avg('sum_point'), 2) : null;
        $schoolRankMap = [];
        foreach ($allStudentSums as $i => $row) {
            $schoolRankMap[(int) $row->student_id] = $i + 1;
        }

        $preloadedAnswerKeys = $this->preloadExamAnswerKeys($exams);

        $cards = [];
        foreach ($students as $student) {
            $studentResults = $resultMap[$student->id] ?? [];
            $schoolRank = $schoolRankMap[$student->id] ?? null;

            $classRank = null; $classTotal = null; $classAvg = null;
            if ($student->classroom_id) {
                $classStudentIds = Student::where('classroom_id', $student->classroom_id)->pluck('id')->toArray();
                $classSums = $allStudentSums->filter(fn($r) => in_array((int) $r->student_id, $classStudentIds))->values();
                $classTotal = $classSums->count();
                $classAvg = $classTotal > 0 ? round((float) $classSums->avg('sum_point'), 2) : null;
                foreach ($classSums as $i => $row) {
                    if ((int) $row->student_id === $student->id) { $classRank = $i + 1; break; }
                }
            }

            $cards[] = $this->buildCardData(
                $exams, $studentResults, $student,
                $schoolRank, $schoolTotal, $classRank, $classTotal,
                $exam->name, (string) ($exam->season ?? ''),
                $preloadedAnswerKeys, null,
                $schoolAvg, $classAvg
            );
        }

        usort($cards, fn($a, $b) => ($a['school_rank'] ?? 9999) <=> ($b['school_rank'] ?? 9999));

        $pdf = Pdf::loadView('omr.report_card', ['cards' => $cards, 'tenantName' => $tenantName])
            ->setPaper('a4', 'portrait');

        $filename = 'karne_toplu_' . preg_replace('/[^a-zA-Z0-9_-]/', '_', $exam->name) . '.pdf';
        return $pdf->download($filename);
    }

    /**
     * @param iterable $allResults
     * @return array<int, array>
     */
    private function calculateClassroomRankings(iterable $allResults): array
    {
        $classroomRankings = [];
        foreach ($allResults as $r) {
            $cid = $r->student?->classroom_id;
            if ($cid) {
                $classroomRankings[$cid][] = $r;
            }
        }
        foreach ($classroomRankings as $cid => &$crs) {
            usort($crs, fn($a, $b) => $b->total_net <=> $a->total_net);
        }
        return $classroomRankings;
    }

    /**
     * @param iterable $exams
     * @return array<int, \Illuminate\Support\Collection>
     */
    private function preloadExamAnswerKeys(iterable $exams): array
    {
        $preloaded = [];
        foreach ($exams as $ex) {
            $preloaded[$ex->id] = OmrAnswerKey::where('exam_id', $ex->id)
                ->with(['topic:id,name', 'course:id,name'])
                ->orderBy('course_id')->orderBy('question_no')
                ->get();
        }
        return $preloaded;
    }

    /**
     * @param iterable $results
     * @param array $classroomRankings
     * @param iterable $exams
     * @param OmrExam $exam
     * @param int $examId
     * @param int $schoolTotal
     * @param array $preloadedAnswerKeys
     * @param array $examTotals
     * @param float|null $schoolAvg
     * @return array
     */
    private function buildBulkExamCards(
        iterable $results,
        array $classroomRankings,
        iterable $exams,
        OmrExam $exam,
        int $examId,
        int $schoolTotal,
        array $preloadedAnswerKeys,
        array $examTotals,
        ?float $schoolAvg = null
    ): array {
        $cards = [];
        foreach ($results as $result) {
            $student = $result->student;
            if (!$student) continue;

            $classRank = null;
            $classTotal = null;
            $classAvg = null;
            if ($student->classroom_id && isset($classroomRankings[$student->classroom_id])) {
                $clsArr = $classroomRankings[$student->classroom_id];
                $classTotal = count($clsArr);
                $classAvg = $classTotal > 0 ? round((float) collect($clsArr)->avg('total_point'), 2) : null;
                foreach ($clsArr as $i => $cr) {
                    if ($cr->student_id === $student->id) {
                        $classRank = $i + 1;
                        break;
                    }
                }
            }

            $cards[] = $this->buildCardData(
                $exams,
                [$examId => $result],
                $student,
                $result->rank,
                $schoolTotal,
                $classRank,
                $classTotal,
                $exam->name,
                (string) ($exam->season ?? ''),
                $preloadedAnswerKeys,
                $examTotals,
                $schoolAvg,
                $classAvg
            );
        }
        return $cards;
    }

    private function calculateSession(OmrSession $session): void
    {
        $examIds = $session->exam_ids ?? [];
        if (empty($examIds)) return;

        // Her sınavdaki sonuçları öğrenci bazında topla
        $studentTotals = [];
        foreach ($examIds as $examId) {
            $results = OmrResult::withoutGlobalScope(\App\Scopes\SeasonScope::class)
                ->where('exam_id', $examId)
                ->select(['student_id', 'total_net', 'total_point', 'rank'])->get();
            foreach ($results as $r) {
                $sid = $r->student_id;
                if (!isset($studentTotals[$sid])) $studentTotals[$sid] = ['student_id' => $sid, 'total_net' => 0.0, 'total_point' => 0.0, 'exam_count' => 0];
                $studentTotals[$sid]['total_net'] += $r->total_net;
                $studentTotals[$sid]['total_point'] += $r->total_point;
                $studentTotals[$sid]['exam_count']++;
            }
        }

        // Sırala
        usort($studentTotals, fn($a, $b) => $b['total_net'] <=> $a['total_net']);
        foreach ($studentTotals as $rank => &$row) $row['rank'] = $rank + 1;

        $studentInfoMap = Student::where('tenant_id', $this->tenantId())
            ->whereIn('id', array_column($studentTotals, 'student_id'))
            ->select(['id', 'name', 'school_no', 'classroom_id'])
            ->with('classroom:id,name')
            ->get()
            ->keyBy('id');

        foreach ($studentTotals as &$row) {
            $student = $studentInfoMap[$row['student_id']] ?? null;
            $row['student_name'] = $student?->name;
            $row['student_no'] = $student?->school_no;
            $row['classroom_name'] = $student?->classroom?->name;
        }

        $session->update(['combined_results' => array_values($studentTotals), 'calculated_at' => now()]);
    }

    /** GET /omr/sessions/{id}/report-card/bulk?classroom_id=X */
    public function reportCardBulkSession(Request $request, int $id): \Symfony\Component\HttpFoundation\Response
    {
        if ($e = $this->ensureAccess()) return $e;
        $tenantId = $this->tenantId();
        $session  = OmrSession::where('tenant_id', $tenantId)->findOrFail($id);
        $examIds  = $session->exam_ids ?? [];
        if (empty($examIds)) abort(404, 'Oturumda sınav yok.');

        // All student IDs that participated in any exam in this session
        $studentIdQuery = OmrResult::withoutGlobalScope(\App\Scopes\SeasonScope::class)
            ->whereIn('exam_id', $examIds)->distinct()->pluck('student_id');

        $studentsQuery = Student::where('tenant_id', $tenantId)
            ->whereIn('id', $studentIdQuery)
            ->with('classroom:id,name');
        if ($request->filled('classroom_id'))
            $studentsQuery->where('classroom_id', (int) $request->input('classroom_id'));

        /** @var \Illuminate\Database\Eloquent\Collection|Student[] $students */
        $students = $studentsQuery->get();
        if ($students->isEmpty()) abort(404, 'Öğrenci bulunamadı.');

        $exams      = $this->loadExamsForCard($examIds);
        $tenantName = \App\Models\Tenant::find($tenantId)?->name ?? 'Okul';

        // Pre-compute all results keyed by [student_id][exam_id]
        $allResults = OmrResult::withoutGlobalScope(\App\Scopes\SeasonScope::class)
            ->whereIn('exam_id', $examIds)
            ->whereIn('student_id', $students->pluck('id'))
            ->get();
        $resultMap = [];
        foreach ($allResults as $r) {
            $resultMap[$r->student_id][$r->exam_id] = $r;
        }

        // Pre-compute combined school ranks
        $allStudentSums = DB::table('omr_results')
            ->whereIn('exam_id', $examIds)
            ->selectRaw('student_id, SUM(total_net) as sum_net')
            ->groupBy('student_id')
            ->orderByDesc('sum_net')
            ->get();
        $schoolTotal = $allStudentSums->count();
        $schoolRankMap = [];
        foreach ($allStudentSums as $i => $row) {
            $schoolRankMap[(int) $row->student_id] = $i + 1;
        }

        $cards = [];
        foreach ($students as $student) {
            /** @var Student $student */
            $studentResults = $resultMap[$student->id] ?? [];
            $schoolRank = $schoolRankMap[$student->id] ?? null;

            // Class rank among session participants
            $classRank = null; $classTotal = null;
            if ($student->classroom_id) {
                $classStudentIds = Student::where('classroom_id', $student->classroom_id)->pluck('id')->toArray();
                $classSums = $allStudentSums->filter(fn($r) => in_array((int) $r->student_id, $classStudentIds))->values();
                $classTotal = $classSums->count();
                foreach ($classSums as $i => $row) {
                    if ((int) $row->student_id === $student->id) { $classRank = $i + 1; break; }
                }
            }

            $cards[] = $this->buildCardData(
                $exams, $studentResults, $student,
                $schoolRank, $schoolTotal, $classRank, $classTotal,
                $session->name, (string) ($session->exam_type ?? '')
            );
        }

        // Sort cards by school rank
        usort($cards, fn($a, $b) => ($a['school_rank'] ?? 9999) <=> ($b['school_rank'] ?? 9999));

        $pdf = Pdf::loadView('omr.report_card', ['cards' => $cards, 'tenantName' => $tenantName])
            ->setPaper('a4', 'portrait');

        $filename = 'karne_toplu_' . preg_replace('/[^a-zA-Z0-9_-]/', '_', $session->name) . '.pdf';
        return $pdf->download($filename);
    }

    /** GET /omr/teacher-exams */
    public function teacherExamsIndex(Request $request): JsonResponse
    {
        if ($e = $this->ensureAccess()) return $e;
        $exams = OmrExam::where('tenant_id', $this->tenantId())
            ->where(function ($q) {
                $q->whereJsonContains('share_roles->teacher', true)
                  ->orWhereNull('share_roles')
                  ->orWhereRaw("JSON_UNQUOTE(JSON_EXTRACT(share_roles, '$.teacher')) != 'false'");
            })
            ->orderByDesc('exam_date')
            ->orderByDesc('id')
            ->get();
        return $this->success(['exams' => $exams]);
    }

    // --- PORTAL METHODS ---

    /**
    public function portalSessionsIndex(Request $request): JsonResponse
    {
        if ($e = $this->ensurePortalAccess()) return $e;
        $studentId = $this->portalResolveStudentId($request);
        if ($studentId <= 0) return $this->error('Öğrenci bulunamadı.', [], 404);

        $tenantId = $this->tenantId();
        
        // Identify exams that are part of a synthetic merged exam shared with parents
        $mergedExams = OmrExam::where('tenant_id', $tenantId)
            ->whereJsonContains('share_roles->parent', true)
            ->whereNotNull('merged_exam_ids')
            ->get();
        $coveredByMerged = $mergedExams->pluck('merged_exam_ids')->flatten()->unique()->toArray();

        $sessions = OmrSession::where('tenant_id', $tenantId)->orderByDesc('id')->get();

        $formatted = [];
        foreach ($sessions as $session) {
            $examIds = (array)($session->exam_ids ?? []);
            if (empty($examIds)) continue;

            // Check if this session is redundant (already shown as a merged exam in the main list)
            $isRedundant = false;
            foreach ($mergedExams as $me) {
                $meIds = array_values(array_filter(array_map('intval', (array)($me->merged_exam_ids ?? []))));
                if (count(array_diff($examIds, $meIds)) === 0) {
                    $isRedundant = true;
                    break;
                }
            }
            if ($isRedundant) continue;

            $anyShared = OmrExam::whereIn('id', $examIds)->where(function($q) {
                $q->whereJsonContains('share_roles->parent', true)
                  ->orWhereJsonContains('share_roles->student', true);
            })->count() > 0;
            if (!$anyShared) continue;

            $results = OmrResult::withoutGlobalScope(\App\Scopes\SeasonScope::class)
                ->whereIn('exam_id', $examIds)->where('student_id', $studentId)->get();
            if ($results->isEmpty()) continue;

            $agg = $this->portalBuildAggregatedResult($results, null, $studentId, $examIds);

            // Class rank for session
            $classRank = 0;
            $student = \App\Models\Student::withoutGlobalScope(\App\Scopes\SeasonScope::class)->find($studentId);
            if ($student && $student->classroom_id) {
                $classStudentSums = OmrResult::withoutGlobalScope(\App\Scopes\SeasonScope::class)
                    ->whereIn('exam_id', $examIds)
                    ->whereHas('student', fn($q) => $q->withoutGlobalScope(\App\Scopes\SeasonScope::class)->where('classroom_id', $student->classroom_id))
                    ->selectRaw('student_id, SUM(total_net) as sum_net')
                    ->groupBy('student_id')
                    ->orderByDesc('sum_net')
                    ->get();
                foreach ($classStudentSums as $i => $row) {
                    if ((int)$row->student_id === $studentId) {
                        $classRank = $i + 1;
                        break;
                    }
                }
            }

            $formatted[] = [
                'id' => $session->id,
                'name' => $session->name,
                'exam_type' => $session->exam_type,
                'exam_date' => $session->created_at->format('d.m.Y'),
                'exam_ids' => $examIds,
                'exam_count' => count($examIds),
                'total_net' => round($results->sum('total_net'), 2),
                'total_point' => $agg['total_point'],
                'rank' => $agg['rank'],
                'school_rank' => $agg['rank'],
                'class_rank' => $classRank,
                'student_id' => $studentId,
            ];
        }

        return $this->success(['sessions' => $formatted]);
    }

    /**
     * List exam results for the student/guardian portal.
     */
    public function portalExamsIndex(Request $request): JsonResponse
    {
        $user = auth()->user();
        if (!$user) return $this->error('Yetkisiz erişim.', [], 401);

        $studentIds = [];
        if ($user instanceof Student) {
            $studentIds = [$user->id];
        } elseif ($user instanceof \App\Models\Guardian) {
            $studentIds = $user->students()->pluck('students.id')->toArray();
        } elseif ($user instanceof \App\Models\User) {
            if (!empty($user->tc_no)) {
                $studentIds = Student::withoutGlobalScope(\App\Scopes\SeasonScope::class)
                    ->where('tc_no', $user->tc_no)
                    ->pluck('id')
                    ->toArray();
            }
            if (empty($studentIds)) {
                $studentIds = [$user->id];
            }
        } elseif (is_object($user) && isset($user->id)) {
            $studentIds = [$user->id];
        } else {
            $studentIds = [];
        }

        if (empty($studentIds)) {
            return $this->success(['exams' => []]);
        }

        $tenantId = $this->tenantId();

        // Identify exams that are part of a session to avoid duplicates
        $examsInSessions = OmrSession::where('tenant_id', $tenantId)->pluck('exam_ids')->flatten()->unique()->toArray();
        
        // Identify exams that are sub-exams of a merged exam
        $allExams = OmrExam::where('tenant_id', $tenantId)->get(['id', 'merged_exam_ids']);
        $subExamIds = [];
        foreach ($allExams as $e) {
            $ids = array_values(array_filter(array_map('intval', (array) ($e->merged_exam_ids ?? []))));
            if (!empty($ids)) $subExamIds = array_merge($subExamIds, $ids);
        }
        $subExamIds = array_unique($subExamIds);

        // Get all exams shared with parents/guardians/students
        $sharedExams = OmrExam::where(function($q) {
                $q->whereJsonContains('share_roles->parent', true)
                  ->orWhereJsonContains('share_roles->student', true);
            })
            ->where('tenant_id', $tenantId)
            ->orderByDesc('exam_date')
            ->orderByDesc('id')
            ->get();

        $formatted = [];
        $totalStudents = count($studentIds);
        foreach ($sharedExams as $exam) {
            $mergedIds = array_values(array_filter(array_map('intval', (array) ($exam->merged_exam_ids ?? []))));
            $isMerged = !empty($mergedIds);

            foreach ($studentIds as $studentId) {
                $item = $this->formatPortalExamStudentResult($exam, $studentId, $isMerged, $mergedIds, $totalStudents);
                if ($item !== null) {
                    $formatted[] = $item;
                }
            }
        }

        return $this->success(['exams' => $formatted]);
    }

    /**
     * Format a single student's exam result for portal response.
     */
    private function formatPortalExamStudentResult(
        OmrExam $exam,
        int $studentId,
        bool $isMerged,
        array $mergedIds,
        int $totalStudentsCount
    ): ?array {
        $totalNet = 0;
        $totalPoint = 0;
        $hasResult = false;
        $allIds = [];

        if ($isMerged) {
            $subResults = OmrResult::withoutGlobalScope(\App\Scopes\SeasonScope::class)
                ->whereIn('exam_id', $mergedIds)
                ->where('student_id', $studentId)
                ->get();

            if ($subResults->isNotEmpty()) {
                $hasResult = true;
                $totalNet = $subResults->sum('total_net');
                $totalPoint = $subResults->sum('total_point');
                $allIds = $mergedIds;
            }
        } else {
            $res = OmrResult::withoutGlobalScope(\App\Scopes\SeasonScope::class)
                ->where('exam_id', $exam->id)
                ->where('student_id', $studentId)
                ->first();
            if ($res) {
                $hasResult = true;
                $totalNet = $res->total_net;
                $totalPoint = $res->total_point;
                $allIds = [(int)$exam->id];
            }
        }

        if (! $hasResult) {
            return null;
        }

        // Sync with T-Score engine for school rank and points
        $allSids = OmrResult::withoutGlobalScope(\App\Scopes\SeasonScope::class)
            ->whereIn('exam_id', $allIds)->distinct()->pluck('student_id');
        $tScored = $this->applyTScores($allSids->map(fn($sid) => ['id' => $sid])->toArray(), $allIds);

        $schoolRank = 0;
        $finalPoint = round($totalPoint, 2);
        foreach ($tScored as $ts) {
            if ((int)$ts['id'] === $studentId) {
                $schoolRank = $ts['rank'];
                $finalPoint = $ts['total_point'];
                break;
            }
        }

        // Calculate class rank
        $classRank = 0;
        $student = Student::withoutGlobalScope(\App\Scopes\SeasonScope::class)->find($studentId);
        if ($student && $student->classroom_id) {
            $classStudentSums = OmrResult::withoutGlobalScope(\App\Scopes\SeasonScope::class)
                ->whereIn('exam_id', $allIds)
                ->whereHas('student', fn($q) => $q->withoutGlobalScope(\App\Scopes\SeasonScope::class)->where('classroom_id', $student->classroom_id))
                ->selectRaw('student_id, SUM(total_net) as sum_net')
                ->groupBy('student_id')
                ->orderByDesc('sum_net')
                ->get();

            foreach ($classStudentSums as $i => $row) {
                if ((int)$row->student_id === $studentId) {
                    $classRank = $i + 1;
                    break;
                }
            }
        }

        return [
            'result_id' => $exam->id,
            'exam_id' => $exam->id,
            'student_id' => $studentId,
            'exam_name' => $exam->name . ($totalStudentsCount > 1 ? " (" . ($student?->name ?? 'Öğrenci') . ")" : ""),
            'exam_type' => $exam->exam_type,
            'exam_date' => $exam->exam_date ? Carbon::parse($exam->exam_date)->format('d.m.Y') : null,
            'total_net' => round($totalNet, 2),
            'total_point' => $finalPoint,
            'rank' => $schoolRank,
            'school_rank' => $schoolRank,
            'class_rank' => $classRank,
            'is_merged' => $isMerged
        ];
    }

    public function portalExamResult(Request $request, int $examId): JsonResponse
    {
        if ($e = $this->ensurePortalAccess()) return $e;

        $studentId = $this->portalResolveStudentId($request);
        if ($studentId <= 0) return $this->error('Öğrenci bulunamadı.', [], 404);

        $exam = OmrExam::where('tenant_id', $this->tenantId())->with(['examCourses.course'])->findOrFail($examId);
        
        $isShared = !empty($exam->share_roles['parent']) || !empty($exam->share_roles['student']);
        if (!$isShared) return $this->error('Henüz paylaşıma açılmadı.', [], 403);

        $mergedIds = array_values(array_filter(array_map('intval', (array) ($exam->merged_exam_ids ?? []))));
        $allIds = !empty($mergedIds) ? array_values(array_unique(array_merge([$examId], $mergedIds))) : [$examId];

        $results = OmrResult::withoutGlobalScope(\App\Scopes\SeasonScope::class)
            ->whereIn('exam_id', $allIds)->where('student_id', $studentId)->get();
        if ($results->isEmpty()) return $this->error('Sonuç bulunamadı.', [], 404);

        $isMerged = count($allIds) > 1;
        $courseScores = $this->aggregateStudentCourseScores($results, $isMerged);
        $topicAnalysis = $this->portalCalculateTopicAnalysis($results, $allIds);
        
        $student = Student::withoutGlobalScope(\App\Scopes\SeasonScope::class)->find($studentId);
        [$classAvg, $schoolAvg] = $this->portalGetAverages($student, $allIds, $isMerged);

        $aggResult = $this->portalBuildAggregatedResult($results, $examId, $studentId, $allIds);

        return $this->success([
            'result' => $aggResult,
            'exam' => $exam,
            'is_merged' => !empty($mergedIds),
            'topic_analysis' => array_values($topicAnalysis),
            'course_scores' => $courseScores,
            'class_averages' => $classAvg,
            'school_averages' => $schoolAvg,
            'student_id' => $studentId,
            'student_name' => $student?->name
        ]);
    }


    public function portalSessionResult(Request $request, int $sessionId): JsonResponse
    {
        if ($e = $this->ensurePortalAccess()) return $e;
        $studentId = $this->portalResolveStudentId($request);
        if ($studentId <= 0) return $this->error('Öğrenci bulunamadı.', [], 404);

        $session = OmrSession::where('tenant_id', $this->tenantId())->findOrFail($sessionId);
        $examIds = array_values(array_filter(array_map('intval', (array)($session->exam_ids ?? []))));
        $exams = OmrExam::whereIn('id', $examIds)
            ->where(function($q) {
                $q->whereJsonContains('share_roles->parent', true)
                  ->orWhereJsonContains('share_roles->student', true);
            })
            ->with(['examCourses.course'])
            ->get();
        if ($exams->isEmpty()) {
            $exams = OmrExam::whereIn('id', $examIds)->with(['examCourses.course'])->get();
        }
        if ($exams->isEmpty()) return $this->error('Sınavlar paylaşıma açılmadı.', [], 403);

        $validIds = $exams->pluck('id')->toArray();
        $results = OmrResult::withoutGlobalScope(\App\Scopes\SeasonScope::class)
            ->whereIn('exam_id', $validIds)->where('student_id', $studentId)->get();
        if ($results->isEmpty()) return $this->error('Sonuç bulunamadı.', [], 404);

        $courseScores = $this->aggregateStudentCourseScores($results, count($validIds) > 1);
        $topicAnalysis = $this->portalCalculateTopicAnalysis($results, $validIds);
        $student = Student::withoutGlobalScope(\App\Scopes\SeasonScope::class)->find($studentId);
        [$classAvg, $schoolAvg] = $this->portalGetAverages($student, $validIds, count($validIds) > 1);

        $aggResult = $this->portalBuildAggregatedResult($results, null, $studentId, $validIds);

        return $this->success([
            'result' => $aggResult,
            'session' => ['id' => $session->id, 'name' => $session->name ?: $exams->pluck('name')->implode(', ')],
            'exam' => $exams->first(),
            'exams' => $exams,
            'is_merged' => count($validIds) > 1,
            'topic_analysis' => array_values($topicAnalysis),
            'course_scores' => $courseScores,
            'class_averages' => $classAvg,
            'school_averages' => $schoolAvg,
            'student_id' => $studentId,
            'student_name' => $student?->name
        ]);
    }

    private function portalResolveStudentId(Request $request): int
    {
        $user = auth()->user();
        $allowed = [];
        if ($user instanceof Student) {
            $allowed = [$user->id];
        } elseif ($user instanceof \App\Models\Guardian) {
            $allowed = $user->students()->pluck('students.id')->toArray();
        } elseif ($user instanceof \App\Models\User) {
            if (!empty($user->tc_no)) {
                $studentIds = Student::withoutGlobalScope(\App\Scopes\SeasonScope::class)
                    ->where('tc_no', $user->tc_no)
                    ->pluck('id')
                    ->toArray();
                if (!empty($studentIds)) {
                    $allowed = $studentIds;
                }
            }
            if (empty($allowed)) {
                $allowed = [$user->id];
            }
        } elseif (is_object($user) && isset($user->id)) {
            $allowed = [$user->id];
        } else {
            $allowed = [];
        }

        $target = (int)$request->get('student_id');
        if ($target > 0 && in_array($target, $allowed)) return $target;
        return $allowed[0] ?? 0;
    }

    private function ensurePortalAccess()
    {
        return auth()->check() ? null : $this->error('Yetkisiz.', [], 401);
    }

    private function portalCalculateTopicAnalysis($results, array $examIds): array
    {
        $keys = OmrAnswerKey::whereIn('exam_id', $examIds)->with(['course', 'topic'])->get();
        $topicAnalysis = [];
        foreach ($results as $rs) {
            /** @var OmrResult $rs */
            $analysis = $this->buildStudentTopicAnalysis($rs, $keys->where('exam_id', $rs->exam_id));
            foreach ($analysis as $item) {
                $k = ($item['course_id'] ?? 0) . '_' . ($item['topic_id'] ?? 0);
                if (!isset($topicAnalysis[$k])) {
                    $topicAnalysis[$k] = $item;
                } else {
                    $topicAnalysis[$k]['correct'] += $item['correct'];
                    $topicAnalysis[$k]['wrong'] += $item['wrong'];
                    $topicAnalysis[$k]['blank'] += $item['blank'];
                }
            }
        }
        return $topicAnalysis;
    }

    private function portalGetAverages($student, array $examIds, bool $isMerged): array
    {
        $classAverages = []; $schoolAverages = [];
        if (!$student) return [[], []];

        if ($student->classroom_id) {
            $classResults = OmrResult::withoutGlobalScope(\App\Scopes\SeasonScope::class)
                ->whereIn('exam_id', $examIds)
                ->whereHas('student', fn($q) => $q->withoutGlobalScope(\App\Scopes\SeasonScope::class)->where('classroom_id', $student->classroom_id))
                ->get();
            $classAverages = $this->aggregateCourseAverages($classResults, $isMerged);
        }

        $schoolResults = OmrResult::withoutGlobalScope(\App\Scopes\SeasonScope::class)
            ->whereIn('exam_id', $examIds)->where('tenant_id', $this->tenantId())->get();
        $schoolAverages = $this->aggregateCourseAverages($schoolResults, $isMerged);

        return [$classAverages, $schoolAverages];
    }

    private function portalBuildAggregatedResult($results, ?int $primaryExamId, int $studentId, array $allIds): array
    {
        $primary = ($primaryExamId ? $results->where('exam_id', $primaryExamId)->first() : null) ?? $results->first();
        
        $agg = [
            'id' => $primary?->id,
            'total_net' => round((float)$results->sum('total_net'), 2),
            'total_point' => round((float)$results->sum('total_point'), 2),
            'rank' => $primary?->rank,
            'school_rank' => $primary?->rank,
            'class_rank' => 0,
            'booklet_type' => $primary?->booklet_type ?? 'A',
        ];

        $allSids = OmrResult::withoutGlobalScope(\App\Scopes\SeasonScope::class)
            ->whereIn('exam_id', $allIds)->distinct()->pluck('student_id');
        $tScored = $this->applyTScores($allSids->map(fn($sid) => ['id' => $sid])->toArray(), $allIds);
        foreach ($tScored as $ts) {
            if ((int)$ts['id'] === $studentId) {
                $agg['total_point'] = $ts['total_point'];
                $agg['rank'] = $ts['rank'];
                $agg['school_rank'] = $ts['rank'];
                break;
            }
        }

        // Calculate class rank
        $student = Student::withoutGlobalScope(\App\Scopes\SeasonScope::class)->find($studentId);
        if ($student && $student->classroom_id) {
            $classStudentSums = OmrResult::withoutGlobalScope(\App\Scopes\SeasonScope::class)
                ->whereIn('exam_id', $allIds)
                ->whereHas('student', fn($q) => $q->withoutGlobalScope(\App\Scopes\SeasonScope::class)->where('classroom_id', $student->classroom_id))
                ->selectRaw('student_id, SUM(total_net) as sum_net')
                ->groupBy('student_id')
                ->orderByDesc('sum_net')
                ->get();

            foreach ($classStudentSums as $i => $row) {
                if ((int)$row->student_id === $studentId) {
                    $agg['class_rank'] = $i + 1;
                    break;
                }
            }
        }

        return $agg;
    }

    /**
     * Portal analytics endpoint for students/guardians.
     * Restricts data to only the logged-in student/guardian's data.
     */
    public function portalAnalytics(Request $request, int $id): JsonResponse
    {
        if ($e = $this->ensurePortalAccess()) return $e;
        $studentId = $this->portalResolveStudentId($request);
        if ($studentId <= 0) return $this->error('Öğrenci bulunamadı.', [], 404);

        $tenantId = $this->tenantId();
        $exam = OmrExam::where('tenant_id', $tenantId)->findOrFail($id);
        $isShared = !empty($exam->share_roles['parent']) || !empty($exam->share_roles['student']);
        if (!$isShared) return $this->error('Paylaşıma açılmadı.', [], 403);

        $examIds = $this->parseExamIdsFromRequest($request, $id);
        $validIds = OmrExam::where('tenant_id', $tenantId)->whereIn('id', $examIds)
            ->where(function($q) {
                $q->whereJsonContains('share_roles->parent', true)
                  ->orWhereJsonContains('share_roles->student', true);
            })->pluck('id')->toArray();
        if (empty($validIds)) return $this->error('Geçerli sınav bulunamadı.', [], 422);

        $expanded = $this->resolveEffectiveExamIds($validIds);
        if (!empty($expanded)) $validIds = $expanded;

        $mergedIds = count($validIds) > 1 ? array_values($validIds) : [];
        if (empty($mergedIds) && !empty($exam->merged_exam_ids)) {
            $mergedIds = OmrExam::whereIn('id', array_values(array_filter(array_map('intval', (array)$exam->merged_exam_ids))))
                ->where(function($q) {
                    $q->whereJsonContains('share_roles->parent', true)
                      ->orWhereJsonContains('share_roles->student', true);
                })
                ->pluck('id')->toArray();
        }
        $targetIds = !empty($mergedIds) ? $mergedIds : [(int) $id];

        $query = OmrResult::withoutGlobalScope(\App\Scopes\SeasonScope::class)->whereIn('exam_id', $targetIds);
        if ($request->filled('classroom_id')) {
            $query->whereHas('student', fn($q) => $q->withoutGlobalScope(\App\Scopes\SeasonScope::class)->where('classroom_id', (int)$request->get('classroom_id')));
        }
        $allResults = $query->get();

        $binSize = max(0.1, (float)$request->get('bin_size', 5));
        $summary = $this->portalAnalyticsGetGlobalSummary($allResults);
        $distribution = $this->portalAnalyticsGetDistribution($allResults, $binSize);
        $classAvgMap = $this->portalAnalyticsGetClassAverages($allResults);
        $courseAvg = $this->calculateExamCourseAverages($allResults);
        $courseDist = $this->analyticsGetCourseDistributions($allResults, $courseAvg->toArray(), $binSize);

        $studentResults = OmrResult::withoutGlobalScope(\App\Scopes\SeasonScope::class)
            ->whereIn('exam_id', $targetIds)->where('student_id', $studentId)->get();
        if ($studentResults->isEmpty()) return $this->error('Sonuç bulunamadı.', [], 404);

        $isMerged = count($targetIds) > 1;
        $courseScores = $this->aggregateStudentCourseScores($studentResults, $isMerged);
        $topicAnalysis = $this->portalCalculateTopicAnalysis($studentResults, $targetIds);
        
        $student = Student::withoutGlobalScope(\App\Scopes\SeasonScope::class)->find($studentId);
        [$studentClassAvg, $studentSchoolAvg] = $this->portalGetAverages($student, $targetIds, $isMerged);
        $agg = $this->portalBuildAggregatedResult($studentResults, null, $studentId, $targetIds);

        return $this->success($this->utf8izeMixed([
            'summary' => $summary, 'distribution' => $distribution, 'exam_class_averages' => $classAvgMap,
            'course_averages' => $courseAvg, 'course_distributions' => $courseDist,
            'merged_exam_ids' => $mergedIds, 'student' => $student,
            'result' => [
                'total_net' => round((float)$studentResults->sum('total_net'), 2),
                'total_point' => $agg['total_point'], 'rank' => $agg['rank'],
                'booklet_type' => $agg['booklet_type']
            ],
            'exam_summaries' => $this->buildStudentExamSummaries($studentResults, $targetIds),
            'course_scores' => collect($courseScores)->values(),
            'topic_analysis' => array_values($topicAnalysis),
            'exam_ids' => $validIds, 'is_merged' => $isMerged,
            'class_averages' => $studentClassAvg, 'school_averages' => $studentSchoolAvg,
        ]));
    }

    private function portalAnalyticsGetGlobalSummary($results): array
    {
        $nets = $results->pluck('total_net')->map(fn($v) => (float)$v)->toArray();
        return [
            'total_students' => count($nets),
            'avg_net' => count($nets) ? round(array_sum($nets) / count($nets), 2) : 0,
            'max_net' => count($nets) ? max($nets) : 0,
            'min_net' => count($nets) ? min($nets) : 0,
        ];
    }

    private function portalAnalyticsGetDistribution($results, float $binSize): array
    {
        $nets = $results->pluck('total_net')->map(fn($v) => (float)$v)->toArray();
        $bins = [];
        foreach ($nets as $net) {
            $idx = (int) floor($net / $binSize);
            $bins[$idx] = ($bins[$idx] ?? 0) + 1;
        }
        ksort($bins);
        $distribution = [];
        foreach ($bins as $idx => $count) {
            $distribution[] = [
                'start' => round($idx * $binSize, 2),
                'end' => round(($idx + 1) * $binSize, 2),
                'count' => $count,
            ];
        }
        return $distribution;
    }

    private function portalAnalyticsGetClassAverages($results): array
    {
        $avgs = [];
        foreach ($results->groupBy('student.classroom_id') as $cid => $rows) {
            $classNets = $rows->pluck('total_net')->map(fn($v) => (float)$v)->toArray();
            $avgs[] = [
                'classroom_id' => $cid,
                'classroom_name' => \App\Models\Classroom::find($cid)?->name ?? 'Bilinmeyen',
                'avg_net' => count($classNets) ? round(array_sum($classNets) / count($classNets), 2) : 0,
                'student_count' => count($classNets),
            ];
        }
        return collect($avgs)->sortBy('classroom_name')->values()->toArray();
    }

    /**
     * @suppress PHP6613
     */
    public function examSmsRecipients(Request $request, int $id): JsonResponse
    {
        try {
            if ($e = $this->ensureAccess()) return $e;

            $exam = OmrExam::where('tenant_id', $this->tenantId())
                ->with(['examCourses.course:id,name'])
                ->findOrFail($id);

            $rawMerged = $exam->merged_exam_ids;
            if (is_string($rawMerged)) {
                $rawMerged = json_decode($rawMerged, true);
            }
            $mergedIds = array_values(array_filter(array_map('intval', (array) ($rawMerged ?? []))));
            $targetExamIds = !empty($mergedIds) ? $mergedIds : [$id];

            $reqExamIds = $this->parseExamIdsFromRequest($request, $id);
            if (count($reqExamIds) > 1) {
                $targetExamIds = array_values(array_unique(array_merge($targetExamIds, $reqExamIds)));
            }

            // Build course headers map across all target exams
            $courseHeaders = [];
            $courseNameMap = [];
            $examCourses = OmrExamCourse::whereIn('exam_id', $targetExamIds)
                ->with(['course:id,name'])
                ->get();
            foreach ($examCourses as $ec) {
                $cName = $ec->course?->name ?? 'Ders';
                $shortName = $this->getCourseShortCode($cName);
                if (!isset($courseNameMap[$ec->course_id])) {
                    $courseHeaders[] = [
                        'course_id' => $ec->course_id,
                        'course_name' => $cName,
                        'short_name' => $shortName,
                    ];
                    $courseNameMap[$ec->course_id] = [
                        'name' => $cName,
                        'short' => $shortName,
                    ];
                }
            }

            $allRaw = OmrResult::whereIn('exam_id', $targetExamIds)
                ->with([
                    'student:id,name,school_no,classroom_id,phone',
                    'student.classroom:id,name',
                    'student.guardians'
                ])
                ->get();

            // Detect if results contain multiple rows per student (merged exam or multi-session)
            $hasDuplicates = $allRaw->groupBy(fn($r) => $r->student_id ?: ('no_' . $r->student_no))->contains(fn($rows) => $rows->count() > 1);

            if (!empty($mergedIds) || count($targetExamIds) > 1 || $hasDuplicates) {
                $combined = $allRaw->groupBy(fn($r) => $r->student_id ?: ('no_' . $r->student_no))->map(function ($rows) {
                    $first = $rows->first();
                    $courseAgg = [];
                    foreach ($rows as $r) {
                        foreach ((array) ($r->course_scores ?? []) as $cid => $s) {
                            $cid = (int) $cid;
                            if (!isset($courseAgg[$cid])) {
                                $courseAgg[$cid] = ['correct' => 0, 'wrong' => 0, 'blank' => 0, 'net' => 0.0, 'point' => 0.0];
                            }
                            $courseAgg[$cid]['correct'] += (int) ($s['correct'] ?? 0);
                            $courseAgg[$cid]['wrong']   += (int) ($s['wrong'] ?? 0);
                            $courseAgg[$cid]['blank']   += (int) ($s['blank'] ?? 0);
                            $courseAgg[$cid]['net']     += (float) ($s['net'] ?? 0);
                            $courseAgg[$cid]['point']   += (float) ($s['point'] ?? 0);
                        }
                    }
                    $totalNet   = array_sum(array_map(fn($v) => (float) ($v['net'] ?? 0), $courseAgg));
                    $totalPoint = array_sum(array_map(fn($v) => (float) ($v['point'] ?? 0), $courseAgg));
                    return (object) [
                        'id'           => (int) ($first?->id ?? 0),
                        'student_id'   => (int) ($first?->student_id ?? $first?->student?->id ?? 0),
                        'student_no'   => (string) ($first?->student_no ?? ''),
                        'booklet_type' => 'M',
                        'total_net'    => round($totalNet, 3),
                        'total_point'  => round($totalPoint, 3),
                        'rank'         => 0,
                        'course_scores'=> $courseAgg,
                        'student'      => $first?->student,
                    ];
                })->values();

                $sorted = $combined->sort(function ($a, $b) {
                    if (abs($a->total_point - $b->total_point) > 0.001) {
                        return $b->total_point <=> $a->total_point;
                    }
                    return $b->total_net <=> $a->total_net;
                })->values();

                $results = $sorted->map(function ($row, $idx) {
                    $row->rank = $idx + 1;
                    return $row;
                });
            } else {
                $results = $allRaw->sortBy('rank')->values();
            }

            $totalStudents = $results->count();

            $studentsData = [];
            foreach ($results as $r) {
                $student = $r->student;
                if (!$student) continue;

                $totalCorrect = 0;
                $totalWrong = 0;
                $totalBlank = 0;
                $courseSummaryParts = [];
                $scoresMap = [];

                foreach ((array)($r->course_scores ?? []) as $cid => $cs) {
                    $cid = (int)$cid;
                    $corr = (int)($cs['correct'] ?? 0);
                    $wrng = (int)($cs['wrong'] ?? 0);
                    $blnk = (int)($cs['blank'] ?? 0);
                    $net  = (float)($cs['net'] ?? 0);

                    $totalCorrect += $corr;
                    $totalWrong   += $wrng;
                    $totalBlank   += $blnk;

                    $cShort = $courseNameMap[$cid]['short'] ?? ($courseNameMap[$cid]['name'] ?? "Ders {$cid}");
                    $cFullName = $courseNameMap[$cid]['name'] ?? $cShort;

                    $courseSummaryParts[] = "{$cShort}: {$corr}D {$wrng}Y";

                    $scoresMap[$cid] = [
                        'name' => $cFullName,
                        'short' => $cShort,
                        'correct' => $corr,
                        'wrong' => $wrng,
                        'blank' => $blnk,
                        'net' => $net,
                    ];
                }

                $guardiansList = [];
                $primaryGuardian = null;

                if ($student->guardians && $student->guardians->isNotEmpty()) {
                    foreach ($student->guardians as $g) {
                        $rel = $g->pivot?->relation_type ?? 'veli';
                        $relLabel = match(mb_strtolower($rel)) {
                            'mother', 'anne' => 'Anne',
                            'father', 'baba' => 'Baba',
                            'guardian', 'vasi' => 'Vasi',
                            default => 'Veli'
                        };
                        $rawGPhone = !empty($g->phone) ? (string)$g->phone : '';
                        $normPhone = !empty($rawGPhone) ? ScheduledSms::validateAndNormalizePhone($rawGPhone) : null;
                        $gInfo = [
                            'id' => $g->id,
                            'name' => $g->name ?? '',
                            'phone' => $normPhone ?: $rawGPhone,
                            'is_valid' => $normPhone !== null,
                            'relation' => $relLabel,
                            'is_legal' => (bool)($g->pivot?->is_legal_guardian ?? false),
                        ];
                        $guardiansList[] = $gInfo;

                        if (!$primaryGuardian && $normPhone !== null) {
                            $primaryGuardian = $gInfo;
                        }
                    }
                }

                // Fallback to student phone if no guardian has valid phone
                $rawSPhone = !empty($student->phone) ? (string)$student->phone : '';
                $studentPhone = !empty($rawSPhone) ? (ScheduledSms::validateAndNormalizePhone($rawSPhone) ?? $rawSPhone) : '';
                if (!$primaryGuardian && !empty($studentPhone)) {
                    $primaryGuardian = [
                        'id' => null,
                        'name' => 'Öğrenci',
                        'phone' => $studentPhone,
                        'is_valid' => ScheduledSms::validateAndNormalizePhone($studentPhone) !== null,
                        'relation' => 'Öğrenci',
                        'is_legal' => false,
                    ];
                }

                $hasValidGuardian = collect($guardiansList)->contains(fn($g) => !empty($g['is_valid']));
                $hasValidStudentPhone = !empty($studentPhone) && ScheduledSms::validateAndNormalizePhone($studentPhone) !== null;

                $studentsData[] = [
                    'student_id' => $student->id,
                    'result_id' => $r->id,
                    'name' => $student->name,
                    'school_no' => $student->school_no,
                    'classroom_id' => $student->classroom_id,
                    'classroom_name' => $student->classroom?->name ?? '-',
                    'rank' => (int)($r->rank ?? 0),
                    'total_net' => (float)($r->total_net ?? 0),
                    'total_point' => (float)($r->total_point ?? 0),
                    'total_correct' => $totalCorrect,
                    'total_wrong' => $totalWrong,
                    'total_blank' => $totalBlank,
                    'course_summary_str' => implode(' | ', $courseSummaryParts),
                    'course_scores' => $scoresMap,
                    'student_phone' => $studentPhone,
                    'guardians' => $guardiansList,
                    'primary_guardian' => $primaryGuardian,
                    'has_valid_phone' => $hasValidGuardian || $hasValidStudentPhone,
                ];
            }

            // SMS settings / credit info
            $tenantId = $this->tenantId();
            $settings = [];
            try {
                if ($tenantId) {
                    $settings = DB::table('settings')
                        ->where('tenant_id', $tenantId)
                        ->whereIn('key', ['iletibilgi_username', 'iletibilgi_password', 'iletibilgi_sender', 'iletibilgi_base_url', 'iletibilgi_enabled'])
                        ->pluck('value', 'key')
                        ->toArray();
                }
            } catch (\Throwable $e) {}

            $sender = $settings['iletibilgi_sender'] ?? config('sms.iletibilgi.sender') ?? 'AK IRFAN';
            $enabled = ($settings['iletibilgi_enabled'] ?? '1') === '1' || ($settings['iletibilgi_enabled'] ?? 'true') === 'true';

            return $this->success([
                'exam' => [
                    'id' => $exam->id,
                    'name' => $exam->name,
                    'exam_date' => $exam->exam_date,
                    'is_merged' => !empty($mergedIds),
                ],
                'total_students' => $totalStudents,
                'courses' => $courseHeaders,
                'students' => $studentsData,
                'sms_config' => [
                    'sender' => $sender,
                    'enabled' => $enabled,
                ],
            ]);
        } catch (\Throwable $e) {
            Log::error('OmrController::examSmsRecipients error', [
                'exam_id' => $id,
                'error' => $e->getMessage(),
                'trace' => $e->getTraceAsString(),
            ]);
            return $this->error('Sınav alıcıları listelenirken hata oluştu: ' . $e->getMessage(), [], 500);
        }
    }

    /**
     * @suppress PHP6613
     */
    public function sendExamSms(Request $request, int $id): JsonResponse
    {
        try {
            if ($e = $this->ensureAccess()) return $e;

            $exam = OmrExam::where('tenant_id', $this->tenantId())
                ->with(['examCourses.course:id,name'])
                ->findOrFail($id);

            $validated = $request->validate([
                'title' => 'nullable|string|max:100',
                'template' => 'required|string|min:5|max:1000',
                'recipient_target' => 'nullable|string|in:primary_guardian,all_guardians,student',
                'selected_student_ids' => 'nullable|array',
                'selected_student_ids.*' => 'integer',
            ]);

            $recipientTarget = $validated['recipient_target'] ?? 'primary_guardian';
            $template = $validated['template'];
            $title = !empty($validated['title']) ? trim($validated['title']) : ($exam->name . ' Sınav Sonuçları');

            $rawMerged = $exam->merged_exam_ids;
            if (is_string($rawMerged)) {
                $rawMerged = json_decode($rawMerged, true);
            }
            $mergedIds = array_values(array_filter(array_map('intval', (array) ($rawMerged ?? []))));
            $targetExamIds = !empty($mergedIds) ? $mergedIds : [$id];

            $reqExamIds = $this->parseExamIdsFromRequest($request, $id);
            if (count($reqExamIds) > 1) {
                $targetExamIds = array_values(array_unique(array_merge($targetExamIds, $reqExamIds)));
            }

            // Build course map across all target exams
            $courseNameMap = [];
            $examCourses = OmrExamCourse::whereIn('exam_id', $targetExamIds)
                ->with(['course:id,name'])
                ->get();
            foreach ($examCourses as $ec) {
                $cName = $ec->course?->name ?? 'Ders';
                $shortName = $this->getCourseShortCode($cName);
                if (!isset($courseNameMap[$ec->course_id])) {
                    $courseNameMap[$ec->course_id] = [
                        'name' => $cName,
                        'short' => $shortName,
                    ];
                }
            }

            $allRaw = OmrResult::whereIn('exam_id', $targetExamIds)
                ->with([
                    'student:id,name,school_no,classroom_id,phone',
                    'student.classroom:id,name',
                    'student.guardians'
                ])
                ->get();

            $hasDuplicates = $allRaw->groupBy(fn($r) => $r->student_id ?: ('no_' . $r->student_no))->contains(fn($rows) => $rows->count() > 1);

            if (!empty($mergedIds) || count($targetExamIds) > 1 || $hasDuplicates) {
                $combined = $allRaw->groupBy(fn($r) => $r->student_id ?: ('no_' . $r->student_no))->map(function ($rows) {
                    $first = $rows->first();
                    $courseAgg = [];
                    foreach ($rows as $r) {
                        foreach ((array) ($r->course_scores ?? []) as $cid => $s) {
                            $cid = (int) $cid;
                            if (!isset($courseAgg[$cid])) {
                                $courseAgg[$cid] = ['correct' => 0, 'wrong' => 0, 'blank' => 0, 'net' => 0.0, 'point' => 0.0];
                            }
                            $courseAgg[$cid]['correct'] += (int) ($s['correct'] ?? 0);
                            $courseAgg[$cid]['wrong']   += (int) ($s['wrong'] ?? 0);
                            $courseAgg[$cid]['blank']   += (int) ($s['blank'] ?? 0);
                            $courseAgg[$cid]['net']     += (float) ($s['net'] ?? 0);
                            $courseAgg[$cid]['point']   += (float) ($s['point'] ?? 0);
                        }
                    }
                    $totalNet   = array_sum(array_map(fn($v) => (float) ($v['net'] ?? 0), $courseAgg));
                    $totalPoint = array_sum(array_map(fn($v) => (float) ($v['point'] ?? 0), $courseAgg));
                    return (object) [
                        'id'           => (int) ($first?->id ?? 0),
                        'student_id'   => (int) ($first?->student_id ?? $first?->student?->id ?? 0),
                        'student_no'   => (string) ($first?->student_no ?? ''),
                        'booklet_type' => 'M',
                        'total_net'    => round($totalNet, 3),
                        'total_point'  => round($totalPoint, 3),
                        'rank'         => 0,
                        'course_scores'=> $courseAgg,
                        'student'      => $first?->student,
                    ];
                })->values();

                $sorted = $combined->sort(function ($a, $b) {
                    if (abs($a->total_point - $b->total_point) > 0.001) {
                        return $b->total_point <=> $a->total_point;
                    }
                    return $b->total_net <=> $a->total_net;
                })->values();

                $allRanked = $sorted->map(function ($row, $idx) {
                    $row->rank = $idx + 1;
                    return $row;
                });
            } else {
                $allRanked = $allRaw->sortBy('rank')->values();
            }

            $totalInExam = $allRanked->count();

            // Filter to selected students if specified
            if (!empty($validated['selected_student_ids'])) {
                $selectedSet = array_map('intval', $validated['selected_student_ids']);
                $results = $allRanked->filter(fn($r) => in_array((int)$r->student_id, $selectedSet));
            } else {
                $results = $allRanked;
            }

            // Build list of messages to send
            $smsQueue = [];

            foreach ($results as $r) {
                $student = $r->student;
                if (!$student) continue;

                $totalCorrect = 0; $totalWrong = 0; $totalBlank = 0;
                $courseParts = [];
                $courseDetailMap = [];

                foreach ((array)($r->course_scores ?? []) as $cid => $cs) {
                    $cid = (int)$cid;
                    $corr = (int)($cs['correct'] ?? 0);
                    $wrng = (int)($cs['wrong'] ?? 0);
                    $blnk = (int)($cs['blank'] ?? 0);
                    $net  = (float)($cs['net'] ?? 0);

                    $totalCorrect += $corr;
                    $totalWrong   += $wrng;
                    $totalBlank   += $blnk;

                    $cShort = $courseNameMap[$cid]['short'] ?? "Ders {$cid}";
                    $cFullName = $courseNameMap[$cid]['name'] ?? $cShort;

                    $courseParts[] = "{$cShort}: {$corr}D {$wrng}Y";
                    $detailStr = "{$cShort}: {$corr}D {$wrng}Y";

                    $courseDetailMap[mb_strtolower($cShort, 'UTF-8')] = $detailStr;
                    $courseDetailMap[mb_strtolower($cFullName, 'UTF-8')] = $detailStr;
                }

                $allCoursesStr = implode(' | ', $courseParts);

                // Determine target recipients (phone numbers + names)
                $recipients = [];
                if ($recipientTarget === 'student') {
                    if (!empty($student->phone)) {
                        $norm = ScheduledSms::validateAndNormalizePhone($student->phone);
                        if ($norm) {
                            $recipients[] = ['phone' => $norm, 'name' => $student->name, 'type' => 'student'];
                        }
                    }
                } elseif ($recipientTarget === 'all_guardians') {
                    $hasGuardian = false;
                    $seenPhones = [];
                    if ($student->guardians && $student->guardians->isNotEmpty()) {
                        foreach ($student->guardians as $g) {
                            if (!empty($g->phone)) {
                                $norm = ScheduledSms::validateAndNormalizePhone($g->phone);
                                if ($norm && !in_array($norm, $seenPhones)) {
                                    $seenPhones[] = $norm;
                                    $recipients[] = ['phone' => $norm, 'name' => $g->name, 'type' => 'guardian'];
                                    $hasGuardian = true;
                                }
                            }
                        }
                    }
                    if (!$hasGuardian && !empty($student->phone)) {
                        $norm = ScheduledSms::validateAndNormalizePhone($student->phone);
                        if ($norm) {
                            $recipients[] = ['phone' => $norm, 'name' => $student->name, 'type' => 'student'];
                        }
                    }
                } else {
                    // primary_guardian
                    $found = false;
                    if ($student->guardians && $student->guardians->isNotEmpty()) {
                        foreach ($student->guardians as $g) {
                            if (!empty($g->phone)) {
                                $norm = ScheduledSms::validateAndNormalizePhone($g->phone);
                                if ($norm) {
                                    $recipients[] = ['phone' => $norm, 'name' => $g->name, 'type' => 'guardian'];
                                    $found = true;
                                    break;
                                }
                            }
                        }
                    }
                    if (!$found && !empty($student->phone)) {
                        $norm = ScheduledSms::validateAndNormalizePhone($student->phone);
                        if ($norm) {
                            $recipients[] = ['phone' => $norm, 'name' => $student->name, 'type' => 'student'];
                        }
                    }
                }


                foreach ($recipients as $rec) {
                    // Render message
                    $msg = $template;
                    $msg = str_replace('{ogrenci_adi}', $student->name, $msg);
                    $msg = str_replace('{veli_adi}', $rec['name'] ?: 'Velimiz', $msg);
                    $msg = str_replace('{sinav_adi}', $exam->name, $msg);
                    $msg = str_replace('{sinif}', $student->classroom?->name ?? '', $msg);
                    $msg = str_replace('{derece}', (string)($r->rank ?? 0), $msg);
                    $msg = str_replace('{toplam_katilim}', (string)$totalInExam, $msg);
                    $msg = str_replace('{toplam_dogru}', (string)$totalCorrect, $msg);
                    $msg = str_replace('{toplam_yanlis}', (string)$totalWrong, $msg);
                    $msg = str_replace('{toplam_bos}', (string)$totalBlank, $msg);
                    $msg = str_replace('{toplam_net}', number_format((float)($r->total_net ?? 0), 2), $msg);
                    $msg = str_replace('{puan}', number_format((float)($r->total_point ?? 0), 2), $msg);
                    $msg = str_replace('{ders_dagilimi}', $allCoursesStr, $msg);

                    // Specific course replacements: {ders:Din}, {Din}, {ders:Matematik}, etc.
                    foreach ($courseDetailMap as $cKey => $cVal) {
                        $msg = str_ireplace("{ders:{$cKey}}", $cVal, $msg);
                        $msg = str_ireplace("{{$cKey}}", $cVal, $msg);
                    }
                    // Clean up any unreplaced {ders:...} tokens
                    $msg = preg_replace('/\{ders:[^}]+\}/iu', '', $msg);

                    $smsQueue[] = [
                        'phone' => $rec['phone'],
                        'message' => trim($msg),
                        'student_id' => $student->id,
                        'guardian_name' => $rec['name'],
                    ];
                }
            }

            if (empty($smsQueue)) {
                return $this->error('Seçilen öğrencilere ait geçerli telefon numarası bulunamadı.', [], 400);
            }

            $tenantId = $this->tenantId();
            $user = auth()->user();
            $allPhones = array_values(array_unique(array_column($smsQueue, 'phone')));
            $allStudentIds = array_values(array_unique(array_column($smsQueue, 'student_id')));

            // 1. Create ScheduledSms record so it shows in SMS History (/sms/history)
            $scheduledSms = ScheduledSms::create([
                'tenant_id' => $tenantId,
                'title' => $title,
                'message' => $template,
                'recipient_phones' => $allPhones,
                'recipient_type' => 'Sınav Sonuçları',
                'recipient_ids' => $allStudentIds,
                'scheduled_at' => now('Europe/Istanbul')->format('Y-m-d H:i:s'),
                'status' => 'processing',
                'created_by' => $user->id,
            ]);

            // 2. Resolve SMS provider
            $settings = [];
            try {
                if ($tenantId) {
                    $settings = DB::table('settings')
                        ->where('tenant_id', $tenantId)
                        ->whereIn('key', ['iletibilgi_username', 'iletibilgi_password', 'iletibilgi_sender', 'iletibilgi_base_url'])
                        ->pluck('value', 'key')
                        ->toArray();
                }
            } catch (\Throwable $e) {}

            if (empty($settings['iletibilgi_username']) && (int)$tenantId === 1) {
                try {
                    $fallbackSettings = DB::table('settings')
                        ->whereNull('tenant_id')
                        ->whereIn('key', ['iletibilgi_username', 'iletibilgi_password', 'iletibilgi_sender', 'iletibilgi_base_url'])
                        ->whereNotNull('value')
                        ->where('value', '!=', '')
                        ->pluck('value', 'key')
                        ->toArray();
                    $settings = array_merge($fallbackSettings, array_filter($settings));
                } catch (\Throwable $e) {}
            }

            $username = $settings['iletibilgi_username'] ?? '';
            $password = $settings['iletibilgi_password'] ?? '';
            $sender   = $settings['iletibilgi_sender']   ?? ((int)$tenantId === 1 ? 'AK IRFAN' : '');
            $baseUrl  = $settings['iletibilgi_base_url']  ?? 'https://panel.iletibilgi.com.tr:9588';

            $sentCount = 0;
            $failedCount = 0;

            if (empty($username) || empty($password)) {
                foreach ($smsQueue as $item) {
                    SmsReport::create([
                        'tenant_id' => $tenantId,
                        'phone' => $item['phone'],
                        'message' => $item['message'],
                        'status' => 'failed',
                        'error_message' => 'SMS API kullanıcı adı veya şifresi veritabanında bulunamadı.',
                        'sender_type' => 'scheduled_sms',
                        'sender_id' => $scheduledSms->id,
                        'created_by' => $user->id,
                    ]);
                    $failedCount++;
                }
                $scheduledSms->markAsFailed('SMS API kullanıcı adı veya şifresi yapılandırılmamış.');
                $scheduledSms->update(['sent_count' => 0, 'failed_count' => $failedCount]);

                return $this->error('SMS API ayarları bulunamadı. Lütfen SMS API Ayarlarını kontrol ediniz.', [], 400);
            }

            $smsService = new IletibilgiService($username, $password, $sender, $baseUrl);

            // Send via dynamic SMS
            $dynamicResult = $smsService->sendDynamic($smsQueue, $title);

            if ($dynamicResult['success']) {
                $pkgId = $dynamicResult['message_id'] ?? null;
                foreach ($smsQueue as $item) {
                    SmsReport::create([
                        'tenant_id' => $tenantId,
                        'phone' => $item['phone'],
                        'message' => $item['message'],
                        'status' => 'sent',
                        'message_id' => $pkgId,
                        'sent_at' => now(),
                        'sender_type' => 'scheduled_sms',
                        'sender_id' => $scheduledSms->id,
                        'created_by' => $user->id,
                    ]);
                    $sentCount++;
                }
                $scheduledSms->markAsSent($sentCount, 0);
            } else {
                $errorMsg = $dynamicResult['message'] ?? 'SMS gönderimi başarısız oldu.';
                foreach ($smsQueue as $item) {
                    SmsReport::create([
                        'tenant_id' => $tenantId,
                        'phone' => $item['phone'],
                        'message' => $item['message'],
                        'status' => 'failed',
                        'error_message' => $errorMsg,
                        'sender_type' => 'scheduled_sms',
                        'sender_id' => $scheduledSms->id,
                        'created_by' => $user->id,
                    ]);
                    $failedCount++;
                }
                $scheduledSms->markAsFailed($errorMsg);
                $scheduledSms->update(['sent_count' => 0, 'failed_count' => $failedCount]);

                return $this->error('SMS gönderimi sırasında hata oluştu: ' . $errorMsg, [
                    'scheduled_sms_id' => $scheduledSms->id,
                    'sent_count' => 0,
                    'failed_count' => $failedCount,
                ], 400);
            }

            return $this->success([
                'scheduled_sms_id' => $scheduledSms->id,
                'sent_count' => $sentCount,
                'failed_count' => $failedCount,
                'total' => count($smsQueue),
            ], "{$sentCount} alıcıya sınav sonuç SMS'i başarıyla gönderildi ve SMS Geçmişine kaydedildi.");
        } catch (\Throwable $e) {
            Log::error('OmrController::sendExamSms error', [
                'exam_id' => $id,
                'error' => $e->getMessage(),
                'trace' => $e->getTraceAsString(),
            ]);
            return $this->error('SMS gönderimi sırasında beklenmeyen bir hata oluştu: ' . $e->getMessage(), [], 500);
        }
    }

    private function getCourseShortCode(string $name): string
    {
        $lower = mb_strtolower(trim($name), 'UTF-8');
        if (str_contains($lower, 'türkçe') || str_contains($lower, 'turkce')) return 'Tr';
        if (str_contains($lower, 'matematik') || str_contains($lower, 'geometri')) return 'Mat';
        if (str_contains($lower, 'fen')) return 'Fen';
        if (str_contains($lower, 'inkılap') || str_contains($lower, 'inkilap') || str_contains($lower, 'tarih')) return 'İnk';
        if (str_contains($lower, 'din')) return 'Din';
        if (str_contains($lower, 'ingilizce') || str_contains($lower, 'yabancı')) return 'İng';
        if (str_contains($lower, 'sosyal')) return 'Sos';
        if (str_contains($lower, 'fizik')) return 'Fiz';
        if (str_contains($lower, 'kimya')) return 'Kim';
        if (str_contains($lower, 'biyoloji')) return 'Biy';
        if (str_contains($lower, 'coğrafya')) return 'Coğ';
        if (str_contains($lower, 'felsefe')) return 'Fel';
        return mb_substr($name, 0, 4, 'UTF-8');
    }
}
