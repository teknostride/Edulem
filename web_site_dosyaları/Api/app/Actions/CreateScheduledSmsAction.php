<?php

namespace App\Actions;

use App\Models\ScheduledSms;
use App\Services\ActivityLogService;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\DB;

class CreateScheduledSmsAction
{
    protected ActivityLogService $activityLogService;

    public function __construct(ActivityLogService $activityLogService)
    {
        $this->activityLogService = $activityLogService;
    }

    /**
     * Execute the action to create a scheduled SMS.
     *
     * @param  array  $smsData
     * @return ScheduledSms
     */
    public function execute(array $smsData): ScheduledSms
    {
        return DB::transaction(function () use ($smsData) {
            $user = Auth::user();
            $tenantId = $user->tenant_id;

            // Zamanlama tarihi ayrıştırma (Her zaman Türkiye saati Europe/Istanbul baz alınır)
            $rawScheduledAt = $smsData['scheduled_at'] ?? null;

            if (!empty($rawScheduledAt)) {
                // Gelen tarihi Europe/Istanbul saat diliminde netleştirip Y-m-d H:i:s formatına dönüştür
                $scheduledAt = \Carbon\Carbon::parse($rawScheduledAt, 'Europe/Istanbul')->setTimezone('Europe/Istanbul')->format('Y-m-d H:i:s');
            } else {
                $scheduledAt = \Carbon\Carbon::now('Europe/Istanbul')->format('Y-m-d H:i:s');
            }

            $scheduledSms = ScheduledSms::create([
                'tenant_id' => $tenantId,
                'title' => $smsData['title'] ?? mb_substr($smsData['message'], 0, 50) . '...',
                'message' => $smsData['message'],
                'recipient_phones' => $smsData['recipient_phones'] ?? [],
                'recipient_type' => $smsData['recipient_type'],
                'recipient_ids' => $smsData['recipient_ids'] ?? [],
                'scheduled_at' => $scheduledAt,
                'status' => 'pending',
                'created_by' => $user->id,
            ]);

            $this->activityLogService->logCreate($scheduledSms);

            // İlişkileri yükle
            $scheduledSms->load(['creator']);

            return $scheduledSms;
        });
    }
}
