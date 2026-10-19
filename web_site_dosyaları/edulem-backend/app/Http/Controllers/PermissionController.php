<?php

namespace App\Http\Controllers;

use App\Models\Permission;
use Illuminate\Http\Request;
use Illuminate\Http\JsonResponse;

class PermissionController extends Controller
{
    /**
     * Display a listing of the resource.
     */
    public function index(Request $request): JsonResponse
    {
        $permissions = Permission::withCount('roles')->get();
        
        return response()->json([
            'data' => $permissions,
            'meta' => [
                'total' => $permissions->count(),
                'per_page' => $permissions->count(),
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
            'name' => 'required|string|unique:permissions|max:255',
            'display_name' => 'required|string|max:255',
            'description' => 'nullable|string',
            'category' => 'required|string|max:255',
            'is_system_permission' => 'boolean'
        ]);

        $permission = Permission::create($validated);

        return response()->json([
            'data' => $permission,
            'message' => 'Permission created successfully'
        ], 201);
    }

    /**
     * Display the specified resource.
     */
    public function show(Permission $permission): JsonResponse
    {
        $permission->load('roles');

        return response()->json([
            'data' => $permission
        ]);
    }

    /**
     * Update the specified resource in storage.
     */
    public function update(Request $request, Permission $permission): JsonResponse
    {
        $validated = $request->validate([
            'name' => 'sometimes|string|unique:permissions,name,' . $permission->id . '|max:255',
            'display_name' => 'sometimes|string|max:255',
            'description' => 'nullable|string',
            'category' => 'sometimes|string|max:255',
            'is_system_permission' => 'boolean'
        ]);

        $permission->update($validated);

        return response()->json([
            'data' => $permission,
            'message' => 'Permission updated successfully'
        ]);
    }

    /**
     * Remove the specified resource from storage.
     */
    public function destroy(Permission $permission): JsonResponse
    {
        if ($permission->is_system_permission) {
            return response()->json([
                'message' => 'Cannot delete system permission'
            ], 403);
        }

        $permission->delete();

        return response()->json([
            'message' => 'Permission deleted successfully'
        ]);
    }
}
