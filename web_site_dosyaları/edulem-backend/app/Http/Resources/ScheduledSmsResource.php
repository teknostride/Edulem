<?php

namespace App\Http\Resources;

use App\Models\Guardian;
use App\Models\Student;
use App\Models\User;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class ScheduledSmsResource extends JsonResource
{
    /**
     * Cache for phone -> name lookup per request to prevent redundant queries.
     *
     * @var array<int, array<string, string>>
     */
    protected static array $resolvedPhoneCache = [];

    /**
     * Transform the resource into an array.
     *
     * @param  Request|mixed  $request
     * @return array<string, mixed>
     */
    public function toArray($request): array
    {
        return $this->getDetailedFields();
    }

    public function getPublicFields(): array
    {
        return $this->getDetailedFields();
    }

    public function getTeacherFields(): array
    {
        return $this->getDetailedFields();
    }

    public function getAccountantFields(): array
    {
        return $this->getDetailedFields();
    }

    public function getAdminFields(): array
    {
        return $this->getDetailedFields();
    }

    public function getAllFields(): array
    {
        return $this->getDetailedFields();
    }

    protected function getDetailedFields(): array
    {
        try {
            $reports = null;
            if (method_exists($this->resource, 'reports') && $this->relationLoaded('reports')) {
                $reports = $this->reports;
            } elseif (class_exists(\App\Models\SmsReport::class)) {
                try {
                    $reports = \App\Models\SmsReport::where('sender_id', (string) $this->id)
                        ->whereIn('sender_type', ['scheduled_sms', 'test_sms'])
                        ->get();
                } catch (\Throwable $e) {
                    $reports = null;
                }
            }

            $sentRecipients = [];
            $failedRecipients = [];

            if ($reports && $reports->isNotEmpty()) {
                foreach ($reports as $r) {
                    $phoneStr = (string) $r->phone;
                    $isValid = \App\Models\ScheduledSms::validateAndNormalizePhone($phoneStr) !== null;

                    if (in_array($r->status, ['sent', 'delivered']) && $isValid) {
                        $sentRecipients[] = [
                            'phone' => $phoneStr,
                            'status' => $r->status,
                            'sent_at' => $r->sent_at?->format('Y-m-d H:i:s') ?? $r->created_at?->format('Y-m-d H:i:s'),
                        ];
                    } else {
                        $failedRecipients[] = [
                            'phone' => $phoneStr,
                            'status' => 'failed',
                            'error_message' => $r->error_message ?: (!$isValid ? 'Geçersiz telefon numarası formatı (05XXXXXXXXX veya 905XXXXXXXXX olmalı)' : ($this->error_message ?: 'İletilemedi')),
                        ];
                    }
                }
            } else {
                $rawPhones = $this->recipient_phones;
                if (is_string($rawPhones)) {
                    $decoded = json_decode($rawPhones, true);
                    $rawPhones = is_array($decoded) ? $decoded : (empty($rawPhones) ? [] : [$rawPhones]);
                }
                $allPhones = is_array($rawPhones) ? $rawPhones : [];

                foreach ($allPhones as $p) {
                    $phoneStr = (string) $p;
                    $isValid = \App\Models\ScheduledSms::validateAndNormalizePhone($phoneStr) !== null;

                    if ($isValid && ($this->status === 'completed' || $this->status === 'sent') && ($this->failed_count ?? 0) === 0) {
                        $sentRecipients[] = [
                            'phone' => $phoneStr,
                            'status' => 'sent',
                            'sent_at' => $this->sent_at?->format('Y-m-d H:i:s') ?? $this->created_at?->format('Y-m-d H:i:s'),
                        ];
                    } else {
                        $failedRecipients[] = [
                            'phone' => $phoneStr,
                            'status' => 'failed',
                            'error_message' => !$isValid 
                                ? 'Geçersiz telefon numarası formatı (05XXXXXXXXX veya 905XXXXXXXXX olmalı)' 
                                : ($this->error_message ?: 'Gönderim başarısız oldu.'),
                        ];
                    }
                }
            }

            // Alıcı isimlerini çözümle (Yalnızca mevcut SMS içindeki numaralar sorgulanır, bellek şişmez)
            $phoneList = [];
            foreach ($sentRecipients as $item) {
                if (!empty($item['phone'])) {
                    $phoneList[] = $item['phone'];
                }
            }
            foreach ($failedRecipients as $item) {
                if (!empty($item['phone'])) {
                    $phoneList[] = $item['phone'];
                }
            }

            $nameMap = $this->resolvePhoneNames($phoneList);

            foreach ($sentRecipients as &$item) {
                $last10 = substr(preg_replace('/\D/', '', (string) $item['phone']), -10);
                $item['name'] = $nameMap[$last10] ?? null;
            }
            unset($item);

            foreach ($failedRecipients as &$item) {
                $last10 = substr(preg_replace('/\D/', '', (string) $item['phone']), -10);
                $item['name'] = $nameMap[$last10] ?? null;
            }
            unset($item);

            return [
                'id' => $this->id,
                'title' => $this->title,
                'status' => $this->status,
                'scheduled_at' => $this->scheduled_at ? $this->scheduled_at->format('Y-m-d H:i:s') : null,
                'created_at' => $this->created_at ? $this->created_at->format('Y-m-d H:i:s') : null,
                'sent_at' => $this->sent_at ? $this->sent_at->format('Y-m-d H:i:s') : null,
                'message' => $this->message,
                'recipient_type' => $this->recipient_type,
                'recipient_phones' => is_array($this->recipient_phones) ? $this->recipient_phones : [],
                'sent_count' => count($sentRecipients),
                'failed_count' => count($failedRecipients),
                'error_message' => $this->error_message,
                'sent_recipients' => $sentRecipients,
                'failed_recipients' => $failedRecipients,
                'creator' => $this->relationLoaded('creator') && $this->creator ? [
                    'id' => $this->creator->id,
                    'name' => $this->creator->name,
                ] : null,
            ];
        } catch (\Throwable $e) {
            // Hata durumunda 500 vermeden temel SMS verilerini döndür
            return [
                'id' => $this->id,
                'title' => $this->title,
                'status' => $this->status,
                'scheduled_at' => $this->scheduled_at ? $this->scheduled_at->format('Y-m-d H:i:s') : null,
                'created_at' => $this->created_at ? $this->created_at->format('Y-m-d H:i:s') : null,
                'sent_at' => $this->sent_at ? $this->sent_at->format('Y-m-d H:i:s') : null,
                'message' => $this->message,
                'recipient_type' => $this->recipient_type,
                'recipient_phones' => is_array($this->recipient_phones) ? $this->recipient_phones : [],
                'sent_count' => $this->sent_count ?? 0,
                'failed_count' => $this->failed_count ?? 0,
                'error_message' => $this->error_message,
                'sent_recipients' => [],
                'failed_recipients' => [],
                'creator' => null,
            ];
        }
    }

    protected function resolvePhoneNames(array $phones): array
    {
        $tenantId = (int) ($this->tenant_id ?? 0);
        if ($tenantId <= 0 || empty($phones)) {
            return [];
        }

        // 10 haneli temiz numaraları çıkar
        $digits = [];
        foreach ($phones as $p) {
            $last10 = substr(preg_replace('/\D/', '', (string) $p), -10);
            if (strlen($last10) === 10) {
                $digits[$last10] = $last10;
            }
        }

        if (empty($digits)) {
            return [];
        }

        if (!isset(self::$resolvedPhoneCache[$tenantId])) {
            self::$resolvedPhoneCache[$tenantId] = [];
        }

        $neededDigits = array_values(array_diff_key($digits, self::$resolvedPhoneCache[$tenantId]));

        if (!empty($neededDigits)) {
            try {
                // 1. Öğrenciler (Yalnızca bu numaralar filtrelenir)
                $students = Student::where('tenant_id', $tenantId)
                    ->where(function ($q) use ($neededDigits) {
                        foreach ($neededDigits as $d) {
                            $q->orWhere('phone', 'like', "%{$d}%");
                        }
                    })
                    ->get(['id', 'name', 'phone', 'school_no']);

                foreach ($students as $s) {
                    $c = substr(preg_replace('/\D/', '', (string) $s->phone), -10);
                    if (strlen($c) === 10 && !isset(self::$resolvedPhoneCache[$tenantId][$c])) {
                        self::$resolvedPhoneCache[$tenantId][$c] = $s->name . ($s->school_no ? " (Öğrenci - No: {$s->school_no})" : " (Öğrenci)");
                    }
                }

                // 2. Veliler (guardians tablosunda tenant_id sütunu yoktur; öğrenci ilişkisi üzerinden filtrelenir)
                $guardians = Guardian::where(function ($q) use ($neededDigits) {
                        foreach ($neededDigits as $d) {
                            $q->orWhere('phone', 'like', "%{$d}%");
                        }
                    })
                    ->with(['students' => function ($q) use ($tenantId) {
                        $q->where('students.tenant_id', $tenantId)
                          ->select('students.id', 'students.name', 'students.classroom_id')
                          ->withPivot('relation_type');
                    }])
                    ->get(['id', 'name', 'phone']);

                $targetRecipientIds = is_array($this->recipient_ids) ? array_map('intval', $this->recipient_ids) : [];
                $targetType = $this->recipient_type;

                foreach ($guardians as $g) {
                    $c = substr(preg_replace('/\D/', '', (string) $g->phone), -10);
                    if (strlen($c) === 10 && !isset(self::$resolvedPhoneCache[$tenantId][$c])) {
                        $relevantStudents = $g->students;
                        if (!empty($targetRecipientIds)) {
                            if ($targetType === 'students') {
                                $matched = $g->students->filter(fn($st) => in_array((int)$st->id, $targetRecipientIds));
                                if ($matched->isNotEmpty()) {
                                    $relevantStudents = $matched;
                                }
                            } elseif ($targetType === 'classroom') {
                                $matched = $g->students->filter(fn($st) => in_array((int)$st->classroom_id, $targetRecipientIds));
                                if ($matched->isNotEmpty()) {
                                    $relevantStudents = $matched;
                                }
                            }
                        }

                        $studentNames = $relevantStudents->pluck('name')->filter()->implode(', ');
                        $relType = $relevantStudents->first()?->pivot?->relation_type ?? $g->students->first()?->pivot?->relation_type;
                        $relLabel = 'Veli';
                        if (in_array(strtolower((string)$relType), ['mother', 'anne'])) {
                            $relLabel = 'Anne';
                        } elseif (in_array(strtolower((string)$relType), ['father', 'baba'])) {
                            $relLabel = 'Baba';
                        }

                        self::$resolvedPhoneCache[$tenantId][$c] = $g->name . (!empty($studentNames) ? " ({$relLabel} - {$studentNames})" : " ({$relLabel})");
                    }
                }

                // 3. Personeller (User)
                $users = User::where('tenant_id', $tenantId)
                    ->where(function ($q) use ($neededDigits) {
                        foreach ($neededDigits as $d) {
                            $q->orWhere('phone', 'like', "%{$d}%");
                        }
                    })
                    ->with('roles')
                    ->get(['id', 'first_name', 'last_name', 'name', 'phone']);

                foreach ($users as $u) {
                    $c = substr(preg_replace('/\D/', '', (string) $u->phone), -10);
                    if (strlen($c) === 10 && !isset(self::$resolvedPhoneCache[$tenantId][$c])) {
                        $uName = trim(($u->first_name ?? '') . ' ' . ($u->last_name ?? '')) ?: ($u->name ?? 'Personel');
                        $roleTitle = $u->roles->first()?->title ?? $u->roles->first()?->name ?? 'Personel';
                        self::$resolvedPhoneCache[$tenantId][$c] = "{$uName} ({$roleTitle})";
                    }
                }
            } catch (\Throwable $e) {
                // Sorgu hatası olursa akışı kesme
            }
        }

        return self::$resolvedPhoneCache[$tenantId];
    }
}
