<?php

namespace App\Actions;

use App\Models\MealMenu;
use App\Services\ActivityLogService;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\DB;

class CreateMealMenuAction
{
    protected ActivityLogService $activityLogService;

    public function __construct(ActivityLogService $activityLogService)
    {
        $this->activityLogService = $activityLogService;
    }

    /**
     * Execute the action to create a meal menu.
     *
     * @param  array  $menuData
     * @return MealMenu
     * @throws \Exception
     */
    public function execute(array $menuData): MealMenu
    {
        return DB::transaction(function () use ($menuData) {
            $overwrite = $menuData['overwrite'] ?? true;

            // Duplicate kontrolü
            $existing = MealMenu::where('tenant_id', $menuData['tenant_id'] ?? auth()->user()->tenant_id)
                ->where('menu_date', $menuData['menu_date'])
                ->where('meal_type', $menuData['meal_type'])
                ->where('classroom_id', $menuData['classroom_id'] ?? null)
                ->first();

            if ($existing) {
                if (!$overwrite) {
                    throw new \Exception('Bu tarih, tür ve sınıf için zaten bir menü mevcut.');
                }

                $existing->update([
                    'meals' => $menuData['meals'],
                    'target_student_ids' => array_key_exists('target_student_ids', $menuData) ? $menuData['target_student_ids'] : $existing->target_student_ids,
                    'notes' => array_key_exists('notes', $menuData) ? $menuData['notes'] : $existing->notes,
                    'is_published' => array_key_exists('is_published', $menuData) ? $menuData['is_published'] : $existing->is_published,
                ]);

                // Activity log
                $this->activityLogService->logUpdate($existing);

                $existing->load(['classroom', 'creator']);

                return $existing;
            }

            $menu = MealMenu::create([
                'menu_date' => $menuData['menu_date'],
                'meal_type' => $menuData['meal_type'],
                'meals' => $menuData['meals'],
                'target_student_ids' => $menuData['target_student_ids'] ?? null,
                'classroom_id' => $menuData['classroom_id'] ?? null,
                'notes' => $menuData['notes'] ?? null,
                'is_published' => $menuData['is_published'] ?? true,
                'created_by' => Auth::id(),
            ]);

            // Activity log
            $this->activityLogService->logCreate($menu);

            // İlişkileri yükle
            $menu->load(['classroom', 'creator']);

            return $menu;
        });
    }
}
