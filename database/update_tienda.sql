-- Actualización para soporte de Tienda Pública 3LD en productos
ALTER TABLE productos
  ADD COLUMN es_tienda TINYINT(1) NOT NULL DEFAULT 0 AFTER es_insumo,
  ADD COLUMN subcategoria VARCHAR(100) NULL AFTER categoria_id,
  ADD COLUMN precio_oferta DECIMAL(10,2) NULL AFTER precio_venta,
  ADD COLUMN peso_gramos INT NOT NULL DEFAULT 50 AFTER unidad_medida,
  ADD COLUMN dimensiones VARCHAR(100) NULL AFTER peso_gramos,
  ADD COLUMN estado_stock ENUM('ready', 'custom') NOT NULL DEFAULT 'ready' AFTER stock_actual,
  ADD COLUMN es_destacado TINYINT(1) NOT NULL DEFAULT 0 AFTER es_tienda;

-- Índice para consultas rápidas de la tienda
CREATE INDEX idx_productos_tienda ON productos (es_tienda, activo);
