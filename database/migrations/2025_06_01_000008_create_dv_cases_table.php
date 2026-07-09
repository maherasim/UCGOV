<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('dv_cases', function (Blueprint $table) {
            $table->id();
            $table->string('case_no')->unique();
            $table->enum('type', ['divorce', 'khula']);
            $table->enum('status', [
                'SUBMITTED',
                'SEEN',
                'NOTICE_ISSUED',
                'ARB_CONSTITUTED',
                'DISPOSED_RECONCILED',
                'DISPOSED_EFFECTIVE',
                'FILED_NON_RESPONSE',
            ])->default('SUBMITTED');
            $table->foreignId('union_council_id')->constrained()->restrictOnDelete();
            $table->foreignId('secretary_id')->constrained('users')->restrictOnDelete();
            $table->foreignId('adlg_id')->nullable()->constrained('users')->nullOnDelete();

            $table->string('divorcer_name');
            $table->string('divorcer_cnic', 15);
            $table->string('divorcer_phone', 20)->nullable();

            $table->string('respondent_name');
            $table->string('respondent_cnic', 15);
            $table->string('respondent_phone', 20)->nullable();

            $table->string('address')->nullable();
            $table->date('receipt_date');
            $table->boolean('attachment_ok')->default(false);
            $table->text('remarks')->nullable();
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('dv_cases');
    }
};
