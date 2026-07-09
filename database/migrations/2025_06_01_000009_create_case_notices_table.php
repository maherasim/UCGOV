<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('case_notices', function (Blueprint $table) {
            $table->id();
            $table->foreignId('dv_case_id')->unique()->constrained()->cascadeOnDelete();
            $table->string('notice_no');
            $table->date('issue_date');
            $table->date('hearing_date')->nullable();
            $table->boolean('attachment_ok')->default(false);
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('case_notices');
    }
};
