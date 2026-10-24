-- Registro privado compartido por tienda y ERP. La aplicación también crea esta tabla al primer uso.
-- No modifica pedidos, inventario, clientes ni pagos.
CREATE TABLE IF NOT EXISTS tienda_devoluciones (
  id VARCHAR(60) PRIMARY KEY,
  pedido_id INTEGER NULL,
  version INTEGER NOT NULL,
  datos MEDIUMTEXT NOT NULL,
  actualizado VARCHAR(30) NOT NULL,
  INDEX idx_devoluciones_pedido (pedido_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
