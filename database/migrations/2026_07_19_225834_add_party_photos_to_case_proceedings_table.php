<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        Schema::table('case_proceedings', function (Blueprint $table) {
            $table->string('petitioner_photo_path')->nullable()->after('petitioner_biometric');
            $table->string('respondent_photo_path')->nullable()->after('respondent_biometric');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('case_proceedings', function (Blueprint $table) {
            $table->dropColumn(['petitioner_photo_path', 'respondent_photo_path']);
        });
    }
};
