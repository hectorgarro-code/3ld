<?php
ini_set('display_errors', '1');
error_reporting(E_ALL);

header('Content-Type: application/json');

$checks = [];

// 1. PHP Version
$checks['php_version'] = PHP_VERSION;

// 2. Vendor autoload
$autoloadPath = __DIR__ . '/../vendor/autoload.php';
$checks['autoload_exists'] = file_exists($autoloadPath);

// 3. Config.local.php
$configLocalPath = __DIR__ . '/../config/config.local.php';
$checks['config_local_exists'] = file_exists($configLocalPath);

// 4. Try require config.php
try {
    $config = require __DIR__ . '/../config/config.php';
    $checks['config_loaded'] = true;
    $checks['db_host'] = $config['db']['host'] ?? null;
    $checks['db_name'] = $config['db']['dbname'] ?? null;
    $checks['db_user'] = $config['db']['user'] ?? null;
} catch (\Throwable $e) {
    $checks['config_error'] = $e->getMessage();
}

// 5. Try PDO connection
try {
    if (!empty($config['db'])) {
        $db = new PDO(
            "mysql:host={$config['db']['host']};dbname={$config['db']['dbname']};charset=utf8mb4",
            $config['db']['user'],
            $config['db']['pass'],
            [PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION]
        );
        $checks['db_connected'] = true;
        $cnt = $db->query("SELECT COUNT(*) FROM productos")->fetchColumn();
        $checks['productos_count'] = (int)$cnt;
    }
} catch (\Throwable $e) {
    $checks['db_error'] = $e->getMessage();
}

echo json_encode($checks, JSON_PRETTY_PRINT);
