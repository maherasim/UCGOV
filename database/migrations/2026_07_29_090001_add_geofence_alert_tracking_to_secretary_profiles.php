<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Tracks the *start* of an ongoing violation (outside geofence / GPS disabled)
 * so alerts fire once on the transition into the bad state, not on every
 * periodic ping while it persists — see AttendanceController::updateLiveLocation()
 * and reportLocationDisabled().
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::table('secretary_profiles', function (Blueprint $table) {
            $table->timestamp('outside_geofence_since')->nullable()->after('live_updated_at');
            $table->timestamp('location_disabled_since')->nullable()->after('outside_geofence_since');
        });
    }

    public function down(): void
    {
        Schema::table('secretary_profiles', function (Blueprint $table) {
            $table->dropColumn(['outside_geofence_since', 'location_disabled_since']);
        });
    }
};
