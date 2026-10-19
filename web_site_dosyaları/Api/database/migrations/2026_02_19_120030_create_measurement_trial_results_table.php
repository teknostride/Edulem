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
        Schema::create('measurement_trial_results', function (Blueprint $table) {
            $table->id();
            $table->foreignId('tenant_id')->constrained('tenants')->onDelete('cascade');
            $table->foreignId('trial_id')->constrained('measurement_trials')->onDelete('cascade');
            $table->foreignId('student_id')->constrained('students')->onDelete('cascade');
            $table->foreignId('booklet_id')->nullable()->constrained('measurement_trial_booklets')->onDelete('set null');
            $table->unsignedInteger('correct')->default(0);
            $table->unsignedInteger('wrong')->default(0);
            $table->unsignedInteger('blank')->default(0);
            $table->decimal('net', 6, 2)->default(0);
            $table->json('raw_answers')->nullable();
            $table->timestamp('calculated_at')->nullable();
            $table->timestamps();

            $table->index('tenant_id');
            $table->index('trial_id');
            $table->index('student_id');
            $table->unique(['trial_id', 'student_id'], 'measurement_trial_student_unique');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('measurement_trial_results');
    }
};
