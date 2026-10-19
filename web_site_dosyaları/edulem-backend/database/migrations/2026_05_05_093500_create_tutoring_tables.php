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
         if (!Schema::hasTable('tutoring_sessions')) {
             Schema::create('tutoring_sessions', function (Blueprint $table) {
                 $table->id();
                 $table->unsignedBigInteger('tenant_id');
                 $table->unsignedBigInteger('season_id')->nullable();
                 $table->unsignedBigInteger('teacher_id');
                 $table->unsignedBigInteger('lesson_id')->nullable();
                 $table->string('type'); 
                 $table->string('title');
                 $table->date('date');
                 $table->time('start_time');
                 $table->time('end_time');
                 $table->integer('duration');
                 $table->string('room')->nullable();
                 $table->string('remote_link', 500)->nullable();
                 $table->integer('max_students')->nullable();
                 $table->integer('weekly_max_count')->nullable();
                 $table->unsignedBigInteger('homework_id')->nullable();
                 $table->text('notes')->nullable();
                 $table->boolean('is_active')->default(true);
                 $table->unsignedBigInteger('created_by');
                 $table->timestamps();
 
                 $table->foreign('tenant_id')->references('id')->on('tenants')->onDelete('cascade');
                 $table->foreign('season_id')->references('id')->on('seasons')->onDelete('cascade');
                 $table->foreign('teacher_id')->references('id')->on('users')->onDelete('cascade');
                 $table->foreign('lesson_id')->references('id')->on('lessons')->onDelete('set null');
                 $table->foreign('homework_id')->references('id')->on('homeworks')->onDelete('set null');
                 $table->foreign('created_by')->references('id')->on('users')->onDelete('cascade');
 
                 $table->index(['tenant_id', 'season_id']);
                 $table->index(['teacher_id', 'date']);
             });
         }
 
         if (!Schema::hasTable('tutoring_session_students')) {
             Schema::create('tutoring_session_students', function (Blueprint $table) {
                 $table->unsignedBigInteger('tutoring_session_id');
                 $table->unsignedBigInteger('student_id');
                 $table->timestamps();
 
                 $table->foreign('tutoring_session_id')->references('id')->on('tutoring_sessions')->onDelete('cascade');
                 $table->foreign('student_id')->references('id')->on('students')->onDelete('cascade');
 
                 $table->primary(['tutoring_session_id', 'student_id'], 'tut_sess_std_primary');
             });
         }
 
         if (!Schema::hasTable('tutoring_session_attendances')) {
             Schema::create('tutoring_session_attendances', function (Blueprint $table) {
                 $table->id();
                 $table->unsignedBigInteger('tenant_id');
                 $table->unsignedBigInteger('season_id')->nullable();
                 $table->unsignedBigInteger('tutoring_session_id');
                 $table->unsignedBigInteger('student_id');
                 $table->string('status'); 
                 $table->text('notes')->nullable();
                 $table->unsignedBigInteger('created_by');
                 $table->timestamps();
 
                 $table->foreign('tenant_id')->references('id')->on('tenants')->onDelete('cascade');
                 $table->foreign('season_id')->references('id')->on('seasons')->onDelete('cascade');
                 $table->foreign('tutoring_session_id')->references('id')->on('tutoring_sessions')->onDelete('cascade');
                 $table->foreign('student_id')->references('id')->on('students')->onDelete('cascade');
                 $table->foreign('created_by')->references('id')->on('users')->onDelete('cascade');
 
                 $table->index(['tenant_id', 'season_id']);
                 $table->index(['tutoring_session_id', 'student_id'], 'tut_attn_lookup');
             });
         }
     }
 
     /**
      * Reverse the migrations.
      */
     public function down(): void
     {
         Schema::dropIfExists('tutoring_session_attendances');
         Schema::dropIfExists('tutoring_session_students');
         Schema::dropIfExists('tutoring_sessions');
     }
 };
