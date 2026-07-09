<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('daily_reports', function (Blueprint $table) {
            $table->id();
            $table->foreignId('secretary_id')->constrained('users')->cascadeOnDelete();
            $table->foreignId('union_council_id')->constrained()->restrictOnDelete();
            $table->date('report_date');
            $table->text('remarks');
            $table->unsignedInteger('nikah_count')->default(0);
            $table->unsignedInteger('birth_count')->default(0);
            $table->unsignedInteger('death_count')->default(0);
            $table->unsignedInteger('complaint_count')->default(0);
            $table->string('attachment_path')->nullable();
            $table->boolean('reviewed')->default(false);
            $table->timestamp('reviewed_at')->nullable();
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('daily_reports');
    }
};
