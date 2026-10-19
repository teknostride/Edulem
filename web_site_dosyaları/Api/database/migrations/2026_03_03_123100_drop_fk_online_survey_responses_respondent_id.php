<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('online_survey_responses', function (Blueprint $table) {
            // FK ismi ortamdan ortama değişebileceği için önce var mı kontrol edip düşür.
            // Laravel default: online_survey_responses_respondent_id_foreign
            if (Schema::hasColumn('online_survey_responses', 'respondent_id')) {
                try {
                    $table->dropForeign(['respondent_id']);
                } catch (\Throwable $e) {
                    // ignore
                }
            }
        });

        Schema::table('online_survey_responses', function (Blueprint $table) {
            // respondent_id artık users tablosuna FK olmayacak (student id vb. gelebiliyor)
            $table->unsignedBigInteger('respondent_id')->nullable()->change();
        });
    }

    public function down(): void
    {
        Schema::table('online_survey_responses', function (Blueprint $table) {
            // Geri dönüşte FK'yi tekrar eklemiyoruz; çünkü mevcut veriler student id içeriyor olabilir.
        });
    }
};
