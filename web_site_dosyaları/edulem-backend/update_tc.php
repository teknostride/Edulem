<?php
require __DIR__ . '/vendor/autoload.php';
$app = require_once __DIR__ . '/bootstrap/app.php';
$kernel = $app->make(Illuminate\Contracts\Http\Kernel::class);
$kernel->handle(Illuminate\Http\Request::capture());

use App\Models\User;

$user = User::where('last_name', 'LIKE', '%Özlük%')->first();
if (!$user) {
    $user = User::where('first_name', 'Ali')->where('last_name', 'LIKE', '%Öz%')->first();
}

if ($user) {
    $user->tc_no = '11111111111';
    $user->save();
    echo "SUCCESS: " . $user->first_name . " " . $user->last_name . " TC set to 11111111111\n";
} else {
    echo "ERROR: Ali Özlük not found.\n";
    // List some users to help debugging
    $users = User::take(10)->get();
    foreach($users as $u) {
        echo $u->id . ": " . $u->first_name . " " . $u->last_name . "\n";
    }
}
