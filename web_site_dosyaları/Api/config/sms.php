<?php

return [
    /*
    |--------------------------------------------------------------------------
    | SMS Driver
    |--------------------------------------------------------------------------
    |
    | SMS gönderimi için kullanılacak sürücü.
    | Şu anda desteklenen: 'netgsm'
    |
    */

    'driver' => env('SMS_DRIVER', 'netgsm'),

    /*
    |--------------------------------------------------------------------------
    | NetGSM Configuration
    |--------------------------------------------------------------------------
    |
    | NetGSM SMS servisi için gerekli ayarlar.
    | Bu ayarlar .env dosyasından veya veritabanından okunabilir.
    |
    */

    'netgsm' => [
        'username' => env('SMS_NETGSM_USERNAME', ''),
        'password' => env('SMS_NETGSM_PASSWORD', ''),
        'msgheader' => env('SMS_NETGSM_MSGHEADER', ''),
    ],
];
