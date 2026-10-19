<?php
header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
echo json_encode(['php'=>PHP_VERSION,'pdo'=>extension_loaded('pdo'),'pdo_mysql'=>extension_loaded('pdo_mysql'),'ok'=>true]);

