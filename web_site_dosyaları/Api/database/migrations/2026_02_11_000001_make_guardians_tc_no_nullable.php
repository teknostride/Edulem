<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    /**
     * Referans projede veli e-posta zorunlu, TC opsiyonel. Veli sadece e-posta ile kaydedilebilsin diye tc_no nullable yapılıyor.
     */
    public function up(): void
    {
        Schema::table('guardians', function (Blueprint $table) {
            $table->dropUnique(['tc_no']);
        });
        $driver = Schema::getConnection()->getDriverName();
        if ($driver === 'mysql') {
            DB::statement('ALTER TABLE guardians MODIFY tc_no VARCHAR(11) NULL');
        } else {
            Schema::table('guardians', function (Blueprint $table) {
                $table->string('tc_no', 11)->nullable()->change();
            });
        }
    }

    public function down(): void
    {
        $driver = Schema::getConnection()->getDriverName();
        if ($driver === 'mysql') {
            DB::statement('ALTER TABLE guardians MODIFY tc_no VARCHAR(11) NOT NULL');
        } else {
            Schema::table('guardians', function (Blueprint $table) {
                $table->string('tc_no', 11)->nullable(false)->change();
            });
        }
        Schema::table('guardians', function (Blueprint $table) {
            $table->unique('tc_no');
        });
    }
};
