<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('dg_performa_response_values', function (Blueprint $table) {
            $table->id();
            $table->foreignId('dg_performa_response_id')->constrained()->cascadeOnDelete();
            $table->foreignId('dg_performa_field_id')->constrained()->cascadeOnDelete();
            $table->text('value')->nullable();
            $table->timestamps();

            $table->unique(['dg_performa_response_id', 'dg_performa_field_id'], 'dg_performa_response_value_unique');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('dg_performa_response_values');
    }
};
