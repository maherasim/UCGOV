<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('death_timeline_events', function (Blueprint $table) {
            $table->id();
            $table->foreignId('death_case_id')->constrained()->cascadeOnDelete();
            $table->string('stage');
            $table->date('event_date');
            $table->foreignId('actor_user_id')->nullable()->constrained('users')->nullOnDelete();
            $table->text('note')->nullable();
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('death_timeline_events');
    }
};
