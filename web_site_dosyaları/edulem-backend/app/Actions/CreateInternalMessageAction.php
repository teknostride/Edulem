<?php

namespace App\Actions;

use App\Models\InternalMessage;
use App\Models\MessageRecipient;
use App\Services\ActivityLogService;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\DB;

class CreateInternalMessageAction
{
    protected ActivityLogService $activityLogService;

    public function __construct(ActivityLogService $activityLogService)
    {
        $this->activityLogService = $activityLogService;
    }

    /**
     * Execute the action to create an internal message.
     *
     * @param  array  $messageData
     * @return \App\Models\InternalMessage
     */
    public function execute(array $messageData): InternalMessage
    {
        return DB::transaction(function () use ($messageData) {
            $user = Auth::user();
            $tenantId = $user->tenant_id;

            // Mesaj oluştur
            $message = InternalMessage::create([
                'tenant_id' => $tenantId,
                'sender_id' => $user->id,
                'subject' => $messageData['subject'],
                'message' => $messageData['message'],
                'type' => $messageData['type'] ?? 'message',
                'priority' => $messageData['priority'] ?? 'normal',
                'recipient_ids' => $messageData['recipient_ids'] ?? [],
                'recipient_type' => $messageData['recipient_type'] ?? 'user',
                'file_id' => $messageData['file_id'] ?? null,
                'send_sms' => $messageData['send_sms'] ?? false,
                'send_email' => $messageData['send_email'] ?? false,
                'sent_at' => now(),
            ]);

            // Alıcıları oluştur
            $recipientIds = $this->resolveRecipients($messageData, $tenantId);
            
            foreach ($recipientIds as $recipientId) {
                MessageRecipient::create([
                    'message_id' => $message->id,
                    'recipient_id' => $recipientId,
                ]);
            }

            // SMS gönderimi (queue ile)
            if ($message->send_sms) {
                // TODO: SMS gönderimi implement edilecek
                // SendSmsJob::dispatch(...);
            }

            // Email gönderimi (queue ile)
            if ($message->send_email) {
                // TODO: Email gönderimi implement edilecek
                // SendEmailJob::dispatch(...);
            }

            $this->activityLogService->logCreate($message);

            // İlişkileri yükle
            $message->load(['sender', 'file', 'recipients.recipient']);

            return $message;
        });
    }

    /**
     * Resolve recipient IDs based on recipient type.
     *
     * @param  array  $messageData
     * @param  int  $tenantId
     * @return array
     */
    protected function resolveRecipients(array $messageData, int $tenantId): array
    {
        $recipientType = $messageData['recipient_type'] ?? 'user';
        $recipientIds = $messageData['recipient_ids'] ?? [];

        return match ($recipientType) {
            'all' => \App\Models\User::where('tenant_id', $tenantId)->pluck('id')->toArray(),
            'role' => \App\Models\User::where('tenant_id', $tenantId)
                ->whereHas('role', function ($q) use ($recipientIds) {
                    $q->whereIn('roles.id', $recipientIds);
                })
                ->pluck('id')
                ->toArray(),
            'classroom' => $this->resolveClassroomRecipients($recipientIds, $tenantId),
            'user' => $recipientIds,
            default => $recipientIds,
        };
    }

    /**
     * Resolve recipients for classroom type.
     * Returns teacher IDs for the classrooms.
     *
     * @param  array  $classroomIds
     * @param  int  $tenantId
     * @return array
     */
    protected function resolveClassroomRecipients(array $classroomIds, int $tenantId): array
    {
        // Sınıf öğretmenlerini al
        $teacherIds = \App\Models\Classroom::where('tenant_id', $tenantId)
            ->whereIn('id', $classroomIds)
            ->whereNotNull('teacher_id')
            ->pluck('teacher_id')
            ->unique()
            ->toArray();

        return $teacherIds;
    }
}
