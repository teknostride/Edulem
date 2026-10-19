<?php

namespace App\Actions;

use App\Models\Package;
use App\Models\Subscription;
use App\Models\SubscriptionModule;
use App\Models\Tenant;
use App\Services\ActivityLogService;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\DB;

class CreateSubscriptionAction
{
    protected ActivityLogService $activityLogService;

    public function __construct(ActivityLogService $activityLogService)
    {
        $this->activityLogService = $activityLogService;
    }

    /**
     * Execute the action to create a subscription.
     *
     * @param  array  $subscriptionData
     * @return \App\Models\Subscription
     * @throws \Exception
     */
    public function execute(array $subscriptionData): Subscription
    {
        return DB::transaction(function () use ($subscriptionData) {
            $package = Package::findOrFail($subscriptionData['package_id']);
            $tenantId = Auth::user()->tenant_id;

            // Abonelik numarası oluştur
            $subscriptionNo = $this->generateSubscriptionNo($tenantId);

            // Fiyatları paketten al
            $monthlyPrice = $package->base_price;
            $pricePerStudent = $package->price_per_student;
            $studentCount = $subscriptionData['student_count'] ?? 0;
            $maxStudents = $package->max_students;

            $subscription = Subscription::create([
                'tenant_id' => $tenantId,
                'package_id' => $package->id,
                'subscription_no' => $subscriptionNo,
                'start_date' => $subscriptionData['start_date'],
                'end_date' => $subscriptionData['end_date'] ?? null,
                'billing_cycle' => $subscriptionData['billing_cycle'] ?? 'monthly',
                'monthly_price' => $monthlyPrice,
                'price_per_student' => $pricePerStudent,
                'student_count' => $studentCount,
                'max_students' => $maxStudents,
                'status' => 'active',
                'trial_ends_at' => $subscriptionData['trial_ends_at'] ?? null,
                'notes' => $subscriptionData['notes'] ?? null,
            ]);

            // Modülleri ekle
            if (isset($subscriptionData['modules']) && is_array($subscriptionData['modules'])) {
                foreach ($subscriptionData['modules'] as $moduleData) {
                    SubscriptionModule::create([
                        'subscription_id' => $subscription->id,
                        'module' => $moduleData['module'],
                        'is_active' => $moduleData['is_active'] ?? true,
                        'activated_at' => now()->toDateString(),
                    ]);
                }
            } else {
                // Paket modüllerini ekle
                foreach ($package->modules ?? [] as $module) {
                    SubscriptionModule::create([
                        'subscription_id' => $subscription->id,
                        'module' => $module,
                        'is_active' => true,
                        'activated_at' => now()->toDateString(),
                    ]);
                }
            }

            // Tenant'ın current_subscription_id'sini güncelle
            $tenant = Tenant::find($tenantId);
            if ($tenant) {
                $tenant->update([
                    'current_subscription_id' => $subscription->id,
                    'student_count' => $studentCount,
                    'max_students' => $maxStudents,
                    'subscription_expires_at' => $subscription->end_date,
                ]);
            }

            $this->activityLogService->logCreate($subscription);

            // İlişkileri yükle
            $subscription->load(['package', 'modules', 'tenant']);

            return $subscription;
        });
    }

    /**
     * Generate a unique subscription number.
     *
     * @param  int  $tenantId
     * @return string
     */
    protected function generateSubscriptionNo(int $tenantId): string
    {
        $year = date('Y');
        $prefix = 'ABO-' . $tenantId . '-' . $year . '-';

        // Son abonelik numarasını bul
        $lastSubscription = Subscription::where('tenant_id', $tenantId)
            ->where('subscription_no', 'like', $prefix . '%')
            ->orderBy('subscription_no', 'desc')
            ->first();

        if ($lastSubscription) {
            $lastNumber = (int) substr($lastSubscription->subscription_no, strlen($prefix));
            $newNumber = $lastNumber + 1;
        } else {
            $newNumber = 1;
        }

        return $prefix . str_pad($newNumber, 6, '0', STR_PAD_LEFT);
    }
}
