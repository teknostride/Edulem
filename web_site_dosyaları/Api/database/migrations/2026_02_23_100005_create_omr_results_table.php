<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('omr_results', function (Blueprint $table) {
            $table->id();
            $table->foreignId('tenant_id')->constrained('tenants')->onDelete('cascade');
            $table->foreignId('exam_id')->constrained('omr_exams')->onDelete('cascade');
            $table->foreignId('student_id')->constrained('students')->onDelete('cascade');
            $table->string('student_no', 20)->nullable();   // OMR'dan okunan numara
            $table->string('booklet_type', 5)->default('A');
            $table->json('raw_answers')->nullable();        // {course_id: "ABCDE..."}
            $table->json('course_scores')->nullable();      // {course_id: {correct,wrong,blank,net,point}}
            $table->decimal('total_net', 8, 3)->default(0);
            $table->decimal('total_point', 8, 3)->default(0);
            $table->unsignedInteger('rank')->nullable();
            $table->foreignId('import_batch_id')->nullable(); // hangi yükleme işleminden
            $table->timestamp('calculated_at')->nullable();
            $table->timestamps();

            $table->index(['tenant_id', 'exam_id']);
            $table->index('student_id');
            $table->unique(['exam_id', 'student_id'], 'omr_result_student_unique');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('omr_results');
    }
};
