<?php

namespace App\Services;

use App\Models\DeviceToken;
use App\Models\Message;
use App\Models\User;
use GuzzleHttp\Client;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Str;

class FcmService
{
    protected Client $httpClient;
    protected ?string $projectId;
    protected ?string $credentialsPath;
    protected ?string $serverKey;

    public function __construct()
    {
        $this->httpClient = new Client(['timeout' => 10]);
        $this->projectId = config('services.firebase.project_id', env('FIREBASE_PROJECT_ID', 'edulem-50022'));
        $this->credentialsPath = $this->resolveCredentialsPath();
        $this->serverKey = config('services.firebase.server_key', env('FCM_SERVER_KEY'));
    }

    protected function resolveCredentialsPath(): string
    {
        $candidates = [
            config('services.firebase.credentials'),
            env('FIREBASE_CREDENTIALS'),
            storage_path('app/firebase-credentials.json'),
            storage_path('firebase-credentials.json'),
            storage_path('app/firebase-credentials.json.json'),
            storage_path('firebase-credentials.json.json'),
        ];

        foreach ($candidates as $path) {
            if (!empty($path) && file_exists($path)) {
                return $path;
            }
        }

        return storage_path('app/firebase-credentials.json');
    }

    /**
     * Tek bir kullanıcıya bildirim gönder ve veritabanına kaydet
     */
    public function sendToUser(int $userId, string $title, string $body, array $data = [], ?int $badge = null, string $userType = 'user'): bool
    {
        return $this->sendToUsers([$userId], $title, $body, $data, $badge, $userType);
    }

    /**
     * Tek bir öğrenciye bildirim gönder
     */
    public function sendToStudent(int $studentId, string $title, string $body, array $data = [], ?int $badge = null): bool
    {
        return $this->sendToUsers([$studentId], $title, $body, $data, $badge, 'student');
    }

    /**
     * Birden fazla öğrenciye bildirim gönder
     */
    public function sendToStudents(array $studentIds, string $title, string $body, array $data = [], ?int $badge = null): bool
    {
        return $this->sendToUsers($studentIds, $title, $body, $data, $badge, 'student');
    }

    /**
     * Birden fazla kullanıcıya bildirim gönder ve veritabanına kaydet
     */
    public function sendToUsers(array $userIds, string $title, string $body, array $data = [], ?int $badge = null, string $userType = 'user'): bool
    {
        if (empty($userIds)) {
            return false;
        }

        try {
            $userModelClass = ($userType === 'student') ? \App\Models\Student::class : User::class;
            $users = $userModelClass::whereIn('id', $userIds)->get();

            foreach ($users as $user) {
                // 1. Veritabanı notifications tablosuna kaydet
                $this->saveDatabaseNotification($user, $title, $body, $data, $userType);

                // 2. Kullanıcının güncel rozet (badge) sayısını hesapla
                $userBadge = $badge ?? $this->calculateUserUnreadCount($user, $userType);

                // 3. Kullanıcının aktif cihaz token'larını bul
                $tokens = DeviceToken::where('user_type', $userType)
                    ->where('user_id', $user->id)
                    ->pluck('token')
                    ->filter()
                    ->unique()
                    ->toArray();

                if (empty($tokens)) {
                    continue;
                }

                // 4. Cihazlara push gönder
                foreach ($tokens as $token) {
                    $this->sendPushToToken($token, $title, $body, $data, $userBadge);
                }
            }

            return true;
        } catch (\Throwable $e) {
            Log::error('FcmService sendToUsers genel hata: ' . $e->getMessage());
            return false;
        }
    }

    /**
     * Veritabanına notification kaydı oluştur
     */
    protected function saveDatabaseNotification($user, string $title, string $body, array $data, string $userType = 'user'): void
    {
        try {
            $notifiableClass = ($userType === 'student') ? \App\Models\Student::class : User::class;
            DB::table('notifications')->insert([
                'id' => (string) Str::uuid(),
                'type' => $data['type'] ?? 'general',
                'notifiable_type' => $notifiableClass,
                'notifiable_id' => $user->id,
                'data' => json_encode([
                    'title' => $title,
                    'message' => $body,
                    'extra' => $data,
                ], JSON_UNESCAPED_UNICODE),
                'read_at' => null,
                'created_at' => now(),
                'updated_at' => now(),
            ]);
        } catch (\Throwable $e) {
            Log::warning('Database notification kaydedilemedi: ' . $e->getMessage());
        }
    }

    /**
     * Kullanıcının toplam okunmamış bildirim + mesaj sayısını hesapla
     */
    public function calculateUserUnreadCount($user, string $userType = 'user'): int
    {
        try {
            $notifiableClass = ($userType === 'student') ? \App\Models\Student::class : User::class;

            $unreadNotifications = DB::table('notifications')
                ->where('notifiable_type', $notifiableClass)
                ->where('notifiable_id', $user->id)
                ->whereNull('read_at')
                ->count();

            if ($userType === 'student') {
                return $unreadNotifications;
            }

            $unreadMessages = Message::where('receiver_id', $user->id)
                ->where('is_read', false)
                ->count();

            return $unreadMessages + $unreadNotifications;
        } catch (\Throwable $e) {
            return 1;
        }
    }

