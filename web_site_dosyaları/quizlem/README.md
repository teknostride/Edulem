# QuizLem 🚀 - Kahoot Benzeri Gerçek Zamanlı Bilgi Yarışması Platformu

QuizLem, modern web teknolojileri (Node.js, Express, Socket.io, SQLite ve Tailwind CSS) ile geliştirilmiş, Kahoot hissiyatı veren tam teşekküllü ve gerçek zamanlı bir bilgi yarışması platformudur.

---

## 🌟 Temel Özellikler

### 1. Öğretmen / Sunucu (Host)
- **Kimlik Doğrulama:** Kayıt ve Giriş sistemi (Yerleşik Demo Hesabı: `ogretmen` / `123456`).
- **Soru Hazırlama Editörü:** 
  - 4 Şıklı Çoktan Seçmeli sorular (Kahoot renkleri: Kırmızı ▲, Mavi ◆, Sarı ●, Yeşil ■).
  - Doğru / Yanlış soruları.
  - Süre limiti seçimi (10s, 20s, 30s, 60s).
  - Puan katsayısı belirleme (Standart / 🔥 2X Çift Puan).
- **Yarışma Yayını (Lobi & Sunucu Ekranı):**
  - 6 haneli rastgele PIN kodu.
  - Odaya katılan öğrencilerin gerçek zamanlı listesi ve avatar rozetleri.
  - Canlı geri sayım sayacı ve anlık cevap sayısı göstergesi.
  - Soru sonu yanıt dağılımı çubuk grafiği (Bar chart) ve Top 5 Liderlik Tablosu.
  - 3 Boyutlu Final Podyumu (1., 2. ve 3.) ve konfeti kutlaması.

### 2. Öğrenci / Yarışmacı (Mobil Öncelikli)
- **Hızlı Katılım:** PIN kodu, Rumuz ve 12 eğlenceli avatar seçimi.
- **Bekleme Odası:** Öğretmenin yarışmayı başlatmasını bekleyen animasyonlu bekleme ekranı.
- **Dokunmatik Cevaplama Ekranı:** Soruyu ana ekrandan/tahtadan okuyup mobil cihazdan sadece 4 renkli/geometrik butona basma imkanı.
- **Anti-Cheat Koruması:** Doğru şıklar ve şık metinleri süre bitene kadar öğrencinin cihazına gönderilmez, kaynak koddan kopya çekilemez.
- **Hıza Dayalı Kahoot Puanlama:** Ne kadar erken doğru cevap verilirse o kadar yüksek puan + ardışık seriler için streak bonusu.
- **Anlık Geri Bildirim:** Soru bitiminde "DOĞRU!" / "YANLIŞ!", kazanılan puan ve anlık sıra.
- **Web Audio API Entegrasyonu:** Harici ses dosyası indirmeden tamamen tarayıcıda sentezlenen geri bildirim ve kutlama sesleri.

---

## 🛠️ Kurulum ve Çalıştırma

### Gereksinimler
- Node.js (v18 veya üzeri önerilir)
- npm

### Adımlar

1. Bağımlılıkları yükleyin (halihazırda yüklendi):
   ```bash
   npm install
   ```

2. Sunucuyu başlatın:
   ```bash
   npm start
   ```

3. Tarayıcınızda açın:
   - **Adres:** `http://localhost:3000`
   - **Demo Öğretmen Girişi:** 
     - Kullanıcı Adı: `ogretmen`
     - Şifre: `123456`

---

## 📁 Proje Dizin Yapısı

```
quizlem/
├── package.json          # Proje bağımlılıkları ve çalıştırma komutları
├── server.js             # Node.js, Express, Socket.io ve SQLite backend motoru
├── test_quizlem.js       # Uçtan uca otomatik simülasyon ve doğrulama testi
├── data/
│   └── quizlem.db        # SQLite yerel veritabanı (otomatik oluşturulur)
└── public/
    ├── index.html        # Tailwind CSS CDN, Socket.io ve UI iskeleti
    ├── app.js            # Tek parça modüler reaktif SPA mantığı ve ses sentezleyici
    └── favicon.svg       # QuizLem logosu ve ikonu
```
