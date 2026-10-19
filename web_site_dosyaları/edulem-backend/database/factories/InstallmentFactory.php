<?php

namespace Database\Factories;

use App\Models\Installment;
use Illuminate\Database\Eloquent\Factories\Factory;

class InstallmentFactory extends Factory
{
    protected $model = Installment::class;

    public function definition(): array
    {
        $amount = $this->faker->randomFloat(2, 500, 2000);
        
        return [
            'tenant_id' => null,
            'student_id' => null,
            'total_amount' => $amount * 10,
            'installment_count' => 10,
            'installment_amount' => $amount,
            'start_date' => $this->faker->dateTimeBetween('now', '+1 month'),
            'status' => $this->faker->randomElement(['active', 'completed', 'cancelled']),
            'notes' => $this->faker->optional()->sentence,
        ];
    }
}
