<?php

namespace App\Http\Controllers;

use App\Models\Lesson;
use App\Models\User;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Facades\DB;

class LessonController extends ApiController
{
    /**
     * Dersleri Listele
     */
    public function index(): JsonResponse
    {
        try {
            $query = Lesson::query()
                ->select(['id', 'tenant_id', 'campus_id', 'education_level_id', 'name', 'code', 'color', 'is_active']);

            $query->with(['educationLevel:id,name,campus_id']);
            $hasPivot = Schema::hasTable('education_level_lessons');
            if ($hasPivot) {
                $query->with(['educationLevels:id,name,campus_id']);
            }

            $user = auth()->user();
            $isUnrestricted = $this->isUnrestrictedUser($user);
            if (!$isUnrestricted) {
                $allowedLevelIds = $this->allowedEducationLevelIds($user);
                $allowedCampusIds = array_values(array_filter(array_map('intval', (array) ($user->campus_ids ?? [])), static fn ($id) => $id > 0));

                if (empty($allowedLevelIds) && empty($allowedCampusIds)) {
                    return $this->success([
                        'lessons' => [],
                        'pagination' => [
                            'current_page' => 1,
                            'last_page' => 1,
                            'total' => 0,
                        ],
                        'data' => [],
                    ], 'Dersler listelendi.');
                }

                // Kural:
                // - education_level_ids varsa: SADECE kademe kapsamı (campus genişletme yok)
                // - education_level_ids yoksa ama campus_ids varsa: campus kapsamı
                if (!empty($allowedLevelIds)) {
                    $query->where(function ($q) use ($allowedLevelIds, $hasPivot) {
                        $q->whereIn('education_level_id', $allowedLevelIds);
                        if ($hasPivot) {
                            $q->orWhereIn('id', function ($q2) use ($allowedLevelIds) {
                                $q2->select('lesson_id')
                                    ->from('education_level_lessons')
                                    ->whereIn('education_level_id', $allowedLevelIds);
                            });
                        }
                    });
                } elseif (!empty($allowedCampusIds)) {
                    $query->whereIn('campus_id', $allowedCampusIds);
                }
            }

            if (auth()->check() && auth()->user()->tenant_id) {
                $query->where('tenant_id', auth()->user()->tenant_id);
            }

            // Arama filtresi
            if (request()->has('search')) {
                $search = request('search');
                $query->where(function($q) use ($search) {
                    $q->where('name', 'like', "%{$search}%")
                      ->orWhere('code', 'like', "%{$search}%");
                });
            }

            if (request()->filled('campus_id')) {
                $query->where('campus_id', (int) request('campus_id'));
            }

            if (request()->filled('education_level_id')) {
                $levelId = (int) request('education_level_id');
                $query->where(function ($q) use ($levelId, $hasPivot) {
                    $q->where('education_level_id', $levelId);
                    if ($hasPivot) {
                        $q->orWhereIn('id', function ($q2) use ($levelId) {
                            $q2->select('lesson_id')
                                ->from('education_level_lessons')
                                ->where('education_level_id', $levelId);
                        });
                    }
                });
            }

            $ids = request()->input('ids');
            if ($ids !== null) {
                if (is_string($ids)) {
                    $ids = array_filter(array_map('trim', explode(',', $ids)));
                }
                if (is_array($ids)) {
                    $ids = array_filter(array_map('intval', $ids), static fn ($id) => $id > 0);
                    if (! empty($ids)) {
                        // Belirli ID'ler isteniyorsa (örn: kullanıcı listesinde ders isimlerini çözmek için)
                        // sezon filtresini kaldırıyoruz ki eski sezondaki ders isimleri de görünebilsin.
                        $query->withoutGlobalScope(\App\Scopes\SeasonScope::class)->whereIn('id', $ids);
                    }
                }
            }

            $perPage = (int) request()->get('per_page', 100);
            if ($perPage <= 0) {
                $perPage = 100;
            }
            $perPage = min($perPage, 200);

            $lessons = $query->orderBy('name', 'asc')->paginate($perPage);

            $itemsCollect = collect($lessons->items());
            $tenantId = (int) (auth()->user()?->tenant_id ?? $itemsCollect->first()?->tenant_id ?? 1);
            $teachersByLessonId = $this->loadTeachersForLessons($itemsCollect, $tenantId);

            $lessonItems = $itemsCollect->map(function (Lesson $lesson) use ($teachersByLessonId) {
                $ids = [];
                if ($lesson->relationLoaded('educationLevels') && $lesson->educationLevels) {
                    $ids = $lesson->educationLevels->pluck('id')->map(fn ($id) => (int) $id)->values()->all();
                }
                if (empty($ids) && !empty($lesson->education_level_id)) {
                    $ids = [(int) $lesson->education_level_id];
                }
                $lesson->setAttribute('education_level_ids', $ids);

                $level = null;
                if ($lesson->relationLoaded('educationLevels') && $lesson->educationLevels && $lesson->educationLevels->isNotEmpty()) {
                    $level = $lesson->educationLevels->first();
                } elseif ($lesson->relationLoaded('educationLevel') && $lesson->educationLevel) {
                    $level = $lesson->educationLevel;
                }
                $lesson->setAttribute('education_level', $level ? [
                    'id' => (int) $level->id,
                    'name' => $level->name,
                    'display_name' => $level->name,
                    'campus_id' => $level->campus_id,
                ] : null);

                $lessonTeachers = $teachersByLessonId[(int) $lesson->id] ?? [];
                $lesson->setAttribute('teachers', $lessonTeachers);
                $lesson->setAttribute('teachers_count', count($lessonTeachers));

                return $lesson;
            })->all();

            return $this->success([
                'lessons' => $lessonItems,
                'pagination' => [
                    'current_page' => $lessons->currentPage(),
                    'last_page' => $lessons->lastPage(),
                    'total' => $lessons->total(),
                ],
                'data' => $lessonItems
            ], 'Dersler listelendi.');

        } catch (\Exception $e) {
            return $this->error('Hata: ' . $e->getMessage(), [], 500);
        }
    }

