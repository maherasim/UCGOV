<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Only populated when the parent dg_performas.target_all_adlgs is false — the
     * hand-picked subset of ADLGs a DG chose for one specific publish.
     */
    public function up(): void
    {
        Schema::create('dg_performa_targets', function (Blueprint $table) {
            $table->id();
            $table->foreignId('dg_performa_id')->constrained()->cascadeOnDelete();
            $table->foreignId('adlg_id')->constrained('users')->cascadeOnDelete();
            $table->timestamps();

            $table->unique(['dg_performa_id', 'adlg_id']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('dg_performa_targets');
    }
};
