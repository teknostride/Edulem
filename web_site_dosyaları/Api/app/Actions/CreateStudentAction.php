<?php

namespace App\Actions;

use App\Models\Guardian;
use App\Models\Student;
use Illuminate\Http\JsonResponse;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Str;

class CreateStudentAction
{
    /**
     * Execute the action to create a student with guardians.
     *
     * @param  array  $studentData
     * @return JsonResponse
     * @throws \Exception
     */
    public function execute(array $studentData): JsonResponse
    {
        try {
            $user = auth()->user();

            // Sınıf bilgilerini al (kapasite kontrolü için) - classroom_id NULL ise kapasite kontrolü yapma
            $classroom = null;
            if (!empty($studentData['classroom_id'])) {
                $classroom = \App\Models\Classroom::with('educationLevel')->find($studentData['classroom_id']);
            }
            
            // Sınıf varsa ve kullanıcı müdür/yönetici ise kapsam kontrolü yap
            if ($classroom) {
                // Müdür / Müdür Yardımcısı: Sadece atandığı kampüs ve kademelere öğrenci ekleyebilir
                if ($user && $user->role && in_array($user->role->name, ['Müdür', 'Müdür Yardımcısı', 'Öğrenci İşleri', 'student_affairs'], true)) {
                    $campusIds = array_filter(array_map('intval', (array) ($user->campus_ids ?? [])));
                    $educationLevelIds = array_filter(array_map('intval', (array) ($user->education_level_ids ?? [])));
                    $campusOk = empty($campusIds) || ($classroom->educationLevel && in_array((int) $classroom->educationLevel->campus_id, $campusIds, true));
                    $levelOk = empty($educationLevelIds) || in_array((int) $classroom->grade_level, $educationLevelIds, true);
                    if (!$campusOk || !$levelOk) {
                        return response()->json([
                            'status' => false,
                            'message' => 'Bu kampüs veya kademeye öğrenci ekleme yetkiniz yok.'
                        ], 403);
                    }
                }

                // Kapasite kontrolü - ignore_capacity bayrağı yoksa yap
                if (!($studentData['ignore_capacity'] ?? false)) {
                    $currentStudents = Student::where('classroom_id', $studentData['classroom_id'])->count();
                    if ($currentStudents >= $classroom->capacity) {
                        return response()->json([
                            'status' => false,
                            'message' => 'Sınıf kapasitesi dolu! Mevcut: ' . $currentStudents . ', Kapasite: ' . $classroom->capacity
                        ], 400);
                    }
                }
            }

            // Tenant ID kontrolü
            if (!$user) {
                \Log::error('CreateStudentAction: User not authenticated');
                return response()->json([
                    'status' => false,
                    'message' => 'Kullanıcı giriş yapmamış.'
                ], 401);
            }
            
            $tenantId = $user->tenant_id;
            if (!$tenantId || $tenantId === 0 || $tenantId === '0' || $tenantId === null) {
                \Log::error('CreateStudentAction: Tenant ID is invalid', [
                    'user_id' => $user->id,
                    'user_email' => $user->email,
                    'tenant_id_value' => $tenantId,
                    'tenant_id_type' => gettype($tenantId)
                ]);
                return response()->json([
                    'status' => false,
                    'message' => 'Kullanıcı tenant bilgisi bulunamadı. Lütfen sistem yöneticisi ile iletişime geçin.'
                ], 400);
            }

            \Log::info('CreateStudentAction: Creating student', [
                'tenant_id' => $tenantId,
                'student_name' => $studentData['student_name'],
                'tenant_id_type' => gettype($tenantId),
                'tenant_id_value' => $tenantId
            ]);

            // Öğrenciyi kaydet - tenant_id ve sütun adı eşlemesi (veritabanında 'name', API'de 'student_name')
            $studentData['tenant_id'] = (int)$tenantId;
            if (isset($studentData['student_name'])) {
                $studentData['name'] = $studentData['student_name'];
                unset($studentData['student_name']);
            }
            $guardians = $studentData['guardians'] ?? null;
            unset($studentData['guardians']);
            $siblingIds = $studentData['sibling_ids'] ?? null;
            unset($studentData['sibling_ids']);

            \Log::info('CreateStudentAction: Student data before create', [
                'tenant_id_in_data' => $studentData['tenant_id'],
                'all_keys' => array_keys($studentData)
            ]);

            $student = Student::create($studentData);

            $guardianPasswords = $this->syncGuardiansForStudent($student, $guardians);
            $this->syncSiblingsForStudent($student, $siblingIds);
            $student->load(['guardians', 'siblings']);

            $response = [
                'status' => true,
                'data' => $student,
                'message' => 'Öğrenci başarıyla oluşturuldu.',
            ];
            if (!empty($guardianPasswords)) {
                $response['guardian_passwords'] = $guardianPasswords;
                $response['message'] .= ' Veli girişi için oluşturulan şifreleri velilere iletin.';
            }

            return response()->json($response, 201);
        } catch (\Exception $e) {
            \Log::error('CreateStudentAction: Öğrenci oluşturma hatası', [
                'error' => $e->getMessage(),
                'file' => $e->getFile(),
                'line' => $e->getLine(),
            ]);

            $friendlyMessage = 'Öğrenci kaydedilirken bir hata oluştu. Lütfen bilgileri kontrol edip tekrar deneyiniz.';
            $rawMsg = $e->getMessage();
            if ($e instanceof \Illuminate\Database\QueryException || str_contains($rawMsg, 'SQLSTATE')) {
                if (str_contains($rawMsg, "Column 'name' cannot be null") || str_contains($rawMsg, 'guardians')) {
                    $friendlyMessage = 'Veli adı soyadı alanı boş bırakılamaz. Lütfen veli bilgilerini kontrol ediniz.';
                } elseif (str_contains($rawMsg, 'Duplicate entry')) {
                    if (str_contains($rawMsg, 'school_no')) {
                        $friendlyMessage = 'Bu okul numarası ile kayıtlı başka bir öğrenci zaten mevcuttur.';
                    } elseif (str_contains($rawMsg, 'tc_no')) {
                        $friendlyMessage = 'Bu T.C. Kimlik Numarası sistemde başka bir kayıtta mevcuttur.';
                    } else {
                        $friendlyMessage = 'Girdiğiniz bilgilerden biri sistemde zaten kayıtlıdır.';
                    }
                }
            } elseif ($e instanceof \Illuminate\Validation\ValidationException) {
                $friendlyMessage = $e->validator->errors()->first() ?? $friendlyMessage;
            }

            return response()->json([
                'status' => false,
                'message' => $friendlyMessage
            ], 500);
        }
    }

