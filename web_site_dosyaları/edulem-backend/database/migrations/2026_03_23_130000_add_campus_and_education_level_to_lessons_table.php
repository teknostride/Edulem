<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('lessons', function (Blueprint $table) {
            if (!Schema::hasColumn('lessons', 'campus_id')) {
                $table->foreignId('campus_id')->nullable()->constrained('campuses')->nullOnDelete()->after('tenant_id');
                $table->index('campus_id');
            }
            if (!Schema::hasColumn('lessons', 'education_level_id')) {
                $table->foreignId('education_level_id')->nullable()->constrained('education_levels')->nullOnDelete()->after('campus_id');
                $table->index('education_level_id');
            }
        });
    }

    public function down(): void
    {
        Schema::table('lessons', function (Blueprint $table) {
            if (Schema::hasColumn('lessons', 'education_level_id')) {
                $table->dropConstrainedForeignId('education_level_id');
            }
            if (Schema::hasColumn('lessons', 'campus_id')) {
                $table->dropConstrainedForeignId('campus_id');
            }
        });
    }
};
