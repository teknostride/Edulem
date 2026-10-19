<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('omr_answer_keys', function (Blueprint $table) {
            $table->id();
            $table->foreignId('exam_id')->constrained('omr_exams')->onDelete('cascade');
            $table->foreignId('course_id')->constrained('omr_courses')->onDelete('cascade');
            $table->string('booklet_type', 5)->default('A'); // A | B
            $table->unsignedSmallInteger('question_no');
            $table->string('correct_answer', 5);             // A | B | C | D | E
            $table->foreignId('topic_id')->nullable()->constrained('omr_topics')->onDelete('set null');
            $table->timestamps();

            $table->index(['exam_id', 'booklet_type', 'course_id']);
            $table->unique(['exam_id', 'course_id', 'booklet_type', 'question_no'], 'omr_ak_unique');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('omr_answer_keys');
    }
};
