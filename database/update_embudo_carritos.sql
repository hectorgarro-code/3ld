-- Vinculación privada de sesiones anónimas con pedidos generados en Mercado Pago.
-- No altera pagos ni pedidos. La aplicación crea esta tabla al primer uso.
CREATE TABLE IF NOT EXISTS tienda_checkout_sesiones (
 pedido_id INTEGER PRIMARY KEY,
 session_id VARCHAR(64) NOT NULL,
 visitor_id VARCHAR(64) NOT NULL,
 created_at DATETIME NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
