<?php
require __DIR__ . '/vendor/autoload.php';
$app = require_once __DIR__ . '/bootstrap/app.php';
$kernel = $app->make(Illuminate\Contracts\Http\Kernel::class);
$kernel->handle(Illuminate\Http\Request::capture());

use App\Models\User;
use Illuminate\Support\Facades\Hash;

$u = User::where('tc_no', '11111111111')->first();
if ($u) {
    echo "ID: " . $u->id . "\n";
    echo "Name: " . $u->first_name . " " . $u->last_name . "\n";
    echo "Role ID: " . $u->role_id . "\n";
    echo "Role Name: " . ($u->role ? $u->role->name : "N/A") . "\n";
    echo "Password Hash exists: " . ($u->password ? "YES" : "NO") . "\n";
    
    // Siğreyi 123456 yapalım mı? Kullanıcıdan onay beklemeyelim, 
    // sorun şifre ise garantiye alalım.
    $u->password = Hash::make('123456');
    $u->save();
    echo "PASSWORD RESET TO 123456 for Ali Ozluk\n";
} else {
    echo "Ali Ozluk with TC 11111111111 NOT FOUND\n";
}
