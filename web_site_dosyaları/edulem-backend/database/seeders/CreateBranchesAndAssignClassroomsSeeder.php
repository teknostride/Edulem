<?php

namespace Database\Seeders;

use App\Models\Classroom;
use App\Models\Branch;
use App\Models\Campus;
use App\Models\EducationLevel;
use Illuminate\Database\Seeder;

class CreateBranchesAndAssignClassroomsSeeder extends Seeder
{
    /**
     * Run the database seeds.
     */
    public function run(): void
    {
        echo "🔧 Branch'lar oluşturuluyor ve classroom'lar atanıyor...\n\n";

        // Tüm campus'leri al
        $campuses = Campus::all();
        if ($campuses->isEmpty()) {
            echo "❌ Campus bulunamadı! Önce campus oluşturun.\n";
            return;
        }

        // Tüm education level'ları al
        $educationLevels = EducationLevel::all();
        if ($educationLevels->isEmpty()) {
            echo "❌ Education Level bulunamadı! Önce education level oluşturun.\n";
            return;
        }

        $branchesCreated = 0;
        $classroomsAssigned = 0;

        // Her campus ve education level kombinasyonu için branch oluştur
        foreach ($campuses as $campus) {
            foreach ($educationLevels as $educationLevel) {
                // Bu kombinasyon için branch var mı kontrol et
                $existingBranch = Branch::where('campus_id', $campus->id)
                    ->where('education_level_id', $educationLevel->id)
                    ->first();

                if (!$existingBranch) {
                    // Branch oluştur
                    $branch = Branch::create([
                        'campus_id' => $campus->id,
                        'education_level_id' => $educationLevel->id,
                        'name' => $educationLevel->name . ' - ' . $campus->name,
                        'is_active' => true,
                    ]);
                    $branchesCreated++;
                    echo "  ✅ Branch oluşturuldu: {$branch->name} (Campus: {$campus->name}, Education Level: {$educationLevel->name})\n";
                } else {
                    $branch = $existingBranch;
                }

                // Bu education level'a ait ve branch_id'si olmayan VEYA başka campus'e ait classroom'ları bu branch'a ata
                // Önce bu education level'a ait tüm classroom'ları bul
                $allClassrooms = Classroom::where('grade_level', $educationLevel->id)->get();
                
                // Bu campus'teki branch'a atanmamış classroom'ları bul
                $classroomsToAssign = $allClassrooms->filter(function($classroom) use ($campus) {
                    // Eğer branch_id yoksa veya branch'ın campus_id'si bu campus değilse
                    if (!$classroom->branch_id) {
                        return true;
                    }
                    $branch = $classroom->branch;
                    return $branch && $branch->campus_id != $campus->id;
                });

                foreach ($classroomsToAssign as $classroom) {
                    // Eğer bu classroom zaten başka bir campus'teki branch'a atanmışsa, sadece branch_id'si yoksa ata
                    if (!$classroom->branch_id) {
                        $classroom->branch_id = $branch->id;
                        $classroom->save();
                        $classroomsAssigned++;
                        echo "    → Classroom '{$classroom->name}' branch'a atandı\n";
                    }
                }
            }
        }

        // Hala branch_id'si olmayan classroom'ları ilk branch'a ata
        $remainingClassrooms = Classroom::whereNull('branch_id')->orWhere('branch_id', 0)->get();
        if ($remainingClassrooms->count() > 0) {
            $firstBranch = Branch::first();
            if ($firstBranch) {
                foreach ($remainingClassrooms as $classroom) {
                    $classroom->branch_id = $firstBranch->id;
                    $classroom->save();
                    $classroomsAssigned++;
                    echo "  ⚠️  Classroom '{$classroom->name}' varsayılan branch'a atandı\n";
                }
            }
        }

        echo "\n🎉 Toplam {$branchesCreated} branch oluşturuldu!\n";
        echo "🎉 Toplam {$classroomsAssigned} classroom branch'a atandı!\n";
    }
}
