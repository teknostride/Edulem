<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('omr_exams', function (Blueprint $table) {
            $table->json('share_roles')->nullable()->after('status');
        });
    }

    public function down(): void
    {
        Schema::table('omr_exams', function (Blueprint $table) {
            $table->dropColumn('share_roles');
        });
    }
};
