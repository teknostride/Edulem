<?php

namespace App\Http\Controllers;

use App\Actions\CreateInvoiceAction;
use App\Http\Requests\StoreInvoiceRequest;
use App\Http\Resources\InvoiceResource;
use App\Jobs\GenerateInvoicePdfJob;
use App\Models\Invoice;
use Illuminate\Http\JsonResponse;
use Illuminate\Support\Facades\Gate;

class InvoiceController extends ApiController
{
    /**
     * Display a listing of invoices.
     *
     * @return \Illuminate\Http\JsonResponse
     */
    public function index(): JsonResponse
    {
        // Row-Level Security: Policy kontrolü
        if (Gate::denies('viewAny', Invoice::class)) {
            return $this->error('Fatura listesini görüntüleme yetkiniz bulunmamaktadır.', [], 403);
        }

        try {
            $query = Invoice::with(['student', 'createdBy']);

            // Filtreleme
            if (request()->has('student_id')) {
                $query->where('student_id', request('student_id'));
            }

            if (request()->has('invoice_type')) {
                $query->where('invoice_type', request('invoice_type'));
            }

            if (request()->has('status')) {
                $query->where('status', request('status'));
            }

            if (request()->has('date_from')) {
                $query->where('due_date', '>=', request('date_from'));
            }

            if (request()->has('date_to')) {
                $query->where('due_date', '<=', request('date_to'));
            }

            // Sıralama
            $sortBy = request('sort_by', 'due_date');
            $sortOrder = request('sort_order', 'desc');
            $query->orderBy($sortBy, $sortOrder);

            $invoices = $query->paginate(request('per_page', 15));

            return $this->success([
                'invoices' => InvoiceResource::collection($invoices),
                'pagination' => [
                    'current_page' => $invoices->currentPage(),
                    'last_page' => $invoices->lastPage(),
                    'per_page' => $invoices->perPage(),
                    'total' => $invoices->total(),
                ],
                'summary' => [
                    'total_amount' => (float) Invoice::where('status', '!=', 'cancelled')
                        ->selectRaw('COALESCE(SUM(COALESCE(amount, total_amount)), 0) as total')
                        ->value('total') ?? 0,
                    'pending_amount' => (float) Invoice::where('status', 'pending')
                        ->selectRaw('COALESCE(SUM(COALESCE(amount, total_amount)), 0) as total')
                        ->value('total') ?? 0,
                    'paid_amount' => (float) Invoice::where('status', 'paid')
                        ->selectRaw('COALESCE(SUM(COALESCE(amount, total_amount)), 0) as total')
                        ->value('total') ?? 0,
                ],
            ], 'Faturalar başarıyla listelendi.');
        } catch (\Exception $e) {
            return $this->error('Faturalar listelenirken bir hata oluştu: ' . $e->getMessage(), [], 500);
        }
    }

    /**
     * Store a newly created invoice in storage.
     *
     * @param  \App\Http\Requests\StoreInvoiceRequest  $request
     * @param  \App\Actions\CreateInvoiceAction  $action
     * @return \Illuminate\Http\JsonResponse
     */
    public function store(StoreInvoiceRequest $request, CreateInvoiceAction $action): JsonResponse
    {
        // Row-Level Security: Policy kontrolü
        if (Gate::denies('create', Invoice::class)) {
            return $this->error('Fatura oluşturma yetkiniz bulunmamaktadır.', [], 403);
        }

        try {
            $invoice = $action->execute($request->validated());

            // PDF oluşturma job'unu kuyruğa ekle
            GenerateInvoicePdfJob::dispatch($invoice);

            return $this->success(
                ['invoice' => new InvoiceResource($invoice)],
                'Fatura başarıyla oluşturuldu. PDF oluşturuluyor...',
                201
            );
        } catch (\Exception $e) {
            return $this->error('Fatura oluşturulurken bir hata oluştu: ' . $e->getMessage(), [], 500);
        }
    }

    /**
     * Display the specified invoice.
     *
     * @param  int  $id
     * @return \Illuminate\Http\JsonResponse
     */
    public function show(int $id): JsonResponse
    {
        try {
            $invoice = Invoice::with(['student', 'createdBy', 'file'])->findOrFail($id);

            // Row-Level Security: Policy kontrolü
            if (Gate::denies('view', $invoice)) {
                return $this->error('Bu faturayı görüntüleme yetkiniz bulunmamaktadır.', [], 403);
            }

            return $this->success(
                ['invoice' => new InvoiceResource($invoice)],
                'Fatura başarıyla getirildi.'
            );
        } catch (\Exception $e) {
            return $this->error('Fatura getirilirken bir hata oluştu: ' . $e->getMessage(), [], 500);
        }
    }

    /**
     * Generate PDF for the invoice.
     *
     * @param  int  $id
     * @return \Illuminate\Http\JsonResponse
     */
    public function generatePdf(int $id): JsonResponse
    {
        try {
            $invoice = Invoice::with(['student', 'createdBy', 'tenant'])->findOrFail($id);

            // Row-Level Security: Policy kontrolü
            if (Gate::denies('view', $invoice)) {
                return $this->error('Bu faturayı görüntüleme yetkiniz bulunmamaktadır.', [], 403);
            }

            // PDF oluşturma job'unu kuyruğa ekle
            GenerateInvoicePdfJob::dispatch($invoice);

            return $this->success(
                [],
                'PDF oluşturma işlemi kuyruğa eklendi. Kısa süre içinde hazır olacaktır.'
            );
        } catch (\Exception $e) {
            return $this->error('PDF oluşturulurken bir hata oluştu: ' . $e->getMessage(), [], 500);
        }
    }

    /**
     * Remove the specified invoice.
     *
     * @param  int  $id
     * @return \Illuminate\Http\JsonResponse
     */
    public function destroy(int $id): JsonResponse
    {
        try {
            $invoice = Invoice::findOrFail($id);

            // Row-Level Security: Policy kontrolü
            if (Gate::denies('delete', $invoice)) {
                return $this->error('Bu faturayı silme yetkiniz bulunmamaktadır.', [], 403);
            }

            // Activity log
            $activityLogService = app(\App\Services\ActivityLogService::class);
            $activityLogService->logDelete($invoice);

            $invoice->delete();

            return $this->success([], 'Fatura başarıyla silindi.');
        } catch (\Exception $e) {
            return $this->error('Fatura silinirken bir hata oluştu: ' . $e->getMessage(), [], 500);
        }
    }
}
