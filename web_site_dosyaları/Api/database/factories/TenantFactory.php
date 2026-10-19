<?php

namespace Database\Factories;

use App\Models\Tenant;
use Illuminate\Database\Eloquent\Factories\Factory;

class TenantFactory extends Factory
{
    protected $model = Tenant::class;

    public function definition(): array
    {
        return [
            'domain' => $this->faker->unique()->domainName,
            'name' => $this->faker->company . ' Okulu',
            'is_active' => true,
            'student_count' => 0,
        ];
    }
}
