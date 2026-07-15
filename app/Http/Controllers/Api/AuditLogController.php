<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Resources\AuditLogResource;
use App\Models\AuditLog;
use Illuminate\Http\Request;

class AuditLogController extends Controller
{
    public function index(Request $request)
    {
        $query = AuditLog::with('user')->latest();

        if ($request->filled('search')) {
            $search = $request->string('search')->toString();
            $query->where(function ($q) use ($search) {
                $q->where('action', 'like', "%{$search}%")
                    ->orWhere('note', 'like', "%{$search}%");
            });
        }

        return AuditLogResource::collection($query->paginate(30));
    }

    public function export(Request $request)
    {
        $query = AuditLog::with('user')->latest();

        if ($request->filled('search')) {
            $search = $request->string('search')->toString();
            $query->where(function ($q) use ($search) {
                $q->where('action', 'like', "%{$search}%")
                    ->orWhere('note', 'like', "%{$search}%");
            });
        }

        $logs = $query->get();

        $rows = ['Date,Time,User,Action,Entity Type,Entity ID,Note'];
        foreach ($logs as $log) {
            $rows[] = implode(',', [
                $log->created_at->toDateString(),
                $log->created_at->format('H:i:s'),
                '"'.str_replace('"', '""', $log->user?->name ?? 'System').'"',
                $log->action,
                $log->entity_type ?? '',
                $log->entity_id ?? '',
                '"'.str_replace('"', '""', $log->note ?? '').'"',
            ]);
        }

        $csv = implode("\n", $rows);
        $filename = 'Audit_Log_'.now()->toDateString().'.csv';

        return response($csv, 200, [
            'Content-Type' => 'text/csv',
            'Content-Disposition' => "attachment; filename=\"{$filename}\"",
        ]);
    }
}
