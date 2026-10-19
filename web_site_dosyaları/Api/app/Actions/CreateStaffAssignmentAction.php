<?php

namespace App\Actions;

use App\Models\StaffAssignment;
use App\Services\ActivityLogService;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\DB;

class CreateStaffAssignmentAction
{
    protected ActivityLogService $activityLogService;

    public function __construct(ActivityLogService $activityLogService)
    {
        $this->activityLogService = $activityLogService;
    }

    /**
     * Execute the action to create a staff assignment.
     *
     * @param  array  $assignmentData
     * @return \App\Models\StaffAssignment
     * @throws \Exception
     */
    public function execute(array $assignmentData): StaffAssignment
    {
        return DB::transaction(function () use ($assignmentData) {
            // Takım kaptanının görevlendirilen personel listesinde olması kontrolü
            if (isset($assignmentData['team_leader_id'])) {
                $assignedStaffIds = $assignmentData['assigned_staff_ids'] ?? [];
                if (!in_array($assignmentData['team_leader_id'], $assignedStaffIds)) {
                    throw new \Exception('Takım kaptanı, görevlendirilen personel listesinde olmalıdır.');
                }
            }

            $assignment = StaffAssignment::create([
                'title' => $assignmentData['title'],
                'description' => $assignmentData['description'] ?? null,
                'assignment_type' => $assignmentData['assignment_type'],
                'assigned_staff_ids' => $assignmentData['assigned_staff_ids'],
                'team_leader_id' => $assignmentData['team_leader_id'] ?? null,
                'start_date' => $assignmentData['start_date'],
                'end_date' => $assignmentData['end_date'],
                'deadline' => $assignmentData['deadline'] ?? null,
                'completion_percentage' => $assignmentData['completion_percentage'] ?? 0,
                'status' => $assignmentData['status'] ?? 'pending',
                'related_data' => $assignmentData['related_data'] ?? null,
                'notes' => $assignmentData['notes'] ?? null,
                'show_in_calendar' => $assignmentData['show_in_calendar'] ?? true,
                'created_by' => Auth::id(),
            ]);

            // Activity log
            $this->activityLogService->logCreate($assignment);

            // İlişkileri yükle
            $assignment->load(['teamLeader', 'creator']);

            return $assignment;
        });
    }
}
