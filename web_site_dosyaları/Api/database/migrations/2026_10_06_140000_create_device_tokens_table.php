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
        if (!Schema::hasTable('device_tokens')) {
            Schema::create('device_tokens', function (Blueprint $table) {
                $table->id();
                $table->foreignId('tenant_id')->nullable()->constrained('tenants')->onDelete('cascade');
                $table->string('user_type')->default('user'); // 'user' (User) veya 'student' (Student/Guardian)
                $table->unsignedBigInteger('user_id');
                $table->string('token', 500);
                $table->string('platform', 20)->default('android'); // android, ios, web
                $table->string('device_name')->nullable();
                $table->timestamp('last_active_at')->nullable();
                $table->timestamps();

                $table->index(['tenant_id', 'user_type', 'user_id']);
                $table->unique(['user_type', 'user_id', 'token'], 'user_device_token_unique');
            });
        }
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('device_tokens');
    }
};
