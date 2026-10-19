<?php

namespace App\Jobs;

use App\Models\Student;
use App\Models\User;
use App\Models\Tenant;
use App\Models\SmsReport;
use App\Jobs\SendSmsJob;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Bus\Dispatchable;
use Illuminate\Queue\InteractsWithQueue;
use Illuminate\Queue\SerializesModels;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;
use Carbon\Carbon;

class SendBirthdaySmsJob implements ShouldQueue
{
    use Dispatchable, InteractsWithQueue, Queueable, SerializesModels;

    public $tries = 3;
    public $backoff = 60;

    protected ?int $tenantId;
    protected bool $forceImmediate;

    /**
     * Create a new job instance.
     *
     * @param int|null $tenantId If specified, only processes this tenant.
     * @param bool $forceImmediate If true, bypasses the scheduled time check and already-sent check.
     */
    public function __construct(?int $tenantId = null, bool $forceImmediate = false)
    {
        $this->tenantId = $tenantId;
        $this->forceImmediate = $forceImmediate;
    }

    /**
     * Execute the job.
     */
    public function handle(): void
    {
        try {
            $today = now();
            $day = $today->day;
            $month = $today->month;
            $currentTime = $today->format('H:i');
            $todayDateString = $today->toDateString();

            $tenantsQuery = Tenant::where('is_active', true);
            if ($this->tenantId) {
                $tenantsQuery->where('id', $this->tenantId);
            }
            $tenants = $tenantsQuery->get();

            foreach ($tenants as $tenant) {
                $dbSettings = DB::table('settings')
                    ->where('tenant_id', $tenant->id)
                    ->where('group', 'sms')
                    ->pluck('value', 'key')
                    ->toArray();

                // SMS genel aktiflik kontrolü
                $hasSms = (!empty($dbSettings['iletibilgi_enabled']) && in_array($dbSettings['iletibilgi_enabled'], ['1', 'true', true], true))
                    || (!empty($dbSettings['sms.enabled']) && in_array($dbSettings['sms.enabled'], ['1', 'true', true], true))
                    || $tenant->isSmsNotificationEnabled();

                if (!$hasSms) {
                    continue;
                }

                $tenantName = $tenant->name ?? 'Kurumumuz';

                // ==========================================
                // 1. Personel Doğum Günü SMS Otomasyonu
                // ==========================================
                $staffEnabled = isset($dbSettings['birthday_staff_enabled'])
                    ? in_array($dbSettings['birthday_staff_enabled'], ['1', 'true', true], true)
                    : true;
                $staffTime = $dbSettings['birthday_staff_time'] ?? '09:00';
                $staffTemplate = $dbSettings['birthday_staff_template']
                    ?? "Sayın {ad_soyad}, {kurum_adi} ailesi olarak doğum gününüzü en içten dileklerimizle kutlar, sevdiklerinizle birlikte sağlıklı, mutlu ve huzurlu bir ömür dileriz.";

                // Eğer zamanı gelmediyse (ve manuel zorlama değilse) atla
                $canSendStaff = $staffEnabled && ($this->forceImmediate || $currentTime >= $staffTime);

                if ($canSendStaff) {
                    $staffMembers = User::where('tenant_id', $tenant->id)
                        ->where('is_active', true)
                        ->whereNotNull('birth_date')
                        ->whereRaw('DAY(birth_date) = ?', [$day])
                        ->whereRaw('MONTH(birth_date) = ?', [$month])
                        ->get();

                    foreach ($staffMembers as $staff) {
                        if (empty($staff->phone)) {
                            continue;
                        }

                        // Bugün bu personele doğum günü SMS'i zaten gönderilmiş mi kontrol et
                        if (!$this->forceImmediate) {
                            $alreadySent = SmsReport::where('tenant_id', $tenant->id)
                                ->where('sender_type', 'birthday_staff')
                                ->where('sender_id', $staff->id)
                                ->whereDate('created_at', $todayDateString)
                                ->exists();

                            if ($alreadySent) {
                                continue;
                            }
                        }

                        $age = $staff->birth_date ? Carbon::parse($staff->birth_date)->age : '';
                        $message = str_replace(
                            ['{ad_soyad}', '{kurum_adi}', '{yas}'],
                            [$staff->name, $tenantName, (string) $age],
                            $staffTemplate
                        );

                        SendSmsJob::dispatch([$staff->phone], $message, $tenant->id, 'birthday_staff', $staff->id);
                        Log::info("Otomatik doğum günü SMS'i personele gönderildi", [
                            'tenant_id' => $tenant->id,
                            'staff_id' => $staff->id,
                            'phone' => $staff->phone,
                        ]);
                    }
                }

                // ==========================================
                // 2. Öğrenci & Veli Doğum Günü SMS Otomasyonu
                // ==========================================
                $studentEnabled = isset($dbSettings['birthday_student_enabled'])
                    ? in_array($dbSettings['birthday_student_enabled'], ['1', 'true', true], true)
                    : true;
                $studentTime = $dbSettings['birthday_student_time'] ?? '09:30';
                $studentRecipient = $dbSettings['birthday_student_recipient'] ?? 'both';
                $studentTemplate = $dbSettings['birthday_student_template']
                    ?? "Sevgili {ogrenci_adi}, {kurum_adi} ailesi olarak yeni yaşını en içten dileklerimizle kutlar; sağlık, mutluluk ve üstün başarılar dileriz.";
                $guardianTemplate = $dbSettings['birthday_guardian_template']
                    ?? "Sayın Velimiz, değerli öğrencimiz {ogrenci_adi}'nin doğum gününü {kurum_adi} ailesi olarak kutlar; evladınızla birlikte sağlıklı, huzurlu ve başarılı nice mutlu yaşlar dileriz.";

                // Eğer zamanı gelmediyse (ve manuel zorlama değilse) atla
                $canSendStudent = $studentEnabled && ($this->forceImmediate || $currentTime >= $studentTime);

                if ($canSendStudent) {
                    $students = Student::where('tenant_id', $tenant->id)
                        ->where('is_active', true)
                        ->whereNotNull('birth_date')
                        ->where('birth_date', '!=', '0000-00-00')
                        ->whereRaw('DAY(birth_date) = ?', [$day])
                        ->whereRaw('MONTH(birth_date) = ?', [$month])
                        ->with(['guardians', 'classroom'])
                        ->get();

                    foreach ($students as $student) {
                        $age = $student->birth_date ? Carbon::parse($student->birth_date)->age : '';
                        $className = $student->classroom?->name ?? '';
                        $schoolNo = $student->school_no ?? '';

                        // A. Öğrencinin Kendi Telefonuna Gönderim (Kendi şablonuyla)
                        if (($studentRecipient === 'student' || $studentRecipient === 'both') && !empty($student->phone)) {
                            $alreadySentStudent = false;
                            if (!$this->forceImmediate) {
                                $alreadySentStudent = SmsReport::where('tenant_id', $tenant->id)
                                    ->where('sender_type', 'birthday_student')
                                    ->where('sender_id', $student->id)
                                    ->whereDate('created_at', $todayDateString)
                                    ->exists();
                            }

                            if (!$alreadySentStudent) {
                                $studentMsg = str_replace(
                                    ['{ogrenci_adi}', '{okul_no}', '{sinif}', '{kurum_adi}', '{yas}'],
                                    [$student->name, $schoolNo, $className, $tenantName, (string) $age],
                                    $studentTemplate
                                );

                                SendSmsJob::dispatch([$student->phone], $studentMsg, $tenant->id, 'birthday_student', $student->id);
                                Log::info("Otomatik doğum günü SMS'i öğrenciye gönderildi", [
                                    'tenant_id' => $tenant->id,
                                    'student_id' => $student->id,
                                    'phone' => $student->phone,
                                ]);
                            }
                        }

                        // B. Velilere (Anne & Baba) Gönderim (Ayrı veli şablonuyla - Öğrencinin telefonu olmasa bile velilere mutlaka gider)
                        if (($studentRecipient === 'guardian' || $studentRecipient === 'both') && $student->guardians && $student->guardians->isNotEmpty()) {
                            foreach ($student->guardians as $guardian) {
                                if (empty($guardian->phone)) {
                                    continue;
                                }

                                $alreadySentGuardian = false;
                                if (!$this->forceImmediate) {
                                    $alreadySentGuardian = SmsReport::where('tenant_id', $tenant->id)
                                        ->where('sender_type', 'birthday_guardian')
                                        ->where('sender_id', $student->id)
                                        ->where('phone', $guardian->phone)
                                        ->whereDate('created_at', $todayDateString)
                                        ->exists();
                                }

                                if (!$alreadySentGuardian) {
                                    $guardianMsg = str_replace(
                                        ['{ogrenci_adi}', '{veli_adi}', '{okul_no}', '{sinif}', '{kurum_adi}', '{yas}'],
                                        [$student->name, $guardian->name ?: 'Velimiz', $schoolNo, $className, $tenantName, (string) $age],
                                        $guardianTemplate
                                    );

                                    SendSmsJob::dispatch([$guardian->phone], $guardianMsg, $tenant->id, 'birthday_guardian', $student->id);
                                    Log::info("Otomatik doğum günü SMS'i veliye gönderildi", [
                                        'tenant_id' => $tenant->id,
                                        'student_id' => $student->id,
                                        'guardian_id' => $guardian->id,
                                        'guardian_phone' => $guardian->phone,
                                        'relation' => $guardian->pivot?->relation_type ?? 'veli',
                                    ]);
                                }
                            }
                        }
                    }
                }
            }

            Log::info('Birthday SMS automation executed successfully.', ['tenant_id' => $this->tenantId]);
        } catch (\Exception $e) {
            Log::error('Birthday SMS automation failed: ' . $e->getMessage());
            throw $e;
        }
    }
}
