<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('omr_templates', function (Blueprint $table) {
            $table->id();
            $table->foreignId('tenant_id')->constrained('tenants')->onDelete('cascade');
            $table->string('name');                         // "LGS 8.Sınıf Şablonu"
            $table->string('exam_type', 30);                // LGS | YKS-TYT | YKS-AYT | YKS-DIL | Bursluluk
            // Sabit genişlikli txt dosyasından alan çıkarma kuralları
            // student_no: {start, length}
            // booklet_type: {start, length}
            // courses: [{course_id, start, length}]
            $table->json('field_rules');
            $table->text('notes')->nullable();
            $table->boolean('is_active')->default(true);
            $table->foreignId('created_by')->nullable()->constrained('users')->onDelete('set null');
            $table->timestamps();

            $table->index('tenant_id');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('omr_templates');
    }
};
