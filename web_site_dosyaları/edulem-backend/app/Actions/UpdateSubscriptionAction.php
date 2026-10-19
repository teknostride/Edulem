<?php

namespace App\Actions;

use App\Models\Package;
use App\Models\Subscription;
use App\Models\Tenant;
use App\Services\ActivityLogService;
use Illuminate\Support\Facades\DB;

class UpdateSubscriptionAction
{
    protected ActivityLogService $activityLogService;

    public function __construct(ActivityLogService $activityLogService)
    {
        $this->activityLogService = $activityLogService;
    }

    /**
     * Execute the action to update a subscription.
     *
     * @param  \App\Models\Subscription  $subscription
     * @param  array  $subscriptionData
     * @return \App\Models\Subscription
     * @throws \Exception
     */
    public function execute(Subscription $subscription, array $subscriptionData): Subscription
    {
        return DB::transaction(function () use ($subscription, $subscriptionData) {
            // Paket değiştiyse, fiyatları güncelle
            if (isset($subscriptionData['package_id']) && $subscriptionData['package_id'] !== $subscription->package_id) {
                $package = Package::findOrFail($subscriptionData['package_id']);
                $subscriptionData['monthly_price'] = $package->base_price;
                $subscriptionData['price_per_student'] = $package->price_per_student;
                $subscriptionData['max_students'] = $package->max_students;
            }

            $subscription->update([
                'package_id' => $subscriptionData['package_id'] ?? $subscription->package_id,
                'start_date' => $subscriptionData['start_date'] ?? $subscription->start_date,
                'end_date' => $subscriptionData['end_date'] ?? $subscription->end_date,
                'billing_cycle' => $subscriptionData['billing_cycle'] ?? $subscription->billing_cycle,
                'monthly_price' => $subscriptionData['monthly_price'] ?? $subscription->monthly_price,
                'price_per_student' => $subscriptionData['price_per_student'] ?? $subscription->price_per_student,
                'student_count' => $subscriptionData['student_count'] ?? $subscription->student_count,
                'max_students' => $subscriptionData['max_students'] ?? $subscription->max_students,
                'status' => $subscriptionData['status'] ?? $subscription->status,
                'trial_ends_at' => $subscriptionData['trial_ends_at'] ?? $subscription->trial_ends_at,
                'cancelled_at' => $subscriptionData['cancelled_at'] ?? $subscription->cancelled_at,
                'cancellation_reason' => $subscriptionData['cancellation_reason'] ?? $subscription->cancellation_reason,
                'notes' => $subscriptionData['notes'] ?? $subscription->notes,
            ]);

            // Tenant'ı güncelle (eğer current subscription ise)
            $tenant = Tenant::where('current_subscription_id', $subscription->id)->first();
            if ($tenant) {
                $tenant->update([
                    'student_count' => $subscription->student_count,
                    'max_students' => $subscription->max_students,
                    'subscription_expires_at' => $subscription->end_date,
                ]);
            }

            $this->activityLogService->logUpdate($subscription);

            // İlişkileri yükle
            $subscription->load(['package', 'modules', 'tenant']);

            return $subscription;
        });
    }
}
