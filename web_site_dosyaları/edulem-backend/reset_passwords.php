<?php
/**
 * Test kullanıcılarının şifrelerini sıfırlar.
 * Kullanım: php reset_passwords.php
 */

require __DIR__ . '/vendor/autoload.php';
$app = require_once __DIR__ . '/bootstrap/app.php';
$app->make(Illuminate\Contracts\Console\Kernel::class)->bootstrap();

use App\Models\User;
use Illuminate\Support\Facades\Hash;

$defaultPassword = 'password';

$emails = ['test@example.com', 'super@admin.com', 'admin@test.com'];

foreach ($emails as $email) {
    $user = User::where('email', $email)->first();
    if ($user) {
        $user->password = Hash::make($defaultPassword);
        $user->save();
        echo "✅ {$email} şifresi '{$defaultPassword}' olarak güncellendi.\n";
    } else {
        echo "⏭️  {$email} bulunamadı, atlandı.\n";
    }
}

echo "\n📋 Giriş bilgileri (hepsi şifre: {$defaultPassword}):\n";
echo "   test@example.com\n";
echo "   super@admin.com\n";
echo "   admin@test.com\n";
