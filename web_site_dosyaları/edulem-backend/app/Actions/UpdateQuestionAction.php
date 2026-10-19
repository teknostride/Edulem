<?php

namespace App\Actions;

use App\Models\Question;
use App\Services\ActivityLogService;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\DB;

class UpdateQuestionAction
{
    protected ActivityLogService $activityLogService;

    public function __construct(ActivityLogService $activityLogService)
    {
        $this->activityLogService = $activityLogService;
    }

    /**
     * Execute the action to update a question record.
     *
     * @param  \App\Models\Question  $question
     * @param  array  $questionData
     * @return \App\Models\Question
     * @throws \Exception
     */
    public function execute(Question $question, array $questionData): Question
    {
        return DB::transaction(function () use ($question, $questionData) {
            // Eğer response ekleniyorsa, responded_by ve responded_at'i güncelle
            if (isset($questionData['response']) && !empty($questionData['response'])) {
                $questionData['responded_by'] = Auth::id();
                $questionData['responded_at'] = now();
                // Status'u otomatik olarak 'resolved' yap
                if (!isset($questionData['status'])) {
                    $questionData['status'] = 'resolved';
                }
            }

            $question->update([
                'subject' => $questionData['subject'] ?? $question->subject,
                'message' => $questionData['message'] ?? $question->message,
                'status' => $questionData['status'] ?? $question->status,
                'assigned_to' => $questionData['assigned_to'] ?? $question->assigned_to,
                'response' => $questionData['response'] ?? $question->response,
                'responded_by' => $questionData['responded_by'] ?? $question->responded_by,
                'responded_at' => $questionData['responded_at'] ?? $question->responded_at,
            ]);

            $this->activityLogService->logUpdate($question);

            // İlişkileri yükle
            $question->load(['student', 'guardian', 'assignedUser', 'respondedBy']);

            return $question;
        });
    }
}
