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
        Schema::create('homework_submissions', function (Blueprint $table) {
            $table->id();
            $table->foreignId('tenant_id')->constrained('tenants')->onDelete('cascade');
            $table->foreignId('homework_id')->constrained('homeworks')->onDelete('cascade');
            $table->foreignId('student_id')->constrained('students')->onDelete('cascade');
            $table->json('answers')->nullable();
            $table->foreignId('file_id')->nullable()->constrained('files')->onDelete('set null');
            $table->unsignedBigInteger('project_topic_id')->nullable();
            $table->decimal('score', 5, 2)->nullable();
            $table->text('teacher_notes')->nullable();
            $table->string('status', 20)->default('pending'); // pending, submitted, graded
            $table->timestamp('submitted_at')->nullable();
            $table->timestamp('graded_at')->nullable();
            $table->timestamps();

            $table->index('tenant_id');
            $table->index('homework_id');
            $table->index('student_id');
            $table->index('status');
            $table->unique(['homework_id', 'student_id']);
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('homework_submissions');
    }
};
