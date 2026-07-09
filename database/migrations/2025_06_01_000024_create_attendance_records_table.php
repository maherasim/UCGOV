<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('attendance_records', function (Blueprint $table) {
            $table->id();
            $table->foreignId('secretary_id')->constrained('users')->cascadeOnDelete();
            $table->foreignId('union_council_id')->constrained()->restrictOnDelete();
            $table->date('attendance_date');
            $table->time('check_in_time');
            $table->enum('status', ['present', 'late']);
            $table->boolean('inside_geofence')->default(false);
            $table->boolean('biometric_verified')->default(false);
            $table->decimal('lat', 10, 7)->nullable();
            $table->decimal('lng', 10, 7)->nullable();
            $table->unsignedInteger('distance_meters')->nullable();
            $table->string('device_gmail')->nullable();
            $table->timestamps();

            $table->unique(['secretary_id', 'attendance_date']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('attendance_records');
    }
};
