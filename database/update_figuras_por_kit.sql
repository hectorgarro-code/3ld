-- Applied automatically by Database::getConnection on deployment.
-- NULL: legacy inference; 0: individual product; positive integer: complete kit.
ALTER TABLE productos ADD COLUMN figuras_por_kit INT UNSIGNED NULL DEFAULT NULL;
