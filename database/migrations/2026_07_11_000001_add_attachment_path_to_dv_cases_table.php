<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('dv_cases', function (Blueprint $table) {
            $table->string('attachment_path')->nullable()->after('attachment_ok');
        });
    }

    public function down(): void
    {
        Schema::table('dv_cases', function (Blueprint $table) {
            $table->dropColumn('attachment_path');
        });
    }
};
