<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('districts', function (Blueprint $table) {
            $table->id();
            $table->foreignId('division_id')->constrained()->restrictOnDelete();
            $table->string('name');
            $table->timestamps();

            $table->unique(['division_id', 'name']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('districts');
    }
};
