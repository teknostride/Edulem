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
        Schema::table('users', function (Blueprint $table) {
            $table->index(['tenant_id', 'role_id', 'is_active'], 'users_tenant_role_active_idx');
            $table->index(['tenant_id', 'created_at'], 'users_tenant_created_idx');
            $table->index(['tenant_id', 'first_name', 'last_name'], 'users_tenant_name_idx');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('users', function (Blueprint $table) {
            $table->dropIndex('users_tenant_role_active_idx');
            $table->dropIndex('users_tenant_created_idx');
            $table->dropIndex('users_tenant_name_idx');
        });
    }
};
