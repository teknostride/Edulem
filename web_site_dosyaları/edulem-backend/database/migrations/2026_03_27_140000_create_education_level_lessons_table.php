<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        if (Schema::hasTable('education_level_lessons')) {
            return;
        }

        Schema::create('education_level_lessons', function (Blueprint $table) {
            $table->id();
            $table->foreignId('lesson_id')->constrained('lessons')->cascadeOnDelete();
            $table->foreignId('education_level_id')->constrained('education_levels')->cascadeOnDelete();
            $table->timestamps();

            $table->unique(['lesson_id', 'education_level_id']);
            $table->index(['education_level_id', 'lesson_id']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('education_level_lessons');
    }
};
