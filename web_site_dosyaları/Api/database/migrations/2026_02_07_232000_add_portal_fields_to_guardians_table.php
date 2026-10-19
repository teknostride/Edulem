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
        Schema::table('guardians', function (Blueprint $table) {
            $table->string('password')->nullable()->after('job');
            $table->boolean('is_portal_active')->default(true)->after('password');
            $table->timestamp('last_login_at')->nullable()->after('is_portal_active');
            $table->timestamp('email_verified_at')->nullable()->after('last_login_at');
            $table->date('birth_date')->nullable()->after('email_verified_at');
            $table->date('wedding_anniversary_date')->nullable()->after('birth_date');
            $table->string('portal_token')->nullable()->after('wedding_anniversary_date');
            $table->timestamp('portal_token_expires_at')->nullable()->after('portal_token');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('guardians', function (Blueprint $table) {
            $table->dropColumn([
                'password',
                'is_portal_active',
                'last_login_at',
                'email_verified_at',
                'birth_date',
                'wedding_anniversary_date',
                'portal_token',
                'portal_token_expires_at',
            ]);
        });
    }
};
