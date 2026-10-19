<?php

namespace App\Http\Controllers;

use App\Actions\CreateContractAction;
use App\Actions\UpdateContractAction;
use App\Http\Requests\StoreContractRequest;
use App\Http\Requests\UpdateContractRequest;
use App\Http\Resources\ContractResource;
use App\Jobs\GenerateContractPdfJob;
use App\Models\Contract;
use App\Services\ActivityLogService;
use App\Services\ContractService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Gate;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Storage;
use Illuminate\Validation\Rule;

class ContractController extends ApiController
{
    protected ActivityLogService $activityLogService;

    public function __construct(ActivityLogService $activityLogService)
    {
        $this->activityLogService = $activityLogService;
    }

    /**
     * Display a listing of contracts.
     */
    public function index(): JsonResponse
    {
        Gate::authorize('viewAny', Contract::class);

        $query = Contract::with(['student', 'file', 'creator', 'signedByGuardian']);

        // Filtreleme
        if (request()->has('student_id')) {
            $query->where('student_id', request('student_id'));
        }

        if (request()->has('status')) {
            $query->where('status', request('status'));
        }

        if (request()->has('contract_date_from')) {
            $query->where('contract_date', '>=', request('contract_date_from'));
        }

        if (request()->has('contract_date_to')) {
            $query->where('contract_date', '<=', request('contract_date_to'));
        }

        if (request()->has('search')) {
            $search = request('search');
            $query->where(function ($q) use ($search) {
                $q->where('contract_no', 'like', "%{$search}%")
                    ->orWhereHas('student', function ($q) use ($search) {
                        $q->where('name', 'like', "%{$search}%");
                    });
            });
        }

        // Sıralama
        $query->latest('contract_date')->latest('created_at');

        $contracts = $query->paginate(request('per_page', 50));

        // İstatistikler
        $stats = [
            'total' => Contract::count(),
            'draft' => Contract::where('status', 'draft')->count(),
            'active' => Contract::where('status', 'active')->count(),
            'expired' => Contract::where('status', 'expired')->count(),
            'cancelled' => Contract::where('status', 'cancelled')->count(),
        ];

        return $this->success([
            'contracts' => ContractResource::collection($contracts),
            'pagination' => [
                'current_page' => $contracts->currentPage(),
                'last_page' => $contracts->lastPage(),
                'per_page' => $contracts->perPage(),
                'total' => $contracts->total(),
            ],
            'statistics' => $stats,
        ], 'Sözleşmeler başarıyla listelendi.');
    }

    /**
     * Store a newly created contract in storage.
     */
    public function store(StoreContractRequest $request, CreateContractAction $createContractAction): JsonResponse
    {
        Gate::authorize('create', Contract::class);

        try {
            $contract = $createContractAction->execute($request->validated());
            return $this->success(new ContractResource($contract), 'Sözleşme başarıyla oluşturuldu.', 201);
        } catch (\Exception $e) {
            return $this->error('Sözleşme oluşturulurken bir hata oluştu: ' . $e->getMessage(), [], 500);
        }
    }

    /**
     * Display the specified contract.
     */
    public function show(Contract $contract): JsonResponse
    {
        Gate::authorize('view', $contract);

        return $this->success(new ContractResource($contract->load(['student', 'file', 'creator', 'signedByGuardian'])), 'Sözleşme başarıyla getirildi.');
    }

    /**
     * Update the specified contract in storage.
     */
    public function update(UpdateContractRequest $request, Contract $contract, UpdateContractAction $updateContractAction): JsonResponse
    {
        Gate::authorize('update', $contract);

        try {
            $updatedContract = $updateContractAction->execute($contract, $request->validated());
            return $this->success(new ContractResource($updatedContract), 'Sözleşme başarıyla güncellendi.');
        } catch (\Exception $e) {
            return $this->error('Sözleşme güncellenirken bir hata oluştu: ' . $e->getMessage(), [], 500);
        }
    }

    /**
     * Remove the specified contract from storage.
     */
    public function destroy(Contract $contract): JsonResponse
    {
        Gate::authorize('delete', $contract);

        try {
            $this->activityLogService->logDelete($contract);
            $contract->delete();
            return $this->success([], 'Sözleşme başarıyla silindi.');
        } catch (\Exception $e) {
            return $this->error('Sözleşme silinirken bir hata oluştu: ' . $e->getMessage(), [], 500);
        }
    }

    /**
     * Generate contract PDF.
     */
    public function generatePdf(Request $request, ContractService $contractService): JsonResponse
    {
        Gate::authorize('view', Contract::class);

        $request->validate([
            'contract_id' => ['required', 'exists:contracts,id'],
            'template_id' => ['nullable', 'exists:report_card_templates,id'],
            'queue' => ['sometimes', 'boolean'],
        ]);

        $contractId = $request->input('contract_id');
        $templateId = $request->input('template_id');
        $useQueue = $request->input('queue', true);

        $templatePath = null;
        if ($templateId) {
            $template = \App\Models\ReportCardTemplate::findOrFail($templateId);
            // Assuming template_config contains the blade view path or logic to determine it
            $templatePath = $template->template_config['view_path'] ?? 'contracts.contract';
        }

        $user = auth()->user();

        if ($useQueue) {
            GenerateContractPdfJob::dispatch(
                $contractId,
                $user->id,
                $user->tenant_id
            );
            return $this->success(null, 'Sözleşme PDF oluşturma işlemi kuyruğa eklendi.');
        } else {
            try {
                $filePath = $contractService->generatePdf($contractId, $templatePath);
                return $this->success(['file_path' => $filePath], 'Sözleşme PDF başarıyla oluşturuldu.');
            } catch (\Exception $e) {
                Log::error('Sözleşme PDF oluşturma hatası (senkron)', [
                    'contract_id' => $contractId,
                    'error' => $e->getMessage(),
                    'trace' => $e->getTraceAsString(),
                ]);
                return $this->error('Sözleşme PDF oluşturulurken bir hata oluştu: ' . $e->getMessage(), [], 500);
            }
        }
    }

    /**
     * Download contract PDF.
     */
    public function downloadPdf(Request $request): JsonResponse
    {
        Gate::authorize('view', Contract::class);

        $request->validate([
            'file_path' => ['required', 'string'],
        ]);

        $filePath = $request->input('file_path');

        if (!Storage::disk('local')->exists($filePath)) {
            return $this->error('Sözleşme dosyası bulunamadı.', [], 404);
        }

        return response()->json([
            'status' => true,
            'message' => 'Sözleşme dosyası başarıyla indirildi.',
            'data' => [
                'url' => Storage::disk('local')->url($filePath),
                'file_name' => basename($filePath),
            ],
        ]);
    }
}
