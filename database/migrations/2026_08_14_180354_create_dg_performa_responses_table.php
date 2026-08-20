<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('dg_performa_responses', function (Blueprint $table) {
            $table->id();
            $table->foreignId('dg_performa_id')->constrained()->cascadeOnDelete();
            $table->foreignId('adlg_id')->constrained('users')->cascadeOnDelete();
            $table->enum('type', ['excel', 'form']);
            $table->string('file_path')->nullable();
            $table->date('response_date');
            $table->timestamps();

            $table->index(['dg_performa_id', 'adlg_id']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('dg_performa_responses');
    }
};
