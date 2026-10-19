<?php
/**
 * Hızlı Permission Düzeltme Scripti
 * 
 * Bu script, mevcut tüm kullanıcıların rollerine academic.* permission'larını ekler.
 * 
 * Kullanım:
 * php fix_permissions.php
 */

require __DIR__ . '/vendor/autoload.php';

$app = require_once __DIR__ . '/bootstrap/app.php';
$app->make(\Illuminate\Contracts\Console\Kernel::class)->bootstrap();

use App\Models\Permission;
use App\Models\Role;
use App\Models\User;

echo "🔧 Permission düzeltme başlatılıyor...\n\n";

// 1. Academic permission'larını kontrol et
$academicPermissions = Permission::where('module', 'academic')->get();

if ($academicPermissions->isEmpty()) {
    echo "❌ Academic permission'ları bulunamadı. Önce PermissionSeeder çalıştırın:\n";
    echo "   php artisan db:seed --class=PermissionSeeder\n";
    exit(1);
}

echo "✅ {$academicPermissions->count()} academic permission bulundu.\n\n";

// 2. Tüm rollere academic permission'larını ekle
$roles = Role::all();
$academicPermissionIds = $academicPermissions->pluck('id')->toArray();

$updatedRoles = 0;
foreach ($roles as $role) {
    $existingPermissionIds = $role->permissions()->pluck('permissions.id')->toArray();
    $newPermissionIds = array_unique(array_merge($existingPermissionIds, $academicPermissionIds));
    
    $role->permissions()->sync($newPermissionIds);
    $updatedRoles++;
    
    echo "✅ Role '{$role->display_name}' ({$role->name}) güncellendi.\n";
}

echo "\n📊 Toplam {$updatedRoles} rol güncellendi.\n\n";

// 3. Kullanıcıların permission'larını kontrol et
echo "👤 Kullanıcı kontrolü:\n";
$users = User::where('is_superadmin', false)->whereNotNull('role_id')->get();

foreach ($users as $user) {
    $hasPermission = $user->hasPermission('academic.read');
    $status = $hasPermission ? '✅' : '❌';
    echo "   {$status} {$user->name} ({$user->email}) - academic.read: " . ($hasPermission ? 'VAR' : 'YOK') . "\n";
}

echo "\n✨ İşlem tamamlandı!\n";
echo "\n💡 Sayfayı yenileyin ve tekrar deneyin.\n";
