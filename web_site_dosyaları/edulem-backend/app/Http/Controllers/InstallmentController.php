<?php

namespace App\Http\Controllers;

use App\Actions\CreateInstallmentAction;
use App\Actions\PayInstallmentAction;
use App\Http\Requests\StoreInstallmentRequest;
use App\Http\Resources\InstallmentResource;
use App\Models\Installment;
use App\Models\InstallmentPayment;
use Illuminate\Http\JsonResponse;
use Illuminate\Support\Facades\Gate;

class InstallmentController extends ApiController
{
    /**
     * Display a listing of installments.
     *
     * @return \Illuminate\Http\JsonResponse
     */
    public function index(): JsonResponse
    {
        // Row-Level Security: Policy kontrolü
        if (Gate::denies('viewAny', Installment::class)) {
            return $this->error('Taksit listesini görüntüleme yetkiniz bulunmamaktadır.', [], 403);
        }

        try {
            $query = Installment::with(['student', 'installmentPayments']);

            // Filtreleme
            if (request()->has('student_id')) {
                $query->where('student_id', request('student_id'));
            }

            if (request()->has('status')) {
                $query->where('status', request('status'));
            }

            // Sıralama
            $sortBy = request('sort_by', 'start_date');
            $sortOrder = request('sort_order', 'desc');
            $query->orderBy($sortBy, $sortOrder);

            $installments = $query->paginate(request('per_page', 15));

            return $this->success([
                'installments' => InstallmentResource::collection($installments),
                'pagination' => [
                    'current_page' => $installments->currentPage(),
                    'last_page' => $installments->lastPage(),
                    'per_page' => $installments->perPage(),
                    'total' => $installments->total(),
                ],
            ], 'Taksitler başarıyla listelendi.');
        } catch (\Exception $e) {
            return $this->error('Taksitler listelenirken bir hata oluştu: ' . $e->getMessage(), [], 500);
        }
    }

    /**
     * Store a newly created installment plan in storage.
     *
     * @param  \App\Http\Requests\StoreInstallmentRequest  $request
     * @param  \App\Actions\CreateInstallmentAction  $action
     * @return \Illuminate\Http\JsonResponse
     */
    public function store(StoreInstallmentRequest $request, CreateInstallmentAction $action): JsonResponse
    {
        // Row-Level Security: Policy kontrolü
        if (Gate::denies('create', Installment::class)) {
            return $this->error('Taksit planı oluşturma yetkiniz bulunmamaktadır.', [], 403);
        }

        try {
            $installment = $action->execute($request->validated());

            return $this->success(
                ['installment' => new InstallmentResource($installment)],
                'Taksit planı başarıyla oluşturuldu.',
                201
            );
        } catch (\Exception $e) {
            return $this->error('Taksit planı oluşturulurken bir hata oluştu: ' . $e->getMessage(), [], 500);
        }
    }

    /**
     * Display the specified installment.
     *
     * @param  int  $id
     * @return \Illuminate\Http\JsonResponse
     */
    public function show(int $id): JsonResponse
    {
        try {
            $installment = Installment::with(['student', 'installmentPayments'])->findOrFail($id);

            // Row-Level Security: Policy kontrolü
            if (Gate::denies('view', $installment)) {
                return $this->error('Bu taksit planını görüntüleme yetkiniz bulunmamaktadır.', [], 403);
            }

            return $this->success(
                ['installment' => new InstallmentResource($installment)],
                'Taksit planı başarıyla getirildi.'
            );
        } catch (\Exception $e) {
            return $this->error('Taksit planı getirilirken bir hata oluştu: ' . $e->getMessage(), [], 500);
        }
    }

    /**
     * Pay an installment.
     *
     * @param  int  $installmentId
     * @param  int  $installmentPaymentId
     * @param  \App\Actions\PayInstallmentAction  $action
     * @return \Illuminate\Http\JsonResponse
     */
    public function pay(int $installmentId, int $installmentPaymentId, PayInstallmentAction $action): JsonResponse
    {
        try {
            $installment = Installment::findOrFail($installmentId);
            $installmentPayment = InstallmentPayment::where('installment_id', $installmentId)
                ->where('id', $installmentPaymentId)
                ->firstOrFail();

            // Taksit ödemesi zaten yapılmış mı kontrol et
            if ($installmentPayment->status === 'paid') {
                return $this->error('Bu taksit ödemesi zaten yapılmış.', [], 400);
            }

            // Ödeme verileri
            $paymentData = request()->only(['payment_date', 'payment_method', 'receipt_no', 'notes']);

            $payment = $action->execute($installmentPayment, $paymentData);

            // Taksit planını yeniden yükle
            $installment->refresh();
            $installment->load(['student', 'installmentPayments']);

            return $this->success(
                [
                    'payment' => $payment,
                    'installment' => new InstallmentResource($installment),
                ],
                'Taksit ödemesi başarıyla kaydedildi.'
            );
        } catch (\Exception $e) {
            return $this->error('Taksit ödemesi kaydedilirken bir hata oluştu: ' . $e->getMessage(), [], 500);
        }
    }

    /**
     * Remove the specified installment.
     *
     * @param  int  $id
     * @return \Illuminate\Http\JsonResponse
     */
    public function destroy(int $id): JsonResponse
    {
        try {
            $installment = Installment::findOrFail($id);

            // Row-Level Security: Policy kontrolü
            if (Gate::denies('delete', $installment)) {
                return $this->error('Bu taksit planını silme yetkiniz bulunmamaktadır.', [], 403);
            }

            // Ödenmiş taksit var mı kontrol et
            $paidCount = $installment->installmentPayments()->where('status', 'paid')->count();
            if ($paidCount > 0) {
                return $this->error('Ödenmiş taksit bulunan planlar silinemez.', [], 400);
            }

            // Activity log
            $activityLogService = app(\App\Services\ActivityLogService::class);
            $activityLogService->logDelete($installment);

            $installment->delete();

            return $this->success([], 'Taksit planı başarıyla silindi.');
        } catch (\Exception $e) {
            return $this->error('Taksit planı silinirken bir hata oluştu: ' . $e->getMessage(), [], 500);
        }
    }
}
