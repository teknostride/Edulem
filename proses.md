---
 status: in_progress
 owner: alperen
 project: edulem-mobile-parity
---

# EduLem Mobil Uygulama (Web ile Eşleşme) Prosesi

## 1) Amaç ve Öncelikler
Mobil uygulama, web ile fonksiyonel eşleşmeyi (parity) sağlayacak; ama **en kritik başarı kriterleri** şunlar olacak:

- **Tasarım/renk birebir**: web tema token’ları ve form görünümü korunacak.
- **Giriş (login) ve oturum yönetimi**: web ile aynı response yapısı ve aynı token anahtarıyla ilerleyecek.
- **Ekleme/Düzenleme formları (CRUD)**: validasyon mesajları, zorunlu alanlar, scope/role davranışları web ile uyumlu olacak.

## 2) Kaynaklar (Tek Doğruluk Noktası)
Bu repo içinde web güncellemelerinin referansı:

- Frontend: `web_site_dosyaları/edulem-frontend`
- Backend: `web_site_dosyaları/edulem-backend` (Laravel + Sanctum)

Mobil tarafı (Flutter) her zaman bu iki kaynağa göre güncellenecek.

## 3) Mimari Standart (Mobil)
Uygulama Flutter ile geliştirilecek ve iOS/Android yayınlanabilir olacak.

- Routing: `go_router`
- State: Riverpod
- HTTP: Dio
- Auth saklama: SecureStorage (token) + local cache (user/profile)

## 4) Tasarım Sistemi ve Renkler (Kırmızı Çizgiler)
Web’deki tasarım yaklaşımı sadece “ana renkler” değil, **form border’ları, focus shadow’ları, radius, gölge** gibi hissiyat detaylarını da içeriyor.

### 4.1 Tema token kaynakları

- CSS değişkenleri ve form stilleri: `web_site_dosyaları/edulem-frontend/src/index.css`
- Uygulama/skin token’ları: (web tema dosyaları ve ilgili css çıktıları)

### 4.2 Mobilde zorunlu UI karşılıkları

- Form input border: 2px hissiyatı (Flutter’da `OutlineInputBorder` stroke)
- Focus state: “renk + shadow” hissi (Flutter’da `focusedBorder` + `boxShadow` benzeri)
- Radius: web’deki 8px çizgisi korunacak
- Login “premium” görünüm: web’deki gradient/hero yapısına yakın bir mobil hero alanı

## 5) Authentication ve Session Prosesleri (Güncel)

### 5.0 Multi-tenant (SaaS) Tenant Seçimi
Mobil uygulama birden fazla kuruma hizmet edecek. Örnek tenant’lar:

- `demo.edulem.com`
- `akirfan.edulem.com`
- ileride `x.edulem.com`

Bu nedenle **login ekranında tenant seçimi** zorunludur.

Tenant seçiminin amacı:

- Doğru tenant backend’ine bağlanmak (her tenant farklı DB/MySQL’e gidebilir)
- Aynı kullanıcı bilgisiyle farklı tenant’larda oturumların karışmasını engellemek

Mobil standart:

- Tenant storage key: `TENANT_HOST` (örn: `demo.edulem.com`)
- API base storage key: `API_BASE_URL` (örn: `https://api.demo.edulem.com/api/v1`)

Tenant değişirse:

- `ACCESS_TOKEN` temizlenir
- kullanıcı cache’i temizlenir
- uygulama login ekranına döner

### 5.0.1 Tenant listesinin yönetimi (ölçeklenebilir model)
Tenant sayısı artacağı için mobil uygulamada tenant’ları “sabit liste” yapmak yerine aşağıdaki standart uygulanır:

- **Standart: Tenant discovery** endpoint’i sağlanır ve login ekranı açılırken tenant listesi buradan çekilir.
- Discovery endpoint’i erişilemezse uygulama **allowlist fallback** ile (örn: demo, akirfan) çalışır.
- Ek olarak, yetkili kullanım için “manuel tenant girişi” opsiyonu bulunur (örn. staging/test için).

Önerilen discovery sözleşmesi (örnek):

- `GET https://edulem.com/api/tenants`
- Response: tenant kartları (`tenants: []` veya direkt array)
  - `tenant_key` (örn: `demo`)
  - `tenant_host` (örn: `demo.edulem.com`)
  - `display_name` (örn: `Demo Kurum`)
  - `logo_url` (opsiyonel)
  - `api_base_url` (opsiyonel; yoksa mobil `https://api.{tenant_host}/api/v1` kuralıyla üretir)
  - `is_active` (opsiyonel)

Güvenlik / kötüye kullanım önlemleri:

- Uygulama, tenant kaynağı discovery olsa bile **domain doğrulaması** yapar.
  - Minimum: sadece `*.edulem.com` host’larına izin ver.
- `api_base_url` server’dan dönüyorsa, yine allowlist/regex doğrulamasından geçmeden kullanılmaz.
- Tenant discovery endpoint’i rate-limit ve cache (CDN) ile servis edilebilir.

### 5.1 Login request/response sözleşmesi

- Endpoint: `POST /api/v1/auth/login`
- Response (web’in beklediği yapı):
  - `status: true|false`
  - `data.user`
  - `data.token`
  - `message`

Backend implementasyonu:

- `web_site_dosyaları/edulem-backend/app/Http/Controllers/AuthController.php`

Önemli davranışlar:

- **Kısmi e-posta eşleşmesi** destekleniyor (kullanıcı sadece “kullanıcı adı” yazabilir).
- Hem personel hem veli girişi aynı endpoint üzerinden dönebiliyor.

### 5.2 Token anahtarı standardı
Web frontend `axiosClient` interceptor’ı token’ı **`ACCESS_TOKEN`** anahtarıyla arıyor.

