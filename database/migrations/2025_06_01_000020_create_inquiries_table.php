<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('inquiries', function (Blueprint $table) {
            $table->id();
            $table->string('ref')->unique();
            $table->string('subject');
            $table->foreignId('adlg_id')->constrained('users')->cascadeOnDelete();
            $table->foreignId('union_council_id')->nullable()->constrained()->nullOnDelete();
            $table->text('remarks');
            $table->string('file_path')->nullable();
            $table->enum('status', ['PENDING', 'DRAFTED'])->default('PENDING');
            $table->string('report_file_path')->nullable();
            $table->text('report_remarks')->nullable();
            $table->timestamp('submitted_at');
            $table->timestamp('drafted_at')->nullable();
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('inquiries');
    }
};
