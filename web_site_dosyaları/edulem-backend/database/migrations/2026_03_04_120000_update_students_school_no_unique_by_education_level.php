<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('students', function (Blueprint $table) {
            if (! Schema::hasColumn('students', 'education_level_id')) {
                $table->unsignedBigInteger('education_level_id')->nullable()->after('classroom_id');
                $table->index(['tenant_id', 'education_level_id'], 'students_tenant_education_level_idx');
            }
        });

        // Backfill education_level_id from classroom.grade_level when available
        DB::statement('UPDATE students s JOIN classrooms c ON c.id = s.classroom_id SET s.education_level_id = c.grade_level WHERE s.classroom_id IS NOT NULL AND s.education_level_id IS NULL');

        Schema::table('students', function (Blueprint $table) {
            // Drop old unique index (created by Laravel convention)
            if (Schema::hasColumn('students', 'school_no')) {
                $table->dropUnique('students_tenant_id_school_no_unique');
            }

            // New unique: tenant + education_level + school_no
            $table->unique(['tenant_id', 'education_level_id', 'school_no'], 'students_tenant_level_school_no_unique');
        });
    }

    public function down(): void
    {
        Schema::table('students', function (Blueprint $table) {
            $table->dropUnique('students_tenant_level_school_no_unique');
            $table->unique(['tenant_id', 'school_no'], 'students_tenant_id_school_no_unique');

            if (Schema::hasColumn('students', 'education_level_id')) {
                $table->dropIndex('students_tenant_education_level_idx');
                $table->dropColumn('education_level_id');
            }
        });
    }
};
