<?php

namespace App\Services;

use App\Models\QuestionBank;
use App\Models\QuestionBankTopic;
use Illuminate\Support\Collection;

class QuestionBankService
{
    /**
     * Get questions by filters.
     *
     * @param array $filters
     * @return \Illuminate\Support\Collection
     */
    public function getQuestionsByFilters(array $filters): Collection
    {
        $query = QuestionBank::query();

        if (isset($filters['lesson_id'])) {
            $query->where('lesson_id', $filters['lesson_id']);
        }

        if (isset($filters['topic_id'])) {
            $query->where('question_bank_topic_id', $filters['topic_id']);
        }

        if (isset($filters['question_type'])) {
            $query->where('question_type', $filters['question_type']);
        }

        if (isset($filters['difficulty_level'])) {
            $query->where('difficulty_level', $filters['difficulty_level']);
        }

        if (isset($filters['school_type'])) {
            $query->where('school_type', $filters['school_type']);
        }

        if (isset($filters['grade_level'])) {
            $query->where('grade_level', $filters['grade_level']);
        }

        if (isset($filters['tags'])) {
            $query->whereJsonContains('tags', $filters['tags']);
        }

        if (isset($filters['exclude_used_recently']) && $filters['exclude_used_recently']) {
            $days = $filters['exclude_days'] ?? 30;
            $query->where(function ($q) use ($days) {
                $q->whereNull('last_used_at')
                    ->orWhereRaw("DATEDIFF(NOW(), last_used_at) > ?", [$days]);
            });
        }

        if (isset($filters['min_usage_count'])) {
            $query->where('usage_count', '>=', $filters['min_usage_count']);
        }

        if (isset($filters['max_usage_count'])) {
            $query->where('usage_count', '<=', $filters['max_usage_count']);
        }

        if (isset($filters['is_active'])) {
            $query->where('is_active', $filters['is_active']);
        }

        if (isset($filters['is_public'])) {
            $query->where('is_public', $filters['is_public']);
        }

        if (isset($filters['search'])) {
            $query->whereFullText('question_text', $filters['search']);
        }

        return $query->get();
    }

    /**
     * Select random questions for exam/homework/booklet.
     *
     * @param array $filters
     * @param int $count
     * @return \Illuminate\Support\Collection
     */
    public function selectRandomQuestions(array $filters, int $count): Collection
    {
        $questions = $this->getQuestionsByFilters($filters);

        if ($questions->count() < $count) {
            return $questions;
        }

        return $questions->random($count);
    }

    /**
     * Prepare booklet questions.
     *
     * @param array $criteria
     * @return array
     */
    public function prepareBookletQuestions(array $criteria): array
    {
        $questions = collect();

        // Her kriter için soru seç
        foreach ($criteria as $criterion) {
            $filters = [
                'lesson_id' => $criterion['lesson_id'] ?? null,
                'topic_id' => $criterion['topic_id'] ?? null,
                'difficulty_level' => $criterion['difficulty_level'] ?? null,
                'question_type' => $criterion['question_type'] ?? null,
                'exclude_used_recently' => $criterion['exclude_used_recently'] ?? true,
            ];

            $selected = $this->selectRandomQuestions($filters, $criterion['count'] ?? 1);
            $questions = $questions->merge($selected);
        }

        return $questions->toArray();
    }

    /**
     * Prepare practice test questions.
     *
     * @param array $criteria
     * @return array
     */
    public function preparePracticeTestQuestions(array $criteria): array
    {
        $questions = collect();

        // Zorluk seviyesine göre soru dağılımı
        $difficultyDistribution = $criteria['difficulty_distribution'] ?? [
            'easy' => 0.2,
            'medium' => 0.5,
            'hard' => 0.25,
            'very_hard' => 0.05,
        ];

        $totalQuestions = $criteria['total_questions'] ?? 20;

        foreach ($difficultyDistribution as $level => $percentage) {
            $count = (int) round($totalQuestions * $percentage);
            if ($count > 0) {
                $filters = array_merge($criteria['filters'] ?? [], [
                    'difficulty_level' => $level,
                ]);
                $selected = $this->selectRandomQuestions($filters, $count);
                $questions = $questions->merge($selected);
            }
        }

        return $questions->toArray();
    }

    /**
     * Prepare topic test questions.
     *
     * @param int $topicId
     * @param int $count
     * @param array $additionalFilters
     * @return array
     */
    public function prepareTopicTestQuestions(int $topicId, int $count, array $additionalFilters = []): array
    {
        $filters = array_merge($additionalFilters, [
            'topic_id' => $topicId,
        ]);

        $questions = $this->selectRandomQuestions($filters, $count);

        return $questions->toArray();
    }

    /**
     * Check question reuse.
     *
     * @param int $questionId
     * @param int $days
     * @return bool
     */
    public function canReuseQuestion(int $questionId, int $days = 30): bool
    {
        $question = QuestionBank::findOrFail($questionId);

        return !$question->hasBeenUsedRecently($days);
    }

    /**
     * Get question statistics.
     *
     * @param array $filters
     * @return array
     */
    public function getQuestionStatistics(array $filters = []): array
    {
        $query = QuestionBank::query();

        if (isset($filters['lesson_id'])) {
            $query->where('lesson_id', $filters['lesson_id']);
        }

        if (isset($filters['topic_id'])) {
            $query->where('question_bank_topic_id', $filters['topic_id']);
        }

        $total = $query->count();
        $byType = $query->clone()->selectRaw('question_type, COUNT(*) as count')
            ->groupBy('question_type')
            ->pluck('count', 'question_type')
            ->toArray();
        $byDifficulty = $query->clone()->selectRaw('difficulty_level, COUNT(*) as count')
            ->groupBy('difficulty_level')
            ->pluck('count', 'difficulty_level')
            ->toArray();
        $bySchoolType = $query->clone()->selectRaw('school_type, COUNT(*) as count')
            ->groupBy('school_type')
            ->pluck('count', 'school_type')
            ->toArray();

        return [
            'total' => $total,
            'by_type' => $byType,
            'by_difficulty' => $byDifficulty,
            'by_school_type' => $bySchoolType,
        ];
    }
}
