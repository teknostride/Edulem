<?php

namespace App\Services;

use App\Models\Exam;
use App\Models\Grade;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;

class OpticalFormService
{
    /**
     * Process optical form file and create grades.
     *
     * @param  \App\Models\Exam  $exam
     * @param  array  $formData  // {student_id: {answers: [...], score: ...}}
     * @return array
     * @throws \Exception
     */
    public function processOpticalForm(Exam $exam, array $formData): array
    {
        return DB::transaction(function () use ($exam, $formData) {
            $processed = 0;
            $errors = [];

            foreach ($formData as $studentId => $data) {
                try {
                    // Öğrenci kontrolü
                    $student = \App\Models\Student::find($studentId);
                    if (!$student || $student->tenant_id !== $exam->tenant_id) {
                        $errors[] = "Öğrenci ID {$studentId} bulunamadı veya erişim yetkisi yok.";
                        continue;
                    }

                    // Daha önce not var mı kontrol et
                    $existingGrade = Grade::where('exam_id', $exam->id)
                        ->where('student_id', $studentId)
                        ->first();

                    if ($existingGrade) {
                        // Mevcut notu güncelle
                        $score = $data['score'] ?? 0;
                        $existingGrade->update([
                            'score' => $score,
                            'grade' => $score, // score'u grade'e de kopyala
                            'answers' => $data['answers'] ?? $existingGrade->answers,
                        ]);
                        $processed++;
                    } else {
                        // Yeni not oluştur
                        $score = $data['score'] ?? 0;
                        Grade::create([
                            'tenant_id' => $exam->tenant_id,
                            'exam_id' => $exam->id,
                            'student_id' => $studentId,
                            'teacher_id' => \Illuminate\Support\Facades\Auth::id(), // Optik form işleyen kullanıcı
                            'score' => $score,
                            'grade' => $score, // score'u grade'e de kopyala
                            'answers' => $data['answers'] ?? null,
                        ]);
                        $processed++;
                    }
                } catch (\Exception $e) {
                    $errors[] = "Öğrenci ID {$studentId} işlenirken hata: " . $e->getMessage();
                    Log::error("Optical form processing error for student {$studentId}: " . $e->getMessage());
                }
            }

            // Sınav durumunu güncelle
            $exam->update([
                'optical_form_status' => empty($errors) ? 'processed' : 'error',
                'optical_form_notes' => empty($errors) 
                    ? "{$processed} öğrenci başarıyla işlendi." 
                    : "{$processed} öğrenci işlendi. Hatalar: " . implode(', ', $errors),
            ]);

            return [
                'processed' => $processed,
                'errors' => $errors,
                'status' => empty($errors) ? 'success' : 'partial',
            ];
        });
    }

    /**
     * Upload optical form file.
     *
     * @param  \App\Models\Exam  $exam
     * @param  int  $fileId
     * @return void
     */
    public function uploadOpticalForm(Exam $exam, int $fileId): void
    {
        $exam->update([
            'optical_form_file_id' => $fileId,
            'optical_form_status' => 'uploaded',
        ]);
    }
}
