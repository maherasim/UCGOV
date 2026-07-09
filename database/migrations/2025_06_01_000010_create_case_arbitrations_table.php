<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('case_arbitrations', function (Blueprint $table) {
            $table->id();
            $table->foreignId('dv_case_id')->unique()->constrained()->cascadeOnDelete();

            $table->string('husband_rep_name');
            $table->string('husband_rep_cnic', 15);
            $table->string('husband_rep_phone', 20)->nullable();
            $table->string('husband_rep_designation')->nullable();

            $table->string('wife_rep_name');
            $table->string('wife_rep_cnic', 15);
            $table->string('wife_rep_phone', 20)->nullable();
            $table->string('wife_rep_designation')->nullable();

            $table->timestamp('constituted_at');
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('case_arbitrations');
    }
};
