<?php

namespace App\Models;

use App\Traits\Loggable;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\BelongsToMany;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Foundation\Auth\User as Authenticatable;
use Illuminate\Notifications\Notifiable;
use Laravel\Sanctum\HasApiTokens;
use Illuminate\Support\Facades\Hash;
use App\Traits\BelongsToSeason;
use Illuminate\Contracts\Auth\Authenticatable as AuthenticatableContract;

class Student extends Authenticatable implements AuthenticatableContract
{
    use HasFactory, Loggable, Notifiable, HasApiTokens, BelongsToSeason;

    /**
     * The attributes that are mass assignable.
     *
     * @var array<int, string>
     */
    protected $fillable = [
        'tenant_id',
        'tc_no',
        'school_no',
        'name',
        'birth_date',
        'gender',
        'phone',
        'email',
        'address',
        'city_id',
        'district_id',
        'classroom_id',
        'education_level_id',
        'season_id',
        'emergency_contact_info',
        'is_active',
        'password',
        'is_portal_active',
        'sibling_ids',
    ];

    /**
     * The attributes that should be hidden for serialization.
     *
     * @var array<int, string>
     */
    protected $hidden = [
        'password',
        'portal_token',
    ];

    public function educationLevel(): BelongsTo
    {
        return $this->belongsTo(EducationLevel::class);
    }

    /**
     * Get the attributes that should be cast.
     *
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return [
            'birth_date' => 'date',
            'emergency_contact_info' => 'array',
            'sibling_ids' => 'array',
            'portal_token_expires_at' => 'datetime',
            'last_login_at' => 'datetime',
            'password' => 'hashed',
            'is_portal_active' => 'boolean',
        ];
    }

    /**
     * Get siblings for this student.
     */
    public function siblings(): BelongsToMany
    {
        return $this->belongsToMany(Student::class, 'student_siblings', 'student_id', 'sibling_id')
            ->withTimestamps();
    }

    /**
     * Get the name of the unique identifier for the user.
     *
     * @return string
     */
    public function getAuthIdentifierName()
    {
        return 'id';
    }

    /**
     * Get the unique identifier for the user.
     *
     * @return mixed
     */
    public function getAuthIdentifier()
    {
        return $this->getKey();
    }

    /**
     * Get the password for the user.
     *
     * @return string
     */
    public function getAuthPassword()
    {
        return $this->password;
    }

    /**
     * Get the tenant that owns the student.
     *
     * @return BelongsTo
     */
    public function tenant(): BelongsTo
    {
        return $this->belongsTo(Tenant::class);
    }

    /**
     * Get the city that the student belongs to.
     *
     * @return BelongsTo
     */
    public function city(): BelongsTo
    {
        return $this->belongsTo(City::class);
    }

    /**
     * Get the district that the student belongs to.
     *
     * @return BelongsTo
     */
    public function district(): BelongsTo
    {
        return $this->belongsTo(District::class);
    }

    /**
     * Get the guardians for the student.
     *
     * @return BelongsToMany
     */
    public function guardians(): BelongsToMany
    {
        return $this->belongsToMany(Guardian::class, 'guardian_student')
            ->withPivot('relation_type', 'is_legal_guardian')
            ->orderByRaw("CASE 
                WHEN guardian_student.relation_type IN ('mother', 'anne') THEN 1 
                WHEN guardian_student.relation_type IN ('father', 'baba') THEN 2 
                WHEN guardian_student.relation_type IN ('guardian', 'vasi') THEN 3 
                ELSE 4 
            END ASC")
            ->orderBy('guardian_student.id', 'asc')
            ->withTimestamps();
    }

    public function deviceTokens(): HasMany
    {
        return $this->hasMany(DeviceToken::class, 'user_id')->where('user_type', 'student');
    }

    public function classroom(): BelongsTo
    {
        return $this->belongsTo(Classroom::class);
    }

    public function attendances(): HasMany
    {
        return $this->hasMany(Attendance::class);
    }

    public function grades(): HasMany
    {
        return $this->hasMany(Grade::class);
    }

    public function payments(): HasMany
    {
        return $this->hasMany(Payment::class);
    }

    public function installments(): HasMany
    {
        return $this->hasMany(Installment::class);
    }

    public function questions(): HasMany
    {
        return $this->hasMany(Question::class);
    }

    public function contracts(): HasMany
    {
        return $this->hasMany(Contract::class);
    }

    /**
     * Get the academic year that the student belongs to.
     *
     * @return BelongsTo
     */
    public function academicYear(): BelongsTo
    {
        return $this->belongsTo(AcademicYear::class);
    }

    public function questionTargets(): HasMany
    {
        return $this->hasMany(QuestionTarget::class);
    }

    public function questionCounts(): HasMany
    {
        return $this->hasMany(StudentQuestionCount::class);
    }

    public function guidanceNotes(): HasMany
    {
        return $this->hasMany(GuidanceNote::class);
    }

    public function homeworkAssignments(): HasMany
    {
        return $this->hasMany(HomeworkStudentAssignment::class);
    }

    public function assignedHomeworks(): BelongsToMany
    {
        return $this->belongsToMany(Homework::class, 'homework_student_assignments')
            ->withPivot(['tenant_id', 'review_status', 'teacher_note', 'reviewed_by', 'reviewed_at'])
            ->withTimestamps();
    }

    public function bulletins(): HasMany
    {
        return $this->hasMany(Bulletin::class);
    }

    public function achievementCertificates(): HasMany
    {
        return $this->hasMany(AchievementCertificate::class);
    }
}
