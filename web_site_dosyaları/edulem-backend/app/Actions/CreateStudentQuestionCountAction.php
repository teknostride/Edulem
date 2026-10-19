<?php

namespace App\Actions;

use App\Models\StudentQuestionCount;
use App\Models\QuestionTarget;
use App\Services\ActivityLogService;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\DB;
use Carbon\Carbon;

class CreateStudentQuestionCountAction
{
    protected ActivityLogService $activityLogService;

    public function __construct(ActivityLogService $activityLogService)
    {
        $this->activityLogService = $activityLogService;
    }

    /**
     * Execute the action to create a student question count.
     *
     * @param  array  $countData
     * @return \App\Models\StudentQuestionCount
     * @throws \Exception
     */
    public function execute(array $countData): StudentQuestionCount
    {
        return DB::transaction(function () use ($countData) {
            // Aynı gün ve ders için kayıt var mı kontrol et
            $existing = StudentQuestionCount::where('tenant_id', $countData['tenant_id'] ?? auth()->user()->tenant_id)
                ->where('student_id', $countData['student_id'])
                ->where('date', $countData['date'])
                ->where('lesson_id', $countData['lesson_id'] ?? null)
                ->first();

            if ($existing) {
                // Güncelle
                $existing->update([
                    'count' => $countData['count'],
                    'notes' => $countData['notes'] ?? null,
                ]);

                $this->activityLogService->logUpdate($existing);
                return $existing;
            }

            // Haftalık hedefi bul (eğer varsa)
            $date = Carbon::parse($countData['date']);
            $weekStart = $date->copy()->startOfWeek();
            
            $questionTarget = QuestionTarget::where('tenant_id', $countData['tenant_id'] ?? auth()->user()->tenant_id)
                ->where('student_id', $countData['student_id'])
                ->where('week_start_date', $weekStart->format('Y-m-d'))
                ->first();

            // Yeni kayıt oluştur
            $questionCount = StudentQuestionCount::create([
                'student_id' => $countData['student_id'],
                'question_target_id' => $questionTarget?->id,
                'date' => $countData['date'],
                'count' => $countData['count'],
                'lesson_id' => $countData['lesson_id'] ?? null,
                'notes' => $countData['notes'] ?? null,
                'created_by' => Auth::id(),
            ]);

            // Activity log
            $this->activityLogService->logCreate($questionCount);

            // İlişkileri yükle
            $questionCount->load(['student', 'questionTarget', 'lesson', 'creator']);

            return $questionCount;
        });
    }
}
