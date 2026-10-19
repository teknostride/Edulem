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
            if (!Schema::hasColumn('students', 'password')) {
                $table->string('password')->nullable()->after('email');
            }
            if (!Schema::hasColumn('students', 'is_portal_active')) {
                $table->boolean('is_portal_active')->default(true)->after('is_active');
            }
            if (!Schema::hasColumn('students', 'last_login_at')) {
                $table->timestamp('last_login_at')->nullable()->after('is_portal_active');
            }
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('students', function (Blueprint $table) {
            if (Schema::hasColumn('students', 'password')) {
                $table->dropColumn('password');
            }
            if (Schema::hasColumn('students', 'is_portal_active')) {
                $table->dropColumn('is_portal_active');
            }
            if (Schema::hasColumn('students', 'last_login_at')) {
                $table->dropColumn('last_login_at');
            }
        });
    }
};
