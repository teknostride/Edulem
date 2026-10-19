<?php

namespace Database\Factories;

use App\Models\Payment;
use Illuminate\Database\Eloquent\Factories\Factory;

class PaymentFactory extends Factory
{
    protected $model = Payment::class;

    public function definition(): array
    {
        return [
            'tenant_id' => null,
            'student_id' => null,
            'amount' => $this->faker->randomFloat(2, 100, 5000),
            'payment_date' => $this->faker->dateTimeBetween('-1 month', 'now'),
            'payment_method' => $this->faker->randomElement(['cash', 'credit_card', 'bank_transfer', 'online']),
            'receipt_no' => $this->faker->optional()->numerify('RCP-####'),
            'received_by' => null,
            'notes' => $this->faker->optional()->sentence,
        ];
    }
}
