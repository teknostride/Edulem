<?php
require __DIR__.'/vendor/autoload.php';

$client = new \GuzzleHttp\Client([
    'base_uri' => 'http://localhost:8000/api/v1/',
    'http_errors' => false,
    'headers' => [
        'Accept' => 'application/json'
    ]
]);

// Try to login as a teacher. We need a teacher email. Let's find one first via CLI or assume 'teacher@premium.edu.tr'
$app = require_once __DIR__.'/bootstrap/app.php';
$kernel = $app->make(Illuminate\Contracts\Console\Kernel::class);
$kernel->bootstrap();

$teacher = \App\Models\User::where('role_id', 5)->first();
if (!$teacher) {
    die("No teacher\n");
}

$token = $teacher->createToken('test')->plainTextToken;

$res1 = $client->get('users?role_id=5', [
    'headers' => ['Authorization' => 'Bearer ' . $token]
]);
echo "/users?role_id=5 : " . $res1->getStatusCode() . "\n";
echo $res1->getBody() . "\n\n";

$res2 = $client->get('duty-schedules', [
    'headers' => ['Authorization' => 'Bearer ' . $token]
]);
echo "/duty-schedules : " . $res2->getStatusCode() . "\n";
echo $res2->getBody() . "\n";
