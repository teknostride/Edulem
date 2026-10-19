<?php
require 'vendor/autoload.php';
$app = require_once 'bootstrap/app.php';
$kernel = $app->make(Illuminate\Contracts\Console\Kernel::class);
$kernel->bootstrap();

$sms = \App\Models\ScheduledSms::latest()->take(5)->get(['id', 'status', 'error_message', 'scheduled_at', 'sent_count', 'failed_count', 'recipient_type']);
echo json_encode($sms, JSON_PRETTY_PRINT) . "\n";
$reports_count = \App\Models\SmsReport::count();
echo "Reports: $reports_count\n";
