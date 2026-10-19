<?php

require __DIR__.'/vendor/autoload.php';
$app = require_once __DIR__.'/bootstrap/app.php';
$kernel = $app->make(Illuminate\Contracts\Console\Kernel::class);
$kernel->bootstrap();

$students = \App\Models\Student::where('name', 'LIKE', '%ABDULKADİR SERT%')->get();
foreach ($students as $s) {
    echo "ID: {$s->id} | Name: {$s->name} | Tenant: {$s->tenant_id}\n";
    $count = \App\Models\OmrResult::where('student_id', $s->id)->count();
    echo "  Result count: $count\n";
}
