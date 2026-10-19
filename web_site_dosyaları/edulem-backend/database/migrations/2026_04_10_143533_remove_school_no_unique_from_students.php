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
            // Mevcut aktiflik bazlı benzersiz indexi kaldır
            // students_tenant_level_school_no_active_unique
            try {
                $table->dropUnique('students_tenant_level_school_no_active_unique');
            } catch (\Exception $e) {
                // Eğer daha önce manuel silindiyse veya hata verirse pas geç
            }
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('students', function (Blueprint $table) {
            $table->unique(['tenant_id', 'education_level_id', 'school_no', 'is_active'], 'students_tenant_level_school_no_active_unique');
        });
    }
};
