<?php

require_once 'vendor/autoload.php';

$app = require_once 'bootstrap/app.php';

$kernel = $app->make(Illuminate\Contracts\Console\Kernel::class);

$kernel->bootstrap();

use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

echo "Checking permissions table structure...\n";

try {
    $columns = DB::select("DESCRIBE permissions");
    echo "Current permissions table structure:\n";
    
    foreach ($columns as $column) {
        echo "- " . $column->Field . " (" . $column->Type . ")\n";
    }
    
    // Check if we need to add missing columns
    $hasDisplayName = false;
    $hasCategory = false;
    $hasIsSystemPermission = false;
    
    foreach ($columns as $column) {
        if ($column->Field === 'display_name') $hasDisplayName = true;
        if ($column->Field === 'category') $hasCategory = true;
        if ($column->Field === 'is_system_permission') $hasIsSystemPermission = true;
    }
    
    echo "\nAdding missing columns...\n";
    
    if (!$hasDisplayName) {
        Schema::table('permissions', function (Blueprint $table) {
            $table->string('display_name')->after('name');
        });
        echo "Added display_name column\n";
    }
    
    if (!$hasCategory) {
        Schema::table('permissions', function (Blueprint $table) {
            $table->string('category')->after('description');
        });
        echo "Added category column\n";
    }
    
    if (!$hasIsSystemPermission) {
        Schema::table('permissions', function (Blueprint $table) {
            $table->boolean('is_system_permission')->default(false)->after('category');
        });
        echo "Added is_system_permission column\n";
    }
    
    echo "\nFinal permissions table structure:\n";
    $columns = DB::select("DESCRIBE permissions");
    foreach ($columns as $column) {
        echo "- " . $column->Field . " (" . $column->Type . ")\n";
    }
    
} catch (Exception $e) {
    echo "Error: " . $e->getMessage() . "\n";
}
