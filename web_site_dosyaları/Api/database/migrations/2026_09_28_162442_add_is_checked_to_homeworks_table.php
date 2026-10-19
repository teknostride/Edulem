<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        if (!Schema::hasColumn('homeworks', 'is_checked')) {
            Schema::table('homeworks', function (Blueprint $table) {
                $table->boolean('is_checked')->default(false)->after('is_active')->comment('Öğretmen tarafından kontrol edildi mi?');
            });
        }
    }

    public function down(): void
    {
        if (Schema::hasColumn('homeworks', 'is_checked')) {
            Schema::table('homeworks', function (Blueprint $table) {
                $table->dropColumn('is_checked');
            });
        }
    }
};
