<?php

namespace Database\Seeders;

use App\Models\City;
use App\Models\District;
use Illuminate\Database\Seeder;

class FullCityDistrictSeeder extends Seeder
{
    /**
     * Run the database seeds.
     */
    public function run(): void
    {
        $cities = [
            ['plate_code' => '01', 'name' => 'Adana', 'districts' => ['Aladağ', 'Ceyhan', 'Çukurova', 'Feke', 'İmamoğlu', 'Karaisalı', 'Karataş', 'Kozan', 'Pozantı', 'Saimbeyli', 'Sarıçam', 'Seyhan', 'Tufanbeyli', 'Yumurtalık', 'Yüreğir']],
            ['plate_code' => '02', 'name' => 'Adıyaman', 'districts' => ['Besni', 'Çelikhan', 'Gerger', 'Gölbaşı', 'Kahta', 'Merkez', 'Samsat', 'Sincik', 'Tut']],
            ['plate_code' => '03', 'name' => 'Afyonkarahisar', 'districts' => ['Başmakçı', 'Bayat', 'Bolvadin', 'Çay', 'Çobanlar', 'Dazkırı', 'Dinar', 'Emirdağ', 'Evciler', 'Hocalar', 'İhsaniye', 'İscehisar', 'Kızılören', 'Merkez', 'Sandıklı', 'Sinanpaşa', 'Sultandağı', 'Şuhut']],
            ['plate_code' => '04', 'name' => 'Ağrı', 'districts' => ['Diyadin', 'Doğubayazıt', 'Eleşkirt', 'Hamur', 'Merkez', 'Patnos', 'Taşlıçay', 'Tutak']],
            ['plate_code' => '05', 'name' => 'Amasya', 'districts' => ['Göynücek', 'Gümüşhacıköy', 'Hamamözü', 'Merkez', 'Merzifon', 'Suluova', 'Taşova']],
            ['plate_code' => '06', 'name' => 'Ankara', 'districts' => ['Akyurt', 'Altındağ', 'Ayaş', 'Bala', 'Beypazarı', 'Çamlıdere', 'Çankaya', 'Çubuk', 'Elmadağ', 'Etimesgut', 'Evren', 'Gölbaşı', 'Güdül', 'Haymana', 'Kalecik', 'Kızılcahamam', 'Keçiören', 'Mamak', 'Nallıhan', 'Polatlı', 'Şereflikoçhisar', 'Sincan', 'Yenimahalle']],
            ['plate_code' => '07', 'name' => 'Antalya', 'districts' => ['Akseki', 'Aksu', 'Alanya', 'Demre', 'Döşemealtı', 'Elmalı', 'Finike', 'Gazipaşa', 'Gündoğmuş', 'İbradı', 'Kaş', 'Kemer', 'Kepez', 'Konyaaltı', 'Korkuteli', 'Kumluca', 'Manavgat', 'Muratpaşa', 'Serik']],
            ['plate_code' => '08', 'name' => 'Artvin', 'districts' => ['Ardanuç', 'Arhavi', 'Borçka', 'Hopa', 'Merkez', 'Murgul', 'Şavşat', 'Yusufeli']],
            ['plate_code' => '09', 'name' => 'Aydın', 'districts' => ['Bozdoğan', 'Buharkent', 'Çine', 'Didim', 'Efeler', 'Germencik', 'İncirliova', 'Karacasu', 'Karpuzlu', 'Koçarlı', 'Köşk', 'Kuşadası', 'Kuyucak', 'Nazilli', 'Söke', 'Sultanhisar', 'Yenipazar']],
            ['plate_code' => '10', 'name' => 'Balıkesir', 'districts' => ['Altıeylül', 'Ayvalık', 'Balya', 'Bandırma', 'Bigadiç', 'Burhaniye', 'Dursunbey', 'Edremit', 'Erdek', 'Gömeç', 'Gönen', 'Havran', 'İvrindi', 'Karesi', 'Kepsut', 'Manyas', 'Marmara', 'Savaştepe', 'Sındırgı', 'Susurluk']],
            ['plate_code' => '11', 'name' => 'Bilecik', 'districts' => ['Bozüyük', 'Gölpazarı', 'İnhisar', 'Merkez', 'Osmaneli', 'Pazaryeri', 'Söğüt', 'Yenipazar']],
            ['plate_code' => '12', 'name' => 'Bingöl', 'districts' => ['Adaklı', 'Genç', 'Karlıova', 'Kiğı', 'Merkez', 'Solhan', 'Yayladere', 'Yedisu']],
            ['plate_code' => '13', 'name' => 'Bitlis', 'districts' => ['Adilcevaz', 'Ahlat', 'Güroymak', 'Hizan', 'Merkez', 'Mutki', 'Tatvan']],
            ['plate_code' => '14', 'name' => 'Bolu', 'districts' => ['Dörtdivan', 'Gerede', 'Göynük', 'Kıbrıscık', 'Mengen', 'Merkez', 'Mudurnu', 'Seben', 'Yeniçağa']],
            ['plate_code' => '15', 'name' => 'Burdur', 'districts' => ['Ağlasun', 'Altınyayla', 'Bucak', 'Çavdır', 'Çeltikçi', 'Gölhisar', 'Karamanlı', 'Kemer', 'Merkez', 'Tefenni', 'Yeşilova']],
            ['plate_code' => '16', 'name' => 'Bursa', 'districts' => ['Büyükorhan', 'Gemlik', 'Gürsu', 'Harmancık', 'İnegöl', 'İznik', 'Karacabey', 'Keles', 'Kestel', 'Mudanya', 'Mustafakemalpaşa', 'Nilüfer', 'Orhaneli', 'Orhangazi', 'Osmangazi', 'Yenişehir', 'Yıldırım']],
            ['plate_code' => '17', 'name' => 'Çanakkale', 'districts' => ['Ayvacık', 'Bayramiç', 'Biga', 'Bozcaada', 'Çan', 'Eceabat', 'Ezine', 'Gelibolu', 'Gökçeada', 'Lapseki', 'Merkez', 'Yenice']],
            ['plate_code' => '18', 'name' => 'Çankırı', 'districts' => ['Atkaracalar', 'Bayramören', 'Çerkeş', 'Eldivan', 'Ilgaz', 'Kızılırmak', 'Korgun', 'Kurşunlu', 'Merkez', 'Orta', 'Şabanözü', 'Yapraklı']],
            ['plate_code' => '19', 'name' => 'Çorum', 'districts' => ['Alaca', 'Bayat', 'Boğazkale', 'Dodurga', 'İskilip', 'Kargı', 'Laçin', 'Mecitözü', 'Merkez', 'Oğuzlar', 'Ortaköy', 'Osmancık', 'Sungurlu', 'Uğurludağ']],
            ['plate_code' => '20', 'name' => 'Denizli', 'districts' => ['Acıpayam', 'Babadağ', 'Baklan', 'Bekilli', 'Beyağaç', 'Bozkurt', 'Buldan', 'Çal', 'Çameli', 'Çardak', 'Çivril', 'Güney', 'Honaz', 'Kale', 'Merkezefendi', 'Pamukkale', 'Sarayköy', 'Serinhisar', 'Tavas']],
            ['plate_code' => '21', 'name' => 'Diyarbakır', 'districts' => ['Bağlar', 'Bismil', 'Çermik', 'Çınar', 'Çüngüş', 'Dicle', 'Eğil', 'Ergani', 'Hani', 'Hazro', 'Kayapınar', 'Kocaköy', 'Kulp', 'Lice', 'Silvan', 'Sur', 'Yenişehir']],
            ['plate_code' => '22', 'name' => 'Edirne', 'districts' => ['Enez', 'Havsa', 'İpsala', 'Keşan', 'Lalapaşa', 'Meriç', 'Merkez', 'Süloğlu', 'Uzunköprü']],
            ['plate_code' => '23', 'name' => 'Elazığ', 'districts' => ['Ağın', 'Alacakaya', 'Arıcak', 'Baskil', 'Karakoçan', 'Keban', 'Kovancılar', 'Maden', 'Merkez', 'Palu', 'Sivrice']],
            ['plate_code' => '24', 'name' => 'Erzincan', 'districts' => ['Çayırlı', 'İliç', 'Kemah', 'Kemaliye', 'Merkez', 'Otlukbeli', 'Refahiye', 'Tercan', 'Üzümlü']],
            ['plate_code' => '25', 'name' => 'Erzurum', 'districts' => ['Aşkale', 'Aziziye', 'Çat', 'Hınıs', 'Horasan', 'İspir', 'Karaçoban', 'Karayazı', 'Köprüköy', 'Narman', 'Oltu', 'Olur', 'Palandöken', 'Pasinler', 'Pazaryolu', 'Şenkaya', 'Tekman', 'Tortum', 'Uzundere', 'Yakutiye']],
            ['plate_code' => '26', 'name' => 'Eskişehir', 'districts' => ['Alpu', 'Beylikova', 'Çifteler', 'Günyüzü', 'Han', 'İnönü', 'Mahmudiye', 'Mihalgazi', 'Mihalıççık', 'Odunpazarı', 'Sarıcakaya', 'Seyitgazi', 'Sivrihisar', 'Tepebaşı']],
            ['plate_code' => '27', 'name' => 'Gaziantep', 'districts' => ['Araban', 'İslahiye', 'Karkamış', 'Nizip', 'Nurdağı', 'Oğuzeli', 'Şahinbey', 'Şehitkamil', 'Yavuzeli']],
            ['plate_code' => '28', 'name' => 'Giresun', 'districts' => ['Alucra', 'Bulancak', 'Çanakçı', 'Dereli', 'Doğankent', 'Espiye', 'Eynesil', 'Görele', 'Güce', 'Keşap', 'Merkez', 'Piraziz', 'Şebinkarahisar', 'Tirebolu', 'Yağlıdere']],
            ['plate_code' => '29', 'name' => 'Gümüşhane', 'districts' => ['Kelkit', 'Köse', 'Kürtün', 'Merkez', 'Şiran', 'Torul']],
            ['plate_code' => '30', 'name' => 'Hakkari', 'districts' => ['Çukurca', 'Merkez', 'Şemdinli', 'Yüksekova']],
            ['plate_code' => '31', 'name' => 'Hatay', 'districts' => ['Altınözü', 'Antakya', 'Arsuz', 'Belen', 'Defne', 'Dörtyol', 'Erzin', 'Hassa', 'İskenderun', 'Kırıkhan', 'Kumlu', 'Payas', 'Reyhanlı', 'Samandağ', 'Yayladağı']],
            ['plate_code' => '32', 'name' => 'Isparta', 'districts' => ['Aksu', 'Atabey', 'Eğirdir', 'Gelendost', 'Gönen', 'Keçiborlu', 'Merkez', 'Senirkent', 'Sütçüler', 'Şarkikaraağaç', 'Uluborlu', 'Yalvaç', 'Yenişarbademli']],
            ['plate_code' => '33', 'name' => 'Mersin', 'districts' => ['Akdeniz', 'Anamur', 'Aydıncık', 'Bozyazı', 'Çamlıyayla', 'Erdemli', 'Gülnar', 'Mezitli', 'Mut', 'Silifke', 'Tarsus', 'Toroslar', 'Yenişehir']],
            ['plate_code' => '34', 'name' => 'İstanbul', 'districts' => ['Adalar', 'Arnavutköy', 'Ataşehir', 'Avcılar', 'Bağcılar', 'Bahçelievler', 'Bakırköy', 'Başakşehir', 'Bayrampaşa', 'Beşiktaş', 'Beykoz', 'Beylikdüzü', 'Beyoğlu', 'Büyükçekmece', 'Çatalca', 'Çekmeköy', 'Esenler', 'Esenyurt', 'Eyüpsultan', 'Fatih', 'Gaziosmanpaşa', 'Güngören', 'Kadıköy', 'Kağıthane', 'Kartal', 'Küçükçekmece', 'Maltepe', 'Pendik', 'Sancaktepe', 'Sarıyer', 'Silivri', 'Sultanbeyli', 'Sultangazi', 'Şile', 'Şişli', 'Tuzla', 'Ümraniye', 'Üsküdar', 'Zeytinburnu']],
            ['plate_code' => '35', 'name' => 'İzmir', 'districts' => ['Aliağa', 'Balçova', 'Bayındır', 'Bayraklı', 'Bergama', 'Beydağ', 'Bornova', 'Buca', 'Çeşme', 'Çiğli', 'Dikili', 'Foça', 'Gaziemir', 'Güzelbahçe', 'Karaburun', 'Karşıyaka', 'Kemalpaşa', 'Kınık', 'Kiraz', 'Konak', 'Menderes', 'Menemen', 'Narlıdere', 'Ödemiş', 'Seferihisar', 'Selçuk', 'Tire', 'Torbalı', 'Urla']],
            ['plate_code' => '36', 'name' => 'Kars', 'districts' => ['Akyaka', 'Arpaçay', 'Digor', 'Kağızman', 'Merkez', 'Sarıkamış', 'Selim', 'Susuz']],
            ['plate_code' => '37', 'name' => 'Kastamonu', 'districts' => ['Abana', 'Ağlı', 'Araç', 'Azdavay', 'Bozkurt', 'Cide', 'Çatalzeytin', 'Daday', 'Devrekani', 'Doğanyurt', 'Hanönü', 'İhsangazi', 'İnebolu', 'Küre', 'Merkez', 'Pınarbaşı', 'Seydiler', 'Şenpazar', 'Taşköprü', 'Tosya']],
            ['plate_code' => '38', 'name' => 'Kayseri', 'districts' => ['Akkışla', 'Bünyan', 'Develi', 'Felahiye', 'Hacılar', 'İncesu', 'Kocasinan', 'Melikgazi', 'Özvatan', 'Pınarbaşı', 'Sarıoğlan', 'Sarız', 'Talas', 'Tomarza', 'Yahyalı', 'Yeşilhisar']],
            ['plate_code' => '39', 'name' => 'Kırklareli', 'districts' => ['Babaeski', 'Demirköy', 'Kofçaz', 'Lüleburgaz', 'Merkez', 'Pehlivanköy', 'Pınarhisar', 'Vize']],
            ['plate_code' => '40', 'name' => 'Kırşehir', 'districts' => ['Akçakent', 'Akpınar', 'Boztepe', 'Çiçekdağı', 'Kaman', 'Merkez', 'Mucur']],
            ['plate_code' => '41', 'name' => 'Kocaeli', 'districts' => ['Başiskele', 'Çayırova', 'Darıca', 'Derince', 'Dilovası', 'Gebze', 'Gölcük', 'İzmit', 'Kandıra', 'Karamürsel', 'Kartepe', 'Körfez']],
            ['plate_code' => '42', 'name' => 'Konya', 'districts' => ['Ahırlı', 'Akören', 'Akşehir', 'Altınekin', 'Beyşehir', 'Bozkır', 'Cihanbeyli', 'Çeltik', 'Çumra', 'Derbent', 'Derebucak', 'Doğanhisar', 'Emirgazi', 'Ereğli', 'Güneysinir', 'Hadim', 'Halkapınar', 'Hüyük', 'Ilgın', 'Kadınhanı', 'Karapınar', 'Karatay', 'Kulu', 'Meram', 'Sarayönü', 'Selçuklu', 'Seydişehir', 'Taşkent', 'Tuzlukçu', 'Yalıhüyük', 'Yunak']],
            ['plate_code' => '43', 'name' => 'Kütahya', 'districts' => ['Altıntaş', 'Aslanapa', 'Çavdarhisar', 'Domaniç', 'Dumlupınar', 'Emet', 'Gediz', 'Hisarcık', 'Merkez', 'Pazarlar', 'Simav', 'Şaphane', 'Tavşanlı']],
            ['plate_code' => '44', 'name' => 'Malatya', 'districts' => ['Akçadağ', 'Arapgir', 'Arguvan', 'Battalgazi', 'Darende', 'Doğanşehir', 'Doğanyol', 'Hekimhan', 'Kale', 'Kuluncak', 'Pütürge', 'Yazıhan', 'Yeşilyurt']],
            ['plate_code' => '45', 'name' => 'Manisa', 'districts' => ['Ahmetli', 'Akhisar', 'Alaşehir', 'Demirci', 'Gölmarmara', 'Gördes', 'Kırkağaç', 'Köprübaşı', 'Kula', 'Salihli', 'Sarıgöl', 'Saruhanlı', 'Selendi', 'Soma', 'Şehzadeler', 'Turgutlu', 'Yunusemre']],
            ['plate_code' => '46', 'name' => 'Kahramanmaraş', 'districts' => ['Afşin', 'Andırın', 'Çağlayancerit', 'Dulkadiroğlu', 'Ekinözü', 'Elbistan', 'Göksun', 'Nurhak', 'Onikişubat', 'Pazarcık', 'Türkoğlu']],
            ['plate_code' => '47', 'name' => 'Mardin', 'districts' => ['Artuklu', 'Dargeçit', 'Derik', 'Kızıltepe', 'Mazıdağı', 'Midyat', 'Nusaybin', 'Ömerli', 'Savur', 'Yeşilli']],
            ['plate_code' => '48', 'name' => 'Muğla', 'districts' => ['Bodrum', 'Dalaman', 'Datça', 'Fethiye', 'Kavaklıdere', 'Köyceğiz', 'Marmaris', 'Menteşe', 'Milas', 'Ortaca', 'Seydikemer', 'Ula', 'Yatağan']],
            ['plate_code' => '49', 'name' => 'Muş', 'districts' => ['Bulanık', 'Hasköy', 'Korkut', 'Malazgirt', 'Merkez', 'Varto']],
            ['plate_code' => '50', 'name' => 'Nevşehir', 'districts' => ['Acıgöl', 'Avanos', 'Derinkuyu', 'Gülşehir', 'Hacıbektaş', 'Kozaklı', 'Merkez', 'Ürgüp']],
            ['plate_code' => '51', 'name' => 'Niğde', 'districts' => ['Altunhisar', 'Bor', 'Çamardı', 'Çiftlik', 'Merkez', 'Ulukışla']],
            ['plate_code' => '52', 'name' => 'Ordu', 'districts' => ['Akkuş', 'Altınordu', 'Aybastı', 'Çamaş', 'Çatalpınar', 'Çaybaşı', 'Fatsa', 'Gölköy', 'Gülyalı', 'Gürgentepe', 'İkizce', 'Kabadüz', 'Kabataş', 'Korgan', 'Kumru', 'Mesudiye', 'Perşembe', 'Ulubey', 'Ünye']],
            ['plate_code' => '53', 'name' => 'Rize', 'districts' => ['Ardeşen', 'Çamlıhemşin', 'Çayeli', 'Derepazarı', 'Fındıklı', 'Güneysu', 'Hemşin', 'İkizdere', 'İyidere', 'Kalkandere', 'Merkez', 'Pazar']],
            ['plate_code' => '54', 'name' => 'Sakarya', 'districts' => ['Adapazarı', 'Akyazı', 'Arifiye', 'Erenler', 'Ferizli', 'Geyve', 'Hendek', 'Karapürçek', 'Karasu', 'Kaynarca', 'Kocaali', 'Pamukova', 'Sapanca', 'Serdivan', 'Söğütlü', 'Taraklı']],
            ['plate_code' => '55', 'name' => 'Samsun', 'districts' => ['Alaçam', 'Asarcık', 'Atakum', 'Ayvacık', 'Bafra', 'Canik', 'Çarşamba', 'Havza', 'İlkadım', 'Kavak', 'Ladik', 'Ondokuzmayıs', 'Salıpazarı', 'Tekkeköy', 'Terme', 'Vezirköprü', 'Yakakent']],
            ['plate_code' => '56', 'name' => 'Siirt', 'districts' => ['Baykan', 'Eruh', 'Kurtalan', 'Merkez', 'Pervari', 'Şirvan', 'Tillo']],
            ['plate_code' => '57', 'name' => 'Sinop', 'districts' => ['Ayancık', 'Boyabat', 'Dikmen', 'Durağan', 'Erfelek', 'Gerze', 'Merkez', 'Saraydüzü', 'Türkeli']],
            ['plate_code' => '58', 'name' => 'Sivas', 'districts' => ['Akıncılar', 'Altınyayla', 'Divriği', 'Doğanşar', 'Gemerek', 'Gölova', 'Gürün', 'Hafik', 'İmranlı', 'Kangal', 'Koyulhisar', 'Merkez', 'Şarkışla', 'Suşehri', 'Ulaş', 'Yıldızeli', 'Zara']],
            ['plate_code' => '59', 'name' => 'Tekirdağ', 'districts' => ['Çerkezköy', 'Çorlu', 'Ergene', 'Hayrabolu', 'Kapaklı', 'Malkara', 'Marmaraereğlisi', 'Muratlı', 'Saray', 'Süleymanpaşa', 'Şarköy']],
            ['plate_code' => '60', 'name' => 'Tokat', 'districts' => ['Almus', 'Artova', 'Başçiftlik', 'Erbaa', 'Niksar', 'Pazar', 'Reşadiye', 'Sulusaray', 'Turhal', 'Yeşilyurt', 'Zile']],
            ['plate_code' => '61', 'name' => 'Trabzon', 'districts' => ['Akçaabat', 'Araklı', 'Arsin', 'Beşikdüzü', 'Çarşıbaşı', 'Çaykara', 'Dernekpazarı', 'Düzköy', 'Hayrat', 'Köprübaşı', 'Maçka', 'Of', 'Ortahisar', 'Şalpazarı', 'Sürmene', 'Tonya', 'Vakfıkebir', 'Yomra']],
            ['plate_code' => '62', 'name' => 'Tunceli', 'districts' => ['Çemişgezek', 'Hozat', 'Mazgirt', 'Merkez', 'Nazımiye', 'Ovacık', 'Pertek', 'Pülümür']],
            ['plate_code' => '63', 'name' => 'Şanlıurfa', 'districts' => ['Akçakale', 'Birecik', 'Bozova', 'Ceylanpınar', 'Eyyübiye', 'Halfeti', 'Haliliye', 'Harran', 'Hilvan', 'Karaköprü', 'Siverek', 'Suruç', 'Viranşehir']],
            ['plate_code' => '64', 'name' => 'Uşak', 'districts' => ['Banaz', 'Eşme', 'Karahallı', 'Merkez', 'Sivaslı', 'Ulubey']],
            ['plate_code' => '65', 'name' => 'Van', 'districts' => ['Bahçesaray', 'Başkale', 'Çaldıran', 'Çatak', 'Edremit', 'Erciş', 'Gevaş', 'Gürpınar', 'İpekyolu', 'Muradiye', 'Özalp', 'Saray', 'Tuşba']],
            ['plate_code' => '66', 'name' => 'Yozgat', 'districts' => ['Akdağmadeni', 'Aydıncık', 'Boğazlıyan', 'Çandır', 'Çayıralan', 'Çekerek', 'Kadışehri', 'Merkez', 'Saraykent', 'Sarıkaya', 'Sorgun', 'Şefaatli', 'Yerköy', 'Yenifakılı']],
            ['plate_code' => '67', 'name' => 'Zonguldak', 'districts' => ['Alaplı', 'Çaycuma', 'Devrek', 'Gökçebey', 'Kilimli', 'Kozlu', 'Merkez']],
            ['plate_code' => '68', 'name' => 'Aksaray', 'districts' => ['Ağaçören', 'Eskil', 'Gülağaç', 'Güzelyurt', 'Merkez', 'Ortaköy', 'Sarıyahşi']],
            ['plate_code' => '69', 'name' => 'Bayburt', 'districts' => ['Aydıntepe', 'Demirözü', 'Merkez']],
            ['plate_code' => '70', 'name' => 'Karaman', 'districts' => ['Ayrancı', 'Başyayla', 'Ermenek', 'Kazımkarabekir', 'Merkez', 'Sarıveliler']],
            ['plate_code' => '71', 'name' => 'Kırıkkale', 'districts' => ['Bahşılı', 'Balışeyh', 'Çelebi', 'Delice', 'Karakeçili', 'Keskin', 'Merkez', 'Sulakyurt', 'Yahşihan']],
            ['plate_code' => '72', 'name' => 'Batman', 'districts' => ['Beşiri', 'Gercüş', 'Hasankeyf', 'Kozluk', 'Merkez', 'Sason']],
            ['plate_code' => '73', 'name' => 'Şırnak', 'districts' => ['Beytüşşebap', 'Cizre', 'Güçlükonak', 'İdil', 'Merkez', 'Silopi', 'Uludere']],
            ['plate_code' => '74', 'name' => 'Bartın', 'districts' => ['Amasra', 'Kurucaşile', 'Merkez', 'Ulus']],
            ['plate_code' => '75', 'name' => 'Ardahan', 'districts' => ['Çıldır', 'Damal', 'Göle', 'Hanak', 'Merkez', 'Posof']],
            ['plate_code' => '76', 'name' => 'Iğdır', 'districts' => ['Aralık', 'Karakoyunlu', 'Merkez', 'Tuzluca']],
            ['plate_code' => '77', 'name' => 'Yalova', 'districts' => ['Altınova', 'Armutlu', 'Çınarcık', 'Çiftlikköy', 'Merkez', 'Termal']],
            ['plate_code' => '78', 'name' => 'Karabük', 'districts' => ['Eflani', 'Eskipazar', 'Merkez', 'Ovacık', 'Safranbolu', 'Yenice']],
            ['plate_code' => '79', 'name' => 'Kilis', 'districts' => ['Elbeyli', 'Merkez', 'Musabeyli', 'Polateli']],
            ['plate_code' => '80', 'name' => 'Osmaniye', 'districts' => ['Bahçe', 'Düziçi', 'Hasanbeyli', 'Kadirli', 'Merkez', 'Sumbas', 'Toprakkale']],
            ['plate_code' => '81', 'name' => 'Düzce', 'districts' => ['Akçakoca', 'Cumayeri', 'Çilimli', 'Gölyaka', 'Gümüşova', 'Kaynaşlı', 'Merkez', 'Yığılca']],
        ];

        $totalCities = 0;
        $totalDistricts = 0;

        foreach ($cities as $cityData) {
            $city = City::updateOrCreate(
                ['plate_code' => $cityData['plate_code']],
                ['name' => $cityData['name']]
            );

            $totalCities++;

            foreach ($cityData['districts'] as $districtName) {
                District::updateOrCreate(
                    [
                        'city_id' => $city->id,
                        'name' => $districtName,
                    ]
                );
                $totalDistricts++;
            }
        }

        $this->command->info("✅ Toplam {$totalCities} şehir ve {$totalDistricts} ilçe eklendi.");
    }
}
