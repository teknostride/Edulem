<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('lessons', function (Blueprint $table) {
            if (!Schema::hasColumn('lessons', 'color')) {
                $table->string('color', 20)->nullable()->default('#3b6cff')->after('description');
            }
            if (!Schema::hasColumn('lessons', 'is_active')) {
                $table->boolean('is_active')->default(true)->after('color');
            }
        });
    }

    public function down(): void
    {
        Schema::table('lessons', function (Blueprint $table) {
            $table->dropColumn(['color', 'is_active']);
        });
    }
};
