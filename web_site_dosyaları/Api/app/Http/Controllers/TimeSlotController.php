<?php

namespace App\Http\Controllers;

use App\Models\Classroom;
use App\Models\Schedule;
use App\Models\TimeSlot;
use Illuminate\Http\Request;
use Illuminate\Http\JsonResponse;
use Illuminate\Support\Facades\DB;

class TimeSlotController extends Controller
{
    /**
     * Display a listing of the resource.
     * Kademe (education_level_id) ile filtrelenir; farklı kademeler farklı ders saatlerine sahip olabilir.
     */
    public function index(Request $request): JsonResponse
    {
        $query = TimeSlot::query();

        $tenantId = auth()->user()?->tenant_id ?? null;
        if ($tenantId) {
            $query->where(function ($q) use ($tenantId) {
                $q->where('tenant_id', $tenantId)->orWhereNull('tenant_id');
            });
        }

        if ($request->filled('education_level_id')) {
            $requestedId = (int) $request->education_level_id;

            // Sezon bağımsız: aynı isim/koda sahip tüm sezonlardaki education_level ID'lerini topla
            $selectedLevel = \App\Models\EducationLevel::withoutGlobalScope(\App\Scopes\SeasonScope::class)
                ->whereKey($requestedId)
                ->first(['name', 'code', 'campus_id']);

            $matchingIds = collect([$requestedId]);
            if ($selectedLevel) {
                $criteria = \App\Models\EducationLevel::withoutGlobalScope(\App\Scopes\SeasonScope::class)
                    ->where(function ($q) use ($selectedLevel) {
                        if ($selectedLevel->name) {
                            $q->where('name', $selectedLevel->name);
                        }
                        if ($selectedLevel->code) {
                            $q->orWhere('code', $selectedLevel->code);
                        }
                    });
                if ($selectedLevel->campus_id) {
                    $criteria->where('campus_id', $selectedLevel->campus_id);
                }
                if ($tenantId) {
                    $criteria->where('tenant_id', $tenantId);
                }
                $matchingIds = $criteria->pluck('id')->merge([$requestedId])->unique();
            }

            $query->whereIn('education_level_id', $matchingIds->values()->all());
        }

        if ($request->filled('campus_id')) {
            $campusId = (int) $request->campus_id;
            // campus_id ile eşleşen tüm education_level'ların ID'lerini bul (tüm sezonlar dahil)
            $levelIds = \App\Models\EducationLevel::withoutGlobalScope(\App\Scopes\SeasonScope::class)
                ->where('campus_id', $campusId)
                ->when($tenantId, fn($q) => $q->where('tenant_id', $tenantId))
                ->pluck('id');
            $query->whereIn('education_level_id', $levelIds);
        }

        if ($request->has('is_active')) {
            $query->where('is_active', $request->boolean('is_active'));
        }

        if ($request->filled('search')) {
            $query->where('name', 'like', '%' . $request->search . '%');
        }

        $timeSlots = $query->orderBy('order', 'asc')->paginate(100);

        return response()->json([
            'data' => $timeSlots->items(),
            'meta' => [
                'total' => $timeSlots->total(),
                'per_page' => $timeSlots->perPage(),
                'current_page' => $timeSlots->currentPage(),
                'last_page' => $timeSlots->lastPage()
            ]
        ]);
    }

