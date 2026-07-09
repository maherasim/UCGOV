<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('newsletters', function (Blueprint $table) {
            $table->id();
            $table->foreignId('published_by')->constrained('users')->cascadeOnDelete();
            $table->string('subject');
            $table->text('body');
            $table->enum('priority', ['normal', 'urgent', 'info'])->default('normal');
            $table->string('attachment_path')->nullable();
            $table->timestamp('published_at');
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('newsletters');
    }
};
