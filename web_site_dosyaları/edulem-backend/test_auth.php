<?php
// Test authenticated user info
require 'vendor/autoload.php';
$app = require 'bootstrap/app.php';
$kernel = $app->make('Illuminate\Contracts\Http\Kernel');

use Illuminate\Http\Request;

// Create a test request with token
$token = '40|whmIoYXs2PZXTMeFPqI1migVB1lLY4ycdfSUgEXz8065af1d';
$req = Request::create('/api/v1/education-levels', 'GET');
$req->headers->set('Authorization', 'Bearer ' . $token);

// Bind request to app
$app['request'] = $req;

// Try to authenticate
if (auth()->guard('sanctum')->check()) {
    $user = auth()->user();
    echo "✓ Authenticated\n";
    echo "  User: {$user->name}\n";
    echo "  Tenant ID: {$user->tenant_id}\n";
} else {
    echo "✗ Not authenticated\n";
}
?>
