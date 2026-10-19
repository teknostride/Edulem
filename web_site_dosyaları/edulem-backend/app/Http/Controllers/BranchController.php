<?php

namespace App\Http\Controllers;

use App\Models\Branch;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;

class BranchController extends ApiController
{
    /**
     * Display a listing of branches.
     */
    public function index(): JsonResponse
    {
        try {
            $user = Auth::user();
            $query = Branch::with(['campus', 'educationLevel', 'manager']);

            if (request()->has('campus_id')) {
                $query->where('campus_id', request('campus_id'));
            }

            if (request()->has('education_level_id')) {
                $query->where('education_level_id', request('education_level_id'));
            }

            if (request()->has('is_active') && request()->is_active !== '' && request()->is_active !== null) {
                $val = request()->is_active;
                $active = $val === true || $val === '1' || $val === 1 || $val === 'true';
                $query->where('is_active', $active);
            }

            $branches = $query->paginate(request('per_page', 100));

            \Log::info('BranchController::index', [
                'user_id' => $user->id,
                'requested_campus_id' => request('campus_id'),
                'branches_count' => count($branches->items()),
            ]);

            return $this->success([
                'branches' => $branches->items(),
                'pagination' => [
                    'current_page' => $branches->currentPage(),
                    'last_page' => $branches->lastPage(),
                    'per_page' => $branches->perPage(),
                    'total' => $branches->total(),
                ],
            ], 'Şubeler başarıyla listelendi.');
        } catch (\Exception $e) {
            \Log::error('BranchController::index error', [
                'message' => $e->getMessage(),
                'trace' => $e->getTraceAsString()
            ]);
            return $this->error('Şubeler listelenirken bir hata oluştu: ' . $e->getMessage(), [], 500);
        }
    }

    /**
     * Store a newly created branch.
     */
    public function store(Request $request): JsonResponse
    {
        try {
            $user = Auth::user();

            \Log::info('BranchController::store - Input received', [
                'user_id' => $user->id,
                'request_data' => $request->all(),
            ]);

            $validated = $request->validate([
                'campus_id' => 'required|integer|exists:campuses,id',
                'name' => 'required|string|max:255',
                'education_level_id' => 'nullable|integer|exists:education_levels,id',
                'manager_id' => 'nullable|integer|exists:users,id',
            ]);

            \Log::info('BranchController::store - Validation passed', [
                'validated_data' => $validated
            ]);

            // Create the branch
            $branch = Branch::create([
                'campus_id' => $validated['campus_id'],
                'name' => $validated['name'],
                'education_level_id' => $validated['education_level_id'] ?? null,
                'manager_id' => $validated['manager_id'] ?? null,
                'is_active' => true,
            ]);

            $branch = $branch->load(['campus', 'educationLevel', 'manager']);

            \Log::info('BranchController::store - Branch created successfully', [
                'branch_id' => $branch->id,
                'branch_name' => $branch->name,
                'campus_id' => $branch->campus_id,
            ]);

            return $this->success(
                ['branch' => $branch],
                'Şube başarıyla oluşturuldu.',
                201
            );
        } catch (\Illuminate\Validation\ValidationException $e) {
            \Log::warning('BranchController::store - Validation failed', [
                'errors' => $e->errors()
            ]);
            return $this->error('Doğrulama hatası: ' . collect($e->errors())->flatten()->first(), $e->errors(), 422);
        } catch (\Exception $e) {
            \Log::error('BranchController::store error', [
                'message' => $e->getMessage(),
                'trace' => $e->getTraceAsString()
            ]);
            return $this->error('Şube oluşturulurken bir hata oluştu: ' . $e->getMessage(), [], 500);
        }
    }

