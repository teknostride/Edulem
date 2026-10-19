<?php

namespace App\Actions;

use App\Models\Appointment;
use App\Services\ActivityLogService;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\DB;

class CreateAppointmentAction
{
    protected ActivityLogService $activityLogService;

    public function __construct(ActivityLogService $activityLogService)
    {
        $this->activityLogService = $activityLogService;
    }

    /**
     * Execute the action to create an appointment record.
     *
     * @param  array  $appointmentData
     * @return \App\Models\Appointment
     * @throws \Exception
     */
    public function execute(array $appointmentData): Appointment
    {
        return DB::transaction(function () use ($appointmentData) {
            $appointment = Appointment::create([
                'tenant_id' => Auth::user()->tenant_id,
                'lead_id' => $appointmentData['lead_id'] ?? null,
                'name' => $appointmentData['name'],
                'phone' => $appointmentData['phone'],
                'email' => $appointmentData['email'] ?? null,
                'appointment_date' => $appointmentData['appointment_date'],
                'notes' => $appointmentData['notes'] ?? null,
                'status' => $appointmentData['status'] ?? 'scheduled',
                'assigned_to' => $appointmentData['assigned_to'] ?? null,
            ]);

            $this->activityLogService->logCreate($appointment);

            // İlişkileri yükle
            $appointment->load(['lead', 'assignedUser']);

            return $appointment;
        });
    }
}
