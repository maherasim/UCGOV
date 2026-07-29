<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    /**
     * Tracks the last time this ADLG downloaded their attendance analytics
     * export — lets both the web popup and the 10-minute push reminder stop
     * nagging once they've actually downloaded today's report.
     */
    public function up(): void
    {
        Schema::table('adlg_profiles', function (Blueprint $table) {
            $table->timestamp('last_analytics_download_at')->nullable()->after('grade');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('adlg_profiles', function (Blueprint $table) {
            $table->dropColumn('last_analytics_download_at');
        });
    }
};
