<?php

namespace App\Http\Controllers;

use App\Actions\CreatePaymentAction;
use App\Actions\UpdatePaymentAction;
use App\Http\Requests\StorePaymentRequest;
use App\Http\Requests\UpdatePaymentRequest;
use App\Http\Resources\PaymentResource;
use App\Models\Payment;
use Illuminate\Http\JsonResponse;
use Illuminate\Support\Facades\Gate;

class PaymentController extends ApiController
{
    /**
     * Display a listing of payments.
     *
     * @return \Illuminate\Http\JsonResponse
     */
    public function index(): JsonResponse
    {
        // Row-Level Security: Policy kontrolü
        if (Gate::denies('viewAny', Payment::class)) {
            return $this->error('Ödeme listesini görüntüleme yetkiniz bulunmamaktadır.', [], 403);
        }

        try {
            $query = Payment::with(['student', 'receivedBy']);

            // Filtreleme
            if (request()->has('student_id')) {
                $query->where('student_id', request('student_id'));
            }

            if (request()->has('payment_method')) {
                $query->where('payment_method', request('payment_method'));
            }

            if (request()->has('date_from')) {
                $query->where('payment_date', '>=', request('date_from'));
            }

            if (request()->has('date_to')) {
                $query->where('payment_date', '<=', request('date_to'));
            }

            // Sıralama
            $sortBy = request('sort_by', 'payment_date');
            $sortOrder = request('sort_order', 'desc');
            $query->orderBy($sortBy, $sortOrder);

            $payments = $query->paginate(request('per_page', 15));

            return $this->success([
                'payments' => PaymentResource::collection($payments),
                'pagination' => [
                    'current_page' => $payments->currentPage(),
                    'last_page' => $payments->lastPage(),
                    'per_page' => $payments->perPage(),
                    'total' => $payments->total(),
                ],
                'summary' => [
                    'total_amount' => (float) Payment::sum('amount'),
                    'total_count' => Payment::count(),
                ],
            ], 'Ödemeler başarıyla listelendi.');
        } catch (\Exception $e) {
            return $this->error('Ödemeler listelenirken bir hata oluştu: ' . $e->getMessage(), [], 500);
        }
    }

    /**
     * Store a newly created payment in storage.
     *
     * @param  \App\Http\Requests\StorePaymentRequest  $request
     * @param  \App\Actions\CreatePaymentAction  $action
     * @return \Illuminate\Http\JsonResponse
     */
    public function store(StorePaymentRequest $request, CreatePaymentAction $action): JsonResponse
    {
        // Row-Level Security: Policy kontrolü
        if (Gate::denies('create', Payment::class)) {
            return $this->error('Ödeme oluşturma yetkiniz bulunmamaktadır.', [], 403);
        }

        try {
            $payment = $action->execute($request->validated());

            return $this->success(
                ['payment' => new PaymentResource($payment)],
                'Ödeme başarıyla kaydedildi.',
                201
            );
        } catch (\Exception $e) {
            return $this->error('Ödeme kaydedilirken bir hata oluştu: ' . $e->getMessage(), [], 500);
        }
    }

    /**
     * Display the specified payment.
     *
     * @param  int  $id
     * @return \Illuminate\Http\JsonResponse
     */
    public function show(int $id): JsonResponse
    {
        try {
            $payment = Payment::with(['student', 'receivedBy', 'installmentPayments'])->findOrFail($id);

            // Row-Level Security: Policy kontrolü
            if (Gate::denies('view', $payment)) {
                return $this->error('Bu ödemeyi görüntüleme yetkiniz bulunmamaktadır.', [], 403);
            }

            return $this->success(
                ['payment' => new PaymentResource($payment)],
                'Ödeme başarıyla getirildi.'
            );
        } catch (\Exception $e) {
            return $this->error('Ödeme getirilirken bir hata oluştu: ' . $e->getMessage(), [], 500);
        }
    }

    /**
     * Update the specified payment.
     *
     * @param  int  $id
     * @param  \App\Http\Requests\UpdatePaymentRequest  $request
     * @param  \App\Actions\UpdatePaymentAction  $action
     * @return \Illuminate\Http\JsonResponse
     */
    public function update(int $id, UpdatePaymentRequest $request, UpdatePaymentAction $action): JsonResponse
    {
        try {
            $payment = Payment::findOrFail($id);

            // Row-Level Security: Policy kontrolü
            if (Gate::denies('update', $payment)) {
                return $this->error('Bu ödemeyi güncelleme yetkiniz bulunmamaktadır.', [], 403);
            }

            $payment = $action->execute($payment, $request->validated());

            return $this->success(
                ['payment' => new PaymentResource($payment)],
                'Ödeme başarıyla güncellendi.'
            );
        } catch (\Exception $e) {
            return $this->error('Ödeme güncellenirken bir hata oluştu: ' . $e->getMessage(), [], 500);
        }
    }

    /**
     * Remove the specified payment.
     *
     * @param  int  $id
     * @return \Illuminate\Http\JsonResponse
     */
    public function destroy(int $id): JsonResponse
    {
        try {
            $payment = Payment::findOrFail($id);

            // Row-Level Security: Policy kontrolü
            if (Gate::denies('delete', $payment)) {
                return $this->error('Bu ödemeyi silme yetkiniz bulunmamaktadır.', [], 403);
            }

            // Activity log
            $activityLogService = app(\App\Services\ActivityLogService::class);
            $activityLogService->logDelete($payment);

            $payment->delete();

            return $this->success([], 'Ödeme başarıyla silindi.');
        } catch (\Exception $e) {
            return $this->error('Ödeme silinirken bir hata oluştu: ' . $e->getMessage(), [], 500);
        }
    }
}
