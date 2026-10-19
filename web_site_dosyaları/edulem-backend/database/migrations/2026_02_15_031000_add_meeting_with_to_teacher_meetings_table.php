<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('teacher_meetings', function (Blueprint $table) {
            if (! Schema::hasColumn('teacher_meetings', 'meeting_with')) {
                $table->string('meeting_with')->default('student')->after('student_id');
                $table->index(['tenant_id', 'teacher_id', 'meeting_with']);
            }
        });
    }

    public function down(): void
    {
        Schema::table('teacher_meetings', function (Blueprint $table) {
            if (Schema::hasColumn('teacher_meetings', 'meeting_with')) {
                $table->dropColumn('meeting_with');
            }
        });
    }
};
