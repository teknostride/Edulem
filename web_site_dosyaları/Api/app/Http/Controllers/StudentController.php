<?php

namespace App\Http\Controllers;

use App\Actions\CreateStudentAction;
use App\Http\Requests\StoreStudentRequest;
use App\Http\Resources\StudentResource;
use App\Models\Campus;
use App\Models\City;
use App\Models\Classroom;
use App\Models\District;
use App\Models\EducationLevel;
use App\Models\OmrResult;
use App\Models\Schedule;
use App\Models\Student;
use App\Models\Tenant;
use App\Scopes\SeasonScope;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Gate;
use Illuminate\Support\Facades\Hash;
use PhpOffice\PhpSpreadsheet\Cell\Coordinate;
use PhpOffice\PhpSpreadsheet\IOFactory;
use PhpOffice\PhpSpreadsheet\Spreadsheet;
use PhpOffice\PhpSpreadsheet\Style\Alignment;
use PhpOffice\PhpSpreadsheet\Style\Border;
use PhpOffice\PhpSpreadsheet\Style\Fill;
use PhpOffice\PhpSpreadsheet\Worksheet\Worksheet;
use PhpOffice\PhpSpreadsheet\Writer\Xlsx;
use Symfony\Component\HttpFoundation\StreamedResponse;
use Barryvdh\DomPDF\Facade\Pdf;

class StudentController extends ApiController
{
    private const TEACHER_ROLES = ['Öğretmen', 'Sınıf Öğretmeni', 'teacher', 'Rehberlik', 'guidance', 'Rehber Öğretmen', 'rehber_teacher', 'guidance_teacher'];
    private const GUIDANCE_ROLE_IDS = [6];

    private function isTeacherRole(?string $roleName): bool
    {
        return $roleName && in_array($roleName, self::TEACHER_ROLES, true);
    }

    /**
     * Anlık TC Kimlik No doğrulama endpoint'i.
     * Request body:
     *   - tc_no: string (öğrenci TC)
     *   - guardians: [{tc_no: string}] (veli TC'leri, opsiyonel)
     */
    public function validateTc(Request $request): JsonResponse
    {
        $rule = new \App\Rules\ValidTcKimlikNo();
        $results = [];

        // Öğrenci TC
        $studentTc = preg_replace('/\D/', '', (string) $request->input('tc_no', ''));
        if ($studentTc !== '') {
            if (strlen($studentTc) !== 11) {
                $results['student'] = 'TC Kimlik No 11 haneli olmalıdır.';
            } elseif (!$rule->isValidTcKimlikNo($studentTc)) {
                $results['student'] = 'Geçersiz TC Kimlik No (algoritma hatası).';
            } else {
                $results['student'] = null; // geçerli
            }
        }

        // Veli TC'leri
        $guardians = $request->input('guardians', []);
        foreach ($guardians as $i => $guardian) {
            $gTc = preg_replace('/\D/', '', (string) ($guardian['tc_no'] ?? ''));
            if ($gTc === '') continue;
            if (strlen($gTc) !== 11) {
                $results["guardian_{$i}"] = 'Veli TC Kimlik No 11 haneli olmalıdır.';
            } elseif (!$rule->isValidTcKimlikNo($gTc)) {
                $results["guardian_{$i}"] = 'Geçersiz Veli TC Kimlik No (algoritma hatası).';
            } else {
                $results["guardian_{$i}"] = null; // geçerli
            }
        }

        $hasError = !empty(array_filter($results, fn ($v) => $v !== null));

        return $this->success([
            'valid'   => !$hasError,
            'results' => $results,
        ], $hasError ? 'Bazı TC Kimlik No\'lar geçersiz.' : 'Tüm TC Kimlik No\'lar geçerli.');
    }

    public function deleteAll(Request $request): JsonResponse
    {
        $user = $request->user();
        if (! $user) {
            return $this->error('Kullanıcı giriş yapmamış.', [], 401);
        }

        if (! $user->hasPermission('students.delete') && ! ($user->is_superadmin || ($user->role && $user->role->name === 'owner'))) {
            return $this->error('Bu işlem için yetkiniz bulunmamaktadır.', [], 403);
        }

        $deleteEmptyClassrooms = (bool) $request->boolean('delete_empty_classrooms', false);

        $query = Student::query()->where('tenant_id', $user->tenant_id);

        // Optional filters so user can delete scoped list if needed
        $campusId = $request->input('campus_id');
        if ($campusId !== null && $campusId !== '') {
            $campusId = (int) $campusId;
            $query->whereHas('classroom.educationLevel', function ($q) use ($campusId) {
                $q->where('campus_id', $campusId);
            });
        }

        $educationLevelId = $request->input('education_level_id');
        if ($educationLevelId !== null && $educationLevelId !== '') {
            $educationLevelCode = EducationLevel::query()
                ->whereKey((int) $educationLevelId)
                ->value('code');

            $query->where(function ($q) use ($educationLevelId, $educationLevelCode) {
                $q->whereHas('classroom', function ($q2) use ($educationLevelId) {
                    $q2->where(function ($sq) use ($educationLevelId) {
                        $sq->where('education_level_id', $educationLevelId)
                            ->orWhere('grade_level', $educationLevelId);
                    });
                })->orWhereHas('classroom.branch', function ($qBranch) use ($educationLevelId) {
                    $qBranch->where('education_level_id', $educationLevelId);
                });

                if ($educationLevelCode !== null && $educationLevelCode !== '') {
                    $q->orWhereHas('classroom', function ($q2) use ($educationLevelCode) {
                        $q2->where('grade_level', $educationLevelCode);
                    });
                }
            });
        }

        $classroomId = $request->input('classroom_id');
        if ($classroomId !== null && $classroomId !== '') {
            $query->where('classroom_id', (int) $classroomId);
        }

        $classIds = $request->input('classroom_ids') ?? $request->input('class_ids');
        if ($classIds !== null) {
            if (is_string($classIds)) {
                $classIds = array_filter(array_map('trim', explode(',', $classIds)));
            }
            if (is_array($classIds)) {
                $classIds = array_filter(array_map('intval', $classIds), static fn ($id) => $id > 0);
                if (! empty($classIds)) {
                    $query->whereIn('classroom_id', $classIds);
                }
            }
        }

        $isActive = $request->input('is_active');
        if ($isActive !== null && $isActive !== '') {
            $isActiveBool = in_array($isActive, ['1', 1, true, 'true'], true);
            $query->where('is_active', $isActiveBool);
        }

        $search = $request->input('search');
        if ($search !== null) {
            $search = trim((string) $search);
            if ($search !== '') {
                $query->where(function ($q) use ($search) {
                    $q->where('name', 'like', '%' . $search . '%')
                        ->orWhere('tc_no', 'like', '%' . $search . '%')
                        ->orWhere('school_no', 'like', '%' . $search . '%')
                        ->orWhereHas('classroom', function ($q2) use ($search) {
                            $q2->where('name', 'like', '%' . $search . '%');
                        });
                });
            }
        }

        $classroomIds = (clone $query)->pluck('classroom_id')->filter()->unique()->values()->all();

        $deleted = $query->delete();

        if ($deleteEmptyClassrooms && ! empty($classroomIds)) {
            Classroom::query()
                ->where('tenant_id', $user->tenant_id)
                ->whereIn('id', $classroomIds)
                ->whereDoesntHave('students')
                ->delete();
        }

        return $this->success([
            'deleted' => $deleted,
        ], 'Öğrenciler silindi.');
    }

    private function normalizeImportClassroomName(string $name): string
    {
        $name = mb_strtolower(trim($name));
        $name = str_replace([' ', '\t', '\n', '\r'], '', $name);
        // Treat common separators as equivalent
        $name = str_replace(['/', '_'], '-', $name);
        $name = preg_replace('/-+/', '-', $name) ?? $name;
        return trim($name, '-');
    }

    private function normalizeImportHeader(string $header): string
    {
        $header = mb_strtolower(trim($header));
        // Remove Unicode combining marks (e.g. dotted i: "i̇")
        $header = preg_replace('/\p{Mn}/u', '', $header) ?? $header;
        $header = str_replace([' ', '\t', '\n', '\r'], '', $header);
        $header = str_replace(['ı', 'İ'], 'i', $header);
        $header = str_replace(['ç', 'Ç'], 'c', $header);
        $header = str_replace(['ğ', 'Ğ'], 'g', $header);
        $header = str_replace(['ö', 'Ö'], 'o', $header);
        $header = str_replace(['ş', 'Ş'], 's', $header);
        $header = str_replace(['ü', 'Ü'], 'u', $header);
        $header = str_replace(['/', '\\', '-', '.'], '_', $header);
        $header = preg_replace('/_+/', '_', $header) ?? $header;
        return trim($header, '_');
    }

    private function mapImportHeaderToKey(string $header): string
    {
        $h = $this->normalizeImportHeader($header);
        $alias = [
            // Student
            'adsoyad' => 'student_name',
            'ogrenciadi' => 'student_name',
            'ogrenci_ad_soyad' => 'student_name',
            'ogrenciadsoyad' => 'student_name',
            'student_name' => 'student_name',
            'isim' => 'student_name',
            'name' => 'student_name',

            'okulno' => 'school_no',
            'okul_no' => 'school_no',
            'ogrencino' => 'school_no',
            'ogrenci_no' => 'school_no',
            'school_no' => 'school_no',

            'kampus' => 'campus_name',
            'kampus_adi' => 'campus_name',
            'campus' => 'campus_name',
            'campus_name' => 'campus_name',

            'kademe' => 'education_level_name',
            'kademe_adi' => 'education_level_name',
            'education_level' => 'education_level_name',
            'education_level_name' => 'education_level_name',

            'sinif' => 'classroom_name',
            'sinif_adi' => 'classroom_name',
            'classroom' => 'classroom_name',
            'classroom_name' => 'classroom_name',

            'tc' => 'tc_no',
            'ogrencitc' => 'tc_no',
            'ogrenci_tc' => 'tc_no',
            'tckimlik' => 'tc_no',
            'tckimlikno' => 'tc_no',
            'tc_no' => 'tc_no',

            'dogumtarihi' => 'birth_date',
            'dogum_tarihi' => 'birth_date',
            'birth_date' => 'birth_date',

            'cinsiyet' => 'gender',
            'gender' => 'gender',

            'telefon' => 'phone',
            'phone' => 'phone',
            'eposta' => 'email',
            'e_posta' => 'email',
            'email' => 'email',
            'adres' => 'address',
            'address' => 'address',
            'il' => 'city',
            'sehir' => 'city',
            'city' => 'city',
            'ilce' => 'district',
            'district' => 'district',

            // Guardian 1 (Anne / Veli 1)
            'anne_eposta' => 'guardian1_email',
            'annee_posta' => 'guardian1_email',
            'anne_email' => 'guardian1_email',
            'anne_tc' => 'guardian1_tc_no',
            'annetc' => 'guardian1_tc_no',
            'anne_tc_no' => 'guardian1_tc_no',
            'anne_ad_soyad' => 'guardian1_name',
            'anneadsoyad' => 'guardian1_name',
            'anne_adi' => 'guardian1_name',
            'anne_telefon' => 'guardian1_phone',
            'annetelefon' => 'guardian1_phone',
            'anne_meslek' => 'guardian1_job',
            'annemeslek' => 'guardian1_job',
            'anne_yasal_vasi' => 'guardian1_is_legal_guardian',
            'anneyasalvasi' => 'guardian1_is_legal_guardian',
            'veli1_eposta' => 'guardian1_email',
            'veli1e_posta' => 'guardian1_email',
            'veli1_email' => 'guardian1_email',
            'guardian1_email' => 'guardian1_email',
            'veli1_tc' => 'guardian1_tc_no',
            'veli1tc' => 'guardian1_tc_no',
            'veli1_tc_no' => 'guardian1_tc_no',
            'guardian1_tc_no' => 'guardian1_tc_no',
            'veli1_ad_soyad' => 'guardian1_name',
            'veli1adsoyad' => 'guardian1_name',
            'veli1_adi' => 'guardian1_name',
            'guardian1_name' => 'guardian1_name',
            'veli1_telefon' => 'guardian1_phone',
            'veli1telefon' => 'guardian1_phone',
            'guardian1_phone' => 'guardian1_phone',
            'veli1_meslek' => 'guardian1_job',
            'veli1meslek' => 'guardian1_job',
            'guardian1_job' => 'guardian1_job',
            'veli1_yakinlik' => 'guardian1_relation_type',
            'veli1yakinlik' => 'guardian1_relation_type',
            'guardian1_relation_type' => 'guardian1_relation_type',
            'veli1_yasal_vasi' => 'guardian1_is_legal_guardian',
            'veli1yasalvasi' => 'guardian1_is_legal_guardian',
            'guardian1_is_legal_guardian' => 'guardian1_is_legal_guardian',

            // Guardian 2 (Baba / Veli 2)
            'baba_eposta' => 'guardian2_email',
            'babae_posta' => 'guardian2_email',
            'baba_email' => 'guardian2_email',
            'baba_tc' => 'guardian2_tc_no',
            'babatc' => 'guardian2_tc_no',
            'baba_tc_no' => 'guardian2_tc_no',
            'baba_ad_soyad' => 'guardian2_name',
            'babaadsoyad' => 'guardian2_name',
            'baba_adi' => 'guardian2_name',
            'baba_telefon' => 'guardian2_phone',
            'babatelefon' => 'guardian2_phone',
            'baba_meslek' => 'guardian2_job',
            'babameslek' => 'guardian2_job',
            'baba_yasal_vasi' => 'guardian2_is_legal_guardian',
            'babayasalvasi' => 'guardian2_is_legal_guardian',
            'veli2_eposta' => 'guardian2_email',
            'veli2e_posta' => 'guardian2_email',
            'veli2_email' => 'guardian2_email',
            'guardian2_email' => 'guardian2_email',
            'veli2_tc' => 'guardian2_tc_no',
            'veli2tc' => 'guardian2_tc_no',
            'veli2_tc_no' => 'guardian2_tc_no',
            'guardian2_tc_no' => 'guardian2_tc_no',
            'veli2_ad_soyad' => 'guardian2_name',
            'veli2adsoyad' => 'guardian2_name',
            'veli2_adi' => 'guardian2_name',
            'guardian2_name' => 'guardian2_name',
            'veli2_telefon' => 'guardian2_phone',
            'veli2telefon' => 'guardian2_phone',
            'guardian2_phone' => 'guardian2_phone',
            'veli2_meslek' => 'guardian2_job',
            'veli2meslek' => 'guardian2_job',
            'guardian2_job' => 'guardian2_job',
            'veli2_yakinlik' => 'guardian2_relation_type',
            'veli2yakinlik' => 'guardian2_relation_type',
            'guardian2_relation_type' => 'guardian2_relation_type',
            'veli2_yasal_vasi' => 'guardian2_is_legal_guardian',
            'veli2yasalvasi' => 'guardian2_is_legal_guardian',
            'guardian2_is_legal_guardian' => 'guardian2_is_legal_guardian',

            // Emergency
            'acil_kisi_adi' => 'emergency_name',
            'acil_ad_soyad' => 'emergency_name',
            'acilkisiadsoyad' => 'emergency_name',
            'acil_durum_kisi' => 'emergency_name',
            'acildurumkisi' => 'emergency_name',
            'acil_durum_kisi_adi' => 'emergency_name',
            'acildurumkisiadi' => 'emergency_name',
            'acil_durum_ad_soyad' => 'emergency_name',
            'acildurumadsoyad' => 'emergency_name',
            'acil_durum_kisi_ad_soyad' => 'emergency_name',
            'acildurumkisiadsoyad' => 'emergency_name',
            'emergency_name' => 'emergency_name',
            'acil_telefon' => 'emergency_phone',
            'aciltelefon' => 'emergency_phone',
            'acil_durum_telefon' => 'emergency_phone',
            'acildurumtelefon' => 'emergency_phone',
            'acil_durum_tel' => 'emergency_phone',
            'acildurumtel' => 'emergency_phone',
            'acil_durum_numara' => 'emergency_phone',
            'acildurumnumara' => 'emergency_phone',
            'emergency_phone' => 'emergency_phone',
            'acil_yakinlik' => 'emergency_relation',
            'acilyakinlik' => 'emergency_relation',
            'acil_durum_yakinlik' => 'emergency_relation',
            'acildurumyakinlik' => 'emergency_relation',
            'acil_durum_yakinligi' => 'emergency_relation',
            'acildurumyakinligi' => 'emergency_relation',
            'acil_durum_iliski' => 'emergency_relation',
            'acildurumiliski' => 'emergency_relation',
            'acil_durum_iliskisi' => 'emergency_relation',
            'acildurumiliskisi' => 'emergency_relation',
            'emergency_relation' => 'emergency_relation',
        ];

        return $alias[$h] ?? $h;
    }

