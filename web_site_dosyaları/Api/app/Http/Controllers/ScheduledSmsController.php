<?php

namespace App\Http\Controllers;

use App\Actions\CreateScheduledSmsAction;
use App\Http\Requests\StoreScheduledSmsRequest;
use App\Http\Resources\ScheduledSmsResource;
use App\Jobs\ProcessScheduledSmsJob;
use App\Models\ScheduledSms;
use App\Services\ActivityLogService;
use App\Services\IletibilgiService;
use Carbon\Carbon;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Gate;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;

class ScheduledSmsController extends ApiController
{
    protected ActivityLogService $activityLogService;

    public function __construct(ActivityLogService $activityLogService)
    {
        $this->activityLogService = $activityLogService;
    }

    /**
     * Get SMS settings from database for current tenant
     */
    public function getSettings(): JsonResponse
    {
        $user = auth()->user();
        $tenantId = $user?->tenant_id;
        $settings = [];
        if ($tenantId) {
            $settings = DB::table('settings')
                ->where('tenant_id', $tenantId)
                ->where('group', 'sms')
                ->pluck('value', 'key')
                ->toArray();

            // Sadece Ak İrfan (tenant 1 / legacy) için eski tenant_id = null kayıtlarına fallback yap
            if (empty($settings['iletibilgi_username']) && (int)$tenantId === 1) {
                $fallbackSettings = DB::table('settings')
                    ->whereNull('tenant_id')
                    ->whereIn('key', ['iletibilgi_username', 'iletibilgi_password', 'iletibilgi_sender', 'iletibilgi_base_url', 'iletibilgi_enabled'])
                    ->whereNotNull('value')
                    ->where('value', '!=', '')
                    ->pluck('value', 'key')
                    ->toArray();
                $settings = array_merge($fallbackSettings, array_filter($settings));
            }
        }

        $username = $settings['iletibilgi_username'] ?? '';
        $password = $settings['iletibilgi_password'] ?? '';
        $baseUrl  = $settings['iletibilgi_base_url'] ?? 'https://panel.iletibilgi.com.tr:9588';

        $credit = null;
        $usedCredit = 0;
        $originators = [];

        if ($tenantId) {
            $usedCredit = \App\Models\SmsReport::where('tenant_id', $tenantId)->where('status', 'sent')->count();
        } else {
            $usedCredit = \App\Models\SmsReport::where('status', 'sent')->count();
        }

        if (!empty($username) && !empty($password)) {
            try {
                $service = new IletibilgiService($username, $password, '', $baseUrl);
                $info = $service->getUserInfo();
                if (!empty($info['success']) && isset($info['data'])) {
                    $credit = $info['data']['credit'] ?? null;
                    $originators = $info['data']['originators'] ?? [];
                }
            } catch (\Exception $e) {}
        }

        $defaultSender = ((int)$tenantId === 1) ? 'AK IRFAN' : '';

        return $this->success([
            'username'    => $username,
            'password'    => $password,
            'base_url'    => $baseUrl,
            'sender'      => $settings['iletibilgi_sender'] ?? $defaultSender,
            'enabled'     => ($settings['iletibilgi_enabled'] ?? '0') === '1' || ($settings['iletibilgi_enabled'] ?? 'false') === 'true',
            'credit'      => $credit,
            'balance'     => $credit,
            'usedCredit'  => $usedCredit,
            'originators' => $originators,
        ], 'SMS ayarları getirildi.');
    }

