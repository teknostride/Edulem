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
        Schema::table('online_survey_responses', function (Blueprint $table) {
            $table->unsignedBigInteger('respondent_education_level_id')->nullable()->after('respondent_type');
            $table->index('respondent_education_level_id');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('online_survey_responses', function (Blueprint $table) {
            $table->dropIndex(['respondent_education_level_id']);
            $table->dropColumn('respondent_education_level_id');
        });
    }
};
