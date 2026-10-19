<?php

namespace Database\Factories;

use App\Models\Lead;
use Illuminate\Database\Eloquent\Factories\Factory;

class LeadFactory extends Factory
{
    protected $model = Lead::class;

    public function definition(): array
    {
        return [
            'tenant_id' => null,
            'name' => $this->faker->name,
            'phone' => $this->faker->phoneNumber,
            'email' => $this->faker->optional()->safeEmail,
            'notes' => $this->faker->optional()->paragraph,
            'status' => $this->faker->randomElement(['new', 'contacted', 'qualified', 'converted', 'lost']),
            'source' => $this->faker->randomElement(['website', 'referral', 'social_media', 'advertisement', null]),
        ];
    }
}
