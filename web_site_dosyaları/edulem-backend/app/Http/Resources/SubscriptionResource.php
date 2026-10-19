<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;

class SubscriptionResource extends ApiResource
{
    /**
     * Get public fields (visible to all authenticated users).
     *
     * @return array<string, mixed>
     */
    protected function getPublicFields(): array
    {
        return [
            'id' => $this->id,
            'subscription_no' => $this->subscription_no,
            'start_date' => $this->start_date->format('Y-m-d'),
            'end_date' => $this->end_date?->format('Y-m-d'),
            'status' => $this->status,
            'billing_cycle' => $this->billing_cycle,
        ];
    }

    /**
     * Get teacher-specific fields.
     *
     * @return array<string, mixed>
     */
    protected function getTeacherFields(): array
    {
        return $this->getPublicFields();
    }

    /**
     * Get accountant-specific fields.
     *
     * @return array<string, mixed>
     */
    protected function getAccountantFields(): array
    {
        $fields = $this->getPublicFields();
        
        $fields['monthly_price'] = (float) $this->monthly_price;
        $fields['price_per_student'] = (float) $this->price_per_student;
        $fields['student_count'] = $this->student_count;
        $fields['monthly_total'] = (float) $this->calculateMonthlyTotal();
        
        return $fields;
    }

    /**
     * Get all fields (for admin).
     *
     * @return array<string, mixed>
     */
    protected function getAllFields(): array
    {
        $fields = $this->getPublicFields();
        
        $fields['monthly_price'] = (float) $this->monthly_price;
        $fields['price_per_student'] = (float) $this->price_per_student;
        $fields['student_count'] = $this->student_count;
        $fields['max_students'] = $this->max_students;
        $fields['monthly_total'] = (float) $this->calculateMonthlyTotal();
        $fields['trial_ends_at'] = $this->trial_ends_at?->format('Y-m-d');
        $fields['cancelled_at'] = $this->cancelled_at?->format('Y-m-d');
        $fields['cancellation_reason'] = $this->cancellation_reason;
        $fields['notes'] = $this->notes;
        
        if ($this->relationLoaded('package') && $this->package) {
            $fields['package'] = [
                'id' => $this->package->id,
                'name' => $this->package->name,
                'slug' => $this->package->slug,
            ];
        }
        
        if ($this->relationLoaded('modules')) {
            $fields['modules'] = $this->modules->map(function ($module) {
                return [
                    'id' => $module->id,
                    'module' => $module->module,
                    'is_active' => $module->is_active,
                ];
            });
        }
        
        $fields['is_active'] = $this->isActive();
        $fields['is_trial'] = $this->isTrial();
        $fields['created_at'] = $this->created_at->format('Y-m-d H:i:s');
        $fields['updated_at'] = $this->updated_at->format('Y-m-d H:i:s');
        
        return $fields;
    }
}
