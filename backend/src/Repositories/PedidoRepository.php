<?php

declare(strict_types=1);

namespace App\Repositories;

use PDO;
use Exception;

class PedidoRepository
{
    private PDO $db;

    public function __construct(PDO $db)
    {
        $this->db = $db;
    }

    public function recalcularTotales(int $pedidoId): void
    {
        $stmt = $this->db->prepare(
            "SELECT COALESCE(SUM(subtotal), 0) AS subtotal FROM pedido_items WHERE pedido_id = ?"
        );
        $stmt->execute([$pedidoId]);
        $subtotal = (float) $stmt->fetchColumn();

        $pStmt = $this->db->prepare("SELECT descuento_pct, impuesto_pct FROM pedidos WHERE id = ?");
        $pStmt->execute([$pedidoId]);
        $pedido = $pStmt->fetch();

        $descuento = $subtotal * (($pedido['descuento_pct'] ?? 0) / 100);
        $base      = $subtotal - $descuento;
        $impuesto  = $base * (($pedido['impuesto_pct'] ?? 0) / 100);
        $total     = $base + $impuesto;

        $this->db->prepare(
            "UPDATE pedidos SET subtotal = ?, total = ?, updated_at = NOW() WHERE id = ?"
        )->execute([$subtotal, $total, $pedidoId]);
    }

    public function sincronizarEstadoPedido(int $pedidoId, ?int $usuarioId = null): void
    {
        $stmt = $this->db->prepare("SELECT estado FROM pedido_items WHERE pedido_id = ?");
        $stmt->execute([$pedidoId]);
        $items = $stmt->fetchAll(PDO::FETCH_COLUMN);

        if (empty($items)) return;

        $hierarchy = [
            'presupuesto' => 0,
            'aprobado' => 1,
            'en_produccion' => 2,
            'terminado' => 3,
            'entregado' => 4,
        ];

        $activeItems = array_filter($items, function($e) { return $e !== 'anulado'; });

        if (empty($activeItems)) {
            $nuevoEstado = 'anulado';
        } else {
            $minScore = 999;
            $nuevoEstado = 'presupuesto';
            foreach ($activeItems as $e) {
                $score = $hierarchy[$e] ?? 0;
                if ($score < $minScore) {
                    $minScore = $score;
                    $nuevoEstado = $e;
                }
            }
        }

        $stmt = $this->db->prepare("SELECT estado, cliente_id, total FROM pedidos WHERE id = ?");
        $stmt->execute([$pedidoId]);
        $pedidoActual = $stmt->fetch();
        $estadoActual = $pedidoActual['estado'] ?? 'presupuesto';

        if ($estadoActual !== $nuevoEstado) {
            $this->db->prepare(
                "UPDATE pedidos SET estado = ?, updated_at = NOW() WHERE id = ?"
            )->execute([$nuevoEstado, $pedidoId]);

            $this->db->prepare(
                "INSERT INTO pedido_historial
                    (pedido_id, estado_anterior, estado_nuevo, nota, usuario_id, created_at)
                 VALUES (?, ?, ?, 'Calculado automáticamente desde ítems', ?, NOW())"
            )->execute([
                $pedidoId,
                $estadoActual,
                $nuevoEstado,
                $usuarioId
            ]);
            
            if ($nuevoEstado === 'entregado' && $estadoActual !== 'entregado') {
                $this->db->prepare(
                    "UPDATE clientes SET
                        total_compras     = total_compras + ?,
                        cantidad_pedidos  = cantidad_pedidos + 1,
                        updated_at        = NOW()
                     WHERE id = ?"
                )->execute([$pedidoActual['total'], $pedidoActual['cliente_id']]);
            }
        }
    }

    public function generarNumeroPedido(): string
    {
        $stmt = $this->db->query("SELECT COUNT(*) FROM pedidos");
        $count = (int) $stmt->fetchColumn();
        return '3LD-' . date('Y') . '-' . str_pad((string) ($count + 1), 4, '0', STR_PAD_LEFT);
    }