    private function normalizeExcelDigits($value): string
    {
        if ($value === null) {
            return '';
        }

        if (is_int($value)) {
            return (string) $value;
        }

        if (is_float($value)) {
            return number_format($value, 0, '', '');
        }

        $raw = trim((string) $value);
        if ($raw === '') {
            return '';
        }

        // PhpSpreadsheet may return scientific notation for numeric cells
        if (preg_match('/e\+?/i', $raw) || str_contains($raw, '.')) {
            if (is_numeric($raw)) {
                return number_format((float) $raw, 0, '', '');
            }
        }

        return $raw;
    }

    private function normalizePlaceName(string $value): string
    {
        $value = mb_strtolower(trim($value));
        $value = preg_replace('/\p{Mn}/u', '', $value) ?? $value;
        $value = str_replace(['ı', 'İ'], 'i', $value);
        $value = str_replace(['ç', 'Ç'], 'c', $value);
        $value = str_replace(['ğ', 'Ğ'], 'g', $value);
        $value = str_replace(['ö', 'Ö'], 'o', $value);
        $value = str_replace(['ş', 'Ş'], 's', $value);
        $value = str_replace(['ü', 'Ü'], 'u', $value);
        $value = str_replace(["\u{00A0}", ' '], '', $value);
        $value = str_replace(['-', '_', '.', ','], '', $value);
        return $value;
    }

    private function isGuidanceRole($user): bool
    {
        if ($user && !empty($user->role_id) && in_array((int) $user->role_id, self::GUIDANCE_ROLE_IDS, true)) {
            return true;
        }

        $roleName = $user && $user->role ? $user->role->name : null;
        return $roleName && in_array($roleName, ['Rehberlik', 'guidance', 'Rehber Öğretmen', 'rehber_teacher', 'guidance_teacher'], true);
    }

    private function teacherAllowedClassroomIds($user): array
    {
        if ($this->isGuidanceRole($user)) {
            $campusIds = array_filter(array_map('intval', (array) ($user->campus_ids ?? [])));
            $educationLevelIds = array_filter(array_map('intval', (array) ($user->education_level_ids ?? [])));

            if (empty($campusIds) && empty($educationLevelIds)) {
                return Classroom::query()
                    ->where('tenant_id', $user->tenant_id)
                    ->pluck('id')
                    ->map(fn ($id) => (int) $id)
                    ->toArray();
            }

            $query = Classroom::query()->where('tenant_id', $user->tenant_id);

            if (!empty($educationLevelIds)) {
                $query->whereIn('grade_level', $educationLevelIds);
            }

            if (!empty($campusIds)) {
                $query->whereHas('educationLevel', function ($q) use ($campusIds) {
                    $q->whereIn('campus_id', $campusIds);
                });
            }

            return $query
                ->pluck('id')
                ->map(fn ($id) => (int) $id)
                ->filter(fn ($id) => $id > 0)
                ->unique()
                ->values()
                ->all();
        }

        return Schedule::query()
            ->where('tenant_id', $user->tenant_id)
            ->where(function ($q) use ($user) {
                $teacherId = (int) $user->id;
                $q->where('teacher_id', $teacherId)
                  ->orWhereJsonContains('assistant_teacher_ids', $teacherId)
                  ->orWhereJsonContains('assistant_teacher_ids', (string) $teacherId)
                  ->orWhereRaw("FIND_IN_SET(?, REPLACE(REPLACE(REPLACE(COALESCE(assistant_teacher_ids, ''), '[', ''), ']', ''), '\"', ''))", [$teacherId]);
            })
            ->whereNotNull('classroom_id')
            ->pluck('classroom_id')
            ->map(fn ($id) => (int) $id)
            ->filter(fn ($id) => $id > 0)
            ->unique()
            ->values()
            ->all();
    }

    private function teacherCannotAccessStudent(Student $student): bool
    {
        $user = auth()->user();
        $roleName = $user && $user->role ? $user->role->name : null;
        if (! $user || ! $this->isTeacherRole($roleName) || $this->isGuidanceRole($user)) {
            return false;
        }

        $allowedClassroomIds = $this->teacherAllowedClassroomIds($user);
        return ! in_array((int) $student->classroom_id, $allowedClassroomIds, true);
    }

    private function teacherCannotAccessClassroom(int $classroomId): bool
    {
        $user = auth()->user();
        $roleName = $user && $user->role ? $user->role->name : null;
        if (! $user || ! $this->isTeacherRole($roleName) || $this->isGuidanceRole($user)) {
            return false;
        }

        $allowedClassroomIds = $this->teacherAllowedClassroomIds($user);
        return ! in_array($classroomId, $allowedClassroomIds, true);
    }
    public function bulkCopyFromSeason(Request $request): JsonResponse
    {
        $user = $request->user();
        $studentIds = $request->input('student_ids', []);
        $sourceSeasonId = $request->input('source_season_id');

        if (empty($studentIds) || !$sourceSeasonId) {
            return $this->error('Öğrenci listesi ve kaynak sezon zorunludur.', [], 422);
        }

        // Aktif veya yapılandırma sezonunu bul
        $targetSeasonId = $this->getCurrentSeasonId();

        if (!$targetSeasonId) {
            return $this->error('Aktif bir sezon bulunamadı.', [], 422);
        }

        if ((int)$sourceSeasonId === (int)$targetSeasonId) {
            return $this->error('Aynı sezon içerisinden kopyalama yapılamaz.', [], 422);
        }
        $students = Student::withoutGlobalScope(SeasonScope::class)
            ->whereIn('id', $studentIds)
            ->where('season_id', $sourceSeasonId)
            ->where('tenant_id', $user->tenant_id)
            ->with(['guardians'])
            ->get();

        // Hedef sezonun kademelerini toplu olarak yükle
        $targetLevels = EducationLevel::withoutGlobalScope(SeasonScope::class)
            ->where('season_id', $targetSeasonId)
            ->orderBy('sort_order', 'asc')
            ->get();

        // N+1 önleme: Kaynak sınıfları tek sorguda yükle
        $sourceClassroomIds = $students->pluck('classroom_id')->filter()->unique()->values();
        $sourceClassrooms = Classroom::withoutGlobalScope(SeasonScope::class)
            ->whereIn('id', $sourceClassroomIds)
            ->get()
            ->keyBy('id');

        // N+1 önleme: Kaynak kademeleri tek sorguda yükle
        $sourceEduLevelIds = $students->pluck('education_level_id')->filter()->unique()->values();
        $sourceEduLevels = EducationLevel::withoutGlobalScope(SeasonScope::class)
            ->whereIn('id', $sourceEduLevelIds)
            ->get()
            ->keyBy('id');

        // N+1 önleme: Hedef sezondaki tüm sınıfları tek sorguda yükle
        $targetClassrooms = Classroom::withoutGlobalScope(SeasonScope::class)
            ->where('season_id', $targetSeasonId)
            ->get();
        $targetClassroomsByName = $targetClassrooms->groupBy(fn($c) => mb_strtolower(trim($c->name)));
        $targetClassroomsByLevelAndName = $targetClassrooms->groupBy(fn($c) => $c->education_level_id . '|' . mb_strtolower(trim($c->name)));

        // Hedef sezondaki mevcut TC numaralarını önceden çek (N+1 önleme)
        $existingTcNos = Student::where('season_id', $targetSeasonId)
            ->whereNotNull('tc_no')->where('tc_no', '!=', '')
            ->pluck('tc_no')->flip();

        // Hedef sezondaki mevcut okul numaralarını önceden çek (tekrar önleme)
        $existingSchoolNos = Student::where('season_id', $targetSeasonId)
            ->whereNotNull('school_no')->where('school_no', '!=', '')
            ->pluck('school_no')->flip();

        $count = 0;
        $skipped = 0;
        $upgradeGrade = $request->boolean('upgrade_grade');

        foreach ($students as $student) {
            // TC No çakışması varsa atlamak yerine okul numarasına "-1" ekleyerek ekle
            $isDuplicate = $student->tc_no && isset($existingTcNos[$student->tc_no]);

            $newStudent = $student->replicate(['id', 'classroom_id', 'education_level_id', 'season_id', 'created_at', 'updated_at']);
            $newStudent->season_id = $targetSeasonId;

            // Okul numarası çakışması çözümü: -1, -2 ... ekleyerek benzersiz hale getir
            if ($isDuplicate || ($student->school_no && isset($existingSchoolNos[$student->school_no]))) {
                $baseSchoolNo = $student->school_no ?: '';
                $suffix = 1;
                do {
                    $candidate = $baseSchoolNo . '-' . $suffix;
                    $suffix++;
                } while (isset($existingSchoolNos[$candidate]));
                $newStudent->school_no = $candidate;
                // Yeni okul no'yu da sete ekle (aynı döngüde tekrar çakışmasın)
                $existingSchoolNos[$candidate] = true;
            }

            // Kaynak kademeyi önceden yüklenmiş koleksiyondan al
            $sourceLevel = $sourceEduLevels->get($student->education_level_id);
            $sourceLevelName = $sourceLevel ? $sourceLevel->name : null;

            if ($upgradeGrade) {
                $currentTargetLevel = $targetLevels->first(fn($l) => $sourceLevelName && $l->name === $sourceLevelName);
                $nextLevel = null;
                if ($currentTargetLevel) {
                    $currentIndex = $targetLevels->search(fn($l) => $l->id === $currentTargetLevel->id);
                    $nextLevel = $targetLevels->get($currentIndex + 1) ?? $currentTargetLevel;
                } else {
                    $nextLevel = $targetLevels->first();
                }
                $newStudent->education_level_id = $nextLevel ? $nextLevel->id : null;

                if ($student->classroom_id) {
                    $oldClass = $sourceClassrooms->get($student->classroom_id);
                    if ($oldClass) {
                        $oldName = $oldClass->name;
                        $newName = $oldName;

                        if (preg_match('/(\d+)/', $oldName, $matches)) {
                            $number = (int)$matches[1];
                            if ($number >= 12) {
                                $newStudent->classroom_id = null;
                                $newStudent->save();
                                $count++;
                                continue;
                            }
                            $newName = str_replace((string)$number, (string)($number + 1), $oldName);
                        } elseif (stripos($oldName, 'Ana') !== false) {
                            $newName = str_ireplace('Ana', '1-', $oldName);
                            $newName = str_replace('1- ', '1-', $newName);
                        }

                        $normNewName = mb_strtolower(trim($newName));
                        $key = $newStudent->education_level_id . '|' . $normNewName;
                        $matchingClass = $targetClassroomsByLevelAndName->get($key)?->first();
                        if ($matchingClass) {
                            $newStudent->classroom_id = $matchingClass->id;
                        } else {
                            $anyMatchingClass = $targetClassroomsByName->get($normNewName)?->first();
                            if ($anyMatchingClass) {
                                $newStudent->classroom_id = $anyMatchingClass->id;
                                if ($anyMatchingClass->education_level_id) {
                                    $newStudent->education_level_id = $anyMatchingClass->education_level_id;
                                }
                            } else {
                                $newStudent->classroom_id = null;
                            }
                        }
                    }
                }
            } else {
                $matchingLevel = $targetLevels->first(fn($l) => $sourceLevelName && $l->name === $sourceLevelName);
                $newStudent->education_level_id = $matchingLevel ? $matchingLevel->id : ($targetLevels->first()?->id ?? null);

                if ($student->classroom_id) {
                    $oldClass = $sourceClassrooms->get($student->classroom_id);
                    if ($oldClass) {
                        $normOldName = mb_strtolower(trim($oldClass->name));
                        $key = $newStudent->education_level_id . '|' . $normOldName;
                        $targetClass = $targetClassroomsByLevelAndName->get($key)?->first()
                            ?? $targetClassroomsByName->get($normOldName)?->first();
                        $newStudent->classroom_id = $targetClass?->id;
                    }
                }
            }

            $newStudent->save();

            // Velileri kopyala
            foreach ($student->guardians as $guardian) {
                $newStudent->guardians()->attach($guardian->id, [
                    'relation_type' => $guardian->pivot->relation_type ?? 'other',
                    'is_legal_guardian' => $guardian->pivot->is_legal_guardian ?? false,
                ]);
            }

            $count++;
        }

        return $this->success([
            'transferred' => $count,
        ], "{$count} öğrenci başarıyla yeni sezona aktarıldı.");
    }

