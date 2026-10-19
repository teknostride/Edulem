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
        Schema::table('students', function (Blueprint $table) {
            if (! Schema::hasColumn('students', 'classroom_id')) {
                return;
            }

            // Filtering / scoping
            $table->index(['tenant_id', 'classroom_id'], 'students_tenant_classroom_idx');
            $table->index(['tenant_id', 'is_active'], 'students_tenant_is_active_idx');
            $table->index('classroom_id', 'students_classroom_id_idx');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('students', function (Blueprint $table) {
            $table->dropIndex('students_tenant_classroom_idx');
            $table->dropIndex('students_tenant_is_active_idx');
            $table->dropIndex('students_classroom_id_idx');
        });
    }
};