    public function findAll(array $params, int $perPage, int $offset): array
    {
        $q          = $params['q']          ?? '';
        $estadosStr = $params['estados']    ?? ($params['estado'] ?? '');
        $clientesStr= $params['cliente_ids'] ?? ($params['cliente_id'] ?? '');

        $estados    = !empty($estadosStr) ? explode(',', $estadosStr) : [];
        $clienteIds = !empty($clientesStr) ? array_filter(array_map('intval', explode(',', $clientesStr))) : [];

        $where = "WHERE 1=1";
        $binds = [];

        if (!empty($q)) {
            $where  .= " AND (p.numero_pedido LIKE ? OR c.nombre LIKE ?)";
            $like    = "%{$q}%";
            $binds   = array_merge($binds, [$like, $like]);
        }

        if (!empty($estados)) {
            $placeholders = implode(',', array_fill(0, count($estados), '?'));
            $where .= " AND p.estado IN ($placeholders)";
            $binds = array_merge($binds, $estados);
        }

        if (!empty($clienteIds)) {
            $placeholders = implode(',', array_fill(0, count($clienteIds), '?'));
            $where .= " AND p.cliente_id IN ($placeholders)";
            $binds = array_merge($binds, $clienteIds);
        }

        $stmtCount = $this->db->prepare(
            "SELECT COUNT(*) FROM pedidos p LEFT JOIN clientes c ON c.id = p.cliente_id {$where}"
        );
        $stmtCount->execute($binds);
        $total = (int) $stmtCount->fetchColumn();

        $sql = "SELECT p.id, p.numero_pedido, p.estado, p.subtotal, p.descuento_pct,
                       p.impuesto_pct, p.total, p.fecha_entrega_estimada,
                       p.fecha_entrega_real, p.notas, p.created_at, p.updated_at,
                       c.id AS cliente_id, c.nombre AS cliente_nombre,
                       c.email AS cliente_email, c.telefono AS cliente_telefono
                FROM pedidos p
                LEFT JOIN clientes c ON c.id = p.cliente_id
                {$where}
                ORDER BY p.created_at DESC
                LIMIT {$perPage} OFFSET {$offset}";

        $stmt = $this->db->prepare($sql);
        $stmt->execute($binds);
        $pedidos = $stmt->fetchAll();

        return ['data' => $pedidos, 'total' => $total];
    }

    public function findById(int $id): ?array
    {
        $stmt = $this->db->prepare(
            "SELECT p.*, c.nombre AS cliente_nombre, c.email AS cliente_email,
                    c.telefono AS cliente_telefono, c.empresa AS cliente_empresa
             FROM pedidos p
             LEFT JOIN clientes c ON c.id = p.cliente_id
             WHERE p.id = ?"
        );
        $stmt->execute([$id]);
        $pedido = $stmt->fetch();

        if (!$pedido) return null;

        $stmtItems = $this->db->prepare(
            "SELECT pi.*, pr.nombre AS producto_nombre, pr.sku AS producto_sku,
                    pr.unidad_medida
             FROM pedido_items pi
             LEFT JOIN productos pr ON pr.id = pi.producto_id
             WHERE pi.pedido_id = ?
             ORDER BY pi.id ASC"
        );
        $stmtItems->execute([$id]);
        $pedido['items'] = $stmtItems->fetchAll();

        $stmtHist = $this->db->prepare(
            "SELECT h.*, u.nombre AS usuario_nombre
             FROM pedido_historial h
             LEFT JOIN usuarios u ON u.id = h.usuario_id
             WHERE h.pedido_id = ?
             ORDER BY h.created_at ASC"
        );
        $stmtHist->execute([$id]);
        $pedido['historial'] = $stmtHist->fetchAll();

        return $pedido;
    }

