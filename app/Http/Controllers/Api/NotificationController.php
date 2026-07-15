<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\CaseNotification;
use Illuminate\Http\Request;

class NotificationController extends Controller
{
    public function index(Request $request)
    {
        $userId = $request->user()->id;

        $notifications = CaseNotification::where('to_user_id', $userId)
            ->with('fromUser')
            ->latest()
            ->take(50)
            ->get();

        return response()->json([
            'data' => $notifications->map(fn (CaseNotification $n) => [
                'id' => $n->id,
                'type' => $n->type,
                'message' => $n->message,
                'from' => $n->fromUser?->name,
                'read' => $n->read_at !== null,
                'created_at' => $n->created_at,
            ]),
            'meta' => [
                'unread_count' => CaseNotification::where('to_user_id', $userId)->whereNull('read_at')->count(),
            ],
        ]);
    }

    public function markRead(Request $request, CaseNotification $notification)
    {
        abort_unless($notification->to_user_id === $request->user()->id, 403);

        if ($notification->read_at === null) {
            $notification->update(['read_at' => now()]);
        }

        return response()->noContent();
    }

    public function markAllRead(Request $request)
    {
        CaseNotification::where('to_user_id', $request->user()->id)
            ->whereNull('read_at')
            ->update(['read_at' => now()]);

        return response()->noContent();
    }
}
