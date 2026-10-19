<?php

namespace App\Actions;

use App\Models\HomeworkSubmission;
use App\Services\ActivityLogService;
use Illuminate\Support\Facades\DB;

class UpdateHomeworkSubmissionAction
{
    protected ActivityLogService $activityLogService;

    public function __construct(ActivityLogService $activityLogService)
    {
        $this->activityLogService = $activityLogService;
    }

    /**
     * Execute the action to update a homework submission (grading).
     *
     * @param  \App\Models\HomeworkSubmission  $submission
     * @param  array  $submissionData
     * @return \App\Models\HomeworkSubmission
     * @throws \Exception
     */
    public function execute(HomeworkSubmission $submission, array $submissionData): HomeworkSubmission
    {
        return DB::transaction(function () use ($submission, $submissionData) {
            $updateData = [];

            if (isset($submissionData['score'])) {
                $updateData['score'] = $submissionData['score'];
            }

            if (isset($submissionData['teacher_notes'])) {
                $updateData['teacher_notes'] = $submissionData['teacher_notes'];
            }

            if (isset($submissionData['status'])) {
                $updateData['status'] = $submissionData['status'];
                
                if ($submissionData['status'] === 'graded' && !$submission->graded_at) {
                    $updateData['graded_at'] = now();
                }
            }

            $submission->update($updateData);

            $this->activityLogService->logUpdate($submission);

            // İlişkileri yükle
            $submission->load(['homework', 'student', 'file']);

            return $submission;
        });
    }
}
