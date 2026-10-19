<?php

namespace App\Actions;

use App\Models\Appointment;
use App\Services\ActivityLogService;
use Illuminate\Support\Facades\DB;

class UpdateAppointmentAction
{
    protected ActivityLogService $activityLogService;

    public function __construct(ActivityLogService $activityLogService)
    {
        $this->activityLogService = $activityLogService;
    }

    /**
     * Execute the action to update an appointment record.
     *
     * @param  \App\Models\Appointment  $appointment
     * @param  array  $appointmentData
     * @return \App\Models\Appointment
     * @throws \Exception
     */
    public function execute(Appointment $appointment, array $appointmentData): Appointment
    {
        return DB::transaction(function () use ($appointment, $appointmentData) {
            $appointment->update([
                'lead_id' => $appointmentData['lead_id'] ?? $appointment->lead_id,
                'name' => $appointmentData['name'] ?? $appointment->name,
                'phone' => $appointmentData['phone'] ?? $appointment->phone,
                'email' => $appointmentData['email'] ?? $appointment->email,
                'appointment_date' => $appointmentData['appointment_date'] ?? $appointment->appointment_date,
                'notes' => $appointmentData['notes'] ?? $appointment->notes,
                'status' => $appointmentData['status'] ?? $appointment->status,
                'assigned_to' => $appointmentData['assigned_to'] ?? $appointment->assigned_to,
            ]);

            $this->activityLogService->logUpdate($appointment);

            // İlişkileri yükle
            $appointment->load(['lead', 'assignedUser']);

            return $appointment;
        });
    }
}
