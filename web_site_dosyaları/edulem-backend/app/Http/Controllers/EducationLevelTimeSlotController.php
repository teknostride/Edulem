<?php

namespace App\Http\Controllers;

use App\Models\EducationLevelTimeSlot;
use Illuminate\Http\Request;
use Illuminate\Http\JsonResponse;

class EducationLevelTimeSlotController extends Controller
{
    /**
     * LİSTELEME
     * URL'den gelen ID'yi ($educationLevelId) doğrudan kullanır.
     * Route: GET /api/v1/{educationLevelId}/time-slots
     */
    public function index($educationLevelId): JsonResponse
    {
        // 🛠️ DÜZELTME: Request validasyonu kaldırıldı.
        // ID artık doğrudan fonksiyona parametre olarak geliyor.

        $slots = EducationLevelTimeSlot::where('tenant_id', auth()->user()->tenant_id)
            ->where('education_level_id', $educationLevelId)
            ->orderBy('start_time', 'asc') // Saat sırasına göre getir
            ->get();

        return response()->json([
            'status' => true,
            'data' => $slots
        ]);
    }

    /**
     * EKLEME
     * Route: POST /api/v1/time-slots
     */
    public function store(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'education_level_id' => 'required|exists:education_levels,id',
            'start_time' => 'required', // SQL: NO NULL
            'end_time'   => 'required', // SQL: NO NULL
            'label'      => 'required|string', // SQL: varchar
            'type'       => 'required|in:lesson,break,lunch', // SQL: varchar
        ]);

        // 1. ADIM: Otomatik Sıra Numarası Hesapla
        $lastSlot = EducationLevelTimeSlot::where('education_level_id', $validated['education_level_id'])
                    ->max('slot_number');
        
        // Eğer hiç kayıt yoksa 1, varsa sonuncunun bir fazlası
        $newSlotNumber = $lastSlot ? $lastSlot + 1 : 1;

        // 2. ADIM: Kayıt Oluştur
        $slot = new EducationLevelTimeSlot();
        $slot->tenant_id = auth()->user()->tenant_id; // Güvenlik
        $slot->education_level_id = $validated['education_level_id'];
        $slot->start_time = $validated['start_time'];
        $slot->end_time = $validated['end_time'];
        $slot->label = $validated['label'];
        $slot->type = $validated['type'];
        
        // Kritik: SQL hatası almamak için hesaplanan sayıyı buraya yazıyoruz
        $slot->slot_number = $newSlotNumber;
        
        // Varsayılan değerler
        $slot->break_duration = 10; // SQL: Default 10
        $slot->is_active = true;    // SQL: Default 1
        
        $slot->save();

        return response()->json([
            'status' => true,
            'message' => 'Zaman dilimi eklendi.',
            'data' => $slot
        ], 201);
    }

    /**
     * SİLME
     * Route: DELETE /api/v1/time-slots/{id}
     */
    public function destroy($id): JsonResponse
    {
        $slot = EducationLevelTimeSlot::where('tenant_id', auth()->user()->tenant_id)
            ->where('id', $id)
            ->firstOrFail();
            
        $slot->delete();

        return response()->json([
            'status' => true,
            'message' => 'Silindi.'
        ]);
    }
}