<?php
require __DIR__.'/../vendor/autoload.php';
$app = require_once __DIR__.'/../bootstrap/app.php';

use App\Models\User;
use App\Models\Student;
use App\Http\Resources\StudentResource;
use Illuminate\Http\Request;

$kernel = $app->make(Illuminate\Contracts\Http\Kernel::class);

$user = User::where('email', 'mustafagorkem@hotmail.com')->first();
auth()->login($user);

$request = Request::create('/api/students', 'GET');
$request->headers->set('X-Season-Id', 11);
$request->setUserResolver(fn() => $user);

// Bind request to container
$app->instance('request', $request);

$controller = $app->make(App\Http\Controllers\StudentController::class);
$response = $controller->index();

echo "Status: " . $response->getStatusCode() . PHP_EOL;
echo "Content: " . substr($response->getContent(), 0, 1000) . "..." . PHP_EOL;
