<?php

namespace App\Http\Controllers;

use App\Actions\CreateCalendarEventAction;
use App\Http\Requests\StoreCalendarEventRequest;
use App\Http\Requests\StoreCalendarEventParticipantRequest;
use App\Http\Resources\CalendarEventResource;
use App\Http\Resources\CalendarEventParticipantResource;
use App\Models\CalendarEvent;
use App\Models\CalendarEventParticipant;
use App\Services\ActivityLogService;
use App\Services\CalendarService;
use Illuminate\Http\JsonResponse;
use Illuminate\Support\Facades\Gate;
use Carbon\Carbon;

class CalendarEventController extends ApiController
{
    protected ActivityLogService $activityLogService;
    protected CalendarService $calendarService;

    public function __construct(
        ActivityLogService $activityLogService,
        CalendarService $calendarService
    ) {
        $this->activityLogService = $activityLogService;
        $this->calendarService = $calendarService;
    }

    /**
     * Display a listing of calendar events.
     */
    public function index(): JsonResponse
    {
        Gate::authorize('viewAny', CalendarEvent::class);

        $query = CalendarEvent::with(['creator', 'participants.user', 'participants.student', 'participants.guardian']);

        // Filtreleme
        if (request()->has('event_type')) {
            $query->where('event_type', request('event_type'));
        }

        if (request()->has('event_date_from')) {
            $query->where('event_date', '>=', request('event_date_from'));
        }

        if (request()->has('event_date_to')) {
            $query->where('event_date', '<=', request('event_date_to'));
        }

        if (request()->has('date')) {
            $query->where('event_date', request('date'));
        }

        if (request()->has('user_id')) {
            $userId = request('user_id');
            $query->whereHas('participants', function ($q) use ($userId) {
                $q->where('user_id', $userId);
            });
        }

        if (request()->has('student_id')) {
            $studentId = request('student_id');
            $query->whereHas('participants', function ($q) use ($studentId) {
                $q->where('student_id', $studentId);
            });
        }

        if (request()->has('public_only')) {
            $query->where('is_public', true);
        }

        if (request()->has('upcoming_only')) {
            $query->where(function ($q) {
                $q->where('event_date', '>', Carbon::now())
                    ->orWhere(function ($q2) {
                        $q2->where('event_date', Carbon::now()->format('Y-m-d'))
                            ->where('end_time', '>', Carbon::now()->format('H:i'));
                    });
            });
        }

        // Sıralama
        $query->orderBy('event_date')
            ->orderBy('start_time');

        $events = $query->paginate(request('per_page', 50));

        return $this->success([
            'events' => CalendarEventResource::collection($events),
            'pagination' => [
                'current_page' => $events->currentPage(),
                'last_page' => $events->lastPage(),
                'per_page' => $events->perPage(),
                'total' => $events->total(),
            ],
        ], 'Ajanda etkinlikleri başarıyla listelendi.');
    }

    /**
     * Store a newly created calendar event.
     */
    public function store(StoreCalendarEventRequest $request, CreateCalendarEventAction $action): JsonResponse
    {
        Gate::authorize('create', CalendarEvent::class);

        try {
            $event = $action->execute($request->validated());

            return $this->success(new CalendarEventResource($event), 'Ajanda etkinliği başarıyla oluşturuldu.', 201);
        } catch (\Exception $e) {
            return $this->error($e->getMessage(), [], 400);
        }
    }

    /**
     * Display the specified calendar event.
     */
    public function show(CalendarEvent $calendarEvent): JsonResponse
    {
        Gate::authorize('view', $calendarEvent);

        $calendarEvent->load(['creator', 'participants.user', 'participants.student', 'participants.guardian']);

        return $this->success(new CalendarEventResource($calendarEvent));
    }

    /**
     * Update the specified calendar event.
     */
    public function update(StoreCalendarEventRequest $request, CalendarEvent $calendarEvent): JsonResponse
    {
        Gate::authorize('update', $calendarEvent);

        try {
            $calendarEvent->update($request->validated());
            $this->activityLogService->logUpdate($calendarEvent);

            return $this->success(new CalendarEventResource($calendarEvent->fresh()), 'Ajanda etkinliği başarıyla güncellendi.');
        } catch (\Exception $e) {
            return $this->error($e->getMessage(), [], 400);
        }
    }

    /**
     * Remove the specified calendar event.
     */
    public function destroy(CalendarEvent $calendarEvent): JsonResponse
    {
        Gate::authorize('delete', $calendarEvent);

        $this->activityLogService->logDelete($calendarEvent);
        $calendarEvent->delete();

        return $this->success(null, 'Ajanda etkinliği başarıyla silindi.');
    }

