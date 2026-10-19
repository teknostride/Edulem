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
        Schema::create('students', function (Blueprint $table) {
            $table->id();
            $table->foreignId('tenant_id')->constrained('tenants')->onDelete('cascade');
            $table->string('tc_no', 11)->nullable();
            $table->string('school_no')->nullable();
            $table->string('name');
            $table->foreignId('city_id')->nullable()->constrained('cities')->onDelete('set null');
            $table->foreignId('district_id')->nullable()->constrained('districts')->onDelete('set null');
            $table->foreignId('classroom_id')->nullable();
            $table->json('emergency_contact_info')->nullable();
            $table->timestamps();

            $table->index('tenant_id');
            $table->index('tc_no');
            $table->index('school_no');
            $table->index('city_id');
            $table->index('district_id');
            $table->unique(['tenant_id', 'school_no']);
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('students');
    }
};