    /**
     * Yeni Ders Ekle
     * short_code boşsa otomatik üretilir: en fazla 5 karakter (Mat, Mat1, Mat10 gibi).
     */
    public function store(Request $request): JsonResponse
    {
        try {
            $user = auth()->user();
            $isUnrestricted = $this->isUnrestrictedUser($user);

            if (!$isUnrestricted) {
                $allowedLevelIds = $this->allowedEducationLevelIds($user);
                $allowedCampusIds = array_values(array_filter(array_map('intval', (array) ($user->campus_ids ?? [])), static fn ($id) => $id > 0));
                if (empty($allowedLevelIds) && empty($allowedCampusIds)) {
                    return $this->error('Bu işlem için kapsamınız yok.', [], 403);
                }
            }

            $validated = $request->validate([
                'campus_id' => 'required|integer|exists:campuses,id',
                'education_level_id' => 'nullable|integer|exists:education_levels,id',
                'education_level_ids' => 'nullable|array',
                'education_level_ids.*' => 'integer|exists:education_levels,id',
                'all_education_levels' => 'nullable|boolean',
                'name'       => 'required|string|max:255',
                'short_code' => 'nullable|string|max:5',
                'color'      => 'nullable|string|max:20',
                'is_active'  => 'boolean',
            ]);

            $targetLevelIds = [];
            $assignAll = $request->boolean('all_education_levels', false);
            if ($assignAll) {
                if (!$isUnrestricted) {
                    return $this->error('Tüm kademelere atama için yetkiniz yok.', [], 403);
                }
                $targetLevelIds = \App\Models\EducationLevel::query()
                    ->where('campus_id', (int) $validated['campus_id'])
                    ->pluck('id')
                    ->map(fn ($id) => (int) $id)
                    ->values()
                    ->all();
            } else {
                $rawIds = $request->input('education_level_ids');
                if (is_array($rawIds)) {
                    $targetLevelIds = array_values(array_filter(array_map('intval', $rawIds), static fn ($id) => $id > 0));
                }
                if (empty($targetLevelIds)) {
                    $single = (int) ($validated['education_level_id'] ?? 0);
                    if ($single > 0) {
                        $targetLevelIds = [$single];
                    }
                }
            }

            if (empty($targetLevelIds)) {
                return $this->error('Kademe seçimi zorunludur.', [], 422);
            }

            if (!$isUnrestricted) {
                $allowedCampusIds = array_values(array_filter(array_map('intval', (array) ($user->campus_ids ?? [])), static fn ($id) => $id > 0));

                if (!empty($allowedCampusIds) && !in_array((int) $validated['campus_id'], $allowedCampusIds, true)) {
                    return $this->error('Bu kampüste işlem yapma yetkiniz yok.', [], 403);
                }

                foreach ($targetLevelIds as $lid) {
                    if (!in_array((int) $lid, $this->allowedEducationLevelIds($user), true)) {
                        // Kademe kapsamı varsa campus üzerinden genişletme YAPMA.
                        // Kademe kapsamı yoksa campus kapsamı ile izin ver.
                        if (empty($this->allowedEducationLevelIds($user)) && !empty($allowedCampusIds)) {
                            $levelCampusId = (int) (\App\Models\EducationLevel::query()->whereKey((int) $lid)->value('campus_id') ?? 0);
                            if ($levelCampusId > 0 && in_array($levelCampusId, $allowedCampusIds, true)) {
                                continue;
                            }
                        }
                        return $this->error('Bu kademede işlem yapma yetkiniz yok.', [], 403);
                    }
                }
            }

            $tenantId = auth()->user()?->tenant_id ?? 1;
            $code = $request->input('short_code');
            if (empty(trim((string) $code))) {
                $code = $this->generateCode($validated['name'], $tenantId);
            } else {
                $code = strtoupper(substr(trim($code), 0, 5));
            }

            $lesson = Lesson::create([
                'tenant_id'   => $tenantId,
                'campus_id'   => (int) $validated['campus_id'],
                'education_level_id' => (int) ($targetLevelIds[0] ?? null),
                'name'        => $validated['name'],
                'code'        => $code,
                'description' => $request->input('description'),
                'color'       => $validated['color'] ?? '#3b6cff',
                'is_active'   => $request->boolean('is_active', true),
            ]);

            if (Schema::hasTable('education_level_lessons')) {
                $lesson->educationLevels()->sync($targetLevelIds);
                $lesson->load('educationLevels:id,name,campus_id');
            }

            if ($request->has('teacher_ids') && is_array($request->input('teacher_ids'))) {
                $teacherIds = array_values(array_filter(array_map('intval', $request->input('teacher_ids')), fn($id) => $id > 0));
                $lesson->teachers()->sync($teacherIds);
            }

            $lesson->setAttribute('education_level_ids', $targetLevelIds);

            return $this->success($lesson, 'Ders başarıyla oluşturuldu.', 201);

        } catch (\Illuminate\Validation\ValidationException $e) {
            return $this->error('Geçersiz veri.', $e->errors(), 422);
        } catch (\Exception $e) {
            return $this->error('Kayıt hatası: ' . $e->getMessage(), [], 500);
        }
    }

