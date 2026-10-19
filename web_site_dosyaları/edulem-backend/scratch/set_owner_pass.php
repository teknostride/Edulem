<?php
require __DIR__.'/../vendor/autoload.php';
$app = require_once __DIR__.'/../bootstrap/app.php';
$kernel = $app->make(Illuminate\Contracts\Console\Kernel::class);
$kernel->bootstrap();

use App\Models\User;
use Illuminate\Support\Facades\Hash;

$user = User::where('tc_no', '11111111111')->first();
if ($user) {
    $user->password = Hash::make('123456');
    $user->save();
    echo "SUCCESS: Password for TC 11111111111 set to 123456\n";
} else {
    echo "ERROR: User with TC 11111111111 not found\n";
}
