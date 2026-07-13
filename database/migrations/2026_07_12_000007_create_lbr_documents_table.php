<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('lbr_documents', function (Blueprint $table) {
            $table->id();
            $table->foreignId('lbr_case_id')->constrained()->cascadeOnDelete();
            $table->string('doc_key');
            $table->string('label');
            $table->string('file_path');
            $table->timestamp('uploaded_at');

            $table->unique(['lbr_case_id', 'doc_key']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('lbr_documents');
    }
};
