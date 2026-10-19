<?php

namespace App\Policies;

use App\Models\AchievementCertificate;
use App\Models\User;

class AchievementCertificatePolicy
{
    /**
     * Determine if the user can view any achievement certificates.
     */
    public function viewAny(User $user): bool
    {
        return $user->hasPermission('academic.read') || $user->is_superadmin;
    }

    /**
     * Determine if the user can view the achievement certificate.
     */
    public function view(User $user, AchievementCertificate $achievementCertificate): bool
    {
        if ($user->is_superadmin) {
            return true;
        }

        if ($user->tenant_id !== $achievementCertificate->tenant_id) {
            return false;
        }

        return $user->hasPermission('academic.read');
    }

    /**
     * Determine if the user can create achievement certificates.
     */
    public function create(User $user): bool
    {
        return $user->hasPermission('academic.create') || $user->is_superadmin;
    }

    /**
     * Determine if the user can update the achievement certificate.
     */
    public function update(User $user, AchievementCertificate $achievementCertificate): bool
    {
        if ($user->is_superadmin) {
            return true;
        }

        if ($user->tenant_id !== $achievementCertificate->tenant_id) {
            return false;
        }

        return $user->hasPermission('academic.update');
    }

    /**
     * Determine if the user can delete the achievement certificate.
     */
    public function delete(User $user, AchievementCertificate $achievementCertificate): bool
    {
        if ($user->is_superadmin) {
            return true;
        }

        if ($user->tenant_id !== $achievementCertificate->tenant_id) {
            return false;
        }

        return $user->hasPermission('academic.delete');
    }
}
