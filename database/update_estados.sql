-- Modificar tabla pedidos
ALTER TABLE pedidos 
MODIFY COLUMN estado ENUM('presupuesto','aprobado','en_produccion','terminado','entregado','cancelado','cobrado','anulado') NOT NULL DEFAULT 'presupuesto';

UPDATE pedidos SET estado = 'anulado' WHERE estado = 'cancelado';

ALTER TABLE pedidos 
MODIFY COLUMN estado ENUM('presupuesto','aprobado','en_produccion','terminado','entregado','cobrado','anulado') NOT NULL DEFAULT 'presupuesto';

-- Modificar tabla pedido_items
ALTER TABLE pedido_items 
MODIFY COLUMN estado ENUM('presupuesto','aprobado','en_produccion','terminado','entregado','cancelado','cobrado','anulado') NOT NULL DEFAULT 'presupuesto';

UPDATE pedido_items SET estado = 'anulado' WHERE estado = 'cancelado';

ALTER TABLE pedido_items 
MODIFY COLUMN estado ENUM('presupuesto','aprobado','en_produccion','terminado','entregado','cobrado','anulado') NOT NULL DEFAULT 'presupuesto';

-- Historial
UPDATE pedido_historial SET estado_nuevo = 'anulado' WHERE estado_nuevo = 'cancelado';
UPDATE pedido_historial SET estado_anterior = 'anulado' WHERE estado_anterior = 'cancelado';
