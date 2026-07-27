<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Multi-file case documents (images or PDF) — currently used for Khula's Court
 * Decree attachment, which needed more than the single generic `attachment`
 * field (still used as-is for Divorce's Divorce Deed).
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::create('dv_case_documents', function (Blueprint $table) {
            $table->id();
            $table->foreignId('dv_case_id')->constrained()->cascadeOnDelete();
            $table->string('file_path');
            $table->timestamp('uploaded_at');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('dv_case_documents');
    }
};
