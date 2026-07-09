<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('case_decisions', function (Blueprint $table) {
            $table->id();
            $table->foreignId('dv_case_id')->unique()->constrained()->cascadeOnDelete();
            $table->enum('type', [
                'DISPOSED_RECONCILED',
                'DISPOSED_EFFECTIVE',
                'FILED_NON_RESPONSE',
            ]);
            $table->string('order_no')->nullable();
            $table->date('decided_at');
            $table->text('remarks')->nullable();
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('case_decisions');
    }
};
