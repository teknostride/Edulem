<?php
require __DIR__ . '/vendor/autoload.php';
$app = require_once __DIR__ . '/bootstrap/app.php';
$app->make(\Illuminate\Contracts\Console\Kernel::class)->bootstrap();

use App\Models\City;
use App\Models\District;

echo "İl Sayısı: " . City::count() . "\n";
echo "İlçe Sayısı: " . District::count() . "\n";
