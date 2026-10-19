<?php
require __DIR__ . '/../vendor/autoload.php';
$dotenv = Dotenv\Dotenv::createImmutable(__DIR__ . '/../');
$dotenv->load();

echo "DB_USERNAME: " . ($_ENV['DB_USERNAME'] ?? 'null') . "\n";
echo "DB_DATABASE: " . ($_ENV['DB_DATABASE'] ?? 'null') . "\n";
echo "APP_NAME: " . ($_ENV['APP_NAME'] ?? 'null') . "\n";
