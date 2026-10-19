<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        // Birden fazla sınavı birleştiren oturum (LGS Sözel + Sayısal, TYT + AYT)
        Schema::create('omr_sessions', function (Blueprint $table) {
            $table->id();
            $table->foreignId('tenant_id')->constrained('tenants')->onDelete('cascade');
            $table->string('name');                         // "LGS 2025 Türkiye Geneli"
            $table->string('exam_type', 30);                // LGS | YKS
            $table->date('exam_date')->nullable();
            $table->json('exam_ids');                       // [1, 2] birleştirilen sınav id'leri
            $table->json('combined_results')->nullable();   // hesaplanmış birleşik sonuçlar
            $table->timestamp('calculated_at')->nullable();
            $table->foreignId('created_by')->nullable()->constrained('users')->onDelete('set null');
            $table->timestamps();

            $table->index('tenant_id');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('omr_sessions');
    }
};
