<?php
require 'vendor/autoload.php';
$app = require_once 'bootstrap/app.php';
$kernel = $app->make(Illuminate\Contracts\Console\Kernel::class);
$kernel->bootstrap();

$sms = \App\Models\ScheduledSms::find(2);
if ($sms) {
    echo "SMS 2 scheduled_at: " . $sms->scheduled_at . "\n";
    echo "Current now(): " . now() . "\n";
    echo "Is scheduled_at <= now() ? " . ($sms->scheduled_at <= now() ? "YES" : "NO") . "\n";
} else {
    echo "SMS 2 not found.\n";
}