    /**
     * Display a listing of students.
     *
     * @return JsonResponse
     */
    public function index(): JsonResponse
    {
        try {
            $user = auth()->user();
            $userTenantId = $user ? $user->tenant_id : null;
            $isSuperAdmin = $user && $user->is_superadmin;
            $roleName = $user && $user->role ? $user->role->name : null;

            $query = $this->buildIndexBaseQuery($userTenantId, (bool) $isSuperAdmin);
            $this->applyIndexRoleRestrictions($query, $user, $roleName);
            $this->applyIndexFilters($query);
            $this->applyIndexSorting($query);

            $isAll = request()->boolean('all') || request()->get('per_page') === 'all';
            $perPage = (int) request()->get('per_page', 30);
            if ($isAll) {
                $perPage = 5000;
            } elseif ($perPage <= 0) {
                $perPage = 30;
            } else {
                $perPage = min($perPage, 5000);
            }
            $students = $query->paginate($perPage);

            return $this->success([
                'students' => StudentResource::collection($students),
                'pagination' => [
                    'current_page' => $students->currentPage(),
                    'last_page' => $students->lastPage(),
                    'per_page' => $students->perPage(),
                    'total' => $students->total(),
                ],
            ], 'Öğrenciler başarıyla listelendi.');
        } catch (\Exception $e) {
            return $this->error('Öğrenciler listelenirken bir hata oluştu: ' . $e->getMessage(), [], 500);
        }
    }

    private function buildIndexBaseQuery(?int $userTenantId, bool $isSuperAdmin): \Illuminate\Database\Eloquent\Builder
    {
        $query = Student::query();

        $query->with([
            'city',
            'district',
            'guardians',
            'educationLevel',
            'classroom' => function ($q) {
                $q->withoutGlobalScope(SeasonScope::class)->with([
                    'branch' => function ($q2) {
                        $q2->with('campus');
                    },
                    'campus',
                    'educationLevel' => function ($q2) {
                        $q2->with('campus');
                    },
                ]);
            }
        ]);

        $query
            ->leftJoin('classrooms as c', 'students.classroom_id', '=', 'c.id')
            ->leftJoin('branches as b', 'c.branch_id', '=', 'b.id')
            ->leftJoin('education_levels as cel', function ($join) {
                $join->on('c.grade_level', '=', 'cel.id')
                     ->orOn('c.education_level_id', '=', 'cel.id');
            })
            ->leftJoin('education_levels as sel', 'students.education_level_id', '=', 'sel.id');

        if (request()->has('season_id') && request('season_id')) {
            $query->withoutGlobalScope(SeasonScope::class)
                  ->where('students.season_id', request('season_id'));
        }

        if (! $isSuperAdmin && $userTenantId) {
            $query->where('students.tenant_id', $userTenantId);
        }

        $query->select('students.*')->distinct();

        return $query;
    }

    private function applyIndexRoleRestrictions(\Illuminate\Database\Eloquent\Builder $query, $user, ?string $roleName): void
    {
        if ($this->isTeacherRole($roleName) && ! $this->isGuidanceRole($user) && $user) {
            $allowedClassroomIds = $this->teacherAllowedClassroomIds($user);
            if (empty($allowedClassroomIds)) {
                $query->whereRaw('1 = 0');
            } else {
                $query->whereIn('students.classroom_id', $allowedClassroomIds);
            }
        }

        if (in_array($roleName, ['Müdür', 'Müdür Yardımcısı', 'Öğrenci İşleri', 'student_affairs', 'Rehberlik', 'guidance', 'Rehber Öğretmen', 'rehber_teacher', 'guidance_teacher'], true) && $user) {
            $campusIds = array_filter(array_map('intval', (array) ($user->campus_ids ?? [])));
            $educationLevelIds = array_filter(array_map('intval', (array) ($user->education_level_ids ?? [])));
            if (! empty($educationLevelIds)) {
                $query->where(function ($q) use ($educationLevelIds) {
                    $q->whereIn('students.education_level_id', $educationLevelIds)
                        ->orWhereIn('c.education_level_id', $educationLevelIds)
                        ->orWhereIn('b.education_level_id', $educationLevelIds)
                        ->orWhereIn('c.grade_level', array_map('strval', $educationLevelIds));
                });
            }

            if (! empty($campusIds)) {
                $userCampusLevelIds = EducationLevel::withoutGlobalScope(SeasonScope::class)
                    ->whereIn('campus_id', $campusIds)
                    ->pluck('id')
                    ->toArray();

                $query->where(function ($q) use ($campusIds, $userCampusLevelIds) {
                    $q->whereIn('cel.campus_id', $campusIds)
                        ->orWhereIn('sel.campus_id', $campusIds)
                        ->orWhereIn('b.campus_id', $campusIds)
                        ->orWhereIn('c.campus_id', $campusIds);

                    if (! empty($userCampusLevelIds)) {
                        $q->orWhereIn('students.education_level_id', $userCampusLevelIds)
                          ->orWhereIn('c.education_level_id', $userCampusLevelIds)
                          ->orWhereIn('c.grade_level', array_map('strval', $userCampusLevelIds));
                    }
                });
            }
        }
    }

    private function applyIndexFilters(\Illuminate\Database\Eloquent\Builder $query): void
    {
        $campusId = request()->input('campus_id');
        if ($campusId !== null && $campusId !== '') {
            $campusId = (int) $campusId;
            $campusLevelIds = EducationLevel::withoutGlobalScope(SeasonScope::class)
                ->where('campus_id', $campusId)
                ->pluck('id')
                ->toArray();

            $query->where(function ($q) use ($campusId, $campusLevelIds) {
                $q->where('cel.campus_id', $campusId)
                    ->orWhere('sel.campus_id', $campusId)
                    ->orWhere('b.campus_id', $campusId)
                    ->orWhere('c.campus_id', $campusId);

                if (! empty($campusLevelIds)) {
                    $q->orWhereIn('students.education_level_id', $campusLevelIds)
                      ->orWhereIn('c.education_level_id', $campusLevelIds)
                      ->orWhereIn('c.grade_level', array_map('strval', $campusLevelIds));
                }
            });
        }

        $educationLevelId = request()->input('education_level_id');
        if ($educationLevelId !== null && $educationLevelId !== '') {
            $educationLevelIdInt = (int) $educationLevelId;

            $selectedLevel = EducationLevel::withoutGlobalScope(SeasonScope::class)
                ->whereKey($educationLevelIdInt)
                ->first(['name', 'code']);

            $matchingLevelIds = collect([$educationLevelIdInt]);
            if ($selectedLevel) {
                $criteria = EducationLevel::withoutGlobalScope(SeasonScope::class)
                    ->where(function ($q) use ($selectedLevel) {
                        if ($selectedLevel->name) {
                            $q->where('name', $selectedLevel->name);
                        }
                        if ($selectedLevel->code) {
                            $q->orWhere('code', $selectedLevel->code);
                        }
                    })
                    ->pluck('id');
                $matchingLevelIds = $criteria->merge([$educationLevelIdInt])->unique();
            }

            $matchingLevelIdsArray = $matchingLevelIds->values()->all();
            $matchingLevelCodesArray = $selectedLevel && $selectedLevel->code
                ? [$selectedLevel->code, (string) $educationLevelIdInt]
                : [(string) $educationLevelIdInt];

            $query->where(function ($q) use ($matchingLevelIdsArray, $matchingLevelCodesArray) {
                $q->whereIn('students.education_level_id', $matchingLevelIdsArray)
                    ->orWhereIn('c.education_level_id', $matchingLevelIdsArray)
                    ->orWhereIn('b.education_level_id', $matchingLevelIdsArray)
                    ->orWhereIn('c.grade_level', $matchingLevelCodesArray);
            });
        }

        $classroomId = request()->input('classroom_id');
        if ($classroomId !== null && $classroomId !== '') {
            if (request()->has('season_id') && request('season_id')) {
                $classroomName = Classroom::withoutGlobalScope(SeasonScope::class)
                    ->where('id', (int) $classroomId)
                    ->value('name');
                
                if ($classroomName) {
                    $query->whereHas('classroom', function ($q) use ($classroomName) {
                        $q->withoutGlobalScope(SeasonScope::class)
                          ->where('name', $classroomName);
                    });
                }
            } else {
                $query->where('students.classroom_id', (int) $classroomId);
            }
        }

        $classIds = request()->input('classroom_ids') ?? request()->input('class_ids');
        if ($classIds !== null) {
            if (is_string($classIds)) {
                $classIds = array_filter(array_map('trim', explode(',', $classIds)));
            }

            if (is_array($classIds)) {
                $classIds = array_filter(array_map('intval', $classIds), static fn ($id) => $id > 0);
                if (! empty($classIds)) {
                    $query->whereIn('students.classroom_id', $classIds);
                }
            }
        }

        $isActive = request()->input('is_active');
        if ($isActive !== null && $isActive !== '') {
            $isActiveBool = in_array($isActive, ['1', 1, true, 'true'], true);
            $query->where('students.is_active', $isActiveBool);
        }

        $search = request()->input('search');
        if ($search !== null) {
            $search = trim((string) $search);
            if ($search !== '') {
                $query->where(function ($q) use ($search) {
                    $q->where('students.name', 'like', '%' . $search . '%')
                        ->orWhere('students.tc_no', 'like', '%' . $search . '%')
                        ->orWhere('students.school_no', 'like', '%' . $search . '%')
                        ->orWhere('c.name', 'like', '%' . $search . '%');
                });
            }
        }
    }

    private function applyIndexSorting(\Illuminate\Database\Eloquent\Builder $query): void
    {
        $sortBy = request()->input('sort_by');
        $sortDir = strtolower((string) request()->input('sort_dir', 'asc'));
        if (! in_array($sortDir, ['asc', 'desc'], true)) {
            $sortDir = 'asc';
        }
        $sortMap = [
            'name' => 'students.name',
            'student_name' => 'students.name',
            'school_no' => 'students.school_no',
            'birth_date' => 'students.birth_date',
            'classroom' => 'classrooms.name',
        ];
        $sortColumn = $sortMap['name'];
        if (is_string($sortBy) && array_key_exists($sortBy, $sortMap)) {
            $sortColumn = $sortMap[$sortBy];
        }
        if ($sortBy === 'school_no') {
            $query->orderByRaw(
                "CASE WHEN students.school_no REGEXP '^[0-9]+$' THEN 0 ELSE 1 END {$sortDir}, " .
                "CAST(students.school_no AS UNSIGNED) {$sortDir}, students.school_no {$sortDir}"
            );
        } elseif ($sortBy === 'classroom') {
            $dir = strtoupper($sortDir) === 'DESC' ? 'DESC' : 'ASC';
            $query->addSelect('c.name as classroom_sort_name')
                  ->orderBy('classroom_sort_name', $dir)
                  ->orderBy('students.name', 'asc');
        } else {
            $query->orderBy($sortColumn, $sortDir);
        }
    }

    public function downloadImportTemplate(Request $request): StreamedResponse|JsonResponse
    {
        $user = $request->user();
        if (! $user) {
            return $this->error('Kullanıcı giriş yapmamış.', [], 401);
        }

        if (! $user->hasPermission('students.create') && ! ($user->is_superadmin || ($user->role && $user->role->name === 'owner'))) {
            return $this->error('Bu işlem için yetkiniz bulunmamaktadır.', [], 403);
        }

        $spreadsheet = new Spreadsheet();
        $sheet = $spreadsheet->getActiveSheet();

        $headers = [
            'Öğrenci Ad Soyad',
            'Okul No',
            'Kampüs',
            'Kademe',
            'Sınıf',
            'Öğrenci TC',
            'Doğum Tarihi',
            'Cinsiyet',
            'Telefon',
            'E-posta',
            'Adres',
            'İl',
            'İlçe',
            'Veli 1 E-posta',
            'Veli 1 TC',
            'Veli 1 Ad Soyad',
            'Veli 1 Telefon',
            'Veli 1 Meslek',
            'Veli 1 Yakınlık',
            'Veli 1 Yasal Vasi',
            'Veli 2 E-posta',
            'Veli 2 TC',
            'Veli 2 Ad Soyad',
            'Veli 2 Telefon',
            'Veli 2 Meslek',
            'Veli 2 Yakınlık',
            'Veli 2 Yasal Vasi',
            'Acil Kişi Ad Soyad',
            'Acil Telefon',
            'Acil Yakınlık',
        ];

        $colIndex = 1;
        foreach ($headers as $h) {
            $cell = Coordinate::stringFromColumnIndex($colIndex) . '1';
            $sheet->setCellValue($cell, $h);
            $colIndex += 1;
        }

        $exampleRow = [
            'Ali Veli',
            '123',
            '',
            '',
            '5/A',
            '11111111110',
            '2012-01-01',
            'male',
            '',
            '',
            '',
            'İstanbul',
            'Kadıköy',
            '',
            '22222222220',
            'Veli 1',
            '5551112233',
            '',
            'mother',
            '1',
            '',
            '',
            '',
            '',
            '',
            '',
            '',
            '',
            '',
            '',
        ];

        $sheet->fromArray($exampleRow, null, 'A2');

        $lastCol = Coordinate::stringFromColumnIndex(count($headers));
        $sheet->getStyle('A1:' . $lastCol . '1')->applyFromArray([
            'font' => ['bold' => true, 'color' => ['rgb' => 'FFFFFF']],
            'fill' => ['fillType' => Fill::FILL_SOLID, 'startColor' => ['rgb' => '4472C4']],
            'alignment' => ['horizontal' => Alignment::HORIZONTAL_CENTER, 'vertical' => Alignment::VERTICAL_CENTER, 'wrapText' => true],
            'borders' => ['allBorders' => ['borderStyle' => Border::BORDER_THIN, 'color' => ['rgb' => 'D1D5DB']]],
        ]);

        foreach (range('A', $lastCol) as $col) {
            $sheet->getColumnDimension($col)->setAutoSize(true);
        }

        $fileName = 'ogrenci_toplu_ekleme_sablonu.xlsx';

        return response()->streamDownload(function () use ($spreadsheet) {
            $writer = new Xlsx($spreadsheet);
            $writer->save('php://output');
        }, $fileName, [
            'Content-Type' => 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        ]);
    }

