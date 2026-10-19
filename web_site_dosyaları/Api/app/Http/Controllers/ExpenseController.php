<?php

namespace App\Http\Controllers;

use App\Actions\CreateExpenseAction;
use App\Actions\UpdateExpenseAction;
use App\Http\Requests\StoreExpenseRequest;
use App\Http\Requests\UpdateExpenseRequest;
use App\Http\Resources\ExpenseResource;
use App\Models\Expense;
use Illuminate\Http\JsonResponse;
use Illuminate\Support\Facades\Gate;

class ExpenseController extends ApiController
{
    /**
     * Display a listing of expenses.
     *
     * @return \Illuminate\Http\JsonResponse
     */
    public function index(): JsonResponse
    {
        // Row-Level Security: Policy kontrolü
        if (Gate::denies('viewAny', Expense::class)) {
            return $this->error('Gider listesini görüntüleme yetkiniz bulunmamaktadır.', [], 403);
        }

        try {
            $query = Expense::with(['paidBy']);

            // Filtreleme
            if (request()->has('expense_category')) {
                $query->where('category', request('expense_category'));
            }

            if (request()->has('payment_method')) {
                $query->where('payment_method', request('payment_method'));
            }

            if (request()->has('date_from')) {
                $query->where('expense_date', '>=', request('date_from'));
            }

            if (request()->has('date_to')) {
                $query->where('expense_date', '<=', request('date_to'));
            }

            // Sıralama
            $sortBy = request('sort_by', 'expense_date');
            $sortOrder = request('sort_order', 'desc');
            $query->orderBy($sortBy, $sortOrder);

            $expenses = $query->paginate(request('per_page', 15));

            // Summary hesaplama (filtrelenmiş sorgu üzerinden)
            $summaryQuery = Expense::query();
            if (request()->has('expense_category')) {
                $summaryQuery->where('category', request('expense_category'));
            }
            if (request()->has('payment_method')) {
                $summaryQuery->where('payment_method', request('payment_method'));
            }
            if (request()->has('date_from')) {
                $summaryQuery->where('expense_date', '>=', request('date_from'));
            }
            if (request()->has('date_to')) {
                $summaryQuery->where('expense_date', '<=', request('date_to'));
            }

            return $this->success([
                'expenses' => ExpenseResource::collection($expenses),
                'pagination' => [
                    'current_page' => $expenses->currentPage(),
                    'last_page' => $expenses->lastPage(),
                    'per_page' => $expenses->perPage(),
                    'total' => $expenses->total(),
                ],
                'summary' => [
                    'total_amount' => (float) $summaryQuery->sum('amount'),
                    'total_count' => $summaryQuery->count(),
                    'by_category' => $summaryQuery->selectRaw('category, SUM(amount) as total')
                        ->groupBy('category')
                        ->get()
                        ->mapWithKeys(function ($item) {
                            return [$item->category => (float) $item->total];
                        }),
                ],
            ], 'Giderler başarıyla listelendi.');
        } catch (\Exception $e) {
            return $this->error('Giderler listelenirken bir hata oluştu: ' . $e->getMessage(), [], 500);
        }
    }

    /**
     * Store a newly created expense in storage.
     *
     * @param  \App\Http\Requests\StoreExpenseRequest  $request
     * @param  \App\Actions\CreateExpenseAction  $action
     * @return \Illuminate\Http\JsonResponse
     */
    public function store(StoreExpenseRequest $request, CreateExpenseAction $action): JsonResponse
    {
        // Row-Level Security: Policy kontrolü
        if (Gate::denies('create', Expense::class)) {
            return $this->error('Gider oluşturma yetkiniz bulunmamaktadır.', [], 403);
        }

        try {
            $expense = $action->execute($request->validated());

            return $this->success(
                ['expense' => new ExpenseResource($expense)],
                'Gider başarıyla kaydedildi.',
                201
            );
        } catch (\Exception $e) {
            return $this->error('Gider kaydedilirken bir hata oluştu: ' . $e->getMessage(), [], 500);
        }
    }

    /**
     * Display the specified expense.
     *
     * @param  int  $id
     * @return \Illuminate\Http\JsonResponse
     */
    public function show(int $id): JsonResponse
    {
        try {
            $expense = Expense::with(['paidBy'])->findOrFail($id);

            // Row-Level Security: Policy kontrolü
            if (Gate::denies('view', $expense)) {
                return $this->error('Bu gideri görüntüleme yetkiniz bulunmamaktadır.', [], 403);
            }

            return $this->success(
                ['expense' => new ExpenseResource($expense)],
                'Gider başarıyla getirildi.'
            );
        } catch (\Exception $e) {
            return $this->error('Gider getirilirken bir hata oluştu: ' . $e->getMessage(), [], 500);
        }
    }

    /**
     * Update the specified expense.
     *
     * @param  int  $id
     * @param  \App\Http\Requests\UpdateExpenseRequest  $request
     * @param  \App\Actions\UpdateExpenseAction  $action
     * @return \Illuminate\Http\JsonResponse
     */
    public function update(int $id, UpdateExpenseRequest $request, UpdateExpenseAction $action): JsonResponse
    {
        try {
            $expense = Expense::findOrFail($id);

            // Row-Level Security: Policy kontrolü
            if (Gate::denies('update', $expense)) {
                return $this->error('Bu gideri güncelleme yetkiniz bulunmamaktadır.', [], 403);
            }

            $expense = $action->execute($expense, $request->validated());

            return $this->success(
                ['expense' => new ExpenseResource($expense)],
                'Gider başarıyla güncellendi.'
            );
        } catch (\Exception $e) {
            return $this->error('Gider güncellenirken bir hata oluştu: ' . $e->getMessage(), [], 500);
        }
    }

    /**
     * Remove the specified expense.
     *
     * @param  int  $id
     * @return \Illuminate\Http\JsonResponse
     */
    public function destroy(int $id): JsonResponse
    {
        try {
            $expense = Expense::findOrFail($id);

            // Row-Level Security: Policy kontrolü
            if (Gate::denies('delete', $expense)) {
                return $this->error('Bu gideri silme yetkiniz bulunmamaktadır.', [], 403);
            }

            // Activity log
            $activityLogService = app(\App\Services\ActivityLogService::class);
            $activityLogService->logDelete($expense);

            $expense->delete();

            return $this->success([], 'Gider başarıyla silindi.');
        } catch (\Exception $e) {
            return $this->error('Gider silinirken bir hata oluştu: ' . $e->getMessage(), [], 500);
        }
    }
}