    /**
     * Display the specified branch.
     */
    public function show(string $id): JsonResponse
    {
        try {
            $branch = Branch::with(['campus', 'educationLevel', 'manager'])->findOrFail($id);

            return $this->success(['branch' => $branch], 'Şube başarıyla getirildi.');
        } catch (\Illuminate\Database\Eloquent\ModelNotFoundException $e) {
            \Log::warning('BranchController::show - Branch not found', ['branch_id' => $id]);
            return $this->error('Şube bulunamadı.', [], 404);
        } catch (\Exception $e) {
            \Log::error('BranchController::show error', [
                'branch_id' => $id,
                'message' => $e->getMessage(),
            ]);
            return $this->error('Şube getirilirken bir hata oluştu.', [], 500);
        }
    }

    /**
     * Update the specified branch.
     */
    public function update(Request $request, string $id): JsonResponse
    {
        try {
            $user = Auth::user();

            \Log::info('BranchController::update - Input received', [
                'user_id' => $user->id,
                'branch_id' => $id,
                'request_data' => $request->all(),
            ]);

            $branch = Branch::findOrFail($id);

            $validated = $request->validate([
                'campus_id' => 'sometimes|integer|exists:campuses,id',
                'name' => 'sometimes|string|max:255',
                'education_level_id' => 'nullable|integer|exists:education_levels,id',
                'manager_id' => 'nullable|integer|exists:users,id',
                'is_active' => 'sometimes|boolean',
            ]);

            \Log::info('BranchController::update - Validation passed', [
                'branch_id' => $id,
                'validated_data' => $validated
            ]);

            $branch->update($validated);
            $branch = $branch->load(['campus', 'educationLevel', 'manager']);

            \Log::info('BranchController::update - Branch updated successfully', [
                'branch_id' => $branch->id,
                'branch_name' => $branch->name,
            ]);

            return $this->success(
                ['branch' => $branch],
                'Şube başarıyla güncellendi.',
                200
            );
        } catch (\Illuminate\Database\Eloquent\ModelNotFoundException $e) {
            \Log::warning('BranchController::update - Branch not found', ['branch_id' => $id]);
            return $this->error('Şube bulunamadı.', [], 404);
        } catch (\Illuminate\Validation\ValidationException $e) {
            \Log::warning('BranchController::update - Validation failed', [
                'branch_id' => $id,
                'errors' => $e->errors()
            ]);
            return $this->error('Doğrulama hatası: ' . collect($e->errors())->flatten()->first(), $e->errors(), 422);
        } catch (\Exception $e) {
            \Log::error('BranchController::update error', [
                'branch_id' => $id,
                'message' => $e->getMessage(),
                'trace' => $e->getTraceAsString()
            ]);
            return $this->error('Şube güncellenirken bir hata oluştu: ' . $e->getMessage(), [], 500);
        }
    }

    /**
     * Remove the specified branch.
     */
    public function destroy(string $id): JsonResponse
    {
        try {
            $user = Auth::user();

            \Log::info('BranchController::destroy - Delete requested', [
                'user_id' => $user->id,
                'branch_id' => $id,
            ]);

            $branch = Branch::findOrFail($id);

            // Check if branch has classrooms
            $classroomCount = $branch->classrooms()->count();
            if ($classroomCount > 0) {
                \Log::info('BranchController::destroy - Branch has classrooms', [
                    'branch_id' => $id,
                    'classroom_count' => $classroomCount
                ]);
                return $this->error(
                    "Bu şubenin $classroomCount tane sınıfı bulunmaktadır. Önce sınıfları silin.",
                    [],
                    422
                );
            }

            $branch->delete();

            \Log::info('BranchController::destroy - Branch deleted successfully', [
                'branch_id' => $id,
            ]);

            return $this->success([], 'Şube başarıyla silindi.');
        } catch (\Illuminate\Database\Eloquent\ModelNotFoundException $e) {
            \Log::warning('BranchController::destroy - Branch not found', ['branch_id' => $id]);
            return $this->error('Şube bulunamadı.', [], 404);
        } catch (\Exception $e) {
            \Log::error('BranchController::destroy error', [
                'branch_id' => $id,
                'message' => $e->getMessage(),
                'trace' => $e->getTraceAsString()
            ]);
            return $this->error('Şube silinirken bir hata oluştu: ' . $e->getMessage(), [], 500);
        }
    }
}
