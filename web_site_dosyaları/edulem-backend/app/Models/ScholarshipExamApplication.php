<?php

namespace App\Models;

use App\Traits\BelongsToTenant;
use App\Traits\Loggable;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Support\Str;

class ScholarshipExamApplication extends Model
{
    use HasFactory, BelongsToTenant, Loggable;

    protected $fillable = [
        'tenant_id',
        'scholarship_exam_id',
        'student_id',
        'lead_id',
        'application_number',
        'name',
        'phone',
        'email',
        'birth_date',
        'tc_identity_number',
        'school_name',
        'grade_level',
        'branch_id',
        'session_id',
        'session_time',
        'classroom_id',
        'seat_number',
        'optical_form_code',
        'security_code',
        'additional_data',
        'status',
        'notes',
        'processed_by',
        'processed_at',
    ];

    protected function casts(): array
    {
        return [
            'birth_date' => 'date',
            'session_time' => 'string',
            'seat_number' => 'integer',
            'additional_data' => 'array',
            'processed_at' => 'datetime',
        ];
    }

    protected static function boot()
    {
        parent::boot();

        static::creating(function ($application) {
            if (empty($application->application_number)) {
                $application->application_number = static::generateApplicationNumber();
            }
        });
    }

    /**
     * Generate unique application number.
     *
     * @return string
     */
    protected static function generateApplicationNumber(): string
    {
        do {
            $number = 'BS' . date('Y') . strtoupper(Str::random(6));
        } while (static::where('application_number', $number)->exists());

        return $number;
    }

    public function tenant(): BelongsTo
    {
        return $this->belongsTo(Tenant::class);
    }

    public function scholarshipExam(): BelongsTo
    {
        return $this->belongsTo(ScholarshipExam::class);
    }

    public function student(): BelongsTo
    {
        return $this->belongsTo(Student::class);
    }

    public function lead(): BelongsTo
    {
        return $this->belongsTo(Lead::class);
    }

    public function branch(): BelongsTo
    {
        return $this->belongsTo(Classroom::class, 'branch_id');
    }

    public function classroom(): BelongsTo
    {
        return $this->belongsTo(Classroom::class, 'classroom_id');
    }

    public function processor(): BelongsTo
    {
        return $this->belongsTo(User::class, 'processed_by');
    }

    /**
     * Check if application is approved.
     *
     * @return bool
     */
    public function isApproved(): bool
    {
        return $this->status === 'approved';
    }

    /**
     * Check if application is pending.
     *
     * @return bool
     */
    public function isPending(): bool
    {
        return $this->status === 'pending';
    }

    /**
     * Get the attributes that should be logged.
     *
     * @return array
     */
    public function getLoggableAttributes(): array
    {
        return [
            'scholarship_exam_id',
            'application_number',
            'name',
            'status',
        ];
    }

    /**
     * Get the attributes that should be hidden from logs.
     *
     * @return array
     */
    public function getHiddenFromLogs(): array
    {
        return ['notes', 'additional_data', 'security_code', 'tc_identity_number'];
    }
}
