<?php

declare(strict_types=1);

namespace App\Repositories;

use PDO;

class ProductoRepository
{
    private PDO $db;

    public function __construct(PDO $db)
    {
        $this->db = $db;
    }

    public function findAll(array $params = []): array
    {
        $q           = $params['q']            ?? '';
        $tipo        = $params['tipo']         ?? '';
        $categoriaId = (int) ($params['categoria_id'] ?? 0);
        $page        = max(1, (int) ($params['page']     ?? 1));
        $perPage     = min(1000, max(1, (int) ($params['per_page'] ?? 500)));
        $offset      = ($page - 1) * $perPage;

        $where = "WHERE p.activo = 1";
        $binds = [];

        if (!empty($q)) {
            $where  .= " AND (p.nombre LIKE ? OR p.sku LIKE ? OR p.descripcion LIKE ?)";
            $like    = "%{$q}%";
            $binds   = array_merge($binds, [$like, $like, $like]);
        }

        if (!empty($tipo)) {
            $where .= " AND p.tipo = ?";
            $binds[] = $tipo;
        }

        if ($categoriaId > 0) {
            $where .= " AND p.categoria_id = ?";
            $binds[] = $categoriaId;
        }

        // Count
        $stmtCount = $this->db->prepare("SELECT COUNT(*) FROM productos p {$where}");
        $stmtCount->execute($binds);
        $total = (int) $stmtCount->fetchColumn();

        // Fetch
        $sql = "SELECT p.id, p.nombre, p.variante, p.sku, p.descripcion, p.tipo,
                       p.precio_venta, p.precio_costo, p.stock_actual, p.stock_minimo,
                       p.unidad_medida, p.imagen_url, p.archivo_url, p.activo,
                       p.es_vendible, p.es_insumo,
                       p.created_at, p.updated_at,
                       c.id AS categoria_id, c.nombre AS categoria_nombre
                FROM productos p
                LEFT JOIN categorias_producto c ON c.id = p.categoria_id
                {$where}
                ORDER BY p.nombre ASC
                LIMIT {$perPage} OFFSET {$offset}";

        $stmt = $this->db->prepare($sql);
        $stmt->execute($binds);
        $productos = $stmt->fetchAll();

        if (!empty($productos)) {
            $ids = array_column($productos, 'id');
            $placeholders = implode(',', array_fill(0, count($ids), '?'));
            try {
                $stmtRecetas = $this->db->prepare(
                    "SELECT r.producto_id, r.insumo_id, r.cantidad, p.nombre as insumo_nombre, p.precio_costo, p.unidad_medida 
                     FROM producto_recetas r 
                     JOIN productos p ON p.id = r.insumo_id 
                     WHERE r.producto_id IN ($placeholders)"
                );
                $stmtRecetas->execute($ids);
                $recetas = $stmtRecetas->fetchAll();

                $recetasIndexed = [];
                foreach ($recetas as $receta) {
                    $recetasIndexed[$receta['producto_id']][] = $receta;
                }

                foreach ($productos as &$p) {
                    $p['receta'] = $recetasIndexed[$p['id']] ?? [];
                }
            } catch (\Throwable $e) {
                foreach ($productos as &$p) {
                    $p['receta'] = [];
                }
            }
        }

        return [
            'data' => $productos,
            'meta' => [
                'page'      => $page,
                'per_page'  => $perPage,
                'total'     => $total,
                'last_page' => (int) ceil($total / max(1, $perPage)),
            ],
        ];
    }

    public function findById(int $id): ?array
    {
        $stmt = $this->db->prepare(
            "SELECT p.*, c.nombre AS categoria_nombre
             FROM productos p
             LEFT JOIN categorias_producto c ON c.id = p.categoria_id
             WHERE p.id = ? AND p.activo = 1"
        );
        $stmt->execute([$id]);
        $producto = $stmt->fetch();

        if (!$producto) {
            return null;
        }

        try {
            $stmtReceta = $this->db->prepare(
                "SELECT r.producto_id, r.insumo_id, r.cantidad, p.nombre as insumo_nombre, p.precio_costo, p.unidad_medida 
                 FROM producto_recetas r 
                 JOIN productos p ON p.id = r.insumo_id 
                 WHERE r.producto_id = ?"
            );
            $stmtReceta->execute([$id]);
            $producto['receta'] = $stmtReceta->fetchAll();
        } catch (\Throwable $e) {
            $producto['receta'] = [];
        }

        return $producto;
    }