    /**
     * Add participant to event.
     */
    public function addParticipant(StoreCalendarEventParticipantRequest $request): JsonResponse
    {
        Gate::authorize('update', CalendarEvent::findOrFail($request->calendar_event_id));

        try {
            // Duplicate kontrolü
            $existing = CalendarEventParticipant::where('calendar_event_id', $request->calendar_event_id)
                ->where(function ($q) use ($request) {
                    if ($request->user_id) {
                        $q->where('user_id', $request->user_id);
                    }
                    if ($request->student_id) {
                        $q->orWhere('student_id', $request->student_id);
                    }
                    if ($request->guardian_id) {
                        $q->orWhere('guardian_id', $request->guardian_id);
                    }
                })
                ->first();

            if ($existing) {
                return $this->error('Bu kişi zaten etkinliğe eklenmiş.', [], 400);
            }

            $participant = CalendarEventParticipant::create([
                'calendar_event_id' => $request->calendar_event_id,
                'user_id' => $request->user_id ?? null,
                'student_id' => $request->student_id ?? null,
                'guardian_id' => $request->guardian_id ?? null,
                'participant_type' => $request->participant_type,
                'status' => $request->status ?? 'pending',
                'notes' => $request->notes ?? null,
            ]);

            $this->activityLogService->logCreate($participant);

            return $this->success(new CalendarEventParticipantResource($participant->load(['user', 'student', 'guardian'])), 'Katılımcı başarıyla eklendi.', 201);
        } catch (\Exception $e) {
            return $this->error($e->getMessage(), [], 400);
        }
    }

    /**
     * Remove participant from event.
     */
    public function removeParticipant(CalendarEventParticipant $calendarEventParticipant): JsonResponse
    {
        Gate::authorize('update', $calendarEventParticipant->calendarEvent);

        $this->activityLogService->logDelete($calendarEventParticipant);
        $calendarEventParticipant->delete();

        return $this->success(null, 'Katılımcı başarıyla kaldırıldı.');
    }

    /**
     * Update participant status.
     */
    public function updateParticipantStatus(CalendarEventParticipant $calendarEventParticipant): JsonResponse
    {
        Gate::authorize('view', $calendarEventParticipant->calendarEvent);

        $status = request('status', 'pending');

        if (!in_array($status, ['pending', 'accepted', 'declined', 'tentative'])) {
            return $this->error('Geçersiz durum.', [], 400);
        }

        $calendarEventParticipant->update(['status' => $status]);
        $this->activityLogService->logUpdate($calendarEventParticipant);

        return $this->success(new CalendarEventParticipantResource($calendarEventParticipant->fresh()), 'Katılımcı durumu başarıyla güncellendi.');
    }

    /**
     * Get user calendar (with integrated events).
     */
    public function getUserCalendar(): JsonResponse
    {
        Gate::authorize('viewAny', CalendarEvent::class);

        $userId = auth()->id();
        $startDate = request('start_date', Carbon::now()->startOfMonth()->format('Y-m-d'));
        $endDate = request('end_date', Carbon::now()->endOfMonth()->format('Y-m-d'));

        // Kullanıcının etkinlikleri
        $userEvents = CalendarEvent::whereHas('participants', function ($q) use ($userId) {
            $q->where('user_id', $userId);
        })
            ->whereBetween('event_date', [$startDate, $endDate])
            ->with(['creator', 'participants'])
            ->get();

        // Personel görevlendirmeleri (ajandada gösterilen)
        $assignments = \App\Models\StaffAssignment::where('show_in_calendar', true)
            ->whereJsonContains('assigned_staff_ids', $userId)
            ->whereBetween('start_date', [$startDate, $endDate])
            ->with(['teamLeader', 'creator'])
            ->get();

        // Randevular (kullanıcının randevuları)
        $appointments = \App\Models\Appointment::where('assigned_to', $userId)
            ->whereBetween('appointment_date', [$startDate, $endDate])
            ->with(['lead', 'assignedUser'])
            ->get();

        return $this->success([
            'events' => CalendarEventResource::collection($userEvents),
            'assignments' => \App\Http\Resources\StaffAssignmentResource::collection($assignments),
            'appointments' => \App\Http\Resources\AppointmentResource::collection($appointments),
            'period' => [
                'start_date' => $startDate,
                'end_date' => $endDate,
            ],
        ], 'Kullanıcı ajandası başarıyla getirildi.');
    }

    /**
     * Sync staff assignments to calendar.
     */
    public function syncStaffAssignments(): JsonResponse
    {
        Gate::authorize('create', CalendarEvent::class);

        try {
            $assignments = \App\Models\StaffAssignment::where('show_in_calendar', true)
                ->where('start_date', '>=', Carbon::now()->subDays(30))
                ->get();

            $synced = 0;
            foreach ($assignments as $assignment) {
                $event = $this->calendarService->syncStaffAssignment($assignment);
                if ($event) {
                    $synced++;
                }
            }

            return $this->success([
                'synced_count' => $synced,
                'total_assignments' => $assignments->count(),
            ], "{$synced} personel görevlendirmesi ajandaya senkronize edildi.");
        } catch (\Exception $e) {
            return $this->error($e->getMessage(), [], 400);
        }
    }

    /**
     * Sync appointments to calendar.
     */
    public function syncAppointments(): JsonResponse
    {
        Gate::authorize('create', CalendarEvent::class);

        try {
            $appointments = \App\Models\Appointment::where('appointment_date', '>=', Carbon::now()->subDays(30))
                ->get();

            $synced = 0;
            foreach ($appointments as $appointment) {
                $event = $this->calendarService->syncAppointment($appointment);
                if ($event) {
                    $synced++;
                }
            }

            return $this->success([
                'synced_count' => $synced,
                'total_appointments' => $appointments->count(),
            ], "{$synced} randevu ajandaya senkronize edildi.");
        } catch (\Exception $e) {
            return $this->error($e->getMessage(), [], 400);
        }
    }
}