    /**
     * Save SMS settings to database for current tenant
     */
    public function saveSettings(Request $request): JsonResponse
    {
        $tenantId = auth()->user()?->tenant_id;
        $validated = $request->validate([
            'username' => 'required|string',
            'password' => 'required|string',
            'base_url' => 'nullable|string',
            'sender' => 'required|string',
            'enabled' => 'nullable',
        ]);

        if ($tenantId) {
            $enabledVal = !empty($validated['enabled']) && ($validated['enabled'] === true || $validated['enabled'] === 'true' || $validated['enabled'] === 1 || $validated['enabled'] === '1') ? '1' : '0';
            $keys = [
                'iletibilgi_username' => trim($validated['username']),
                'iletibilgi_password' => trim($validated['password']),
                'iletibilgi_base_url' => rtrim($validated['base_url'] ?? 'https://panel.iletibilgi.com.tr:9588', '/'),
                'iletibilgi_sender' => trim($validated['sender']),
                'iletibilgi_enabled' => $enabledVal,
                'sms_driver' => 'iletibilgi',
            ];

            foreach ($keys as $key => $val) {
                DB::table('settings')->updateOrInsert(
                    ['tenant_id' => $tenantId, 'key' => $key],
                    ['value' => $val, 'group' => 'sms', 'updated_at' => now(), 'created_at' => now()]
                );
            }
        }

        return $this->success(null, 'SMS API Ayarları başarıyla veritabanına kaydedildi.');
    }

    /**
     * Get user account / credit / remaining SMS info from Iletibilgi API
     */
    public function userInfo(Request $request): JsonResponse
    {
        $tenantId = auth()->user()?->tenant_id;
        $settings = [];
        if ($tenantId) {
            $settings = DB::table('settings')
                ->where('tenant_id', $tenantId)
                ->where('group', 'sms')
                ->pluck('value', 'key')
                ->toArray();
        }

        if (empty($settings['iletibilgi_username']) && (int)$tenantId === 1) {
            $fallbackSettings = DB::table('settings')
                ->whereNull('tenant_id')
                ->whereIn('key', ['iletibilgi_username', 'iletibilgi_password', 'iletibilgi_sender', 'iletibilgi_base_url', 'iletibilgi_enabled'])
                ->whereNotNull('value')
                ->where('value', '!=', '')
                ->pluck('value', 'key')
                ->toArray();
            $settings = array_merge($fallbackSettings, array_filter($settings));
        }

        $username = trim($request->input('username') ?: ($settings['iletibilgi_username'] ?? ''));
        $password = trim($request->input('password') ?: ($settings['iletibilgi_password'] ?? ''));
        $baseUrl = trim($request->input('base_url') ?: ($settings['iletibilgi_base_url'] ?? 'https://panel.iletibilgi.com.tr:9588'));

        if (empty($username) || empty($password)) {
            return $this->error('Lütfen önce API kullanıcı adı ve şifre alanlarını girin veya kaydedin.', [], 422);
        }

        $service = new IletibilgiService($username, $password, '', $baseUrl);
        $result = $service->getUserInfo();

        $systemUsedSms = 0;
        if ($tenantId) {
            $systemUsedSms = \App\Models\SmsReport::where('tenant_id', $tenantId)->where('status', 'sent')->count();
        } else {
            $systemUsedSms = \App\Models\SmsReport::where('status', 'sent')->count();
        }

        if ($result['success']) {
            $data = $result['data'];
            $data['usedCredit'] = $systemUsedSms;
            return $this->success($data, 'Kullanıcı ve bakiye bilgileri başarıyla alındı.');
        }

        return $this->error($result['message'] ?? 'Kullanıcı bilgileri alınamadı.', [
            'usedCredit' => $systemUsedSms,
            'details' => $result,
        ], 400);
    }

