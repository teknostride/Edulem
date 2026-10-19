<?php

namespace Database\Factories;

use App\Models\Expense;
use Illuminate\Database\Eloquent\Factories\Factory;

class ExpenseFactory extends Factory
{
    protected $model = Expense::class;

    public function definition(): array
    {
        return [
            'tenant_id' => null,
            'expense_no' => $this->faker->unique()->numerify('EXP-####'),
            'expense_date' => $this->faker->dateTimeBetween('-1 month', 'now'),
            'title' => $this->faker->sentence(3),
            'description' => $this->faker->optional()->paragraph,
            'amount' => $this->faker->randomFloat(2, 50, 2000),
            'category' => $this->faker->randomElement(['personnel', 'rent', 'utilities', 'supplies', 'maintenance', 'marketing', 'insurance', 'tax', 'other']),
            'payment_method' => $this->faker->randomElement(['cash', 'credit_card', 'bank_transfer', 'check']),
            'receipt_no' => $this->faker->optional()->numerify('RCP-####'),
            'file_id' => null,
            'paid_by' => null,
            'notes' => $this->faker->optional()->sentence,
        ];
    }
}
