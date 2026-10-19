<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;
use Illuminate\Database\Schema\Blueprint;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        Schema::table('schedules', function (Blueprint $table) {
            $table->dropForeign(['teacher_id']);
        });

        // Make teacher_id nullable
        DB::statement('ALTER TABLE schedules MODIFY teacher_id BIGINT UNSIGNED NULL');

        Schema::table('schedules', function (Blueprint $table) {
            $table->foreign('teacher_id')->references('id')->on('users')->nullOnDelete();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('schedules', function (Blueprint $table) {
            $table->dropForeign(['teacher_id']);
        });

        // Restore NOT NULL
        DB::statement('ALTER TABLE schedules MODIFY teacher_id BIGINT UNSIGNED NOT NULL');

        Schema::table('schedules', function (Blueprint $table) {
            $table->foreign('teacher_id')->references('id')->on('users')->onDelete('cascade');
        });
    }
};
