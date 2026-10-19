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
        Schema::table('users', function (Blueprint $table) {
            // Çoklu kampüs ve kademe seçimi için JSON alanlar
            $table->json('campus_ids')->nullable()->comment('Seçili kampüs IDleri');
            $table->json('education_level_ids')->nullable()->comment('Seçili eğitim kademe IDleri');
            
            // Ders atamaları için JSON alan
            $table->json('subjects')->nullable()->comment('Verdiği dersler');
            
            // Öğretmen/Müdür/Genel Müdür için ek alanlar
            $table->string('teacher_type')->nullable()->comment('Öğretmen/Müdür türü');
            $table->string('department')->nullable()->comment('Bölüm');
            
            // İndeksler
            $table->index('teacher_type');
            $table->index('department');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('users', function (Blueprint $table) {
            $table->dropIndex(['teacher_type']);
            $table->dropIndex(['department']);
            $table->dropColumn(['campus_ids', 'education_level_ids', 'subjects', 'teacher_type', 'department']);
        });
    }
};
