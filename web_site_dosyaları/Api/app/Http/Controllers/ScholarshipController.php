<?php

namespace App\Http\Controllers;

use App\Models\Scholarship;
use App\Models\ScholarshipDocumentTemplate;
use App\Models\Student;
use App\Models\Classroom;
use App\Models\EducationLevel;
use Illuminate\Http\Request;
use Illuminate\Http\JsonResponse;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Validator;
use Illuminate\Validation\Rule;
use Barryvdh\DomPDF\Facade\Pdf;

class ScholarshipController extends ApiController
{
    /**
     * Display a listing of the scholarship records.
     */
    public function index(Request $request): JsonResponse
    {
        try {
            $user = $request->user();
            $tenantId = $user->tenant_id;

            $query = Scholarship::with(['student', 'classroom.educationLevel'])
                ->where('tenant_id', $tenantId);

            // Durum filtresi
            if ($request->has('durum')) {
                $query->where('durum', $request->durum);
            } else {
                // Varsayılan olarak sadece aktif kayıtları göster
                $query->where('durum', 'aktif');
            }

            // Sınıf filtresi
            if ($request->filled('classroom_id')) {
                $query->where('classroom_id', $request->classroom_id);
            }

            // Sınıf adı filtresi (sınıf düzeyi)
            if ($request->filled('sinif_adi')) {
                $query->where('sinif_adi', $request->sinif_adi)
                      ->whereNull('classroom_id');
            }

            // Arama filtresi
            if ($request->filled('search')) {
                $search = $request->search;
                $query->where(function ($q) use ($search) {
                    $q->where('ad_soyad', 'like', "%{$search}%")
                      ->orWhere('tc_kimlik', 'like', "%{$search}%")
                      ->orWhere('veli_ad_soyad', 'like', "%{$search}%")
                      ->orWhere('veli_iletisim', 'like', "%{$search}%")
                      ->orWhere('okul_adi', 'like', "%{$search}%");
                });
            }

            // Sıralama
            $sortBy = $request->get('sort_by', 'ad_soyad');
            $sortOrder = $request->get('sort_order', 'asc');
            
            $allowedSortFields = ['ad_soyad', 'created_at', 'tc_kimlik', 'sinif_adi'];
            if (in_array($sortBy, $allowedSortFields)) {
                $query->orderBy($sortBy, $sortOrder);
            } else {
                $query->orderBy('ad_soyad', 'asc');
            }

            $scholarships = $query->paginate($request->get('per_page', 15));

            return $this->success([
                'scholarships' => $scholarships->items(),
                'pagination' => [
                    'current_page' => $scholarships->currentPage(),
                    'last_page' => $scholarships->lastPage(),
                    'per_page' => $scholarships->perPage(),
                    'total' => $scholarships->total(),
                ],
            ], 'Bursluluk kayıtları başarıyla getirildi.');
        } catch (\Exception $e) {
            return $this->error('Bursluluk kayıtları getirilirken bir hata oluştu: ' . $e->getMessage(), [], 500);
        }
    }

    public function downloadEntryDocument(Request $request, int $id)
    {
        $user = $request->user();
        $tenantId = $user->tenant_id;

        $scholarship = Scholarship::with(['classroom.educationLevel'])
            ->where('tenant_id', $tenantId)
            ->find($id);

        if (!$scholarship) {
            return $this->error('Kayıt bulunamadı.', [], 404);
        }

        if (!$scholarship->classroom_id) {
            return $this->error('Belge oluşturmak için kayıtlı sınıf bilgisi gereklidir.', [], 422);
        }

        $template = ScholarshipDocumentTemplate::where('tenant_id', $tenantId)
            ->whereHas('classrooms', fn ($q) => $q->where('classrooms.id', $scholarship->classroom_id))
            ->with(['classrooms.educationLevel'])
            ->latest('id')
            ->first();

        if (!$template) {
            return $this->error('Bu sınıf için belge şablonu bulunamadı.', [], 404);
        }

        $classroom = $scholarship->classroom;

        $pdf = Pdf::loadView('scholarships.entry-document', [
            'template' => $template,
            'scholarship' => $scholarship,
            'classroom' => $classroom,
            'generatedAt' => now()->format('d.m.Y H:i'),
        ])->setPaper('a4', 'portrait');

        $fileName = 'sinav_giris_belgesi_' . $scholarship->id . '.pdf';

        return $pdf->download($fileName);
    }

