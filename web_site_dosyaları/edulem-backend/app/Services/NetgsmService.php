<?php

namespace App\Services;

use App\Contracts\SmsServiceInterface;
use Illuminate\Http\Client\Response;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;

class NetgsmService implements SmsServiceInterface
{
    /**
     * NetGSM API endpoint.
     *
     * @var string
     */
    protected string $endpoint = 'https://api.netgsm.com.tr/sms/send/get';

    /**
     * NetGSM username.
     *
     * @var string
     */
    protected string $username;

    /**
     * NetGSM password.
     *
     * @var string
     */
    protected string $password;

    /**
     * NetGSM message header (sender name).
     *
     * @var string
     */
    protected string $msgheader;

    /**
     * Create a new NetGSM service instance.
     *
     * @param  string  $username
     * @param  string  $password
     * @param  string  $msgheader
     */
    public function __construct(string $username, string $password, string $msgheader)
    {
        $this->username = $username;
        $this->password = $password;
        $this->msgheader = $msgheader;
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
        // Telefon numaralarını array'e çevir
        $phoneNumbers = is_array($phones) ? $phones : [$phones];
        
        // Telefon numaralarını temizle (0 ile başlamalı)
        $phoneNumbers = array_map(function ($phone) {
            // 05 ile başlıyorsa 0 ekle
            if (str_starts_with($phone, '5')) {
                return '0' . $phone;
            }
            // Zaten 0 ile başlıyorsa olduğu gibi döndür
            return $phone;
        }, $phoneNumbers);

        // Telefon numaralarını virgülle ayırarak birleştir
        $gsmno = implode(',', $phoneNumbers);

        try {
            $response = Http::timeout(30)->get($this->endpoint, [
                'usercode' => $this->username,
                'password' => $this->password,
                'gsmno' => $gsmno,
                'message' => $message,
                'msgheader' => $this->msgheader,
                'language' => 'TR',
                'filter' => '0', // 0 = Tüm numaralar, 1 = Sadece geçerli numaralar
            ]);

            return $this->handleResponse($response, $phoneNumbers);
        } catch (\Exception $e) {
            Log::error('NetGSM SMS gönderim hatası', [
                'error' => $e->getMessage(),
                'phones' => $phoneNumbers,
            ]);

            return [
                'success' => false,
                'message' => 'SMS gönderilirken bir hata oluştu: ' . $e->getMessage(),
                'data' => [],
            ];
        }
    }

    /**
     * Handle the API response.
     *
     * @param  Response  $response
     * @param  array  $phoneNumbers
     * @return array
     */
    protected function handleResponse(Response $response, array $phoneNumbers): array
    {
        $statusCode = $response->status();
        $body = trim($response->body());

        // NetGSM başarılı yanıtları genellikle "00" ile başlar
        if ($statusCode === 200 && str_starts_with($body, '00')) {
            // NetGSM yanıt formatı: "00 123456" (00 = başarılı, 123456 = mesaj ID)
            $messageId = trim(str_replace('00', '', $body));

            Log::info('NetGSM SMS başarıyla gönderildi', [
                'message_id' => $messageId,
                'phones' => $phoneNumbers,
            ]);

            return [
                'success' => true,
                'message' => 'SMS başarıyla gönderildi',
                'data' => [
                    'message_id' => $messageId,
                    'phones' => $phoneNumbers,
                ],
            ];
        }

        // Hata durumları
        $errorMessage = $this->getErrorMessage($body);

        Log::warning('NetGSM SMS gönderim hatası', [
            'status_code' => $statusCode,
            'response' => $body,
            'phones' => $phoneNumbers,
        ]);

        return [
            'success' => false,
            'message' => $errorMessage,
            'data' => [
                'status_code' => $statusCode,
                'response' => $body,
            ],
        ];
    }

    /**
     * Get error message from NetGSM response.
     *
     * @param  string  $response
     * @return string
     */
    protected function getErrorMessage(string $response): string
    {
        $errorCodes = [
            '20' => 'Mesaj metninde hata var',
            '30' => 'Geçersiz kullanıcı adı, şifre veya yetkisiz IP',
            '40' => 'Mesaj başlığı (msgheader) kayıtlı değil',
            '50' => 'Abone hesabında yeterli kredi yok',
            '51' => 'Hatalı telefon numarası',
            '70' => 'Hatalı sorgulama. Gönderdiğiniz parametrelerden birisi hatalı veya zorunlu alanlardan birisi eksik',
            '80' => 'Gönderilemedi',
        ];

        $code = trim($response);
        
        return $errorCodes[$code] ?? 'Bilinmeyen hata: ' . $code;
    }
}