    /**
     * Belirli bir FCM Token'a push gönder
     */
    protected function sendPushToToken(string $token, string $title, string $body, array $data, int $badge): void
    {
        // 1. Google OAuth2 Service Account ile HTTP v1 Gönderimi (Önerilen)
        if ($this->credentialsPath && file_exists($this->credentialsPath)) {
            $this->sendViaHttpV1($token, $title, $body, $data, $badge);
            return;
        }

        // 2. Legacy FCM Server Key Gönderimi (Eğer varsa)
        if ($this->serverKey) {
            $this->sendViaLegacy($token, $title, $body, $data, $badge);
            return;
        }

        // 3. Kimlik bilgisi henüz tanımlanmamışsa simüle et ve logla
        Log::info("FCM Push Simülasyonu (Token: " . substr($token, 0, 15) . "...): Başlık='{$title}', İçerik='{$body}', Rozet={$badge}");
    }

    /**
     * Firebase HTTP v1 API üzerinden gönderim
     */
    protected function sendViaHttpV1(string $token, string $title, string $body, array $data, int $badge): void
    {
        try {
            $accessToken = $this->getGoogleAccessToken();
            if (!$accessToken) {
                Log::warning('FCM HTTP v1 Access Token alınamadı.');
                return;
            }

            $url = "https://fcm.googleapis.com/v1/projects/{$this->projectId}/messages:send";

            // Data string tipinde olmalı
            $formattedData = [];
            foreach ($data as $k => $v) {
                $formattedData[(string) $k] = is_array($v) ? json_encode($v, JSON_UNESCAPED_UNICODE) : (string) $v;
            }

            $payload = [
                'message' => [
                    'token' => $token,
                    'notification' => [
                        'title' => $title,
                        'body' => $body,
                    ],
                    'data' => $formattedData,
                    'android' => [
                        'priority' => 'high',
                        'notification' => [
                            'sound' => 'default',
                            'channel_id' => 'messages_channel',
                            'notification_count' => $badge,
                        ],
                    ],
                    'apns' => [
                        'payload' => [
                            'aps' => [
                                'sound' => 'default',
                                'badge' => $badge,
                                'alert' => [
                                    'title' => $title,
                                    'body' => $body,
                                ],
                            ],
                        ],
                    ],
                ],
            ];

            $response = $this->httpClient->post($url, [
                'headers' => [
                    'Authorization' => "Bearer {$accessToken}",
                    'Content-Type' => 'application/json',
                ],
                'json' => $payload,
                'http_errors' => false,
            ]);

            $status = $response->getStatusCode();
            if ($status >= 400) {
                $resBody = (string) $response->getBody();
                Log::warning("FCM HTTP v1 Yanıt Hatası ({$status}): {$resBody}");

                // Geçersiz token ise veritabanından temizle
                if ($status === 404 || str_contains($resBody, 'UNREGISTERED')) {
                    DeviceToken::where('token', $token)->delete();
                }
            }
        } catch (\Throwable $e) {
            Log::error('sendViaHttpV1 hata: ' . $e->getMessage());
        }
    }

    /**
     * Eski FCM Legacy API üzerinden gönderim
     */
    protected function sendViaLegacy(string $token, string $title, string $body, array $data, int $badge): void
    {
        try {
            $url = 'https://fcm.googleapis.com/fcm/send';

            $payload = [
                'to' => $token,
                'notification' => [
                    'title' => $title,
                    'body' => $body,
                    'sound' => 'default',
                    'badge' => $badge,
                ],
                'data' => $data,
                'priority' => 'high',
            ];

            $response = $this->httpClient->post($url, [
                'headers' => [
                    'Authorization' => "key={$this->serverKey}",
                    'Content-Type' => 'application/json',
                ],
                'json' => $payload,
                'http_errors' => false,
            ]);

            if ($response->getStatusCode() >= 400) {
                Log::warning('FCM Legacy Yanıt: ' . (string) $response->getBody());
            }
        } catch (\Throwable $e) {
            Log::error('sendViaLegacy hata: ' . $e->getMessage());
        }
    }

    /**
     * Google Service Account JSON dosyasından OAuth2 Access Token üret
     */
    protected function getGoogleAccessToken(): ?string
    {
        try {
            if (!file_exists($this->credentialsPath)) {
                return null;
            }

            $credentials = json_decode(file_get_contents($this->credentialsPath), true);
            if (!$credentials || empty($credentials['private_key']) || empty($credentials['client_email'])) {
                return null;
            }

            $now = time();
            $header = ['alg' => 'RS256', 'typ' => 'JWT'];
            $claim = [
                'iss' => $credentials['client_email'],
                'scope' => 'https://www.googleapis.com/auth/firebase.messaging',
                'aud' => 'https://oauth2.googleapis.com/token',
                'iat' => $now,
                'exp' => $now + 3600,
            ];

            $base64UrlHeader = $this->base64UrlEncode(json_encode($header));
            $base64UrlClaim = $this->base64UrlEncode(json_encode($claim));

            $signatureInput = $base64UrlHeader . '.' . $base64UrlClaim;
            openssl_sign($signatureInput, $signature, $credentials['private_key'], 'SHA256');
            $jwt = $signatureInput . '.' . $this->base64UrlEncode($signature);

            $res = $this->httpClient->post('https://oauth2.googleapis.com/token', [
                'form_params' => [
                    'grant_type' => 'urn:ietf:params:oauth:grant-type:jwt-bearer',
                    'assertion' => $jwt,
                ],
                'http_errors' => false,
            ]);

            if ($res->getStatusCode() === 200) {
                $tokenData = json_decode((string) $res->getBody(), true);
                return $tokenData['access_token'] ?? null;
            }

            return null;
        } catch (\Throwable $e) {
            Log::error('Google Access Token oluşturulamadı: ' . $e->getMessage());
            return null;
        }
    }

    protected function base64UrlEncode(string $data): string
    {
        return str_replace(['+', '/', '='], ['-', '_', ''], base64_encode($data));
    }
}
