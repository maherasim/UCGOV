<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('dg_performa_fields', function (Blueprint $table) {
            $table->id();
            $table->foreignId('dg_performa_id')->constrained()->cascadeOnDelete();
            $table->string('label');
            $table->enum('type', ['number', 'text', 'date']);
            $table->unsignedInteger('sort_order')->default(0);
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('dg_performa_fields');
    }
};
