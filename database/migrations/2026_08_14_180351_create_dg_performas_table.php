<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('dg_performas', function (Blueprint $table) {
            $table->id();
            $table->foreignId('dg_id')->constrained('users')->cascadeOnDelete();
            $table->foreignId('division_id')->constrained()->cascadeOnDelete();
            $table->string('title');
            $table->text('description')->nullable();
            $table->enum('mode', ['excel', 'form']);
            $table->enum('report_type', ['onetime', 'daily'])->default('onetime');
            $table->date('deadline')->nullable();
            $table->string('excel_template_path')->nullable();
            $table->boolean('target_all_adlgs')->default(true);
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('dg_performas');
    }
};
