<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::dropIfExists('scholarship_exam_entry_templates');

        Schema::create('scholarship_exam_entry_templates', function (Blueprint $table) {
            $table->id();
            $table->unsignedBigInteger('tenant_id');
            $table->unsignedBigInteger('scholarship_exam_id');
            $table->string('name');
            $table->string('school_name');
            $table->text('exam_address');
            $table->json('selected_grade_levels')->nullable();
            $table->boolean('is_active')->default(true);
            $table->unsignedBigInteger('created_by')->nullable();
            $table->timestamps();

            $table->foreign('tenant_id')->references('id')->on('tenants')->onDelete('cascade');
            $table->foreign('scholarship_exam_id')->references('id')->on('scholarship_exams')->onDelete('cascade');
            $table->foreign('created_by')->references('id')->on('users')->nullOnDelete();

            $table->index(['tenant_id', 'scholarship_exam_id'], 'seet_tenant_exam_idx');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('scholarship_exam_entry_templates');
    }
};
