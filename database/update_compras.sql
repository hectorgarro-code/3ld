USE sistema3ld;

ALTER TABLE productos
  ADD COLUMN es_vendible TINYINT(1) NOT NULL DEFAULT 1 AFTER activo,
  ADD COLUMN es_insumo TINYINT(1) NOT NULL DEFAULT 0 AFTER es_vendible;

CREATE TABLE IF NOT EXISTS compras (
  id                  INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  proveedor_id        INT UNSIGNED NOT NULL,
  numero_comprobante  VARCHAR(100),
  total               DECIMAL(12,2) NOT NULL DEFAULT 0.00,
  estado              ENUM('completada', 'cancelada') NOT NULL DEFAULT 'completada',
  notas               TEXT,
  fecha               DATE NOT NULL,
  created_by          INT UNSIGNED,
  created_at          DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at          DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (proveedor_id) REFERENCES proveedores(id) ON DELETE RESTRICT,
  FOREIGN KEY (created_by) REFERENCES usuarios(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS compra_items (
  id                INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  compra_id         INT UNSIGNED NOT NULL,
  producto_id       INT UNSIGNED,
  descripcion       VARCHAR(200),
  cantidad          DECIMAL(10,2) NOT NULL DEFAULT 1.00,
  precio_unitario   DECIMAL(10,2) NOT NULL DEFAULT 0.00,
  subtotal          DECIMAL(12,2) NOT NULL DEFAULT 0.00,
  created_at        DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (compra_id) REFERENCES compras(id) ON DELETE CASCADE,
  FOREIGN KEY (producto_id) REFERENCES productos(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
