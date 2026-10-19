<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        if (Schema::hasTable('omr_exams') && !Schema::hasColumn('omr_exams', 'season_id')) {
            Schema::table('omr_exams', function (Blueprint $table) {
                $table->foreignId('season_id')->nullable()->after('tenant_id')->constrained('seasons')->onDelete('cascade');
            });
        }
    }

    public function down(): void
    {
        if (Schema::hasTable('omr_exams') && Schema::hasColumn('omr_exams', 'season_id')) {
            Schema::table('omr_exams', function (Blueprint $table) {
                $table->dropForeign(['season_id']);
                $table->dropColumn('season_id');
            });
        }
    }
};
