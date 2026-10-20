<?php

namespace App\Http\Controllers\SuperAdmin;

use App\Http\Controllers\ApiController;
use App\Models\Tenant;
use App\Models\TenantPayment;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class TenantPaymentController extends ApiController
{
    /**
     * List all payments with statistics across all schools.
     */
    public function index($param1 = null, $param2 = null): JsonResponse
    {
        try {
            $request = ($param1 instanceof Request) ? $param1 : (($param2 instanceof Request) ? $param2 : request());
            $tenantId = !($param1 instanceof Request) && $param1 !== null ? $param1 : (!($param2 instanceof Request) && $param2 !== null ? $param2 : $request->input('tenant_id'));

            $query = TenantPayment::with('tenant:id,name,domain');

            if ($tenantId) {
                $query->where('tenant_id', (int) $tenantId);
            }

            if ($request->filled('status')) {
                $query->where('status', $request->status);
            }

            // Gecikmiş olanlar filtresi
            if ($request->boolean('overdue_only')) {
                $query->where('status', '!=', 'paid')
                      ->where('due_date', '<', now()->toDateString());
            }

            $payments = $query->orderBy('due_date', 'asc')->paginate(25);

            // Genel Finans İstatistikleri
            $totalContracted = (float) Tenant::sum('contract_amount');
            $totalCollected = (float) TenantPayment::sum('paid_amount');
            $totalPending = (float) TenantPayment::where('status', '!=', 'paid')->sum('amount') - (float) TenantPayment::where('status', '!=', 'paid')->sum('paid_amount');
            $overdueCount = TenantPayment::where('status', '!=', 'paid')
                ->where('due_date', '<', now()->toDateString())
                ->count();
            $overdueAmount = (float) TenantPayment::where('status', '!=', 'paid')
                ->where('due_date', '<', now()->toDateString())
                ->sum('amount');

            return $this->success([
                'payments' => $tenantId ? $payments->items() : $payments,
                'items' => $payments->items(),
                'summary' => [
                    'total_contracted' => $totalContracted,
                    'total_collected' => $totalCollected,
                    'total_pending' => max(0, $totalPending),
                    'overdue_count' => $overdueCount,
                    'overdue_amount' => $overdueAmount,
                ]
            ], 'Tahsilatlar başarıyla listelendi.');
        } catch (\Exception $e) {
            return $this->error('Ödemeler yüklenirken hata: ' . $e->getMessage(), [], 500);
        }
    }

    /**
     * Add a payment installment for a tenant.
     */
    public function store($param1 = null, $param2 = null): JsonResponse
    {
        try {
            $request = ($param1 instanceof Request) ? $param1 : (($param2 instanceof Request) ? $param2 : request());
            $tenantId = !($param1 instanceof Request) && $param1 !== null 
                ? $param1 
                : (!($param2 instanceof Request) && $param2 !== null ? $param2 : ($request->input('tenant_id') ?? $request->route('tenantId') ?? $request->route('tenant_id')));

            if ($tenantId) {
                $request->merge(['tenant_id' => (int) $tenantId]);
            }

            $request->validate([
                'tenant_id' => 'required|exists:tenants,id',
                'title' => 'required|string|max:255',
                'amount' => 'required|numeric|min:1',
                'due_date' => 'required|date',
                'payment_method' => 'nullable|string',
                'status' => 'nullable|string|in:pending,paid,overdue,cancelled',
                'notes' => 'nullable|string',
            ]);

            $status = $request->status ?: 'pending';
            $amount = (float) $request->amount;

            $payment = TenantPayment::create([
                'tenant_id' => $request->tenant_id,
                'title' => trim($request->title),
                'amount' => $amount,
                'due_date' => $request->due_date,
                'status' => $status,
                'payment_method' => $request->payment_method ?: 'bank_transfer',
                'paid_amount' => ($status === 'paid') ? $amount : 0,
                'paid_at' => ($status === 'paid') ? now()->toDateString() : null,
                'notes' => $request->notes,
            ]);

            return $this->success($payment, 'Ödeme taksiti başarıyla oluşturuldu.', 201);
        } catch (\Exception $e) {
            return $this->error('Taksit eklenirken hata: ' . $e->getMessage(), [], 500);
        }
    }

    /**
     * Record a payment received (Tahsilat İşleme).
     */
    public function recordPayment(Request $request, int $id): JsonResponse
    {
        try {
            $payment = TenantPayment::find($id);
            if (!$payment) {
                return $this->error('Ödeme kaydı bulunamadı.', [], 404);
            }

            $request->validate([
                'paid_amount' => 'required|numeric|min:0.01',
                'paid_at' => 'required|date',
                'payment_method' => 'required|string|in:havale,eft,kredi_karti,nakit,cek',
                'receipt_no' => 'nullable|string|max:100',
                'notes' => 'nullable|string',
            ]);

            $newPaid = (float) $payment->paid_amount + (float) $request->paid_amount;
            $status = $newPaid >= (float) $payment->amount ? 'paid' : 'pending';

            $payment->update([
                'paid_amount' => $newPaid,
                'paid_at' => $request->paid_at,
                'payment_method' => $request->payment_method,
                'receipt_no' => $request->receipt_no,
                'status' => $status,
                'notes' => trim(($payment->notes ? $payment->notes . "\n" : '') . ($request->notes ?: 'Tahsilat girildi.')),
            ]);

            return $this->success($payment, 'Tahsilat başarıyla kaydedildi.');
        } catch (\Exception $e) {
            return $this->error('Tahsilat kaydedilirken hata: ' . $e->getMessage(), [], 500);
        }
    }

    /**
     * Delete payment installment.
     */
    public function destroy(int $id): JsonResponse
    {
        try {
            if (!auth()->user()->canDeleteTenant()) {
                return $this->error('Bu işlem için Patron yetkisi gereklidir.', [], 403);
            }

            $payment = TenantPayment::find($id);
            if (!$payment) {
                return $this->error('Kayıt bulunamadı.', [], 404);
            }

            $payment->delete();
            return $this->success([], 'Ödeme kaydı silindi.');
        } catch (\Exception $e) {
            return $this->error('Silinirken hata: ' . $e->getMessage(), [], 500);
        }
    }

    /**
     * Mark payment as fully paid (Quick action)
     */
    public function markPaid(int $id): JsonResponse
    {
        try {
            $payment = TenantPayment::find($id);
            if (!$payment) {
                return $this->error('Ödeme kaydı bulunamadı.', [], 404);
            }

            $payment->update([
                'paid_amount' => $payment->amount,
                'paid_at' => now()->toDateString(),
                'status' => 'paid',
                'notes' => trim(($payment->notes ? $payment->notes . "\n" : '') . 'Ödendi olarak işaretlendi.'),
            ]);

            return $this->success($payment, 'Ödeme başarıyla tahsil edildi.');
        } catch (\Exception $e) {
            return $this->error('İşlem başarısız: ' . $e->getMessage(), [], 500);
        }
    }

    /**
     * Finance Dashboard summary
     */
    public function financeDashboard(): JsonResponse
    {
        try {
            $totalContracted = (float) Tenant::sum('contract_amount');
            $totalCollected = (float) TenantPayment::where('status', 'paid')->sum('amount');
            $totalPending = (float) TenantPayment::where('status', 'pending')->sum('amount');
            $totalOverdue = (float) TenantPayment::where('status', 'overdue')
                ->orWhere(function ($q) {
                    $q->where('status', 'pending')->where('due_date', '<', now()->toDateString());
                })->sum('amount');

            $recentPayments = TenantPayment::with('tenant:id,name,domain')
                ->orderBy('due_date', 'asc')
                ->limit(50)
                ->get();

            return $this->success([
                'summary' => [
                    'total_contract_volume' => $totalContracted,
                    'total_collected' => $totalCollected,
                    'total_pending' => $totalPending,
                    'total_overdue' => $totalOverdue,
                ],
                'recent_payments' => $recentPayments,
            ], 'Finans özeti başarıyla getirildi.');
        } catch (\Exception $e) {
            return $this->error('Finans özeti alınamadı: ' . $e->getMessage(), [], 500);
        }
    }
}
