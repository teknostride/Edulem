<?php

namespace Database\Seeders;

use App\Models\Classroom;
use App\Models\Branch;
use App\Models\EducationLevel;
use Illuminate\Database\Seeder;

class FixClassroomBranchSeeder extends Seeder
{
    /**
     * Run the database seeds.
     */
    public function run(): void
    {
        echo "🔧 Classroom'ları branch'lara atanıyor...\n\n";

        $classrooms = Classroom::whereNull('branch_id')->orWhere('branch_id', 0)->get();
        $fixedCount = 0;
        $skippedCount = 0;

        foreach ($classrooms as $classroom) {
            // Education Level'e göre branch bul
            $branch = null;
            
            if ($classroom->grade_level) {
                // grade_level education_level_id'ye karşılık geliyor
                $educationLevel = EducationLevel::find($classroom->grade_level);
                
                if ($educationLevel) {
                    // Bu education level'a ait bir branch bul
                    $branch = Branch::where('education_level_id', $educationLevel->id)->first();
                    
                    // Eğer bulunamazsa, ilk branch'ı al
                    if (!$branch) {
                        $branch = Branch::first();
                    }
                }
            }
            
            // Hala branch yoksa, ilk branch'ı al
            if (!$branch) {
                $branch = Branch::first();
            }
            
            if ($branch) {
                $classroom->branch_id = $branch->id;
                $classroom->save();
                
                $fixedCount++;
                echo "  ✅ Classroom ID: {$classroom->id} ({$classroom->name}) → Branch ID: {$branch->id} ({$branch->name})\n";
            } else {
                $skippedCount++;
                echo "  ⚠️  Classroom ID: {$classroom->id} ({$classroom->name}) - Branch bulunamadı\n";
            }
        }

        echo "\n🎉 Toplam {$fixedCount} classroom branch'a atandı!\n";
        if ($skippedCount > 0) {
            echo "⚠️  {$skippedCount} classroom için branch bulunamadı.\n";
        }
    }
}
