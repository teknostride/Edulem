<?php

namespace App\Policies;

use App\Models\FormSurveyResponse;
use App\Models\User;

class FormSurveyResponsePolicy
{
    /**
     * Determine if the user can view any form survey responses.
     */
    public function viewAny(User $user): bool
    {
        return $user->hasPermission('academic.read') || $user->is_superadmin;
    }

    /**
     * Determine if the user can view the form survey response.
     */
    public function view(User $user, FormSurveyResponse $formSurveyResponse): bool
    {
        if ($user->is_superadmin) {
            return true;
        }

        if ($user->tenant_id !== $formSurveyResponse->tenant_id) {
            return false;
        }

        // Anonim cevaplar sadece yönetici görebilir
        if ($formSurveyResponse->is_anonymous && !$user->hasPermission('academic.read')) {
            return false;
        }

        // Cevaplayan kendi cevabını görebilir
        if ($formSurveyResponse->respondent_id === $user->id) {
            return true;
        }

        return $user->hasPermission('academic.read');
    }

    /**
     * Determine if the user can create form survey responses.
     */
    public function create(User $user): bool
    {
        return true; // Herkes anket cevabı verebilir
    }

    /**
     * Determine if the user can update the form survey response.
     */
    public function update(User $user, FormSurveyResponse $formSurveyResponse): bool
    {
        if ($user->is_superadmin) {
            return true;
        }

        if ($user->tenant_id !== $formSurveyResponse->tenant_id) {
            return false;
        }

        // Cevaplayan kendi cevabını güncelleyebilir
        if ($formSurveyResponse->respondent_id === $user->id) {
            return true;
        }

        return $user->hasPermission('academic.update');
    }

    /**
     * Determine if the user can delete the form survey response.
     */
    public function delete(User $user, FormSurveyResponse $formSurveyResponse): bool
    {
        if ($user->is_superadmin) {
            return true;
        }

        if ($user->tenant_id !== $formSurveyResponse->tenant_id) {
            return false;
        }

        return $user->hasPermission('academic.delete');
    }
}
