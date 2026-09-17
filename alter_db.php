<?php
$config = require 'backend/config/config.php';
require 'backend/src/Database.php';

$db = (new App\Database($config))->getConnection();

try {
    $db->exec("ALTER TABLE pedido_items ADD COLUMN stock_descontado TINYINT(1) DEFAULT 0 AFTER subtotal");
    echo "Columna stock_descontado agregada a pedido_items.\n";
} catch (Exception $e) {
    echo "Error: " . $e->getMessage() . "\n";
}
