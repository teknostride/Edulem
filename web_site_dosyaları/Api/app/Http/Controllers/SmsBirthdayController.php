<?php

namespace App\Http\Controllers;

use App\Jobs\SendBirthdaySmsJob;
use App\Jobs\SendSmsJob;
use App\Models\Setting;
use App\Models\SmsReport;
use App\Models\Student;
use App\Models\Tenant;
use App\Models\User;
use Carbon\Carbon;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;

class SmsBirthdayController extends ApiController
{
    /**
     * Get birthday SMS settings and today's birthday list.
     */
    public function getSettings(): JsonResponse
    {
        $user = auth()->user();
        if (!$user) {
            return $this->error('Bu işlem için yetkiniz bulunmamaktadır.', [], 403);
        }

        $tenantId = $user->tenant_id;

        // Cron gecikmesi durumunda, sayfa açıldığında saati gelmiş olanlar için otomatik arka plan tetiklemesi
        if ($tenantId) {
            try {
                SendBirthdaySmsJob::dispatch($tenantId, false);
            } catch (\Exception $e) {
                Log::warning('Birthday auto-check dispatch error: ' . $e->getMessage());
            }
        }

        $dbSettings = [];
        if ($tenantId) {
            $dbSettings = DB::table('settings')
                ->where('tenant_id', $tenantId)
                ->where('group', 'sms')
                ->pluck('value', 'key')
                ->toArray();
        }

        $tenant = $tenantId ? Tenant::find($tenantId) : null;
        $tenantName = $tenant?->name ?? 'Kurumumuz';

        $settings = [
            'staff_enabled' => isset($dbSettings['birthday_staff_enabled'])
                ? in_array($dbSettings['birthday_staff_enabled'], ['1', 'true', true], true)
                : true,
            'staff_time' => $dbSettings['birthday_staff_time'] ?? '09:00',
            'staff_template' => $dbSettings['birthday_staff_template']
                ?? "Sayın {ad_soyad}, {kurum_adi} ailesi olarak doğum gününüzü en içten dileklerimizle kutlar, sevdiklerinizle birlikte sağlıklı, mutlu ve huzurlu bir ömür dileriz.",
            'student_enabled' => isset($dbSettings['birthday_student_enabled'])
                ? in_array($dbSettings['birthday_student_enabled'], ['1', 'true', true], true)
                : true,
            'student_time' => $dbSettings['birthday_student_time'] ?? '09:30',
            'student_recipient' => $dbSettings['birthday_student_recipient'] ?? 'both', // 'student', 'guardian', 'both'
            'student_template' => $dbSettings['birthday_student_template']
                ?? "Sevgili {ogrenci_adi}, {kurum_adi} ailesi olarak yeni yaşını en içten dileklerimizle kutlar; sağlık, mutluluk ve üstün başarılar dileriz.",
            'guardian_template' => $dbSettings['birthday_guardian_template']
                ?? "Sayın Velimiz, değerli öğrencimiz {ogrenci_adi}'nin doğum gününü {kurum_adi} ailesi olarak kutlar; evladınızla birlikte sağlıklı, huzurlu ve başarılı nice mutlu yaşlar dileriz.",
            'tenant_name' => $tenantName,
        ];

        // Bugün doğum günü olanlar
        $today = now();
        $day = $today->day;
        $month = $today->month;
        $todayDateString = $today->toDateString();

        $todayStaff = collect();
        $todayStudents = collect();

        if ($tenantId) {
            try {
                $todayStaff = User::where('tenant_id', $tenantId)
                    ->where('is_active', true)
                    ->whereNotNull('birth_date')
                    ->where('birth_date', '!=', '0000-00-00')
                    ->whereRaw('DAY(birth_date) = ?', [$day])
                    ->whereRaw('MONTH(birth_date) = ?', [$month])
                    ->get();
            } catch (\Throwable $e) {
                Log::warning('Today staff query warning: ' . $e->getMessage());
                $todayStaff = collect();
            }

            try {
                $todayStudents = Student::where('tenant_id', $tenantId)
                    ->where('is_active', true)
                    ->whereNotNull('birth_date')
                    ->where('birth_date', '!=', '0000-00-00')
                    ->whereRaw('DAY(birth_date) = ?', [$day])
                    ->whereRaw('MONTH(birth_date) = ?', [$month])
                    ->with(['classroom:id,name', 'guardians'])
                    ->get();
            } catch (\Throwable $e) {
                Log::warning('Today student query warning: ' . $e->getMessage());
                $todayStudents = collect();
            }
        }

        $formattedStaff = $todayStaff->map(function ($item) use ($today, $tenantId, $todayDateString) {
            $age = $item->birth_date ? Carbon::parse($item->birth_date)->age : null;
            $sentToday = false;
            try {
                $sentToday = SmsReport::where('tenant_id', $tenantId)
                    ->where('sender_type', 'birthday_staff')
                    ->where('sender_id', $item->id)
                    ->whereDate('created_at', $todayDateString)
                    ->exists();
            } catch (\Throwable $e) {}

            return [
                'id' => $item->id,
                'name' => $item->name,
                'phone' => $item->phone,
                'has_phone' => !empty($item->phone),
                'birth_date' => $item->birth_date ? Carbon::parse($item->birth_date)->format('d.m.Y') : null,
                'age' => $age,
                'title' => $item->department ?: ($item->teacher_type ?: 'Personel'),
                'sent_today' => $sentToday,
            ];
        });

        $formattedStudents = $todayStudents->map(function ($item) use ($today, $tenantId, $todayDateString) {
            $age = $item->birth_date ? Carbon::parse($item->birth_date)->age : null;

            $studentSent = false;
            try {
                $studentSent = SmsReport::where('tenant_id', $tenantId)
                    ->where('sender_type', 'birthday_student')
                    ->where('sender_id', $item->id)
                    ->whereDate('created_at', $todayDateString)
                    ->exists();
            } catch (\Throwable $e) {}

            $guardianSentPhones = [];
            try {
                $guardianSentPhones = SmsReport::where('tenant_id', $tenantId)
                    ->where('sender_type', 'birthday_guardian')
                    ->where('sender_id', $item->id)
                    ->whereDate('created_at', $todayDateString)
                    ->pluck('phone')
                    ->toArray();
            } catch (\Throwable $e) {}

            $guardians = $item->guardians->map(function ($g) use ($guardianSentPhones) {
                $hasPhone = !empty($g->phone);
                $relType = $g->pivot?->relation_type ?? 'Veli';
                $relLabel = match (strtolower($relType)) {
                    'mother', 'anne' => 'Anne',
                    'father', 'baba' => 'Baba',
                    'guardian', 'vasi' => 'Vasi',
                    default => ucfirst($relType),
                };

                return [
                    'id' => $g->id,
                    'name' => $g->name,
                    'phone' => $g->phone,
                    'has_phone' => $hasPhone,
                    'relation' => $relLabel,
                    'is_legal' => (bool) ($g->pivot?->is_legal_guardian ?? false),
                    'sent_today' => $hasPhone && in_array($g->phone, $guardianSentPhones),
                ];
            });

            $guardianPhoneCount = $guardians->where('has_phone', true)->count();
            $guardianSentCount = $guardians->where('sent_today', true)->count();
            $sentToday = $studentSent || ($guardianPhoneCount > 0 && $guardianSentCount > 0);

            return [
                'id' => $item->id,
                'name' => $item->name,
                'school_no' => $item->school_no,
                'phone' => $item->phone,
                'has_phone' => !empty($item->phone),
                'has_any_contact' => !empty($item->phone) || $guardianPhoneCount > 0,
                'classroom' => $item->classroom?->name ?? 'Belirtilmedi',
                'birth_date' => $item->birth_date ? Carbon::parse($item->birth_date)->format('d.m.Y') : null,
                'age' => $age,
                'guardians' => $guardians,
                'student_sent_today' => $studentSent,
                'guardian_phone_count' => $guardianPhoneCount,
                'guardian_sent_count' => $guardianSentCount,
                'sent_today' => $sentToday,
            ];
        });

        $staffSentCount = $formattedStaff->where('sent_today', true)->count();
        $studentSentCount = $formattedStudents->where('sent_today', true)->count();

        // ==========================================
        // Yaklaşan Doğum Günleri (Önümüzdeki 5 Gün)
        // ==========================================
        $upcomingDaysWindow = 5;
        $monthDayList = [];
        for ($i = 1; $i <= $upcomingDaysWindow; $i++) {
            $monthDayList[] = $today->copy()->addDays($i)->format('m-d');
        }

        $upcomingStaff = collect();
        $upcomingStudents = collect();

        if ($tenantId && !empty($monthDayList)) {
            $placeholders = implode(',', array_fill(0, count($monthDayList), '?'));

            try {
                $upcomingStaff = User::where('tenant_id', $tenantId)
                    ->where('is_active', true)
                    ->whereNotNull('birth_date')
                    ->where('birth_date', '!=', '0000-00-00')
                    ->whereRaw("DATE_FORMAT(birth_date, '%m-%d') IN ($placeholders)", $monthDayList)
                    ->get();
            } catch (\Throwable $e) {
                $upcomingStaff = collect();
            }

            try {
                $upcomingStudents = Student::where('tenant_id', $tenantId)
                    ->where('is_active', true)
                    ->whereNotNull('birth_date')
                    ->where('birth_date', '!=', '0000-00-00')
                    ->whereRaw("DATE_FORMAT(birth_date, '%m-%d') IN ($placeholders)", $monthDayList)
                    ->with(['classroom:id,name', 'guardians'])
                    ->get();
            } catch (\Throwable $e) {
                $upcomingStudents = collect();
            }
        }

        Carbon::setLocale('tr');
        $calculateUpcomingDetails = function ($birthDate, $today) {
            if (!$birthDate) return null;
            try {
                $birthCarbon = Carbon::parse($birthDate);
                $nextBirthday = Carbon::create($today->year, $birthCarbon->month, $birthCarbon->day)->startOfDay();
                if ($nextBirthday->lt($today->copy()->startOfDay())) {
                    $nextBirthday->addYear();
                }
                $daysLeft = (int) $today->copy()->startOfDay()->diffInDays($nextBirthday, false);
                $turningAge = (int) $birthCarbon->diffInYears($nextBirthday);

                return [
                    'next_birthday' => $nextBirthday->format('Y-m-d'),
                    'next_birthday_formatted' => $nextBirthday->locale('tr')->translatedFormat('d F Y (l)'),
                    'day_month' => $nextBirthday->locale('tr')->translatedFormat('d F'),
                    'days_left' => $daysLeft,
                    'turning_age' => $turningAge > 0 ? $turningAge : null,
                ];
            } catch (\Throwable $e) {
                return null;
            }
        };

        $formattedUpcomingStaff = $upcomingStaff->map(function ($item) use ($today, $calculateUpcomingDetails) {
            $details = $calculateUpcomingDetails($item->birth_date, $today);
            if (!$details) return null;

            return [
                'id' => $item->id,
                'name' => $item->name,
                'type' => 'staff',
                'type_label' => 'Personel',
                'title' => $item->department ?: ($item->teacher_type ?: 'Personel'),
                'phone' => $item->phone,
                'has_phone' => !empty($item->phone),
                'has_any_contact' => !empty($item->phone),
                'birth_date' => $item->birth_date ? Carbon::parse($item->birth_date)->format('d.m.Y') : null,
                'days_left' => $details['days_left'],
                'next_birthday' => $details['next_birthday'],
                'next_birthday_formatted' => $details['next_birthday_formatted'],
                'day_month' => $details['day_month'],
                'turning_age' => $details['turning_age'],
            ];
        })->filter()->values();

        $formattedUpcomingStudents = $upcomingStudents->map(function ($item) use ($today, $calculateUpcomingDetails) {
            $details = $calculateUpcomingDetails($item->birth_date, $today);
            if (!$details) return null;

            $guardians = $item->guardians->map(function ($g) {
                $relType = $g->pivot?->relation_type ?? 'Veli';
                $relLabel = match (strtolower($relType)) {
                    'mother', 'anne' => 'Anne',
                    'father', 'baba' => 'Baba',
                    'guardian', 'vasi' => 'Vasi',
                    default => ucfirst($relType),
                };
                return [
                    'id' => $g->id,
                    'name' => $g->name,
                    'phone' => $g->phone,
                    'has_phone' => !empty($g->phone),
                    'relation' => $relLabel,
                ];
            });

            $hasGuardianPhone = $guardians->where('has_phone', true)->isNotEmpty();

            return [
                'id' => $item->id,
                'name' => $item->name,
                'type' => 'student',
                'type_label' => 'Öğrenci',
                'title' => $item->classroom?->name ? ($item->classroom->name . ($item->school_no ? " (No: {$item->school_no})" : '')) : 'Öğrenci',
                'phone' => $item->phone,
                'has_phone' => !empty($item->phone),
                'has_any_contact' => !empty($item->phone) || $hasGuardianPhone,
                'guardians' => $guardians,
                'birth_date' => $item->birth_date ? Carbon::parse($item->birth_date)->format('d.m.Y') : null,
                'days_left' => $details['days_left'],
                'next_birthday' => $details['next_birthday'],
                'next_birthday_formatted' => $details['next_birthday_formatted'],
                'day_month' => $details['day_month'],
                'turning_age' => $details['turning_age'],
            ];
        })->filter()->values();

        $allUpcoming = $formattedUpcomingStaff->concat($formattedUpcomingStudents)
            ->sortBy('days_left')
            ->values();

        return $this->success([
            'settings' => $settings,
            'today' => [
                'date' => $today->format('d.m.Y'),
                'current_time' => $today->format('H:i'),
                'staff_count' => $todayStaff->count(),
                'student_count' => $todayStudents->count(),
                'staff_sent_count' => $staffSentCount,
                'student_sent_count' => $studentSentCount,
                'staff' => $formattedStaff,
                'students' => $formattedStudents,
            ],
            'upcoming' => [
                'days_window' => $upcomingDaysWindow,
                'total_count' => $allUpcoming->count(),
                'staff_count' => $formattedUpcomingStaff->count(),
                'student_count' => $formattedUpcomingStudents->count(),
                'items' => $allUpcoming,
            ],
        ], 'Doğum günü SMS ayarları getirildi.');
    }