    /**
     * Dersi Güncelle
     */
    public function update(Request $request, string $id): JsonResponse
    {
        try {
            $lesson = Lesson::query()->with(['educationLevels:id,name,campus_id'])->findOrFail($id);

            $user = auth()->user();
            $isUnrestricted = $this->isUnrestrictedUser($user);
            $allowedLevelIds = $isUnrestricted ? [] : $this->allowedEducationLevelIds($user);

            if (!$isUnrestricted) {
                $currentLevelIds = [];
                if ($lesson->relationLoaded('educationLevels') && $lesson->educationLevels) {
                    $currentLevelIds = $lesson->educationLevels->pluck('id')->map(fn ($id) => (int) $id)->values()->all();
                }
                if (empty($currentLevelIds) && !empty($lesson->education_level_id)) {
                    $currentLevelIds = [(int) $lesson->education_level_id];
                }

                $allowedCampusIds = array_values(array_filter(array_map('intval', (array) ($user->campus_ids ?? [])), static fn ($id) => $id > 0));
                if (!empty($allowedCampusIds) && !in_array((int) $lesson->campus_id, $allowedCampusIds, true)) {
                    return $this->error('Bu derse erişim yetkiniz yok.', [], 403);
                }

                if (empty($allowedLevelIds)) {
                    // Campus kapsamında ise erişime izin ver.
                    // (Örn: Öğrenci İşleri gibi campus-scope rollerde education_level_ids boş olabilir.)
                    goto lesson_update_validation;
                }

                $inScope = false;
                foreach ($currentLevelIds as $lid) {
                    if (in_array((int) $lid, $allowedLevelIds, true)) {
                        $inScope = true;
                        break;
                    }
                }
                if (!$inScope) {
                    return $this->error('Bu derse erişim yetkiniz yok.', [], 403);
                }
            }

            lesson_update_validation:

            $request->validate([
                'campus_id' => 'required|integer|exists:campuses,id',
                'education_level_id' => 'nullable|integer|exists:education_levels,id',
                'education_level_ids' => 'nullable|array',
                'education_level_ids.*' => 'integer|exists:education_levels,id',
                'all_education_levels' => 'nullable|boolean',
                'name'       => 'required|string|max:255',
                'short_code' => 'nullable|string|max:5',
                'color'      => 'nullable|string|max:20',
                'is_active'  => 'boolean',
            ]);

            $targetLevelIds = [];
            $assignAll = $request->boolean('all_education_levels', false);
            if ($assignAll) {
                if (!$isUnrestricted) {
                    return $this->error('Tüm kademelere atama için yetkiniz yok.', [], 403);
                }
                $targetLevelIds = \App\Models\EducationLevel::query()
                    ->where('campus_id', (int) $request->input('campus_id', $lesson->campus_id))
                    ->pluck('id')
                    ->map(fn ($id) => (int) $id)
                    ->values()
                    ->all();
            } else {
                $rawIds = $request->input('education_level_ids');
                if (is_array($rawIds)) {
                    $targetLevelIds = array_values(array_filter(array_map('intval', $rawIds), static fn ($id) => $id > 0));
                }
                if (empty($targetLevelIds)) {
                    $single = (int) $request->input('education_level_id', $lesson->education_level_id);
                    if ($single > 0) {
                        $targetLevelIds = [$single];
                    }
                }
            }

            if (empty($targetLevelIds)) {
                return $this->error('Kademe seçimi zorunludur.', [], 422);
            }

            if (!$isUnrestricted) {
                $allowedLevelIds = $this->allowedEducationLevelIds($user);
                $allowedCampusIds = array_values(array_filter(array_map('intval', (array) ($user->campus_ids ?? [])), static fn ($id) => $id > 0));

                $targetCampusId = (int) $request->input('campus_id', $lesson->campus_id);
                if (!empty($allowedCampusIds) && !in_array($targetCampusId, $allowedCampusIds, true)) {
                    return $this->error('Bu kampüste işlem yapma yetkiniz yok.', [], 403);
                }

                foreach ($targetLevelIds as $lid) {
                    if (!in_array((int) $lid, $allowedLevelIds, true)) {
                        return $this->error('Bu kademede işlem yapma yetkiniz yok.', [], 403);
                    }
                }
            }

            $tenantId = $lesson->tenant_id ?? auth()->user()?->tenant_id ?? 1;
            $code = $lesson->code;
            if ($request->filled('short_code')) {
                $code = strtoupper(substr(trim((string) $request->input('short_code')), 0, 5));
            } elseif (empty(trim((string) $code))) {
                $code = $this->generateCode((string) $request->input('name', $lesson->name), (int) $tenantId);
            }

            $lesson->update([
                'campus_id' => (int) $request->input('campus_id', $lesson->campus_id),
                'education_level_id' => (int) ($targetLevelIds[0] ?? $lesson->education_level_id),
                'name'      => (string) $request->input('name', $lesson->name),
                'code'      => $code,
                'description' => $request->input('description', $lesson->description),
                'color'     => $request->input('color', $lesson->color),
                'is_active' => $request->boolean('is_active', $lesson->is_active),
            ]);

            if (Schema::hasTable('education_level_lessons')) {
                $lesson->educationLevels()->sync($targetLevelIds);
                $lesson->load('educationLevels:id,name,campus_id');
            }

            if ($request->has('teacher_ids') && is_array($request->input('teacher_ids'))) {
                $teacherIds = array_values(array_filter(array_map('intval', $request->input('teacher_ids')), fn($id) => $id > 0));
                $lesson->teachers()->sync($teacherIds);
            }

            $lesson->setAttribute('education_level_ids', $targetLevelIds);

            return $this->success(['data' => $lesson], 'Ders güncellendi.');

        } catch (\Illuminate\Validation\ValidationException $e) {
            return $this->error('Geçersiz veri.', $e->errors(), 422);
        } catch (\Exception $e) {
            return $this->error('Güncelleme hatası: ' . $e->getMessage(), [], 500);
        }
    }

