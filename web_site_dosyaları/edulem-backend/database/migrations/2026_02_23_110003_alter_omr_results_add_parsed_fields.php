<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('omr_results', function (Blueprint $table) {
            $table->json('parsed_fields')->nullable()->after('raw_answers');
        });
    }

    public function down(): void
    {
        Schema::table('omr_results', function (Blueprint $table) {
            $table->dropColumn('parsed_fields');
        });
    }
};
