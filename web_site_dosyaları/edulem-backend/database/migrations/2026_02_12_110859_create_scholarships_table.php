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
        Schema::create('scholarships', function (Blueprint $table) {
            $table->id();
            $table->foreignId('tenant_id')->constrained()->onDelete('cascade');
            $table->foreignId('student_id')->nullable()->constrained()->onDelete('cascade');
            $table->string('tc_kimlik', 11)->comment('Öğrenci T.C. Kimlik No');
            $table->string('ad_soyad')->comment('Öğrenci Adı Soyadı');
            $table->string('okul_adi')->comment('Öğrencinin Okulu');
            $table->foreignId('classroom_id')->nullable()->constrained()->onDelete('set null');
            $table->string('sinif_adi', 100)->nullable()->comment('Sınıf Adı (opsiyonel)');
            $table->string('veli_ad_soyad')->comment('Veli Adı Soyadı');
            $table->date('dogum_tarihi')->nullable()->comment('Öğrenci Doğum Tarihi');
            $table->string('veli_iletisim', 20)->comment('Veli İletişim Numarası');
            $table->enum('durum', ['aktif', 'pasif'])->default('aktif');
            $table->timestamps();
            $table->softDeletes();

            // Index'ler
            $table->index('tenant_id');
            $table->index('classroom_id');
            $table->index('tc_kimlik');
            $table->index('durum');
            $table->index(['tenant_id', 'tc_kimlik']);
            $table->index(['tenant_id', 'durum']);
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('scholarships');
    }
};
