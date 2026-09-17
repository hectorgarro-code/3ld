<?php
$pdo = new PDO('mysql:host=localhost;dbname=sistema3ld;charset=utf8mb4', 'root', '');
$sql = file_get_contents(__DIR__ . '/database/update_compras.sql');

try {
    $pdo->exec($sql);
    echo "SQL Executed Successfully\n";
} catch (Exception $e) {
    echo "Error: " . $e->getMessage() . "\n";
}
