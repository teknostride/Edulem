<?php

namespace App\Models;

use App\Traits\BelongsToTenant;
use App\Traits\HasCampusPermissions;
use App\Traits\HasBranchPermissions;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Foundation\Auth\User as Authenticatable;
use Illuminate\Notifications\Notifiable;
use Laravel\Sanctum\HasApiTokens;

class User extends Authenticatable
{
    use HasFactory, Notifiable, BelongsToTenant, HasApiTokens, HasCampusPermissions, HasBranchPermissions;

    /**
     * The attributes that are mass assignable.
     *
     * @var array<int, string>
     */
    protected $fillable = [
        'tenant_id',
        'tc_no',
        'name',
        'first_name',
        'last_name',
        'avatar',
        'birth_date',
        'wedding_anniversary_date',
        'email',
        'username',
        'phone',
        'password',
        'role_id',
        'is_superadmin',
        'saas_role',
        'theme_preference',
        'monochrome_mode',
        'campus_ids',
        'education_level_ids',
        'subjects',
        'teacher_type',
        'department',
        'is_active',
    ];

    /**
     * The attributes that should be hidden for serialization.
     *
     * @var array<int, string>
     */
    protected $hidden = [
        'password',
        'remember_token',
    ];

    /**
     * Get the attributes that should be cast.
     *
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return [
            'birth_date' => 'date',
            'wedding_anniversary_date' => 'date',
            'email_verified_at' => 'datetime',
            'password' => 'hashed',
            'is_superadmin' => 'boolean',
            'monochrome_mode' => 'boolean',
            'campus_ids' => 'array',
            'education_level_ids' => 'array',
            'subjects' => 'array',
            'is_active' => 'boolean',
            'theme_updated_at' => 'datetime',
        ];
    }

    public function getAvatarAttribute($value)
    {
        if (empty($value)) {
            return null;
        }
        $raw = trim($value);
        if (str_starts_with($raw, 'http://') || str_starts_with($raw, 'https://')) {
            if (str_starts_with($raw, 'http://api.edulem.com')) {
                return 'https://' . substr($raw, 7);
            }
            return $raw;
        }
        $baseUrl = rtrim(config('app.url') ?: 'https://api.edulem.com', '/');
        if (str_contains($baseUrl, 'edulem.com') && str_starts_with($baseUrl, 'http://')) {
            $baseUrl = 'https://' . substr($baseUrl, 7);
        }
        return $baseUrl . '/' . ltrim($raw, '/');
    }

    /**
     * JSON alanları (subjects, campus_ids, education_level_ids) veritabanına
     * Türkçe karakterler escape edilmeden (Beden Eğitimi, Müzik) yazılsın.
     */
    protected function asJson($value): string
    {
        return json_encode($value, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
    }

    /**
     * Get the tenant that owns the user.
     *
     * @return \Illuminate\Database\Eloquent\Relations\BelongsTo
     */
    public function tenant()
    {
        return $this->belongsTo(Tenant::class);
    }

    /**
     * Get the role that the user has.
     *
     * @return \Illuminate\Database\Eloquent\Relations\BelongsTo
     */
    public function role()
    {
        return $this->belongsTo(Role::class);
    }

    public function counselingStudents(): HasMany
    {
        return $this->hasMany(CounselingStudent::class, 'counselor_id');
    }

    public function counselingSessions(): HasMany
    {
        return $this->hasMany(CounselingSession::class, 'counselor_id');
    }

    /**
     * Check if user has a specific permission.
     *
     * @param  string  $permissionName
     * @return bool
     */
    public function hasPermission(string $permissionName): bool
    {
        // SuperAdmin tüm izinlere sahiptir
        if ($this->is_superadmin) {
            return true;
        }

        if (!$this->role) {
            return false;
        }

        return $this->role->hasPermission($permissionName);
    }

    /**
     * Check if user has any of the given permissions.
     *
     * @param  array  $permissionNames
     * @return bool
     */
    public function hasAnyPermission(array $permissionNames): bool
    {
        // SuperAdmin tüm izinlere sahiptir
        if ($this->is_superadmin) {
            return true;
        }

        if (!$this->role) {
            return false;
        }

        return $this->role->permissions()
            ->whereIn('name', $permissionNames)
            ->exists();
    }

    /**
     * Check if user is SuperAdmin or has super_admin SaaS role.
     *
     * @return bool
     */
    public function isSuperAdmin(): bool
    {
        return $this->is_superadmin === true || $this->saas_role === 'super_admin';
    }

    /**
     * Check if user is an EduLem SaaS Staff member.
     */
    public function isSaasStaff(): bool
    {
        return $this->is_superadmin || !empty($this->saas_role);
    }

    /**
     * Sadece Patron (Süper Admin) okul silebilir.
     */
    public function canDeleteTenant(): bool
    {
        return $this->is_superadmin || $this->saas_role === 'super_admin';
    }

    /**
     * Finans / Kasa / Tahsilat yetkisi.
     */
    public function canManageFinance(): bool
    {
        return $this->is_superadmin || in_array($this->saas_role, ['super_admin', 'finance']);
    }

    /**
     * Canlı Destek / Okula Sızma Yetkisi.
     */
    public function canImpersonate(): bool
    {
        return $this->is_superadmin || in_array($this->saas_role, ['super_admin', 'technical_support']);
    }

    /**
     * Check if user can access tenant data (SuperAdmin can access all).
     *
     * @param  int  $tenantId
     * @return bool
     */
    public function canAccessTenant(int $tenantId): bool
    {
        if ($this->is_superadmin) {
            return true;
        }

        return $this->tenant_id === $tenantId;
    }

    /**
     * Get the campuses that the user manages.
     */
    public function managedCampuses()
    {
        return $this->hasMany(Campus::class, 'manager_id');
    }

    /**
     * Get the branches that the user manages.
     */
    public function managedBranches()
    {
        return $this->hasMany(Branch::class, 'manager_id');
    }

    /**
     * Get campus permissions for the user.
     */
    public function campusPermissions()
    {
        return $this->hasMany(UserCampusPermission::class);
    }

    /**
     * Get branch permissions for the user.
     */
    public function branchPermissions()
    {
        return $this->hasMany(UserBranchPermission::class);
    }

    /**
     * Get module permissions for the user.
     */
    public function modulePermissions()
    {
        return $this->hasMany(UserModulePermission::class);
    }

    /**
     * Get campus/branch assignments for the user.
     */
    public function campusBranchAssignments()
    {
        return $this->hasMany(UserCampusBranchAssignment::class);
    }

    /**
     * Get device tokens for push notifications.
     */
    public function deviceTokens(): HasMany
    {
        return $this->hasMany(DeviceToken::class);
    }

    /**
     * Check if user is a branch manager.
     */
    public function isBranchManager(): bool
    {
        return $this->managedBranches()->exists();
    }

    /**
     * Get managed branch IDs.
     */
    public function getManagedBranchIds(): array
    {
        return $this->managedBranches()->pluck('id')->toArray();
    }

    /**
     * Scope query to filter by branch manager's branches.
     * 
     * @param \Illuminate\Database\Eloquent\Builder $query
     * @param \App\Models\User $user
     * @return \Illuminate\Database\Eloquent\Builder
     */
    public function scopeForBranchManager($query, User $user)
    {
        if ($user->isBranchManager()) {
            $branchIds = $user->getManagedBranchIds();
            return $query->whereHas('classroom', function ($q) use ($branchIds) {
                $q->whereIn('branch_id', $branchIds);
            });
        }
        
        return $query;
    }

    /**
     * Get user's theme preference.
     */
    public function getThemePreference(): string
    {
        return $this->theme_preference ?? 'light';
    }

    /**
     * Check if user has monochrome mode enabled.
     */
    public function hasMonochromeMode(): bool
    {
        return $this->monochrome_mode ?? false;
    }

    /**
     * Update user's theme preference.
     */
    public function updateThemePreference(string $theme, bool $monochrome = false): bool
    {
        $this->theme_preference = $theme;
        $this->monochrome_mode = $monochrome;
        $this->theme_updated_at = now();
        
        return $this->save();
    }

    /**
     * Get theme settings as array.
     */
    public function getThemeSettings(): array
    {
        return [
            'theme' => $this->getThemePreference(),
            'monochrome' => $this->hasMonochromeMode(),
            'updated_at' => $this->theme_updated_at,
        ];
    }

    /**
     * Get staff duties assigned to this user.
     */
    public function staffDuties()
    {
        return $this->belongsToMany(StaffDuty::class, 'staff_duty_assignments', 'user_id', 'duty_id')
            ->withPivot(['assigned_by', 'assigned_at', 'expires_at', 'is_active', 'notes'])
            ->wherePivot('is_active', true)
            ->where(function ($query) {
                $query->whereNull('expires_at')
                    ->orWhere('expires_at', '>', now());
            });
    }

    /**
     * Get all staff duties including inactive ones.
     */
    public function allStaffDuties()
    {
        return $this->belongsToMany(StaffDuty::class, 'staff_duty_assignments', 'user_id', 'duty_id')
            ->withPivot(['assigned_by', 'assigned_at', 'expires_at', 'is_active', 'notes']);
    }

    /**
     * Assign a staff duty to this user.
     */
    public function assignStaffDuty($dutyId, $assignedBy = null, $expiresAt = null, $notes = null)
    {
        return $this->staffDuties()->attach($dutyId, [
            'assigned_by' => $assignedBy ?? auth()->id(),
            'assigned_at' => now(),
            'expires_at' => $expiresAt,
            'notes' => $notes,
        ]);
    }

    /**
     * Remove a staff duty from this user.
     */
    public function removeStaffDuty($dutyId)
    {
        return $this->staffDuties()->detach($dutyId);
    }

    /**
     * Check if user has specific duty.
     */
    public function hasStaffDuty($dutyName): bool
    {
        return $this->staffDuties()->where('name', $dutyName)->exists();
    }

    /**
     * Check if user has duties in specific category.
     */
    public function hasDutiesInCategory($category): bool
    {
        return $this->staffDuties()->where('category', $category)->exists();
    }

    /**
     * Get user's role display name.
     */
    public function getRoleDisplayName(): string
    {
        return $this->role ? $this->role->display_name : 'Bilinmeyen Rol';
    }

    /**
     * Get user's hierarchy level.
     */
    public function getHierarchyLevel(): int
    {
        // roles tablosunda hiyerarşi alanı `level` olarak tutuluyor.
        // Daha küçük level = daha üst rol.
        return $this->role ? (int) ($this->role->level ?? 0) : 0;
    }

    /**
     * Smaller role level means higher privilege.
     */
    public function getRoleLevel(): int
    {
        // Role yoksa en alt kabul edelim.
        return $this->role ? (int) ($this->role->level ?? 999) : 999;
    }

    /**
     * Smaller sort_order means higher privilege when level is equal.
     */
    public function getRoleSortOrder(): int
    {
        return $this->role ? (int) ($this->role->sort_order ?? 999) : 999;
    }

    /**
     * Rank tuple for comparing role privilege.
     */
    private function getRoleRank(): array
    {
        return [$this->getRoleLevel(), $this->getRoleSortOrder()];
    }

    /**
     * Can current user edit target user based on role hierarchy.
     * Rule: lower roles cannot edit higher roles.
     */
    public function canEditUser(User $target): bool
    {
        if ($this->is_superadmin) {
            return true;
        }

        if ((int) $this->id === (int) $target->id) {
            return true;
        }

        $myRoleName = $this->role?->name;
        $targetRoleName = $target->role?->name;

        // Öğretmen ve rehberlik rolleri kesinlikle başka hiçbir personeli/kullanıcıyı düzenleyemez
        $teacherRoles = ['Öğretmen', 'Sınıf Öğretmeni', 'teacher', 'Rehberlik', 'guidance', 'Rehber Öğretmen', 'rehber_teacher', 'guidance_teacher'];
        if ($myRoleName && in_array($myRoleName, $teacherRoles, true)) {
            return (int) $this->id === (int) $target->id;
        }

        // Muhasebe de başka personelleri düzenleyemez
        if ($myRoleName && in_array($myRoleName, ['Muhasebe', 'muhasebe'], true)) {
            return (int) $this->id === (int) $target->id;
        }

        // Öğrenci İşleri: üst rolleri asla yönetemez; ancak alt personeli (öğretmen vb.) yönetebilsin.
        if (in_array($myRoleName, ['Öğrenci İşleri', 'student_affairs'], true)) {
            $blocked = ['owner', 'Genel Müdür', 'Kampüs Müdürü', 'Müdür', 'Müdür Yardımcısı'];
            if ($targetRoleName && in_array($targetRoleName, $blocked, true)) {
                return false;
            }

            // Hedef rol tanımsızsa güvenli tarafta kal.
            if (!$targetRoleName) {
                return false;
            }

            // Student Affairs kendi seviyesindeki öğretmen/personel gibi rolleri yönetebilsin.
            $allowTargets = ['Öğretmen', 'Sınıf Öğretmeni', 'Rehberlik', 'Muhasebe'];
            if (in_array($targetRoleName, $allowTargets, true)) {
                return true;
            }
        }

        // Genel kural: daha üst rol (rank daha küçük) düzenleyebilir.
        $myRank = $this->getRoleRank();
        $targetRank = $target->getRoleRank();
        return $myRank < $targetRank;
    }

    /**
     * Check if user can manage other user.
     */
    public function canManageUser(User $user): bool
    {
        // Backward compatible: manage = edit logic
        return $this->canEditUser($user);
    }

    /**
     * Get user's permissions from role and duties.
     */
    public function getAllPermissions(): array
    {
        $rolePermissions = $this->role ? $this->role->permissions ?? [] : [];
        
        $dutyPermissions = $this->staffDuties()
            ->where('is_active', true)
            ->get()
            ->pluck('permissions')
            ->flatten()
            ->filter()
            ->toArray();

        return array_unique(array_merge($rolePermissions, $dutyPermissions));
    }

    /**
     * Check if user has all of the given permissions.
     */
    public function hasAllPermissions(array $permissions): bool
    {
        foreach ($permissions as $permission) {
            if (!$this->hasPermission($permission)) {
                return false;
            }
        }
        return true;
    }

    /**
     * Check if user can view OMR exam based on role and scope.
     * Veli/Öğretmen: share_roles setting required
     * Other roles: automatic access based on education_level_ids
     */
    public function canViewOmrExam(OmrExam $exam, ?array $shareRoles = null): bool
    {
        $roleName = $this->role?->name;

        // Creator can always view
        if ((int) $exam->created_by === (int) $this->id) {
            return true;
        }

        // Veli (Parent) - requires share_roles.parent = true
        if (in_array($roleName, ['Veli', 'Parent', 'Guardian', 'guardian', 'parent'], true)) {
            return !empty($shareRoles) && !empty($shareRoles['parent']);
        }

        // Öğretmen (Teacher) - requires share_roles.teacher = true
        if (in_array($roleName, ['Öğretmen', 'Teacher', 'teacher'], true)) {
            return !empty($shareRoles) && !empty($shareRoles['teacher']);
        }

        // Admin and staff roles - always can view
        $adminRoles = [
            'owner', 'Admin', 'admin', 'SuperAdmin', 'super_admin',
            'Müdür', 'Müdür Yardımcısı', 'Kampüs Müdürü', 'Genel Müdür',
            'Rehberlik', 'guidance', 'Rehber Öğretmen', 'rehber_teacher', 'guidance_teacher', 'Rehberlik Öğretmeni',
            'Öğrenci İşleri', 'student_affairs', 'ogrenci_isleri',
        ];
        if (in_array($roleName, $adminRoles, true) || $this->is_superadmin) {
            return true;
        }

        // Other roles (grade coordinators, class teachers, etc.) - automatic by education_level_ids
        // They can view exams where exam.level matches their assigned education_level_ids
        $userEducationLevels = $this->education_level_ids ?? [];
        if (empty($userEducationLevels)) {
            return false;
        }

        $examLevel = $exam->level; // e.g., "8.SINIF"
        // Match exam level with user's education_level_ids
        // This assumes education levels have codes like "8.SINIF" or names that match
        foreach ($userEducationLevels as $levelId) {
            // Check if exam level matches this education level
            // Level matching: "8.SINIF" matches education level with grade_level=8
            if ($this->educationLevelMatches($examLevel, $levelId)) {
                return true;
            }
        }

        return false;
    }

    /**
     * Check if exam level matches user's education level ID.
     */
    private function educationLevelMatches(?string $examLevel, int $educationLevelId): bool
    {
        if (empty($examLevel)) {
            return false;
        }

        // Extract grade number from exam level (e.g., "8.SINIF" -> 8)
        $examGrade = $this->extractGradeFromLevel($examLevel);
        if (!$examGrade) {
            return false;
        }

        // Load education level and check grade_level
        $educationLevel = EducationLevel::find($educationLevelId);
        if (!$educationLevel) {
            return false;
        }

        return (int) $educationLevel->grade_level === $examGrade;
    }

    /**
     * Extract grade number from level string like "8.SINIF" or "YKS".
     */
    private function extractGradeFromLevel(string $level): ?int
    {
        if (preg_match('/^(\d+)/', $level, $matches)) {
            return (int) $matches[1];
        }
        // YKS mezunlar için özel işlem
        if (stripos($level, 'YKS') !== false || stripos($level, 'mezun') !== false) {
            return 12; // YKS için 12. sınıf varsayımı
        }
        return null;
    }

    /**
     * Get exams visible to this user based on role and education_level_ids.
     */
    public function scopeVisibleOmrExams($query)
    {
        $roleName = $this->role?->name;

        // Admin and staff roles - see all
        $adminRoles = [
            'owner', 'Admin', 'admin', 'SuperAdmin', 'super_admin',
            'Müdür', 'Müdür Yardımcısı', 'Kampüs Müdürü', 'Genel Müdür',
            'Rehberlik', 'guidance', 'Rehber Öğretmen', 'rehber_teacher', 'guidance_teacher', 'Rehberlik Öğretmeni',
            'Öğrenci İşleri', 'student_affairs', 'ogrenci_isleri',
        ];
        if (in_array($roleName, $adminRoles, true) || $this->is_superadmin) {
            return $query;
        }

        // Veli and Öğretmen - only exams with share_roles enabled for them
        // This is handled at controller level with specific filter
        if (in_array($roleName, ['Veli', 'Parent', 'Guardian', 'guardian', 'parent', 'Öğretmen', 'Teacher', 'teacher'], true)) {
            return $query;
        }

        // Other roles - filter by education_level_ids matching exam.level
        $userEducationLevels = $this->education_level_ids ?? [];
        if (empty($userEducationLevels)) {
            return $query->whereRaw('1 = 0'); // No access
        }

        // Get grade levels from user's education_level_ids via Classrooms (any season)
        $gradeLevels = Classroom::withoutGlobalScope(\App\Scopes\SeasonScope::class)
            ->whereIn('education_level_id', $userEducationLevels)
            ->pluck('grade_level')
            ->filter()
            ->unique()
            ->toArray();

        if (empty($gradeLevels)) {
            return $query->whereRaw('1 = 0');
        }

        // Build level patterns (e.g., "8.SINIF", "9.SINIF")
        $levelPatterns = [];
        foreach ($gradeLevels as $grade) {
            $levelPatterns[] = $grade . '.SINIF';
        }

        // Include YKS for grade 12
        if (in_array(12, $gradeLevels, true)) {
            $levelPatterns[] = 'YKS';
        }

        return $query->whereIn('level', $levelPatterns);
    }
}