    /**
     * Save birthday SMS settings.
     */
    public function updateSettings(Request $request): JsonResponse
    {
        $user = auth()->user();
        if (!$user || !$user->tenant_id) {
            return $this->error('Bu işlem için yetkiniz bulunmamaktadır.', [], 403);
        }

        $tenantId = $user->tenant_id;

        $validated = $request->validate([
            'staff_enabled' => 'required|boolean',
            'staff_time' => 'nullable|string',
            'staff_template' => 'required|string',
            'student_enabled' => 'required|boolean',
            'student_time' => 'nullable|string',
            'student_recipient' => 'required|in:student,guardian,both',
            'student_template' => 'required|string',
            'guardian_template' => 'nullable|string',
        ]);

        $keys = [
            'birthday_staff_enabled' => $validated['staff_enabled'] ? '1' : '0',
            'birthday_staff_time' => $validated['staff_time'] ?? '09:00',
            'birthday_staff_template' => trim($validated['staff_template']),
            'birthday_student_enabled' => $validated['student_enabled'] ? '1' : '0',
            'birthday_student_time' => $validated['student_time'] ?? '09:30',
            'birthday_student_recipient' => $validated['student_recipient'],
            'birthday_student_template' => trim($validated['student_template']),
            'birthday_guardian_template' => trim($validated['guardian_template'] ?? "Sayın Velimiz, değerli öğrencimiz {ogrenci_adi}'nin doğum gününü {kurum_adi} ailesi olarak kutlar; evladınızla birlikte sağlıklı, huzurlu ve başarılı nice mutlu yaşlar dileriz."),
        ];

        foreach ($keys as $key => $val) {
            DB::table('settings')->updateOrInsert(
                ['tenant_id' => $tenantId, 'key' => $key],
                ['value' => $val, 'group' => 'sms', 'updated_at' => now(), 'created_at' => now()]
            );
        }

        return $this->success(null, 'Doğum günü SMS ayarları başarıyla kaydedildi. Belirlediğiniz saatlerde otomatik olarak gönderilecektir.');
    }

    /**
     * Send today's birthday SMS immediately for the current tenant.
     */
    public function sendToday(Request $request): JsonResponse
    {
        $user = auth()->user();
        if (!$user || !$user->tenant_id) {
            return $this->error('Bu işlem için yetkiniz bulunmamaktadır.', [], 403);
        }

        $tenantId = $user->tenant_id;
        $tenant = Tenant::find($tenantId);
        if (!$tenant) {
            return $this->error('Kurum bulunamadı.', [], 404);
        }

        try {
            $job = new SendBirthdaySmsJob($tenantId, true);
            $job->handle();

            return $this->success(null, 'Bugünkü doğum günü SMS gönderimi tamamlandı.');
        } catch (\Exception $e) {
            Log::error('Birthday SMS send-today error: ' . $e->getMessage());
            return $this->error('Doğum günü SMS gönderimi sırasında bir hata oluştu: ' . $e->getMessage(), [], 500);
        }
    }
}
