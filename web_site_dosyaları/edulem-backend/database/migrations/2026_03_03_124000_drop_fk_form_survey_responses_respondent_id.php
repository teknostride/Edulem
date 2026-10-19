<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('form_survey_responses', function (Blueprint $table) {
            if (Schema::hasColumn('form_survey_responses', 'respondent_id')) {
                try {
                    $table->dropForeign(['respondent_id']);
                } catch (\Throwable $e) {
                    // ignore
                }
            }
        });

        Schema::table('form_survey_responses', function (Blueprint $table) {
            $table->unsignedBigInteger('respondent_id')->nullable()->change();
        });
    }

    public function down(): void
    {
        Schema::table('form_survey_responses', function (Blueprint $table) {
            // Geri dönüşte FK'yi tekrar eklemiyoruz.
        });
    }
};
