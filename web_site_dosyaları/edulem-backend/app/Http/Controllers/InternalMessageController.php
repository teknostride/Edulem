<?php

namespace App\Http\Controllers;

use App\Actions\CreateInternalMessageAction;
use App\Http\Requests\StoreInternalMessageRequest;
use App\Http\Resources\InternalMessageResource;
use App\Models\InternalMessage;
use App\Services\ActivityLogService;
use Illuminate\Http\JsonResponse;
use Illuminate\Support\Facades\Gate;

class InternalMessageController extends ApiController
{
    protected ActivityLogService $activityLogService;

    public function __construct(ActivityLogService $activityLogService)
    {
        $this->activityLogService = $activityLogService;
    }

    /**
     * Display a listing of internal messages.
     */
    public function index(): JsonResponse
    {
        Gate::authorize('viewAny', InternalMessage::class);

        $user = auth()->user();
        $query = InternalMessage::with(['sender', 'file', 'recipients.recipient']);

        // Filtreleme
        if (request()->has('type')) {
            $query->where('type', request('type'));
        }

        if (request()->has('priority')) {
            $query->where('priority', request('priority'));
        }

        // Kullanıcı sadece kendi gönderdiği veya aldığı mesajları görür
        $query->where(function ($q) use ($user) {
            $q->where('sender_id', $user->id)
              ->orWhereHas('recipients', function ($q) use ($user) {
                  $q->where('recipient_id', $user->id);
              });
        });

        // Okunmamış mesajlar
        if (request('unread_only')) {
            $query->whereHas('recipients', function ($q) use ($user) {
                $q->where('recipient_id', $user->id)
                  ->where('is_read', false);
            });
        }

        $messages = $query->latest('created_at')->paginate(request('per_page', 50));

        return $this->success([
            'messages' => InternalMessageResource::collection($messages),
            'pagination' => [
                'current_page' => $messages->currentPage(),
                'last_page' => $messages->lastPage(),
                'per_page' => $messages->perPage(),
                'total' => $messages->total(),
            ],
        ], 'Mesajlar başarıyla listelendi.');
    }

    /**
     * Store a newly created internal message.
     */
    public function store(StoreInternalMessageRequest $request, CreateInternalMessageAction $createAction): JsonResponse
    {
        Gate::authorize('create', InternalMessage::class);

        $message = $createAction->execute($request->validated());

        return $this->success(new InternalMessageResource($message), 'Mesaj başarıyla gönderildi.', 201);
    }

    /**
     * Display the specified internal message.
     */
    public function show(InternalMessage $message): JsonResponse
    {
        Gate::authorize('view', $message);

        $message->load(['sender', 'file', 'recipients.recipient']);

        // Okundu işaretle (alıcı ise)
        $user = auth()->user();
        if ($message->recipients()->where('recipient_id', $user->id)->exists()) {
            $message->recipients()
                ->where('recipient_id', $user->id)
                ->update([
                    'is_read' => true,
                    'read_at' => now(),
                ]);
        }

        return $this->success(new InternalMessageResource($message));
    }

    /**
     * Remove the specified internal message.
     */
    public function destroy(InternalMessage $message): JsonResponse
    {
        Gate::authorize('delete', $message);

        $this->activityLogService->logDelete($message);
        $message->delete();

        return $this->success(null, 'Mesaj başarıyla silindi.');
    }

    /**
     * Mark message as read.
     */
    public function markAsRead(InternalMessage $message): JsonResponse
    {
        Gate::authorize('view', $message);

        $user = auth()->user();
        $message->recipients()
            ->where('recipient_id', $user->id)
            ->update([
                'is_read' => true,
                'read_at' => now(),
            ]);

        return $this->success(null, 'Mesaj okundu olarak işaretlendi.');
    }

    /**
     * Get unread message count.
     */
    public function unreadCount(): JsonResponse
    {
        Gate::authorize('viewAny', InternalMessage::class);

        $user = auth()->user();
        $count = MessageRecipient::where('recipient_id', $user->id)
            ->where('is_read', false)
            ->count();

        return $this->success(['count' => $count], 'Okunmamış mesaj sayısı başarıyla getirildi.');
    }
}
