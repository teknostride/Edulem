<?php

namespace App\Policies;

use App\Models\CalendarEvent;
use App\Models\User;

class CalendarEventPolicy
{
    /**
     * Determine if the user can view any calendar events.
     */
    public function viewAny(User $user): bool
    {
        return true; // Herkes ajandayı görebilir (kendi etkinlikleri)
    }

    /**
     * Determine if the user can view the calendar event.
     */
    public function view(User $user, CalendarEvent $calendarEvent): bool
    {
        if ($user->is_superadmin) {
            return true;
        }

        if ($user->tenant_id !== $calendarEvent->tenant_id) {
            return false;
        }

        // Herkese açık etkinlikler herkes tarafından görülebilir
        if ($calendarEvent->is_public) {
            return true;
        }

        // Katılımcı veya oluşturan görebilir
        if ($calendarEvent->created_by === $user->id) {
            return true;
        }

        $isParticipant = $calendarEvent->participants()
            ->where(function ($q) use ($user) {
                $q->where('user_id', $user->id)
                    ->orWhereHas('student', function ($sq) use ($user) {
                        // Öğrenci kontrolü (veli ise öğrenciye erişebilir)
                    });
            })
            ->exists();

        return $isParticipant;
    }

    /**
     * Determine if the user can create calendar events.
     */
    public function create(User $user): bool
    {
        return $user->hasPermission('academic.create') || $user->is_superadmin;
    }

    /**
     * Determine if the user can update the calendar event.
     */
    public function update(User $user, CalendarEvent $calendarEvent): bool
    {
        if ($user->is_superadmin) {
            return true;
        }

        if ($user->tenant_id !== $calendarEvent->tenant_id) {
            return false;
        }

        // Oluşturan veya yönetici güncelleyebilir
        if ($calendarEvent->created_by === $user->id) {
            return true;
        }

        return $user->hasPermission('academic.update');
    }

    /**
     * Determine if the user can delete the calendar event.
     */
    public function delete(User $user, CalendarEvent $calendarEvent): bool
    {
        if ($user->is_superadmin) {
            return true;
        }

        if ($user->tenant_id !== $calendarEvent->tenant_id) {
            return false;
        }

        // Oluşturan veya yönetici silebilir
        if ($calendarEvent->created_by === $user->id) {
            return true;
        }

        return $user->hasPermission('academic.delete');
    }
}
