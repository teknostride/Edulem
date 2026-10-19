<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('meal_menus', function (Blueprint $table) {
            $table->id();
            $table->unsignedBigInteger('tenant_id');
            $table->date('menu_date');
            $table->string('meal_type');
            $table->json('meals');
            $table->json('target_student_ids')->nullable();
            $table->unsignedBigInteger('classroom_id')->nullable();
            $table->text('notes')->nullable();
            $table->boolean('is_published')->default(true);
            $table->unsignedBigInteger('created_by')->nullable();
            $table->timestamps();

            $table->foreign('tenant_id')->references('id')->on('tenants')->onDelete('cascade');
            $table->foreign('classroom_id')->references('id')->on('classrooms')->nullOnDelete();
            $table->foreign('created_by')->references('id')->on('users')->nullOnDelete();

            $table->index(['tenant_id', 'menu_date'], 'mm_tenant_date_idx');
            $table->index(['tenant_id', 'menu_date', 'meal_type', 'classroom_id'], 'mm_tenant_date_type_cls_idx');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('meal_menus');
    }
};
