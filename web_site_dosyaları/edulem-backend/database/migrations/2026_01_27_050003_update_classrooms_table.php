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
        Schema::table('classrooms', function (Blueprint $table) {
            // Eğer column'lar yoksa ekle
            if (!Schema::hasColumn('classrooms', 'campus_id')) {
                $table->foreignId('campus_id')->nullable()->after('id')->constrained()->onDelete('cascade');
            }
            if (!Schema::hasColumn('classrooms', 'education_level_id')) {
                $table->foreignId('education_level_id')->nullable()->after('campus_id')->constrained()->onDelete('set null');
            }
            if (!Schema::hasColumn('classrooms', 'branch_id')) {
                $table->foreignId('branch_id')->nullable()->after('education_level_id')->constrained()->onDelete('set null');
            }
            
            // Index'ler
            $table->index(['campus_id', 'is_active']);
            $table->index(['education_level_id', 'is_active']);
            $table->index(['branch_id', 'is_active']);
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('classrooms', function (Blueprint $table) {
            if (Schema::hasColumn('classrooms', 'branch_id')) {
                $table->dropForeign(['branch_id']);
                $table->dropColumn('branch_id');
            }
            if (Schema::hasColumn('classrooms', 'education_level_id')) {
                $table->dropForeign(['education_level_id']);
                $table->dropColumn('education_level_id');
            }
            if (Schema::hasColumn('classrooms', 'campus_id')) {
                $table->dropForeign(['campus_id']);
                $table->dropColumn('campus_id');
            }
        });
    }
};
