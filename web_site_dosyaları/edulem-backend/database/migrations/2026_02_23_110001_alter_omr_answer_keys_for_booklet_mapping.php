<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('omr_answer_keys', function (Blueprint $table) {
            $table->unsignedSmallInteger('booklet_a_qno')->nullable()->after('course_id');
            $table->unsignedSmallInteger('booklet_b_qno')->nullable()->after('booklet_a_qno');
            $table->unsignedSmallInteger('booklet_c_qno')->nullable()->after('booklet_b_qno');
            $table->unsignedSmallInteger('booklet_d_qno')->nullable()->after('booklet_c_qno');

            $table->index(['exam_id', 'course_id', 'booklet_a_qno'], 'omr_ak_exam_course_aqno_idx');
        });
    }

    public function down(): void
    {
        Schema::table('omr_answer_keys', function (Blueprint $table) {
            $table->dropIndex('omr_ak_exam_course_aqno_idx');
            $table->dropColumn(['booklet_a_qno', 'booklet_b_qno', 'booklet_c_qno', 'booklet_d_qno']);
        });
    }
};
