<?php

namespace App\Actions;

use App\Models\Tenant;
use App\Models\User;
use App\Models\Role;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;

class UpdateTenantAction
{
    /**
     * Execute the action to update a tenant.
     *
     * @param  \App\Models\Tenant  $tenant
     * @param  array  $data
     * @return \App\Models\Tenant
     */
    public function execute(Tenant $tenant, array $data): Tenant
    {
        return DB::transaction(function () use ($tenant, $data) {
            // Update tenant info
            $tenant->update([
                'domain' => $data['domain'] ?? $tenant->domain,
                'name' => $data['name'] ?? $tenant->name,
                'is_active' => $data['is_active'] ?? $tenant->is_active,
            ]);

            // Update admin user if provided
            if (isset($data['admin_name']) || isset($data['admin_email']) || isset($data['admin_password'])) {
                // Önce owner rolünü ara, yoksa general_manager'ı ara (geriye dönük uyumluluk için)
                $role = Role::where('tenant_id', $tenant->id)
                    ->whereIn('name', ['owner', 'general_manager'])
                    ->orderByRaw("CASE WHEN name = 'owner' THEN 0 ELSE 1 END")
                    ->first();

                if ($role) {
                    $adminUser = User::where('tenant_id', $tenant->id)
                        ->where('role_id', $role->id)
                        ->first();

                    if ($adminUser) {
                        $updateData = [];
                        
                        if (isset($data['admin_name'])) {
                            $updateData['name'] = $data['admin_name'];
                        }
                        
                        if (isset($data['admin_email'])) {
                            $updateData['email'] = $data['admin_email'];
                        }
                        
                        // Şifre sadece gönderilmişse güncelle (boş değilse)
                        if (isset($data['admin_password']) && !empty($data['admin_password'])) {
                            $updateData['password'] = Hash::make($data['admin_password']);
                        }
                        
                        if (!empty($updateData)) {
                            $adminUser->update($updateData);
                        }
                    }
                }
            }

            return $tenant->fresh();
        });
    }
}