    /**
     * Veli listesini öğrenciye bağla: guardians tablosunda yoksa oluştur, portal şifresi ata, öğrenci-veli ilişkisini sync et.
     * Güncellemede kullanıldığında mevcut veli listesini bu liste ile değiştirir.
     *
     * @return array Yeni oluşturulan veliler için { name, phone, email, password } listesi
     */
    public function syncGuardiansForStudent(Student $student, ?array $guardians): array
    {
        $guardianPasswords = [];
        $syncMap = [];

        if (empty($guardians) || !is_array($guardians)) {
            $student->guardians()->sync([]);
            return [];
        }

        foreach ($guardians as $index => $g) {
            $guardianId = isset($g['id']) && is_string($g['id']) && trim($g['id']) !== '' ? trim($g['id']) : null;
            $tcNo = isset($g['tc_no']) ? preg_replace('/\D/', '', (string) $g['tc_no']) : null;
            $hasValidTc = $tcNo !== null && $tcNo !== '' && strlen($tcNo) === 11;
            $name = trim($g['name'] ?? '');
            $phone = isset($g['phone']) ? trim((string) $g['phone']) : null;
            $email = isset($g['email']) ? trim((string) $g['email']) : null;
            if ($email === '') {
                $email = null;
            }
            $job = isset($g['job']) ? trim((string) $g['job']) : null;
            if ($job === '') {
                $job = null;
            }
            $rawRelation = strtolower(trim((string) ($g['relation_type'] ?? 'other')));
            $relationType = match($rawRelation) {
                'anne', 'mother', 'mom' => 'mother',
                'baba', 'father', 'dad' => 'father',
                'vasi', 'guardian', 'legal_guardian' => 'guardian',
                default => $rawRelation ?: 'other'
            };
            $isLegalGuardian = (bool) ($g['is_legal_guardian'] ?? false);

            // Referans: veli adı veya telefonu ile de kaydedilebilir (TC/Email opsiyonel)
            if (!$hasValidTc && empty($email) && empty($name) && empty($phone) && empty($guardianId)) {
                continue;
            }

            $guardian = null;
            if ($guardianId) {
                $guardian = Guardian::find($guardianId);
            }
            if (!$guardian && $hasValidTc) {
                $guardian = Guardian::where('tc_no', $tcNo)->first();
            }
            if (!$guardian && $email) {
                $guardian = Guardian::where('email', $email)->first();
            }
            // İsim ve telefon eşleşmesi (opsiyonel ama mükerrer kaydı önlemek için iyi olur)
            if (!$guardian && $name && $phone) {
                $guardian = Guardian::where('name', $name)->where('phone', $phone)->first();
            }

            if (!$guardian) {
                $guardian = new Guardian();
                if ($hasValidTc) {
                    $guardian->tc_no = $tcNo;
                }
            }

            // Veli adı boşsa ve yeni veli oluşturuluyorsa fallback isim ata (MySQL NOT NULL hatasını önler)
            if (empty($name) && empty($guardian->name)) {
                $relationLabel = match($relationType) {
                    'mother' => 'Öğrenci Annesi',
                    'father' => 'Öğrenci Babası',
                    'guardian' => 'Öğrenci Vasisi',
                    default => 'Öğrenci Velisi'
                };
                $studentName = $student->name ?? $student->student_name ?? '';
                $name = $studentName ? "{$studentName} ({$relationLabel})" : $relationLabel;
            }

            $guardian->name = $name ?: ($guardian->name ?: 'Öğrenci Velisi');
            if (array_key_exists('phone', $g)) {
                $guardian->phone = $phone ?: null;
            }
            if (array_key_exists('email', $g)) {
                $guardian->email = $email ?: null;
            }
            if (array_key_exists('job', $g)) {
                $guardian->job = $job ?: null;
            }
            $guardian->is_portal_active = true;

            // Her veli için sabit portal şifresi: 123456
            if (!$guardian->password) {
                $guardian->password = Hash::make('123456');
                $guardianPasswords[] = [
                    'name' => $guardian->name,
                    'phone' => $guardian->phone,
                    'email' => $guardian->email,
                    'tc_no' => $guardian->tc_no,
                    'password' => '123456',
                ];
            }
            $guardian->save();

            $syncMap[$guardian->id] = [
                'relation_type' => $relationType,
                'is_legal_guardian' => $isLegalGuardian,
            ];
        }

        $student->guardians()->sync($syncMap);
        return $guardianPasswords;
    }

