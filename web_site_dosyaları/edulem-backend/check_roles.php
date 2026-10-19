<?php
require __DIR__.'/vendor/autoload.php';
$app = require_once __DIR__.'/bootstrap/app.php';
$kernel = $app->make(Illuminate\Contracts\Console\Kernel::class);
$kernel->bootstrap();

$output = [];
$e = \App\Models\OmrExam::find(10);
if ($e) {
    $output['Exam 10'] = ['name' => $e->name, 'roles' => $e->share_roles];
}

$e6 = \App\Models\OmrExam::find(6);
if ($e6) {
    $output['Exam 6'] = ['name' => $e6->name, 'roles' => $e6->share_roles];
}

$e7 = \App\Models\OmrExam::find(7);
if ($e7) {
    $output['Exam 7'] = ['name' => $e7->name, 'roles' => $e7->share_roles];
}

file_put_contents('output.json', json_encode($output, JSON_PRETTY_PRINT));
