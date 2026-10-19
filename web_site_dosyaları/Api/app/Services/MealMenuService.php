<?php

namespace App\Services;

use App\Models\MealMenu;
use App\Models\Classroom;
use Illuminate\Support\Facades\DB;

class MealMenuService
{
    /**
     * Copy menu to other classrooms.
     *
     * @param MealMenu $sourceMenu
     * @param array $targetClassroomIds
     * @return array
     * @throws \Exception
     */
    public function copyToClassrooms(MealMenu $sourceMenu, array $targetClassroomIds): array
    {
        return DB::transaction(function () use ($sourceMenu, $targetClassroomIds) {
            $copiedMenus = [];

            foreach ($targetClassroomIds as $classroomId) {
                // Hedef sınıf kontrolü
                $classroom = Classroom::findOrFail($classroomId);
                if ($classroom->tenant_id !== $sourceMenu->tenant_id) {
                    throw new \Exception("Sınıf {$classroomId} farklı bir tenant'a ait.");
                }

                // Duplicate kontrolü
                $existing = MealMenu::where('tenant_id', $sourceMenu->tenant_id)
                    ->where('menu_date', $sourceMenu->menu_date)
                    ->where('meal_type', $sourceMenu->meal_type)
                    ->where('classroom_id', $classroomId)
                    ->first();

                if ($existing) {
                    continue; // Zaten varsa atla
                }

                // Menüyü kopyala
                $newMenu = MealMenu::create([
                    'menu_date' => $sourceMenu->menu_date,
                    'meal_type' => $sourceMenu->meal_type,
                    'meals' => $sourceMenu->meals,
                    'target_student_ids' => null, // Hedef öğrenciler kopyalanmaz
                    'classroom_id' => $classroomId,
                    'notes' => $sourceMenu->notes,
                    'is_published' => $sourceMenu->is_published,
                    'created_by' => auth()->id(),
                ]);

                $copiedMenus[] = $newMenu;
            }

            return $copiedMenus;
        });
    }
}
