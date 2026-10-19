<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('omr_exams', function (Blueprint $table) {
            $table->id();
            $table->foreignId('tenant_id')->constrained('tenants')->onDelete('cascade');
            $table->string('name');
            $table->string('exam_type', 30);                // LGS | YKS-TYT | YKS-AYT | YKS-DIL | Bursluluk
            $table->string('session', 30)->nullable();      // Sözel | Sayısal | TYT | AYT | DİL
            $table->string('level', 20)->nullable();        // 8.SINIF | YKS
            $table->date('exam_date')->nullable();
            $table->unsignedSmallInteger('duration')->nullable(); // dakika
            $table->string('season', 20)->nullable();       // 2024-2025
            $table->string('test_code', 50)->nullable();
            // Net hesaplama: kaç yanlış 1 doğruyu götürür (null = götürmez)
            $table->decimal('wrong_penalty', 4, 2)->nullable(); // LGS=3, YKS=4
            $table->foreignId('omr_template_id')->nullable()->constrained('omr_templates')->onDelete('set null');
            $table->enum('status', ['draft', 'active', 'archived'])->default('draft');
            $table->foreignId('created_by')->nullable()->constrained('users')->onDelete('set null');
            $table->timestamps();

            $table->index(['tenant_id', 'exam_type']);
            $table->index('exam_date');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('omr_exams');
    }
};