    /**
     * Kardeş öğrencileri student_siblings pivot tablosunda ve students.sibling_ids alanında senkronize et (çift yönlü/simetrik).
     */
    public function syncSiblingsForStudent(Student $student, ?array $siblingIds): void
    {
        if ($siblingIds === null) {
            return;
        }

        $validIds = array_values(array_unique(array_filter(array_map('intval', $siblingIds), fn($id) => $id > 0 && $id !== (int)$student->id)));

        // 1. Mevcut bağlantıları temizle (bu öğrenci ile ilgili her iki yön)
        \DB::table('student_siblings')->where('student_id', $student->id)->delete();
        \DB::table('student_siblings')->where('sibling_id', $student->id)->delete();

        // 2. Yeni çift yönlü bağlantıları ekle
        $now = now();
        $inserts = [];
        foreach ($validIds as $sibId) {
            $inserts[] = ['student_id' => $student->id, 'sibling_id' => $sibId, 'created_at' => $now, 'updated_at' => $now];
            $inserts[] = ['student_id' => $sibId, 'sibling_id' => $student->id, 'created_at' => $now, 'updated_at' => $now];
        }

        // Kardeşlerin birbirleri arasındaki bağlantıları da sağla (aile kümesi)
        foreach ($validIds as $id1) {
            foreach ($validIds as $id2) {
                if ($id1 !== $id2) {
                    $inserts[] = ['student_id' => $id1, 'sibling_id' => $id2, 'created_at' => $now, 'updated_at' => $now];
                }
            }
        }

        if (!empty($inserts)) {
            \DB::table('student_siblings')->insertOrIgnore($inserts);
        }

        // 3. İlgili tüm öğrencilerin sibling_ids JSON sütununu güncelle
        $allFamilyIds = array_merge([$student->id], $validIds);
        foreach ($allFamilyIds as $memberId) {
            $memberSiblings = \DB::table('student_siblings')
                ->where('student_id', $memberId)
                ->pluck('sibling_id')
                ->map('intval')
                ->values()
                ->toArray();

            \DB::table('students')
                ->where('id', $memberId)
                ->update(['sibling_ids' => json_encode($memberSiblings)]);
        }
    }
}
