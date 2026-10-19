<?php
ini_set('display_errors', 1);
error_reporting(E_ALL);
header('Content-Type: application/json; charset=utf-8');
header('Access-Control-Allow-Origin: *');

$results = [];

// 1. Dosya güncelleme: TutoringSessionPolicy.php
$tutoringSessionPolicyPath = __DIR__ . '/../app/Policies/TutoringSessionPolicy.php';
$localPolicy = <<<'PHP'
<?php

namespace App\Policies;

use App\Models\TutoringSession;
use App\Models\User;

class TutoringSessionPolicy
{
    private array $teacherRoles = [
        'öğretmen', 'ogretmen', 'sınıf öğretmeni', 'sinif ogretmeni', 'teacher',
        'rehberlik', 'guidance', 'rehber öğretmen', 'rehber ogretmen',
        'rehber_teacher', 'guidance_teacher',
    ];

    private array $managerRoles = [
        'owner', 'kurucu', 'kurum sahibi', 'institution_owner',
        'genel müdür', 'genel mudur', 'kampüs müdürü', 'kampus muduru',
        'müdür', 'mudur', 'müdür yardımcısı', 'mudur yardimcisi',
        'general_manager', 'campus_manager', 'school_principal',
        'admin', 'superadmin', 'yönetici', 'yonetici', 'manager',
        'öğrenci işleri', 'student_affairs',
    ];

    private function isManager(?User $user): bool
    {
        if (!$user) {
            return false;
        }

        if ($user->is_superadmin || (method_exists($user, 'isSuperAdmin') && $user->isSuperAdmin())) {
            return true;
        }

        if (!empty($user->role_id) && in_array((int) $user->role_id, [1, 2, 3, 4], true)) {
            return true;
        }

        $roleName = $user->role ? mb_strtolower(trim((string) $user->role->name), 'UTF-8') : '';
        return $roleName !== '' && in_array($roleName, $this->managerRoles, true);
    }

    private function isTeacher(?User $user): bool
    {
        if (!$user) {
            return false;
        }

        if (!empty($user->role_id) && in_array((int) $user->role_id, [5, 6], true)) {
            return true;
        }

        $roleName = $user->role ? mb_strtolower(trim((string) $user->role->name), 'UTF-8') : '';
        if ($roleName === '') {
            return false;
        }

        if (in_array($roleName, $this->teacherRoles, true)) {
            return true;
        }

        return str_contains($roleName, 'öğretmen')
            || str_contains($roleName, 'ogretmen')
            || str_contains($roleName, 'teacher')
            || str_contains($roleName, 'rehber');
    }

    /**
     * Determine if the user can view any tutoring sessions.
     */
    public function viewAny(?User $user): bool
    {
        return true;
    }

    /**
     * Determine if the user can view the tutoring session.
     */
    public function view(User $user, TutoringSession $tutoringSession): bool
    {
        if ($user->tenant_id && $tutoringSession->tenant_id && (int) $user->tenant_id !== (int) $tutoringSession->tenant_id && !$user->is_superadmin) {
            return false;
        }

        if ($this->isManager($user)) {
            return true;
        }

        // İlgili öğretmen veya oturumu oluşturan kişi görebilir
        if ((int) $tutoringSession->teacher_id === (int) $user->id || (int) $tutoringSession->created_by === (int) $user->id) {
            return true;
        }

        if ($this->isTeacher($user)) {
            return (int) $tutoringSession->teacher_id === (int) $user->id
                || $user->hasAnyPermission(['tutoring.read', 'tutoring.view', 'academic.read']);
        }

        return $user->hasAnyPermission(['tutoring.read', 'tutoring.view', 'academic.read']) || $user->is_superadmin;
    }

    /**
     * Determine if the user can create tutoring sessions.
     */
    public function create(User $user): bool
    {
        if ($this->isManager($user) || $this->isTeacher($user)) {
            return true;
        }

        return $user->hasAnyPermission(['tutoring.create', 'academic.create']) || $user->is_superadmin;
    }

