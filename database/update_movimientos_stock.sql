CREATE TABLE IF NOT EXISTS movimientos_stock (
    id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    producto_id INT UNSIGNED NOT NULL,
    cantidad DECIMAL(10,2) NOT NULL,
    tipo_movimiento ENUM('ajuste_manual', 'venta', 'compra', 'produccion', 'devolucion', 'anulacion_venta') NOT NULL,
    referencia_id INT DEFAULT NULL,
    notas TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (producto_id) REFERENCES productos(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
