<?php

namespace App\Services;

use App\Models\Package;
use App\Models\Subscription;
use App\Models\Tenant;
use Illuminate\Support\Str;

class SubscriptionService
{
    /**
     * Create a new subscription for a tenant.
     *
     * @param  \App\Models\Tenant  $tenant
     * @param  \App\Models\Package  $package
     * @param  string  $billingCycle
     * @param  \DateTime|null  $trialEndsAt
     * @return \App\Models\Subscription
     */
    public function createSubscription(
        Tenant $tenant,
        Package $package,
        string $billingCycle = 'monthly',
        ?\DateTime $trialEndsAt = null
    ): Subscription {
        $subscription = Subscription::create([
            'tenant_id' => $tenant->id,
            'package_id' => $package->id,
            'subscription_no' => $this->generateSubscriptionNo(),
            'start_date' => now()->toDateString(),
            'end_date' => $this->calculateEndDate($billingCycle),
            'billing_cycle' => $billingCycle,
            'monthly_price' => $package->base_price,
            'price_per_student' => $package->price_per_student,
            'student_count' => $tenant->student_count ?? 0,
            'max_students' => $package->max_students,
            'status' => 'active',
            'trial_ends_at' => $trialEndsAt?->toDateString(),
        ]);

        // Aktif modülleri subscription_modules tablosuna ekle
        if ($package->modules) {
            foreach ($package->modules as $module) {
                $subscription->modules()->create([
                    'module' => $module,
                    'is_active' => true,
                    'activated_at' => now()->toDateString(),
                ]);
            }
        }

        // Tenant'ın current_subscription_id'sini güncelle
        $tenant->update([
            'current_subscription_id' => $subscription->id,
            'max_students' => $package->max_students,
            'subscription_expires_at' => $subscription->end_date,
        ]);

        return $subscription;
    }

    /**
     * Update subscription student count.
     *
     * @param  \App\Models\Subscription  $subscription
     * @param  int  $studentCount
     * @return void
     */
    public function updateStudentCount(Subscription $subscription, int $studentCount): void
    {
        $subscription->update(['student_count' => $studentCount]);
        $subscription->tenant->update(['student_count' => $studentCount]);
    }

    /**
     * Check if tenant can add more students.
     *
     * @param  \App\Models\Tenant  $tenant
     * @return bool
     */
    public function canAddStudents(Tenant $tenant): bool
    {
        return $tenant->canAddStudents();
    }

    /**
     * Activate a module for subscription.
     *
     * @param  \App\Models\Subscription  $subscription
     * @param  string  $module
     * @return void
     */
    public function activateModule(Subscription $subscription, string $module): void
    {
        $subscription->modules()->updateOrCreate(
            ['module' => $module],
            [
                'is_active' => true,
                'activated_at' => now()->toDateString(),
                'deactivated_at' => null,
            ]
        );
    }

    /**
     * Deactivate a module for subscription.
     *
     * @param  \App\Models\Subscription  $subscription
     * @param  string  $module
     * @return void
     */
    public function deactivateModule(Subscription $subscription, string $module): void
    {
        $subscription->modules()
            ->where('module', $module)
            ->update([
                'is_active' => false,
                'deactivated_at' => now()->toDateString(),
            ]);
    }

    /**
     * Cancel subscription.
     *
     * @param  \App\Models\Subscription  $subscription
     * @param  string|null  $reason
     * @return void
     */
    public function cancelSubscription(Subscription $subscription, ?string $reason = null): void
    {
        $subscription->update([
            'status' => 'cancelled',
            'cancelled_at' => now()->toDateString(),
            'cancellation_reason' => $reason,
        ]);
    }

    /**
     * Generate unique subscription number.
     *
     * @return string
     */
    protected function generateSubscriptionNo(): string
    {
        do {
            $no = 'SUB-' . strtoupper(Str::random(8)) . '-' . now()->format('Ymd');
        } while (Subscription::where('subscription_no', $no)->exists());

        return $no;
    }

    /**
     * Calculate end date based on billing cycle.
     *
     * @param  string  $billingCycle
     * @return \DateTime|null
     */
    protected function calculateEndDate(string $billingCycle): ?\DateTime
    {
        return match ($billingCycle) {
            'monthly' => now()->addMonth(),
            'quarterly' => now()->addMonths(3),
            'yearly' => now()->addYear(),
            default => null, // Unlimited
        };
    }
}
