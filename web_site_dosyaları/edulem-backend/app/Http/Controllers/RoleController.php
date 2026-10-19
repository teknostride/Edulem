<?php

namespace App\Http\Controllers;

use App\Models\Role;
use App\Models\Permission;
use Illuminate\Http\Request;
use Illuminate\Http\JsonResponse;

class RoleController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $tenantId = auth()->user()?->tenant_id;

        // Eğer bu okul için standart roller henüz oluşturulmamışsa, Kurum 1'deki (Ak İrfan) standart rolleri kopyala
        if ($tenantId) {
            try {
                $existingNames = \Illuminate\Support\Facades\DB::table('roles')
                    ->where('tenant_id', $tenantId)
                    ->pluck('name')
                    ->toArray();

                $templateRoles = \Illuminate\Support\Facades\DB::table('roles')
                    ->where('tenant_id', 1)
                    ->whereNotIn('name', ['owner', 'Genel Müdür', 'Kampüs Müdürü', 'Sınıf Öğretmeni', 'guardian'])
                    ->get();

                foreach ($templateRoles as $tr) {
                    if (!in_array($tr->name, $existingNames, true)) {
                        $newRoleId = \Illuminate\Support\Facades\DB::table('roles')->insertGetId([
                            'tenant_id'    => $tenantId,
                            'name'         => $tr->name,
                            'display_name' => $tr->display_name,
                            'description'  => $tr->description,
                            'is_system'    => $tr->is_system ?? 1,
                            'level'        => $tr->level ?? 4,
                            'sort_order'   => $tr->sort_order ?? 0,
                            'created_at'   => now(),
                            'updated_at'   => now(),
                        ]);

                        // İzinleri de kopyala (role_permission tablosu varsa)
                        try {
                            $perms = \Illuminate\Support\Facades\DB::table('role_permission')
                                ->where('role_id', $tr->id)
                                ->pluck('permission_id')
                                ->toArray();
                            if (!empty($perms)) {
                                $permInserts = array_map(fn($pid) => [
                                    'role_id'       => $newRoleId,
                                    'permission_id' => $pid,
                                    'created_at'    => now(),
                                    'updated_at'    => now(),
                                ], $perms);
                                \Illuminate\Support\Facades\DB::table('role_permission')->insertOrIgnore($permInserts);
                            }
                        } catch (\Throwable $pe) {}
                    }
                }
            } catch (\Throwable $e) {
                \Log::warning('Auto role clone error: ' . $e->getMessage());
            }
        }

        // Gizlenecek roller - 'owner' (Kurum Sahibi) sadece SaaS SuperAdmin tarafından yönetimden atanabilir
        $hiddenRoles = ['Genel Müdür', 'Kampüs Müdürü', 'Sınıf Öğretmeni', 'owner', 'guardian'];

        $query = Role::query()
            ->select([
                'id',
                'tenant_id',
                'parent_id',
                'level',
                'sort_order',
                'name',
                'display_name',
                'description',
                'is_system',
                'page_visibility',
            ])
            ->withCount('users')
            ->whereNotIn('name', $hiddenRoles)
            ->orderBy('sort_order')
            ->orderBy('id');

        if ($request->boolean('include_permissions')) {
            $query->with('permissions');
        }

        $roles = $query->get();
        
        return response()->json([
            'data' => $roles,
            'meta' => [
                'total' => $roles->count(),
                'per_page' => $roles->count(),
                'current_page' => 1,
                'last_page' => 1
            ]
        ]);
    }

    /**
     * Store a newly created resource in storage.
     */
    public function store(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'name' => 'required|string|unique:roles|max:255',
            'display_name' => 'required|string|max:255',
            'description' => 'nullable|string',
            'hierarchy_level' => 'required|integer|min:1|max:100',
            'is_system_role' => 'boolean',
            'permissions' => 'array',
            'permissions.*' => 'exists:permissions,name'
        ]);

        $role = Role::create([
            'name' => $validated['name'],
            'display_name' => $validated['display_name'],
            'description' => $validated['description'] ?? null,
            'hierarchy_level' => $validated['hierarchy_level'],
            'is_system_role' => $validated['is_system_role'] ?? false
        ]);

        // Sync permissions
        if (isset($validated['permissions'])) {
            $permissionIds = Permission::whereIn('name', $validated['permissions'])->pluck('id');
            $role->permissions()->sync($permissionIds);
        }

        $role->load('permissions');

        return response()->json([
            'data' => $role,
            'message' => 'Role created successfully'
        ], 201);
    }

    /**
     * Display the specified resource.
     */
    public function show(Role $role): JsonResponse
    {
        $role->load('permissions');

        return response()->json([
            'data' => $role
        ]);
    }

    /**
     * Update the specified resource in storage.
     */
    public function update(Request $request, Role $role): JsonResponse
    {
        if ($role->is_system_role) {
            return response()->json([
                'message' => 'Cannot update system role'
            ], 403);
        }

        $validated = $request->validate([
            'name' => 'sometimes|string|unique:roles,name,' . $role->id . '|max:255',
            'display_name' => 'sometimes|string|max:255',
            'description' => 'nullable|string',
            'hierarchy_level' => 'sometimes|integer|min:1|max:100',
            'permissions' => 'array',
            'permissions.*' => 'exists:permissions,name'
        ]);

        $role->update($validated);

        // Sync permissions
        if (isset($validated['permissions'])) {
            $permissionIds = Permission::whereIn('name', $validated['permissions'])->pluck('id');
            $role->permissions()->sync($permissionIds);
        }

        $role->load('permissions');

        return response()->json([
            'data' => $role,
            'message' => 'Role updated successfully'
        ]);
    }

    /**
     * Remove the specified resource from storage.
     */
    public function destroy(Role $role): JsonResponse
    {
        if ($role->is_system_role) {
            return response()->json([
                'message' => 'Cannot delete system role'
            ], 403);
        }

        $role->delete();

        return response()->json([
            'message' => 'Role deleted successfully'
        ]);
    }

    /**
     * Update page visibility settings for the role.
     */
    public function updatePageVisibility(Request $request, Role $role): JsonResponse
    {
        $validated = $request->validate([
            'page_visibility' => 'required|array',
        ]);

        $role->update([
            'page_visibility' => $validated['page_visibility'],
        ]);

        return response()->json([
            'data' => $role,
            'message' => 'Sayfa görünürlükleri güncellendi'
        ]);
    }
}

