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
 * upfront, ADLG forwards to DDLG, and DDLG's decision is final. No existing
 * rows use the statuses being dropped (verified: zero LbrCase rows exist).
 */
return new class extends Migration
{
    public function up(): void
    {
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
