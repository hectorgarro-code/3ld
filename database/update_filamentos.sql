USE sistema3ld;

ALTER TABLE filamentos
  ADD COLUMN stock_rollos INT NOT NULL DEFAULT 1 AFTER diametro_mm,
  ADD COLUMN stock_minimo_rollos INT NOT NULL DEFAULT 0 AFTER stock_rollos;

-- Convert existing stock
UPDATE filamentos SET stock_rollos = ROUND(peso_restante_g / 1000);

-- Drop old columns
ALTER TABLE filamentos
  DROP COLUMN peso_total_g,
  DROP COLUMN peso_restante_g,
  DROP COLUMN stock_minimo_g,
  DROP COLUMN marca,
  DROP COLUMN porcentaje_desperdicio;

CREATE OR REPLACE VIEW v_filamentos AS
SELECT *,
  ROUND(precio_compra / 1000, 4) AS costo_por_gramo
FROM filamentos
WHERE activo = 1;
