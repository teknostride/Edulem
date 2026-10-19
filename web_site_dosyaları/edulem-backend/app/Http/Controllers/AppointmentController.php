<?php

namespace App\Http\Controllers;

use App\Actions\CreateAppointmentAction;
use App\Actions\UpdateAppointmentAction;
use App\Http\Requests\StoreAppointmentRequest;
use App\Http\Requests\UpdateAppointmentRequest;
use App\Http\Resources\AppointmentResource;
use App\Models\Appointment;
use App\Services\ActivityLogService;
use Illuminate\Http\JsonResponse;
use Illuminate\Support\Facades\Gate;

class AppointmentController extends ApiController
{
    protected ActivityLogService $activityLogService;

    public function __construct(ActivityLogService $activityLogService)
    {
        $this->activityLogService = $activityLogService;
    }

    /**
     * Display a listing of appointments.
     */
    public function index(): JsonResponse
    {
        Gate::authorize('viewAny', Appointment::class);

        $query = Appointment::with(['lead', 'assignedUser']);

        // Filtreleme
        if (request()->has('lead_id')) {
            $query->where('lead_id', request('lead_id'));
        }

        if (request()->has('status')) {
            $query->where('status', request('status'));
        }

        if (request()->has('assigned_to')) {
            $query->where('assigned_to', request('assigned_to'));
        }

        if (request()->has('date_from')) {
            $query->where('appointment_date', '>=', request('date_from'));
        }

        if (request()->has('date_to')) {
            $query->where('appointment_date', '<=', request('date_to'));
        }

        if (request()->has('search')) {
            $search = request('search');
            $query->where(function ($q) use ($search) {
                $q->where('name', 'like', "%{$search}%")
                    ->orWhere('phone', 'like', "%{$search}%")
                    ->orWhere('email', 'like', "%{$search}%");
            });
        }

        // Row-level security: Atanan kullanıcı sadece kendi randevularını görür
        $user = auth()->user();
        $role = $user->role ?? null;
        if ($role && $role->name !== 'general_manager' && !$user->isSuperAdmin()) {
            // Genel müdür değilse, sadece kendi atanan randevularını görür
            $query->where(function ($q) use ($user) {
                $q->where('assigned_to', $user->id)
                    ->orWhereNull('assigned_to'); // Atanmamış randevular
            });
        }

        // Sıralama
        $query->orderBy('appointment_date', 'asc');

        $appointments = $query->paginate(request('per_page', 50));

        // İstatistikler
        $stats = [
            'total' => Appointment::count(),
            'scheduled' => Appointment::where('status', 'scheduled')->count(),
            'completed' => Appointment::where('status', 'completed')->count(),
            'cancelled' => Appointment::where('status', 'cancelled')->count(),
            'no_show' => Appointment::where('status', 'no_show')->count(),
        ];

        return $this->success([
            'appointments' => AppointmentResource::collection($appointments),
            'pagination' => [
                'current_page' => $appointments->currentPage(),
                'last_page' => $appointments->lastPage(),
                'per_page' => $appointments->perPage(),
                'total' => $appointments->total(),
            ],
            'statistics' => $stats,
        ], 'Randevular başarıyla listelendi.');
    }

    /**
     * Store a newly created appointment in storage.
     */
    public function store(StoreAppointmentRequest $request, CreateAppointmentAction $createAppointmentAction): JsonResponse
    {
        Gate::authorize('create', Appointment::class);

        try {
            $appointment = $createAppointmentAction->execute($request->validated());
            return $this->success(new AppointmentResource($appointment), 'Randevu başarıyla oluşturuldu.', 201);
        } catch (\Exception $e) {
            return $this->error('Randevu oluşturulurken bir hata oluştu: ' . $e->getMessage(), [], 500);
        }
    }

    /**
     * Display the specified appointment.
     */
    public function show(Appointment $appointment): JsonResponse
    {
        Gate::authorize('view', $appointment);

        return $this->success(new AppointmentResource($appointment->load(['lead', 'assignedUser'])), 'Randevu başarıyla getirildi.');
    }

    /**
     * Update the specified appointment in storage.
     */
    public function update(UpdateAppointmentRequest $request, Appointment $appointment, UpdateAppointmentAction $updateAppointmentAction): JsonResponse
    {
        Gate::authorize('update', $appointment);

        try {
            $updatedAppointment = $updateAppointmentAction->execute($appointment, $request->validated());
            return $this->success(new AppointmentResource($updatedAppointment), 'Randevu başarıyla güncellendi.');
        } catch (\Exception $e) {
            return $this->error('Randevu güncellenirken bir hata oluştu: ' . $e->getMessage(), [], 500);
        }
    }

    /**
     * Remove the specified appointment from storage.
     */
    public function destroy(Appointment $appointment): JsonResponse
    {
        Gate::authorize('delete', $appointment);

        try {
            $this->activityLogService->logDelete($appointment);
            $appointment->delete();
            return $this->success([], 'Randevu başarıyla silindi.');
        } catch (\Exception $e) {
            return $this->error('Randevu silinirken bir hata oluştu: ' . $e->getMessage(), [], 500);
        }
    }
}
