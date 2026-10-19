<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('teacher_meetings', function (Blueprint $table) {
            $table->id();
            $table->foreignId('tenant_id')->constrained('tenants')->onDelete('cascade');
            $table->foreignId('teacher_id')->constrained('users')->onDelete('cascade');
            $table->foreignId('student_id')->nullable()->constrained('students')->onDelete('set null');
            $table->string('type')->default('meeting'); // meeting | appointment
            $table->string('title');
            $table->text('content')->nullable();
            $table->date('meeting_date')->nullable();
            $table->time('meeting_time')->nullable();
            $table->string('visibility')->default('admin_only');
            // visibility: admin_only | teachers_open | public | private
            $table->string('status')->default('planned'); // planned | completed | cancelled
            $table->timestamps();

            $table->index('tenant_id');
            $table->index('teacher_id');
            $table->index('student_id');
            $table->index(['tenant_id', 'type']);
            $table->index(['tenant_id', 'teacher_id', 'type']);
            $table->index(['tenant_id', 'teacher_id', 'meeting_date']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('teacher_meetings');
    }
};
