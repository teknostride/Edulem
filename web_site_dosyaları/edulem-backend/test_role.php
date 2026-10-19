<?php
require __DIR__.'/vendor/autoload.php';
$app = require_once __DIR__.'/bootstrap/app.php';
$app->make(Illuminate\Contracts\Console\Kernel::class)->bootstrap();

$user = App\Models\User::where('role_id', 5)->first();
if (!$user) {
    echo "No teacher user found!\n";
    exit;
}

$avatarUrl = null;
$userData = [
    'id' => $user->id,
    'name' => $user->name,
    'email' => $user->email,
    'avatar' => $avatarUrl,
    'role' => $user->role ? $user->role->name : null,
    'role_id' => $user->role_id,
    'role_label' => $user->role ? $user->role->display_name : null,
    'campus_ids' => $user->campus_ids,
    'education_level_ids' => $user->education_level_ids,
];

file_put_contents('test_login.json', json_encode($userData, JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE));
echo "Saved test_login.json\n";
