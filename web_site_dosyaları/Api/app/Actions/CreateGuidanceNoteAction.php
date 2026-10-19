<?php

namespace App\Actions;

use App\Models\GuidanceNote;
use App\Services\ActivityLogService;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\DB;

class CreateGuidanceNoteAction
{
    protected ActivityLogService $activityLogService;

    public function __construct(ActivityLogService $activityLogService)
    {
        $this->activityLogService = $activityLogService;
    }

    /**
     * Execute the action to create a guidance note.
     *
     * @param  array  $noteData
     * @return \App\Models\GuidanceNote
     * @throws \Exception
     */
    public function execute(array $noteData): GuidanceNote
    {
        return DB::transaction(function () use ($noteData) {
            $note = GuidanceNote::create([
                'student_id' => $noteData['student_id'],
                'counselor_id' => $noteData['counselor_id'],
                'appointment_id' => $noteData['appointment_id'] ?? null,
                'title' => $noteData['title'] ?? null,
                'content' => $noteData['content'],
                'type' => $noteData['type'] ?? 'meeting',
                'note_date' => $noteData['note_date'],
                'note_time' => $noteData['note_time'] ?? null,
                'is_visible_to_guardian' => $noteData['is_visible_to_guardian'] ?? true,
                'is_confidential' => $noteData['is_confidential'] ?? false,
                'requires_admin_review' => $noteData['requires_admin_review'] ?? false,
                'tags' => $noteData['tags'] ?? null,
                'attachments' => $noteData['attachments'] ?? null,
                'follow_up_notes' => $noteData['follow_up_notes'] ?? null,
                'follow_up_date' => $noteData['follow_up_date'] ?? null,
                'created_by' => Auth::id(),
            ]);

            // Activity log
            $this->activityLogService->logCreate($note);

            // İlişkileri yükle
            $note->load(['student', 'counselor', 'appointment', 'creator']);

            return $note;
        });
    }
}
