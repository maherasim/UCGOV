<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        Schema::table('secretary_profiles', function (Blueprint $table) {
            $table->timestamp('silent_alert_sent_at')->nullable()->after('location_disabled_since');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('secretary_profiles', function (Blueprint $table) {
            $table->dropColumn('silent_alert_sent_at');
        });
    }
};
