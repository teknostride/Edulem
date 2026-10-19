<?php

namespace Database\Seeders;

use App\Models\City;
use App\Models\District;
use Illuminate\Database\Seeder;

class CityDistrictSeeder extends Seeder
{
    /**
     * Run the database seeds.
     */
    public function run(): void
    {
        // İstanbul
        $istanbul = City::updateOrCreate(
            ['plate_code' => '34'],
            ['name' => 'İstanbul']
        );

        $istanbulDistricts = [
            'Adalar', 'Arnavutköy', 'Ataşehir', 'Avcılar', 'Bağcılar',
            'Bahçelievler', 'Bakırköy', 'Başakşehir', 'Bayrampaşa', 'Beşiktaş',
            'Beykoz', 'Beylikdüzü', 'Beyoğlu', 'Büyükçekmece', 'Çatalca',
            'Çekmeköy', 'Esenler', 'Esenyurt', 'Eyüpsultan', 'Fatih',
            'Gaziosmanpaşa', 'Güngören', 'Kadıköy', 'Kağıthane', 'Kartal',
            'Küçükçekmece', 'Maltepe', 'Pendik', 'Sancaktepe', 'Sarıyer',
            'Silivri', 'Sultanbeyli', 'Sultangazi', 'Şile', 'Şişli',
            'Tuzla', 'Ümraniye', 'Üsküdar', 'Zeytinburnu'
        ];

        foreach ($istanbulDistricts as $districtName) {
            District::updateOrCreate(
                [
                    'city_id' => $istanbul->id,
                    'name' => $districtName,
                ]
            );
        }

        echo "✅ İstanbul ve ilçeleri eklendi.\n";

        // Ankara
        $ankara = City::updateOrCreate(
            ['plate_code' => '06'],
            ['name' => 'Ankara']
        );

        $ankaraDistricts = [
            'Altındağ', 'Ayaş', 'Bala', 'Beypazarı', 'Çamlıdere',
            'Çankaya', 'Çubuk', 'Elmadağ', 'Güdül', 'Haymana',
            'Kalecik', 'Kızılcahamam', 'Nallıhan', 'Polatlı', 'Şereflikoçhisar',
            'Yenimahalle'
        ];

        foreach ($ankaraDistricts as $districtName) {
            District::updateOrCreate(
                [
                    'city_id' => $ankara->id,
                    'name' => $districtName,
                ]
            );
        }

        echo "✅ Ankara ve ilçeleri eklendi.\n";

        // İzmir
        $izmir = City::updateOrCreate(
            ['plate_code' => '35'],
            ['name' => 'İzmir']
        );

        $izmirDistricts = [
            'Aliağa', 'Bayındır', 'Bergama', 'Bornova', 'Çeşme',
            'Dikili', 'Foça', 'Karaburun', 'Karşıyaka', 'Kemalpaşa',
            'Kınık', 'Kiraz', 'Menemen', 'Ödemiş', 'Seferihisar',
            'Selçuk', 'Tire', 'Torbalı', 'Urla'
        ];

        foreach ($izmirDistricts as $districtName) {
            District::updateOrCreate(
                [
                    'city_id' => $izmir->id,
                    'name' => $districtName,
                ]
            );
        }

        echo "✅ İzmir ve ilçeleri eklendi.\n";

        echo "\n🎉 Toplam " . City::count() . " şehir ve " . District::count() . " ilçe eklendi.\n";
    }
}
