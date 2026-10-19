<?php
require 'vendor/autoload.php';
$app = require_once 'bootstrap/app.php';
$kernel = $app->make(Illuminate\Contracts\Console\Kernel::class);
$kernel->bootstrap();

$sms = \App\Models\ScheduledSms::find(2);
if ($sms) {
    echo "ID: {$sms->id}\n";
    echo "Status: {$sms->status}\n";
    echo "scheduled_at: {$sms->scheduled_at}\n";
    echo "error_message: {$sms->error_message}\n";
    echo "created_at: {$sms->created_at}\n";
} else {
    echo "SMS 2 not found.\n";
}
