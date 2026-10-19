<?php

namespace Database\Factories;

use App\Models\Exam;
use Illuminate\Database\Eloquent\Factories\Factory;

class ExamFactory extends Factory
{
    protected $model = Exam::class;

    public function definition(): array
    {
        return [
            'tenant_id' => null,
            'name' => $this->faker->randomElement(['Yazılı', 'Quiz', 'Deneme']) . ' Sınavı',
            'description' => $this->faker->optional()->sentence,
            'lesson_id' => \App\Models\Lesson::factory(),
            'classroom_id' => null,
            'exam_date' => $this->faker->dateTimeBetween('now', '+1 month'),
            'duration_minutes' => $this->faker->numberBetween(40, 120),
            'total_points' => $this->faker->numberBetween(50, 100),
            'is_optical_form' => false,
            'optical_form_file_id' => null,
            'optical_form_status' => null,
        ];
    }
}
