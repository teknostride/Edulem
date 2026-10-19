<?php

namespace App\Http\Controllers;

use App\Actions\GenerateReportAction;
use App\Http\Requests\GenerateReportRequest;
use Illuminate\Http\JsonResponse;

class ReportController extends ApiController
{
    /**
     * Get available report types.
     *
     * @return \Illuminate\Http\JsonResponse
     */
    public function types(): JsonResponse
    {
        return $this->success([
            'report_types' => [
                // Akademik Raporlar
                [
                    'value' => 'students',
                    'label' => 'Öğrenci Listesi',
                    'description' => 'Öğrenci bilgilerini içeren liste raporu',
                    'category' => 'academic',
                    'formats' => ['excel', 'pdf'],
                    'parameters' => ['city_id', 'district_id'],
                ],
                [
                    'value' => 'attendance',
                    'label' => 'Devamsızlık Raporu',
                    'description' => 'Öğrenci devamsızlık bilgilerini içeren rapor',
                    'category' => 'academic',
                    'formats' => ['excel', 'pdf'],
                    'parameters' => ['start_date', 'end_date', 'student_id', 'status', 'classroom_id'],
                ],
                [
                    'value' => 'classroom_occupancy',
                    'label' => 'Sınıf Doluluk',
                    'description' => 'Sınıf doluluk oranları ve kapasite bilgileri',
                    'category' => 'academic',
                    'formats' => ['excel', 'pdf'],
                    'parameters' => [],
                ],
                [
                    'value' => 'student_count_by_gender',
                    'label' => 'Kız-Erkek Öğrenci Sayıları',
                    'description' => 'Cinsiyet bazlı öğrenci sayıları',
                    'category' => 'academic',
                    'formats' => ['excel', 'pdf'],
                    'parameters' => [],
                ],
                [
                    'value' => 'exam_participation_monthly',
                    'label' => 'Sınava Katılım Aylık',
                    'description' => 'Aylık sınav katılım oranları',
                    'category' => 'academic',
                    'formats' => ['excel', 'pdf'],
                    'parameters' => ['year', 'month'],
                ],
                // Finansal Raporlar
                [
                    'value' => 'financial',
                    'label' => 'Finansal Rapor',
                    'description' => 'Finansal işlemleri içeren rapor (Ödemeler, Taksitler)',
                    'category' => 'financial',
                    'formats' => ['excel', 'pdf'],
                    'parameters' => ['start_date', 'end_date', 'student_id', 'status'],
                ],
                [
                    'value' => 'cash_report',
                    'label' => 'Kasa Raporu',
                    'description' => 'Kasa giriş-çıkış raporu',
                    'category' => 'financial',
                    'formats' => ['excel', 'pdf'],
                    'parameters' => ['start_date', 'end_date'],
                ],
                [
                    'value' => 'overdue_percentage',
                    'label' => 'Geciken Yüzdelik',
                    'description' => 'Geciken taksitler ve yüzdelik oranları',
                    'category' => 'financial',
                    'formats' => ['excel', 'pdf'],
                    'parameters' => [],
                ],
                [
                    'value' => 'collection_total',
                    'label' => 'Tahsilat Toplam',
                    'description' => 'Toplam tahsilat ve ödeme yöntemlerine göre dağılım',
                    'category' => 'financial',
                    'formats' => ['excel', 'pdf'],
                    'parameters' => ['start_date', 'end_date'],
                ],
                [
                    'value' => 'future_payments',
                    'label' => 'Gelecek Öğrenci Ödemeleri',
                    'description' => 'Gelecek dönem öğrenci ödemeleri',
                    'category' => 'financial',
                    'formats' => ['excel', 'pdf'],
                    'parameters' => ['start_date', 'end_date'],
                ],
                [
                    'value' => 'monthly_expenses',
                    'label' => 'Giderler Aylık',
                    'description' => 'Aylık giderler ve kategorilere göre dağılım',
                    'category' => 'financial',
                    'formats' => ['excel', 'pdf'],
                    'parameters' => ['year', 'month'],
                ],
                // CRM Raporlar
                [
                    'value' => 'lead_statistics',
                    'label' => 'Ön Kayıt İstatistikleri',
                    'description' => 'Ön kayıt (lead) istatistikleri ve kaynak analizi',
                    'category' => 'crm',
                    'formats' => ['excel', 'pdf'],
                    'parameters' => ['start_date', 'end_date'],
                ],
            ],
        ], 'Rapor tipleri başarıyla getirildi.');
    }

    /**
     * Generate report.
     *
     * @param  \App\Http\Requests\GenerateReportRequest  $request
     * @param  \App\Actions\GenerateReportAction  $action
     * @return \Illuminate\Http\JsonResponse
     */
    public function generate(GenerateReportRequest $request, GenerateReportAction $action): JsonResponse
    {
        try {
            $result = $action->execute(
                $request->input('report_type'),
                $request->input('parameters', []),
                $request->input('format', 'excel'),
                $request->input('send_email', false),
                $request->input('recipient_email')
            );

            return $this->success($result['data'], $result['message']);
        } catch (\Exception $e) {
            return $this->error('Rapor oluşturulurken bir hata oluştu: ' . $e->getMessage(), [], 500);
        }
    }
}
