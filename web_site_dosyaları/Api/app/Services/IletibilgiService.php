<?php

namespace App\Services;

use App\Contracts\SmsServiceInterface;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;

class IletibilgiService implements SmsServiceInterface
{
    protected string $baseUrl;
    protected string $username;
    protected string $password;
    protected string $sender;

    public function __construct(string $username, string $password, string $sender, ?string $baseUrl = null)
    {
        $this->username = trim($username);
        $this->password = trim($password);
        $this->sender = trim($sender);
        $this->baseUrl = rtrim($baseUrl ?: 'https://panel.iletibilgi.com.tr:9588', '/');
    }

    /**
     * Send SMS to one or multiple phone numbers.
     *
     * @param  string|array  $phones
     * @param  string  $message
     * @return array
     */
    public function send(string|array $phones, string $message, ?string $title = null): array
    {
        $rawList = is_array($phones) ? array_values(array_filter($phones)) : [trim($phones)];
        if (empty($rawList)) {
            return ['success' => false, 'message' => 'Telefon numarası bulunamadı.', 'message_id' => null];
        }

        // Numaraları string formatında normalize et (905XXXXXXXXX)
        $phoneList = [];
        foreach ($rawList as $phone) {
            $cleaned = preg_replace('/[^0-9]/', '', (string) $phone);
            if (strlen($cleaned) === 10) $cleaned = '90' . $cleaned;
            elseif (strlen($cleaned) === 11 && str_starts_with($cleaned, '0')) $cleaned = '9' . $cleaned;
            if (strlen($cleaned) >= 10) {
                $phoneList[] = $cleaned;
            }
        }

        if (empty($phoneList)) {
            return ['success' => false, 'message' => 'Geçerli telefon numarası bulunamadı.', 'message_id' => null];
        }

        $rawTitle = trim((string)$title);
        if (empty($rawTitle)) {
            $pkgTitle = 'EDULEM TOPLU SMS';
        } elseif (mb_strlen($rawTitle) < 5) {
            $pkgTitle = $rawTitle . ' SMS';
        } else {
            $pkgTitle = mb_substr($rawTitle, 0, 50);
        }

        try {
            // testConnection ile birebir aynı çalışan format
            if (count($phoneList) === 1) {
                $payload = [
                    'type'        => 1,
                    'sendingType' => 0,
                    'title'       => $pkgTitle,
                    'number'      => (string) $phoneList[0],
                    'sender'      => $this->sender,
                    'content'     => $message,
                    'encoding'    => 1,
                ];
            } else {
                $payload = [
                    'type'        => 1,
                    'sendingType' => 1,
                    'title'       => $pkgTitle,
                    'numbers'     => array_values($phoneList),
                    'sender'      => $this->sender,
                    'content'     => $message,
                    'encoding'    => 1,
                ];
            }

            Log::info('IletibilgiService send payload', [
                'url'     => "{$this->baseUrl}/sms/create",
                'sender'  => $this->sender,
                'payload' => $payload,
            ]);

            $response = Http::withoutVerifying()
                ->withBasicAuth($this->username, $this->password)
                ->timeout(30)
                ->post("{$this->baseUrl}/sms/create", $payload);

            $data = $response->json();

            Log::info('IletibilgiService send response', [
                'status' => $response->status(),
                'body'   => $data,
            ]);

            if ($response->successful()) {
                $pkgId = data_get($data, 'data.pkgID')
                    ?? data_get($data, 'pkgID')
                    ?? data_get($data, 'data.id')
                    ?? data_get($data, 'id');

                if ($pkgId) {
                    return [
                        'success'    => true,
                        'message_id' => (string) $pkgId,
                        'message'    => 'SMS başarıyla gönderildi.',
                        'data'       => $data,
                    ];
                }

                if (isset($data['err']) && !empty($data['err']['message'])) {
                    return [
                        'success'    => false,
                        'message_id' => null,
                        'error_code' => data_get($data, 'err.code'),
                        'message'    => data_get($data, 'err.message') ?: 'İleti Bilgi API hatası',
                    ];
                }

                return [
                    'success'    => true,
                    'message_id' => null,
                    'message'    => 'İstek iletildi.',
                    'data'       => $data,
                ];
            }

            $errMsg = data_get($data, 'err.message') ?: $response->body() ?: 'Bağlantı hatası';
            return [
                'success'    => false,
                'message_id' => null,
                'error_code' => (string) $response->status(),
                'message'    => "HTTP {$response->status()}: {$errMsg}",
            ];
        } catch (\Exception $e) {
            Log::error('IletibilgiService send error', ['error' => $e->getMessage()]);
            return [
                'success'    => false,
                'message_id' => null,
                'message'    => $e->getMessage(),
            ];
        }
    }

