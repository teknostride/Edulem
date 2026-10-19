<?php

namespace Database\Seeders;

use Illuminate\Database\Console\Seeds\WithoutModelEvents;
use Illuminate\Database\Seeder;
use App\Models\Classroom;
use App\Models\User;

class FixClassroomTenantSeeder extends Seeder
{
    /**
     * Run the database seeds.
     */
    public function run(): void
    {
        // Find all classrooms with null tenant_id
        $classroomsWithNullTenant = Classroom::whereNull('tenant_id')->get();
        
        echo "Found " . count($classroomsWithNullTenant) . " classrooms with null tenant_id\n";
        
        foreach ($classroomsWithNullTenant as $classroom) {
            // Get the branch's tenant_id through the campus
            if ($classroom->branch) {
                $campus = $classroom->branch->campus;
                if ($campus) {
                    $classroom->update(['tenant_id' => $campus->tenant_id]);
                    echo "Updated classroom {$classroom->id} ({$classroom->name}) with tenant_id: {$campus->tenant_id}\n";
                } else {
                    echo "⚠️ Classroom {$classroom->id} - Branch has no campus\n";
                }
            } else {
                echo "⚠️ Classroom {$classroom->id} - No branch found\n";
            }
        }
        
        // Verify all classrooms now have tenant_id
        $stillNull = Classroom::whereNull('tenant_id')->count();
        echo "\nVerification: {$stillNull} classrooms still have null tenant_id\n";
        
        if ($stillNull === 0) {
            echo "✅ All classrooms have been updated!\n";
        }
    }
}
