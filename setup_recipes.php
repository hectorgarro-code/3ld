<?php
$pdo = new PDO('mysql:host=localhost;dbname=sistema3ld;charset=utf8mb4', 'root', '');


$sql = "
CREATE TABLE IF NOT EXISTS producto_recetas (
  producto_id INT UNSIGNED NOT NULL,
  insumo_id   INT UNSIGNED NOT NULL,
  cantidad    DECIMAL(8,2) NOT NULL DEFAULT 1,
  PRIMARY KEY (producto_id, insumo_id),
  FOREIGN KEY (producto_id) REFERENCES productos(id) ON DELETE CASCADE,
  FOREIGN KEY (insumo_id)   REFERENCES productos(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
";

$pdo->exec($sql);
echo "Tabla producto_recetas creada exitosamente.\n";