    /**
     * Store a newly created scholarship record.
     */
    public function store(Request $request): JsonResponse
    {
        try {
            $user = $request->user();
            $tenantId = $user->tenant_id;

            $validator = Validator::make($request->all(), [
                'tc_kimlik' => 'required|string|size:11',
                'ad_soyad' => 'required|string|max:255',
                'okul_adi' => 'required|string|max:255',
                'classroom_id' => 'nullable|integer|exists:classrooms,id',
                'sinif_adi' => 'nullable|string|max:100',
                'veli_ad_soyad' => 'required|string|max:255',
                'dogum_tarihi' => 'nullable|date',
                'veli_iletisim' => 'required|string|max:20',
                'student_id' => 'nullable|integer|exists:students,id',
            ]);

            if ($validator->fails()) {
                return $this->error('Validasyon hatası.', $validator->errors(), 422);
            }

            $data = $validator->validated();
            $data['tenant_id'] = $tenantId;

            // TC Kimlik kontrolü - Aynı TC ile kayıt yapılamaz
            if (Scholarship::existsByTcKimlik($tenantId, $data['tc_kimlik'])) {
                return $this->error('Bu T.C. Kimlik No ile zaten bir kayıt bulunmaktadır. Aynı T.C. Kimlik No ile birden fazla kayıt yapılamaz.', [], 422);
            }

            // Ad-Soyad kontrolü - Aynı ad-soyad varsa uyarı (ama kayıt yapılabilir)
            $existingByName = Scholarship::existsByName($tenantId, $data['ad_soyad']);
            $adSoyadWarning = null;
            if ($existingByName) {
                $adSoyadWarning = 'Bu ad-soyad ile zaten bir kayıt bulunmaktadır (T.C. Kimlik: ' . $existingByName->tc_kimlik . '). Devam etmek istediğinize emin misiniz?';
            }

            // Sınıf bilgisini düzenle
            if (!empty($data['classroom_id'])) {
                $classroom = Classroom::with('educationLevel')->find($data['classroom_id']);
                if ($classroom) {
                    $educationLevelName = $classroom->educationLevel?->name ?? 'Kademe';
                    $data['sinif_adi'] = $educationLevelName . ' - ' . $classroom->name;
                }
            }

            // Ad-soyad uyarısı varsa ve onay bekleniyorsa kontrol et
            if ($adSoyadWarning && !($request->get('ad_soyad_onay') == '1')) {
                return response()->json([
                    'success' => false,
                    'warning' => true,
                    'message' => $adSoyadWarning,
                    'requires_confirmation' => true
                ], 422);
            }

            $scholarship = Scholarship::create($data);

            $message = 'Bursluluk kaydı başarıyla eklendi.';
            if ($adSoyadWarning && $request->get('ad_soyad_onay') == '1') {
                $message .= ' (Aynı ad-soyad ile kayıt uyarısı verilmişti, kayıt yine de yapıldı.)';
            }

            return $this->success($scholarship->load(['student', 'classroom.educationLevel']), $message, 201);
        } catch (\Exception $e) {
            return $this->error('Bursluluk kaydı eklenirken bir hata oluştu: ' . $e->getMessage(), [], 500);
        }
    }

    /**
     * Display the specified scholarship record.
     */
    public function show(Request $request, $id): JsonResponse
    {
        try {
            $user = $request->user();
            $tenantId = $user->tenant_id;

            $scholarship = Scholarship::with(['student', 'classroom.educationLevel'])
                ->where('tenant_id', $tenantId)
                ->find($id);

            if (!$scholarship) {
                return $this->error('Kayıt bulunamadı.', [], 404);
            }

            return $this->success($scholarship, 'Kayıt başarıyla getirildi.');
        } catch (\Exception $e) {
            return $this->error('Kayıt getirilirken bir hata oluştu: ' . $e->getMessage(), [], 500);
        }
    }

