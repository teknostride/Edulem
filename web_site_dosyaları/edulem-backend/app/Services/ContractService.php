<?php

namespace App\Services;

use App\Models\Contract;
use App\Models\Student;
use Illuminate\Support\Facades\Auth;
use Barryvdh\DomPDF\Facade\Pdf;
use Illuminate\Support\Facades\Storage;

class ContractService
{
    /**
     * Get contract data for PDF generation.
     *
     * @param  int  $contractId
     * @return array
     */
    public function getContractData(int $contractId): array
    {
        $tenantId = Auth::user()->tenant_id;

        $contract = Contract::with([
            'student.guardians',
            'student.classroom',
            'student.academicYear',
            'tenant',
            'creator',
            'signedByGuardian',
            'file'
        ])
        ->where('tenant_id', $tenantId)
        ->findOrFail($contractId);

        return [
            'contract' => $contract,
            'student' => $contract->student,
            'tenant' => $contract->tenant,
            'guardians' => $contract->student->guardians ?? collect(),
            'generatedAt' => now()->format('d.m.Y H:i'),
        ];
    }

    /**
     * Generate contract PDF.
     *
     * @param  int  $contractId
     * @param  string|null  $templatePath
     * @return string File path
     */
    public function generatePdf(int $contractId, ?string $templatePath = null): string
    {
        $data = $this->getContractData($contractId);
        $tenantId = Auth::user()->tenant_id ?? 'default';

        $view = $templatePath ?? 'contracts.contract'; // Varsayılan veya özel şablon

        $pdf = Pdf::loadView($view, $data);

        $contract = $data['contract'];
        $fileName = "contract_{$contract->contract_no}_" . now()->format('YmdHis') . ".pdf";
        $filePath = "contracts/{$tenantId}/{$fileName}";

        Storage::disk('local')->put($filePath, $pdf->output());

        // Contract'a file_id ekle (eğer yoksa)
        if (!$contract->file_id) {
            // File kaydı oluşturulabilir (FileStorageService kullanarak)
            // Şimdilik sadece path'i döndürüyoruz
        }

        return $filePath;
    }
}
