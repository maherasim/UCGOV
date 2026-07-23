<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('death_cases', function (Blueprint $table) {
            $table->id();
            $table->string('death_id')->unique();
            $table->enum('status', ['FORWARDED', 'PENDING_DDLG_APPROVAL', 'APPROVED', 'REJECTED', 'RETURNED', 'REGISTERED'])->default('FORWARDED');
            $table->enum('category', ['1-7', '7+', 'ABROAD']);

            $table->foreignId('union_council_id')->constrained()->restrictOnDelete();
            $table->foreignId('secretary_id')->constrained('users')->restrictOnDelete();
            $table->foreignId('adlg_id')->nullable()->constrained('users')->nullOnDelete();
            $table->foreignId('ddlg_id')->nullable()->constrained('users')->nullOnDelete();

            $table->date('date_of_death');
            $table->decimal('age_at_application', 4, 1);
            $table->string('delay_reason');

            $table->string('deceased_name');
            $table->enum('deceased_gender', ['Male', 'Female', 'Other']);
            $table->string('deceased_cnic', 15)->nullable();
            $table->string('cause_of_death')->nullable();
            $table->string('place_of_death')->nullable();
            $table->string('burial_place')->nullable();

            $table->string('applicant_name');
            $table->string('applicant_cnic', 15);
            $table->string('applicant_relation')->default('Relative');
            $table->string('applicant_address')->nullable();
            $table->string('applicant_phone', 20)->nullable();

            $table->text('secretary_remarks')->nullable();

            $table->text('adlg_observations')->nullable();
            $table->string('adlg_order_no')->nullable();

            $table->text('ddlg_observations')->nullable();
            $table->string('ddlg_order_no')->nullable();

            $table->string('court_decree_no')->nullable();
            $table->date('court_decree_date')->nullable();
            $table->string('court_name')->nullable();

            $table->string('country_of_death')->nullable();
            $table->string('passport_no')->nullable();

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
        Schema::dropIfExists('death_cases');
    }
};