    public function importFromTemplate(Request $request): JsonResponse
    {
        $user = $request->user();
        if (! $user) {
            return $this->error('Kullanıcı giriş yapmamış.', [], 401);
        }

        if (! $user->hasPermission('students.create') && ! ($user->is_superadmin || ($user->role && $user->role->name === 'owner'))) {
            return $this->error('Bu işlem için yetkiniz bulunmamaktadır.', [], 403);
        }

        if (! $request->hasFile('file')) {
            return $this->error('file zorunludur.', [], 422);
        }

        $file = $request->file('file');
        if (! $file || ! $file->isValid()) {
            return $this->error('Dosya yüklenemedi.', [], 422);
        }

        try {
            $spreadsheet = IOFactory::load($file->getRealPath());
            $worksheet = $spreadsheet->getActiveSheet();
            $rows = $worksheet->toArray();

            $headers = array_shift($rows);
            $headers = array_map(function ($h) {
                return $this->mapImportHeaderToKey((string) $h);
            }, is_array($headers) ? $headers : []);

            if (empty($headers)) {
                return $this->error('Şablon başlık satırı bulunamadı.', [], 422);
            }

            $lookup = $this->buildImportLookupMaps($user->tenant_id);
            $classroomMap = $lookup['classroomMap'];
            $cityMap = $lookup['cityMap'];
            $districtMapByCity = $lookup['districtMapByCity'];

            $existingTc = [];
            $existingSchoolNoByLevel = [];
            $existingStudents = Student::query()
                ->where('tenant_id', $user->tenant_id)
                ->get(['tc_no', 'school_no', 'education_level_id']);
            foreach ($existingStudents as $s) {
                $tc = isset($s->tc_no) ? preg_replace('/\D/', '', (string) $s->tc_no) : '';
                if ($tc !== '' && strlen($tc) === 11) {
                    $existingTc[$tc] = true;
                }
                $lvl = (int) ($s->education_level_id ?? 0);
                $sn = trim((string) ($s->school_no ?? ''));
                if ($lvl > 0 && $sn !== '') {
                    if (! isset($existingSchoolNoByLevel[$lvl])) {
                        $existingSchoolNoByLevel[$lvl] = [];
                    }
                    $existingSchoolNoByLevel[$lvl][$sn] = true;
                }
            }

            $imported = 0;
            $updated = 0;
            $errors = [];

            DB::beginTransaction();

            foreach ($rows as $index => $row) {
                $rowNumber = $index + 2;
                $rowData = $this->mapImportRowToStudentPayload(is_array($row) ? $row : [], $headers, $user->tenant_id, $classroomMap, $cityMap, $districtMapByCity);

                if (! empty($rowData['__skip'])) {
                    continue;
                }

                if (! empty($rowData['__error'])) {
                    $errors[] = 'Satır ' . $rowNumber . ': ' . $rowData['__error'];
                    continue;
                }

                $rowTc = isset($rowData['tc_no']) ? preg_replace('/\D/', '', (string) $rowData['tc_no']) : '';
                $rowLevelId = (int) ($rowData['education_level_id'] ?? 0);
                $rowSchoolNo = trim((string) ($rowData['school_no'] ?? ''));

                $existingStudent = null;
                if ($rowTc !== '' && strlen($rowTc) === 11) {
                    $existingStudent = Student::query()
                        ->where('tenant_id', $user->tenant_id)
                        ->where('tc_no', $rowTc)
                        ->first();
                }

                try {
                    if ($existingStudent) {
                        if ($this->updateExistingStudentFromImport($existingStudent, $rowData)) {
                            $updated += 1;
                        }
                    } else {
                        $this->createNewStudentFromImport($rowData, $rowTc, $rowLevelId, $rowSchoolNo, $existingTc, $existingSchoolNoByLevel);
                        $imported += 1;
                    }
                } catch (\Throwable $e) {
                    $errors[] = 'Satır ' . $rowNumber . ': ' . $e->getMessage();
                }
            }

            DB::commit();

            return $this->success([
                'imported' => $imported,
                'updated' => $updated,
                'errors' => $errors,
            ], 'Toplu öğrenci aktarımı tamamlandı.');
        } catch (\Throwable $e) {
            DB::rollBack();
            return $this->error('Toplu aktarım sırasında hata oluştu: ' . $e->getMessage(), [], 500);
        }
    }

    private function buildImportLookupMaps($tenantId): array
    {
        $classroomMap = Classroom::query()
            ->where('tenant_id', $tenantId)
            ->get(['id', 'name'])
            ->mapWithKeys(function ($c) {
                $norm = $this->normalizeImportClassroomName((string) ($c->name ?? ''));
                return $norm !== '' ? [$norm => (int) $c->id] : [];
            })
            ->all();

        $cityMap = City::query()
            ->get(['id', 'name'])
            ->mapWithKeys(function ($c) {
                $norm = $this->normalizePlaceName((string) ($c->name ?? ''));
                return $norm !== '' ? [$norm => (int) $c->id] : [];
            })
            ->all();

        $districtMapByCity = [];
        $districts = District::query()->get(['id', 'name', 'city_id']);
        foreach ($districts as $d) {
            $cityId = (int) ($d->city_id ?? 0);
            if ($cityId <= 0) continue;
            $norm = $this->normalizePlaceName((string) ($d->name ?? ''));
            if ($norm === '') continue;
            if (! isset($districtMapByCity[$cityId])) $districtMapByCity[$cityId] = [];
            if (! array_key_exists($norm, $districtMapByCity[$cityId])) {
                $districtMapByCity[$cityId][$norm] = (int) $d->id;
            }
        }

        return [
            'classroomMap' => $classroomMap,
            'cityMap' => $cityMap,
            'districtMapByCity' => $districtMapByCity,
        ];
    }

    private function updateExistingStudentFromImport(Student $existingStudent, array $rowData): bool
    {
        $existingStudent->load('guardians');

        $isEmpty = static function ($v): bool {
            if ($v === null) return true;
            if (is_string($v) && trim($v) === '') return true;
            if (is_array($v) && empty($v)) return true;
            return false;
        };

        $updates = [];
        $updates['name'] = $existingStudent->name;

        $map = [
            'school_no' => 'school_no',
            'classroom_id' => 'classroom_id',
            'tc_no' => 'tc_no',
            'birth_date' => 'birth_date',
            'gender' => 'gender',
            'phone' => 'phone',
            'email' => 'email',
            'address' => 'address',
            'city_id' => 'city_id',
            'district_id' => 'district_id',
            'campus_id' => 'campus_id',
            'education_level_id' => 'education_level_id',
        ];
        foreach ($map as $field => $col) {
            if ($isEmpty($existingStudent->{$col}) && array_key_exists($field, $rowData) && ! $isEmpty($rowData[$field])) {
                $updates[$col] = $rowData[$field];
            }
        }

        if ($isEmpty($existingStudent->emergency_contact_info) && array_key_exists('emergency_contact_info', $rowData) && ! $isEmpty($rowData['emergency_contact_info'])) {
            $updates['emergency_contact_info'] = $rowData['emergency_contact_info'];
        }

        if ($isEmpty($existingStudent->name) && ! empty($rowData['student_name'])) {
            $updates['name'] = (string) $rowData['student_name'];
        }

        $didUpdate = false;
        if (count($updates) > 0) {
            $existingStudent->fill($updates);
            $existingStudent->save();
            $didUpdate = true;
        }

        $rowGuardians = is_array($rowData['guardians'] ?? null) ? $rowData['guardians'] : [];
        if (! empty($rowGuardians)) {
            $existingPayload = [];
            $existingKeys = [];

            foreach ($existingStudent->guardians as $g) {
                $data = [
                    'tc_no' => $g->tc_no,
                    'email' => $g->email,
                    'name' => $g->name,
                    'phone' => $g->phone,
                    'job' => $g->job,
                    'relation_type' => $g->pivot->relation_type ?? 'other',
                    'is_legal_guardian' => (bool) ($g->pivot->is_legal_guardian ?? false),
                ];
                $existingPayload[] = $data;

                if ($g->tc_no) $existingKeys['tc_'.$g->tc_no] = true;
                if ($g->email) $existingKeys['mail_'.$g->email] = true;
            }

            foreach ($rowGuardians as $rg) {
                $rgTc = isset($rg['tc_no']) ? preg_replace('/\D/', '', (string) $rg['tc_no']) : null;
                $rgMail = isset($rg['email']) ? trim((string) $rg['email']) : null;

                $alreadyHas = false;
                if ($rgTc && isset($existingKeys['tc_'.$rgTc])) $alreadyHas = true;
                if ($rgMail && isset($existingKeys['mail_'.$rgMail])) $alreadyHas = true;

                if (! $alreadyHas) {
                    $existingPayload[] = $rg;
                    if ($rgTc) $existingKeys['tc_'.$rgTc] = true;
                    if ($rgMail) $existingKeys['mail_'.$rgMail] = true;
                    $didUpdate = true;
                }
            }

            (new CreateStudentAction())->syncGuardiansForStudent($existingStudent, $existingPayload);
        }

        return $didUpdate;
    }

    private function createNewStudentFromImport(
        array $rowData,
        string $rowTc,
        int $rowLevelId,
        string $rowSchoolNo,
        array &$existingTc,
        array &$existingSchoolNoByLevel
    ): void {
        $action = new CreateStudentAction();
        $rowData['ignore_capacity'] = true;
        $resp = $action->execute($rowData);
        if ($resp->getStatusCode() >= 400) {
            $payload = $resp->getData(true);
            $msg = is_array($payload) && isset($payload['message']) ? (string) $payload['message'] : 'Öğrenci oluşturulamadı';
            throw new \RuntimeException($msg);
        }

        if ($rowTc !== '' && strlen($rowTc) === 11) {
            $existingTc[$rowTc] = true;
        }
        if ($rowLevelId > 0 && $rowSchoolNo !== '') {
            if (! isset($existingSchoolNoByLevel[$rowLevelId])) {
                $existingSchoolNoByLevel[$rowLevelId] = [];
            }
            $existingSchoolNoByLevel[$rowLevelId][$rowSchoolNo] = true;
        }
    }

