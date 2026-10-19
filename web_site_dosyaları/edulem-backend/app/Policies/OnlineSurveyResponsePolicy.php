<?php

namespace App\Policies;

use App\Models\OnlineSurveyResponse;
use App\Models\User;

class OnlineSurveyResponsePolicy
{
    /**
     * Determine if the user can view any online survey responses.
     */
    public function viewAny(User $user): bool
    {
        return $user->hasPermission('academic.read') || $user->is_superadmin;
    }

    /**
     * Determine if the user can view the online survey response.
     */
    public function view(User $user, OnlineSurveyResponse $onlineSurveyResponse): bool
    {
        if ($user->is_superadmin) {
            return true;
        }

        if ($user->tenant_id !== $onlineSurveyResponse->tenant_id) {
            return false;
        }

        // Anonim cevaplar sadece yönetici görebilir
        if ($onlineSurveyResponse->is_anonymous && !$user->hasPermission('academic.read')) {
            return false;
        }

        // Cevaplayan kendi cevabını görebilir
        if ($onlineSurveyResponse->respondent_id === $user->id) {
            return true;
        }

        return $user->hasPermission('academic.read');
    }

    /**
     * Determine if the user can create online survey responses.
     */
    public function create(User $user): bool
    {
        return true; // Herkes anket cevabı verebilir
    }

    /**
     * Determine if the user can update the online survey response.
     */
    public function update(User $user, OnlineSurveyResponse $onlineSurveyResponse): bool
    {
        if ($user->is_superadmin) {
            return true;
        }

        if ($user->tenant_id !== $onlineSurveyResponse->tenant_id) {
            return false;
        }

        // Cevaplayan kendi cevabını güncelleyebilir
        if ($onlineSurveyResponse->respondent_id === $user->id) {
            return true;
        }

        return $user->hasPermission('academic.update');
    }

    /**
     * Determine if the user can delete the online survey response.
     */
    public function delete(User $user, OnlineSurveyResponse $onlineSurveyResponse): bool
    {
        if ($user->is_superadmin) {
            return true;
        }

        if ($user->tenant_id !== $onlineSurveyResponse->tenant_id) {
            return false;
        }

        return $user->hasPermission('academic.delete');
    }
}