Mobilde de tek standart:

- Token storage key: `ACCESS_TOKEN`
- 401 gelirse:
  - Token ve kullanıcı cache’i temizlenir
  - Kullanıcı login ekranına düşürülür

### 5.3 Rol bazlı yönlendirme
Web’de login sonrası rol bazlı route seçiliyor.
Mobilde:

- `role` alanı string veya object gelebileceği için normalize edilecek.
- `layout/init` ve `user/profile` sonrası menü ve dashboard shell rol bazlı çizilecek.

## 6) API Base URL ve Ortam Stratejisi
Web’de API base url dinamik üretilebiliyor (`axiosClient.ts`). Mobilde **ortam + tenant** birleşimiyle base URL belirlenir.

- DEV: local/staging
- UAT: test
- PROD: canlı

Base URL formatı:

- `.../api/v1`

### 6.1 Tenant’a göre base URL üretimi
Mobilde tenant seçimi yapıldıktan sonra base URL şu kuralla türetilir:

- Eğer web domain `TENANT_HOST = {tenant}.edulem.com` ise
- API base: `https://api.{tenant}.edulem.com/api/v1`

Notlar:

- Bu kural web tarafındaki yaklaşımla uyumlu olacak şekilde tasarlanır (örn. `axiosClient.ts` benzeri).
- Tenant’a göre base URL türetme yapılırken **sadece allowlist** tenant’lar gösterilir (ilk etapta: demo, akirfan).
- Tenant seçimi olmadan login isteği atılmaz.

### 6.1.1 Custom domain / ileride farklı domain senaryosu
Şu an standart `*.edulem.com` olsa da ileride kurumların kendi domain’i olabilir. Bu durumda:

- Tenant discovery response’unda `api_base_url` doğrudan döndürülür.
- Mobil, `api.{host}` kuralı yerine `api_base_url` değerini kullanır.
- Mobil yine de `https` zorunlu tutar ve host doğrulaması uygular (discovery tarafında verilen kurallara göre).

### 6.2 Tenant + token izolasyonu
Aynı cihazda birden fazla tenant’a giriş yapılabileceği için, minimum izolasyon kuralı:

- Tenant değişirse mutlaka `ACCESS_TOKEN` ve kullanıcı cache’i temizlenir.
- İleride gerekirse token anahtarı tenant’lı tutulabilir (örn: `ACCESS_TOKEN@demo.edulem.com`), ama ilk standart “tenant değişince temizle”dir.

## 7) CRUD ve Form Standartları (Çok Kritik)
Mobilde her CRUD ekranı aynı davranış setini taşımalı.

### 7.1 Form davranış checklist’i

- Create vs Edit:
  - Edit modda mevcut veri API’den gelir
  - Create modda bazı alanlar özellikle boş başlar (web’de ör: yeni kullanıcıda e-posta/şifre otomatik dolmasın)
- Validasyon:
  - `422` -> field errors ilk mesaj gösterilir
  - `401` -> session drop + login
  - `500/501` -> kullanıcıya “sunucu hatası” UX state
- Dependent alanlar:
  - Örn: `campus_ids` değişince `education_level_ids` resetlenir
  - Rol scope değişince ilgili seçimler otomatik temizlenir

### 7.2 Liste ekranı standartları

- Arama: debounce
- Pagination: infinite scroll (web’de sayfalama varsa mobilde sayfa tabanlı da kabul, ama UX akıcı olmalı)
- Filtreler: BottomSheet / modal
- Boş state / error state: tasarımla uyumlu premium bileşenler

## 8) Backend Route Envanteri (Güncel Referans)
Kaynak dosya:

- `web_site_dosyaları/edulem-backend/routes/api.php`

Mobil geliştirme sırasında her modül açılırken ilgili endpoint’ler buradan doğrulanacak.
Bu dosyada modül sayısı arttığı için parity takibi “sayfa bazlı” yapılacak.

## 9) Parity (Kabul Kriterleri)
Bir ekran “DONE” sayılmadan önce:

- Tasarım token uyumu (renk/radius/border/focus)
- Login-session stabil (401/403/422/500 senaryoları)
- Web ile aynı filtre/arama sonucu
- CRUD create/update/delete tam ve geri bildirimleri doğru
- Loading/empty/error state’leri tamam

## 10) İşleyiş (Günlük Çalışma Proses Akışı)
Her yeni modül/ekran için uygulanan standart akış:

1) Web’de ekranı incele (UI + iş kuralları + form alanları).
2) Backend endpoint’lerini `routes/api.php` üzerinden doğrula.
3) Mobilde UI kit bileşenleriyle ekranı üret (tasarım token’larıyla).
4) Data layer: request/response normalize + error mapping.
5) QA senaryoları: boş state, hatalı şifre, yetkisiz kullanıcı, 422 validasyon.

## 11) Açık Noktalar (Sizden Netleştirme Gerekenler)

- [ ] Tenant discovery endpoint’inin kesin URL’i ve response formatı (örn: `GET https://edulem.com/api/tenants`)
- [ ] Allowlist fallback başlangıç listesi (örn: demo, akirfan) ve manuel tenant girişinin açılıp açılmayacağı
- [ ] Mobilde “veli/portal” kullanıcıları hangi ekran setini görmeli? (tek app mi, ayrı app mi)
- [ ] Push notification (FCM/APNS) kapsamda mı, yoksa web parity sonrası mı?
- [ ] Dosya indirme/upload mobilde hangi UX ile olacak? (native share sheet, in-app viewer)

## 12) Günlük Notlar

- 2026-04-06: Web güncellemeleri sonrası proses.md sıfırdan güncellendi.
