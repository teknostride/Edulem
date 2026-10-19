<?php

namespace App\Models;

use App\Traits\BelongsToTenant;
use App\Traits\Loggable;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class Subscription extends Model
{
    use HasFactory, BelongsToTenant, Loggable;

    protected $fillable = [
        'tenant_id',
        'package_id',
        'subscription_no',
        'start_date',
        'end_date',
        'billing_cycle',
        'monthly_price',
        'price_per_student',
        'student_count',
        'max_students',
        'status',
        'trial_ends_at',
        'cancelled_at',
        'cancellation_reason',
        'notes',
    ];

    protected function casts(): array
    {
        return [
            'start_date' => 'date',
            'end_date' => 'date',
            'billing_cycle' => 'string',
            'monthly_price' => 'decimal:2',
            'price_per_student' => 'decimal:2',
            'student_count' => 'integer',
            'max_students' => 'integer',
            'status' => 'string',
            'trial_ends_at' => 'date',
            'cancelled_at' => 'date',
        ];
    }

    /**
     * Get the tenant that owns the subscription.
     *
     * @return \Illuminate\Database\Eloquent\Relations\BelongsTo
     */
    public function tenant(): BelongsTo
    {
        return $this->belongsTo(Tenant::class);
    }

    /**
     * Get the package for this subscription.
     *
     * @return \Illuminate\Database\Eloquent\Relations\BelongsTo
     */
    public function package(): BelongsTo
    {
        return $this->belongsTo(Package::class);
    }

    /**
     * Get subscription modules.
     *
     * @return \Illuminate\Database\Eloquent\Relations\HasMany
     */
    public function modules(): HasMany
    {
        return $this->hasMany(SubscriptionModule::class);
    }

    /**
     * Get invoices for this subscription.
     *
     * @return \Illuminate\Database\Eloquent\Relations\HasMany
     */
    public function invoices(): HasMany
    {
        return $this->hasMany(Invoice::class);
    }

    /**
     * Check if subscription is active.
     *
     * @return bool
     */
    public function isActive(): bool
    {
        return $this->status === 'active' 
            && ($this->end_date === null || $this->end_date >= now()->toDateString());
    }

    /**
     * Check if subscription is in trial.
     *
     * @return bool
     */
    public function isTrial(): bool
    {
        return $this->trial_ends_at !== null && $this->trial_ends_at >= now()->toDateString();
    }

    /**
     * Check if module is active.
     *
     * @param  string  $module
     * @return bool
     */
    public function hasModule(string $module): bool
    {
        return $this->modules()
            ->where('module', $module)
            ->where('is_active', true)
            ->exists();
    }

    /**
     * Calculate monthly total price.
     *
     * @return float
     */
    public function calculateMonthlyTotal(): float
    {
        return $this->monthly_price + ($this->price_per_student * $this->student_count);
    }

    /**
     * Get the attributes that should be logged.
     *
     * @return array
     */
    public function getLoggableAttributes(): array
    {
        return ['package_id', 'subscription_no', 'start_date', 'end_date', 'billing_cycle', 'monthly_price', 'price_per_student', 'student_count', 'max_students', 'status', 'trial_ends_at', 'cancelled_at', 'cancellation_reason', 'notes'];
    }

    /**
     * Get the attributes that should be hidden from logs.
     *
     * @return array
     */
    public function getHiddenFromLogs(): array
    {
        return [];
    }
}
