<?php

namespace App\Actions;

use App\Models\Lead;
use App\Services\ActivityLogService;
use Illuminate\Support\Facades\DB;

class UpdateLeadAction
{
    protected ActivityLogService $activityLogService;

    public function __construct(ActivityLogService $activityLogService)
    {
        $this->activityLogService = $activityLogService;
    }

    /**
     * Execute the action to update a lead record.
     *
     * @param  \App\Models\Lead  $lead
     * @param  array  $leadData
     * @return \App\Models\Lead
     * @throws \Exception
     */
    public function execute(Lead $lead, array $leadData): Lead
    {
        return DB::transaction(function () use ($lead, $leadData) {
            $lead->update([
                'name' => $leadData['name'] ?? $lead->name,
                'phone' => $leadData['phone'] ?? $lead->phone,
                'email' => $leadData['email'] ?? $lead->email,
                'notes' => $leadData['notes'] ?? $lead->notes,
                'status' => $leadData['status'] ?? $lead->status,
                'assigned_to' => $leadData['assigned_to'] ?? $lead->assigned_to,
                'source' => $leadData['source'] ?? $lead->source,
            ]);

            $this->activityLogService->logUpdate($lead);

            // İlişkileri yükle
            $lead->load(['assignedUser', 'appointments']);

            return $lead;
        });
    }
}
