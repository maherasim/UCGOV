<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('secretary_profiles', function (Blueprint $table) {
            $table->decimal('live_lat', 10, 7)->nullable()->after('union_council_id');
            $table->decimal('live_lng', 10, 7)->nullable()->after('live_lat');
            $table->unsignedInteger('live_accuracy_meters')->nullable()->after('live_lng');
            $table->timestamp('live_updated_at')->nullable()->after('live_accuracy_meters');
        });
    }

    public function down(): void
    {
        Schema::table('secretary_profiles', function (Blueprint $table) {
            $table->dropColumn(['live_lat', 'live_lng', 'live_accuracy_meters', 'live_updated_at']);
        });
    }
};
