<?php

namespace App\Actions;

use App\Models\AchievementCertificate;
use App\Services\ActivityLogService;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\DB;

class CreateAchievementCertificateAction
{
    protected ActivityLogService $activityLogService;

    public function __construct(ActivityLogService $activityLogService)
    {
        $this->activityLogService = $activityLogService;
    }

    /**
     * Execute the action to create an achievement certificate.
     *
     * @param  array  $certificateData
     * @return \App\Models\AchievementCertificate
     * @throws \Exception
     */
    public function execute(array $certificateData): AchievementCertificate
    {
        return DB::transaction(function () use ($certificateData) {
            $certificate = AchievementCertificate::create([
                'student_id' => $certificateData['student_id'],
                'certificate_type' => $certificateData['certificate_type'],
                'title' => $certificateData['title'],
                'description' => $certificateData['description'] ?? null,
                'achievement_date' => $certificateData['achievement_date'],
                'photo_ids' => $certificateData['photo_ids'] ?? null,
                'file_id' => $certificateData['file_id'] ?? null,
                'is_published_to_guardian' => $certificateData['is_published_to_guardian'] ?? false,
                'is_added_to_portfolio' => $certificateData['is_added_to_portfolio'] ?? false,
                'created_by' => Auth::id(),
            ]);

            // Activity log
            $this->activityLogService->logCreate($certificate);

            // İlişkileri yükle
            $certificate->load(['student', 'file', 'creator']);

            return $certificate;
        });
    }
}
