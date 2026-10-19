<?php

namespace App\Console\Commands;

use App\Models\Classroom;
use App\Models\Campus;
use App\Models\Branch;
use Illuminate\Console\Command;

class CheckIstanbulClassrooms extends Command
{
    protected $signature = 'check:istanbul-classrooms';
    protected $description = 'Check Istanbul campus classrooms and their branch assignments';

    public function handle()
    {
        $istanbulCampus = Campus::where('name', 'like', '%İstanbul%')->first();
        
        if (!$istanbulCampus) {
            $this->error('İstanbul Kampüs bulunamadı!');
            return;
        }
        
        $this->info("İstanbul Kampüs ID: {$istanbulCampus->id}");
        $this->info("İstanbul Kampüs Adı: {$istanbulCampus->name}");
        $this->newLine();
        
        // İstanbul kampüsündeki branch'ları bul
        $branches = Branch::where('campus_id', $istanbulCampus->id)->get();
        $this->info("İstanbul Kampüsündeki Branch Sayısı: {$branches->count()}");
        
        foreach ($branches as $branch) {
            $this->info("  - Branch ID: {$branch->id}, Name: {$branch->name}, Education Level ID: {$branch->education_level_id}");
        }
        $this->newLine();
        
        // İstanbul kampüsündeki branch'lara ait classroom'ları bul
        $branchIds = $branches->pluck('id')->toArray();
        $classrooms = Classroom::whereIn('branch_id', $branchIds)->get();
        $this->info("İstanbul Kampüsündeki Branch'lara Atanmış Classroom Sayısı: {$classrooms->count()}");
        
        foreach ($classrooms as $classroom) {
            $this->info("  - Classroom ID: {$classroom->id}, Name: {$classroom->name}, Branch ID: {$classroom->branch_id}, Grade Level: {$classroom->grade_level}");
        }
        $this->newLine();
        
        // Tüm classroom'ları kontrol et - hangi education level'lara ait olduklarını göster
        $allClassrooms = Classroom::all();
        $this->info("TÜM Classroom'lar (Education Level'a göre):");
        
        $classroomsByLevel = $allClassrooms->groupBy('grade_level');
        foreach ($classroomsByLevel as $gradeLevel => $classrooms) {
            $this->info("  Grade Level {$gradeLevel}:");
            foreach ($classrooms as $classroom) {
                $branchInfo = $classroom->branch ? "Branch: {$classroom->branch->name} (Campus: {$classroom->branch->campus->name})" : "Branch: NULL";
                $this->info("    - {$classroom->name} (ID: {$classroom->id}) - {$branchInfo}");
            }
        }
    }
}
