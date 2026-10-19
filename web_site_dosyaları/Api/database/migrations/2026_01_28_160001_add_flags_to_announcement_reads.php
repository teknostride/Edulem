<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('announcement_reads', function (Blueprint $table) {
            $table->boolean('is_starred')->default(false)->after('read_at');
            $table->boolean('is_important')->default(false)->after('is_starred');
        });
    }

    public function down(): void
    {
        Schema::table('announcement_reads', function (Blueprint $table) {
            $table->dropColumn(['is_starred', 'is_important']);
        });
    }
};
