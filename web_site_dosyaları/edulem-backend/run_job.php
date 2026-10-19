<?php
require 'vendor/autoload.php';
$app = require_once 'bootstrap/app.php';
$kernel = $app->make(Illuminate\Contracts\Console\Kernel::class);
$kernel->bootstrap();

try {
    $job = new \App\Jobs\ProcessScheduledSmsJob();
    $job->handle();
    echo "Job executed.\n";
    
    $sms = \App\Models\ScheduledSms::find(2);
    echo "SMS 2 Status: " . ($sms ? $sms->status : 'Not found') . "\n";
    echo "Error Msg: " . ($sms ? $sms->error_message : '') . "\n";
} catch (\Exception $e) {
    echo "Exception: " . $e->getMessage() . "\n";
    echo $e->getTraceAsString() . "\n";
}