    public function create(array $body, ?int $usuarioId): array
    {
        $this->db->beginTransaction();

        try {
            $numeroPedido = $this->generarNumeroPedido();

            $stmtPed = $this->db->prepare(
                "INSERT INTO pedidos
                    (numero_pedido, cliente_id, estado, subtotal, descuento_pct,
                     impuesto_pct, total, margen_bruto, fecha_entrega_estimada, notas,
                     created_at, updated_at)
                 VALUES (?, ?, 'presupuesto', 0, ?, ?, 0, 0, ?, ?, NOW(), NOW())"
            );
            $stmtPed->execute([
                $numeroPedido,
                (int) $body['cliente_id'],
                (float) ($body['descuento_pct']        ?? 0),
                (float) ($body['impuesto_pct']         ?? 0),
                $body['fecha_entrega_estimada']        ?? null,
                $body['notas']                         ?? null,
            ]);

            $pedidoId = (int) $this->db->lastInsertId();

            $items = $body['items'] ?? [];
            foreach ($items as $item) {
                $cantidad    = (float) ($item['cantidad']    ?? 1);
                $precioUnit  = (float) ($item['precio_unit'] ?? 0);
                $descuentoPct = (float) ($item['descuento_pct'] ?? 0);
                $subtotal    = $cantidad * $precioUnit * (1 - $descuentoPct / 100);

                $stmtItem = $this->db->prepare(
                    "INSERT INTO pedido_items
                        (pedido_id, producto_id, descripcion, cantidad, precio_unit,
                         descuento_pct, subtotal, notas, created_at)
                     VALUES (?, ?, ?, ?, ?, ?, ?, ?, NOW())"
                );
                $stmtItem->execute([
                    $pedidoId,
                    $item['producto_id'] ?? null,
                    $item['descripcion'] ?? null,
                    $cantidad,
                    $precioUnit,
                    $descuentoPct,
                    $subtotal,
                    $item['notas'] ?? null,
                ]);
            }

            $this->recalcularTotales($pedidoId);
            $this->sincronizarEstadoPedido($pedidoId, $usuarioId);

            $this->db->prepare(
                "INSERT INTO pedido_historial (pedido_id, estado_nuevo, nota, usuario_id, created_at)
                 VALUES (?, 'presupuesto', 'Pedido creado', ?, NOW())"
            )->execute([$pedidoId, $usuarioId]);

            $this->db->commit();

            return $this->getPedidoBase($pedidoId);
        } catch (\Throwable $e) {
            $this->db->rollBack();
            throw $e;
        }
    }

    public function update(int $id, array $body): array
    {
        $fields = [];
        $binds  = [];

        $map = [
            'notas'                  => 'string',
            'fecha_entrega_estimada' => 'string',
            'descuento_pct'          => 'float',
            'impuesto_pct'           => 'float',
            'margen_bruto'           => 'float',
        ];

        foreach ($map as $field => $type) {
            if (array_key_exists($field, $body)) {
                $fields[] = "{$field} = ?";
                if ($type === 'float')  $binds[] = (float) $body[$field];
                else                    $binds[] = (string) $body[$field];
            }
        }

        if (!empty($fields)) {
            $fields[] = "updated_at = NOW()";
            $binds[]  = $id;
            $this->db->prepare("UPDATE pedidos SET " . implode(', ', $fields) . " WHERE id = ?")
               ->execute($binds);
            $this->recalcularTotales($id);
        }

        return $this->getPedidoBase($id);
    }

    public function delete(int $id): void
    {
        $this->db->prepare("UPDATE pedidos SET estado = 'anulado', updated_at = NOW() WHERE id = ?")
           ->execute([$id]);
    }

    public function addItem(int $pedidoId, array $body, ?int $usuarioId): array
    {
        $cantidad     = (float) ($body['cantidad']     ?? 1);
        $precioUnit   = (float) ($body['precio_unit']  ?? 0);
        $descuentoPct = (float) ($body['descuento_pct'] ?? 0);
        $subtotal     = $cantidad * $precioUnit * (1 - $descuentoPct / 100);

        $stmt = $this->db->prepare(
            "INSERT INTO pedido_items
                (pedido_id, producto_id, descripcion, cantidad, precio_unit,
                 descuento_pct, subtotal, notas, created_at)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, NOW())"
        );
        $stmt->execute([
            $pedidoId,
            $body['producto_id'] ?? null,
            $body['descripcion'] ?? null,
            $cantidad,
            $precioUnit,
            $descuentoPct,
            $subtotal,
            $body['notas'] ?? null,
        ]);

        $itemId = (int) $this->db->lastInsertId();
        $this->recalcularTotales($pedidoId);
        $this->sincronizarEstadoPedido($pedidoId, $usuarioId);

        $stmtItem = $this->db->prepare(
            "SELECT pi.*, pr.nombre AS producto_nombre FROM pedido_items pi
             LEFT JOIN productos pr ON pr.id = pi.producto_id WHERE pi.id = ?"
        );
        $stmtItem->execute([$itemId]);