    /**
     * Dersi Sil
     */
    public function destroy(string $id): JsonResponse
    {
        try {
            $lesson = Lesson::findOrFail($id);

            $user = auth()->user();
            $isUnrestricted = $this->isUnrestrictedUser($user);
            if (!$isUnrestricted) {
                $allowedLevelIds = $this->allowedEducationLevelIds($user);
                $allowedCampusIds = array_values(array_filter(array_map('intval', (array) ($user->campus_ids ?? [])), static fn ($id) => $id > 0));

                if (!empty($allowedLevelIds)) {
                    if (!in_array((int) $lesson->education_level_id, $allowedLevelIds, true)) {
                        return $this->error('Bu derse erişim yetkiniz yok.', [], 403);
                    }
                } elseif (!empty($allowedCampusIds)) {
                    if (!in_array((int) $lesson->campus_id, $allowedCampusIds, true)) {
                        return $this->error('Bu derse erişim yetkiniz yok.', [], 403);
                    }
                } else {
                    return $this->error('Bu derse erişim yetkiniz yok.', [], 403);
                }
            }

            // Ders silinmeden önce gerçek kullanım kontrolü (ders programı ve ödev)
            $usedInSchedules = DB::table('schedules')->where('lesson_id', $id)->exists();
            if ($usedInSchedules) {
                return $this->error('Bu ders ders programında kullanıldığı için silinemez. Önce ders programından kaldırın.', [], 422);
            }

            $usedInHomework = DB::table('homeworks')->where('lesson_id', $id)->exists();
            if ($usedInHomework) {
                return $this->error('Bu derse ait ödevler bulunduğu için silinemez.', [], 422);
            }

            // Pivot tablodan (kademe atamaları) temizle
            if (Schema::hasTable('education_level_lessons')) {
                DB::table('education_level_lessons')->where('lesson_id', $id)->delete();
            }

            $lesson->delete();
            return $this->success([], 'Ders silindi.');
        } catch (\Exception $e) {
            return $this->error('Silme hatası: ' . $e->getMessage(), [], 500);
        }
    }

