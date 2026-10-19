<?php

return [
    /*
    |--------------------------------------------------------------------------
    | Reverb Configuration
    |--------------------------------------------------------------------------
    |
    | Laravel Reverb WebSocket server yapılandırması.
    |
    */

    'app' => [
        'id' => env('REVERB_APP_ID', 'premium-edu-saas'),
        'key' => env('REVERB_APP_KEY'),
        'secret' => env('REVERB_APP_SECRET'),
    ],

    'host' => env('REVERB_HOST', 'localhost'),
    'port' => env('REVERB_PORT', 8080),
    'scheme' => env('REVERB_SCHEME', 'http'),

    'allowed_origins' => [
        env('APP_URL', 'http://localhost'),
    ],

    'ssl' => [
        'local_cert' => env('REVERB_LOCAL_CERT', null),
        'local_pk' => env('REVERB_LOCAL_PK', null),
        'passphrase' => env('REVERB_PASSPHRASE', null),
    ],
];
