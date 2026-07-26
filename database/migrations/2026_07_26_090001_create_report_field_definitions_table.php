<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Standing custom fields an ADLG defines for their tehsil's daily report — once
 * added, every secretary in that tehsil sees it on their daily report form and
 * fills in a value each time they submit, alongside their own ad-hoc fields
 * (which stay independent — see DailyReport.custom_fields).
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::create('report_field_definitions', function (Blueprint $table) {
            $table->id();
            $table->foreignId('tehsil_id')->constrained()->restrictOnDelete();
            $table->foreignId('adlg_id')->nullable()->constrained('users')->nullOnDelete();
            $table->string('label');
            $table->boolean('active')->default(true);
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('report_field_definitions');
    }
};