    /**
     * Ders Detayı
     */
    public function show(string $id): JsonResponse
    {
        try {
            $query = Lesson::query();
            $query->with(['educationLevel:id,name,campus_id']);
            if (Schema::hasTable('education_level_lessons')) {
                $query->with(['educationLevels:id,name,campus_id']);
            }

            $lesson = $query->findOrFail($id);
            $tenantId = (int) ($lesson->tenant_id ?? auth()->user()?->tenant_id ?? 1);

            $teachersByLesson = $this->loadTeachersForLessons(collect([$lesson]), $tenantId);
            $lessonTeachers = $teachersByLesson[(int) $lesson->id] ?? [];

            $ids = [];
            if ($lesson->relationLoaded('educationLevels') && $lesson->educationLevels) {
                $ids = $lesson->educationLevels->pluck('id')->map(fn ($id) => (int) $id)->values()->all();
            }
            if (empty($ids) && !empty($lesson->education_level_id)) {
                $ids = [(int) $lesson->education_level_id];
            }
            $lesson->setAttribute('education_level_ids', $ids);

            $level = null;
            if ($lesson->relationLoaded('educationLevels') && $lesson->educationLevels && $lesson->educationLevels->isNotEmpty()) {
                $level = $lesson->educationLevels->first();
            } elseif ($lesson->relationLoaded('educationLevel') && $lesson->educationLevel) {
                $level = $lesson->educationLevel;
            }
            $lesson->setAttribute('education_level', $level ? [
                'id' => (int) $level->id,
                'name' => $level->name,
                'display_name' => $level->name,
                'campus_id' => $level->campus_id,
            ] : null);

            $lesson->setAttribute('teachers', $lessonTeachers);
            $lesson->setAttribute('teachers_count', count($lessonTeachers));

            return $this->success($lesson, 'Ders detayı getirildi.');
        } catch (\Exception $e) {
            return $this->error('Ders bulunamadı: ' . $e->getMessage(), [], 404);
        }
    }

