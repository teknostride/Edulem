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
        Schema::create('measurement_trial_imports', function (Blueprint $table) {
            $table->id();
            $table->foreignId('tenant_id')->constrained('tenants')->onDelete('cascade');
            $table->foreignId('trial_id')->constrained('measurement_trials')->onDelete('cascade');
            $table->foreignId('booklet_id')->nullable()->constrained('measurement_trial_booklets')->onDelete('set null');
            $table->string('file_path');
            $table->string('original_name')->nullable();
            $table->enum('status', ['processing', 'completed', 'failed'])->default('processing');
            $table->json('summary')->nullable();
            $table->json('errors')->nullable();
            $table->foreignId('imported_by')->nullable()->constrained('users')->onDelete('set null');
            $table->timestamp('imported_at')->nullable();
            $table->timestamps();

            $table->index('tenant_id');
            $table->index('trial_id');
            $table->index('status');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('measurement_trial_imports');
    }
};
