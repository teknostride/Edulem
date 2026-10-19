<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('scholarship_document_templates', function (Blueprint $table) {
            $table->id();
            $table->foreignId('tenant_id')->constrained()->onDelete('cascade');
            $table->string('name')->nullable();
            $table->date('exam_entry_date');
            $table->time('exam_entry_time')->nullable();
            $table->string('school_name');
            $table->text('exam_address');
            $table->timestamps();
            $table->softDeletes();

            $table->index(['tenant_id', 'deleted_at']);
            $table->index(['tenant_id', 'exam_entry_date']);
        });

        Schema::create('scholarship_document_template_classroom', function (Blueprint $table) {
            $table->id();
            $table->foreignId('template_id')
                ->constrained('scholarship_document_templates')
                ->onDelete('cascade');
            $table->foreignId('classroom_id')
                ->constrained('classrooms')
                ->onDelete('cascade');
            $table->timestamps();

            $table->index(['classroom_id']);
            $table->index(['template_id']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('scholarship_document_template_classroom');
        Schema::dropIfExists('scholarship_document_templates');
    }
};
