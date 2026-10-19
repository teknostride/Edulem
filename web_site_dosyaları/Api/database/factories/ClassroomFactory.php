<?php

namespace Database\Factories;

use App\Models\Classroom;
use Illuminate\Database\Eloquent\Factories\Factory;

class ClassroomFactory extends Factory
{
    protected $model = Classroom::class;

    public function definition(): array
    {
        return [
            'tenant_id' => null,
            'name' => $this->faker->randomElement(['A', 'B', 'C']) . ' Sınıfı',
            'code' => $this->faker->unique()->bothify('???###'),
            'capacity' => $this->faker->numberBetween(20, 40),
            'teacher_id' => null,
            'is_active' => true,
        ];
    }
}
