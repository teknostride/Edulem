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
        Schema::create('counseling_records', function (Blueprint $table) {
            $table->id();
            $table->foreignId('tenant_id')->constrained('tenants')->cascadeOnDelete();
            $table->foreignId('student_id')->constrained('students')->cascadeOnDelete();
            $table->foreignId('counselor_id')->constrained('users')->cascadeOnDelete();
            $table->string('subject');
            $table->dateTime('meeting_at');
            $table->text('content');
            $table->boolean('is_private')->default(true);
            $table->timestamps();

            $table->index(['tenant_id', 'meeting_at']);
            $table->index(['tenant_id', 'student_id']);
            $table->index(['tenant_id', 'counselor_id']);
            $table->index(['tenant_id', 'is_private']);
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('counseling_records');
    }
};
