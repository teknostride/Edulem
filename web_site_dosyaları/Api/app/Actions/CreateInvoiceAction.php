<?php

namespace App\Actions;

use App\Models\Invoice;
use App\Services\ActivityLogService;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\DB;

class CreateInvoiceAction
{
    /**
     * Execute the action to create an invoice.
     *
     * @param  array  $invoiceData
     * @return \App\Models\Invoice
     * @throws \Exception
     */
    public function execute(array $invoiceData): Invoice
    {
        return DB::transaction(function () use ($invoiceData) {
            // Fatura numarası oluştur
            $invoiceNo = $this->generateInvoiceNo($invoiceData['invoice_type']);

            // Fatura kaydı oluştur
            $invoice = Invoice::create([
                'student_id' => $invoiceData['student_id'],
                'invoice_no' => $invoiceNo,
                'invoice_type' => $invoiceData['invoice_type'],
                'amount' => $invoiceData['amount'],
                'invoice_date' => $invoiceData['invoice_date'] ?? now()->toDateString(),
                'due_date' => $invoiceData['due_date'],
                'status' => 'pending',
                'description' => $invoiceData['description'] ?? null,
                'items' => $invoiceData['items'] ?? null,
                'created_by' => Auth::id(),
            ]);

            // Activity log
            $activityLogService = app(ActivityLogService::class);
            $activityLogService->logCreate($invoice);

            // İlişkileri yükle
            $invoice->load(['student', 'createdBy', 'tenant']);

            return $invoice;
        });
    }

    /**
     * Generate a unique invoice number.
     *
     * @param  string  $invoiceType
     * @return string
     */
    protected function generateInvoiceNo(string $invoiceType): string
    {
        $prefix = match ($invoiceType) {
            'tuition' => 'TUI',
            'registration' => 'REG',
            'material' => 'MAT',
            'other' => 'OTH',
            default => 'INV',
        };

        $year = now()->format('Y');
        $month = now()->format('m');
        
        // Son fatura numarasını al
        $lastInvoice = Invoice::where('invoice_no', 'like', "{$prefix}-{$year}{$month}%")
            ->orderBy('invoice_no', 'desc')
            ->first();

        if ($lastInvoice && $lastInvoice->invoice_no) {
            $lastNumber = (int) substr($lastInvoice->invoice_no, -4);
            $newNumber = $lastNumber + 1;
        } else {
            $newNumber = 1;
        }

        return $prefix . '-' . $year . $month . '-' . str_pad($newNumber, 4, '0', STR_PAD_LEFT);
    }
}
