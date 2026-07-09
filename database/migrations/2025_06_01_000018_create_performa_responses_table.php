<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('performa_responses', function (Blueprint $table) {
            $table->id();
            $table->foreignId('performa_id')->constrained()->cascadeOnDelete();
            $table->foreignId('secretary_id')->constrained('users')->cascadeOnDelete();
            $table->enum('type', ['excel', 'form']);
            $table->string('file_path')->nullable();
            $table->date('response_date');
            $table->timestamps();

            $table->index(['performa_id', 'secretary_id']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('performa_responses');
    }
};
