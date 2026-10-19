<?php

namespace App\Http\Controllers;

use App\Models\Season;
use Illuminate\Http\Request;
use Illuminate\Http\JsonResponse;
use Illuminate\Support\Facades\Auth;

class SeasonController extends ApiController
{
    /**
     * Display a listing of the seasons.
     */
    public function index(): JsonResponse
    {
        $seasons = Season::orderBy('name', 'desc')->get();

        $data = $seasons->map(function ($season) {
            $item = $season->toArray();
            
            // Daha benzersiz anahtarlar kullanarak çakışmaları önleyelim
            $item['count_students'] = \App\Models\Student::withoutGlobalScope(\App\Scopes\SeasonScope::class)
                ->where('season_id', $season->id)
                ->count();
            
            $item['count_classrooms'] = \App\Models\Classroom::withoutGlobalScope(\App\Scopes\SeasonScope::class)
                ->where('season_id', $season->id)
                ->count();
                
            $item['count_levels'] = \App\Models\EducationLevel::withoutGlobalScope(\App\Scopes\SeasonScope::class)
                ->where('season_id', $season->id)
                ->count();
                
            return $item;
        });

        return $this->success($data);
    }

    /**
     * Store a newly created season in storage.
     */
    public function store(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'name' => 'required|string|max:255',
            'description' => 'nullable|string',
            'copy_classrooms_from' => 'nullable|integer|exists:seasons,id'
        ]);

        $season = Season::create([
            'tenant_id' => Auth::user()->tenant_id,
            'name' => $validated['name'],
            'description' => $validated['description'],
            'is_active' => false,
        ]);

        // Kademeleri ve Sınıfları kopyala (eğer seçildiyse)
        if (!empty($validated['copy_classrooms_from'])) {
            $sourceSeasonId = (int) $validated['copy_classrooms_from'];
            
            // 1. Kademeleri kopyala
            $sourceLevels = \App\Models\EducationLevel::withoutGlobalScope(\App\Scopes\SeasonScope::class)
                ->where('season_id', $sourceSeasonId)
                ->where('tenant_id', Auth::user()->tenant_id)
                ->get();
            
            $levelIdMap = []; // Eski ID => Yeni ID haritası
            foreach ($sourceLevels as $sourceLevel) {
                $newLevel = $sourceLevel->replicate();
                $newLevel->season_id = $season->id;
                $newLevel->save();
                $levelIdMap[$sourceLevel->id] = $newLevel->id;
            }

            // 2. Sınıfları kopyala
            $sourceClassrooms = \App\Models\Classroom::withoutGlobalScope(\App\Scopes\SeasonScope::class)
                ->where('season_id', $sourceSeasonId)
                ->where('tenant_id', Auth::user()->tenant_id)
                ->get();

            \Log::info('Season Creation: Copying levels and classrooms', [
                'source_season_id' => $sourceSeasonId,
                'target_season_id' => $season->id,
                'level_count' => $sourceLevels->count(),
                'classroom_count' => $sourceClassrooms->count(),
            ]);

            foreach ($sourceClassrooms as $source) {
                $new = $source->replicate(['students_count']);
                $new->season_id = $season->id;
                $new->tenant_id = $season->tenant_id;
                
                // Eğer sınıf bir kademeye bağlıysa, yeni kademe ID'sini ata
                if ($source->education_level_id && isset($levelIdMap[$source->education_level_id])) {
                    $new->education_level_id = $levelIdMap[$source->education_level_id];
                }
                
                // Grade level string ise ve ID içeriyorsa onu da güncelle (bazı yerlerde grade_level ID olarak tutuluyor olabilir)
                if (isset($levelIdMap[$source->grade_level])) {
                    $new->grade_level = (string) $levelIdMap[$source->grade_level];
                }

                $new->save();
            }
        }

        return $this->success($season, 'Sezon başarıyla oluşturuldu.', 201);
    }

    /**
     * Display the specified season.
     */
    public function show(Season $season): JsonResponse
    {
        return $this->success($season);
    }

    /**
     * Update the specified season in storage.
     */
    public function update(Request $request, Season $season): JsonResponse
    {
        $validated = $request->validate([
            'name' => 'required|string|max:255',
            'description' => 'nullable|string',
            'is_active' => 'boolean',
        ]);

        $season->update($validated);
        
        // Cache temizle (aktiflik durumu değişmiş olabilir)
        \Illuminate\Support\Facades\Cache::forget("active_season_tenant_{$season->tenant_id}");


        return $this->success($season, 'Sezon başarıyla güncellendi.');
    }

    /**
     * Activate the specified season and deactivate others.
     */
    public function activate(Season $season): JsonResponse
    {
        // Tüm sezonları pasif yap
        Season::where('tenant_id', $season->tenant_id)->update(['is_active' => false]);
        
        // Seçili sezonu aktif yap
        $season->update(['is_active' => true]);

        // Cache temizle
        \Illuminate\Support\Facades\Cache::forget("active_season_tenant_{$season->tenant_id}");
        
        return $this->success($season, 'Sezon başarıyla aktif edildi.');
    }

    /**
     * Remove the specified season from storage.
     */
    public function destroy(Season $season): JsonResponse
    {
        $season->delete();
        return $this->success(null, 'Sezon başarıyla silindi.');
    }
}
