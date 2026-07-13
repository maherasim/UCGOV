<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('dv_cases', function (Blueprint $table) {
            $table->date('marriage_date')->nullable()->after('respondent_phone');
            $table->string('nikah_registrar')->nullable()->after('marriage_date');
            $table->string('mahr_amount')->nullable()->after('nikah_registrar');
            $table->string('children_count')->nullable()->after('mahr_amount');
        });

        DB::statement("ALTER TABLE dv_cases MODIFY status ENUM(
            'SUBMITTED',
            'SEEN',
            'NOTICE_ISSUED',
            'ARB_CONSTITUTED',
            'IN_PROCEEDINGS',
            'DISPOSED_RECONCILED',
            'DISPOSED_EFFECTIVE',
            'FILED_NON_RESPONSE'
        ) DEFAULT 'SUBMITTED'");
    }

    public function down(): void
    {
        DB::statement("ALTER TABLE dv_cases MODIFY status ENUM(
            'SUBMITTED',
            'SEEN',
            'NOTICE_ISSUED',
            'ARB_CONSTITUTED',
            'DISPOSED_RECONCILED',
            'DISPOSED_EFFECTIVE',
            'FILED_NON_RESPONSE'
        ) DEFAULT 'SUBMITTED'");

        Schema::table('dv_cases', function (Blueprint $table) {
            $table->dropColumn(['marriage_date', 'nikah_registrar', 'mahr_amount', 'children_count']);
        });
    }
};