    public function create(array $data): array
    {
        $sku = !empty(trim((string)($data['sku'] ?? ''))) ? trim($data['sku']) : null;

        try {
            $stmt = $this->db->prepare(
                "INSERT INTO productos
                    (nombre, variante, sku, descripcion, tipo, categoria_id, precio_venta, precio_costo,
                     stock_actual, stock_minimo, unidad_medida, imagen_url, archivo_url,
                     es_vendible, es_insumo, es_tienda, subcategoria, precio_oferta, peso_gramos, dimensiones, estado_stock, es_destacado, activo, created_at, updated_at)
                 VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1, NOW(), NOW())"
            );

            $stmt->execute([
                trim($data['nombre']),
                $data['variante']      ?? null,
                $sku,
                $data['descripcion']   ?? null,
                $data['tipo']          ?? 'impresion_3d',
                $data['categoria_id']  ?? null,
                (float) ($data['precio_venta']  ?? 0),
                (float) ($data['precio_costo']  ?? 0),
                (int)   ($data['stock_actual']  ?? 0),
                (int)   ($data['stock_minimo']  ?? 0),
                $data['unidad_medida'] ?? 'unidad',
                $data['imagen_url']    ?? null,
                $data['archivo_url']   ?? null,
                isset($data['es_vendible']) ? (int)$data['es_vendible'] : 1,
                isset($data['es_insumo']) ? (int)$data['es_insumo'] : 0,
                isset($data['es_tienda']) ? (int)$data['es_tienda'] : 0,
                $data['subcategoria']  ?? null,
                isset($data['precio_oferta']) ? (float)$data['precio_oferta'] : null,
                (int) ($data['peso_gramos'] ?? 50),
                $data['dimensiones']   ?? null,
                $data['estado_stock']  ?? 'ready',
                isset($data['es_destacado']) ? (int)$data['es_destacado'] : 0,
            ]);
        } catch (\PDOException $e) {
            $stmt = $this->db->prepare(
                "INSERT INTO productos
                    (nombre, variante, sku, descripcion, tipo, categoria_id, precio_venta, precio_costo,
                     stock_actual, stock_minimo, unidad_medida, imagen_url, archivo_url,
                     es_vendible, es_insumo, activo, created_at, updated_at)
                 VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1, NOW(), NOW())"
            );
            $stmt->execute([
                trim($data['nombre']),
                $data['variante']      ?? null,
                $sku,
                $data['descripcion']   ?? null,
                $data['tipo']          ?? 'impresion_3d',
                $data['categoria_id']  ?? null,
                (float) ($data['precio_venta']  ?? 0),
                (float) ($data['precio_costo']  ?? 0),
                (int)   ($data['stock_actual']  ?? 0),
                (int)   ($data['stock_minimo']  ?? 0),
                $data['unidad_medida'] ?? 'unidad',
                $data['imagen_url']    ?? null,
                $data['archivo_url']   ?? null,
                isset($data['es_vendible']) ? (int)$data['es_vendible'] : 1,
                isset($data['es_insumo']) ? (int)$data['es_insumo'] : 0,
            ]);
        }


        $newId = (int) $this->db->lastInsertId();

        if ($sku === null) {
            $sku = 'PRD-' . str_pad((string)$newId, 5, '0', STR_PAD_LEFT);
            $this->db->prepare("UPDATE productos SET sku = ? WHERE id = ?")->execute([$sku, $newId]);
        }

        if (isset($data['receta']) && is_array($data['receta'])) {
            $stmtReceta = $this->db->prepare("INSERT INTO producto_recetas (producto_id, insumo_id, cantidad) VALUES (?, ?, ?)");
            foreach ($data['receta'] as $item) {
                $stmtReceta->execute([$newId, (int)$item['insumo_id'], (float)$item['cantidad']]);
            }
        }

        return $this->findById($newId);
    }

    public function update(int $id, array $data): ?array
    {
        $current = $this->findById($id);
        if (!$current) {
            return null;
        }

        $fields = [];
        $binds  = [];

        $map = [
            'nombre'        => 'string',
            'variante'      => 'string',
            'sku'           => 'string',
            'descripcion'   => 'string',
            'tipo'          => 'string',
            'categoria_id'  => 'int',
            'precio_venta'  => 'float',
            'precio_costo'  => 'float',
            'stock_actual'  => 'int',
            'stock_minimo'  => 'int',
            'unidad_medida' => 'string',
            'imagen_url'    => 'string',
            'es_vendible'   => 'int',
            'es_insumo'     => 'int',
            'es_tienda'     => 'int',
            'subcategoria'  => 'string',
            'precio_oferta' => 'float',
            'peso_gramos'   => 'int',
            'dimensiones'   => 'string',
            'estado_stock'  => 'string',
            'es_destacado'  => 'int',
            'archivo_url'   => 'string',
        ];

        foreach ($map as $col => $type) {
            if (array_key_exists($col, $data)) {
                $fields[] = "{$col} = ?";
                $val      = $data[$col];
                if ($val === null) {
                    $binds[] = null;
                } else {
                    $binds[] = match ($type) {
                        'int'   => (int) $val,
                        'float' => (float) $val,
                        default => (string) $val,
                    };
                }
            }
        }

        if (!empty($fields)) {
            $fields[] = "updated_at = NOW()";
            $binds[]  = $id;
            $sql      = "UPDATE productos SET " . implode(', ', $fields) . " WHERE id = ?";
            $this->db->prepare($sql)->execute($binds);
        }

        if (isset($data['receta']) && is_array($data['receta'])) {
            $this->db->prepare("DELETE FROM producto_recetas WHERE producto_id = ?")->execute([$id]);
            $stmtReceta = $this->db->prepare("INSERT INTO producto_recetas (producto_id, insumo_id, cantidad) VALUES (?, ?, ?)");
            foreach ($data['receta'] as $item) {
                $stmtReceta->execute([$id, (int)$item['insumo_id'], (float)$item['cantidad']]);
            }
        }

        return $this->findById($id);
    }

    public function delete(int $id): bool
    {
        $stmt = $this->db->prepare("UPDATE productos SET activo = 0, updated_at = NOW() WHERE id = ? AND activo = 1");
        $stmt->execute([$id]);
        return $stmt->rowCount() > 0;
    }

    public function adjustStock(int $id, float $delta): bool
    {
        if ($delta < 0) {
            $absDelta = abs($delta);
            $stmt = $this->db->prepare(
                "UPDATE productos SET stock_actual = stock_actual - ?, updated_at = NOW() WHERE id = ? AND stock_actual >= ?"
            );
            $stmt->execute([$absDelta, $id, $absDelta]);
        } else {
            $stmt = $this->db->prepare(
                "UPDATE productos SET stock_actual = stock_actual + ?, updated_at = NOW() WHERE id = ?"
            );
            $stmt->execute([$delta, $id]);
        }
        return $stmt->rowCount() > 0;
    }
}
