<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsToMany;

class StaffDuty extends Model
{
    use HasFactory;

    protected $fillable = [
        'name',
        'display_name',
        'description',
        'category',
        'is_active',
        'permissions',
    ];

    protected $casts = [
        'is_active' => 'boolean',
        'permissions' => 'array',
    ];

    protected $dates = [
        'created_at',
        'updated_at',
    ];

    /**
     * Get users assigned to this duty.
     */
    public function users()
    {
        return $this->belongsToMany(User::class, 'staff_duty_assignments', 'duty_id', 'user_id')
            ->withPivot(['assigned_by', 'assigned_at', 'expires_at', 'is_active', 'notes'])
            ->wherePivot('is_active', true)
            ->where(function ($query) {
                $query->whereNull('expires_at')
                    ->orWhere('expires_at', '>', now());
            });
    }

    /**
     * Get all users assigned to this duty including inactive ones.
     */
    public function allUsers()
    {
        return $this->belongsToMany(User::class, 'staff_duty_assignments', 'duty_id', 'user_id')
            ->withPivot(['assigned_by', 'assigned_at', 'expires_at', 'is_active', 'notes']);
    }

    /**
     * Scope to get duties by category.
     */
    public function scopeByCategory($query, $category)
    {
        return $query->where('category', $category);
    }

    /**
     * Scope to get active duties.
     */
    public function scopeActive($query)
    {
        return $query->where('is_active', true);
    }

    /**
     * Scope to get inactive duties.
     */
    public function scopeInactive($query)
    {
        return $query->where('is_active', false);
    }

    /**
     * Get duties by category.
     */
    public static function getByCategory($category)
    {
        return static::where('category', $category)->active()->get();
    }

    /**
     * Get academic duties.
     */
    public static function getAcademicDuties()
    {
        return static::getByCategory('academic');
    }

    /**
     * Get administrative duties.
     */
    public static function getAdministrativeDuties()
    {
        return static::getByCategory('administrative');
    }

    /**
     * Get support duties.
     */
    public static function getSupportDuties()
    {
        return static::getByCategory('support');
    }

    /**
     * Check if duty is academic.
     */
    public function isAcademic(): bool
    {
        return $this->category === 'academic';
    }

    /**
     * Check if duty is administrative.
     */
    public function isAdministrative(): bool
    {
        return $this->category === 'administrative';
    }

    /**
     * Check if duty is support.
     */
    public function isSupport(): bool
    {
        return $this->category === 'support';
    }

    /**
     * Get formatted permissions.
     */
    public function getFormattedPermissions(): array
    {
        return $this->permissions ?? [];
    }

    /**
     * Check if duty has specific permission.
     */
    public function hasPermission($permission): bool
    {
        return in_array('*', $this->permissions) || in_array($permission, $this->permissions);
    }
}
