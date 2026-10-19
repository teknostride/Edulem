<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     * Ders saatleri kademeye göre ayrılır; farklı kademeler farklı çalışma saatleri kullanabilir.
     */
    public function up(): void
    {
        Schema::table('time_slots', function (Blueprint $table) {
            $table->unsignedBigInteger('tenant_id')->nullable()->after('id');
            $table->unsignedBigInteger('education_level_id')->nullable()->after('tenant_id');

            $table->foreign('tenant_id')->references('id')->on('tenants')->nullOnDelete();
            $table->foreign('education_level_id')->references('id')->on('education_levels')->cascadeOnDelete();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('time_slots', function (Blueprint $table) {
            $table->dropForeign(['tenant_id']);
            $table->dropForeign(['education_level_id']);
        });
    }
};
