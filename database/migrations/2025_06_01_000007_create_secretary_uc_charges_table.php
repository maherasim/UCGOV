<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('secretary_uc_charges', function (Blueprint $table) {
            $table->id();
            $table->foreignId('secretary_profile_id')->constrained()->cascadeOnDelete();
            $table->foreignId('union_council_id')->constrained()->cascadeOnDelete();
            $table->timestamp('assigned_at')->nullable();
            $table->timestamps();

            $table->unique(['secretary_profile_id', 'union_council_id'], 'sec_uc_charge_unique');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('secretary_uc_charges');
    }
};
