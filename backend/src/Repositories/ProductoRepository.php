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
            $subIds = [];
            try {
                $stSubs = $this->db->prepare("SELECT id FROM categorias_producto WHERE parent_id = ?");
                $stSubs->execute([$categoriaId]);
                $subIds = $stSubs->fetchAll(\PDO::FETCH_COLUMN) ?: [];
            } catch (\Throwable $e) {}

            $allMatchedIds = array_values(array_unique(array_merge([$categoriaId], array_map('intval', $subIds))));
            $inClause = implode(',', array_fill(0, count($allMatchedIds), '?'));
            $where .= " AND (p.categoria_id IN ({$inClause}) OR p.categoria_secundaria_id IN ({$inClause}))";
            $binds = array_merge($binds, $allMatchedIds, $allMatchedIds);
        }

        // Count
        $stmtCount = $this->db->prepare("SELECT COUNT(*) FROM productos p {$where}");
        $stmtCount->execute($binds);
        $total = (int) $stmtCount->fetchColumn();

        try {
            $sql = "SELECT p.id, p.nombre, p.variante, p.sku, p.descripcion, p.tipo,
                           p.precio_venta, p.precio_costo, p.precio_mayorista, p.precio_oferta, p.stock_actual, p.stock_minimo,
                           p.unidad_medida, p.imagen_url, p.imagenes, p.archivo_url, p.colores, p.piezas, p.precios_cantidad, p.activo,
                           p.es_vendible, p.es_insumo, p.es_tienda, p.sync_mercadolibre, p.es_destacado, p.subcategoria,
                           p.horas_impresion, p.peso_gramos,
                           p.alto_mm, p.ancho_mm, p.profundidad_mm, p.dimensiones,
                           p.seo_title, p.seo_description, p.created_at, p.updated_at,
                           c.id AS categoria_id, c.nombre AS categoria_nombre,
                           p.categoria_secundaria_id, c_sec.nombre AS categoria_secundaria_nombre
                    FROM productos p
                    LEFT JOIN categorias_producto c ON c.id = p.categoria_id
                    LEFT JOIN categorias_producto c_sec ON c_sec.id = p.categoria_secundaria_id
                    {$where}
                    ORDER BY p.nombre ASC
                    LIMIT {$perPage} OFFSET {$offset}";

            $stmt = $this->db->prepare($sql);
            $stmt->execute($binds);
            $productos = $stmt->fetchAll();
        } catch (\PDOException $e) {
            $sql = "SELECT p.id, p.nombre, p.variante, p.sku, p.descripcion, p.tipo,
                           p.precio_venta, p.precio_costo, p.precio_mayorista, p.precio_oferta, p.stock_actual, p.stock_minimo,
                           p.unidad_medida, p.imagen_url, p.imagenes, p.archivo_url, p.piezas, p.activo,
                           p.es_vendible, p.es_insumo, p.es_tienda, p.sync_mercadolibre, p.es_destacado, p.subcategoria,
                           p.seo_title, p.seo_description, p.created_at, p.updated_at,
                           c.id AS categoria_id, c.nombre AS categoria_nombre,
                           p.categoria_secundaria_id, c_sec.nombre AS categoria_secundaria_nombre
                    FROM productos p
                    LEFT JOIN categorias_producto c ON c.id = p.categoria_id
                    LEFT JOIN categorias_producto c_sec ON c_sec.id = p.categoria_secundaria_id
                    {$where}
                    ORDER BY p.nombre ASC
                    LIMIT {$perPage} OFFSET {$offset}";

            $stmt = $this->db->prepare($sql);
            $stmt->execute($binds);
            $productos = $stmt->fetchAll();
        }

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

        foreach ($productos as &$p) {
            if (!empty($p['imagenes'])) {
                $dec = is_string($p['imagenes']) ? json_decode($p['imagenes'], true) : $p['imagenes'];
                $p['imagenes'] = is_array($dec) ? $dec : (!empty($p['imagen_url']) ? [$p['imagen_url']] : []);
            } else {
                $p['imagenes'] = !empty($p['imagen_url']) ? [$p['imagen_url']] : [];
            }

            if (!empty($p['piezas'])) {
                $decP = is_string($p['piezas']) ? json_decode($p['piezas'], true) : $p['piezas'];
                $p['piezas'] = is_array($decP) ? array_values($decP) : [];
            } else {
                $p['piezas'] = [];
            }

            if (!empty($p['precios_cantidad'])) {
                $decPC = is_string($p['precios_cantidad']) ? json_decode($p['precios_cantidad'], true) : $p['precios_cantidad'];
                $p['precios_cantidad'] = is_array($decPC) ? array_values($decPC) : [];
            } else {
                $p['precios_cantidad'] = [];
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
            "SELECT p.*, c.nombre AS categoria_nombre, c_sec.nombre AS categoria_secundaria_nombre
             FROM productos p
             LEFT JOIN categorias_producto c ON c.id = p.categoria_id
             LEFT JOIN categorias_producto c_sec ON c_sec.id = p.categoria_secundaria_id
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

        if (!empty($producto['imagenes'])) {
            $dec = is_string($producto['imagenes']) ? json_decode($producto['imagenes'], true) : $producto['imagenes'];
            $producto['imagenes'] = is_array($dec) ? $dec : (!empty($producto['imagen_url']) ? [$producto['imagen_url']] : []);
        } else {
            $producto['imagenes'] = !empty($producto['imagen_url']) ? [$producto['imagen_url']] : [];
        }

        if (!empty($producto['piezas'])) {
            $decP = is_string($producto['piezas']) ? json_decode($producto['piezas'], true) : $producto['piezas'];
            $producto['piezas'] = is_array($decP) ? array_values($decP) : [];
        } else {
            $producto['piezas'] = [];
        }

        if (!empty($producto['precios_cantidad'])) {
            $decPC = is_string($producto['precios_cantidad']) ? json_decode($producto['precios_cantidad'], true) : $producto['precios_cantidad'];
            $producto['precios_cantidad'] = is_array($decPC) ? array_values($decPC) : [];
        } else {
            $producto['precios_cantidad'] = [];
        }

        return $producto;
    }

    public function create(array $data): array
    {
        $sku = !empty(trim((string)($data['sku'] ?? ''))) ? trim($data['sku']) : null;
        $imagenesJson = null;
        if (isset($data['imagenes'])) {
            $imgs = is_array($data['imagenes']) ? $data['imagenes'] : json_decode((string)$data['imagenes'], true);
            if (is_array($imgs)) {
                $imagenesJson = json_encode(array_values(array_slice($imgs, 0, 5)));
                if (empty($data['imagen_url']) && !empty($imgs[0])) {
                    $data['imagen_url'] = $imgs[0];
                }
            }
        }

        $piezasJson = null;
        if (isset($data['piezas'])) {
            $pz = is_array($data['piezas']) ? $data['piezas'] : json_decode((string)$data['piezas'], true);
            if (is_array($pz)) {
                $piezasJson = json_encode(array_values($pz));
            }
        }

        $preciosCantidadJson = null;
        if (isset($data['precios_cantidad'])) {
            $pc = is_array($data['precios_cantidad']) ? $data['precios_cantidad'] : json_decode((string)$data['precios_cantidad'], true);
            if (is_array($pc)) {
                $validPc = array_values(array_filter($pc, function ($item) {
                    return is_array($item) && isset($item['cantidad']) && isset($item['precio']) && (float)$item['cantidad'] > 0 && (float)$item['precio'] >= 0;
                }));
                usort($validPc, function ($a, $b) {
                    return ((float)$a['cantidad']) <=> ((float)$b['cantidad']);
                });
                $preciosCantidadJson = json_encode($validPc);
            }
        }

        try {
            $stmt = $this->db->prepare(
                "INSERT INTO productos
                    (nombre, variante, sku, descripcion, tipo, categoria_id, categoria_secundaria_id, precio_venta, precio_costo, precio_mayorista,
                     stock_actual, stock_minimo, unidad_medida, imagen_url, imagenes, archivo_url,
                     es_vendible, es_insumo, es_tienda, sync_mercadolibre, subcategoria, precio_oferta, peso_gramos, horas_impresion, alto_mm, ancho_mm, profundidad_mm, dimensiones, estado_stock, es_destacado, piezas, precios_cantidad, seo_title, seo_description, activo, created_at, updated_at)
                  VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1, NOW(), NOW())"
            );

            $initStock = (int) ($data['stock_actual'] ?? 0);
            $initEstadoStock = $data['estado_stock'] ?? ($initStock > 0 ? 'ready' : 'custom');
            if ($initStock <= 0) {
                $initEstadoStock = 'custom';
            }

            $catSecId = isset($data['categoria_secundaria_id']) && $data['categoria_secundaria_id'] !== '' ? (int)$data['categoria_secundaria_id'] : null;

            $stmt->execute([
                trim($data['nombre']),
                $data['variante']      ?? null,
                $sku,
                $data['descripcion']   ?? null,
                $data['tipo']          ?? 'impresion_3d',
                $data['categoria_id']  ?? null,
                $catSecId,
                (float) ($data['precio_venta']  ?? 0),
                (float) ($data['precio_costo']  ?? 0),
                isset($data['precio_mayorista']) ? (float)$data['precio_mayorista'] : null,
                $initStock,
                (int)   ($data['stock_minimo']  ?? 0),
                $data['unidad_medida'] ?? 'unidad',
                $data['imagen_url']    ?? null,
                $imagenesJson,
                $data['archivo_url']   ?? null,
                isset($data['es_vendible']) ? (int)$data['es_vendible'] : 1,
                isset($data['es_insumo']) ? (int)$data['es_insumo'] : 0,
                isset($data['es_tienda']) ? (int)$data['es_tienda'] : 0,
                isset($data['sync_mercadolibre']) ? (int)$data['sync_mercadolibre'] : 0,
                $data['subcategoria']  ?? null,
                isset($data['precio_oferta']) ? (float)$data['precio_oferta'] : null,
                (int) ($data['peso_gramos'] ?? 0),
                (float) ($data['horas_impresion'] ?? 0),
                (float) ($data['alto_mm'] ?? 0),
                (float) ($data['ancho_mm'] ?? 0),
                (float) ($data['profundidad_mm'] ?? 0),
                $data['dimensiones']   ?? null,
                $initEstadoStock,
                isset($data['es_destacado']) ? (int)$data['es_destacado'] : 0,
                $piezasJson,
                $preciosCantidadJson,
                $data['seo_title']     ?? null,
                $data['seo_description'] ?? null,
            ]);
        } catch (\PDOException $e) {
            // No guardar una versión incompleta que descarte piezas, costos o datos de impresión.
            throw $e;
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
            'categoria_secundaria_id' => 'int',
            'precio_venta'  => 'float',
            'precio_costo'  => 'float',
            'precio_mayorista' => 'float',
            'stock_actual'  => 'float',
            'stock_minimo'  => 'float',
            'unidad_medida' => 'string',
            'imagen_url'    => 'string',
            'imagenes'      => 'json',
            'es_vendible'   => 'int',
            'es_insumo'     => 'int',
            'es_tienda'     => 'int',
            'sync_mercadolibre' => 'int',
            'subcategoria'  => 'string',
            'precio_oferta' => 'float',
            'peso_gramos'   => 'int',
            'horas_impresion' => 'float',
            'alto_mm'       => 'float',
            'ancho_mm'      => 'float',
            'profundidad_mm' => 'float',
            'dimensiones'   => 'string',
            'estado_stock'  => 'string',
            'es_destacado'  => 'int',
            'archivo_url'   => 'string',
            'colores'       => 'json',
            'piezas'        => 'json',
            'precios_cantidad' => 'json',
            'seo_title'     => 'string',
            'seo_description' => 'string',
        ];

        // Registrar ajuste en historial si se modificó el stock_actual
        if (array_key_exists('stock_actual', $data)) {
            $currentStock = (float) ($current['stock_actual'] ?? 0);
            $newStock     = (float) $data['stock_actual'];
            if ($newStock <= 0 && (!isset($data['estado_stock']) || $data['estado_stock'] === 'ready')) {
                $data['estado_stock'] = 'custom';
            }
            $delta        = $newStock - $currentStock;
            if (abs($delta) > 0.0001) {
                $notas = $data['motivo_ajuste'] ?? ($data['notas_stock'] ?? 'Ajuste manual de stock');
                try {
                    $stmtMov = $this->db->prepare(
                        "INSERT INTO movimientos_stock (producto_id, cantidad, tipo_movimiento, notas) VALUES (?, ?, 'ajuste_manual', ?)"
                    );
                    $stmtMov->execute([$id, $delta, $notas]);
                } catch (\Throwable $e) {
                    error_log("Error al registrar movimiento_stock: " . $e->getMessage());
                }
            }
        }

        foreach ($map as $col => $type) {
            if (array_key_exists($col, $data)) {
                $fields[] = "{$col} = ?";
                $val      = $data[$col];
                if ($val === null) {
                    $binds[] = null;
                } else {
                    if ($col === 'imagenes') {
                        $binds[] = is_array($val) ? json_encode(array_values(array_slice($val, 0, 5))) : (empty($val) ? null : (string)$val);
                    } elseif ($col === 'precios_cantidad') {
                        $pc = is_array($val) ? $val : json_decode((string)$val, true);
                        if (is_array($pc)) {
                            $validPc = array_values(array_filter($pc, function ($item) {
                                return is_array($item) && isset($item['cantidad']) && isset($item['precio']) && (float)$item['cantidad'] > 0 && (float)$item['precio'] >= 0;
                            }));
                            usort($validPc, function ($a, $b) {
                                return ((float)$a['cantidad']) <=> ((float)$b['cantidad']);
                            });
                            $binds[] = json_encode($validPc);
                        } else {
                            $binds[] = null;
                        }
                    } else {
                        $binds[] = match ($type) {
                            'int'   => (int) $val,
                            'float' => (float) $val,
                            'json'  => is_array($val) ? json_encode(array_values($val)) : (empty($val) ? null : (string)$val),
                            default => (string) $val,
                        };
                    }
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

    public function getMovimientos(int $productoId): array
    {
        try {
            $stmt = $this->db->prepare(
                "SELECT id, producto_id, cantidad, tipo_movimiento, referencia_id, notas, created_at 
                 FROM movimientos_stock 
                 WHERE producto_id = ? 
                 ORDER BY created_at DESC, id DESC"
            );
            $stmt->execute([$productoId]);
            return $stmt->fetchAll(\PDO::FETCH_ASSOC);
        } catch (\Throwable $e) {
            return [];
        }
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
            $this->db->prepare("UPDATE productos SET estado_stock = 'custom' WHERE id = ? AND stock_actual <= 0")->execute([$id]);
        } else {
            $stmt = $this->db->prepare(
                "UPDATE productos SET stock_actual = stock_actual + ?, updated_at = NOW() WHERE id = ?"
            );
            $stmt->execute([$delta, $id]);
        }
        return $stmt->rowCount() > 0;
    }
}
