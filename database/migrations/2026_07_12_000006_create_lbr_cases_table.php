<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('lbr_cases', function (Blueprint $table) {
            $table->id();
            $table->string('lbr_id')->unique();
            $table->enum('status', ['FORWARDED', 'APPROVED', 'REJECTED', 'RETURNED', 'REGISTERED'])->default('FORWARDED');
            $table->enum('category', ['1-7', '7+']);

            $table->foreignId('union_council_id')->constrained()->restrictOnDelete();
            $table->foreignId('secretary_id')->constrained('users')->restrictOnDelete();
            $table->foreignId('adlg_id')->nullable()->constrained('users')->nullOnDelete();

            $table->date('dob');
            $table->decimal('age_at_application', 4, 1);
            $table->string('delay_reason');

            $table->string('child_name');
            $table->enum('child_gender', ['Male', 'Female', 'Other']);
            $table->string('child_birth_place')->nullable();
            $table->string('child_birth_type')->default('Hospital');
            $table->string('child_hospital')->nullable();

            $table->string('applicant_name');
            $table->string('applicant_cnic', 15);
            $table->string('applicant_relation')->default('Father');
            $table->string('applicant_father_name')->nullable();
            $table->string('applicant_mother_name')->nullable();
            $table->string('applicant_address')->nullable();
            $table->string('applicant_phone', 20)->nullable();

            $table->text('secretary_remarks')->nullable();

            $table->text('adlg_observations')->nullable();
            $table->string('adlg_order_no')->nullable();

            $table->string('certificate_no')->nullable();
            $table->date('certificate_date')->nullable();
            $table->text('certificate_remarks')->nullable();

            $table->boolean('locked')->default(false);
            $table->timestamp('locked_at')->nullable();

            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('lbr_cases');
    }
};
