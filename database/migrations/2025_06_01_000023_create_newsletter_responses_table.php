<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('newsletter_responses', function (Blueprint $table) {
            $table->id();
            $table->foreignId('newsletter_id')->constrained()->cascadeOnDelete();
            $table->foreignId('adlg_id')->constrained('users')->cascadeOnDelete();
            $table->foreignId('newsletter_option_id')->constrained()->restrictOnDelete();
            $table->text('remarks')->nullable();
            $table->timestamp('responded_at');
            $table->timestamps();

            $table->unique(['newsletter_id', 'adlg_id']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('newsletter_responses');
    }
};