    private function mapImportRowToStudentPayload(array $row, array $headers, int $tenantId, array $classroomMap = [], array $cityMap = [], array $districtMapByCity = []): array
    {
        $data = [];
        foreach ($headers as $i => $h) {
            $data[$h] = $row[$i] ?? null;
        }

        $studentName = trim((string) ($data['student_name'] ?? ''));
        $schoolNo = trim((string) ($data['school_no'] ?? ''));

        // Hem öğrenci adı hem okul no boşsa bu satırı atla (tamamen boş satır)
        if ($studentName === '' && $schoolNo === '') {
            return ['__skip' => true];
        }

        // Name DB'de zorunlu (nullable değil). Boşsa otomatik placeholder üret.
        if ($studentName === '') {
            $suffix = strtoupper(substr(uniqid(), -6));
            $studentName = $schoolNo !== '' ? ('Öğrenci ' . $schoolNo) : ('Öğrenci ' . $suffix);
        }

        // Zorunlu alan kontrolleri kaldırıldı - boş olanlar boş kalır
        $classroomName = trim((string) ($data['classroom_name'] ?? ''));

        $tcNoRaw = $this->normalizeExcelDigits($data['tc_no'] ?? null);
        $tcNo = $tcNoRaw !== '' ? preg_replace('/\D/', '', $tcNoRaw) : null;
        if ($tcNo === '') {
            $tcNo = null;
        }

        $birthDate = trim((string) ($data['birth_date'] ?? ''));
        if ($birthDate === '') {
            $birthDate = null;
        }
        $genderRaw = strtolower(trim((string) ($data['gender'] ?? '')));
        $genderRaw = $genderRaw === '' ? null : $genderRaw;
        $gender = null;
        if ($genderRaw !== null) {
            // Normalize common Turkish/English values into enum: male|female
            $clean = str_replace([' ', '-', '_', '.'], '', $genderRaw);
            $clean = str_replace(['ı', 'İ'], 'i', $clean);
            $clean = str_replace(['ğ', 'Ğ'], 'g', $clean);
            $clean = str_replace(['ü', 'Ü'], 'u', $clean);
            $clean = str_replace(['ş', 'Ş'], 's', $clean);
            $clean = str_replace(['ö', 'Ö'], 'o', $clean);
            $clean = str_replace(['ç', 'Ç'], 'c', $clean);

            if (in_array($clean, ['m', 'e', 'male', 'man', 'erkek', 'bay'], true)) {
                $gender = 'male';
            } elseif (in_array($clean, ['f', 'k', 'female', 'woman', 'kiz', 'kadin', 'bayan'], true)) {
                $gender = 'female';
            }
        }

        // tc_no, birth_date, gender zorunluluğu kaldırıldı - boş olanlar boş kalır

        // Kampüs/Kademe isimden çöz
        $campusName = trim((string) ($data['campus_name'] ?? ''));
        $educationLevelName = trim((string) ($data['education_level_name'] ?? ''));

        $campusId = null;
        if ($campusName !== '') {
            $campusIdValue = Campus::query()->where('name', $campusName)->value('id');
            if ($campusIdValue) {
                $campusId = (int) $campusIdValue;
            }
        }

        $educationLevelId = null;
        if ($educationLevelName !== '') {
            $q = EducationLevel::query()->where('name', $educationLevelName);
            if ($campusId) {
                $q->where('campus_id', $campusId);
            }
            $educationLevelIdValue = $q->value('id');
            if ($educationLevelIdValue) {
                $educationLevelId = (int) $educationLevelIdValue;
            }
        }

        // Sınıf: kampüs+kademe verilirse ona göre, yoksa tenant içinde isimden
        $classroomId = 0;
        $normalized = $this->normalizeImportClassroomName($classroomName);
        if ($normalized !== '' && array_key_exists($normalized, $classroomMap)) {
            $classroomId = (int) $classroomMap[$normalized];
        }

        if ($classroomId <= 0 && $classroomName !== '') {
            $query = Classroom::query()->where('tenant_id', $tenantId)->where('name', $classroomName);
            if ($educationLevelId) {
                // Sınıf modeli: grade_level = education_level_id alanını da tutuyor
                $query->where('grade_level', $educationLevelId);
            }
            if ($campusId) {
                $query->whereHas('educationLevel', function ($q) use ($campusId) {
                    $q->where('campus_id', $campusId);
                });
            }
            $classroomId = (int) ($query->value('id') ?? 0);
        }

        // Sınıf bulunamazsa NULL olarak bırak (zorunlu değil)
        if ($classroomId <= 0) {
            $classroomId = null;
        }

        // education_level_id: kademe isimden çözülmüşse onu kullan; değilse sınıfın grade_level'ından çöz
        if (! $educationLevelId && $classroomId) {
            $educationLevelId = (int) (Classroom::query()->whereKey($classroomId)->value('grade_level') ?? 0);
            if ($educationLevelId <= 0) {
                $educationLevelId = null;
            }
        }

        $cityName = trim((string) ($data['city'] ?? ''));
        $districtName = trim((string) ($data['district'] ?? ''));
        $cityId = null;
        $districtId = null;

        if ($cityName !== '') {
            $normCity = $this->normalizePlaceName($cityName);
            if ($normCity !== '' && array_key_exists($normCity, $cityMap)) {
                $cityId = (int) $cityMap[$normCity];
            }
        }

        if ($districtName !== '') {
            $normDistrict = $this->normalizePlaceName($districtName);
            if ($normDistrict !== '') {
                if ($cityId && isset($districtMapByCity[(int) $cityId]) && array_key_exists($normDistrict, $districtMapByCity[(int) $cityId])) {
                    $districtId = (int) $districtMapByCity[(int) $cityId][$normDistrict];
                } elseif (! $cityId) {
                    // city yoksa, tüm ilçelerde ilk eşleşeni al
                    foreach ($districtMapByCity as $byCity) {
                        if (array_key_exists($normDistrict, $byCity)) {
                            $districtId = (int) $byCity[$normDistrict];
                            break;
                        }
                    }
                }
            }
        }

        $guardians = [];

        $normalizeGuardianRelationType = static function ($value): string {
            $raw = strtolower(trim((string) ($value ?? '')));
            if ($raw === '') {
                return 'other';
            }
            $clean = str_replace([' ', '-', '_', '.'], '', $raw);
            $clean = str_replace(['ı', 'İ'], 'i', $clean);
            $clean = str_replace(['ğ', 'Ğ'], 'g', $clean);
            $clean = str_replace(['ü', 'Ü'], 'u', $clean);
            $clean = str_replace(['ş', 'Ş'], 's', $clean);
            $clean = str_replace(['ö', 'Ö'], 'o', $clean);
            $clean = str_replace(['ç', 'Ç'], 'c', $clean);

            if (in_array($clean, ['father', 'baba', 'b', 'dad'], true)) {
                return 'father';
            }
            if (in_array($clean, ['mother', 'anne', 'a', 'mom'], true)) {
                return 'mother';
            }
            if (in_array($clean, ['guardian', 'vasi', 'veli', 'vası'], true)) {
                return 'guardian';
            }
            return 'other';
        };

        $g1TcRaw = $this->normalizeExcelDigits($data['guardian1_tc_no'] ?? null);
        $g1Tc = $g1TcRaw !== '' ? preg_replace('/\D/', '', $g1TcRaw) : '';
        $g1Email = trim((string) ($data['guardian1_email'] ?? ''));
        $g1Name = trim((string) ($data['guardian1_name'] ?? ''));
        $g1Phone = trim((string) ($data['guardian1_phone'] ?? ''));
        if ($g1Tc !== '' || $g1Email !== '' || $g1Name !== '' || $g1Phone !== '') {
            $guardians[] = [
                'tc_no' => $g1Tc !== '' ? $g1Tc : null,
                'email' => $g1Email !== '' ? $g1Email : null,
                'name' => trim((string) ($data['guardian1_name'] ?? '')),
                'phone' => trim((string) ($data['guardian1_phone'] ?? '')),
                'job' => trim((string) ($data['guardian1_job'] ?? '')),
                'relation_type' => $normalizeGuardianRelationType($data['guardian1_relation_type'] ?? 'other'),
                'is_legal_guardian' => in_array($data['guardian1_is_legal_guardian'] ?? null, [1, '1', true, 'true', 'TRUE', 'E', 'e'], true),
            ];
        }

        $g2TcRaw = $this->normalizeExcelDigits($data['guardian2_tc_no'] ?? null);
        $g2Tc = $g2TcRaw !== '' ? preg_replace('/\D/', '', $g2TcRaw) : '';
        $g2Email = trim((string) ($data['guardian2_email'] ?? ''));
        $g2Name = trim((string) ($data['guardian2_name'] ?? ''));
        $g2Phone = trim((string) ($data['guardian2_phone'] ?? ''));
        if ($g2Tc !== '' || $g2Email !== '' || $g2Name !== '' || $g2Phone !== '') {
            $guardians[] = [
                'tc_no' => $g2Tc !== '' ? $g2Tc : null,
                'email' => $g2Email !== '' ? $g2Email : null,
                'name' => trim((string) ($data['guardian2_name'] ?? '')),
                'phone' => trim((string) ($data['guardian2_phone'] ?? '')),
                'job' => trim((string) ($data['guardian2_job'] ?? '')),
                'relation_type' => $normalizeGuardianRelationType($data['guardian2_relation_type'] ?? 'other'),
                'is_legal_guardian' => in_array($data['guardian2_is_legal_guardian'] ?? null, [1, '1', true, 'true', 'TRUE', 'E', 'e'], true),
            ];
        }

        // Veli zorunluluğu kaldırıldı - boş olanlar boş kalır

        $emergency = [
            'name' => trim((string) ($data['emergency_name'] ?? '')),
            'phone' => trim((string) ($data['emergency_phone'] ?? '')),
            'relation' => trim((string) ($data['emergency_relation'] ?? '')),
        ];
        $emergency = array_filter($emergency, static fn ($v) => $v !== null && $v !== '');

        return [
            'student_name' => $studentName,
            'school_no' => $schoolNo !== '' ? $schoolNo : null,
            'classroom_id' => $classroomId,
            'is_active' => true,
            'tc_no' => $tcNo,
            'birth_date' => $birthDate,
            'gender' => $gender,
            'phone' => trim((string) ($data['phone'] ?? '')) ?: null,
            'email' => trim((string) ($data['email'] ?? '')) ?: null,
            'address' => trim((string) ($data['address'] ?? '')) ?: null,
            'city_id' => $cityId,
            'district_id' => $districtId,
            'campus_id' => $campusId,
            'education_level_id' => $educationLevelId,
            'guardians' => $guardians,
            'emergency_contact_info' => empty($emergency) ? null : $emergency,
        ];
    }

    public function export(Request $request): StreamedResponse|JsonResponse
    {
        try {
            $format = (string) $request->input('format', 'excel');
            if (! in_array($format, ['excel', 'pdf'], true)) {
                return $this->error('Geçersiz format. Sadece excel veya pdf desteklenir.', [], 422);
            }

            $scope = (string) $request->input('scope', 'all');
            if (! in_array($scope, ['all', 'classrooms', 'students'], true)) {
                return $this->error('Geçersiz kapsam (scope).', [], 422);
            }

            $requestedColumns = $request->input('columns', []);
            if (! is_array($requestedColumns) || empty($requestedColumns)) {
                return $this->error('En az 1 sütun seçmelisiniz.', [], 422);
            }

            $user = $request->user();
            $roleName = $user && $user->role ? $user->role->name : null;
            $isTeacherRole = $this->isTeacherRole($roleName) && ! $this->isGuidanceRole($user);

            $allowedColumns = $this->getExportAllowedColumns($isTeacherRole);
            $columns = $this->sanitizeExportColumns($requestedColumns, $allowedColumns, $isTeacherRole);

            if (empty($columns)) {
                return $this->error('Geçerli sütun bulunamadı.', [], 422);
            }

            $query = $this->buildExportQuery($request, $user, $isTeacherRole, $roleName, $scope, $columns);
            if ($query instanceof JsonResponse) {
                return $query;
            }

            $students = $query->get();
            $headers = array_map(static fn ($c) => $allowedColumns[$c]['label'], $columns);
            $rows = $this->buildExportRows($students, $columns);

            $tenantId = $user ? ($user->tenant_id ?? 'default') : 'default';
            $tenant = $tenantId ? Tenant::find($tenantId) : null;

            if ($format === 'excel') {
                return $this->exportExcelResponse($headers, $rows, $tenant);
            }

            return $this->exportPdfResponse($request, $students, $columns, $headers, $rows, $tenant);
        } catch (\Exception $e) {
            return $this->error('Export sırasında hata oluştu: ' . $e->getMessage(), [], 500);
        }
    }

    private function getExportAllowedColumns(bool $isTeacherRole): array
    {
        $allowed = [
            'student_name' => ['label' => 'Ad Soyad'],
            'school_no' => ['label' => 'Öğrenci No'],
            'tc_no' => ['label' => 'TC Kimlik'],
            'classroom_name' => ['label' => 'Sınıf'],
            'campus_name' => ['label' => 'Kampüs'],
            'education_level_name' => ['label' => 'Kademe'],
            'phone' => ['label' => 'Telefon'],
            'email' => ['label' => 'E-posta'],
            'address' => ['label' => 'Adres'],
            'birth_date' => ['label' => 'Doğum Tarihi'],
            'gender' => ['label' => 'Cinsiyet'],
            'is_active' => ['label' => 'Durum'],
            'guardian1_name' => ['label' => 'Anne Adı'],
            'guardian1_phone' => ['label' => 'Anne Telefon'],
            'guardian2_name' => ['label' => 'Baba Adı'],
            'guardian2_phone' => ['label' => 'Baba Telefon'],
        ];

        if (! $isTeacherRole) {
            $allowed['emergency_phone'] = ['label' => 'Acil Durum Telefon'];
        }

        return $allowed;
    }

    private function sanitizeExportColumns(array $requestedColumns, array $allowedColumns, bool $isTeacherRole): array
    {
        $columns = array_values(array_filter(array_map(static fn ($c) => is_string($c) ? trim($c) : '', $requestedColumns)));
        $columns = array_values(array_unique($columns));
        $columns = array_values(array_filter($columns, static fn ($c) => $c !== '' && array_key_exists($c, $allowedColumns)));

        if ($isTeacherRole) {
            $columns = array_values(array_filter($columns, static fn ($c) => $c !== 'tc_no'));
        }

        return $columns;
    }

