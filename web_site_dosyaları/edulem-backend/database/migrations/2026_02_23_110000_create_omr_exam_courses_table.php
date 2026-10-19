<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('omr_exam_courses', function (Blueprint $table) {
            $table->id();
            $table->foreignId('tenant_id')->constrained('tenants')->onDelete('cascade');
            $table->foreignId('exam_id')->constrained('omr_exams')->onDelete('cascade');
            $table->foreignId('course_id')->constrained('omr_courses')->onDelete('cascade');
            $table->decimal('coefficient', 8, 3)->default(1);
            $table->unsignedSmallInteger('question_count')->default(0);
            $table->unsignedTinyInteger('sort_order')->default(0);
            $table->timestamps();

            $table->unique(['exam_id', 'course_id'], 'omr_exam_course_unique');
            $table->index(['tenant_id', 'exam_id']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('omr_exam_courses');
    }
};
