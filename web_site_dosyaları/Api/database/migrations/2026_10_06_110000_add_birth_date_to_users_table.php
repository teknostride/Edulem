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
            if (!Schema::hasColumn('users', 'birth_date')) {
                $table->date('birth_date')->nullable()->after('avatar');
            }
            if (!Schema::hasColumn('users', 'wedding_anniversary_date')) {
                $table->date('wedding_anniversary_date')->nullable()->after('birth_date');
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
            if (Schema::hasColumn('users', 'birth_date')) $cols[] = 'birth_date';
            if (Schema::hasColumn('users', 'wedding_anniversary_date')) $cols[] = 'wedding_anniversary_date';
            if (!empty($cols)) {
                $table->dropColumn($cols);
            }
        });
    }
};