    /**
     * @param Request $request
     * @param mixed $user
     * @param bool $isTeacherRole
     * @param string|null $roleName
     * @param string $scope
     * @param array $columns
     * @return \Illuminate\Database\Eloquent\Builder|JsonResponse
     */
    private function buildExportQuery(Request $request, $user, bool $isTeacherRole, ?string $roleName, string $scope, array $columns)
    {
        $query = Student::query()
            ->leftJoin('classrooms as c', 'students.classroom_id', '=', 'c.id')
            ->leftJoin('branches as b', 'c.branch_id', '=', 'b.id')
            ->leftJoin('education_levels as cel', function ($join) {
                $join->on('c.grade_level', '=', 'cel.id')
                     ->orOn('c.education_level_id', '=', 'cel.id');
            })
            ->leftJoin('education_levels as sel', 'students.education_level_id', '=', 'sel.id')
            ->select('students.*')
            ->distinct();

        $userTenantId = $user ? $user->tenant_id : null;
        $isSuperAdmin = $user && $user->is_superadmin;
        if ($user && ! $isSuperAdmin && $userTenantId) {
            $query->where('students.tenant_id', $userTenantId);
        }

        if ($isTeacherRole && $user) {
            $allowedClassroomIds = $this->teacherAllowedClassroomIds($user);
            if (empty($allowedClassroomIds)) {
                $query->whereRaw('1 = 0');
            } else {
                $query->whereIn('students.classroom_id', $allowedClassroomIds);
            }
        }

        if (in_array($roleName, ['Müdür', 'Müdür Yardımcısı', 'Öğrenci İşleri', 'student_affairs', 'Rehberlik', 'guidance', 'Rehber Öğretmen', 'rehber_teacher', 'guidance_teacher'], true) && $user) {
            $campusIds = array_filter(array_map('intval', (array) ($user->campus_ids ?? [])));
            $educationLevelIds = array_filter(array_map('intval', (array) ($user->education_level_ids ?? [])));
            if (empty($campusIds) && empty($educationLevelIds)) {
                $query->whereRaw('1 = 0');
            } else {
                $query->where(function ($q) use ($campusIds, $educationLevelIds) {
                    if (! empty($campusIds)) {
                        $userCampusLevelIds = EducationLevel::withoutGlobalScope(SeasonScope::class)
                            ->whereIn('campus_id', $campusIds)
                            ->pluck('id')
                            ->toArray();

                        $q->whereIn('cel.campus_id', $campusIds)
                            ->orWhereIn('sel.campus_id', $campusIds)
                            ->orWhereIn('b.campus_id', $campusIds)
                            ->orWhereIn('c.campus_id', $campusIds);

                        if (! empty($userCampusLevelIds)) {
                            $q->orWhereIn('students.education_level_id', $userCampusLevelIds)
                              ->orWhereIn('c.education_level_id', $userCampusLevelIds)
                              ->orWhereIn('c.grade_level', array_map('strval', $userCampusLevelIds));
                        }
                    }

                    if (! empty($educationLevelIds)) {
                        $q->whereIn('students.education_level_id', $educationLevelIds)
                            ->orWhereIn('c.education_level_id', $educationLevelIds)
                            ->orWhereIn('b.education_level_id', $educationLevelIds)
                            ->orWhereIn('c.grade_level', array_map('strval', $educationLevelIds));
                    }
                });
            }
        }

        if ($scope === 'classrooms') {
            $classroomIds = $request->input('classroom_ids') ?? $request->input('class_ids', []);
            if (is_string($classroomIds)) {
                $classroomIds = array_filter(array_map('trim', explode(',', $classroomIds)));
            }
            if (! is_array($classroomIds) || empty($classroomIds)) {
                return $this->error('Seçili sınıflar için classroom_ids zorunludur.', [], 422);
            }
            $classroomIds = array_values(array_unique(array_filter(array_map('intval', $classroomIds), static fn ($id) => $id > 0)));
            if (empty($classroomIds)) {
                return $this->error('Geçerli classroom_ids bulunamadı.', [], 422);
            }
            $query->whereIn('students.classroom_id', $classroomIds);
        }

        if ($scope === 'students') {
            $studentIds = $request->input('student_ids', []);
            if (! is_array($studentIds) || empty($studentIds)) {
                return $this->error('Seçili öğrenciler için student_ids zorunludur.', [], 422);
            }
            $studentIds = array_values(array_unique(array_filter(array_map('intval', $studentIds), static fn ($id) => $id > 0)));
            if (empty($studentIds)) {
                return $this->error('Geçerli student_ids bulunamadı.', [], 422);
            }
            $query->whereIn('students.id', $studentIds);
        }

        $campusId = $request->input('campus_id');
        if ($campusId !== null && $campusId !== '') {
            $campusId = (int) $campusId;
            $campusLevelIds = EducationLevel::withoutGlobalScope(SeasonScope::class)
                ->where('campus_id', $campusId)
                ->pluck('id')
                ->toArray();

            $query->where(function ($q) use ($campusId, $campusLevelIds) {
                $q->where('cel.campus_id', $campusId)
                    ->orWhere('sel.campus_id', $campusId)
                    ->orWhere('b.campus_id', $campusId)
                    ->orWhere('c.campus_id', $campusId);

                if (! empty($campusLevelIds)) {
                    $q->orWhereIn('students.education_level_id', $campusLevelIds)
                      ->orWhereIn('c.education_level_id', $campusLevelIds)
                      ->orWhereIn('c.grade_level', array_map('strval', $campusLevelIds));
                }
            });
        }

        $educationLevelId = $request->input('education_level_id');
        if ($educationLevelId !== null && $educationLevelId !== '') {
            $educationLevelIdInt = (int) $educationLevelId;

            $selectedLevel = EducationLevel::withoutGlobalScope(SeasonScope::class)
                ->whereKey($educationLevelIdInt)
                ->first(['name', 'code']);

            $matchingLevelIds = collect([$educationLevelIdInt]);
            if ($selectedLevel) {
                $criteria = EducationLevel::withoutGlobalScope(SeasonScope::class)
                    ->where(function ($q) use ($selectedLevel) {
                        if ($selectedLevel->name) {
                            $q->where('name', $selectedLevel->name);
                        }
                        if ($selectedLevel->code) {
                            $q->orWhere('code', $selectedLevel->code);
                        }
                    })
                    ->pluck('id');
                $matchingLevelIds = $criteria->merge([$educationLevelIdInt])->unique();
            }

            $matchingLevelIdsArray = $matchingLevelIds->values()->all();
            $matchingLevelCodesArray = $selectedLevel && $selectedLevel->code
                ? [$selectedLevel->code, (string) $educationLevelIdInt]
                : [(string) $educationLevelIdInt];

            $query->where(function ($q) use ($matchingLevelIdsArray, $matchingLevelCodesArray) {
                $q->whereIn('students.education_level_id', $matchingLevelIdsArray)
                    ->orWhereIn('c.education_level_id', $matchingLevelIdsArray)
                    ->orWhereIn('b.education_level_id', $matchingLevelIdsArray)
                    ->orWhereIn('c.grade_level', $matchingLevelCodesArray);
            });
        }

        $educationLevelIdsInput = $request->input('education_level_ids');
        if (! empty($educationLevelIdsInput) && ($educationLevelId === null || $educationLevelId === '')) {
            if (is_string($educationLevelIdsInput)) {
                $educationLevelIdsInput = array_filter(array_map('trim', explode(',', $educationLevelIdsInput)));
            }
            if (is_array($educationLevelIdsInput)) {
                $educationLevelIdsInput = array_values(array_unique(array_filter(array_map('intval', $educationLevelIdsInput), static fn ($id) => $id > 0)));
                if (! empty($educationLevelIdsInput)) {
                    $selectedLevels = EducationLevel::withoutGlobalScope(SeasonScope::class)
                        ->whereIn('id', $educationLevelIdsInput)
                        ->get(['id', 'name', 'code']);

                    $matchingLevelIds = collect($educationLevelIdsInput);
                    $matchingLevelCodes = collect();
                    foreach ($selectedLevels as $sl) {
                        if ($sl->name || $sl->code) {
                            $criteria = EducationLevel::withoutGlobalScope(SeasonScope::class)
                                ->where(function ($q) use ($sl) {
                                    if ($sl->name) {
                                        $q->where('name', $sl->name);
                                    }
                                    if ($sl->code) {
                                        $q->orWhere('code', $sl->code);
                                    }
                                })
                                ->pluck('id');
                            $matchingLevelIds = $matchingLevelIds->merge($criteria);
                        }
                        if ($sl->code) {
                            $matchingLevelCodes->push($sl->code);
                        }
                    }
                    $matchingLevelIdsArray = $matchingLevelIds->unique()->values()->all();
                    $matchingLevelCodesArray = $matchingLevelCodes->merge(array_map('strval', $educationLevelIdsInput))->unique()->values()->all();

                    $query->where(function ($q) use ($matchingLevelIdsArray, $matchingLevelCodesArray) {
                        $q->whereIn('students.education_level_id', $matchingLevelIdsArray)
                            ->orWhereIn('c.education_level_id', $matchingLevelIdsArray)
                            ->orWhereIn('b.education_level_id', $matchingLevelIdsArray)
                            ->orWhereIn('c.grade_level', $matchingLevelCodesArray);
                    });
                }
            }
        }

        $classIds = $request->input('classroom_ids') ?? $request->input('class_ids');
        $hasFilteredClasses = false;
        if ($scope === 'classrooms') {
            $hasFilteredClasses = true;
        } elseif ($classIds !== null) {
            if (is_string($classIds)) {
                $classIds = array_filter(array_map('trim', explode(',', $classIds)));
            }

            if (is_array($classIds)) {
                $classIds = array_values(array_unique(array_filter(array_map('intval', $classIds), static fn ($id) => $id > 0)));
                if (! empty($classIds)) {
                    $hasFilteredClasses = true;
                    $query->whereIn('students.classroom_id', $classIds);
                }
            }
        }

        $classroomId = $request->input('classroom_id');
        if (! $hasFilteredClasses && $classroomId !== null && $classroomId !== '') {
            $query->where('students.classroom_id', (int) $classroomId);
        }

        $isActive = $request->input('is_active');
        if ($isActive !== null && $isActive !== '') {
            $isActiveBool = in_array($isActive, ['1', 1, true, 'true'], true);
            $query->where('students.is_active', $isActiveBool);
        }

        $search = $request->input('search');
        if ($search !== null) {
            $search = trim((string) $search);
            if ($search !== '') {
                $query->where(function ($q) use ($search) {
                    $q->where('students.name', 'like', '%' . $search . '%')
                        ->orWhere('students.tc_no', 'like', '%' . $search . '%')
                        ->orWhere('students.school_no', 'like', '%' . $search . '%')
                        ->orWhere('c.name', 'like', '%' . $search . '%');
                });
            }
        }

        $sortBy = $request->input('sort_by');
        $sortDir = strtolower((string) $request->input('sort_dir', 'asc'));
        if (! in_array($sortDir, ['asc', 'desc'], true)) {
            $sortDir = 'asc';
        }
        $sortMap = [
            'name' => 'students.name',
            'school_no' => 'students.school_no',
            'birth_date' => 'students.birth_date',
        ];
        $sortColumn = $sortMap['name'];
        if (is_string($sortBy) && array_key_exists($sortBy, $sortMap)) {
            $sortColumn = $sortMap[$sortBy];
        }

        $needsClassroom = (bool) array_intersect($columns, ['classroom_name', 'campus_name', 'education_level_name']);
        $needsGuardians = (bool) array_intersect($columns, ['guardian1_name', 'guardian1_phone', 'guardian2_name', 'guardian2_phone']);

        $baseSelect = ['students.id', 'students.tenant_id', 'students.classroom_id', 'students.name', 'students.school_no', 'students.phone', 'students.email', 'students.address', 'students.birth_date', 'students.gender', 'students.is_active'];
        if (in_array('tc_no', $columns, true)) {
            $baseSelect[] = 'students.tc_no';
        }
        if (in_array('emergency_phone', $columns, true)) {
            $baseSelect[] = 'students.emergency_contact_info';
        }

        $query->select(array_values(array_unique($baseSelect)));

        $with = [];
        if ($needsClassroom) {
            $with['classroom'] = function ($q) {
                $q->with([
                    'branch' => function ($q2) {
                        $q2->with('campus');
                    },
                    'educationLevel' => function ($q2) {
                        $q2->with('campus');
                    },
                ]);
            };
        }
        if ($needsGuardians) {
            $with[] = 'guardians';
        }
        if (! empty($with)) {
            $query->with($with);
        }

        if ($sortBy === 'school_no') {
            $query->orderByRaw(
                "CASE WHEN students.school_no REGEXP '^[0-9]+$' THEN 0 ELSE 1 END {$sortDir}, " .
                "CAST(students.school_no AS UNSIGNED) {$sortDir}, students.school_no {$sortDir}"
            );
        } elseif ($sortBy === 'classroom') {
            $dir = strtoupper($sortDir) === 'DESC' ? 'DESC' : 'ASC';
            $query->addSelect('c.name as classroom_sort_name')
                  ->orderBy('classroom_sort_name', $dir)
                  ->orderBy('students.name', 'asc');
        } else {
            $query->orderBy($sortColumn, $sortDir);
        }

        return $query;
    }

    /**
     * @param iterable $students
     * @param array $columns
     * @return array
     */
    private function buildExportRows(iterable $students, array $columns): array
    {
        $rows = [];
        foreach ($students as $student) {
            /** @var Student $student */
            $classroom = $student->relationLoaded('classroom') ? $student->classroom : null;
            $guardians = $student->relationLoaded('guardians') ? $student->guardians : collect();

            $campusName = $classroom?->educationLevel?->campus?->name
                ?? $classroom?->branch?->campus?->name
                ?? null;

            $row = [];
            foreach ($columns as $c) {
                $row[] = match ($c) {
                    'student_name' => (string) ($student->name ?? ''),
                    'school_no' => (string) ($student->school_no ?? ''),
                    'tc_no' => (string) ($student->tc_no ?? ''),
                    'classroom_name' => (string) ($classroom?->name ?? ''),
                    'campus_name' => (string) ($campusName ?? ''),
                    'education_level_name' => (string) ($classroom?->educationLevel?->name ?? ''),
                    'phone' => (string) ($student->phone ?? ''),
                    'email' => (string) ($student->email ?? ''),
                    'address' => (string) ($student->address ?? ''),
                    'birth_date' => $student->birth_date ? \Illuminate\Support\Carbon::parse($student->birth_date)->format('Y-m-d') : '',
                    'gender' => (string) ($student->gender ?? ''),
                    'is_active' => $student->is_active ? 'Aktif' : 'Pasif',
                    'guardian1_name' => (string) ($guardians->first()?->name ?? ''),
                    'guardian1_phone' => (string) ($guardians->first()?->phone ?? ''),
                    'guardian2_name' => (string) ($guardians->skip(1)->first()?->name ?? ''),
                    'guardian2_phone' => (string) ($guardians->skip(1)->first()?->phone ?? ''),
                    'emergency_phone' => (string) (data_get($student->emergency_contact_info, 'phone') ?? ''),
                    default => '',
                };
            }
            $rows[] = $row;
        }
        return $rows;
    }

