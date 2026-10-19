<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;

class TenantResource extends ApiResource
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
            'name' => $this->name,
            'domain' => $this->domain,
            'is_active' => $this->is_active,
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
        return $this->getPublicFields();
    }

    /**
     * Get all fields (for admin/SuperAdmin).
     *
     * @return array<string, mixed>
     */
    protected function getAllFields(): array
    {
        $fields = $this->getPublicFields();
        
        if ($this->relationLoaded('users_count')) {
            $fields['users_count'] = $this->users_count;
        }
        
        if ($this->relationLoaded('students_count')) {
            $fields['students_count'] = $this->students_count;
        }
        
        if ($this->relationLoaded('currentSubscription')) {
            $fields['current_subscription'] = $this->currentSubscription ? [
                'id' => $this->currentSubscription->id,
                'subscription_no' => $this->currentSubscription->subscription_no,
                'status' => $this->currentSubscription->status,
            ] : null;
        }
        
        // Admin user bilgisi (SuperAdmin için)
        if ($this->relationLoaded('adminUser') && $this->adminUser) {
            $fields['admin_user'] = [
                'id' => $this->adminUser->id,
                'name' => $this->adminUser->name,
                'email' => $this->adminUser->email,
            ];
        }
        
        $fields['subdomain'] = $this->subdomain;
        $fields['phone'] = $this->phone;
        $fields['email'] = $this->email;
        $fields['authorized_person'] = $this->authorized_person;
        $fields['authorized_phone'] = $this->authorized_phone;
        $fields['authorized_email'] = $this->authorized_email;
        $fields['address'] = $this->address;
        $fields['city'] = $this->city;
        $fields['district'] = $this->district;
        $fields['tax_office'] = $this->tax_office;
        $fields['tax_number'] = $this->tax_number;
        $fields['contract_start_date'] = $this->contract_start_date ? (is_string($this->contract_start_date) ? substr($this->contract_start_date, 0, 10) : $this->contract_start_date->format('Y-m-d')) : null;
        $fields['contract_end_date'] = $this->contract_end_date ? (is_string($this->contract_end_date) ? substr($this->contract_end_date, 0, 10) : $this->contract_end_date->format('Y-m-d')) : null;
        $fields['contract_amount'] = $this->contract_amount;
        $fields['notes'] = $this->notes;
        
        if ($this->relationLoaded('moduleLicenses')) {
            $fields['module_licenses'] = $this->moduleLicenses;
        }

        $fields['student_count'] = $this->student_count ?? 0;
        $fields['subscription_expires_at'] = $this->subscription_expires_at ? (is_string($this->subscription_expires_at) ? substr($this->subscription_expires_at, 0, 10) : $this->subscription_expires_at->format('Y-m-d')) : null;
        $fields['created_at'] = $this->created_at ? (is_string($this->created_at) ? $this->created_at : $this->created_at->format('Y-m-d H:i:s')) : null;
        $fields['updated_at'] = $this->updated_at ? (is_string($this->updated_at) ? $this->updated_at : $this->updated_at->format('Y-m-d H:i:s')) : null;
        
        return $fields;
    }
}
