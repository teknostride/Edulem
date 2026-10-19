<?php

namespace App\Actions;

use App\Models\ScholarshipExam;
use App\Models\ScholarshipExamApplication;
use App\Services\ActivityLogService;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\DB;

class CreateScholarshipExamApplicationAction
{
    protected ActivityLogService $activityLogService;

    public function __construct(ActivityLogService $activityLogService)
    {
        $this->activityLogService = $activityLogService;
    }

    /**
     * Execute the action to create a scholarship exam application.
     *
     * @param  array  $applicationData
     * @return \App\Models\ScholarshipExamApplication
     * @throws \Exception
     */
    public function execute(array $applicationData): ScholarshipExamApplication
    {
        return DB::transaction(function () use ($applicationData) {
            $exam = ScholarshipExam::findOrFail($applicationData['scholarship_exam_id']);

            // Sınav açık mı kontrol et
            if (!$exam->isOpen()) {
                throw new \Exception('Sınav başvurulara açık değil.');
            }

            // Duplicate kontrolü
            if (!empty($applicationData['student_id'])) {
                $existing = ScholarshipExamApplication::where('scholarship_exam_id', $exam->id)
                    ->where('student_id', $applicationData['student_id'])
                    ->first();

                if ($existing) {
                    throw new \Exception('Bu öğrenci için zaten başvuru yapılmış.');
                }
            }

            $application = ScholarshipExamApplication::create([
                'scholarship_exam_id' => $exam->id,
                'student_id' => $applicationData['student_id'] ?? null,
                'name' => $applicationData['name'],
                'phone' => $applicationData['phone'],
                'email' => $applicationData['email'] ?? null,
                'birth_date' => $applicationData['birth_date'] ?? null,
                'tc_identity_number' => $applicationData['tc_identity_number'] ?? null,
                'school_name' => $applicationData['school_name'] ?? null,
                'grade_level' => $applicationData['grade_level'] ?? null,
                'branch_id' => $applicationData['branch_id'] ?? null,
                'session_id' => $applicationData['session_id'] ?? null,
                'session_time' => $applicationData['session_time'] ?? null,
                'security_code' => $applicationData['security_code'] ?? null,
                'additional_data' => $applicationData['additional_data'] ?? null,
                'status' => 'pending',
            ]);

            // Activity log
            $this->activityLogService->logCreate($application);

            // İlişkileri yükle
            $application->load(['scholarshipExam', 'student', 'lead']);

            return $application;
        });
    }
}
