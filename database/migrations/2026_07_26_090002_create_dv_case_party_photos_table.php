<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Photos/scans the Secretary attaches for each party at case-initiation time —
 * a free gallery (no fixed labels), separate per party so they render as two
 * distinct sets across every role's case view (Secretary, ADLG, DDLG).
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::create('dv_case_party_photos', function (Blueprint $table) {
            $table->id();
            $table->foreignId('dv_case_id')->constrained()->cascadeOnDelete();
            $table->enum('party', ['divorcer', 'respondent']);
            $table->string('file_path');
            $table->timestamp('uploaded_at');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('dv_case_party_photos');
    }
};
