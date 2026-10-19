<?php

namespace App\Http\Controllers\SuperAdmin;

use App\Http\Controllers\ApiController;
use App\Models\SaasExpense;
use App\Models\TenantPayment;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class SaasExpenseController extends ApiController
{
    /**
     * List expenses and overall financial net balance.
     */
    public function index(Request $request): JsonResponse
    {
        try {
            $query = SaasExpense::query();

            if ($request->filled('category')) {
                $query->where('category', $request->category);
            }

            if ($request->filled('year')) {
                $query->whereYear('expense_date', $request->year);
            }

            $expenses = $query->orderBy('expense_date', 'desc')->paginate(25);

            // Mali Özet
            $totalExpenses = (float) SaasExpense::sum('amount');
            $totalRevenue = (float) TenantPayment::where('status', 'paid')->sum('amount');
            $netProfit = $totalRevenue - $totalExpenses;

            // Kategoriye Göre Dağılım
            $byCategory = SaasExpense::selectRaw('category, SUM(amount) as total')
                ->groupBy('category')
                ->pluck('total', 'category');

            return $this->success([
                'expenses' => $expenses->items(),
                'pagination' => [
                    'current_page' => $expenses->currentPage(),
                    'last_page' => $expenses->lastPage(),
                    'total' => $expenses->total(),
                ],
                'summary' => [
                    'total_revenue' => $totalRevenue,
                    'total_expenses' => $totalExpenses,
                    'net_profit' => $netProfit,
                    'profit_margin' => $totalRevenue > 0 ? round(($netProfit / $totalRevenue) * 100, 1) : 0,
                    'by_category' => $byCategory,
                ]
            ], 'Giderler ve kâr-zarar özeti getirildi.');
        } catch (\Exception $e) {
            return $this->error('Giderler listelenirken hata: ' . $e->getMessage(), [], 500);
        }
    }

    /**
     * Financial summary for SaaS expenses vs revenue.
     */
    public function summary(): JsonResponse
    {
        try {
            $totalExpenses = (float) SaasExpense::sum('amount');
            $totalRevenue = (float) TenantPayment::where('status', 'paid')->sum('amount');
            $netProfit = $totalRevenue - $totalExpenses;

            $byCategory = SaasExpense::selectRaw('category, SUM(amount) as total')
                ->groupBy('category')
                ->pluck('total', 'category');

            return $this->success([
                'summary' => [
                    'total_revenue' => $totalRevenue,
                    'total_expenses' => $totalExpenses,
                    'net_profit' => $netProfit,
                    'by_category' => $byCategory,
                ]
            ], 'Gider özeti başarıyla getirildi.');
        } catch (\Exception $e) {
            return $this->error('Özet yüklenirken hata: ' . $e->getMessage(), [], 500);
        }
    }

    /**
     * Add a new expense.
     */
    public function store(Request $request): JsonResponse
    {
        try {
            $request->validate([
                'category' => 'required|string',
                'title' => 'required|string|max:255',
                'amount' => 'required|numeric|min:0.01',
                'expense_date' => 'required|date',
                'receipt_no' => 'nullable|string|max:100',
                'notes' => 'nullable|string',
            ]);

            $expense = SaasExpense::create($request->all());

            return $this->success($expense, 'Gider kaydı başarıyla eklendi.', 201);
        } catch (\Exception $e) {
            return $this->error('Gider eklenirken hata: ' . $e->getMessage(), [], 500);
        }
    }

    /**
     * Delete an expense (Patron only).
     */
    public function destroy(int $id): JsonResponse
    {
        try {
            if (!auth()->user()->canDeleteTenant()) {
                return $this->error('Bu işlem için Patron yetkisi gereklidir.', [], 403);
            }

            $expense = SaasExpense::find($id);
            if (!$expense) {
                return $this->error('Gider kaydı bulunamadı.', [], 404);
            }

            $expense->delete();
            return $this->success([], 'Gider kaydı silindi.');
        } catch (\Exception $e) {
            return $this->error('Gider silinirken hata: ' . $e->getMessage(), [], 500);
        }
    }
}