    /**
     * Get user / credit information from Iletibilgi API (mirroring PhpSmsApi getCredit and getSenders).
     */
    public function getUserInfo(): array
    {
        try {
            $credit = null;
            $senders = [];
            $rawResponses = [];

            // 1. POST /user/credit (PhpSmsApi SDK)
            try {
                $creditRes = Http::withoutVerifying()
                    ->withBasicAuth($this->username, $this->password)
                    ->timeout(10)
                    ->withHeaders(['Content-Type' => 'application/json'])
                    ->post("{$this->baseUrl}/user/credit");

                $cJson = $creditRes->json();
                $rawResponses['user_credit'] = $cJson;

                if ($creditRes->successful() && is_array($cJson)) {
                    $credit = data_get($cJson, 'data.credit') 
                        ?? data_get($cJson, 'credit')
                        ?? data_get($cJson, 'data.balance')
                        ?? data_get($cJson, 'balance');
                }
            } catch (\Exception $e) {
                Log::warning('Iletibilgi getUserInfo /user/credit error', ['error' => $e->getMessage()]);
            }

            // If still null, try GET /user/credit or /sms/credit
            if ($credit === null) {
                foreach (['/user/credit', '/sms/credit', '/user/balance'] as $p) {
                    try {
                        $res = Http::withoutVerifying()
                            ->withBasicAuth($this->username, $this->password)
                            ->timeout(6)
                            ->get("{$this->baseUrl}{$p}");
                        $json = $res->json();
                        if ($res->successful() && is_array($json)) {
                            $found = data_get($json, 'data.credit') ?? data_get($json, 'credit') ?? data_get($json, 'data.balance') ?? data_get($json, 'balance');
                            if ($found !== null) {
                                $credit = $found;
                                $rawResponses[$p] = $json;
                                break;
                            }
                        }
                    } catch (\Exception $e) {}
                }
            }

            // 2. POST /sms/list-sender (PhpSmsApi SDK)
            try {
                $sendersRes = Http::withoutVerifying()
                    ->withBasicAuth($this->username, $this->password)
                    ->timeout(10)
                    ->withHeaders(['Content-Type' => 'application/json'])
                    ->post("{$this->baseUrl}/sms/list-sender");

                $sJson = $sendersRes->json();
                $rawResponses['list_sender'] = $sJson;

                if ($sendersRes->successful() && is_array($sJson)) {
                    $list = data_get($sJson, 'data.list') ?? data_get($sJson, 'list') ?? [];
                    foreach ($list as $item) {
                        if (!empty($item['title'])) {
                            $senders[] = $item['title'];
                        }
                    }
                }
            } catch (\Exception $e) {
                Log::warning('Iletibilgi getUserInfo /sms/list-sender error', ['error' => $e->getMessage()]);
            }

            Log::info('Iletibilgi getUserInfo result', [
                'credit' => $credit,
                'senders' => $senders,
                'raw' => $rawResponses,
            ]);

            return [
                'success' => true,
                'data' => [
                    'credit'      => $credit !== null ? $credit : 0,
                    'balance'     => $credit !== null ? $credit : 0,
                    'usedCredit'  => 0,
                    'originators' => array_values(array_unique($senders)),
                    'company'     => $this->username,
                    'username'    => $this->username,
                    'raw'         => $rawResponses,
                ],
            ];
        } catch (\Exception $e) {
            return [
                'success' => false,
                'message' => $e->getMessage(),
            ];
        }
    }

