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
     * Tracks the mobile app's own device-fingerprint enrollment — separate
     * from the `passkeys` table (real WebAuthn credentials used by the web
     * app), since a phone's local biometric sensor confirmation via
     * local_auth is a different, weaker guarantee than a WebAuthn credential
     * and shouldn't be conflated with `users.bio_enrolled`.
     */
    public function up(): void
    {
        Schema::table('secretary_profiles', function (Blueprint $table) {
            $table->timestamp('device_biometric_enrolled_at')->nullable()->after('silent_alert_sent_at');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('secretary_profiles', function (Blueprint $table) {
            $table->dropColumn('device_biometric_enrolled_at');
        });
    }
};
