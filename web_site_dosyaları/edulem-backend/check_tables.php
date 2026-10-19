<?php

require_once 'vendor/autoload.php';

$app = require_once 'bootstrap/app.php';

$kernel = $app->make(Illuminate\Contracts\Console\Kernel::class);

$kernel->bootstrap();

echo "Checking database tables...\n";

try {
    $tables = DB::select('SHOW TABLES');
    echo "Found " . count($tables) . " tables:\n";
    
    foreach ($tables as $table) {
        $tableName = $table->Tables_in_okul ?? $table->{'Tables_in_' . env('DB_DATABASE')};
        echo "- " . $tableName . "\n";
    }
    
    // Check if permissions table exists
    $permissionsExists = DB::select("SHOW TABLES LIKE 'permissions'");
    if (empty($permissionsExists)) {
        echo "\nPermissions table does not exist. Creating...\n";
        
        Schema::create('permissions', function (Blueprint $table) {
            $table->id();
            $table->string('name')->unique();
            $table->string('display_name');
            $table->text('description')->nullable();
            $table->string('category');
            $table->boolean('is_system_permission')->default(false);
            $table->timestamps();
        });
        
        echo "Permissions table created successfully!\n";
        
        // Insert default permissions
        $permissions = [
            ['name' => 'users.read', 'display_name' => 'Kullanıcıları Görüntüle', 'description' => 'Kullanıcı listesini görüntüleme yetkisi', 'category' => 'users'],
            ['name' => 'users.create', 'display_name' => 'Kullanıcı Oluştur', 'description' => 'Yeni kullanıcı oluşturma yetkisi', 'category' => 'users'],
            ['name' => 'users.update', 'display_name' => 'Kullanıcı Güncelle', 'description' => 'Kullanıcı bilgilerini güncelleme yetkisi', 'category' => 'users'],
            ['name' => 'users.delete', 'display_name' => 'Kullanıcı Sil', 'description' => 'Kullanıcı silme yetkisi', 'category' => 'users'],
            ['name' => 'students.read', 'display_name' => 'Öğrencileri Görüntüle', 'description' => 'Öğrenci listesini görüntüleme yetkisi', 'category' => 'students'],
            ['name' => 'students.create', 'display_name' => 'Öğrenci Oluştur', 'description' => 'Yeni öğrenci oluşturma yetkisi', 'category' => 'students'],
            ['name' => 'students.update', 'display_name' => 'Öğrenci Güncelle', 'description' => 'Öğrenci bilgilerini güncelleme yetkisi', 'category' => 'students'],
            ['name' => 'students.delete', 'display_name' => 'Öğrenci Sil', 'description' => 'Öğrenci silme yetkisi', 'category' => 'students'],
            ['name' => 'academic.read', 'display_name' => 'Akademik Bilgileri Görüntüle', 'description' => 'Akademik verileri görüntüleme yetkisi', 'category' => 'academic'],
            ['name' => 'academic.create', 'display_name' => 'Akademik Veri Oluştur', 'description' => 'Akademik veri oluşturma yetkisi', 'category' => 'academic'],
            ['name' => 'academic.update', 'display_name' => 'Akademik Veri Güncelle', 'description' => 'Akademik verileri güncelleme yetkisi', 'category' => 'academic'],
            ['name' => 'academic.delete', 'display_name' => 'Akademik Veri Sil', 'description' => 'Akademik verileri silme yetkisi', 'category' => 'academic'],
            ['name' => 'announcements.read', 'display_name' => 'Duyuruları Görüntüle', 'description' => 'Duyuru listesini görüntüleme yetkisi', 'category' => 'announcements'],
            ['name' => 'announcements.create', 'display_name' => 'Duyuru Oluştur', 'description' => 'Yeni duyuru oluşturma yetkisi', 'category' => 'announcements'],
            ['name' => 'announcements.update', 'display_name' => 'Duyuru Güncelle', 'description' => 'Duyuru güncelleme yetkisi', 'category' => 'announcements'],
            ['name' => 'announcements.delete', 'display_name' => 'Duyuru Sil', 'description' => 'Duyuru silme yetkisi', 'category' => 'announcements'],
            ['name' => 'messages.read', 'display_name' => 'Mesajları Görüntüle', 'description' => 'Mesaj listesini görüntüleme yetkisi', 'category' => 'messages'],
            ['name' => 'messages.create', 'display_name' => 'Mesaj Gönder', 'description' => 'Yeni mesaj gönderme yetkisi', 'category' => 'messages'],
            ['name' => 'messages.update', 'display_name' => 'Mesaj Güncelle', 'description' => 'Mesaj güncelleme yetkisi', 'category' => 'messages'],
            ['name' => 'messages.delete', 'display_name' => 'Mesaj Sil', 'description' => 'Mesaj silme yetkisi', 'category' => 'messages'],
            ['name' => 'permissions.read', 'display_name' => 'Yetkileri Görüntüle', 'description' => 'Yetki listesini görüntüleme yetkisi', 'category' => 'permissions'],
            ['name' => 'roles.read', 'display_name' => 'Rolleri Görüntüle', 'description' => 'Rol listesini görüntüleme yetkisi', 'category' => 'roles'],
            ['name' => 'settings.read', 'display_name' => 'Ayarları Görüntüle', 'description' => 'Ayarları görüntüleme yetkisi', 'category' => 'settings'],
        ];
        
        foreach ($permissions as $permission) {
            DB::table('permissions')->insert([
                'name' => $permission['name'],
                'display_name' => $permission['display_name'],
                'description' => $permission['description'],
                'category' => $permission['category'],
                'is_system_permission' => true,
                'created_at' => now(),
                'updated_at' => now(),
            ]);
        }
        
        echo "Default permissions inserted successfully!\n";
    } else {
        echo "\nPermissions table already exists.\n";
        
        // Check if permissions table has data
        $count = DB::table('permissions')->count();
        echo "Permissions table has " . $count . " records.\n";
        
        if ($count == 0) {
            echo "Inserting default permissions...\n";
            
            $permissions = [
                ['name' => 'users.read', 'display_name' => 'Kullanıcıları Görüntüle', 'description' => 'Kullanıcı listesini görüntüleme yetkisi', 'category' => 'users'],
                ['name' => 'users.create', 'display_name' => 'Kullanıcı Oluştur', 'description' => 'Yeni kullanıcı oluşturma yetkisi', 'category' => 'users'],
                ['name' => 'users.update', 'display_name' => 'Kullanıcı Güncelle', 'description' => 'Kullanıcı bilgilerini güncelleme yetkisi', 'category' => 'users'],
                ['name' => 'users.delete', 'display_name' => 'Kullanıcı Sil', 'description' => 'Kullanıcı silme yetkisi', 'category' => 'users'],
                ['name' => 'students.read', 'display_name' => 'Öğrencileri Görüntüle', 'description' => 'Öğrenci listesini görüntüleme yetkisi', 'category' => 'students'],
                ['name' => 'students.create', 'display_name' => 'Öğrenci Oluştur', 'description' => 'Yeni öğrenci oluşturma yetkisi', 'category' => 'students'],
                ['name' => 'students.update', 'display_name' => 'Öğrenci Güncelle', 'description' => 'Öğrenci bilgilerini güncelleme yetkisi', 'category' => 'students'],
                ['name' => 'students.delete', 'display_name' => 'Öğrenci Sil', 'description' => 'Öğrenci silme yetkisi', 'category' => 'students'],
                ['name' => 'academic.read', 'display_name' => 'Akademik Bilgileri Görüntüle', 'description' => 'Akademik verileri görüntüleme yetkisi', 'category' => 'academic'],
                ['name' => 'academic.create', 'display_name' => 'Akademik Veri Oluştur', 'description' => 'Akademik veri oluşturma yetkisi', 'category' => 'academic'],
                ['name' => 'academic.update', 'display_name' => 'Akademik Veri Güncelle', 'description' => 'Akademik verileri güncelleme yetkisi', 'category' => 'academic'],
                ['name' => 'academic.delete', 'display_name' => 'Akademik Veri Sil', 'description' => 'Akademik verileri silme yetkisi', 'category' => 'academic'],
                ['name' => 'announcements.read', 'display_name' => 'Duyuruları Görüntüle', 'description' => 'Duyuru listesini görüntüleme yetkisi', 'category' => 'announcements'],
                ['name' => 'announcements.create', 'display_name' => 'Duyuru Oluştur', 'description' => 'Yeni duyuru oluşturma yetkisi', 'category' => 'announcements'],
                ['name' => 'announcements.update', 'display_name' => 'Duyuru Güncelle', 'description' => 'Duyuru güncelleme yetkisi', 'category' => 'announcements'],
                ['name' => 'announcements.delete', 'display_name' => 'Duyuru Sil', 'description' => 'Duyuru silme yetkisi', 'category' => 'announcements'],
                ['name' => 'messages.read', 'display_name' => 'Mesajları Görüntüle', 'description' => 'Mesaj listesini görüntüleme yetkisi', 'category' => 'messages'],
                ['name' => 'messages.create', 'display_name' => 'Mesaj Gönder', 'description' => 'Yeni mesaj gönderme yetkisi', 'category' => 'messages'],
                ['name' => 'messages.update', 'display_name' => 'Mesaj Güncelle', 'description' => 'Mesaj güncelleme yetkisi', 'category' => 'messages'],
                ['name' => 'messages.delete', 'display_name' => 'Mesaj Sil', 'description' => 'Mesaj silme yetkisi', 'category' => 'messages'],
                ['name' => 'permissions.read', 'display_name' => 'Yetkileri Görüntüle', 'description' => 'Yetki listesini görüntüleme yetkisi', 'category' => 'permissions'],
                ['name' => 'roles.read', 'display_name' => 'Rolleri Görüntüle', 'description' => 'Rol listesini görüntüleme yetkisi', 'category' => 'roles'],
                ['name' => 'settings.read', 'display_name' => 'Ayarları Görüntüle', 'description' => 'Ayarları görüntüleme yetkisi', 'category' => 'settings'],
            ];
            
            foreach ($permissions as $permission) {
                $parts = explode('.', $permission['name']);
                $action = $parts[1] ?? 'read';
                
                DB::table('permissions')->insert([
                    'module' => $permission['category'],
                    'action' => $action,
                    'name' => $permission['name'],
                    'display_name' => $permission['display_name'],
                    'description' => $permission['description'],
                    'category' => $permission['category'],
                    'is_system_permission' => true,
                    'created_at' => now(),
                    'updated_at' => now(),
                ]);
            }
            
            echo "Default permissions inserted successfully!\n";
        }
    }
    
    // Test API endpoint
    echo "\nTesting API endpoint...\n";
    try {
        $permissions = DB::table('permissions')->get();
        echo "API test successful! Found " . $permissions->count() . " permissions.\n";
    } catch (Exception $e) {
        echo "API test failed: " . $e->getMessage() . "\n";
    }
    
} catch (Exception $e) {
    echo "Error: " . $e->getMessage() . "\n";
}
