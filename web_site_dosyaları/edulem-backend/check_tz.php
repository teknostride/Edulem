<?php
require 'vendor/autoload.php';
$app = require_once 'bootstrap/app.php';
$kernel = $app->make(Illuminate\Contracts\Console\Kernel::class);
$kernel->bootstrap();

$sms = App\Models\ScheduledSms::create([
    'tenant_id' => 1,
    'title' => 'Test Timezone',
    'message' => 'Test',
    'recipient_type' => 'all',
    'recipient_phones' => [],
    'recipient_ids' => [],
    'scheduled_at' => '2026-02-28T04:53',
    'status' => 'pending',
    'created_by' => 1,
]);

echo "Input: 2026-02-28T04:53\n";
echo "Saved as (from PHP model): " . $sms->scheduled_at . "\n";
echo "Saved as (from DB direct array format): " . $sms->getAttributes()['scheduled_at'] . "\n";
