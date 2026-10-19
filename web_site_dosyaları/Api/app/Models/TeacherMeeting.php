<?php

namespace App\Models;

use App\Traits\BelongsToTenant;
use App\Traits\BelongsToSeason;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class TeacherMeeting extends Model
{
    use HasFactory, BelongsToTenant, BelongsToSeason;

    protected $table = 'teacher_meetings';

    protected $fillable = [
        'tenant_id',
        'season_id',
        'teacher_id',
        'student_id',
        'meeting_with',
        'type',
        'title',
        'content',
        'meeting_date',
        'meeting_time',
        'visibility',
        'status',
    ];

    protected function casts(): array
    {
        return [
            'meeting_date' => 'date',
        ];
    }

    // visibility constants
    public const VISIBILITY_ADMIN_ONLY = 'admin_only';
    public const VISIBILITY_TEACHERS_OPEN = 'teachers_open';
    public const VISIBILITY_PUBLIC = 'public';
    public const VISIBILITY_PRIVATE = 'private';

    public const VISIBILITIES = [
        self::VISIBILITY_ADMIN_ONLY,
        self::VISIBILITY_TEACHERS_OPEN,
        self::VISIBILITY_PUBLIC,
        self::VISIBILITY_PRIVATE,
    ];

    // type constants
    public const TYPE_MEETING = 'meeting';
    public const TYPE_APPOINTMENT = 'appointment';

    public const TYPES = [
        self::TYPE_MEETING,
        self::TYPE_APPOINTMENT,
    ];

    // who was met with
    public const MEETING_WITH_STUDENT = 'student';
    public const MEETING_WITH_PARENT = 'parent';

    public const MEETING_WITH_OPTIONS = [
        self::MEETING_WITH_STUDENT,
        self::MEETING_WITH_PARENT,
    ];

    public function tenant(): BelongsTo
    {
        return $this->belongsTo(Tenant::class);
    }

    public function teacher(): BelongsTo
    {
        return $this->belongsTo(User::class, 'teacher_id');
    }

    public function student(): BelongsTo
    {
        return $this->belongsTo(Student::class);
    }
}
