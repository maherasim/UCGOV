<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('case_proceedings', function (Blueprint $table) {
            $table->id();
            $table->foreignId('dv_case_id')->constrained()->cascadeOnDelete();
            $table->string('proc_no');
            $table->date('date');
            $table->string('venue')->default('UC Office');
            $table->string('chairman_name')->nullable();

            $table->boolean('petitioner_present')->default(false);
            $table->boolean('respondent_present')->default(false);
            $table->boolean('petitioner_biometric')->default(false);
            $table->boolean('respondent_biometric')->default(false);

            $table->string('pet_rep_name')->nullable();
            $table->string('pet_rep_cnic', 15)->nullable();
            $table->string('res_rep_name')->nullable();
            $table->string('res_rep_cnic', 15)->nullable();

            $table->text('pet_statement')->nullable();
            $table->text('res_statement')->nullable();
            $table->text('reconciliation')->nullable();

            $table->boolean('adjourned')->default(false);
            $table->text('adjourn_reason')->nullable();
            $table->date('next_hearing_date')->nullable();

            $table->boolean('notice_issued')->default(false);
            $table->string('notice_ref')->nullable();
            $table->date('notice_date')->nullable();
            $table->text('notice_details')->nullable();

            $table->text('adlg_observation')->nullable();
            $table->text('adlg_direction')->nullable();

            $table->foreignId('recorded_by')->constrained('users')->restrictOnDelete();
            $table->timestamp('recorded_at');

            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('case_proceedings');
    }
};
