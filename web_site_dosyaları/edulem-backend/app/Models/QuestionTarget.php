<?php

namespace App\Models;

use App\Traits\BelongsToTenant;
use App\Traits\Loggable;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Carbon\Carbon;

class QuestionTarget extends Model
{
    use HasFactory, BelongsToTenant, Loggable;

    protected $fillable = [
        'tenant_id',
        'student_id',
        'week_start_date',
        'weekly_target',
        'daily_targets',
        'lesson_targets',
        'notes',
        'created_by',
    ];

    protected function casts(): array
    {
        return [
            'week_start_date' => 'date',
            'weekly_target' => 'integer',
            'daily_targets' => 'array',
            'lesson_targets' => 'array',
        ];
    }

    public function tenant(): BelongsTo
    {
        return $this->belongsTo(Tenant::class);
    }

    public function student(): BelongsTo
    {
        return $this->belongsTo(Student::class);
    }

    public function creator(): BelongsTo
    {
        return $this->belongsTo(User::class, 'created_by');
    }

    public function questionCounts(): HasMany
    {
        return $this->hasMany(StudentQuestionCount::class);
    }

    /**
     * Get week end date.
     *
     * @return \Carbon\Carbon
     */
    public function getWeekEndDate(): Carbon
    {
        return Carbon::parse($this->week_start_date)->addDays(6);
    }

    /**
     * Get total solved questions for this week.
     *
     * @return int
     */
    public function getTotalSolved(): int
    {
        return $this->questionCounts()
            ->whereBetween('date', [$this->week_start_date, $this->getWeekEndDate()])
            ->sum('count');
    }

    /**
     * Get completion percentage.
     *
     * @return float
     */
    public function getCompletionPercentage(): float
    {
        if ($this->weekly_target == 0) {
            return 0;
        }

        $solved = $this->getTotalSolved();
        return min(100, ($solved / $this->weekly_target) * 100);
    }

    /**
     * Get daily solved counts.
     *
     * @return array
     */
    public function getDailySolved(): array
    {
        $counts = $this->questionCounts()
            ->whereBetween('date', [$this->week_start_date, $this->getWeekEndDate()])
            ->selectRaw('date, SUM(count) as total')
            ->groupBy('date')
            ->pluck('total', 'date')
            ->toArray();

        $daily = [];
        $currentDate = Carbon::parse($this->week_start_date);
        $endDate = $this->getWeekEndDate();

        while ($currentDate <= $endDate) {
            $dateKey = $currentDate->format('Y-m-d');
            $daily[$dateKey] = $counts[$dateKey] ?? 0;
            $currentDate->addDay();
        }

        return $daily;
    }

    /**
     * Get lesson-based solved counts.
     *
     * @return array
     */
    public function getLessonSolved(): array
    {
        return $this->questionCounts()
            ->whereBetween('date', [$this->week_start_date, $this->getWeekEndDate()])
            ->whereNotNull('lesson_id')
            ->selectRaw('lesson_id, SUM(count) as total')
            ->groupBy('lesson_id')
            ->pluck('total', 'lesson_id')
            ->toArray();
    }

    /**
     * Get the attributes that should be logged.
     *
     * @return array
     */
    public function getLoggableAttributes(): array
    {
        return [
            'student_id',
            'week_start_date',
            'weekly_target',
        ];
    }

    /**
     * Get the attributes that should be hidden from logs.
     *
     * @return array
     */
    public function getHiddenFromLogs(): array
    {
        return ['notes', 'daily_targets', 'lesson_targets'];
    }
}