    /**
     * Dersin öğretmenlerini getir
     */
    public function teachers(string $id): JsonResponse
    {
        try {
            $lesson = Lesson::findOrFail($id);
            $tenantId = (int) ($lesson->tenant_id ?? auth()->user()?->tenant_id ?? 1);

            $teachersByLesson = $this->loadTeachersForLessons(collect([$lesson]), $tenantId);
            $allTeachers = $teachersByLesson[(int) $lesson->id] ?? [];

            return $this->success($allTeachers, 'Dersin öğretmenleri listelendi.');

        } catch (\Exception $e) {
            return $this->error('Öğretmenler yüklenemedi: ' . $e->getMessage(), [], 500);
        }
    }

    /**
     * Verilen ders koleksiyonu için öğretmenleri toplu olarak eşleştirir.
     *
     * @param \Illuminate\Support\Collection|\Illuminate\Database\Eloquent\Collection $lessons
     * @param int $tenantId
     * @return array<int, array> [lesson_id => [teachers]]
     */
    protected function loadTeachersForLessons($lessons, int $tenantId): array
    {
        if ($lessons->isEmpty()) {
            return [];
        }

        $lessonIds = $lessons->pluck('id')->map(fn ($id) => (int) $id)->values()->all();
        $teachersByLessonId = [];
        foreach ($lessonIds as $lid) {
            $teachersByLessonId[$lid] = [];
        }

        // 1. lesson_teacher pivot tablosu
        if (Schema::hasTable('lesson_teacher')) {
            $pivotRows = DB::table('lesson_teacher')
                ->join('users', 'users.id', '=', 'lesson_teacher.teacher_id')
                ->whereIn('lesson_teacher.lesson_id', $lessonIds)
                ->where('users.tenant_id', $tenantId)
                ->select('lesson_teacher.lesson_id', 'users.id', 'users.first_name', 'users.last_name', 'users.email', 'users.role_id')
                ->get();

            foreach ($pivotRows as $row) {
                $lid = (int) $row->lesson_id;
                $teachersByLessonId[$lid][$row->id] = [
                    'id' => (int) $row->id,
                    'name' => trim(($row->first_name ?? '') . ' ' . ($row->last_name ?? '')),
                    'first_name' => $row->first_name,
                    'last_name' => $row->last_name,
                    'email' => $row->email,
                    'role_id' => $row->role_id,
                ];
            }
        }

        // 2. schedules tablosu
        if (Schema::hasTable('schedules')) {
            $schedules = DB::table('schedules')
                ->whereIn('lesson_id', $lessonIds)
                ->where('tenant_id', $tenantId)
                ->where(function ($q) {
                    $q->whereNotNull('teacher_id')
                      ->orWhereNotNull('assistant_teacher_ids');
                })
                ->select('lesson_id', 'teacher_id', 'assistant_teacher_ids')
                ->get();

            $scheduleUserIds = [];
            $lessonScheduleUsers = [];
            foreach ($schedules as $sch) {
                $lid = (int) $sch->lesson_id;
                if (!empty($sch->teacher_id)) {
                    $tid = (int) $sch->teacher_id;
                    $scheduleUserIds[$tid] = $tid;
                    $lessonScheduleUsers[$lid][] = $tid;
                }
                if (!empty($sch->assistant_teacher_ids)) {
                    $raw = $sch->assistant_teacher_ids;
                    $aids = is_string($raw) ? json_decode($raw, true) : (is_array($raw) ? $raw : []);
                    if (is_array($aids)) {
                        foreach ($aids as $aid) {
                            $aidInt = (int) $aid;
                            if ($aidInt > 0) {
                                $scheduleUserIds[$aidInt] = $aidInt;
                                $lessonScheduleUsers[$lid][] = $aidInt;
                            }
                        }
                    }
                }
            }

            if (!empty($scheduleUserIds)) {
                $users = User::whereIn('id', array_values($scheduleUserIds))
                    ->where('tenant_id', $tenantId)
                    ->select('id', 'first_name', 'last_name', 'email', 'role_id')
                    ->get()
                    ->keyBy('id');

                foreach ($lessonScheduleUsers as $lid => $uids) {
                    foreach ($uids as $uid) {
                        if (isset($users[$uid])) {
                            $u = $users[$uid];
                            $teachersByLessonId[$lid][$u->id] = [
                                'id' => (int) $u->id,
                                'name' => trim(($u->first_name ?? '') . ' ' . ($u->last_name ?? '')),
                                'first_name' => $u->first_name,
                                'last_name' => $u->last_name,
                                'email' => $u->email,
                                'role_id' => $u->role_id,
                            ];
                        }
                    }
                }
            }
        }

        // 3. users tablosundaki subjects alanı
        $teachersWithSubjects = User::where('tenant_id', $tenantId)
            ->whereNotNull('subjects')
            ->select('id', 'first_name', 'last_name', 'email', 'role_id', 'subjects')
            ->get();

        foreach ($teachersWithSubjects as $teacher) {
            $subjects = is_array($teacher->subjects)
                ? $teacher->subjects
                : (is_string($teacher->subjects) ? json_decode($teacher->subjects, true) : []);

            if (!is_array($subjects) || empty($subjects)) {
                continue;
            }

            $teacherData = [
                'id' => (int) $teacher->id,
                'name' => trim(($teacher->first_name ?? '') . ' ' . ($teacher->last_name ?? '')),
                'first_name' => $teacher->first_name,
                'last_name' => $teacher->last_name,
                'email' => $teacher->email,
                'role_id' => $teacher->role_id,
            ];

            foreach ($lessons as $lesson) {
                $lid = (int) $lesson->id;
                $lidStr = (string) $lesson->id;
                $lname = trim((string) $lesson->name);
                $lcode = trim((string) $lesson->code);

                $matches = false;
                foreach ($subjects as $subj) {
                    $sStr = trim((string) $subj);
                    if ($sStr === $lidStr || (intval($sStr) > 0 && intval($sStr) === $lid)) {
                        $matches = true;
                        break;
                    }
                    if ($lname !== '' && strcasecmp($sStr, $lname) === 0) {
                        $matches = true;
                        break;
                    }
                    if ($lcode !== '' && strcasecmp($sStr, $lcode) === 0) {
                        $matches = true;
                        break;
                    }
                }

                if ($matches) {
                    $teachersByLessonId[$lid][$teacher->id] = $teacherData;
                }
            }
        }

        // Değerleri düz liste olarak dön
        $result = [];
        foreach ($teachersByLessonId as $lid => $tList) {
            $result[$lid] = array_values($tList);
        }

        return $result;
    }

