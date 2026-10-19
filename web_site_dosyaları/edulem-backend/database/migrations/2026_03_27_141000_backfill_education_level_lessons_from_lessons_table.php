<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        if (!Schema::hasTable('education_level_lessons')) {
            return;
        }

        if (!Schema::hasTable('lessons')) {
            return;
        }

        if (!Schema::hasColumn('lessons', 'education_level_id')) {
            return;
        }

        // Backfill: ensure each lesson's primary education_level_id exists in pivot.
        // This helps legacy lessons appear in level-scoped dropdowns even if they were created before pivot existed.
        DB::statement(
            "INSERT IGNORE INTO education_level_lessons (lesson_id, education_level_id, created_at, updated_at)
             SELECT id as lesson_id, education_level_id, NOW(), NOW()
             FROM lessons
             WHERE education_level_id IS NOT NULL"
        );
    }

    public function down(): void
    {
        // no-op
    }
};
