<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

/**
 * Collapses the LBR "over 7 years" flow from a two-stage process (lightweight
 * delay request -> ADLG delay approval -> DDLG delay approval -> secretary
 * completes full application -> second ADLG review) into a single stage,
 * matching Rule 5: the secretary submits the full application with documents
 * upfront, ADLG forwards to DDLG, and DDLG's decision is final.
 *
 * Any real case still sitting in one of the three dropped statuses is remapped
 * before the enum is narrowed, so it stays actionable in the new flow instead
 * of being silently truncated (and orphaned — the old endpoints for those
 * statuses no longer exist in the controller):
 *   - PENDING_DELAY_APPROVAL -> FORWARDED (was already awaiting ADLG's look)
 *   - DELAY_APPROVED / DELAY_RETURNED -> RETURNED (secretary must resubmit
 *     the now-complete application via the new single resubmit() endpoint,
 *     since these cases never collected the full document set)
 * A timeline note + audit log entry is added to each remapped case so the
 * status change isn't unexplained when ADLG/secretary next open it.
 */
return new class extends Migration
{
    public function up(): void
    {
        $statusMap = [
            'PENDING_DELAY_APPROVAL' => 'FORWARDED',
            'DELAY_APPROVED' => 'RETURNED',
            'DELAY_RETURNED' => 'RETURNED',
        ];

        $affected = DB::table('lbr_cases')->whereIn('status', array_keys($statusMap))->get(['id', 'status']);

        foreach ($affected as $case) {
            $newStatus = $statusMap[$case->status];

            DB::table('lbr_cases')->where('id', $case->id)->update(['status' => $newStatus]);

            DB::table('lbr_timeline_events')->insert([
                'lbr_case_id' => $case->id,
                'stage' => $newStatus,
                'event_date' => now()->toDateString(),
                'actor_user_id' => null,
                'note' => $newStatus === 'RETURNED'
                    ? "System: the over-7-years workflow was simplified to a single application stage. This case (previously {$case->status}) now needs the Secretary to resubmit with the complete application and documents."
                    : "System: the over-7-years workflow was simplified to a single application stage. This case (previously {$case->status}) is now awaiting ADLG review.",
                'created_at' => now(),
                'updated_at' => now(),
            ]);

            DB::table('audit_logs')->insert([
                'user_id' => null,
                'action' => 'LBR_STATUS_MIGRATED',
                'entity_type' => 'LbrCase',
                'entity_id' => $case->id,
                'note' => "Status remapped from {$case->status} to {$newStatus} by the over-7-years workflow simplification migration.",
                'created_at' => now(),
                'updated_at' => now(),
            ]);
        }

        DB::statement("ALTER TABLE lbr_cases MODIFY status ENUM(
            'FORWARDED', 'PENDING_DDLG_APPROVAL', 'APPROVED', 'REJECTED', 'RETURNED', 'REGISTERED'
        ) NOT NULL DEFAULT 'FORWARDED'");

        Schema::table('lbr_cases', function (Blueprint $table) {
            $table->string('ddlg_order_no')->nullable()->after('ddlg_observations');
        });
    }

    public function down(): void
    {
        Schema::table('lbr_cases', function (Blueprint $table) {
            $table->dropColumn('ddlg_order_no');
        });

        DB::statement("ALTER TABLE lbr_cases MODIFY status ENUM(
            'FORWARDED', 'APPROVED', 'REJECTED', 'RETURNED', 'REGISTERED',
            'PENDING_DELAY_APPROVAL', 'PENDING_DDLG_APPROVAL', 'DELAY_APPROVED', 'DELAY_RETURNED'
        ) NOT NULL DEFAULT 'FORWARDED'");
    }
};
