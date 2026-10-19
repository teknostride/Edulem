<?php

namespace App\Actions;

use App\Models\ScholarshipExam;
use App\Services\ActivityLogService;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\DB;

class CreateScholarshipExamAction
{
    protected ActivityLogService $activityLogService;

    public function __construct(ActivityLogService $activityLogService)
    {
        $this->activityLogService = $activityLogService;
    }

    /**
     * Execute the action to create a scholarship exam.
     *
     * @param  array  $examData
     * @return \App\Models\ScholarshipExam
     * @throws \Exception
     */
    public function execute(array $examData): ScholarshipExam
    {
        return DB::transaction(function () use ($examData) {
            $exam = ScholarshipExam::create([
                'title' => $examData['title'],
                'description' => $examData['description'] ?? null,
                'exam_date' => $examData['exam_date'],
                'exam_time' => $examData['exam_time'],
                'duration_minutes' => $examData['duration_minutes'],
                'sessions' => $examData['sessions'] ?? null,
                'required_fields' => $examData['required_fields'] ?? null,
                'optional_fields' => $examData['optional_fields'] ?? null,
                'exam_specification_file_id' => $examData['exam_specification_file_id'] ?? null,
                'scholarship_amount' => $examData['scholarship_amount'] ?? null,
                'registration_fee' => $examData['registration_fee'] ?? 0,
                'auto_register_students' => $examData['auto_register_students'] ?? false,
                'auto_register_to_leads' => $examData['auto_register_to_leads'] ?? true,
                'multi_branch_application' => $examData['multi_branch_application'] ?? false,
                'branch_ids' => $examData['branch_ids'] ?? null,
                'require_security_code' => $examData['require_security_code'] ?? true,
                'security_code' => $examData['security_code'] ?? null,
                'show_results_online' => $examData['show_results_online'] ?? true,
                'results_publish_date' => $examData['results_publish_date'] ?? null,
                'status' => $examData['status'] ?? 'draft',
                'created_by' => Auth::id(),
            ]);

            // Activity log
            $this->activityLogService->logCreate($exam);

            // İlişkileri yükle
            $exam->load(['creator', 'examSpecificationFile']);

            return $exam;
        });
    }
}
