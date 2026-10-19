<?php

namespace App\Console\Commands;

use App\Models\Student;
use App\Models\Campus;
use Illuminate\Console\Command;

class CheckCampusStudents extends Command
{
    protected $signature = 'check:campus-students';
    protected $description = 'Check students by campus';

    public function handle()
    {
        $campuses = Campus::all();
        
        foreach ($campuses as $campus) {
            $this->info("Campus: {$campus->name} (ID: {$campus->id})");
            
            // Bu campus'e ait branch'ları bul
            $branches = \App\Models\Branch::where('campus_id', $campus->id)->get();
            $this->info("  Branch Sayısı: {$branches->count()}");
            
            // Bu branch'lara ait classroom'ları bul
            $classroomIds = \App\Models\Classroom::whereIn('branch_id', $branches->pluck('id'))->pluck('id');
            $this->info("  Classroom Sayısı: {$classroomIds->count()}");
            
            // Bu classroom'lardaki öğrencileri bul
            $students = Student::whereIn('classroom_id', $classroomIds)->get();
            $this->info("  Öğrenci Sayısı: {$students->count()}");
            
            if ($students->count() > 0) {
                foreach ($students->take(3) as $student) {
                    $this->info("    - {$student->name} (Classroom: {$student->classroom?->name})");
                }
            }
            
            $this->newLine();
        }
    }
}