    private function exportExcelResponse(array $headers, array $rows, ?Tenant $tenant): StreamedResponse
    {
        $spreadsheet = new Spreadsheet();
        $sheet = $spreadsheet->getActiveSheet();

        $headerStyle = [
            'font' => [
                'bold' => true,
                'color' => ['rgb' => 'FFFFFF'],
                'size' => 12,
            ],
            'fill' => [
                'fillType' => Fill::FILL_SOLID,
                'startColor' => ['rgb' => '4472C4'],
            ],
            'alignment' => [
                'horizontal' => Alignment::HORIZONTAL_CENTER,
                'vertical' => Alignment::VERTICAL_CENTER,
                'wrapText' => true,
            ],
            'borders' => [
                'allBorders' => [
                    'borderStyle' => Border::BORDER_THIN,
                    'color' => ['rgb' => 'D1D5DB'],
                ],
            ],
        ];

        $zebraFill = [
            'fill' => [
                'fillType' => Fill::FILL_SOLID,
                'startColor' => ['rgb' => 'F3F4F6'],
            ],
        ];

        $cellStyle = [
            'alignment' => [
                'vertical' => Alignment::VERTICAL_CENTER,
                'wrapText' => true,
            ],
            'borders' => [
                'allBorders' => [
                    'borderStyle' => Border::BORDER_THIN,
                    'color' => ['rgb' => 'E5E7EB'],
                ],
            ],
        ];

        $rowIndex = 1;
        $col = 'A';
        foreach ($headers as $header) {
            $sheet->setCellValue($col.$rowIndex, $header);
            $sheet->getStyle($col.$rowIndex)->applyFromArray($headerStyle);
            $col++;
        }

        $rowIndex = 2;
        foreach ($rows as $rowData) {
            $col = 'A';
            foreach ($rowData as $cellValue) {
                $sheet->setCellValue($col.$rowIndex, (string) $cellValue);
                $sheet->getStyle($col.$rowIndex)->applyFromArray($cellStyle);
                $col++;
            }

            if ($rowIndex % 2 === 0) {
                $lastCol = Coordinate::stringFromColumnIndex(max(count($headers), 1));
                $sheet->getStyle('A'.$rowIndex.':'.$lastCol.$rowIndex)->applyFromArray($zebraFill);
            }
            $rowIndex++;
        }

        $col = 'A';
        foreach ($headers as $_header) {
            $sheet->getColumnDimension($col)->setAutoSize(true);
            $col++;
        }

        $safeTenantName = preg_replace('/[^a-zA-Z0-9_\-]/', '_', (string) ($tenant?->name ?? 'kurum'));
        $fileName = 'ogrenciler_'.$safeTenantName.'_'.now()->format('Ymd_His').'.xlsx';

        return response()->streamDownload(function () use ($spreadsheet) {
            $writer = new Xlsx($spreadsheet);
            $writer->save('php://output');
        }, $fileName, [
            'Content-Type' => 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        ]);
    }

    private function exportPdfResponse(Request $request, iterable $students, array $columns, array $headers, array $rows, ?Tenant $tenant): StreamedResponse
    {
        $data = [
            'title' => 'Öğrenci Listesi Raporu',
            'students' => $students,
            'export' => [
                'columns' => $columns,
                'headers' => $headers,
                'rows' => $rows,
            ],
            'parameters' => $request->all(),
            'tenant' => $tenant,
            'generatedAt' => now()->format('d.m.Y H:i'),
        ];

        $pdf = Pdf::loadView('reports.students', [
            'data' => $data,
            'parameters' => $request->all(),
            'tenant' => $tenant,
            'generatedAt' => now()->format('d.m.Y H:i'),
        ])->setPaper('a4', 'landscape');

        $safeTenantName = preg_replace('/[^a-zA-Z0-9_\-]/', '_', (string) ($tenant?->name ?? 'kurum'));
        $fileName = 'ogrenciler_'.$safeTenantName.'_'.now()->format('Ymd_His').'.pdf';

        return response()->streamDownload(function () use ($pdf) {
            echo $pdf->output();
        }, $fileName, [
            'Content-Type' => 'application/pdf',
        ]);
    }

    /**
     * Store a newly created student in storage.
     *
     * @param  StoreStudentRequest  $request
     * @return JsonResponse
     */
    public function store(StoreStudentRequest $request): JsonResponse
    {
        try {
            $data = $request->validated();
            if ($request->has('sibling_ids') && !isset($data['sibling_ids'])) {
                $data['sibling_ids'] = $request->input('sibling_ids');
            }
            // CreateStudentAction zaten JsonResponse döndürüyor, direkt return et
            return (new CreateStudentAction())->execute($data);
        } catch (\Exception $e) {
            \Log::error('StudentController@store error: ' . $e->getMessage(), ['trace' => $e->getTraceAsString()]);
            return $this->error('Öğrenci eklenirken beklenmeyen bir hata oluştu. Lütfen bilgilerinizi kontrol edip tekrar deneyiniz.', [], 500);
        }
    }

    /**
     * Display the specified student.
     *
     * @param  int  $id
     * @return JsonResponse
     */
    public function omrExams(int $id): JsonResponse
    {
        $student = Student::find($id);
        if (!$student) {
            return $this->error('Öğrenci bulunamadı.', [], 404);
        }

        if (auth()->user()->role?->name !== 'owner' && auth()->user()->role?->name !== 'Kurum Sahibi') {
             // simplified gate, skip if needed or just use default. Mudur access:
             if ($this->mudurCannotAccessStudent($student)) {
                 return $this->error('Bu öğrenciye erişim yetkiniz yok.', [], 403);
             }
        }

        $results = OmrResult::with('exam')
            ->where('student_id', $id)
            ->orderByDesc('created_at')
            ->get();
            
        $grades = $results->map(function ($r) {
            return [
                'id' => $r->id,
                'lesson_name' => 'Deneme Sınavı',
                'exam_name' => $r->exam ? $r->exam->title : 'İsimsiz Sınav',
                'grade_date' => $r->exam ? $r->exam->date : $r->created_at,
                'grade' => $r->total_net !== null ? ($r->total_net . ' Net') : ($r->total_point . ' Puan'),
            ];
        });

        return $this->success(['grades' => $grades], 'Öğrenci OMR sınavları getirildi.');
    }

    public function show(int $id): JsonResponse
    {
        $student = Student::with([
            'city',
            'district',
            'guardians',
            'siblings' => function ($q) {
                $q->withoutGlobalScope(SeasonScope::class)->with('classroom');
            },
            'classroom' => function ($q) {
                $q->with([
                    'branch' => function ($q2) {
                        $q2->with('campus');
                    },
                    'educationLevel' => function ($q2) {
                        $q2->with('campus');
                    }
                ]);
            }
        ])->find($id);

        if (!$student) {
            return $this->error('Öğrenci bulunamadı.', [], 404);
        }

        if ($this->mudurCannotAccessStudent($student)) {
            return $this->error('Bu öğrenciye erişim yetkiniz yok.', [], 403);
        }

        if ($this->teacherCannotAccessStudent($student)) {
            return $this->error('Bu öğrenciye erişim yetkiniz yok.', [], 403);
        }

        return $this->success(['student' => new StudentResource($student)], 'Öğrenci bilgileri getirildi.');
    }

    /**
     * Müdür rolündeki kullanıcının bu öğrenciye (kampüs/kademe kapsamında) erişip erişemeyeceğini kontrol eder.
     */
    private function mudurCannotAccessStudent(Student $student): bool
    {
        $user = auth()->user();
        if (!$user || !$user->role || !in_array($user->role->name, ['Müdür', 'Müdür Yardımcısı', 'Öğrenci İşleri', 'student_affairs', 'Rehberlik', 'guidance', 'Rehber Öğretmen', 'rehber_teacher', 'guidance_teacher'], true)) {
            return false;
        }
        $student->load(['classroom.educationLevel']);
        $classroom = $student->classroom;
        if (!$classroom) {
            return true;
        }
        $campusIds = array_filter(array_map('intval', (array) ($user->campus_ids ?? [])));
        $educationLevelIds = array_filter(array_map('intval', (array) ($user->education_level_ids ?? [])));
        // Strict izolasyon: kademe scope'u yoksa erişim yok.
        if (empty($educationLevelIds)) {
            return true;
        }

        $campusOk = empty($campusIds) || ($classroom->educationLevel && in_array((int) $classroom->educationLevel->campus_id, $campusIds, true));
        $levelOk = in_array((int) $classroom->grade_level, $educationLevelIds, true);
        return !$campusOk || !$levelOk;
    }

    /**
     * Öğretmen için sadece yetkili olduğu sınıfları döner.
     */
    public function teacherClassrooms(Request $request): JsonResponse
    {
        $user = $request->user();
        $roleName = $user && $user->role ? $user->role->name : null;

        if (! $this->isTeacherRole($roleName)) {
            return $this->error('Bu endpoint sadece öğretmen kullanıcılar içindir.', [], 403);
        }

        $classroomIds = $this->teacherAllowedClassroomIds($user);

        $query = Classroom::query()
            ->where('tenant_id', $user->tenant_id);

        if ($this->isGuidanceRole($user)) {
            $query->whereIn('id', $classroomIds);
        } else {
            // Regular teachers usually only have their assigned classrooms
            $query->whereIn('id', $classroomIds);
        }

        if ($request->filled('campus_id')) {
            $campusId = (int) $request->campus_id;
            $query->whereHas('educationLevel', function ($q) use ($campusId) {
                $q->where('campus_id', $campusId);
            });
        }

        if ($request->filled('education_level_id')) {
            $levelId = (int) $request->education_level_id;
            $query->where(function ($q) use ($levelId) {
                $q->where('education_level_id', $levelId)
                    ->orWhere('grade_level', (string) $levelId);
            });
        }

        $classrooms = $query->orderBy('name')
            ->get(['id', 'name']);

        return $this->success([
            'classrooms' => $classrooms,
        ], 'Öğretmen sınıf listesi başarıyla getirildi.');
    }

    /**
     * Öğretmenin seçtiği sınıftaki öğrencileri (TC olmadan) döner.
     */
    public function teacherStudentsByClassroom(Request $request, Classroom $classroom): JsonResponse
    {
        $user = $request->user();
        $roleName = $user && $user->role ? $user->role->name : null;

        if (! $this->isTeacherRole($roleName)) {
            return $this->error('Bu endpoint sadece öğretmen kullanıcılar içindir.', [], 403);
        }

        if ((int) $classroom->tenant_id !== (int) $user->tenant_id) {
            return $this->error('Sınıf bulunamadı.', [], 404);
        }

        if ($this->teacherCannotAccessClassroom((int) $classroom->id)) {
            return $this->error('Bu sınıfa erişim yetkiniz yok.', [], 403);
        }

        $query = Student::with(['city', 'district', 'classroom.branch.campus', 'classroom.educationLevel.campus', 'educationLevel.campus', 'guardians']);
        $query->where('tenant_id', $user->tenant_id);
        $query->where('classroom_id', $classroom->id);
        $query->orderBy('name');

        $campusIds = array_filter(array_map('intval', (array) ($user->campus_ids ?? [])));
        $educationLevelIds = array_filter(array_map('intval', (array) ($user->education_level_ids ?? [])));

        if (!empty($campusIds) && !$this->isGuidanceRole($user)) {
            $query->where(function ($q) use ($campusIds) {
                $q->whereHas('classroom.educationLevel', function ($q2) use ($campusIds) {
                    $q2->whereIn('campus_id', $campusIds);
                })->orWhereHas('educationLevel', function ($q2) use ($campusIds) {
                    $q2->whereIn('campus_id', $campusIds);
                });
            });
        }

        if (!empty($educationLevelIds) && !$this->isGuidanceRole($user)) {
            $query->where(function ($q) use ($educationLevelIds) {
                $q->whereHas('classroom', function ($q2) use ($educationLevelIds) {
                    $q2->whereIn('education_level_id', $educationLevelIds)
                       ->orWhereIn('grade_level', array_map('strval', $educationLevelIds));
                })->orWhereIn('education_level_id', $educationLevelIds);
            });
        }


        $students = $query->get();

        return $this->success([
            'classroom' => [
                'id' => $classroom->id,
                'name' => $classroom->name,
            ],
            'students' => StudentResource::collection($students),
        ], 'Sınıf öğrenci listesi başarıyla getirildi.');
    }

    /**
     * Öğretmen/Rehberlik için tüm öğrencileri (filtrelenebilir) döner.
     * Counseling sayfasındaki gibi toplu listeleme sağlar.
     */
    public function teacherAllStudents(Request $request): JsonResponse
    {
        $user = $request->user();
        $roleName = $user && $user->role ? $user->role->name : null;

        if (!$this->isTeacherRole($roleName)) {
            return $this->error('Bu endpoint sadece öğretmen/rehberlik içindir.', [], 403);
        }

        $query = Student::with(['city', 'district', 'classroom.branch.campus', 'classroom.educationLevel.campus', 'educationLevel.campus', 'guardians'])
            ->where('students.tenant_id', $user->tenant_id);

        // Join for filtering efficiency if needed
        $query->leftJoin('classrooms as c', 'students.classroom_id', '=', 'c.id')
              ->leftJoin('education_levels as cel', 'c.education_level_id', '=', 'cel.id')
              ->select('students.*')
              ->distinct();

        // Base restrictions for Guidance Roles (if any)
        if ($this->isGuidanceRole($user)) {
            $campusIds = array_filter(array_map('intval', (array) ($user->campus_ids ?? [])));
            $educationLevelIds = array_filter(array_map('intval', (array) ($user->education_level_ids ?? [])));

            if (!empty($campusIds)) {
                $query->whereIn('cel.campus_id', $campusIds);
            }
            if (!empty($educationLevelIds)) {
                $query->whereIn('c.education_level_id', $educationLevelIds)
                      ->orWhereIn('c.grade_level', array_map('strval', $educationLevelIds));
            }
        } else {
            // Regular teachers only see their own classrooms
            $allowedClassroomIds = $this->teacherAllowedClassroomIds($user);
            if (empty($allowedClassroomIds)) {
                $query->whereRaw('1 = 0');
            } else {
                $query->whereIn('students.classroom_id', $allowedClassroomIds);
            }
        }

        // Apply Request Filters (Align with Counseling Page)
        if ($request->filled('campus_id')) {
            $query->where('cel.campus_id', (int) $request->campus_id);
        }

        if ($request->filled('education_level_id')) {
            $levelId = (int) $request->education_level_id;
            $query->where(function($q) use ($levelId) {
                $q->where('c.education_level_id', $levelId)
                  ->orWhere('c.grade_level', (string)$levelId);
            });
        }

        if ($request->filled('classroom_id')) {
            $query->where('students.classroom_id', (int) $request->classroom_id);
        }

        if ($request->filled('search')) {
            $search = $request->search;
            $query->where(function ($q) use ($search) {
                $q->where('students.name', 'like', "%{$search}%")
                  ->orWhere('students.school_no', 'like', "%{$search}%")
                  ->orWhere('students.tc_no', 'like', "%{$search}%");
            });
        }

        $perPage = $request->get('per_page', 20);
        $students = $query->orderBy('students.name')->paginate($perPage);

        return $this->success([
            'students' => StudentResource::collection($students),
            'pagination' => [
                'current_page' => $students->currentPage(),
                'last_page' => $students->lastPage(),
                'per_page' => $students->perPage(),
                'total' => $students->total(),
            ]
        ], 'Öğretmen öğrenci listesi başarıyla getirildi.');
    }

