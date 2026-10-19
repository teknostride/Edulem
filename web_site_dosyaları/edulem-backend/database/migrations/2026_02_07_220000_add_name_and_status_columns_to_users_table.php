<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     * first_name, last_name, phone, is_active - UserForm ve API store ile uyum için
     */
    public function up(): void
    {
        Schema::table('users', function (Blueprint $table) {
            if (!Schema::hasColumn('users', 'first_name')) {
                $table->string('first_name')->nullable()->after('tenant_id');
            }
            if (!Schema::hasColumn('users', 'last_name')) {
                $table->string('last_name')->nullable()->after('first_name');
            }
            if (!Schema::hasColumn('users', 'phone')) {
                $table->string('phone', 20)->nullable()->after('email');
            }
            if (!Schema::hasColumn('users', 'is_active')) {
                $table->boolean('is_active')->default(true)->after('role_id');
            }
        });

    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('users', function (Blueprint $table) {
            $cols = [];
            if (Schema::hasColumn('users', 'first_name')) $cols[] = 'first_name';
            if (Schema::hasColumn('users', 'last_name')) $cols[] = 'last_name';
            if (Schema::hasColumn('users', 'phone')) $cols[] = 'phone';
            if (Schema::hasColumn('users', 'is_active')) $cols[] = 'is_active';
            if (!empty($cols)) {
                $table->dropColumn($cols);
            }
        });
    }
};
