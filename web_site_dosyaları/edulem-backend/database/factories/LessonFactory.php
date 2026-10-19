<?php

namespace Database\Factories;

use App\Models\Lesson;
use Illuminate\Database\Eloquent\Factories\Factory;

class LessonFactory extends Factory
{
    protected $model = Lesson::class;

    public function definition(): array
    {
        return [
            'tenant_id' => null,
            'name' => $this->faker->randomElement(['Matematik', 'Türkçe', 'Fen Bilgisi', 'İngilizce', 'Tarih']),
            'code' => $this->faker->unique()->bothify('???###'),
            'description' => $this->faker->optional()->sentence,
        ];
    }
}