    /**
     * Determine if the user can update the tutoring session.
     */
    public function update(User $user, TutoringSession $tutoringSession): bool
    {
        if ($user->tenant_id && $tutoringSession->tenant_id && (int) $user->tenant_id !== (int) $tutoringSession->tenant_id && !$user->is_superadmin) {
            return false;
        }

        if ($this->isManager($user)) {
            return true;
        }

        // İlgili öğretmen veya oturumu oluşturan kişi güncelleyebilir
        if ((int) $tutoringSession->teacher_id === (int) $user->id || (int) $tutoringSession->created_by === (int) $user->id) {
            return true;
        }

        return $user->hasAnyPermission(['tutoring.update', 'academic.update']) || $user->is_superadmin;
    }

    /**
     * Determine if the user can delete the tutoring session.
     */
    public function delete(User $user, TutoringSession $tutoringSession): bool
    {
        if ($user->tenant_id && $tutoringSession->tenant_id && (int) $user->tenant_id !== (int) $tutoringSession->tenant_id && !$user->is_superadmin) {
            return false;
        }

        if ($this->isManager($user)) {
            return true;
        }

        // İlgili öğretmen veya oturumu oluşturan kişi silebilir
        if ((int) $tutoringSession->teacher_id === (int) $user->id || (int) $tutoringSession->created_by === (int) $user->id) {
            return true;
        }

        return $user->hasAnyPermission(['tutoring.delete', 'academic.delete']) || $user->is_superadmin;
    }
}
PHP;

if (file_put_contents($tutoringSessionPolicyPath, $localPolicy)) {
    $results['TutoringSessionPolicy.php'] = 'GÜNCELLENDİ (Yetki ve rol izinleri düzeltildi)';
} else {
    $results['TutoringSessionPolicy.php'] = 'YAZMA HATASI';
}

// 2. Dosya güncelleme: TutoringSessionResource.php
$tutoringSessionResourcePath = __DIR__ . '/../app/Http/Resources/TutoringSessionResource.php';
$localResource = <<<'PHP'
<?php

namespace App\Http\Resources;

use App\Http\Resources\LessonResource;
use App\Http\Resources\HomeworkResource;
use App\Http\Resources\StudentResource;
use App\Http\Resources\TutoringSessionAttendanceResource;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class TutoringSessionResource extends JsonResource
{
    /**
     * Transform the resource into an array.
     *
     * @return array<string, mixed>
     */
    public function toArray($request): array
    {
        $user = (is_object($request) && method_exists($request, 'user')) ? $request->user() : auth()->user();

        return [
            'id' => $this->id,
            'type' => $this->type,
            'type_label' => $this->getTypeLabel(),
            'title' => $this->title,
            'date' => $this->date?->format('Y-m-d'),
            'start_time' => $this->start_time?->format('H:i'),
            'end_time' => $this->end_time?->format('H:i'),
            'duration' => $this->duration,
            'room' => $this->room,
            'remote_link' => $this->when($this->hasRemoteLink(), $this->remote_link),
            'max_students' => $this->max_students,
            'available_spots' => $this->getAvailableSpots(),
            'is_full' => $this->isFull(),
            'weekly_max_count' => $this->weekly_max_count,
            'is_active' => $this->is_active,
            'notes' => $this->when($user && ($user->is_superadmin || $user->hasAnyPermission(['tutoring.view_notes', 'tutoring.read', 'academic.read']) || ((int) $user->id === (int) $this->teacher_id)), $this->notes),
            'teacher' => $this->whenLoaded('teacher', fn() => [
                'id' => $this->teacher->id,
                'name' => $this->teacher->name,
                'email' => $this->teacher->email,
            ]),
            'lesson' => $this->whenLoaded('lesson', fn() => new LessonResource($this->lesson)),
            'homework' => $this->whenLoaded('homework', fn() => new HomeworkResource($this->homework)),
            'students' => StudentResource::collection($this->whenLoaded('students')),
            'students_count' => $this->whenLoaded('students', fn() => $this->students->count()),
            'attendances' => TutoringSessionAttendanceResource::collection($this->whenLoaded('attendances')),
            'creator' => $this->whenLoaded('creator', fn() => [
                'id' => $this->creator->id,
                'name' => $this->creator->name,
                'email' => $this->creator->email,
            ]),
            'created_at' => $this->created_at?->toISOString(),
            'updated_at' => $this->updated_at?->toISOString(),
        ];
    }

    /**
     * Get human-readable type label.
     */
    protected function getTypeLabel(): string
    {
        return match ($this->type) {
            'tutoring' => 'Etüt',
            'extra_lesson' => 'Ek Ders',
            'private_lesson' => 'Özel Ders',
            'class_tutoring' => 'Sınıf Etütü',
            'seminar' => 'Seminer',
            default => ucfirst($this->type),
        };
    }
}
PHP;