    /**
     * Update the specified scholarship record.
     */
    public function update(Request $request, $id): JsonResponse
    {
        try {
            $user = $request->user();
            $tenantId = $user->tenant_id;

            $scholarship = Scholarship::where('tenant_id', $tenantId)->find($id);
            if (!$scholarship) {
                return $this->error('Kayıt bulunamadı.', [], 404);
            }

            $validator = Validator::make($request->all(), [
                'tc_kimlik' => 'required|string|size:11',
                'ad_soyad' => 'required|string|max:255',
                'okul_adi' => 'required|string|max:255',
                'classroom_id' => 'nullable|integer|exists:classrooms,id',
                'sinif_adi' => 'nullable|string|max:100',
                'veli_ad_soyad' => 'required|string|max:255',
                'dogum_tarihi' => 'nullable|date',
                'veli_iletisim' => 'required|string|max:20',
                'student_id' => 'nullable|integer|exists:students,id',
            ]);

            if ($validator->fails()) {
                return $this->error('Validasyon hatası.', $validator->errors(), 422);
            }

            $data = $validator->validated();

            // TC Kimlik kontrolü (başka bir kayıtla çakışma)
            if (Scholarship::existsByTcKimlik($tenantId, $data['tc_kimlik'], $id)) {
                return $this->error('Bu T.C. Kimlik No ile zaten başka bir kayıt bulunmaktadır.', [], 422);
            }

            // Sınıf bilgisini düzenle
            if (!empty($data['classroom_id'])) {
                $classroom = Classroom::with('educationLevel')->find($data['classroom_id']);
                if ($classroom) {
                    $educationLevelName = $classroom->educationLevel?->name ?? 'Kademe';
                    $data['sinif_adi'] = $educationLevelName . ' - ' . $classroom->name;
                }
            }

            $scholarship->update($data);

            return $this->success($scholarship->load(['student', 'classroom.educationLevel']), 'Bursluluk kaydı başarıyla güncellendi.');
        } catch (\Exception $e) {
            return $this->error('Bursluluk kaydı güncellenirken bir hata oluştu: ' . $e->getMessage(), [], 500);
        }
    }

    /**
     * Remove the specified scholarship record.
     */
    public function destroy(Request $request, $id): JsonResponse
    {
        try {
            $user = $request->user();
            $tenantId = $user->tenant_id;

            $scholarship = Scholarship::where('tenant_id', $tenantId)->find($id);
            if (!$scholarship) {
                return $this->error('Kayıt bulunamadı.', [], 404);
            }

            $scholarship->delete();

            return $this->success(null, 'Bursluluk kaydı başarıyla silindi.');
        } catch (\Exception $e) {
            return $this->error('Bursluluk kaydı silinirken bir hata oluştu: ' . $e->getMessage(), [], 500);
        }
    }

    /**
     * Archive all active scholarship records.
     */
    public function archiveAll(Request $request): JsonResponse
    {
        try {
            $user = $request->user();
            $tenantId = $user->tenant_id;

            $totalActive = Scholarship::where('tenant_id', $tenantId)
                ->where('durum', 'aktif')
                ->count();

            if ($totalActive === 0) {
                return $this->error('Arşivlenecek aktif kayıt bulunamadı.', [], 422);
            }

            $affected = Scholarship::where('tenant_id', $tenantId)
                ->where('durum', 'aktif')
                ->update(['durum' => 'pasif']);

            return $this->success([
                'affected' => $affected,
                'total' => $totalActive
            ], "Tüm kayıtlar ({$totalActive} adet) başarıyla arşive alındı.");
        } catch (\Exception $e) {
            return $this->error('Arşivleme işlemi sırasında bir hata oluştu: ' . $e->getMessage(), [], 500);
        }
    }

