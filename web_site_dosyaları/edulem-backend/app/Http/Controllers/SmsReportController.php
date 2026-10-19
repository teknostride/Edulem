<?php

namespace App\Http\Controllers;

use App\Http\Resources\SmsReportResource;
use App\Models\SmsReport;
use Illuminate\Http\JsonResponse;
use Illuminate\Support\Facades\Gate;

class SmsReportController extends ApiController
{
    /**
     * Display a listing of SMS reports.
     */
    public function index(): JsonResponse
    {
        Gate::authorize('viewAny', SmsReport::class);

        $query = SmsReport::with(['creator']);

        // Filtreleme
        if (request()->has('status')) {
            $query->where('status', request('status'));
        }

        if (request()->has('phone')) {
            $query->where('phone', 'like', '%' . request('phone') . '%');
        }

        if (request()->has('sender_type')) {
            $query->where('sender_type', request('sender_type'));
        }

        if (request()->has('sender_id')) {
            $query->where('sender_id', request('sender_id'));
        }

        if (request()->has('date_from')) {
            $query->where('sent_at', '>=', request('date_from'));
        }

        if (request()->has('date_to')) {
            $query->where('sent_at', '<=', request('date_to'));
        }

        $smsReports = $query->latest('sent_at')->paginate(request('per_page', 50));

        // İstatistikler
        $stats = [
            'total' => SmsReport::count(),
            'sent' => SmsReport::where('status', 'sent')->count(),
            'failed' => SmsReport::where('status', 'failed')->count(),
            'delivered' => SmsReport::where('status', 'delivered')->count(),
            'undelivered' => SmsReport::where('status', 'undelivered')->count(),
            'pending' => SmsReport::where('status', 'pending')->count(),
        ];

        return $this->success([
            'sms_reports' => SmsReportResource::collection($smsReports),
            'pagination' => [
                'current_page' => $smsReports->currentPage(),
                'last_page' => $smsReports->lastPage(),
                'per_page' => $smsReports->perPage(),
                'total' => $smsReports->total(),
            ],
            'statistics' => $stats,
        ], 'SMS raporları başarıyla listelendi.');
    }

    /**
     * Display the specified SMS report.
     */
    public function show(SmsReport $smsReport): JsonResponse
    {
        Gate::authorize('view', $smsReport);

        $smsReport->load(['creator']);

        return $this->success(new SmsReportResource($smsReport));
    }

    /**
     * Remove the specified SMS report.
     */
    public function destroy(SmsReport $smsReport): JsonResponse
    {
        Gate::authorize('delete', $smsReport);

        $smsReport->delete();

        return $this->success(null, 'SMS raporu başarıyla silindi.');
    }
}
