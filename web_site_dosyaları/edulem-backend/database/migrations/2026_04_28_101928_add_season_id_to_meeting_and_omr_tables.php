<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        $tables = [
            'teacher_meetings',
            'omr_courses',
            'omr_exam_courses',
            'omr_results',
            'omr_templates',
            'measurement_trial_booklets',
            'measurement_trial_imports',
            'measurement_trial_results',
            'scholarship_exams',
            'scholarship_exam_applications',
        ];

        foreach ($tables as $tableName) {
            if (Schema::hasTable($tableName) && !Schema::hasColumn($tableName, 'season_id')) {
                Schema::table($tableName, function (Blueprint $table) {
                    $table->foreignId('season_id')->nullable()->after('tenant_id')->constrained()->onDelete('cascade');
                });
            }
        }
    }

    public function down(): void
    {
        $tables = [
            'teacher_meetings',
            'omr_courses',
            'omr_exam_courses',
            'omr_results',
            'omr_templates',
            'measurement_trial_booklets',
            'measurement_trial_imports',
            'measurement_trial_results',
            'scholarship_exams',
            'scholarship_exam_applications',
        ];

        foreach ($tables as $tableName) {
            if (Schema::hasTable($tableName) && Schema::hasColumn($tableName, 'season_id')) {
                Schema::table($tableName, function (Blueprint $table) {
                    $table->dropForeign(['season_id']);
                    $table->dropColumn('season_id');
                });
            }
        }
    }
};
