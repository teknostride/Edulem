<?php

namespace App\Actions;

use App\Models\Homework;
use App\Models\HomeworkStudentAssignment;
use App\Models\HomeworkSubmission;
use App\Services\ActivityLogService;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\DB;

class CreateHomeworkSubmissionAction
{
    protected ActivityLogService $activityLogService;

    public function __construct(ActivityLogService $activityLogService)
    {
        $this->activityLogService = $activityLogService;
    }

    /**
     * Execute the action to create a homework submission.
     *
     * @param  array  $submissionData
     * @return \App\Models\HomeworkSubmission
     * @throws \Exception
     */
    public function execute(array $submissionData): HomeworkSubmission
    {
        return DB::transaction(function () use ($submissionData) {
            $homework = Homework::findOrFail($submissionData['homework_id']);
            $studentId = $submissionData['student_id'] ?? null;

            if (!$studentId) {
                throw new \Exception('Öğrenci ID zorunludur.');
            }

            // Öğrenci kontrolü (sadece kendi ödevini gönderebilir)
            $student = \App\Models\Student::findOrFail($studentId);
            if ($student->tenant_id !== Auth::user()->tenant_id) {
                throw new \Exception('Bu öğrenciye erişim yetkiniz bulunmamaktadır.');
            }

            $isAssigned = HomeworkStudentAssignment::query()
                ->where('homework_id', $homework->id)
                ->where('student_id', $studentId)
                ->exists();

            if (! $isAssigned) {
                throw new \Exception('Bu ödev size atanmadığı için gönderim yapamazsınız.');
            }

            // Daha önce gönderim var mı kontrol et
            $existingSubmission = HomeworkSubmission::where('homework_id', $homework->id)
                ->where('student_id', $studentId)
                ->first();

            if ($existingSubmission) {
                throw new \Exception('Bu ödev için zaten bir gönderim yapılmış.');
            }

            // Ödev türüne göre veri kontrolü
            if ($homework->is_online && empty($submissionData['answers'])) {
                throw new \Exception('Online ödev için cevaplar zorunludur.');
            }

            if (!$homework->is_online && !$homework->is_project && empty($submissionData['file_id'])) {
                throw new \Exception('Dosya ödevi için dosya yüklemesi zorunludur.');
            }

            if ($homework->is_project && empty($submissionData['project_topic_id'])) {
                throw new \Exception('Proje ödevi için konu seçimi zorunludur.');
            }

            $submission = HomeworkSubmission::create([
                'tenant_id' => Auth::user()->tenant_id,
                'homework_id' => $homework->id,
                'student_id' => $studentId,
                'answers' => $submissionData['answers'] ?? null,
                'file_id' => $submissionData['file_id'] ?? null,
                'project_topic_id' => $submissionData['project_topic_id'] ?? null,
                'status' => 'submitted',
                'submitted_at' => now(),
            ]);

            $this->activityLogService->logCreate($submission);

            // İlişkileri yükle
            $submission->load(['homework', 'student', 'file']);

            return $submission;
        });
    }
}
