<?php

namespace App\Services;

use App\Models\OnlineExam;
use App\Models\OnlineExamAttempt;
use App\Models\OnlineExamAnswer;
use App\Models\Student;
use App\Models\Grade;
use App\Models\Exam;
use App\Actions\CreateGradeAction;
use Illuminate\Support\Facades\DB;
use Carbon\Carbon;

class OnlineExamService
{
    /**
     * Start an exam attempt for a student.
     *
     * @param OnlineExam $exam
     * @param Student $student
     * @return OnlineExamAttempt
     * @throws \Exception
     */
    public function startAttempt(OnlineExam $exam, Student $student): OnlineExamAttempt
    {
        if (!$exam->canStudentTakeExam($student->id)) {
            throw new \Exception('Öğrenci bu sınavı alamaz.');
        }

        return DB::transaction(function () use ($exam, $student) {
            $startedAt = Carbon::now();
            $expiresAt = $startedAt->copy()->addMinutes($exam->duration_minutes);

            $attempt = OnlineExamAttempt::create([
                'online_exam_id' => $exam->id,
                'student_id' => $student->id,
                'started_at' => $startedAt,
                'expires_at' => $expiresAt,
                'status' => 'in_progress',
            ]);

            // Soruları karıştır (eğer ayarlanmışsa)
            $questionIds = $exam->question_ids;
            if ($exam->shuffle_questions) {
                shuffle($questionIds);
            }

            // Her soru için boş cevap kaydı oluştur
            foreach ($questionIds as $index => $questionId) {
                OnlineExamAnswer::create([
                    'online_exam_attempt_id' => $attempt->id,
                    'online_exam_id' => $exam->id,
                    'student_id' => $student->id,
                    'question_id' => $questionId,
                    'question_order' => $index + 1,
                ]);
            }

            return $attempt->load(['answers', 'onlineExam']);
        });
    }

    /**
     * Save answer for a question.
     *
     * @param OnlineExamAttempt $attempt
     * @param int $questionId
     * @param string|null $answer
     * @param int $timeSpentSeconds
     * @return OnlineExamAnswer
     * @throws \Exception
     */
    public function saveAnswer(OnlineExamAttempt $attempt, int $questionId, ?string $answer, int $timeSpentSeconds = 0): OnlineExamAnswer
    {
        if (!$attempt->isInProgress()) {
            throw new \Exception('Sınav devam etmiyor veya süresi dolmuş.');
        }

        $examAnswer = $attempt->answers()
            ->where('question_id', $questionId)
            ->first();

        if (!$examAnswer) {
            throw new \Exception('Soru bulunamadı.');
        }

        $examAnswer->update([
            'answer' => $answer,
            'time_spent_seconds' => $timeSpentSeconds,
            'answered_at' => Carbon::now(),
        ]);

        // Doğru cevabı kontrol et (soru havuzundan alınacak - şimdilik null)
        // TODO: Soru havuzu modülü eklendiğinde buraya entegre edilecek
        // $correctAnswer = $this->getCorrectAnswer($questionId);
        // $examAnswer->correct_answer = $correctAnswer;
        // $examAnswer->is_correct = ($answer === $correctAnswer);
        // $examAnswer->save();

        return $examAnswer->fresh();
    }

    /**
     * Submit exam attempt.
     *
     * @param OnlineExamAttempt $attempt
     * @return OnlineExamAttempt
     * @throws \Exception
     */
    public function submitAttempt(OnlineExamAttempt $attempt): OnlineExamAttempt
    {
        if ($attempt->status !== 'in_progress') {
            throw new \Exception('Sınav zaten gönderilmiş veya iptal edilmiş.');
        }

        return DB::transaction(function () use ($attempt) {
            $attempt->submitted_at = Carbon::now();
            $attempt->time_spent_seconds = Carbon::parse($attempt->started_at)->diffInSeconds($attempt->submitted_at);
            $attempt->status = 'submitted';

            // Puanları hesapla
            $attempt->calculateScore();
            $attempt->save();

            // Grade modeline entegre et (eğer exam_id varsa)
            if ($attempt->onlineExam->exam_id) {
                $this->createGradeFromAttempt($attempt);
            }

            // SMS bildirimi gönder (queue'ya ekle)
            \App\Jobs\SendOnlineExamResultSmsJob::dispatch($attempt);

            return $attempt->load(['answers', 'onlineExam', 'student']);
        });
    }

