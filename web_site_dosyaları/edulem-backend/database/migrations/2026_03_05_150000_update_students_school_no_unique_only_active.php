<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('students', function (Blueprint $table) {
            // Drop old unique: tenant + education_level + school_no
            $table->dropUnique('students_tenant_level_school_no_unique');

            // New unique: only for active rows (is_active included)
            $table->unique(['tenant_id', 'education_level_id', 'school_no', 'is_active'], 'students_tenant_level_school_no_active_unique');
        });
    }

    public function down(): void
    {
        Schema::table('students', function (Blueprint $table) {
            $table->dropUnique('students_tenant_level_school_no_active_unique');
            $table->unique(['tenant_id', 'education_level_id', 'school_no'], 'students_tenant_level_school_no_unique');
        });
    }
};
