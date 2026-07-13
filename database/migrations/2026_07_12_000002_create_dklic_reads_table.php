<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('dklic_reads', function (Blueprint $table) {
            $table->id();
            $table->foreignId('dklic_document_id')->constrained()->cascadeOnDelete();
            $table->foreignId('user_id')->constrained()->cascadeOnDelete();
            $table->timestamp('read_at');

            $table->unique(['dklic_document_id', 'user_id']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('dklic_reads');
    }
};
