<?php

namespace Database\Seeders;

use App\Models\Classroom;
use App\Models\Branch;
use App\Models\Campus;
use App\Models\EducationLevel;
use Illuminate\Database\Seeder;

class AssignIstanbulClassroomsSeeder extends Seeder
{
    /**
     * Run the database seeds.
     */
    public function run(): void
    {
        echo "🔧 İstanbul kampüsündeki branch'lara classroom'lar atanıyor...\n\n";

        $istanbulCampus = Campus::where('name', 'like', '%İstanbul%')->first();
        
        if (!$istanbulCampus) {
            echo "❌ İstanbul Kampüs bulunamadı!\n";
            return;
        }

        echo "İstanbul Kampüs: {$istanbulCampus->name} (ID: {$istanbulCampus->id})\n\n";

        // İstanbul kampüsündeki branch'ları al
        $istanbulBranches = Branch::where('campus_id', $istanbulCampus->id)->get();
        
        if ($istanbulBranches->isEmpty()) {
            echo "❌ İstanbul kampüsünde branch bulunamadı!\n";
            return;
        }

        $classroomsAssigned = 0;

        // Her branch için, aynı education_level_id'ye sahip classroom'ları bul ve ata
        foreach ($istanbulBranches as $branch) {
            echo "Branch: {$branch->name} (Education Level ID: {$branch->education_level_id})\n";
            
            // Bu education level'a ait classroom'ları bul
            // Önce Aksaray kampüsündeki aynı education level'daki classroom'ları bul
            $aksarayCampus = Campus::where('name', 'like', '%Aksaray%')->first();
            if (!$aksarayCampus) {
                echo "  ⚠️  Aksaray kampüsü bulunamadı, atlanıyor...\n";
                continue;
            }
            
            // Aksaray kampüsündeki aynı education level'daki branch'ı bul
            $aksarayBranch = Branch::where('campus_id', $aksarayCampus->id)
                ->where('education_level_id', $branch->education_level_id)
                ->first();
            
            if (!$aksarayBranch) {
                echo "  ⚠️  Aksaray kampüsünde aynı education level'da branch bulunamadı, atlanıyor...\n";
                continue;
            }
            
            // Aksaray branch'ındaki classroom'ları bul
            $aksarayClassrooms = Classroom::where('branch_id', $aksarayBranch->id)
                ->where('grade_level', $branch->education_level_id)
                ->get();
            
            echo "  Aksaray'daki aynı kademedeki sınıf sayısı: {$aksarayClassrooms->count()}\n";
            
            // Her Aksaray classroom'ı için, İstanbul'da aynı isimde classroom var mı kontrol et
            // Yoksa oluştur ve İstanbul branch'ına ata
            foreach ($aksarayClassrooms as $aksarayClassroom) {
                // İstanbul branch'ında aynı isimde classroom var mı?
                $existingIstanbulClassroom = Classroom::where('branch_id', $branch->id)
                    ->where('name', $aksarayClassroom->name)
                    ->first();
                
                if (!$existingIstanbulClassroom) {
                    // İstanbul branch'ına aynı isimde classroom oluştur
                    $newClassroom = Classroom::create([
                        'tenant_id' => $aksarayClassroom->tenant_id,
                        'branch_id' => $branch->id,
                        'name' => $aksarayClassroom->name,
                        'code' => $aksarayClassroom->code . '-IST', // İstanbul için farklı kod
                        'capacity' => $aksarayClassroom->capacity,
                        'teacher_id' => null, // Öğretmen ataması yapılmadı
                        'grade_level' => $aksarayClassroom->grade_level,
                        'is_active' => $aksarayClassroom->is_active,
                    ]);
                    
                    $classroomsAssigned++;
                    echo "    ✅ İstanbul'da '{$newClassroom->name}' sınıfı oluşturuldu ve branch'a atandı\n";
                } else {
                    echo "    ⏭️  '{$aksarayClassroom->name}' sınıfı zaten İstanbul'da mevcut\n";
                }
            }
            
            echo "\n";
        }

        echo "🎉 Toplam {$classroomsAssigned} classroom İstanbul kampüsündeki branch'lara atandı!\n";
    }
}