    /**
     * Auto-submit expired attempts.
     *
     * @return int Number of submitted attempts
     */
    public function autoSubmitExpiredAttempts(): int
    {
        $expiredAttempts = OnlineExamAttempt::where('status', 'in_progress')
            ->where('expires_at', '<=', Carbon::now())
            ->get();

        $count = 0;
        foreach ($expiredAttempts as $attempt) {
            try {
                $this->submitAttempt($attempt);
                $count++;
            } catch (\Exception $e) {
                // Log error but continue
                \Log::error("Failed to auto-submit attempt {$attempt->id}: " . $e->getMessage());
            }
        }

        return $count;
    }

    /**
     * Get real-time exam statistics.
     *
     * @param OnlineExam $exam
     * @return array
     */
    public function getRealTimeStatistics(OnlineExam $exam): array
    {
        $totalAttempts = $exam->attempts()->count();
        $inProgress = $exam->attempts()->where('status', 'in_progress')->count();
        $submitted = $exam->attempts()->where('status', 'submitted')->count();
        $expired = $exam->attempts()->where('status', 'expired')->count();

        $avgScore = $exam->attempts()
            ->where('status', 'submitted')
            ->avg('score');

        $avgPercentage = $exam->attempts()
            ->where('status', 'submitted')
            ->avg('percentage');

        return [
            'total_attempts' => $totalAttempts,
            'in_progress' => $inProgress,
            'submitted' => $submitted,
            'expired' => $expired,
            'average_score' => round($avgScore ?? 0, 2),
            'average_percentage' => round($avgPercentage ?? 0, 2),
        ];
    }

    /**
     * Create Grade from OnlineExamAttempt.
     *
     * @param OnlineExamAttempt $attempt
     * @return Grade|null
     */
    protected function createGradeFromAttempt(OnlineExamAttempt $attempt): ?Grade
    {
        try {
            $onlineExam = $attempt->onlineExam;
            
            // Exam_id yoksa Grade oluşturma
            if (!$onlineExam->exam_id) {
                return null;
            }

            // Exam var mı kontrol et
            $exam = Exam::find($onlineExam->exam_id);
            if (!$exam) {
                return null;
            }

            // Mevcut Grade var mı kontrol et
            $existingGrade = Grade::where('student_id', $attempt->student_id)
                ->where('exam_id', $onlineExam->exam_id)
                ->first();

            if ($existingGrade) {
                // Mevcut Grade'i güncelle
                $existingGrade->update([
                    'grade' => $attempt->score,
                    'score' => $attempt->score,
                    'answers' => $attempt->answers->map(function ($answer) {
                        return [
                            'question_id' => $answer->question_id,
                            'answer' => $answer->answer,
                            'is_correct' => $answer->is_correct,
                            'time_spent_seconds' => $answer->time_spent_seconds,
                        ];
                    })->toArray(),
                ]);
                return $existingGrade;
            }

            // Yeni Grade oluştur (exam_id yoksa sadece not kaydı yapılmaz)
            // Online sınavlar için ayrı bir not sistemi kullanılabilir
            // Şimdilik exam_id varsa Exam modeline bağlı Grade oluşturulur
            $createGradeAction = app(CreateGradeAction::class);
            
            return $createGradeAction->execute([
                'student_id' => $attempt->student_id,
                'exam_id' => $onlineExam->exam_id,
                'grade_type' => 'quiz', // Online sınavlar quiz olarak kaydedilir
                'grade' => $attempt->score,
                'score' => $attempt->score,
                'answers' => $attempt->answers->map(function ($answer) {
                    return [
                        'question_id' => $answer->question_id,
                        'answer' => $answer->answer,
                        'is_correct' => $answer->is_correct,
                        'time_spent_seconds' => $answer->time_spent_seconds,
                    ];
                })->toArray(),
                'notes' => "Online sınav sonucu - {$onlineExam->title}",
            ]);
        } catch (\Exception $e) {
            \Log::error('Online sınav sonucu Grade\'e aktarılamadı', [
                'attempt_id' => $attempt->id,
                'error' => $e->getMessage(),
            ]);
            return null;
        }
    }
}