    /**
     * Test SMS connection (Proxy to bypass browser CORS)
     */
    public function testConnection(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'username' => 'required|string',
            'password' => 'required|string',
            'base_url' => 'nullable|string',
            'sender' => 'required|string',
            'phone' => 'required|string',
            'message' => 'required|string',
        ]);

        $baseUrl = rtrim($validated['base_url'] ?? 'https://panel.iletibilgi.com.tr:9588', '/');
        $username = trim($validated['username']);
        $password = trim($validated['password']);
        $sender = trim($validated['sender']);
        $phone = trim($validated['phone']);
        $message = trim($validated['message']);

        try {
            $response = Http::withBasicAuth($username, $password)
                ->timeout(15)
                ->post("{$baseUrl}/sms/create", [
                    'type' => 1,
                    'sendingType' => 0,
                    'title' => 'EDULEM TEST',
                    'number' => $phone,
                    'sender' => $sender,
                    'content' => $message,
                    'encoding' => 1,
                ]);

            $status = $response->status();
            $data = $response->json();

            if ($response->successful()) {
                $pkgId = data_get($data, 'data.pkgID');
                if ($pkgId) {
                    // Record in ScheduledSms and SmsReport tables so it appears in SMS History
                    $tenantId = auth()->user()?->tenant_id;
                    $userId = auth()->id();

                    $scheduled = ScheduledSms::create([
                        'tenant_id' => $tenantId,
                        'title' => 'Test SMS (' . $phone . ')',
                        'message' => $message,
                        'recipient_phones' => [$phone],
                        'recipient_type' => 'test',
                        'recipient_ids' => [],
                        'scheduled_at' => now(),
                        'sent_at' => now(),
                        'status' => 'completed',
                        'sent_count' => 1,
                        'failed_count' => 0,
                        'created_by' => $userId,
                    ]);

                    \App\Models\SmsReport::create([
                        'tenant_id' => $tenantId,
                        'phone' => $phone,
                        'message' => $message,
                        'status' => 'sent',
                        'message_id' => (string) $pkgId,
                        'sent_at' => now(),
                        'sender_type' => 'test_sms',
                        'sender_id' => $scheduled->id,
                        'created_by' => $userId,
                    ]);

                    return $this->success([
                        'pkgID' => $pkgId,
                        'data' => $data,
                    ], "SMS başarıyla gönderildi! Paket ID: {$pkgId} — Alıcı: {$phone}");
                }

                if (isset($data['err'])) {
                    $errCode = data_get($data, 'err.code', '');
                    $errMsg = $errCode === 'ERR_INVALID_SMS_SENDER'
                        ? "Gönderen Başlığı (\"{$sender}\") İleti Bilgi panelinizde tanımlı/onaylı değil. Lütfen İleti Bilgi hesabınızdaki onaylı başlık adını yazın."
                        : (data_get($data, 'err.message') ?: $errCode ?: 'Bilinmeyen hata');

                    return $this->error("API Hatası: {$errMsg}", $data, 422);
                }

                return $this->success($data, "İstek başarıyla iletildi.");
            }

            $errMsg = data_get($data, 'err.message') ?: $response->body() ?: 'Bağlantı hatası oluştu.';
            return $this->error("İleti Bilgi API Hatası (HTTP {$status}): {$errMsg}", $data ?? [], $status >= 400 && $status < 500 ? $status : 502);
        } catch (\Exception $e) {
            return $this->error("Bağlantı hatası: " . $e->getMessage(), [], 500);
        }
    }

    /**
     * Display a listing of scheduled SMS.
     */
    public function index(): JsonResponse
    {
        Gate::authorize('viewAny', ScheduledSms::class);

        // Cron gecikmesi durumunda fallback: SADECE zamanı gelmiş (scheduled_at <= now) ve bekleyen SMS'leri işle.
        // İleri tarihli planlanmış SMS'lere KESİNLİKLE dokunulmaz! (Türkiye saati Europe/Istanbul baz alınır)
        try {
            $tenantId = auth()->user()?->tenant_id;
            $nowTurkey = Carbon::now('Europe/Istanbul')->format('Y-m-d H:i:s');
            $dueQuery = ScheduledSms::whereIn('status', ['pending', 'processing'])
                ->where('scheduled_at', '<=', $nowTurkey);

            if ($tenantId) {
                $dueQuery->where('tenant_id', $tenantId);
            }

            $dueList = $dueQuery->get();
            foreach ($dueList as $due) {
                $this->dispatchSmsSynchronously($due);
            }
        } catch (\Throwable $e) {
            Log::error('index() içinde zamanı gelen SMS işleme hatası', ['error' => $e->getMessage()]);
        }

        try {
            $relations = ['creator'];
            if (method_exists(ScheduledSms::class, 'reports')) {
                $relations[] = 'reports';
            }
            $query = ScheduledSms::with($relations);

            // Filtreleme
            if (request()->filled('status')) {
                $query->where('status', request('status'));
            }

            if (request()->filled('scheduled_from')) {
                $query->where('scheduled_at', '>=', request('scheduled_from'));
            }

            if (request()->filled('scheduled_to')) {
                $query->where('scheduled_at', '<=', request('scheduled_to'));
            }

            $scheduledSms = $query->latest('id')->paginate(request('per_page', 50));

            // Hesaplamalar
            $stats = [
                'total' => ScheduledSms::count(),
                'pending' => ScheduledSms::where('status', 'pending')->count(),
                'processing' => ScheduledSms::where('status', 'processing')->count(),
                'completed' => ScheduledSms::where('status', 'completed')->count(),
                'failed' => ScheduledSms::where('status', 'failed')->count() + ScheduledSms::where('status', 'cancelled')->count(),
            ];

            return $this->success([
                'scheduled_sms' => ScheduledSmsResource::collection($scheduledSms),
                'statistics' => $stats,
                'pagination' => [
                    'current_page' => $scheduledSms->currentPage(),
                    'last_page' => $scheduledSms->lastPage(),
                    'per_page' => $scheduledSms->perPage(),
                    'total' => $scheduledSms->total(),
                ],
            ], 'Planlı SMS\'ler başarıyla listelendi.');
        } catch (\Throwable $e) {
            Log::error('ScheduledSmsController::index listeleme hatası', [
                'error' => $e->getMessage(),
                'trace' => $e->getTraceAsString(),
            ]);

            return $this->error('Planlı SMS geçmişi listelenirken bir hata oluştu: ' . $e->getMessage(), [], 500);
        }
    }

    /**
     * Store a newly created scheduled SMS.
     */
    public function store(StoreScheduledSmsRequest $request, CreateScheduledSmsAction $createAction): JsonResponse
    {
        Gate::authorize('create', ScheduledSms::class);

        $scheduledSms = $createAction->execute($request->validated());
        $freshSms = $scheduledSms->fresh();

        // Eğer kullanıcı ileri bir tarih/saat seçtiyse:
        // SMS bekleyen (pending) durumda kalır, hemen gönderilmez! (Türkiye saati Europe/Istanbul baz alınır)
        $nowTurkey = Carbon::now('Europe/Istanbul');
        $rawScheduled = $freshSms->getAttributes()['scheduled_at'] ?? null;
        $scheduledTime = $rawScheduled ? Carbon::parse($rawScheduled, 'Europe/Istanbul') : null;
        $hasScheduledParam = !empty($request->validated()['scheduled_at']);
        $isFutureScheduled = $hasScheduledParam && $scheduledTime && $scheduledTime->gt($nowTurkey);

        if (!$isFutureScheduled) {
            try {
                $this->dispatchSmsSynchronously($freshSms);
            } catch (\Exception $e) {
                Log::error('store() anında SMS gönderim hatası', ['error' => $e->getMessage()]);
            }

            return $this->success(
                new ScheduledSmsResource($freshSms->fresh()),
                'SMS gönderim işlemi başarıyla başlatıldı.',
                201
            );
        }

        return $this->success(
            new ScheduledSmsResource($freshSms),
            'SMS gönderimi belirlenen tarih ve saat için başarıyla planlandı.',
            201
        );
    }

    /**
     * Tek bir ScheduledSms kaydını senkron olarak gönderir.
     */
    public function dispatchSmsSynchronously(ScheduledSms $scheduledSms): void
    {
        if (!in_array($scheduledSms->status, ['pending', 'processing'])) {
            return;
        }

        // Güvenlik kontrolü: Zamanı henüz gelmemiş ileri tarihli SMS'leri kesinlikle gönderme!
        $nowTurkey = Carbon::now('Europe/Istanbul');
        $rawScheduled = $scheduledSms->getAttributes()['scheduled_at'] ?? null;
        if (!empty($rawScheduled)) {
            $scheduledTime = Carbon::parse($rawScheduled, 'Europe/Istanbul');
            if ($scheduledTime->gt($nowTurkey)) {
                Log::info('dispatchSmsSynchronously atlandı: Zamanı henüz gelmedi', [
                    'id' => $scheduledSms->id,
                    'scheduled_at' => $scheduledTime->toDateTimeString(),
                    'now_turkey' => $nowTurkey->toDateTimeString(),
                ]);
                return;
            }
        }

        $scheduledSms->markAsProcessing();

        // Alıcı telefon numaralarını çöz
        $rawPhones = $this->resolvePhones($scheduledSms);

        Log::info('dispatchSmsSynchronously: alıcılar', [
            'id' => $scheduledSms->id,
            'type' => $scheduledSms->recipient_type,
            'phones' => $rawPhones,
        ]);

        if (empty($rawPhones)) {
            $scheduledSms->markAsFailed('Alıcı telefon numarası bulunamadı.');
            return;
        }

        $tenantId = $scheduledSms->tenant_id ?: auth()->user()?->tenant_id;

        // Numaraları geçerli ve geçersiz olarak ayrıştır
        $validPhones = [];
        $invalidPhones = [];

        foreach ($rawPhones as $phoneStr) {
            $normalized = ScheduledSms::validateAndNormalizePhone($phoneStr);
            if ($normalized !== null) {
                $validPhones[$normalized] = $normalized;
            } else {
                $invalidPhones[$phoneStr] = $phoneStr;
            }
        }

        // Geçersiz formatlı numaralar için hemen hata raporu kaydet
        foreach ($invalidPhones as $invPhone) {
            \App\Models\SmsReport::create([
                'tenant_id'     => $tenantId,
                'phone'         => (string) $invPhone,
                'message'       => $scheduledSms->message,
                'status'        => 'failed',
                'error_code'    => 'INVALID_NUMBER_FORMAT',
                'error_message' => 'Geçersiz telefon numarası formatı (05XXXXXXXXX veya 905XXXXXXXXX olmalı)',
                'sent_at'       => null,
                'sender_type'   => 'scheduled_sms',
                'sender_id'     => $scheduledSms->id,
                'created_by'    => $scheduledSms->created_by,
            ]);
        }

        $validPhoneList = array_values($validPhones);
        $sentCount = 0;
        $failedCount = count($invalidPhones);

        if (!empty($validPhoneList)) {
            // SMS servisini oluştur
            $settings = [];
            if ($tenantId) {
                $settings = DB::table('settings')
                    ->where('tenant_id', $tenantId)
                    ->whereIn('key', ['iletibilgi_username', 'iletibilgi_password', 'iletibilgi_sender', 'iletibilgi_base_url'])
                    ->pluck('value', 'key')
                    ->toArray();
            }

            if (empty($settings['iletibilgi_username']) && (int)$tenantId === 1) {
                $fallbackSettings = DB::table('settings')
                    ->whereNull('tenant_id')
                    ->whereIn('key', ['iletibilgi_username', 'iletibilgi_password', 'iletibilgi_sender', 'iletibilgi_base_url'])
                    ->whereNotNull('value')
                    ->where('value', '!=', '')
                    ->pluck('value', 'key')
                    ->toArray();
                $settings = array_merge($fallbackSettings, array_filter($settings));
            }

            $username = $settings['iletibilgi_username'] ?? '';
            $password = $settings['iletibilgi_password'] ?? '';
            $sender   = $settings['iletibilgi_sender']   ?? ((int)$tenantId === 1 ? 'AK IRFAN' : '');
            $baseUrl  = $settings['iletibilgi_base_url']  ?? 'https://panel.iletibilgi.com.tr:9588';

            if (empty($username) || empty($password)) {
                foreach ($validPhoneList as $phone) {
                    \App\Models\SmsReport::create([
                        'tenant_id'     => $tenantId,
                        'phone'         => $phone,
                        'message'       => $scheduledSms->message,
                        'status'        => 'failed',
                        'error_message' => 'SMS API kullanıcı adı veya şifresi veritabanında bulunamadı.',
                        'sender_type'   => 'scheduled_sms',
                        'sender_id'     => $scheduledSms->id,
                        'created_by'    => $scheduledSms->created_by,
                    ]);
                }
                $scheduledSms->markAsFailed('SMS API kullanıcı adı veya şifresi veritabanında bulunamadı.');
                $scheduledSms->update(['sent_count' => 0, 'failed_count' => count($rawPhones)]);
                return;
            }

            $smsService = new IletibilgiService($username, $password, $sender, $baseUrl);
            $result     = $smsService->send($validPhoneList, $scheduledSms->message, $scheduledSms->title);

            foreach ($validPhoneList as $phone) {
                \App\Models\SmsReport::create([
                    'tenant_id'     => $tenantId,
                    'phone'         => $phone,
                    'message'       => $scheduledSms->message,
                    'status'        => $result['success'] ? 'sent' : 'failed',
                    'message_id'    => $result['message_id'] ?? null,
                    'error_code'    => $result['error_code'] ?? null,
                    'error_message' => $result['success'] ? null : ($result['message'] ?? 'SMS gönderilemedi'),
                    'sent_at'       => $result['success'] ? now() : null,
                    'sender_type'   => 'scheduled_sms',
                    'sender_id'     => $scheduledSms->id,
                    'created_by'    => $scheduledSms->created_by,
                ]);
            }

            if ($result['success']) {
                $sentCount += count($validPhoneList);
            } else {
                $failedCount += count($validPhoneList);
            }
        }

        if ($sentCount > 0 && $failedCount === 0) {
            $scheduledSms->markAsSent($sentCount, 0);
        } elseif ($sentCount > 0 && $failedCount > 0) {
            $scheduledSms->update([
                'status'       => 'completed',
                'sent_at'      => now(),
                'sent_count'   => $sentCount,
                'failed_count' => $failedCount,
            ]);
        } else {
            $scheduledSms->markAsFailed($failedCount > 0 ? "{$failedCount} alıcıya SMS iletilemedi." : 'SMS gönderilemedi.');
            $scheduledSms->update(['sent_count' => 0, 'failed_count' => $failedCount]);
        }
    }

    /**
     * Alıcı telefon numaralarını tiplerine ve hedef kitleye (anne/baba/öğrenci) göre döndürür.
     */
    protected function resolvePhones(ScheduledSms $scheduledSms): array
    {
        $phones = [];

        // 1. Eğer alıcı telefon numaraları açıkça belirtilmişse (örn: sadece anneler, sadece babalar veya manuel numaralar):
        $rawPhones = (array) ($scheduledSms->recipient_phones ?? []);
        if (!empty($rawPhones)) {
            foreach ($rawPhones as $phone) {
                $trimmed = trim((string) $phone);
                if (!empty($trimmed)) {
                    $phones[] = $trimmed;
                }
            }
            if (!empty($phones)) {
                return array_values(array_unique($phones));
            }
        }

        // Hedef kitle filtresi (mother, father, guardians, student, all)
        $targetAudience = request('target_audience') ?? ($scheduledSms->target_audience ?? 'all');

        $filterStudentPhones = function ($student) use (&$phones, $targetAudience) {
            // Öğrencinin kendi telefonu
            if (in_array($targetAudience, ['all', 'student'], true)) {
                if (!empty($student->phone)) {
                    $phones[] = $student->phone;
                }
            }

            // Veliler (Anne, Baba veya Tüm Veliler)
            if (in_array($targetAudience, ['all', 'guardians', 'mother', 'father'], true)) {
                foreach ($student->guardians as $g) {
                    if (empty($g->phone)) continue;

                    $rel = strtolower((string) ($g->pivot->relation_type ?? ''));
                    $isMother = in_array($rel, ['mother', 'anne'], true);
                    $isFather = in_array($rel, ['father', 'baba'], true);

                    if ($targetAudience === 'mother') {
                        if ($isMother) $phones[] = $g->phone;
                    } elseif ($targetAudience === 'father') {
                        if ($isFather) $phones[] = $g->phone;
                    } else {
                        // 'guardians' veya 'all'
                        $phones[] = $g->phone;
                    }
                }
            }
        };

        if ($scheduledSms->recipient_type === 'all') {
            $students = \App\Models\Student::where('tenant_id', $scheduledSms->tenant_id)->with('guardians')->get();
            foreach ($students as $s) {
                $filterStudentPhones($s);
            }
            return array_values(array_unique(array_filter($phones)));
        }

        if ($scheduledSms->recipient_type === 'classroom') {
            $ids = $scheduledSms->recipient_ids ?? [];
            $students = \App\Models\Student::where('tenant_id', $scheduledSms->tenant_id)->whereIn('classroom_id', $ids)->with('guardians')->get();
            foreach ($students as $s) {
                $filterStudentPhones($s);
            }
            return array_values(array_unique(array_filter($phones)));
        }

        if ($scheduledSms->recipient_type === 'students') {
            $ids = $scheduledSms->recipient_ids ?? [];
            $students = \App\Models\Student::where('tenant_id', $scheduledSms->tenant_id)->whereIn('id', $ids)->with('guardians')->get();
            foreach ($students as $s) {
                $filterStudentPhones($s);
            }
            return array_values(array_unique(array_filter($phones)));
        }

        if ($scheduledSms->recipient_type === 'users') {
            $ids = $scheduledSms->recipient_ids ?? [];
            return \App\Models\User::where('tenant_id', $scheduledSms->tenant_id)
                ->whereIn('id', $ids)->whereNotNull('phone')->pluck('phone')->unique()->values()->toArray();
        }

        return [];
    }

    /**
     * Display the specified scheduled SMS.
     */
    public function show(ScheduledSms $scheduledSms): JsonResponse
    {
        Gate::authorize('view', $scheduledSms);

        $relations = ['creator'];
        if (method_exists($scheduledSms, 'reports')) {
            $relations[] = 'reports';
        }
        $scheduledSms->load($relations);

        return $this->success(new ScheduledSmsResource($scheduledSms));
    }

    /**
     * Cancel a scheduled SMS.
     */
    public function cancel(ScheduledSms $scheduledSms): JsonResponse
    {
        Gate::authorize('cancel', $scheduledSms);

        if ($scheduledSms->status !== 'pending') {
            return $this->error('Sadece bekleyen SMS\'ler iptal edilebilir.', [], 400);
        }

        $scheduledSms->update(['status' => 'cancelled']);
        $this->activityLogService->logUpdate($scheduledSms);

        return $this->success(new ScheduledSmsResource($scheduledSms), 'Planlı SMS başarıyla iptal edildi.');
    }

    /**
     * Remove the specified scheduled SMS.
     */
    public function destroy(ScheduledSms $scheduledSms): JsonResponse
    {
        Gate::authorize('delete', $scheduledSms);

        $this->activityLogService->logDelete($scheduledSms);

        // İlgili SMS rapor kayıtlarını da temizle
        \App\Models\SmsReport::where('tenant_id', $scheduledSms->tenant_id)
            ->where('sender_id', (string) $scheduledSms->id)
            ->delete();

        $scheduledSms->delete();

        return $this->success(null, 'Planlı SMS başarıyla silindi.');
    }
}
