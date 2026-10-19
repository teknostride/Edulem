<?php

namespace App\Http\Controllers;

use App\Models\UserCampusBranchAssignment;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;

class UserAssignmentController extends ApiController
{
    /**
     * Display a listing of user assignments.
     * Filtreleme: campus_id, branch_id, user_id
     */
    public function index(Request $request): JsonResponse
    {
        try {
            $tenantId = Auth::user()->tenant_id;
            
            $query = UserCampusBranchAssignment::with(['user.role', 'campus', 'branch'])
                ->where('tenant_id', $tenantId);

            // Filtreleme
            if ($request->has('campus_id')) {
                $query->where('campus_id', $request->campus_id);
            }

            if ($request->has('branch_id')) {
                $query->where('branch_id', $request->branch_id);
            }

            if ($request->has('user_id')) {
                $query->where('user_id', $request->user_id);
            }

            $assignments = $query->get();

            return $this->success([
                'assignments' => $assignments,
            ], 'Kullanıcı atamaları başarıyla listelendi.');
        } catch (\Exception $e) {
            return $this->error('Kullanıcı atamaları listelenirken bir hata oluştu: ' . $e->getMessage(), [], 500);
        }
    }

    /**
     * Store a newly created user assignment.
     */
    public function store(Request $request): JsonResponse
    {
        try {
            $validated = $request->validate([
                'user_id' => 'required|exists:users,id',
                'campus_id' => 'nullable|exists:campuses,id',
                'branch_id' => 'nullable|exists:branches,id',
            ], [
                'user_id.required' => 'Kullanıcı seçilmelidir.',
                'user_id.exists' => 'Seçilen kullanıcı bulunamadı.',
                'campus_id.exists' => 'Seçilen kampüs bulunamadı.',
                'branch_id.exists' => 'Seçilen kademe bulunamadı.',
            ]);

            // En az bir atama olmalı (campus veya branch)
            if (empty($validated['campus_id']) && empty($validated['branch_id'])) {
                return $this->error('Kampüs veya kademe seçilmelidir.', [], 400);
            }

            $tenantId = Auth::user()->tenant_id;
            
            // Aynı atama zaten var mı kontrol et
            $existing = UserCampusBranchAssignment::where('tenant_id', $tenantId)
                ->where('user_id', $validated['user_id'])
                ->where('campus_id', $validated['campus_id'] ?? null)
                ->where('branch_id', $validated['branch_id'] ?? null)
                ->first();

            if ($existing) {
                return $this->error('Bu atama zaten mevcut.', [], 400);
            }

            $assignment = UserCampusBranchAssignment::create([
                'tenant_id' => $tenantId,
                'user_id' => $validated['user_id'],
                'campus_id' => $validated['campus_id'] ?? null,
                'branch_id' => $validated['branch_id'] ?? null,
            ]);

            return $this->success(
                ['assignment' => $assignment->load(['user.role', 'campus', 'branch'])],
                'Kullanıcı ataması başarıyla oluşturuldu.',
                201
            );
        } catch (\Illuminate\Validation\ValidationException $e) {
            return $this->error('Doğrulama hatası', $e->errors(), 422);
        } catch (\Exception $e) {
            return $this->error('Kullanıcı ataması oluşturulurken bir hata oluştu: ' . $e->getMessage(), [], 500);
        }
    }

    /**
     * Remove the specified user assignment.
     */
    public function destroy(string $id): JsonResponse
    {
        try {
            $tenantId = Auth::user()->tenant_id;
            $assignment = UserCampusBranchAssignment::where('tenant_id', $tenantId)
                ->findOrFail($id);
            
            $assignment->delete();

            return $this->success([], 'Kullanıcı ataması başarıyla silindi.');
        } catch (\Exception $e) {
            return $this->error('Kullanıcı ataması silinirken bir hata oluştu: ' . $e->getMessage(), [], 500);
        }
    }

    /**
     * Sync user assignments for a campus or branch (bulk update).
     * Mevcut atamaları siler ve yeni atamaları oluşturur.
     */
    public function sync(Request $request): JsonResponse
    {
        try {
            $validated = $request->validate([
                'campus_id' => 'nullable|exists:campuses,id',
                'branch_id' => 'nullable|exists:branches,id',
                'user_ids' => 'required|array',
                'user_ids.*' => 'exists:users,id',
            ], [
                'user_ids.required' => 'En az bir kullanıcı seçilmelidir.',
                'user_ids.array' => 'Kullanıcılar liste formatında olmalıdır.',
            ]);

            // En az bir atama olmalı (campus veya branch)
            if (empty($validated['campus_id']) && empty($validated['branch_id'])) {
                return $this->error('Kampüs veya kademe seçilmelidir.', [], 400);
            }

            $tenantId = Auth::user()->tenant_id;

            // Mevcut atamaları sil
            $query = UserCampusBranchAssignment::where('tenant_id', $tenantId);
            if ($validated['campus_id']) {
                $query->where('campus_id', $validated['campus_id']);
            }
            if ($validated['branch_id']) {
                $query->where('branch_id', $validated['branch_id']);
            }
            $query->delete();

            // Yeni atamaları oluştur
            $assignments = [];
            foreach ($validated['user_ids'] as $userId) {
                $assignments[] = UserCampusBranchAssignment::create([
                    'tenant_id' => $tenantId,
                    'user_id' => $userId,
                    'campus_id' => $validated['campus_id'] ?? null,
                    'branch_id' => $validated['branch_id'] ?? null,
                ]);
            }

            return $this->success(
                ['assignments' => UserCampusBranchAssignment::with(['user.role', 'campus', 'branch'])
                    ->whereIn('id', collect($assignments)->pluck('id'))
                    ->get()],
                'Kullanıcı atamaları başarıyla senkronize edildi.'
            );
        } catch (\Illuminate\Validation\ValidationException $e) {
            return $this->error('Doğrulama hatası', $e->errors(), 422);
        } catch (\Exception $e) {
            return $this->error('Kullanıcı atamaları senkronize edilirken bir hata oluştu: ' . $e->getMessage(), [], 500);
        }
    }
}
