<?php

namespace App\Models;

use App\Traits\BelongsToTenant;
use App\Traits\BelongsToSeason;
use App\Traits\Loggable;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Carbon\Carbon;

class ScholarshipExam extends Model
{
    use HasFactory, BelongsToTenant, BelongsToSeason, Loggable;

    protected $fillable = [
        'tenant_id',
        'season_id',
        'title',
        'description',
        'exam_date',
        'exam_time',
        'duration_minutes',
        'sessions',
        'required_fields',
        'optional_fields',
        'exam_specification_file_id',
        'scholarship_amount',
        'registration_fee',
        'auto_register_students',
        'auto_register_to_leads',
        'multi_branch_application',
        'branch_ids',
        'require_security_code',
        'security_code',
        'show_results_online',
        'results_publish_date',
        'status',
        'created_by',
    ];

    protected function casts(): array
    {
        return [
            'exam_date' => 'date',
            'exam_time' => 'string',
            'duration_minutes' => 'integer',
            'sessions' => 'array',
            'required_fields' => 'array',
            'optional_fields' => 'array',
            'branch_ids' => 'array',
            'scholarship_amount' => 'decimal:2',
            'registration_fee' => 'decimal:2',
            'auto_register_students' => 'boolean',
            'auto_register_to_leads' => 'boolean',
            'multi_branch_application' => 'boolean',
            'require_security_code' => 'boolean',
            'show_results_online' => 'boolean',
            'results_publish_date' => 'datetime',
        ];
    }

    public function tenant(): BelongsTo
    {
        return $this->belongsTo(Tenant::class);
    }

    public function creator(): BelongsTo
    {
        return $this->belongsTo(User::class, 'created_by');
    }

    public function examSpecificationFile(): BelongsTo
    {
        return $this->belongsTo(File::class, 'exam_specification_file_id');
    }

    public function applications(): HasMany
    {
        return $this->hasMany(ScholarshipExamApplication::class);
    }

    /**
     * Check if exam is open for applications.
     *
     * @return bool
     */
    public function isOpen(): bool
    {
        return $this->status === 'open';
    }

    /**
     * Check if exam has ended.
     *
     * @return bool
     */
    public function hasEnded(): bool
    {
        $examDateTime = Carbon::parse($this->exam_date->format('Y-m-d') . ' ' . $this->exam_time);
        return Carbon::now() > $examDateTime->addMinutes($this->duration_minutes);
    }

    /**
     * Get total application count.
     *
     * @return int
     */
    public function getTotalApplications(): int
    {
        return $this->applications()->count();
    }

    /**
     * Get approved application count.
     *
     * @return int
     */
    public function getApprovedApplications(): int
    {
        return $this->applications()->where('status', 'approved')->count();
    }

    /**
     * Get the attributes that should be logged.
     *
     * @return array
     */
    public function getLoggableAttributes(): array
    {
        return [
            'title',
            'exam_date',
            'exam_time',
            'status',
            'scholarship_amount',
            'registration_fee',
        ];
    }

    /**
     * Get the attributes that should be hidden from logs.
     *
     * @return array
     */
    public function getHiddenFromLogs(): array
    {
        return ['description', 'security_code'];
    }
}
