<?php
require 'backend/vendor/autoload.php';
$db = (new App\Database(require 'backend/config/config.php'))->getConnection();
try {
    $db->exec("ALTER TABLE pedido_items ADD estado ENUM('presupuesto','aprobado','en_produccion','terminado','entregado','cancelado') NOT NULL DEFAULT 'presupuesto'");
    echo "OK\n";
} catch (Exception $e) {
    if (strpos($e->getMessage(), 'Duplicate column') !== false) {
        echo "OK (Already exists)\n";
    } else {
        echo "Error: " . $e->getMessage() . "\n";
    }
}
