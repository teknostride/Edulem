<?php

namespace Database\Seeders;

use App\Models\Campus;
use Illuminate\Database\Seeder;

class RenameCampusOneToMerkezKampusSeeder extends Seeder
{
    /**
     * Run the database seeds.
     */
    public function run(): void
    {
        Campus::query()
            ->where('name', 'Kampüs 1')
            ->update(['name' => 'Merkez Kampüs']);
    }
}
