<?php

namespace App\Services;

use App\Models\CalendarEvent;
use App\Models\StaffAssignment;
use App\Models\Appointment;
use Carbon\Carbon;

class CalendarService
{
    /**
     * Sync staff assignments to calendar.
     *
     * @param StaffAssignment $assignment
     * @return CalendarEvent|null
     */
    public function syncStaffAssignment(StaffAssignment $assignment): ?CalendarEvent
    {
        if (!$assignment->show_in_calendar) {
            return null;
        }

        // Mevcut etkinlik var mı kontrol et
        $existingEvent = CalendarEvent::where('related_data->staff_assignment_id', $assignment->id)
            ->first();

        if ($existingEvent) {
            // Güncelle
            $existingEvent->update([
                'title' => $assignment->title,
                'event_date' => $assignment->start_date,
                'end_time' => $assignment->end_date->format('H:i'),
                'related_data' => array_merge($existingEvent->related_data ?? [], [
                    'staff_assignment_id' => $assignment->id,
                ]),
            ]);
            return $existingEvent;
        }

        // Yeni etkinlik oluştur
        $event = CalendarEvent::create([
            'title' => $assignment->title,
            'description' => $assignment->description,
            'event_type' => 'assignment',
            'event_date' => $assignment->start_date,
            'start_time' => null,
            'end_time' => null,
            'is_all_day' => true,
            'target_audience' => [
                ['type' => 'specific', 'ids' => $assignment->assigned_staff_ids],
            ],
            'related_data' => [
                'staff_assignment_id' => $assignment->id,
            ],
            'created_by' => $assignment->created_by,
        ]);

        return $event;
    }

    /**
     * Sync appointment to calendar.
     *
     * @param Appointment $appointment
     * @return CalendarEvent|null
     */
    public function syncAppointment(Appointment $appointment): ?CalendarEvent
    {
        // Mevcut etkinlik var mı kontrol et
        $existingEvent = CalendarEvent::where('related_data->appointment_id', $appointment->id)
            ->first();

        if ($existingEvent) {
            // Güncelle
            $existingEvent->update([
                'title' => 'Randevu: ' . ($appointment->student?->name ?? 'Öğrenci'),
                'event_date' => $appointment->appointment_date,
                'start_time' => $appointment->appointment_time,
                'end_time' => Carbon::parse($appointment->appointment_time)->addMinutes($appointment->duration_minutes ?? 30)->format('H:i'),
                'related_data' => array_merge($existingEvent->related_data ?? [], [
                    'appointment_id' => $appointment->id,
                ]),
            ]);
            return $existingEvent;
        }

        // Yeni etkinlik oluştur
        $event = CalendarEvent::create([
            'title' => 'Randevu: ' . ($appointment->student?->name ?? 'Öğrenci'),
            'description' => $appointment->notes,
            'event_type' => 'appointment',
            'event_date' => $appointment->appointment_date,
            'start_time' => $appointment->appointment_time,
            'end_time' => Carbon::parse($appointment->appointment_time)->addMinutes($appointment->duration_minutes ?? 30)->format('H:i'),
            'location' => $appointment->location,
            'target_audience' => [
                ['type' => 'specific', 'ids' => array_filter([$appointment->lead_id, $appointment->student_id])],
            ],
            'related_data' => [
                'appointment_id' => $appointment->id,
            ],
            'created_by' => $appointment->created_by,
        ]);

        return $event;
    }
}
