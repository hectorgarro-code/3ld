<?php
require __DIR__ . '/backend/config/config.php';
$config = require __DIR__ . '/backend/config/config.php';
// Merge config.local.php if exists
$localConfigPath = __DIR__ . '/backend/config/config.local.php';
if (file_exists($localConfigPath)) {
    $localConfig = require $localConfigPath;
    $config = array_replace_recursive($config, $localConfig);
}

$dsn = "mysql:host={$config['db']['host']};dbname={$config['db']['dbname']};charset={$config['db']['charset']}";
$pdo = new PDO($dsn, $config['db']['user'], $config['db']['pass']);
$pdo->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);

$sql = "
CREATE TABLE IF NOT EXISTS stock_historial (
  fecha DATE PRIMARY KEY,
  valor_filamentos DECIMAL(12,2) DEFAULT 0,
  valor_insumos DECIMAL(12,2) DEFAULT 0,
  valor_mercaderia DECIMAL(12,2) DEFAULT 0,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
";

$pdo->exec($sql);
echo "Tabla stock_historial creada o ya existía.\n";
