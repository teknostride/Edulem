<?php

namespace App\Actions;

use App\Models\Lead;
use App\Services\ActivityLogService;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\DB;

class CreateLeadAction
{
    protected ActivityLogService $activityLogService;

    public function __construct(ActivityLogService $activityLogService)
    {
        $this->activityLogService = $activityLogService;
    }

    /**
     * Execute the action to create a lead record.
     *
     * @param  array  $leadData
     * @return \App\Models\Lead
     * @throws \Exception
     */
    public function execute(array $leadData): Lead
    {
        return DB::transaction(function () use ($leadData) {
            $lead = Lead::create([
                'tenant_id' => Auth::user()->tenant_id,
                'name' => $leadData['name'],
                'phone' => $leadData['phone'],
                'email' => $leadData['email'] ?? null,
                'notes' => $leadData['notes'] ?? null,
                'status' => $leadData['status'] ?? 'new',
                'assigned_to' => $leadData['assigned_to'] ?? null,
                'source' => $leadData['source'] ?? null,
            ]);

            $this->activityLogService->logCreate($lead);

            // İlişkileri yükle
            $lead->load(['assignedUser', 'appointments']);

            return $lead;
        });
    }
}
