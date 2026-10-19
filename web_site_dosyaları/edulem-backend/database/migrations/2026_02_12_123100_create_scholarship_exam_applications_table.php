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
        Schema::create('scholarship_exam_applications', function (Blueprint $table) {
            $table->id();
            $table->unsignedBigInteger('tenant_id')->index();
            $table->unsignedBigInteger('scholarship_exam_id')->index();

            $table->unsignedBigInteger('student_id')->nullable()->index();
            $table->unsignedBigInteger('lead_id')->nullable()->index();

            $table->string('application_number', 32)->unique();

            $table->string('name');
            $table->string('phone', 20);
            $table->string('email')->nullable();
            $table->date('birth_date')->nullable();
            $table->string('tc_identity_number', 11)->nullable();
            $table->string('school_name')->nullable();
            $table->string('grade_level', 50)->nullable();

            $table->unsignedBigInteger('branch_id')->nullable()->index();

            $table->string('session_id')->nullable();
            $table->string('session_time', 5)->nullable();

            $table->unsignedBigInteger('classroom_id')->nullable()->index();
            $table->unsignedInteger('seat_number')->nullable();
            $table->string('optical_form_code')->nullable();

            $table->string('security_code', 50)->nullable();

            $table->json('additional_data')->nullable();

            $table->string('status')->default('pending');
            $table->text('notes')->nullable();

            $table->unsignedBigInteger('processed_by')->nullable()->index();
            $table->dateTime('processed_at')->nullable();

            $table->timestamps();

            $table->foreign('tenant_id')->references('id')->on('tenants')->cascadeOnDelete();
            $table->foreign('scholarship_exam_id')->references('id')->on('scholarship_exams')->cascadeOnDelete();

            $table->foreign('student_id')->references('id')->on('students')->nullOnDelete();
            $table->foreign('lead_id')->references('id')->on('leads')->nullOnDelete();

            $table->foreign('branch_id')->references('id')->on('classrooms')->nullOnDelete();
            $table->foreign('classroom_id')->references('id')->on('classrooms')->nullOnDelete();

            $table->foreign('processed_by')->references('id')->on('users')->nullOnDelete();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('scholarship_exam_applications');
    }
};