    /**
     * Restore scholarship from archive.
     */
    public function restore(Request $request, $id): JsonResponse
    {
        try {
            $user = $request->user();
            $tenantId = $user->tenant_id;

            $scholarship = Scholarship::where('tenant_id', $tenantId)
                ->where('durum', 'pasif')
                ->find($id);

            if (!$scholarship) {
                return $this->error('Arşivde kayıt bulunamadı.', [], 404);
            }

            $scholarship->update(['durum' => 'aktif']);

            return $this->success(null, 'Kayıt başarıyla arşivden geri çağrıldı.');
        } catch (\Exception $e) {
            return $this->error('Kayıt geri çağrılırken bir hata oluştu: ' . $e->getMessage(), [], 500);
        }
    }

    /**
     * Get students by classroom for bulk registration.
     */
    public function getStudentsByClassroom(Request $request, $classroom): JsonResponse
    {
        try {
            $user = $request->user();
            $tenantId = $user->tenant_id;

            $classroomId = $classroom;
            if (!$classroomId) {
                return $this->error('Sınıf ID zorunludur.', [], 422);
            }

            $classroomModel = Classroom::with('educationLevel')
                ->where('tenant_id', $tenantId)
                ->find($classroomId);

            if (!$classroomModel) {
                return $this->error('Sınıf bulunamadı.', [], 404);
            }

            // Sınıftaki öğrencileri getir
            $students = Student::where('tenant_id', $tenantId)
                ->where('classroom_id', $classroomId)
                ->with('guardians')
                ->get(['id', 'name', 'tc_no', 'phone', 'birth_date', 'emergency_contact_info']);

            // Hangi öğrenciler zaten bursluluk kaydında kontrol et
            $studentIds = $students->pluck('id')->toArray();
            $registeredStudentIds = Scholarship::where('tenant_id', $tenantId)
                ->whereIn('student_id', $studentIds)
                ->where('durum', 'aktif')
                ->pluck('student_id')
                ->toArray();

            $studentsWithStatus = $students->map(function ($student) use ($registeredStudentIds) {
                $guardian = null;
                try {
                    if ($student->relationLoaded('guardians')) {
                        $guardian = $student->guardians
                            ->sortByDesc(fn ($g) => (int) ($g->pivot->is_legal_guardian ?? 0))
                            ->first();
                    }
                } catch (\Throwable $e) {
                    $guardian = null;
                }

                $emergency = is_array($student->emergency_contact_info) ? $student->emergency_contact_info : [];
                $veliAdSoyad = $guardian?->name ?? ($emergency['name'] ?? '');
                $veliIletisim = $guardian?->phone ?? ($emergency['phone'] ?? ($student->phone ?? ''));

                return [
                    'id' => $student->id,
                    'tc_kimlik' => $student->tc_no,
                    'ad_soyad' => $student->name,
                    'veli_ad_soyad' => $veliAdSoyad,
                    'veli_iletisim' => $veliIletisim,
                    'dogum_tarihi' => $student->birth_date,
                    'bursluluk_kayitli' => in_array($student->id, $registeredStudentIds, true),
                ];
            });

            return $this->success([
                'classroom' => $classroomModel,
                'students' => $studentsWithStatus
            ], 'Öğrenciler başarıyla getirildi.');
        } catch (\Exception $e) {
            return $this->error('Öğrenciler getirilirken bir hata oluştu: ' . $e->getMessage(), [], 500);
        }
    }

