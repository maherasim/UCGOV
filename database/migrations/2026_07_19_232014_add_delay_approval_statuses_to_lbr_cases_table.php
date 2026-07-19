<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        DB::statement("ALTER TABLE lbr_cases MODIFY status ENUM(
            'FORWARDED', 'APPROVED', 'REJECTED', 'RETURNED', 'REGISTERED',
            'PENDING_DELAY_APPROVAL', 'DELAY_APPROVED', 'DELAY_RETURNED'
        ) NOT NULL DEFAULT 'FORWARDED'");
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        DB::statement("ALTER TABLE lbr_cases MODIFY status ENUM(
            'FORWARDED', 'APPROVED', 'REJECTED', 'RETURNED', 'REGISTERED'
        ) NOT NULL DEFAULT 'FORWARDED'");
    }
};