        return $stmtItem->fetch();
    }

    public function cambiarEstado(int $id, string $nuevoEstado, ?string $nota, ?int $usuarioId): array
    {
        $stmt = $this->db->prepare("SELECT id, estado, cliente_id, total FROM pedidos WHERE id = ?");
        $stmt->execute([$id]);
        $pedido = $stmt->fetch();

        $this->db->beginTransaction();

        try {
            $this->db->prepare(
                "UPDATE pedidos SET estado = ?, updated_at = NOW()
                 " . ($nuevoEstado === 'entregado' ? ", fecha_entrega_real = NOW()" : "") . "
                 WHERE id = ?"
            )->execute([$nuevoEstado, $id]);

            $this->db->prepare(
                "INSERT INTO pedido_historial
                    (pedido_id, estado_anterior, estado_nuevo, nota, usuario_id, created_at)
                 VALUES (?, ?, ?, ?, ?, NOW())"
            )->execute([
                $id,
                $pedido['estado'],
                $nuevoEstado,
                $nota,
                $usuarioId,
            ]);

            // Sync all active items to the new state
            $stmtItems = $this->db->prepare("SELECT id, estado FROM pedido_items WHERE pedido_id = ? AND estado != 'anulado'");
            $stmtItems->execute([$id]);
            $items = $stmtItems->fetchAll();

            foreach ($items as $item) {
                // Skip if item is already in the target state
                if ($item['estado'] !== $nuevoEstado) {
                    $this->procesarStockItem((int)$item['id'], $nuevoEstado);
                    $this->db->prepare("UPDATE pedido_items SET estado = ? WHERE id = ?")->execute([$nuevoEstado, $item['id']]);
                }
            }

            if ($nuevoEstado === 'entregado') {
                $this->db->prepare(
                    "UPDATE clientes SET
                        total_compras     = total_compras + ?,
                        cantidad_pedidos  = cantidad_pedidos + 1,
                        updated_at        = NOW()
                     WHERE id = ?"
                )->execute([$pedido['total'], $pedido['cliente_id']]);
            }

            $this->db->commit();
            return $this->getPedidoBase($id);
        } catch (\Throwable $e) {
            $this->db->rollBack();
            throw $e;
        }
    }

    public function findAllItems(array $params, int $perPage, int $offset): array
    {
        $q          = $params['q']          ?? '';
        $estadosStr = $params['estados']    ?? ($params['estado'] ?? '');
        $clientesStr= $params['cliente_ids'] ?? ($params['cliente_id'] ?? '');

        $estados    = !empty($estadosStr) ? explode(',', $estadosStr) : [];
        $clienteIds = !empty($clientesStr) ? array_filter(array_map('intval', explode(',', $clientesStr))) : [];

        $where = "WHERE 1=1";
        $binds = [];

        if (!empty($q)) {
            $where  .= " AND (pr.nombre LIKE ? OR c.nombre LIKE ? OR p.numero_pedido LIKE ?)";
            $like    = "%{$q}%";
            $binds   = array_merge($binds, [$like, $like, $like]);
        }

        if (!empty($estados)) {
            $placeholders = implode(',', array_fill(0, count($estados), '?'));
            $where .= " AND pi.estado IN ($placeholders)";
            $binds = array_merge($binds, $estados);
        }

        if (!empty($clienteIds)) {
            $placeholders = implode(',', array_fill(0, count($clienteIds), '?'));
            $where .= " AND p.cliente_id IN ($placeholders)";
            $binds = array_merge($binds, $clienteIds);
        }

        $stmtCount = $this->db->prepare(
            "SELECT COUNT(*) FROM pedido_items pi
             LEFT JOIN pedidos p ON p.id = pi.pedido_id
             LEFT JOIN productos pr ON pr.id = pi.producto_id
             LEFT JOIN clientes c ON c.id = p.cliente_id
             {$where}"
        );
        $stmtCount->execute($binds);
        $total = (int) $stmtCount->fetchColumn();

        $sql = "SELECT pi.*, pr.nombre AS producto_nombre, pr.variante AS producto_variante,
                       p.numero_pedido, p.fecha_entrega_estimada, p.created_at AS pedido_fecha,
                       c.id AS cliente_id, c.nombre AS cliente_nombre, p.descuento_pct AS pedido_descuento_pct
                FROM pedido_items pi
                LEFT JOIN pedidos p ON p.id = pi.pedido_id
                LEFT JOIN productos pr ON pr.id = pi.producto_id
                LEFT JOIN clientes c ON c.id = p.cliente_id
                {$where}
                ORDER BY p.created_at DESC
                LIMIT {$perPage} OFFSET {$offset}";

        $stmt = $this->db->prepare($sql);
        $stmt->execute($binds);
        $items = $stmt->fetchAll();

        return ['data' => $items, 'total' => $total];
    }

    public function cambiarEstadoItem(int $itemId, string $nuevoEstado, ?int $usuarioId): void
    {
        $stmt = $this->db->prepare("SELECT id, pedido_id FROM pedido_items WHERE id = ?");
        $stmt->execute([$itemId]);
        $item = $stmt->fetch();

        // Process stock FIRST based on new state, then update DB. Wait, if we process first we update state inside. Let's do it after we update state or just pass the new state. We pass the new state.
        $this->procesarStockItem($itemId, $nuevoEstado);

        $this->db->prepare("UPDATE pedido_items SET estado = ? WHERE id = ?")->execute([$nuevoEstado, $itemId]);
        $this->sincronizarEstadoPedido((int)$item['pedido_id'], $usuarioId);
    }

    public function getPedidoBase(int $id): ?array
    {
        $stmt = $this->db->prepare(
            "SELECT p.*, c.nombre AS cliente_nombre FROM pedidos p
             LEFT JOIN clientes c ON c.id = p.cliente_id WHERE p.id = ?"
        );
        $stmt->execute([$id]);
        $res = $stmt->fetch();
        return $res ?: null;
    }

    public function exists(int $id): bool
    {
        $check = $this->db->prepare("SELECT id FROM pedidos WHERE id = ?");
        $check->execute([$id]);
        return (bool) $check->fetch();
    }
    
    public function findEstado(int $id): ?string
    {
        $stmt = $this->db->prepare("SELECT estado FROM pedidos WHERE id = ?");
        $stmt->execute([$id]);
        $row = $stmt->fetch();
        return $row ? $row['estado'] : null;
    }

    public function simularEntrega(int $pedidoId): array
    {
        $stmtItems = $this->db->prepare("SELECT producto_id, cantidad FROM pedido_items WHERE pedido_id = ? AND estado != 'anulado'");
        $stmtItems->execute([$pedidoId]);
        $items = $stmtItems->fetchAll();

        $impactos = [];

        foreach ($items as $item) {
            $productoId = $item['producto_id'];
            if (!$productoId) continue;

            $stmtProd = $this->db->prepare("SELECT nombre, stock_actual FROM productos WHERE id = ?");
            $stmtProd->execute([$productoId]);
            $producto = $stmtProd->fetch();
            if (!$producto) continue;

            if ($producto['stock_actual'] >= $item['cantidad']) {
                $impactos[] = [
                    'tipo' => 'producto_terminado',
                    'nombre' => $producto['nombre'],
                    'cantidad' => $item['cantidad'],
                    'accion' => 'Descontar de estantería'
                ];
            } else {
                $stockDisponible = max(0, $producto['stock_actual']);
                $faltante = $item['cantidad'] - $stockDisponible;

                if ($stockDisponible > 0) {
                    $impactos[] = [
                        'tipo' => 'producto_terminado',
                        'nombre' => $producto['nombre'],
                        'cantidad' => $stockDisponible,
                        'accion' => 'Descontar de estantería'
                    ];
                }

                $stmtReceta = $this->db->prepare(
                    "SELECT r.cantidad, p.nombre 
                     FROM producto_recetas r 
                     JOIN productos p ON p.id = r.insumo_id 
                     WHERE r.producto_id = ?"
                );
                $stmtReceta->execute([$productoId]);
                $receta = $stmtReceta->fetchAll();

                if (!empty($receta)) {
                    foreach ($receta as $insumo) {
                        $impactos[] = [
                            'tipo' => 'insumo',
                            'nombre' => $insumo['nombre'] . ' (para ' . $producto['nombre'] . ')',
                            'cantidad' => $insumo['cantidad'] * $faltante,
                            'accion' => 'Descontar por ensamblaje automático'
                        ];
                    }
                } else {
                    $impactos[] = [
                        'tipo' => 'producto_terminado',
                        'nombre' => $producto['nombre'],
                        'cantidad' => $faltante,
                        'accion' => 'Descontar (Stock quedará negativo)'
                    ];
                }
            }
        }

        return $impactos;
    }

    public function procesarStockItem(int $itemId, string $nuevoEstado): void
    {
        $stmtItem = $this->db->prepare("SELECT producto_id, cantidad, stock_descontado FROM pedido_items WHERE id = ?");
        $stmtItem->execute([$itemId]);
        $item = $stmtItem->fetch();

        if (!$item || !$item['producto_id']) return;

        $debeEstarDescontado = in_array($nuevoEstado, ['entregado', 'cobrado'], true);
        $estaDescontado = (bool) $item['stock_descontado'];

        if ($debeEstarDescontado && !$estaDescontado) {
            $this->aplicarAutoConsumoItem($item['producto_id'], (float)$item['cantidad']);
            $this->db->prepare("UPDATE pedido_items SET stock_descontado = 1 WHERE id = ?")->execute([$itemId]);
        } elseif (!$debeEstarDescontado && $estaDescontado) {
            $this->restaurarStockItem($item['producto_id'], (float)$item['cantidad']);
            $this->db->prepare("UPDATE pedido_items SET stock_descontado = 0 WHERE id = ?")->execute([$itemId]);
        }
    }

    private function aplicarAutoConsumoItem(int $productoId, float $cantidad): void
    {
        $stmtProd = $this->db->prepare("SELECT stock_actual FROM productos WHERE id = ? FOR UPDATE");
        $stmtProd->execute([$productoId]);
        $producto = $stmtProd->fetch();
        if (!$producto) return;

        if ($producto['stock_actual'] >= $cantidad) {
            $this->db->prepare("UPDATE productos SET stock_actual = stock_actual - ? WHERE id = ?")->execute([$cantidad, $productoId]);
            $this->db->prepare("INSERT INTO movimientos_stock (producto_id, cantidad, tipo_movimiento, notas) VALUES (?, ?, 'venta', 'Descuento por entrega de pedido')")->execute([$productoId, -$cantidad]);
        } else {
            $stockDisponible = max(0, $producto['stock_actual']);
            $faltante = $cantidad - $stockDisponible;

            if ($stockDisponible > 0) {
                $this->db->prepare("UPDATE productos SET stock_actual = 0 WHERE id = ?")->execute([$productoId]);
                $this->db->prepare("INSERT INTO movimientos_stock (producto_id, cantidad, tipo_movimiento, notas) VALUES (?, ?, 'venta', 'Descuento por entrega de pedido')")->execute([$productoId, -$stockDisponible]);
            }

            $stmtReceta = $this->db->prepare("SELECT insumo_id, cantidad FROM producto_recetas WHERE producto_id = ?");
            $stmtReceta->execute([$productoId]);
            $receta = $stmtReceta->fetchAll();

            if (!empty($receta)) {
                foreach ($receta as $insumo) {
                    $cantidadADescontar = $insumo['cantidad'] * $faltante;
                    $this->db->prepare("UPDATE productos SET stock_actual = stock_actual - ? WHERE id = ?")->execute([$cantidadADescontar, $insumo['insumo_id']]);
                    $this->db->prepare("INSERT INTO movimientos_stock (producto_id, cantidad, tipo_movimiento, notas) VALUES (?, ?, 'produccion', 'Descuento por ensamble automático')")->execute([$insumo['insumo_id'], -$cantidadADescontar]);
                }
            } else {
                $this->db->prepare("UPDATE productos SET stock_actual = stock_actual - ? WHERE id = ?")->execute([$faltante, $productoId]);
                $this->db->prepare("INSERT INTO movimientos_stock (producto_id, cantidad, tipo_movimiento, notas) VALUES (?, ?, 'venta', 'Descuento por entrega (stock negativo)')")->execute([$productoId, -$faltante]);
            }
        }
    }

    private function restaurarStockItem(int $productoId, float $cantidad): void
    {
        // Simple restoration logic: we just add back to the product. 
        // Note: If the stock was built via recipe, we would ideally restore the recipe items.
        // However, restoring assembled items to ingredients is complex. We'll restore it as the finished product stock,
        // which represents that the item was returned to the shelf.
        $this->db->prepare("UPDATE productos SET stock_actual = stock_actual + ? WHERE id = ?")->execute([$cantidad, $productoId]);
        $this->db->prepare("INSERT INTO movimientos_stock (producto_id, cantidad, tipo_movimiento, notas) VALUES (?, ?, 'anulacion_venta', 'Restauración de stock')")->execute([$productoId, $cantidad]);
    }
}
