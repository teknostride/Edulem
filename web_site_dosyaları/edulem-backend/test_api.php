<?php

require __DIR__.'/vendor/autoload.php';
$app = require_once __DIR__.'/bootstrap/app.php';
$kernel = $app->make(Illuminate\Contracts\Console\Kernel::class);
$kernel->bootstrap();

$teacher = \App\Models\User::where('tenant_id', 1)->skip(1)->first();
\Illuminate\Support\Facades\Auth::login($teacher);

$studentId = \App\Models\Student::where('name', 'ELİF RANA YALDIR')->value('id');
$cid = \App\Models\Student::where('id', $studentId)->value('classroom_id');

$request = \Illuminate\Http\Request::create('/api/v1/omr/exams/10/results', 'GET', ['classroom_id' => $cid]);
$controller = $app->make(\App\Http\Controllers\OmrController::class);
$response = $controller->resultsIndex($request, 10);
$data = json_decode($response->getContent(), true);

$firstResult = null;
foreach($data['data']['results'] ?? [] as $r) {
    if ($r['student']['id'] == $studentId) {
        $firstResult = $r;
        break;
    }
}

$output = [
    'course_headers' => $data['data']['course_headers'] ?? [],
    'elif_rana' => $firstResult
];

file_put_contents('test_teacher_elif.json', json_encode($output, JSON_PRETTY_PRINT));
