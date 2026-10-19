<?php

namespace App\Actions;

use App\Models\SmsBlacklist;
use App\Services\ActivityLogService;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\DB;

class CreateSmsBlacklistAction
{
    protected ActivityLogService $activityLogService;

    public function __construct(ActivityLogService $activityLogService)
    {
        $this->activityLogService = $activityLogService;
    }

    /**
     * Execute the action to create a blacklist entry.
     *
     * @param  array  $blacklistData
     * @return \App\Models\SmsBlacklist
     */
    public function execute(array $blacklistData): SmsBlacklist
    {
        return DB::transaction(function () use ($blacklistData) {
            $user = Auth::user();
            $tenantId = $user->tenant_id;

            // Aynı telefon zaten kara listede mi kontrol et
            $existing = SmsBlacklist::where('tenant_id', $tenantId)
                ->where('phone', $blacklistData['phone'])
                ->first();

            if ($existing) {
                throw new \Exception('Bu telefon numarası zaten kara listede.');
            }

            $blacklist = SmsBlacklist::create([
                'tenant_id' => $tenantId,
                'phone' => $blacklistData['phone'],
                'reason' => $blacklistData['reason'] ?? null,
                'type' => $blacklistData['type'] ?? 'manual',
                'created_by' => $user->id,
            ]);

            $this->activityLogService->logCreate($blacklist);

            // İlişkileri yükle
            $blacklist->load(['creator']);

            return $blacklist;
        });
    }
}
