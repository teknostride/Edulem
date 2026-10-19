<?php

namespace App\Services;

use App\Models\User;
use Illuminate\Support\Facades\Artisan;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\File;
use Illuminate\Support\Facades\Schema;
use Exception;

class InstallationService
{
    /**
     * Test database connection
     */
    public function testConnection(array $config): array
    {
        try {
            $connection = new \PDO(
                "mysql:host={$config['host']};port={$config['port']};charset=utf8mb4",
                $config['username'],
                $config['password'],
                [
                    \PDO::ATTR_ERRMODE => \PDO::ERRMODE_EXCEPTION,
                    \PDO::ATTR_DEFAULT_FETCH_MODE => \PDO::FETCH_ASSOC,
                ]
            );

            // Test if database exists
            $stmt = $connection->query("SHOW DATABASES LIKE '{$config['database']}'");
            $databaseExists = $stmt->rowCount() > 0;

            if (!$databaseExists) {
                // Try to create database
                $connection->exec("CREATE DATABASE IF NOT EXISTS `{$config['database']}` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci");
            }

            // Test connection to the specific database
            $connection = new \PDO(
                "mysql:host={$config['host']};port={$config['port']};dbname={$config['database']};charset=utf8mb4",
                $config['username'],
                $config['password'],
                [
                    \PDO::ATTR_ERRMODE => \PDO::ERRMODE_EXCEPTION,
                    \PDO::ATTR_DEFAULT_FETCH_MODE => \PDO::FETCH_ASSOC,
                ]
            );

            return [
                'success' => true,
                'message' => 'Veritabanı bağlantısı başarılı',
            ];
        } catch (Exception $e) {
            return [
                'success' => false,
                'message' => 'Veritabanı bağlantı hatası: ' . $e->getMessage(),
            ];
        }
    }

    /**
     * Update .env file with database configuration
     */
    public function updateEnvFile(array $config): bool
    {
        try {
            $envPath = base_path('.env');
            
            if (!File::exists($envPath)) {
                // Copy from .env.example if .env doesn't exist
                $examplePath = base_path('.env.example');
                if (File::exists($examplePath)) {
                    File::copy($examplePath, $envPath);
                } else {
                    // Create basic .env file
                    File::put($envPath, 'APP_NAME=EKT' . PHP_EOL);
                }
            }

            $envContent = File::get($envPath);

            // Update database configuration
            $envContent = preg_replace('/DB_CONNECTION=.*/', 'DB_CONNECTION=mysql', $envContent);
            $envContent = preg_replace('/DB_HOST=.*/', "DB_HOST={$config['host']}", $envContent);
            $envContent = preg_replace('/DB_PORT=.*/', "DB_PORT={$config['port']}", $envContent);
            $envContent = preg_replace('/DB_DATABASE=.*/', "DB_DATABASE={$config['database']}", $envContent);
            $envContent = preg_replace('/DB_USERNAME=.*/', "DB_USERNAME={$config['username']}", $envContent);
            $envContent = preg_replace('/DB_PASSWORD=.*/', "DB_PASSWORD={$config['password']}", $envContent);

            // Ensure APP_KEY exists
            if (!preg_match('/APP_KEY=/', $envContent)) {
                $envContent .= PHP_EOL . 'APP_KEY=' . PHP_EOL;
            }

            File::put($envPath, $envContent);

            // Clear config cache
            if (function_exists('opcache_reset')) {
                opcache_reset();
            }

            return true;
        } catch (Exception $e) {
            throw new Exception('Env dosyası güncellenemedi: ' . $e->getMessage());
        }
    }

    /**
     * Run migrations
     */
    public function runMigrations(): array
    {
        try {
            Artisan::call('migrate', ['--force' => true]);
            
            return [
                'success' => true,
                'message' => 'Migration\'lar başarıyla çalıştırıldı',
            ];
        } catch (Exception $e) {
            return [
                'success' => false,
                'message' => 'Migration hatası: ' . $e->getMessage(),
            ];
        }
    }

    /**
     * Run seeders
     */
    public function runSeeders(): array
    {
        try {
            Artisan::call('db:seed', ['--force' => true]);
            
            return [
                'success' => true,
                'message' => 'Seeder\'lar başarıyla çalıştırıldı',
            ];
        } catch (Exception $e) {
            return [
                'success' => false,
                'message' => 'Seeder hatası: ' . $e->getMessage(),
            ];
        }
    }

    /**
     * Create first SuperAdmin user
     */
    public function createSuperAdmin(array $userData): array
    {
        try {
            // Check if SuperAdmin already exists
            $existingAdmin = User::where('is_superadmin', true)->first();
            if ($existingAdmin) {
                return [
                    'success' => false,
                    'message' => 'SuperAdmin kullanıcısı zaten mevcut',
                ];
            }

            $user = User::create([
                'name' => $userData['name'],
                'email' => $userData['email'],
                'username' => $userData['email'], // Use email as username
                'password' => Hash::make($userData['password']),
                'is_superadmin' => true,
                'tenant_id' => null, // SuperAdmin has no tenant
            ]);

            return [
                'success' => true,
                'message' => 'SuperAdmin kullanıcısı oluşturuldu',
                'user' => $user,
            ];
        } catch (Exception $e) {
            return [
                'success' => false,
                'message' => 'SuperAdmin oluşturma hatası: ' . $e->getMessage(),
            ];
        }
    }

    /**
     * Mark system as installed
     */
    public function markAsInstalled(): bool
    {
        try {
            $installedFile = storage_path('.installed');
            File::put($installedFile, date('Y-m-d H:i:s'));
            
            return true;
        } catch (Exception $e) {
            throw new Exception('Kurulum işareti oluşturulamadı: ' . $e->getMessage());
        }
    }

    /**
     * Check if system is installed
     */
    public function isInstalled(): bool
    {
        return File::exists(storage_path('.installed'));
    }

    /**
     * Complete installation process
     */
    public function install(array $dbConfig, array $adminData): array
    {
        try {
            // 1. Test connection
            $testResult = $this->testConnection($dbConfig);
            if (!$testResult['success']) {
                return $testResult;
            }

            // 2. Update .env file
            $this->updateEnvFile($dbConfig);

            // 3. Run migrations
            $migrationResult = $this->runMigrations();
            if (!$migrationResult['success']) {
                return $migrationResult;
            }

            // 4. Run seeders
            $seederResult = $this->runSeeders();
            if (!$seederResult['success']) {
                return $seederResult;
            }

            // 5. Create SuperAdmin
            $adminResult = $this->createSuperAdmin($adminData);
            if (!$adminResult['success']) {
                return $adminResult;
            }

            // 6. Mark as installed
            $this->markAsInstalled();

            return [
                'success' => true,
                'message' => 'Kurulum başarıyla tamamlandı',
            ];
        } catch (Exception $e) {
            return [
                'success' => false,
                'message' => 'Kurulum hatası: ' . $e->getMessage(),
            ];
        }
    }
}
