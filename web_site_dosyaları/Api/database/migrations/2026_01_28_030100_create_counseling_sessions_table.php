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
        Schema::create('counseling_sessions', function (Blueprint $table) {
            $table->id();
            $table->foreignId('counseling_student_id')->constrained('counseling_students')->onDelete('cascade');
            $table->foreignId('counselor_id')->constrained('users')->onDelete('cascade');
            $table->date('session_date');
            $table->time('session_time');
            $table->integer('duration_minutes'); // Session duration in minutes
            $table->enum('type', ['individual', 'group', 'parent', 'emergency'])->default('individual');
            $table->enum('status', ['scheduled', 'completed', 'cancelled', 'no_show'])->default('scheduled');
            $table->text('notes')->nullable();
            $table->text('counselor_notes')->nullable();
            $table->text('student_feedback')->nullable();
            $table->decimal('fee', 8, 2)->nullable(); // Session fee if applicable
            $table->boolean('is_paid')->default(false);
            $table->string('location')->nullable(); // Physical location or online link
            $table->timestamps();

            // Indexes
            $table->index(['counselor_id']);
            $table->index(['session_date']);
            $table->index(['status']);
            $table->index(['type']);
            $table->index(['counseling_student_id', 'session_date']);
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('counseling_sessions');
    }
};