if (file_put_contents($tutoringSessionResourcePath, $localResource)) {
    $results['TutoringSessionResource.php'] = 'GÜNCELLENDİ (toArray ve not izinleri düzeltildi)';
} else {
    $results['TutoringSessionResource.php'] = 'YAZMA HATASI';
}

// 3. Dosya güncelleme: TutoringSessionController.php
$controllerPath = __DIR__ . '/../app/Http/Controllers/TutoringSessionController.php';
if (file_exists($controllerPath)) {
    $cContent = file_get_contents($controllerPath);
    if (!str_contains($cContent, 'Bu işlem için yetkiniz bulunmuyor.')) {
        $search = <<<'PHP'
    public function show(TutoringSession $tutoringSession): JsonResponse
    {
        Gate::authorize('view', $tutoringSession);

        $tutoringSession->load(['teacher', 'lesson', 'homework', 'students', 'attendances.student', 'creator']);

        return $this->success(new TutoringSessionResource($tutoringSession));
    }
PHP;
        $replace = <<<'PHP'
    public function show(TutoringSession $tutoringSession): JsonResponse
    {
        try {
            Gate::authorize('view', $tutoringSession);

            $tutoringSession->load(['teacher', 'lesson', 'homework', 'students', 'attendances.student', 'creator']);

            return $this->success(new TutoringSessionResource($tutoringSession));
        } catch (\Illuminate\Auth\Access\AuthorizationException $e) {
            return $this->error('Bu işlem için yetkiniz bulunmuyor.', [], 403);
        }
    }
PHP;
        $cContent = str_replace($search, $replace, $cContent);
        file_put_contents($controllerPath, $cContent);
        $results['TutoringSessionController.php'] = 'GÜNCELLENDİ (try-catch eklendi)';
    } else {
        $results['TutoringSessionController.php'] = 'ZATEN GÜNCEL';
    }
}

// 4. Test: Laravel'i bootstrap edip test et
try {
    require __DIR__ . '/../vendor/autoload.php';
    $app = require_once __DIR__ . '/../bootstrap/app.php';
    
    $kernel = $app->make(\Illuminate\Contracts\Console\Kernel::class);
    $kernel->bootstrap();

    // User 1 (Ali Özlük - Owner) ile oturum aç ve oturum 8'i sorgula
    $user = \App\Models\User::find(1);
    if ($user) {
        \Illuminate\Support\Facades\Auth::login($user);
    }

    $session = \App\Models\TutoringSession::find(8);
    if ($session && $user) {
        $canView = $user->can('view', $session);
        $controller = $app->make(\App\Http\Controllers\TutoringSessionController::class);
        $response = $controller->show($session);

        $results['tutoring_show_8_test'] = [
            'status' => 'SUCCESS',
            'user' => $user->name,
            'role' => $user->role?->name,
            'can_view_gate' => $canView,
            'http_code' => $response->getStatusCode(),
            'session_title' => $session->title,
        ];
    } else {
        $results['tutoring_show_8_test'] = [
            'status' => 'SESSION_OR_USER_NOT_FOUND',
        ];
    }

    // Önbellek temizle
    try {
        \Illuminate\Support\Facades\Artisan::call('route:clear');
        \Illuminate\Support\Facades\Artisan::call('cache:clear');
        $results['cache_clear'] = 'BAŞARILI';
    } catch (\Throwable $te) {
        $results['cache_clear'] = $te->getMessage();
    }
} catch (\Throwable $e) {
    $results['tutoring_show_8_test'] = [
        'status' => 'ERROR',
        'message' => $e->getMessage(),
        'file' => $e->getFile(),
        'line' => $e->getLine()
    ];
}

echo json_encode([
    'success' => true,
    'file_updates' => $results,
    'instructions' => 'Düzeltmeler tamamlandı. İnceledikten sonra bu dosyayı (public/debug_tutoring.php) güvenlik için silebilirsiniz.'
], JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
