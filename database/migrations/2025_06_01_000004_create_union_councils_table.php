<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('union_councils', function (Blueprint $table) {
            $table->id();
            $table->foreignId('tehsil_id')->constrained()->restrictOnDelete();
            $table->unsignedInteger('uc_no')->nullable();
            $table->string('name');
            $table->string('code')->nullable();
            $table->string('address')->nullable();
            $table->decimal('lat', 10, 7)->nullable();
            $table->decimal('lng', 10, 7)->nullable();
            $table->unsignedInteger('geofence_radius')->default(150);
            $table->boolean('active')->default(true);
            $table->timestamps();

            $table->unique(['tehsil_id', 'uc_no']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('union_councils');
    }
};
