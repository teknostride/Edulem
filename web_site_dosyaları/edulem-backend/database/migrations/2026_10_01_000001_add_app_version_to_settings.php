<?php
use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void
    {
        Schema::table('settings', function (Blueprint $table) {
            if (!Schema::hasColumn('settings', 'app_version')) {
                $table->string('app_version')->default('1.0.0');
            }
            if (!Schema::hasColumn('settings', 'min_required_version')) {
                $table->string('min_required_version')->default('1.0.0');
            }
        });
    }

    public function down(): void
    {
        Schema::table('settings', function (Blueprint $table) {
            $cols = [];
            if (Schema::hasColumn('settings', 'app_version')) $cols[] = 'app_version';
            if (Schema::hasColumn('settings', 'min_required_version')) $cols[] = 'min_required_version';
            if (!empty($cols)) {
                $table->dropColumn($cols);
            }
        });
    }
};
?>
