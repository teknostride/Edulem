<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class TenantModuleLicense extends Model
{
    use HasFactory;

    protected $table = 'tenant_module_licenses';

    protected $fillable = [
        'tenant_id',
        'module_code',
        'is_active',
        'agreed_price',
        'starts_at',
        'expires_at',
    ];

    protected function casts(): array
    {
        return [
            'is_active' => 'boolean',
            'agreed_price' => 'decimal:2',
            'starts_at' => 'date',
            'expires_at' => 'date',
        ];
    }

    public function tenant(): BelongsTo
    {
        return $this->belongsTo(Tenant::class);
    }

    public function moduleDefinition(): BelongsTo
    {
        return $this->belongsTo(SaasModule::class, 'module_code', 'code');
    }

    public function module(): BelongsTo
    {
        return $this->belongsTo(SaasModule::class, 'module_code', 'code');
    }
}
