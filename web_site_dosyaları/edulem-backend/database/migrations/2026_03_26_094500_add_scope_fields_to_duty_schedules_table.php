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
        Schema::table('duty_schedules', function (Blueprint $table) {
            $table->foreignId('campus_id')->nullable()->after('user_id')->constrained('campuses')->nullOnDelete();
            $table->foreignId('education_level_id')->nullable()->after('campus_id')->constrained('education_levels')->nullOnDelete();

            $table->index(['tenant_id', 'campus_id', 'education_level_id', 'day_of_week'], 'duty_schedules_scope_day_idx');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('duty_schedules', function (Blueprint $table) {
            $table->dropIndex('duty_schedules_scope_day_idx');

            $table->dropConstrainedForeignId('education_level_id');
            $table->dropConstrainedForeignId('campus_id');
        });
    }
};
