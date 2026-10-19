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
        Schema::create('scholarship_exams', function (Blueprint $table) {
            $table->id();
            $table->unsignedBigInteger('tenant_id')->index();

            $table->string('title');
            $table->text('description')->nullable();

            $table->date('exam_date');
            $table->string('exam_time', 5);
            $table->unsignedInteger('duration_minutes');

            $table->json('sessions')->nullable();
            $table->json('required_fields')->nullable();
            $table->json('optional_fields')->nullable();

            $table->unsignedBigInteger('exam_specification_file_id')->nullable()->index();

            $table->decimal('scholarship_amount', 10, 2)->nullable();
            $table->decimal('registration_fee', 10, 2)->default(0);

            $table->boolean('auto_register_students')->default(false);
            $table->boolean('auto_register_to_leads')->default(true);
            $table->boolean('multi_branch_application')->default(false);
            $table->json('branch_ids')->nullable();

            $table->boolean('require_security_code')->default(true);
            $table->string('security_code', 50)->nullable();

            $table->boolean('show_results_online')->default(true);
            $table->dateTime('results_publish_date')->nullable();

            $table->string('status')->default('draft');
            $table->unsignedBigInteger('created_by')->nullable()->index();

            $table->timestamps();

            $table->foreign('tenant_id')->references('id')->on('tenants')->cascadeOnDelete();
            $table->foreign('created_by')->references('id')->on('users')->nullOnDelete();
            $table->foreign('exam_specification_file_id')->references('id')->on('files')->nullOnDelete();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('scholarship_exams');
    }
};
