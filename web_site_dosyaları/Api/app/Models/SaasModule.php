<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;

class SaasModule extends Model
{
    use HasFactory;

    protected $table = 'saas_modules';

    protected $fillable = [
        'code',
        'name',
        'description',
        'icon',
        'badge_color',
        'annual_price',
        'monthly_price',
        'is_active',
        'sort_order',
    ];

    protected function casts(): array
    {
        return [
            'annual_price' => 'decimal:2',
            'monthly_price' => 'decimal:2',
            'is_active' => 'boolean',
            'sort_order' => 'integer',
        ];
    }

    /**
     * Get all tenant licenses for this module.
     */
    public function licenses(): HasMany
    {
        return $this->hasMany(TenantModuleLicense::class, 'module_code', 'code');
    }

    /**
     * Get active tenant count using this module.
     */
    public function getActiveTenantsCountAttribute(): int
    {
        return $this->licenses()->where('is_active', true)->count();
    }
}