    /**
     * Öğretmen/Rehberlik için filtre verilerini (Kampüs, Kademe) döner.
     */
    public function teacherFilterData(Request $request): JsonResponse
    {
        $user = $request->user();
        if (!$user) return $this->error('Kullanıcı bulunamadı.', [], 401);

        $campusIds = array_filter(array_map('intval', (array) ($user->campus_ids ?? [])));
        $educationLevelIds = array_filter(array_map('intval', (array) ($user->education_level_ids ?? [])));

        $campusesQuery = Campus::where('tenant_id', $user->tenant_id);
        if (!empty($campusIds)) {
            $campusesQuery->whereIn('id', $campusIds);
        }
        $campuses = $campusesQuery->get(['id', 'name']);

        $levelsQuery = EducationLevel::where('tenant_id', $user->tenant_id);
        if (!empty($campusIds)) {
            $levelsQuery->whereIn('campus_id', $campusIds);
        }
        if (!empty($educationLevelIds)) {
             $levelsQuery->where(function ($q) use ($educationLevelIds) {
                $q->whereIn('id', $educationLevelIds)
                  ->orWhereIn('grade_level', array_map('strval', $educationLevelIds));
            });
        }
        $levels = $levelsQuery->get(['id', 'name', 'campus_id']);

        return $this->success([
            'campuses' => $campuses,
            'education_levels' => $levels,
        ], 'Filtre verileri başarıyla getirildi.');
    }

    /**
     * Müdür rolündeki kullanıcının bu sınıfa (kampüs/kademe kapsamında) erişip erişemeyeceğini kontrol eder.
     */
    private function mudurCannotAccessClassroom(int $classroomId): bool
    {
        $user = auth()->user();
        if (!$user || !$user->role || !in_array($user->role->name, ['Müdür', 'Müdür Yardımcısı', 'Öğrenci İşleri', 'student_affairs', 'Rehberlik', 'guidance', 'Rehber Öğretmen', 'rehber_teacher', 'guidance_teacher'], true)) {
            return false;
        }
        $classroom = Classroom::with('educationLevel')->find($classroomId);
        if (!$classroom) {
            return true;
        }
        $campusIds = array_filter(array_map('intval', (array) ($user->campus_ids ?? [])));
        $educationLevelIds = array_filter(array_map('intval', (array) ($user->education_level_ids ?? [])));
        $campusOk = empty($campusIds) || ($classroom->educationLevel && in_array((int) $classroom->educationLevel->campus_id, $campusIds, true));
        $levelOk = empty($educationLevelIds) || in_array((int) $classroom->grade_level, $educationLevelIds, true);
        return !$campusOk || !$levelOk;
    }

    /**
     * Update the specified student in storage.
     *
     * @param  StoreStudentRequest  $request
     * @param  int  $id
     * @return JsonResponse
     */
    public function update(StoreStudentRequest $request, int $id): JsonResponse
    {
        $student = Student::find($id);

        if (!$student) {
            return $this->error('Öğrenci bulunamadı.', [], 404);
        }

        if ($this->mudurCannotAccessStudent($student)) {
            return $this->error('Bu öğrenciye erişim yetkiniz yok.', [], 403);
        }

        $data = $request->validated();
        // Müdür öğrenciyi sadece kendi kapsamındaki bir sınıfa taşıyabilir
        if (!empty($data['classroom_id']) && $this->mudurCannotAccessClassroom((int) $data['classroom_id'])) {
            return $this->error('Bu sınıfa atama yetkiniz yok.', [], 403);
        }

        try {
            if (isset($data['student_name'])) {
                $data['name'] = $data['student_name'];
                unset($data['student_name']);
            }
            if (array_key_exists('password', $data)) {
                if (!empty($data['password'])) {
                    $data['password'] = Hash::make($data['password']);
                } else {
                    unset($data['password']);
                }
            }
            $guardians = $data['guardians'] ?? null;
            unset($data['guardians']);
            $siblingIds = $data['sibling_ids'] ?? $request->input('sibling_ids') ?? null;
            unset($data['sibling_ids']);
            $student->update($data);

            $action = new CreateStudentAction();
            $guardianPasswords = $action->syncGuardiansForStudent($student, $guardians);
            $action->syncSiblingsForStudent($student, $siblingIds);
            $student->load([
                'guardians',
                'siblings' => function ($q) {
                    $q->withoutGlobalScope(SeasonScope::class)->with('classroom');
                },
                'classroom' => function ($q) {
                    $q->with([
                        'branch' => function ($q2) {
                            $q2->with('campus');
                        },
                        'educationLevel'
                    ]);
                }
            ]);

            $response = ['student' => new StudentResource($student)];
            if (!empty($guardianPasswords)) {
                $response['guardian_passwords'] = $guardianPasswords;
            }
            return $this->success($response, 'Öğrenci başarıyla güncellendi.');
        } catch (\Exception $e) {
            \Log::error('StudentController@update error: ' . $e->getMessage(), ['trace' => $e->getTraceAsString()]);
            $friendlyMessage = 'Öğrenci güncellenirken beklenmeyen bir hata oluştu. Lütfen bilgilerinizi kontrol edip tekrar deneyiniz.';
            $rawMsg = $e->getMessage();
            if ($e instanceof \Illuminate\Database\QueryException || str_contains($rawMsg, 'SQLSTATE')) {
                if (str_contains($rawMsg, "Column 'name' cannot be null") || str_contains($rawMsg, 'guardians')) {
                    $friendlyMessage = 'Veli adı soyadı alanı boş bırakılamaz. Lütfen veli bilgilerini kontrol ediniz.';
                } elseif (str_contains($rawMsg, 'Duplicate entry')) {
                    $friendlyMessage = 'Girdiğiniz T.C. Kimlik Numarası veya Okul Numarası başka bir kayıtta mevcuttur.';
                }
            }
            return $this->error($friendlyMessage, [], 500);
        }
    }

    /**
     * Toggles the active status of the specified student.
     *
     * @param  int  $id
     * @return JsonResponse
     */
    public function toggleActive(int $id): JsonResponse
    {
        $student = Student::find($id);

        if (!$student) {
            return $this->error('Öğrenci bulunamadı.', [], 404);
        }

        if ($this->mudurCannotAccessStudent($student)) {
            return $this->error('Bu öğrenciye erişim yetkiniz yok.', [], 403);
        }

        try {
            $student->update(['is_active' => !$student->is_active]);
            return $this->success(['student' => new StudentResource($student)], 'Öğrenci durumu başarıyla güncellendi.');
        } catch (\Exception $e) {
            return $this->error('Öğrenci durumu güncellenirken bir hata oluştu: ' . $e->getMessage(), [], 500);
        }
    }

    /**
     * Remove the specified student from storage.
     *
     * @param  int  $id
     * @return JsonResponse
     */
    public function destroy(int $id): JsonResponse
    {
        $student = Student::find($id);

        if (!$student) {
            return $this->error('Öğrenci bulunamadı.', [], 404);
        }

        if ($this->mudurCannotAccessStudent($student)) {
            return $this->error('Bu öğrenciye erişim yetkiniz yok.', [], 403);
        }

        try {
            $student->delete();
            return $this->success([], 'Öğrenci başarıyla silindi.');
        } catch (\Exception $e) {
            return $this->error('Öğrenci silinirken bir hata oluştu: ' . $e->getMessage(), [], 500);
        }
    }

    public function bulkDelete(Request $request): JsonResponse
    {
        $user = $request->user();
        if (! $user) {
            return $this->error('Kullanıcı giriş yapmamış.', [], 401);
        }

        $studentIds = $request->input('student_ids', []);
        if (! is_array($studentIds) || empty($studentIds)) {
            return $this->error('student_ids zorunludur.', [], 422);
        }

        $studentIds = array_values(array_unique(array_filter(array_map('intval', $studentIds), static fn ($id) => $id > 0)));
        if (empty($studentIds)) {
            return $this->error('Geçerli student_ids bulunamadı.', [], 422);
        }

        $deleteEmptyClassrooms = (bool) $request->boolean('delete_empty_classrooms', false);

        $students = Student::query()
            ->whereIn('id', $studentIds)
            ->get(['id', 'tenant_id', 'classroom_id']);

        if ($students->isEmpty()) {
            return $this->success([
                'deleted_students' => 0,
                'deleted_classrooms' => 0,
            ], 'Silinecek öğrenci bulunamadı.');
        }

        // Yetki: toplu silme için en azından students.delete yetkisi olmalı
        if (! $user->hasPermission('students.delete') && ! ($user->is_superadmin || ($user->role && $user->role->name === 'owner'))) {
            return $this->error('Bu işlem için yetkiniz bulunmamaktadır.', [], 403);
        }

        // Tenant / scope kontrolleri (müdür kapsamı)
        foreach ($students as $student) {
            if ($this->mudurCannotAccessStudent($student)) {
                return $this->error('Seçilen öğrencilerden en az birine erişim yetkiniz yok.', [], 403);
            }
        }

        $classroomIds = $students
            ->pluck('classroom_id')
            ->filter(static fn ($id) => $id !== null)
            ->map(static fn ($id) => (int) $id)
            ->filter(static fn ($id) => $id > 0)
            ->unique()
            ->values()
            ->all();

        try {
            $result = DB::transaction(function () use ($students, $studentIds, $deleteEmptyClassrooms, $classroomIds) {
                $deletedStudents = Student::query()->whereIn('id', $studentIds)->delete();

                $deletedClassrooms = 0;
                if ($deleteEmptyClassrooms && ! empty($classroomIds)) {
                    // Sadece öğrenciler silindikten sonra boş kalan sınıfları sil
                    $emptyClassroomIds = Classroom::query()
                        ->whereIn('id', $classroomIds)
                        ->withCount('students')
                        ->get(['id'])
                        ->filter(static fn ($c) => (int) $c->students_count === 0)
                        ->pluck('id')
                        ->map(static fn ($id) => (int) $id)
                        ->all();

                    if (! empty($emptyClassroomIds)) {
                        $deletedClassrooms = Classroom::query()->whereIn('id', $emptyClassroomIds)->delete();
                    }
                }

                return [
                    'deleted_students' => (int) $deletedStudents,
                    'deleted_classrooms' => (int) $deletedClassrooms,
                ];
            });

            return $this->success($result, 'Toplu silme işlemi başarıyla tamamlandı.');
        } catch (\Throwable $e) {
            return $this->error('Toplu silme sırasında hata oluştu: ' . $e->getMessage(), [], 500);
        }
    }

    /**
     * Reset password for the specified student.
     *
     * @param Request $request
     * @param int $id
     * @return JsonResponse
     */
    public function resetPassword(Request $request, int $id): JsonResponse
    {
        $user = $request->user();
        if (!$user) {
            return $this->error('Kullanıcı giriş yapmamış.', [], 401);
        }

        $isSuperAdmin = $user->is_superadmin || (method_exists($user, 'isSuperAdmin') && $user->isSuperAdmin());
        $canUpdate = $isSuperAdmin 
            || ($user->role && in_array($user->role->name, ['owner', 'admin', 'general_manager'], true))
            || $user->hasPermission('students.update');

        if (!$canUpdate) {
            return $this->error('Bu işlem için yetkiniz bulunmamaktadır.', [], 403);
        }

        $student = Student::find($id);
        if (!$student) {
            return $this->error('Öğrenci bulunamadı.', [], 404);
        }

        // Tenant kontrolü
        if (!$isSuperAdmin && (int) $student->tenant_id !== (int) $user->tenant_id) {
            return $this->error('Bu öğrenciye erişim yetkiniz yok.', [], 403);
        }

        // Müdür kapsamı kontrolü
        if ($this->mudurCannotAccessStudent($student)) {
            return $this->error('Bu öğrenciye erişim yetkiniz yok.', [], 403);
        }

        $request->validate([
            'password' => ['nullable', 'string', 'min:4', 'max:50'],
        ]);

        $customPassword = $request->input('password');
        $newPassword = !empty(trim((string)$customPassword)) 
            ? trim((string)$customPassword) 
            : (string) rand(100000, 999999);

        try {
            $hashed = Hash::make($newPassword);
            $student->password = $hashed;
            $student->is_portal_active = true;
            $student->save();

            // Tüm sezonlardaki kayıtlarını güncelle
            if (!empty($student->tc_no)) {
                Student::withoutGlobalScope(SeasonScope::class)
                    ->where('tc_no', $student->tc_no)
                    ->update([
                        'password' => $hashed,
                        'is_portal_active' => true,
                    ]);
            }

            // Öğrencinin velilerinin şifresini de senkronize et
            $student->guardians()->update(['password' => $hashed]);

            return $this->success([
                'student_id' => $student->id,
                'student_name' => $student->name,
                'tc_no' => $student->tc_no,
                'password' => $newPassword,
            ], 'Öğrenci şifresi başarıyla sıfırlandı.');
        } catch (\Exception $e) {
            return $this->error('Şifre sıfırlanırken hata oluştu: ' . $e->getMessage(), [], 500);
        }
    }
}
