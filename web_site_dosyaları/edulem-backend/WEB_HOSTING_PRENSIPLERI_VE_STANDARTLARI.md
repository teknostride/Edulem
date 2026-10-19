# 🌐 Web Hosting Prensipleri & Standartları

**Proje:** Premium Edu SaaS - Okul Yönetim Sistemi  
**Hedef:** Production-ready, güvenli, ölçeklenebilir web hosting yapılandırması  
**Son Güncelleme:** 2026-01-22

---

## 📋 İçindekiler

1. [Hosting Türleri ve Seçim Kriterleri](#1-hosting-türleri-ve-seçim-kriterleri)
2. [Dosyalama Sistemleri](#2-dosyalama-sistemleri)
3. [Web Standartları](#3-web-standartları)
4. [Güvenlik Prensipleri](#4-güvenlik-prensipleri)
5. [Performance Optimizasyonu](#5-performance-optimizasyonu)
6. [Environment Configuration](#6-environment-configuration)
7. [Backup Stratejileri](#7-backup-stratejileri)
8. [Monitoring & Logging](#8-monitoring--logging)
9. [Deployment Best Practices](#9-deployment-best-practices)
10. [Kontrol Listesi](#10-kontrol-listesi)

---

## 1️⃣ Hosting Türleri ve Seçim Kriterleri

### 🏗️ Hosting Türleri

#### 1.1 Shared Hosting
**Özellikler:**
- Düşük maliyet
- Sınırlı kaynak (CPU, RAM, Disk)
- PHP 8.2+ desteği gerekli
- MySQL 8.0+ gerekli
- `.htaccess` desteği

**Kullanım Senaryosu:**
- ⚠️ **ÖNERİLMEZ** - Multi-tenant SaaS için yetersiz
- Küçük ölçekli test ortamları için

**Gereksinimler:**
- PHP 8.2+
- MySQL 8.0+
- Composer desteği
- SSH erişimi (opsiyonel)
- Cron job desteği

#### 1.2 VPS (Virtual Private Server)
**Özellikler:**
- Orta maliyet
- Tam kontrol (root erişimi)
- Ölçeklenebilir kaynaklar
- Docker desteği (opsiyonel)

**Kullanım Senaryosu:**
- ✅ **ÖNERİLEN** - Orta ölçekli SaaS için ideal
- 10-100 tenant için uygun

**Gereksinimler:**
- Ubuntu 22.04 LTS / Debian 12
- Minimum 2 CPU, 4GB RAM, 50GB SSD
- Nginx veya Apache
- PHP-FPM 8.2+
- MySQL 8.0+ veya MariaDB 10.11+
- Redis (cache & queue için)

#### 1.3 Cloud Hosting (AWS, DigitalOcean, Hetzner)
**Özellikler:**
- Yüksek maliyet
- Yüksek performans
- Otomatik ölçeklendirme
- Yüksek erişilebilirlik

**Kullanım Senaryosu:**
- ✅ **ÖNERİLEN** - Büyük ölçekli SaaS için
- 100+ tenant için ideal

**Gereksinimler:**
- Container orchestration (Docker Compose / Kubernetes)
- Load balancer
- Auto-scaling
- Managed database (RDS, etc.)

### ✅ Hosting Seçim Kontrol Listesi

- [ ] PHP 8.2+ desteği var mı?
- [ ] MySQL 8.0+ veya MariaDB 10.11+ var mı?
- [ ] Redis desteği var mı?
- [ ] Cron job çalıştırılabiliyor mu?
- [ ] SSL sertifikası (Let's Encrypt) kurulabiliyor mu?
- [ ] SSH erişimi var mı?
- [ ] Minimum 2GB RAM var mı?
- [ ] Minimum 20GB disk alanı var mı?
- [ ] Bandwidth limiti yeterli mi? (100GB+/ay)

---

## 2️⃣ Dosyalama Sistemleri

### 📁 Dosyalama Sistemi Seçenekleri

#### 2.1 Local Storage (Dosya Sistemi)

**Kullanım:**
```php
// config/filesystems.php
'local' => [
    'driver' => 'local',
    'root' => storage_path('app'),
    'throw' => false,
],

'public' => [
    'driver' => 'local',
    'root' => storage_path('app/public'),
    'url' => env('APP_URL') . '/storage',
    'visibility' => 'public',
    'throw' => false,
],
```

**Avantajlar:**
- ✅ Hızlı erişim
- ✅ Ekstra maliyet yok
- ✅ Basit yapılandırma

**Dezavantajlar:**
- ❌ Disk alanı sınırlı
- ❌ Backup zorluğu
- ❌ Ölçeklenebilirlik düşük
- ❌ Multi-server için uygun değil

**Kullanım Senaryosu:**
- Küçük ölçekli projeler
- Test ortamları
- Geçici dosyalar

**Klasör Yapısı:**
```
storage/
├── app/
│   ├── private/          # Özel dosyalar
│   │   └── tenants/
│   │       └── {tenant_id}/
│   └── public/           # Public dosyalar
│       └── tenants/
│           └── {tenant_id}/
│               ├── documents/
│               ├── photos/
│               └── reports/
└── logs/
```

#### 2.2 AWS S3 (Amazon Simple Storage Service)

**Kullanım:**
```php
// config/filesystems.php
's3' => [
    'driver' => 's3',
    'key' => env('AWS_ACCESS_KEY_ID'),
    'secret' => env('AWS_SECRET_ACCESS_KEY'),
    'region' => env('AWS_DEFAULT_REGION', 'eu-central-1'),
    'bucket' => env('AWS_BUCKET'),
    'url' => env('AWS_URL'),
    'endpoint' => env('AWS_ENDPOINT'),
    'use_path_style_endpoint' => env('AWS_USE_PATH_STYLE_ENDPOINT', false),
    'throw' => false,
],
```

**Environment Variables:**
```env
FILESYSTEM_DISK=s3
AWS_ACCESS_KEY_ID=your-access-key
AWS_SECRET_ACCESS_KEY=your-secret-key
AWS_DEFAULT_REGION=eu-central-1
AWS_BUCKET=premium-edu-storage
AWS_URL=https://premium-edu-storage.s3.eu-central-1.amazonaws.com
```

**Avantajlar:**
- ✅ Sınırsız depolama
- ✅ Yüksek erişilebilirlik (99.99%)
- ✅ CDN entegrasyonu (CloudFront)
- ✅ Otomatik backup
- ✅ Multi-region desteği
- ✅ Signed URL desteği (güvenlik)

**Dezavantajlar:**
- ❌ Ekstra maliyet (GB başına)
- ❌ Bandwidth maliyeti
- ❌ Yapılandırma karmaşıklığı

**Kullanım Senaryosu:**
- ✅ **ÖNERİLEN** - Production ortamı
- Büyük dosyalar
- Yüksek trafik
- Multi-tenant SaaS

**Bucket Yapısı:**
```
premium-edu-storage/
├── tenants/
│   └── {tenant_id}/
│       ├── documents/
│       │   └── 2026/
│       │       └── 01/
│       ├── photos/
│       │   └── 2026/
│       │       └── 01/
│       └── reports/
│           └── 2026/
│               └── 01/
└── public/
    └── assets/
```

#### 2.3 MinIO (S3-Compatible Object Storage)

**Kullanım:**
```php
// config/filesystems.php
'minio' => [
    'driver' => 's3',
    'key' => env('MINIO_ACCESS_KEY'),
    'secret' => env('MINIO_SECRET_KEY'),
    'region' => env('MINIO_REGION', 'us-east-1'),
    'bucket' => env('MINIO_BUCKET'),
    'endpoint' => env('MINIO_ENDPOINT'),
    'use_path_style_endpoint' => true,
    'throw' => false,
],
```

**Environment Variables:**
```env
FILESYSTEM_DISK=minio
MINIO_ACCESS_KEY=minioadmin
MINIO_SECRET_KEY=minioadmin123
MINIO_REGION=us-east-1
MINIO_BUCKET=premium-edu
MINIO_ENDPOINT=http://minio:9000
```

**Avantajlar:**
- ✅ S3 uyumlu (kod değişikliği yok)
- ✅ Self-hosted (kendi sunucunuzda)
- ✅ Düşük maliyet
- ✅ Docker ile kolay kurulum

**Dezavantajlar:**
- ❌ Yönetim sorumluluğu
- ❌ Backup yönetimi
- ❌ Single point of failure (tek sunucu)

**Kullanım Senaryosu:**
- Development ortamı
- Küçük-orta ölçekli production
- Özel sunucu sahipleri

**Docker Compose Örneği:**
```yaml
minio:
  image: minio/minio:latest
  container_name: premium-edu-minio
  restart: unless-stopped
  environment:
    MINIO_ROOT_USER: ${MINIO_ACCESS_KEY}
    MINIO_ROOT_PASSWORD: ${MINIO_SECRET_KEY}
  ports:
    - "9000:9000"  # API
    - "9001:9001"  # Console
  volumes:
    - minio_data:/data
  command: server /data --console-address ":9001"
```

### 📂 Tenant Bazlı Klasör Yapısı

**Standart Yapı:**
```
{disk}/
└── tenants/
    └── {tenant_id}/
        ├── documents/        # Dökümanlar
        │   └── {Y}/{m}/      # Yıl/Ay bazlı
        ├── photos/           # Fotoğraflar
        │   └── {Y}/{m}/
        ├── reports/          # Raporlar
        │   └── {Y}/{m}/
        ├── invoices/         # Faturalar
        │   └── {Y}/{m}/
        └── contracts/        # Sözleşmeler
            └── {Y}/{m}/
```

**Dosya Adlandırma:**
```php
// Format: {original_name}_{random}_{timestamp}.{ext}
// Örnek: ogrenci_foto_abc123xyz_1705939200.jpg
```

### ✅ Dosyalama Sistemi Kontrol Listesi

- [ ] Dosyalama sistemi seçildi mi? (Local/S3/MinIO)
- [ ] Environment variables tanımlandı mı?
- [ ] Tenant bazlı klasör yapısı kullanılıyor mu?
- [ ] Dosya adlandırma standardı belirlendi mi?
- [ ] Signed URL desteği var mı? (S3/MinIO için)
- [ ] CDN entegrasyonu yapıldı mı? (Opsiyonel)
- [ ] Dosya boyutu limiti belirlendi mi? (php.ini: upload_max_filesize)
- [ ] MIME type kontrolü yapılıyor mu?
- [ ] Dosya silme işlemi güvenli mi? (Tenant kontrolü)
- [ ] Backup stratejisi belirlendi mi?

---

## 3️⃣ Web Standartları

### 🔒 HTTPS (SSL/TLS)

**Zorunluluk:**
- ✅ Tüm production ortamlarında HTTPS zorunlu
- ✅ Let's Encrypt (ücretsiz SSL)
- ✅ Otomatik yenileme (certbot)

**Nginx Yapılandırması:**
```nginx
server {
    listen 80;
    server_name premiumedu.com www.premiumedu.com;
    return 301 https://$server_name$request_uri;
}

server {
    listen 443 ssl http2;
    server_name premiumedu.com www.premiumedu.com;

    ssl_certificate /etc/letsencrypt/live/premiumedu.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/premiumedu.com/privkey.pem;
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers HIGH:!aNULL:!MD5;
    ssl_prefer_server_ciphers on;
    ssl_session_cache shared:SSL:10m;
    ssl_session_timeout 10m;

    # ... diğer ayarlar
}
```

### 🛡️ Security Headers

**Zorunlu Headers:**
```nginx
# Nginx
add_header X-Frame-Options "SAMEORIGIN" always;
add_header X-Content-Type-Options "nosniff" always;
add_header X-XSS-Protection "1; mode=block" always;
add_header Referrer-Policy "strict-origin-when-cross-origin" always;
add_header Content-Security-Policy "default-src 'self'; script-src 'self' 'unsafe-inline' 'unsafe-eval'; style-src 'self' 'unsafe-inline'; img-src 'self' data: https:; font-src 'self' data:; connect-src 'self' https:; frame-ancestors 'self';" always;
add_header Strict-Transport-Security "max-age=31536000; includeSubDomains" always;
add_header Permissions-Policy "geolocation=(), microphone=(), camera=()" always;
```

**Laravel Middleware:**
```php
// app/Http/Middleware/SecurityHeaders.php
public function handle(Request $request, Closure $next)
{
    $response = $next($request);

    $response->headers->set('X-Frame-Options', 'SAMEORIGIN');
    $response->headers->set('X-Content-Type-Options', 'nosniff');
    $response->headers->set('X-XSS-Protection', '1; mode=block');
    $response->headers->set('Referrer-Policy', 'strict-origin-when-cross-origin');
    $response->headers->set('Strict-Transport-Security', 'max-age=31536000; includeSubDomains');
    $response->headers->set('Permissions-Policy', 'geolocation=(), microphone=(), camera=()');

    return $response;
}
```

### 🌐 CORS (Cross-Origin Resource Sharing)

**Laravel CORS Yapılandırması:**
```php
// config/cors.php
return [
    'paths' => ['api/*', 'sanctum/csrf-cookie'],
    'allowed_methods' => ['*'],
    'allowed_origins' => [
        env('FRONTEND_URL', 'http://localhost:3000'),
        env('APP_URL', 'http://localhost:8000'),
    ],
    'allowed_origins_patterns' => [],
    'allowed_headers' => ['*'],
    'exposed_headers' => [],
    'max_age' => 0,
    'supports_credentials' => true,
];
```

**Nginx CORS:**
```nginx
add_header Access-Control-Allow-Origin "https://app.premiumedu.com" always;
add_header Access-Control-Allow-Methods "GET, POST, PUT, PATCH, DELETE, OPTIONS" always;
add_header Access-Control-Allow-Headers "Authorization, Content-Type, X-Requested-With" always;
add_header Access-Control-Allow-Credentials "true" always;

if ($request_method = 'OPTIONS') {
    return 204;
}
```

### 🔐 Content Security Policy (CSP)

**Strict CSP:**
```nginx
add_header Content-Security-Policy "default-src 'self'; script-src 'self' 'unsafe-inline' 'unsafe-eval'; style-src 'self' 'unsafe-inline'; img-src 'self' data: https:; font-src 'self' data:; connect-src 'self' https://api.premiumedu.com; frame-ancestors 'self';" always;
```

**CSP Directives:**
- `default-src 'self'` - Varsayılan kaynaklar
- `script-src 'self'` - JavaScript kaynakları
- `style-src 'self' 'unsafe-inline'` - CSS kaynakları
- `img-src 'self' data: https:` - Resim kaynakları
- `connect-src 'self' https:` - API bağlantıları
- `frame-ancestors 'self'` - Iframe embedding

### ✅ Web Standartları Kontrol Listesi

- [ ] HTTPS aktif mi? (SSL sertifikası kurulu mu?)
- [ ] HTTP → HTTPS yönlendirme yapılıyor mu?
- [ ] Security headers eklendi mi?
- [ ] CORS yapılandırması doğru mu?
- [ ] CSP (Content Security Policy) aktif mi?
- [ ] HSTS (Strict-Transport-Security) aktif mi?
- [ ] X-Frame-Options ayarlandı mı?
- [ ] X-Content-Type-Options ayarlandı mı?
- [ ] Referrer-Policy ayarlandı mı?
- [ ] Permissions-Policy ayarlandı mı?

---

## 4️⃣ Güvenlik Prensipleri

### 🔐 Authentication & Authorization

**Laravel Sanctum:**
```php
// Token-based authentication
// API routes: auth:sanctum middleware
// Token expiration: config/sanctum.php
```

**Token Yönetimi:**
- Token expiration: 24 saat (varsayılan)
- Refresh token: 7 gün
- Token revocation: Logout'ta

### 🛡️ Input Validation

**FormRequest Kullanımı:**
```php
// Tüm input'lar FormRequest ile validate edilmeli
class StoreStudentRequest extends FormRequest
{
    public function rules(): array
    {
        return [
            'name' => 'required|string|max:255',
            'email' => 'required|email|unique:students',
            // ...
        ];
    }
}
```

### 🚫 SQL Injection Koruması

**Eloquent ORM:**
- ✅ Otomatik prepared statements
- ❌ Raw queries kullanılmamalı (gerekirse `DB::raw()` ile dikkatli)

### 🚫 XSS Koruması

**Laravel Blade:**
- ✅ Otomatik escape (`{{ $variable }}`)
- ❌ `{!! $variable !!}` dikkatli kullanılmalı

**API Response:**
- JSON response'lar otomatik güvenli
- User input sanitize edilmeli

### 🔒 CSRF Koruması

**Laravel:**
- ✅ Otomatik CSRF token (web routes)
- ✅ Sanctum CSRF cookie (API routes)

### ✅ Güvenlik Kontrol Listesi

- [ ] Authentication (Sanctum) aktif mi?
- [ ] Token expiration ayarlandı mı?
- [ ] Tüm input'lar validate ediliyor mu? (FormRequest)
- [ ] SQL injection koruması var mı? (Eloquent ORM)
- [ ] XSS koruması var mı? (Blade escape)
- [ ] CSRF koruması aktif mi?
- [ ] Rate limiting aktif mi?
- [ ] File upload güvenli mi? (MIME type, size limit)
- [ ] Environment variables güvenli mi? (.env dosyası git'te yok)
- [ ] Debug mode production'da kapalı mı? (`APP_DEBUG=false`)

---

## 5️⃣ Performance Optimizasyonu

### ⚡ PHP Optimizasyonu

**OPcache:**
```ini
; php.ini
opcache.enable=1
opcache.memory_consumption=256
opcache.interned_strings_buffer=16
opcache.max_accelerated_files=20000
opcache.validate_timestamps=0  # Production'da 0
opcache.revalidate_freq=0
```

**PHP-FPM:**
```ini
; php-fpm.conf
pm = dynamic
pm.max_children = 50
pm.start_servers = 10
pm.min_spare_servers = 5
pm.max_spare_servers = 20
pm.max_requests = 500
```

### 🗄️ Database Optimizasyonu

**MySQL Optimizasyonu:**
```sql
-- Index'ler
CREATE INDEX idx_tenant_id ON students(tenant_id);
CREATE INDEX idx_created_at ON students(created_at);

-- Query optimization
EXPLAIN SELECT * FROM students WHERE tenant_id = 1;
```

**Laravel Query Optimization:**
```php
// Eager loading
Student::with(['guardian', 'classroom'])->get();

// Chunking
Student::chunk(100, function ($students) {
    // Process
});
```

### 💾 Caching

**Redis Cache:**
```php
// config/cache.php
'redis' => [
    'driver' => 'redis',
    'connection' => 'cache',
    'lock_connection' => 'default',
],

// Kullanım
Cache::remember('key', 3600, function () {
    return expensiveOperation();
});
```

**Cache Stratejisi:**
- Settings: 1 saat
- User permissions: 30 dakika
- Reports: 5 dakika
- Static data: 24 saat

### 📦 Asset Optimization

**Frontend Build:**
```bash
# Production build
npm run build

# Minification
# CSS: minify
# JS: minify + tree-shaking
# Images: WebP format
```

**CDN Kullanımı:**
- Static assets: CDN'den serve edilmeli
- Images: CDN veya S3 CloudFront

### ✅ Performance Kontrol Listesi

- [ ] OPcache aktif mi?
- [ ] PHP-FPM optimize edildi mi?
- [ ] Database index'leri var mı?
- [ ] Eager loading kullanılıyor mu?
- [ ] Redis cache aktif mi?
- [ ] Frontend assets minify edildi mi?
- [ ] CDN kullanılıyor mu? (Opsiyonel)
- [ ] Gzip compression aktif mi?
- [ ] Browser caching ayarlandı mı?

---

## 6️⃣ Environment Configuration

### 🔧 Environment Variables

**.env Production:**
```env
APP_NAME="Premium Edu SaaS"
APP_ENV=production
APP_KEY=base64:...  # php artisan key:generate
APP_DEBUG=false
APP_TIMEZONE=Europe/Istanbul
APP_URL=https://api.premiumedu.com

LOG_CHANNEL=daily
LOG_LEVEL=error
LOG_DEPRECATIONS_CHANNEL=null

DB_CONNECTION=mysql
DB_HOST=127.0.0.1
DB_PORT=3306
DB_DATABASE=premium_edu
DB_USERNAME=premium_edu_user
DB_PASSWORD=strong_password_here

FILESYSTEM_DISK=s3
AWS_ACCESS_KEY_ID=your-key
AWS_SECRET_ACCESS_KEY=your-secret
AWS_DEFAULT_REGION=eu-central-1
AWS_BUCKET=premium-edu-storage

CACHE_STORE=redis
SESSION_DRIVER=redis
QUEUE_CONNECTION=redis

REDIS_HOST=127.0.0.1
REDIS_PASSWORD=null
REDIS_PORT=6379

MAIL_MAILER=smtp
MAIL_HOST=smtp.mailtrap.io
MAIL_PORT=2525
MAIL_USERNAME=your-username
MAIL_PASSWORD=your-password
MAIL_ENCRYPTION=tls
MAIL_FROM_ADDRESS="noreply@premiumedu.com"
MAIL_FROM_NAME="Premium Edu"

SMS_DRIVER=netgsm
SMS_NETGSM_USERNAME=your-username
SMS_NETGSM_PASSWORD=your-password
SMS_NETGSM_MSGHEADER=your-header
```

### 🔐 Güvenlik Ayarları

**Production Checklist:**
- [ ] `APP_DEBUG=false`
- [ ] `APP_ENV=production`
- [ ] Strong `APP_KEY` (32 karakter)
- [ ] Strong database password
- [ ] Strong Redis password (opsiyonel)
- [ ] AWS credentials güvenli
- [ ] `.env` dosyası git'te yok
- [ ] `.env.example` güncel

### ✅ Environment Kontrol Listesi

- [ ] `.env` dosyası production için yapılandırıldı mı?
- [ ] `APP_DEBUG=false` ayarlandı mı?
- [ ] `APP_KEY` generate edildi mi?
- [ ] Database credentials güvenli mi?
- [ ] AWS/S3 credentials ayarlandı mı?
- [ ] Redis credentials ayarlandı mı?
- [ ] Mail credentials ayarlandı mı?
- [ ] SMS credentials ayarlandı mı?
- [ ] `.env` dosyası git'te ignore edildi mi?

---

## 7️⃣ Backup Stratejileri

### 💾 Database Backup

**Otomatik Backup (Cron):**
```bash
# /etc/cron.daily/laravel-backup
#!/bin/bash
mysqldump -u premium_edu_user -p'password' premium_edu > /backups/db/$(date +\%Y\%m\%d)_premium_edu.sql
gzip /backups/db/$(date +\%Y\%m\%d)_premium_edu.sql

# 30 günden eski backup'ları sil
find /backups/db -name "*.sql.gz" -mtime +30 -delete
```

**Laravel Backup Package:**
```bash
composer require spatie/laravel-backup
```

```php
// config/backup.php
'backup' => [
    'name' => 'premium-edu',
    'source' => [
        'databases' => [
            'mysql',
        ],
        'files' => [
            'base_path' => storage_path('app'),
        ],
    ],
    'destination' => [
        'disks' => ['s3'],
    ],
],
```

### 📁 File Backup

**S3 Lifecycle Policy:**
```json
{
  "Rules": [
    {
      "Id": "BackupRule",
      "Status": "Enabled",
      "Prefix": "backups/",
      "Transitions": [
        {
          "Days": 30,
          "StorageClass": "GLACIER"
        }
      ]
    }
  ]
}
```

### ✅ Backup Kontrol Listesi

- [ ] Database backup otomatik mi?
- [ ] Backup retention policy var mı? (30 gün)
- [ ] Backup restore test edildi mi?
- [ ] File backup stratejisi var mı?
- [ ] Backup'lar güvenli yerde mi? (S3, external)
- [ ] Backup monitoring var mı? (Başarısız backup bildirimi)

---

## 8️⃣ Monitoring & Logging

### 📊 Application Monitoring

**Laravel Logging:**
```php
// config/logging.php
'channels' => [
    'daily' => [
        'driver' => 'daily',
        'path' => storage_path('logs/laravel.log'),
        'level' => env('LOG_LEVEL', 'error'),
        'days' => 14,
    ],
],
```

**Error Tracking:**
- Sentry (önerilen)
- Bugsnag
- Rollbar

### 📈 Performance Monitoring

**APM Tools:**
- New Relic
- Datadog
- Laravel Telescope (development)

### 🔔 Alerting

**Critical Alerts:**
- Database connection failure
- Queue worker down
- High error rate
- Disk space low
- Backup failure

### ✅ Monitoring Kontrol Listesi

- [ ] Logging yapılandırıldı mı?
- [ ] Error tracking (Sentry) kuruldu mu?
- [ ] Performance monitoring aktif mi?
- [ ] Alerting sistemi kuruldu mu?
- [ ] Log rotation ayarlandı mı?
- [ ] Disk space monitoring var mı?

---

## 9️⃣ Deployment Best Practices

### 🚀 Deployment Süreci

**1. Pre-Deployment:**
```bash
# Test ortamında test et
php artisan test

# Migration'ları kontrol et
php artisan migrate:status

# Cache temizle
php artisan cache:clear
php artisan config:clear
php artisan route:clear
php artisan view:clear
```

**2. Deployment:**
```bash
# Git pull
git pull origin main

# Composer install
composer install --no-dev --optimize-autoloader

# NPM build (frontend)
npm ci
npm run build

# Migration
php artisan migrate --force

# Cache optimize
php artisan config:cache
php artisan route:cache
php artisan view:cache
php artisan event:cache

# Queue restart
php artisan queue:restart
```

**3. Post-Deployment:**
```bash
# Health check
curl https://api.premiumedu.com/health

# Queue worker kontrol
php artisan queue:work --once
```

### 🔄 Zero-Downtime Deployment

**Blue-Green Deployment:**
- İki ortam (blue/green)
- Load balancer ile switch
- Rollback kolaylığı

**Rolling Deployment:**
- Container-based (Docker)
- Yeni container'lar başlat
- Eski container'ları kapat

### ✅ Deployment Kontrol Listesi

- [ ] Deployment script hazır mı?
- [ ] Pre-deployment test yapılıyor mu?
- [ ] Migration stratejisi var mı?
- [ ] Rollback planı var mı?
- [ ] Zero-downtime deployment mümkün mü?
- [ ] Health check endpoint var mı?
- [ ] Queue worker restart yapılıyor mu?

---

## 🔟 Kontrol Listesi

### Genel Hosting Kontrol Listesi

#### Hosting Seçimi
- [ ] Hosting türü seçildi mi? (VPS/Cloud)
- [ ] PHP 8.2+ desteği var mı?
- [ ] MySQL 8.0+ desteği var mı?
- [ ] Redis desteği var mı?
- [ ] SSL sertifikası kurulabiliyor mu?
- [ ] SSH erişimi var mı?
- [ ] Minimum kaynaklar yeterli mi? (2GB RAM, 20GB disk)

#### Dosyalama Sistemi
- [ ] Dosyalama sistemi seçildi mi? (Local/S3/MinIO)
- [ ] Environment variables ayarlandı mı?
- [ ] Tenant bazlı klasör yapısı kullanılıyor mu?
- [ ] Signed URL desteği var mı? (S3/MinIO)
- [ ] Backup stratejisi belirlendi mi?

#### Web Standartları
- [ ] HTTPS aktif mi?
- [ ] Security headers eklendi mi?
- [ ] CORS yapılandırması doğru mu?
- [ ] CSP aktif mi?
- [ ] HSTS aktif mi?

#### Güvenlik
- [ ] `APP_DEBUG=false` ayarlandı mı?
- [ ] Strong passwords kullanılıyor mu?
- [ ] Input validation aktif mi?
- [ ] Rate limiting aktif mi?
- [ ] File upload güvenli mi?

#### Performance
- [ ] OPcache aktif mi?
- [ ] PHP-FPM optimize edildi mi?
- [ ] Database index'leri var mı?
- [ ] Redis cache aktif mi?
- [ ] Frontend assets optimize edildi mi?

#### Backup & Monitoring
- [ ] Database backup otomatik mi?
- [ ] File backup stratejisi var mı?
- [ ] Logging yapılandırıldı mı?
- [ ] Error tracking (Sentry) kuruldu mu?
- [ ] Alerting sistemi kuruldu mu?

#### Deployment
- [ ] Deployment script hazır mı?
- [ ] Migration stratejisi var mı?
- [ ] Rollback planı var mı?
- [ ] Health check endpoint var mı?

---

## 📊 Önerilen Hosting Yapılandırması

### 🏆 Production Önerisi

**Hosting:** VPS veya Cloud (DigitalOcean, Hetzner, AWS)  
**Dosyalama:** AWS S3 veya MinIO  
**Database:** MySQL 8.0+ (managed veya self-hosted)  
**Cache:** Redis  
**Web Server:** Nginx  
**SSL:** Let's Encrypt (otomatik yenileme)  
**Monitoring:** Sentry + Uptime monitoring  
**Backup:** Otomatik daily backup (S3'te)

### 💰 Maliyet Tahmini (Aylık)

**VPS (Hetzner/DigitalOcean):**
- VPS: €20-40 (4GB RAM, 2 CPU, 80GB SSD)
- S3 Storage: $0.023/GB (ilk 50GB)
- Domain: €10/yıl
- SSL: Ücretsiz (Let's Encrypt)
- **Toplam: ~€25-50/ay**

**Cloud (AWS):**
- EC2: $30-50/ay
- RDS: $50-100/ay
- S3: $10-20/ay
- CloudFront: $5-10/ay
- **Toplam: ~$100-200/ay**

---

## 🔚 Son Notlar

### ⚠️ Kritik Noktalar

1. **Güvenlik:** Production'da `APP_DEBUG=false` zorunlu
2. **Backup:** Daily backup + restore test
3. **Monitoring:** Error tracking + uptime monitoring
4. **Performance:** OPcache + Redis + Database index'leri
5. **SSL:** HTTPS zorunlu (Let's Encrypt ücretsiz)

### 📚 Ek Kaynaklar

- [Laravel Deployment](https://laravel.com/docs/deployment)
- [Nginx Configuration](https://nginx.org/en/docs/)
- [Let's Encrypt](https://letsencrypt.org/)
- [AWS S3 Best Practices](https://docs.aws.amazon.com/AmazonS3/latest/userguide/security-best-practices.html)

---

**Son Güncelleme:** 2026-01-22  
**Güncelleyen:** AI Assistant  
**Versiyon:** 1.0.0
