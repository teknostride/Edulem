<?php

namespace App\Console\Commands;

use App\Models\Classroom;
use Illuminate\Console\Command;

class CheckClassroomBranch extends Command
{
    protected $signature = 'check:classroom-branch {classroom_id?}';
    protected $description = 'Check classroom branch and campus relationships';

    public function handle()
    {
        // Önce branch'ları kontrol et
        $branches = \App\Models\Branch::all();
        $this->info("Toplam Branch Sayısı: " . $branches->count());
        if ($branches->count() > 0) {
            foreach ($branches as $branch) {
                $this->info("  - Branch ID: {$branch->id}, Name: {$branch->name}, Education Level ID: {$branch->education_level_id}, Campus ID: {$branch->campus_id}");
            }
        } else {
            $this->warn("⚠️  Veritabanında branch bulunamadı!");
        }
        $this->newLine();
        
        $classroomId = $this->argument('classroom_id');
        
        if ($classroomId) {
            $classrooms = [Classroom::find($classroomId)];
        } else {
            $classrooms = Classroom::take(5)->get();
        }
        
        foreach ($classrooms as $classroom) {
            if (!$classroom) {
                $this->error("Classroom not found!");
                continue;
            }
            
            $this->info("Classroom ID: {$classroom->id}");
            $this->info("  Name: {$classroom->name}");
            $this->info("  Branch ID: " . ($classroom->branch_id ?? 'NULL'));
            
            if ($classroom->branch_id) {
                $branch = $classroom->branch;
                if ($branch) {
                    $this->info("  Branch Name: {$branch->name}");
                    $this->info("  Campus ID: " . ($branch->campus_id ?? 'NULL'));
                    
                    if ($branch->campus_id) {
                        $campus = $branch->campus;
                        if ($campus) {
                            $this->info("  Campus Name: {$campus->name}");
                        } else {
                            $this->error("  Campus not found!");
                        }
                    } else {
                        $this->warn("  Branch has no campus_id!");
                    }
                } else {
                    $this->error("  Branch not found!");
                }
            } else {
                $this->warn("  Classroom has no branch_id!");
            }
            
            $this->newLine();
        }
    }
}