    /**
     * Send personalized dynamic SMS to multiple recipients.
     * Each item in $items: ['phone' => string, 'message' => string]
     *
     * @param  array  $items
     * @param  string|null  $title
     * @return array
     */
    public function sendDynamic(array $items, ?string $title = null): array
    {
        $numbers = [];
        foreach ($items as $item) {
            $phone = $item['phone'] ?? '';
            $msg = $item['message'] ?? '';
            if (empty($phone) || empty($msg)) {
                continue;
            }
            $cleaned = preg_replace('/[^0-9]/', '', (string) $phone);
            if (strlen($cleaned) === 10) $cleaned = '90' . $cleaned;
            elseif (strlen($cleaned) === 11 && str_starts_with($cleaned, '0')) $cleaned = '9' . $cleaned;

            if (strlen($cleaned) >= 10) {
                $numbers[] = [
                    'nr'  => (string) $cleaned,
                    'msg' => (string) $msg,
                ];
            }
        }

        if (empty($numbers)) {
            return ['success' => false, 'message' => 'Geçerli telefon ve mesaj bulunamadı.', 'message_id' => null];
        }

        $rawTitle = trim((string)$title);
        if (empty($rawTitle)) {
            $pkgTitle = 'EDULEM SINAV SONUCU';
        } elseif (mb_strlen($rawTitle) < 5) {
            $pkgTitle = $rawTitle . ' SMS';
        } else {
            $pkgTitle = mb_substr($rawTitle, 0, 50);
        }

        try {
            $payload = [
                'type'        => 1,
                'sendingType' => 2,
                'title'       => $pkgTitle,
                'sender'      => $this->sender,
                'content'     => 'Dinamik SMS',
                'encoding'    => 1,
                'numbers'     => $numbers,
            ];

            Log::info('IletibilgiService sendDynamic payload', [
                'url'         => "{$this->baseUrl}/sms/create",
                'sender'      => $this->sender,
                'total_items' => count($numbers),
            ]);

            $response = Http::withoutVerifying()
                ->withBasicAuth($this->username, $this->password)
                ->timeout(60)
                ->post("{$this->baseUrl}/sms/create", $payload);

            $data = $response->json();

            Log::info('IletibilgiService sendDynamic response', [
                'status' => $response->status(),
                'body'   => $data,
            ]);

            if ($response->successful()) {
                $pkgId = data_get($data, 'data.pkgID')
                    ?? data_get($data, 'pkgID')
                    ?? data_get($data, 'data.id')
                    ?? data_get($data, 'id');

                if ($pkgId) {
                    return [
                        'success'    => true,
                        'message_id' => (string) $pkgId,
                        'message'    => 'Dinamik SMS başarıyla gönderildi.',
                        'data'       => $data,
                    ];
                }

                if (isset($data['err']) && !empty($data['err']['message'])) {
                    return [
                        'success'    => false,
                        'message_id' => null,
                        'error_code' => data_get($data, 'err.code'),
                        'message'    => data_get($data, 'err.message') ?: 'İleti Bilgi API hatası',
                    ];
                }

                return [
                    'success'    => true,
                    'message_id' => null,
                    'message'    => 'İstek iletildi.',
                    'data'       => $data,
                ];
            }

            $errMsg = data_get($data, 'err.message') ?: $response->body() ?: 'Bağlantı hatası';
            return [
                'success'    => false,
                'message_id' => null,
                'error_code' => (string) $response->status(),
                'message'    => "HTTP {$response->status()}: {$errMsg}",
            ];
        } catch (\Exception $e) {
            Log::error('IletibilgiService sendDynamic error', ['error' => $e->getMessage()]);
            return [
                'success'    => false,
                'message_id' => null,
                'message'    => $e->getMessage(),
            ];
        }
    }
}