    /**
     * Ders adından en fazla 5 karakterlik kısa kod üretir: Mat, Mat1, Mat10 gibi.
     * Mantıklı kısaltma: Türkçe karakterler dönüştürülür, ilk 3 harf alınır, gerekiyorsa 1–99 eklenir.
     */
    private function generateCode(string $name, int $tenantId): string
    {
        $tr = ['ı' => 'i', 'İ' => 'I', 'ş' => 's', 'Ş' => 'S', 'ğ' => 'g', 'Ğ' => 'G', 'ü' => 'u', 'Ü' => 'U', 'ö' => 'o', 'Ö' => 'O', 'ç' => 'c', 'Ç' => 'C'];
        $s = str_replace(array_keys($tr), array_values($tr), $name);
        $s = preg_replace('/[^A-Za-z0-9\s]/', '', $s) ?: $name;
        $words = array_filter(explode(' ', $s));
        $base = '';
        if (count($words) >= 2) {
            foreach (array_slice($words, 0, 3) as $w) {
                $base .= mb_strtoupper(mb_substr($w, 0, 1));
            }
        }
        if (strlen($base) < 2) {
            $base = mb_strtoupper(preg_replace('/[^A-Za-z]/', '', $s) ?: 'D');
            $base = substr($base, 0, 3) ?: 'D';
        }
        $base = substr($base, 0, 3);

        for ($n = 0; $n <= 99; $n++) {
            $c = $base . ($n > 0 ? (string) $n : '');
            if (strlen($c) <= 5 && ! Lesson::where('tenant_id', $tenantId)->where('code', $c)->exists()) {
                return $c;
            }
        }
        return $base . substr((string) random_int(10, 99), 0, 2);
    }
}