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
        Schema::table('students', function (Blueprint $table) {
            $table->date('birth_date')->nullable()->after('name');
            $table->string('gender', 20)->nullable()->after('birth_date');
            $table->boolean('is_active')->default(true)->after('gender');
            $table->string('phone')->nullable()->after('is_active');
            $table->string('email')->nullable()->after('phone');
            $table->text('address')->nullable()->after('email');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('students', function (Blueprint $table) {
            $table->dropColumn([
                'birth_date',
                'gender',
                'is_active',
                'phone',
                'email',
                'address',
            ]);
        });
    }
};