    /**
     * Register entire class for scholarship.
     */
    public function registerEntireClass(Request $request): JsonResponse
    {
        try {
            $user = $request->user();
            $tenantId = $user->tenant_id;

            $validator = Validator::make($request->all(), [
                'classroom_id' => 'required|integer|exists:classrooms,id',
            ]);

            if ($validator->fails()) {
                return $this->error('Validasyon hatası.', $validator->errors(), 422);
            }

            $classroomId = $request->classroom_id;
            $classroom = Classroom::with('educationLevel')
                ->where('tenant_id', $tenantId)
                ->find($classroomId);

            if (!$classroom) {
                return $this->error('Sınıf bulunamadı.', [], 404);
            }

            // Sınıftaki öğrencileri getir
            $students = Student::where('tenant_id', $tenantId)
                ->where('classroom_id', $classroomId)
                ->with('guardians')
                ->get();

            if ($students->isEmpty()) {
                return $this->error('Bu sınıfta öğrenci bulunamadı.', [], 422);
            }

            // Okul adını al
            $okulAdi = $user->tenant?->name ?? 'Okul';

            // Zaten kayıtlı öğrencileri kontrol et
            $studentIds = $students->pluck('id')->toArray();
            $registeredStudentIds = Scholarship::where('tenant_id', $tenantId)
                ->whereIn('student_id', $studentIds)
                ->where('durum', 'aktif')
                ->pluck('student_id')
                ->toArray();

            $added = 0;
            $skipped = 0;

            foreach ($students as $student) {
                if (in_array($student->id, $registeredStudentIds)) {
                    $skipped++;
                    continue;
                }

                $guardian = null;
                try {
                    if ($student->relationLoaded('guardians')) {
                        $guardian = $student->guardians
                            ->sortByDesc(fn ($g) => (int) ($g->pivot->is_legal_guardian ?? 0))
                            ->first();
                    }
                } catch (\Throwable $e) {
                    $guardian = null;
                }

                $emergency = is_array($student->emergency_contact_info) ? $student->emergency_contact_info : [];
                $veliAdSoyad = $guardian?->name ?? ($emergency['name'] ?? '');
                $veliIletisim = $guardian?->phone ?? ($emergency['phone'] ?? ($student->phone ?? ''));

                Scholarship::create([
                    'tenant_id' => $tenantId,
                    'student_id' => $student->id,
                    'tc_kimlik' => $student->tc_no ?? '',
                    'ad_soyad' => $student->name ?? '',
                    'okul_adi' => $okulAdi,
                    'classroom_id' => $classroomId,
                    'sinif_adi' => $classroom->educationLevel?->name ? $classroom->educationLevel->name . ' - ' . $classroom->name : $classroom->name,
                    'veli_ad_soyad' => $veliAdSoyad,
                    'dogum_tarihi' => $student->birth_date,
                    'veli_iletisim' => $veliIletisim,
                    'durum' => 'aktif',
                ]);

                $added++;
            }

            $message = "{$added} öğrenci başarıyla kaydedildi.";
            if ($skipped > 0) {
                $message .= " {$skipped} öğrenci zaten kayıtlı olduğu için atlandı.";
            }

            return $this->success([
                'added' => $added,
                'skipped' => $skipped,
                'total' => $students->count()
            ], $message);
        } catch (\Exception $e) {
            return $this->error('Sınıf kaydı işlemi sırasında bir hata oluştu: ' . $e->getMessage(), [], 500);
        }
    }