    /**
     * Store a newly created resource in storage.
     * education_level_id zorunludur; ders saati ilgili kademeye bağlanır.
     */
    public function store(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'education_level_id' => 'required|exists:education_levels,id',
            'campus_id' => 'nullable|exists:campuses,id',
            'name' => 'required|string|max:255',
            'start_time' => 'required|date_format:H:i',
            'end_time' => 'required|date_format:H:i|after:start_time',
            'break_duration' => 'nullable|integer|min:0',
            'order' => 'required|integer|min:1',
            'is_active' => 'nullable|boolean'
        ]);

        $validated['tenant_id'] = auth()->user()?->tenant_id;
        $validated['is_active'] = $validated['is_active'] ?? true;
        unset($validated['campus_id']);
        unset($validated['break_duration']); // time_slots tablosunda kolon yok; ileride eklenebilir

        $timeSlot = TimeSlot::create($validated);

        return response()->json([
            'data' => $timeSlot,
            'message' => 'Time slot created successfully'
        ], 201);
    }

    protected function findTimeSlot(mixed $timeSlot): TimeSlot
    {
        if ($timeSlot instanceof TimeSlot && $timeSlot->exists) {
            return $timeSlot;
        }

        $id = $timeSlot instanceof TimeSlot ? $timeSlot->id : $timeSlot;
        $idInt = (int) $id;

        $tenantId = auth()->user()?->tenant_id;
        $query = TimeSlot::query();
        if ($tenantId) {
            $query->where(function ($q) use ($tenantId) {
                $q->where('tenant_id', $tenantId)->orWhereNull('tenant_id');
            });
        }

        return $query->findOrFail($idInt);
    }

    /**
     * Display the specified resource.
     */
    public function show(mixed $timeSlot): JsonResponse
    {
        $timeSlot = $this->findTimeSlot($timeSlot);
        $this->authorizeTenant($timeSlot);
        return response()->json([
            'data' => $timeSlot
        ]);
    }

    /**
     * Update the specified resource in storage.
     */
    public function update(Request $request, mixed $timeSlot): JsonResponse
    {
        $timeSlot = $this->findTimeSlot($timeSlot);
        $this->authorizeTenant($timeSlot);

        $oldStart = (string) $timeSlot->getRawOriginal('start_time');
        $oldEnd = (string) $timeSlot->getRawOriginal('end_time');

        $validated = $request->validate([
            'name' => 'sometimes|string|max:255',
            'start_time' => 'sometimes|date_format:H:i',
            'end_time' => 'sometimes|date_format:H:i|after:start_time',
            'break_duration' => 'sometimes|integer|min:0',
            'order' => 'sometimes|integer|min:1',
            'is_active' => 'boolean'
        ]);

        unset($validated['break_duration']);

        DB::transaction(function () use ($timeSlot, $validated, $oldStart, $oldEnd) {
            $timeSlot->update($validated);

            $startChanged = array_key_exists('start_time', $validated) && (string) $timeSlot->getRawOriginal('start_time') !== $oldStart;
            $endChanged = array_key_exists('end_time', $validated) && (string) $timeSlot->getRawOriginal('end_time') !== $oldEnd;

            if (($startChanged || $endChanged) && $timeSlot->tenant_id !== null && $timeSlot->education_level_id !== null) {
                $newStart = (string) $timeSlot->getRawOriginal('start_time');
                $newEnd = (string) $timeSlot->getRawOriginal('end_time');

                // Normalize to HH:mm:ss for safe comparison/update with TIME columns.
                $normalizeTime = static function (string $t): string {
                    $t = trim($t);
                    if (preg_match('/^\d{2}:\d{2}$/', $t)) {
                        return $t . ':00';
                    }
                    if (preg_match('/^\d{2}:\d{2}:\d{2}$/', $t)) {
                        return $t;
                    }
                    return $t;
                };

                $oldStartN = $normalizeTime($oldStart);
                $oldEndN = $normalizeTime($oldEnd);
                $newStartN = $normalizeTime($newStart);
                $newEndN = $normalizeTime($newEnd);

                $classroomIds = Classroom::withoutGlobalScope(\App\Scopes\SeasonScope::class)
                    ->where('tenant_id', $timeSlot->tenant_id)
                    ->where('education_level_id', $timeSlot->education_level_id)
                    ->pluck('id');

                if ($classroomIds->isNotEmpty()) {
                    Schedule::withoutGlobalScope(\App\Scopes\SeasonScope::class)
                        ->where('tenant_id', $timeSlot->tenant_id)
                        ->whereIn('classroom_id', $classroomIds)
                        ->where(function($q) use ($oldStartN) {
                            $q->where('start_time', $oldStartN)
                              ->orWhere('start_time', 'like', substr($oldStartN, 0, 5) . '%');
                        })
                        ->where(function($q) use ($oldEndN) {
                            $q->where('end_time', $oldEndN)
                              ->orWhere('end_time', 'like', substr($oldEndN, 0, 5) . '%');
                        })
                        ->update([
                            'start_time' => $newStartN,
                            'end_time' => $newEndN,
                        ]);
                }
            }
        });

        return response()->json([
            'data' => $timeSlot->fresh(),
            'message' => 'Time slot updated successfully'
        ]);
    }

    /**
     * Remove the specified resource from storage.
     */
    public function destroy(mixed $timeSlot): JsonResponse
    {
        $timeSlot = $this->findTimeSlot($timeSlot);
        $this->authorizeTenant($timeSlot);
        $timeSlot->delete();

        return response()->json([
            'message' => 'Time slot deleted successfully'
        ]);
    }

    private function authorizeTenant(TimeSlot $timeSlot): void
    {
        $tenantId = auth()->user()?->tenant_id;
        if ($tenantId !== null && $timeSlot->tenant_id !== null && (int) $timeSlot->tenant_id !== (int) $tenantId) {
            abort(403, 'Unauthorized');
        }
    }
}
