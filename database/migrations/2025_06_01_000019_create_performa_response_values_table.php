<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('performa_response_values', function (Blueprint $table) {
            $table->id();
            $table->foreignId('performa_response_id')->constrained()->cascadeOnDelete();
            $table->foreignId('performa_field_id')->constrained()->cascadeOnDelete();
            $table->text('value')->nullable();
            $table->timestamps();

            $table->unique(['performa_response_id', 'performa_field_id'], 'performa_response_value_unique');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('performa_response_values');
    }
};