    /**
     * Register selected students for scholarship.
     */
    public function registerSelectedStudents(Request $request): JsonResponse
    {
        try {
            $user = $request->user();
            $tenantId = $user->tenant_id;

            $validator = Validator::make($request->all(), [
                'student_ids' => 'required|array',
                'student_ids.*' => 'integer|exists:students,id',
            ]);

            if ($validator->fails()) {
                return $this->error('Validasyon hatası.', $validator->errors(), 422);
            }

            $studentIds = $request->student_ids;
            $students = Student::whereIn('id', $studentIds)
                ->with(['classroom.educationLevel', 'guardians'])
                ->get();

            if ($students->isEmpty()) {
                return $this->error('Seçilen öğrenciler bulunamadı.', [], 422);
            }

            // Okul adını al
            $okulAdi = $user->tenant?->name ?? 'Okul';

            // Zaten kayıtlı öğrencileri kontrol et
            $registeredStudentIds = Scholarship::where('tenant_id', $tenantId)
                ->whereIn('student_id', $studentIds)
                ->where('durum', 'aktif')
                ->pluck('student_id')
                ->toArray();

            $added = 0;
            $skipped = 0;

            foreach ($students as $student) {
                if (in_array($student->id, $registeredStudentIds)) {
                    $skipped++;
                    continue;
                }

                $guardian = null;
                try {
                    if ($student->relationLoaded('guardians')) {
                        $guardian = $student->guardians
                            ->sortByDesc(fn ($g) => (int) ($g->pivot->is_legal_guardian ?? 0))
                            ->first();
                    }
                } catch (\Throwable $e) {
                    $guardian = null;
                }

                $emergency = is_array($student->emergency_contact_info) ? $student->emergency_contact_info : [];
                $veliAdSoyad = $guardian?->name ?? ($emergency['name'] ?? '');
                $veliIletisim = $guardian?->phone ?? ($emergency['phone'] ?? ($student->phone ?? ''));

                $classroomName = $student->classroom?->educationLevel?->name
                    ? $student->classroom->educationLevel->name . ' - ' . $student->classroom->name
                    : ($student->classroom?->name ?? null);

                Scholarship::create([
                    'tenant_id' => $tenantId,
                    'student_id' => $student->id,
                    'tc_kimlik' => $student->tc_no ?? '',
                    'ad_soyad' => $student->name ?? '',
                    'okul_adi' => $okulAdi,
                    'classroom_id' => $student->classroom_id,
                    'sinif_adi' => $classroomName,
                    'veli_ad_soyad' => $veliAdSoyad,
                    'dogum_tarihi' => $student->birth_date,
                    'veli_iletisim' => $veliIletisim,
                    'durum' => 'aktif',
                ]);

                $added++;
            }

            $message = "{$added} öğrenci başarıyla kaydedildi.";
            if ($skipped > 0) {
                $message .= " {$skipped} öğrenci zaten kayıtlı olduğu için atlandı.";
            }

            return $this->success([
                'added' => $added,
                'skipped' => $skipped,
                'total' => $students->count()
            ], $message);
        } catch (\Exception $e) {
            return $this->error('Seçili öğrenciler kaydı sırasında bir hata oluştu: ' . $e->getMessage(), [], 500);
        }
    }

    /**
     * Get scholarship statistics.
     */
    public function statistics(Request $request): JsonResponse
    {
        try {
            $user = $request->user();
            $tenantId = $user->tenant_id;

            // Toplam kayıt sayısı
            $totalActive = Scholarship::where('tenant_id', $tenantId)
                ->where('durum', 'aktif')
                ->count();

            $totalArchived = Scholarship::where('tenant_id', $tenantId)
                ->where('durum', 'pasif')
                ->count();

            // Sınıf düzeyi istatistikleri (1-12)
            $classLevelStats = Scholarship::where('tenant_id', $tenantId)
                ->where('durum', 'aktif')
                ->whereNotNull('sinif_adi')
                ->selectRaw('sinif_adi, COUNT(*) as count')
                ->groupBy('sinif_adi')
                ->orderBy('sinif_adi')
                ->get();

            // Sınıf istatistikleri
            $classroomStats = Scholarship::where('tenant_id', $tenantId)
                ->where('durum', 'aktif')
                ->whereNotNull('classroom_id')
                ->with('classroom.educationLevel')
                ->selectRaw('classroom_id, COUNT(*) as count')
                ->groupBy('classroom_id')
                ->get()
                ->map(function ($stat) {
                    $classroomName = $stat->classroom?->educationLevel?->name
                        ? $stat->classroom->educationLevel->name . ' - ' . $stat->classroom->name
                        : ($stat->classroom?->name ?? 'Bilinmeyen Sınıf');
                    return [
                        'classroom_id' => $stat->classroom_id,
                        'classroom_name' => $classroomName,
                        'count' => $stat->count,
                    ];
                });

            return $this->success([
                'total_active' => $totalActive,
                'total_archived' => $totalArchived,
                'class_level_stats' => $classLevelStats,
                'classroom_stats' => $classroomStats,
            ], 'İstatistikler başarıyla getirildi.');
        } catch (\Exception $e) {
            return $this->error('İstatistikler getirilirken bir hata oluştu: ' . $e->getMessage(), [], 500);
        }
    }
}
