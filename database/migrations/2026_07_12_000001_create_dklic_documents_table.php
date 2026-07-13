<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('dklic_documents', function (Blueprint $table) {
            $table->id();
            $table->foreignId('uploaded_by')->constrained('users')->cascadeOnDelete();
            $table->string('title');
            $table->enum('category', [
                'Rules', 'Punjab Gazette', 'Government Notification', 'Circular', 'SOP',
                'Office Order', 'Manual', 'Policy', 'Form/Template', 'Training Material',
                'Act', 'Official Letter',
            ]);
            $table->string('subject');
            $table->text('description')->nullable();
            $table->text('content_text')->nullable();
            $table->string('reference_no')->nullable();
            $table->date('issue_date')->nullable();
            $table->date('effective_date')->nullable();
            $table->string('version')->default('1.0');
            $table->enum('audience', ['All', 'ADLG', 'Secretary UC'])->default('All');
            $table->enum('priority', ['normal', 'urgent'])->default('normal');
            $table->boolean('ack_required')->default(false);
            $table->json('tags')->nullable();
            $table->string('file_path');
            $table->timestamp('published_at');
            $table->timestamp('archived_at')->nullable();
            $table->unsignedInteger('download_count')->default(0);
            $table->unsignedInteger('view_count')->default(0);
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('dklic_documents');
    }
};
