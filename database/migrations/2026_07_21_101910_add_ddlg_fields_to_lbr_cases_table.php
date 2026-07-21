<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        DB::statement("ALTER TABLE lbr_cases MODIFY status ENUM(
            'FORWARDED', 'APPROVED', 'REJECTED', 'RETURNED', 'REGISTERED',
            'PENDING_DELAY_APPROVAL', 'PENDING_DDLG_APPROVAL', 'DELAY_APPROVED', 'DELAY_RETURNED'
        ) NOT NULL DEFAULT 'FORWARDED'");

        Schema::table('lbr_cases', function (Blueprint $table) {
            $table->foreignId('ddlg_id')->nullable()->after('adlg_order_no')->constrained('users')->nullOnDelete();
            $table->text('ddlg_observations')->nullable()->after('ddlg_id');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('lbr_cases', function (Blueprint $table) {
            $table->dropConstrainedForeignId('ddlg_id');
            $table->dropColumn('ddlg_observations');
        });

        DB::statement("ALTER TABLE lbr_cases MODIFY status ENUM(
            'FORWARDED', 'APPROVED', 'REJECTED', 'RETURNED', 'REGISTERED',
            'PENDING_DELAY_APPROVAL', 'DELAY_APPROVED', 'DELAY_RETURNED'
        ) NOT NULL DEFAULT 'FORWARDED'");
    }
};
