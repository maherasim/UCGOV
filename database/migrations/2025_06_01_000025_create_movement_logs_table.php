<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('movement_logs', function (Blueprint $table) {
            $table->id();
            $table->foreignId('secretary_id')->constrained('users')->cascadeOnDelete();
            $table->foreignId('union_council_id')->constrained()->restrictOnDelete();
            $table->string('reason');
            $table->text('details')->nullable();
            $table->unsignedInteger('distance_meters')->default(0);
            $table->timestamp('occurred_at');
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('movement_logs');
    }
};
