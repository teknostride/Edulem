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
        Schema::create('guardian_student', function (Blueprint $table) {
            $table->id();
            $table->foreignId('student_id')->constrained('students')->onDelete('cascade');
            $table->foreignUuid('guardian_id')->constrained('guardians')->onDelete('cascade');
            $table->string('relation_type'); // anne, baba, vasi, vb.
            $table->boolean('is_legal_guardian')->default(false);
            $table->timestamps();

            $table->index('student_id');
            $table->index('guardian_id');
            $table->index('relation_type');
            $table->index('is_legal_guardian');
            $table->unique(['student_id', 'guardian_id']);
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('guardian_student');
    }
};
