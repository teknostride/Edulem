<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\Relations\HasOne;

class Tenant extends Model
{
    use HasFactory;

    /**
     * The attributes that are mass assignable.
     *
     * @var array<int, string>
     */
    protected $fillable = [
        'domain',
        'name',
        'official_title',
        'authorized_person',
        'authorized_phone',
        'authorized_email',
        'accounting_phone',
        'tax_office',
        'tax_number',
        'address',
        'city',
        'district',
        'contract_amount',
        'contract_start_date',
        'contract_end_date',
        'notes',
        'is_active',
        'logo_path',
        'current_subscription_id',
        'student_count',
        'subscription_expires_at',
    ];

    /**
     * Get the attributes that should be cast.
     *
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return [
            'is_active' => 'boolean',
            'student_count' => 'integer',
            'contract_amount' => 'decimal:2',
            'contract_start_date' => 'date',
            'contract_end_date' => 'date',
            'subscription_expires_at' => 'date',
        ];
    }

    protected $appends = [
        'logo_url',
    ];

    public function getLogoUrlAttribute(): ?string
    {
        if (empty($this->logo_path)) {
            return null;
        }
        $raw = trim($this->logo_path);
        if (str_starts_with($raw, 'http://') || str_starts_with($raw, 'https://')) {
            if (str_starts_with($raw, 'http://api.edulem.com')) {
                return 'https://' . substr($raw, 7);
            }
            return $raw;
        }
        $clean = ltrim($raw, '/');
        if (!str_starts_with($clean, 'storage/')) {
            $clean = 'storage/' . $clean;
        }
        $baseUrl = rtrim(config('app.url') ?: 'https://api.edulem.com', '/');
        if (str_contains($baseUrl, 'edulem.com') && str_starts_with($baseUrl, 'http://')) {
            $baseUrl = 'https://' . substr($baseUrl, 7);
        }
        return $baseUrl . '/' . $clean;
    }

    /**
     * Get the users for the tenant.
     *
     * @return \Illuminate\Database\Eloquent\Relations\HasMany
     */
    public function users(): HasMany
    {
        return $this->hasMany(User::class);
    }

    /**
     * Get the students for the tenant.
     *
     * @return \Illuminate\Database\Eloquent\Relations\HasMany
     */
    public function students(): HasMany
    {
        return $this->hasMany(Student::class);
    }

    /**
     * Get the admin user (owner/kurucu) for the tenant.
     *
     * @return \Illuminate\Database\Eloquent\Relations\HasOne
     */
    public function adminUser(): HasOne
    {
        return $this->hasOne(User::class)
            ->whereHas('role', function ($query) {
                $query->where('name', 'owner');
            })
            ->oldest(); // İlk kurucuyu al
    }

    /**
     * Get the current subscription for the tenant.
     *
     * @return \Illuminate\Database\Eloquent\Relations\BelongsTo
     */
    public function currentSubscription(): BelongsTo
    {
        return $this->belongsTo(Subscription::class, 'current_subscription_id');
    }

    /**
     * Get all subscriptions for the tenant.
     *
     * @return \Illuminate\Database\Eloquent\Relations\HasMany
     */
    public function subscriptions(): HasMany
    {
        return $this->hasMany(Subscription::class);
    }

    /**
     * Check if tenant has active subscription.
     *
     * @return bool
     */
    public function hasActiveSubscription(): bool
    {
        return $this->currentSubscription && $this->currentSubscription->isActive();
    }

    /**
     * Check if tenant can add more students.
     *
     * @return bool
     */
    public function canAddStudents(): bool
    {
        return true;
    }

    /**
     * Get module licenses for this tenant (*lem products).
     *
     * @return \Illuminate\Database\Eloquent\Relations\HasMany
     */
    public function moduleLicenses(): HasMany
    {
        return $this->hasMany(TenantModuleLicense::class);
    }

    /**
     * Get payments / installments for this tenant.
     *
     * @return \Illuminate\Database\Eloquent\Relations\HasMany
     */
    public function payments(): HasMany
    {
        return $this->hasMany(TenantPayment::class);
    }

    /**
     * Check if module is available for tenant.
     *
     * @param  string  $module
     * @return bool
     */
    public function hasModule(string $module): bool
    {
        // 1. Önce doğrudan okul lisans tablosuna bak (TenantModuleLicense)
        $license = $this->moduleLicenses()
            ->where('module_code', $module)
            ->where('is_active', true)
            ->first();

        if ($license) {
            if ($license->expires_at && $license->expires_at < now()->toDateString()) {
                return false;
            }
            return true;
        }

        // 2. Fallback: Eski paket abonelik kontrolü
        if ($this->currentSubscription) {
            return $this->currentSubscription->hasModule($module);
        }

        return false;
    }

    /**
     * Check if SMS notifications are enabled for this tenant.
     *
     * @return bool
     */
    public function isSmsNotificationEnabled(): bool
    {
        $setting = \App\Models\Setting::where('tenant_id', $this->id)
            ->where('key', 'sms_notification_enabled')
            ->first();

        // Eğer ayar yoksa, varsayılan olarak false (kapalı)
        if (!$setting) {
            return false;
        }

        return (bool) $setting->typed_value;
    }

    /**
     * Get settings relationship.
     *
     * @return \Illuminate\Database\Eloquent\Relations\HasMany
     */
    public function settings(): HasMany
    {
        return $this->hasMany(Setting::class);
    }
}
