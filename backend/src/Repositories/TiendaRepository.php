<?php

declare(strict_types=1);

namespace App\Repositories;

use PDO;

class TiendaRepository
{
    private PDO $db;

    public function __construct(PDO $db)
    {
        $this->db = $db;
    }

    /**
     * Obtener productos públicos para la tienda (es_tienda = 1 y activo = 1)
     */
    public function getProductosPublicos(array $params = []): array
    {
        $q = $params['q'] ?? '';
        $categoria = $params['categoria'] ?? '';
        $subcategory = $params['subcategoria'] ?? '';
        $stockStatus = $params['stock_status'] ?? '';
        $sort = $params['sort'] ?? 'featured';

        $where = "WHERE p.activo = 1 AND (p.es_tienda = 1 OR p.es_vendible = 1)";
        $binds = [];

        if (!empty($q)) {
            $where .= " AND (p.nombre LIKE ? OR p.descripcion LIKE ? OR p.subcategoria LIKE ?)";
            $like = "%{$q}%";
            $binds = array_merge($binds, [$like, $like, $like]);
        }

        if (!empty($categoria) && $categoria !== 'all') {
            $where .= " AND (c.nombre LIKE ? OR c.slug LIKE ?)";
            $binds[] = "%{$categoria}%";
            $binds[] = "%{$categoria}%";
        }

        if (!empty($subcategory) && $subcategory !== 'all') {
            $where .= " AND p.subcategoria = ?";
            $binds[] = $subcategory;
        }

        if (!empty($stockStatus) && $stockStatus !== 'all') {
            $where .= " AND p.estado_stock = ?";
            $binds[] = $stockStatus;
        }

        $orderBy = "ORDER BY p.es_destacado DESC, p.id DESC";
        if ($sort === 'price-asc') {
            $orderBy = "ORDER BY p.precio_venta ASC";
        } elseif ($sort === 'price-desc') {
            $orderBy = "ORDER BY p.precio_venta DESC";
        } elseif ($sort === 'name-asc') {
            $orderBy = "ORDER BY p.nombre ASC";
        }

        try {
            $sql = "SELECT p.id, p.nombre AS title, p.subcategoria, p.descripcion,
                           p.precio_venta AS price, p.precio_oferta AS oldPrice,
                           p.stock_actual, p.estado_stock AS stockStatus,
                           p.imagen_url AS image, p.imagenes, p.peso_gramos AS weightGrams,
                           p.dimensiones AS size, p.es_destacado,
                           p.categoria_id,
                           COALESCE(c.nombre, 'Sin categoría') AS category
                    FROM productos p
                    LEFT JOIN categorias_producto c ON c.id = p.categoria_id
                    {$where}
                    {$orderBy}";

            $stmt = $this->db->prepare($sql);
            $stmt->execute($binds);
            $items = $stmt->fetchAll(PDO::FETCH_ASSOC);
            foreach ($items as &$item) {
                if (!empty($item['imagenes'])) {
                    $dec = is_string($item['imagenes']) ? json_decode($item['imagenes'], true) : $item['imagenes'];
                    $item['images'] = is_array($dec) ? $dec : (!empty($item['image']) ? [$item['image']] : []);
                } else {
                    $item['images'] = !empty($item['image']) ? [$item['image']] : [];
                }
            }
            return $items;
        } catch (\PDOException $e) {
            $fallbackSql = "SELECT p.id, p.nombre AS title, '' AS subcategoria, p.descripcion,
                                   p.precio_venta AS price, NULL AS oldPrice,
                                   p.stock_actual, 'ready' AS stockStatus,
                                   p.imagen_url AS image, p.imagenes, 50 AS weightGrams,
                                   NULL AS size, 0 AS es_destacado,
                                   c.nombre AS category
                            FROM productos p
                            LEFT JOIN categorias_producto c ON c.id = p.categoria_id
                            WHERE p.activo = 1 AND p.es_vendible = 1
                            ORDER BY p.id DESC";
            $stmt = $this->db->prepare($fallbackSql);
            $stmt->execute();
            $items = $stmt->fetchAll(PDO::FETCH_ASSOC);
            foreach ($items as &$item) {
                if (!empty($item['imagenes'])) {
                    $dec = is_string($item['imagenes']) ? json_decode($item['imagenes'], true) : $item['imagenes'];
                    $item['images'] = is_array($dec) ? $dec : (!empty($item['image']) ? [$item['image']] : []);
                } else {
                    $item['images'] = !empty($item['image']) ? [$item['image']] : [];
                }
            }
            return $items;
        }
    }

    /**
     * Alternar estado es_tienda de un producto
     */
    public function toggleTiendaStatus(int $id, bool $esTienda): bool
    {
        $stmt = $this->db->prepare("UPDATE productos SET es_tienda = ?, updated_at = NOW() WHERE id = ?");
        return $stmt->execute([$esTienda ? 1 : 0, $id]);
    }

    /**
     * Acciones masivas sobre productos
     */
    public function bulkUpdate(array $ids, string $action, array $params): bool
    {
        if (empty($ids)) {
            return false;
        }

        $inClause = implode(',', array_fill(0, count($ids), '?'));

        switch ($action) {
            case 'visibility':
                $esTienda = !empty($params['es_tienda']) ? 1 : 0;
                $sql = "UPDATE productos SET es_tienda = ?, updated_at = NOW() WHERE id IN ({$inClause})";
                $stmt = $this->db->prepare($sql);
                return $stmt->execute(array_merge([$esTienda], $ids));

            case 'category':
                $categoriaId = isset($params['categoria_id']) && $params['categoria_id'] !== '' ? (int)$params['categoria_id'] : null;
                $subcategoria = $params['subcategoria'] ?? null;
                
                $setParts = [];
                $binds = [];
                if ($categoriaId !== null) {
                    $setParts[] = "categoria_id = ?";
                    $binds[] = $categoriaId;
                }
                if ($subcategoria !== null) {
                    $setParts[] = "subcategoria = ?";
                    $binds[] = $subcategoria;
                }
                if (empty($setParts)) {
                    return false;
                }
                $setParts[] = "updated_at = NOW()";
                $sql = "UPDATE productos SET " . implode(', ', $setParts) . " WHERE id IN ({$inClause})";
                $stmt = $this->db->prepare($sql);
                return $stmt->execute(array_merge($binds, $ids));

            case 'prices':
                $mode = $params['mode'] ?? 'percentage'; // 'percentage' | 'fixed'
                $value = (float)($params['value'] ?? 0);
                if ($mode === 'percentage') {
                    $multiplier = 1 + ($value / 100);
                    $sql = "UPDATE productos SET precio_venta = GREATEST(0, ROUND(precio_venta * ?, 2)), updated_at = NOW() WHERE id IN ({$inClause})";
                    $stmt = $this->db->prepare($sql);
                    return $stmt->execute(array_merge([$multiplier], $ids));
                } else {
                    $sql = "UPDATE productos SET precio_venta = GREATEST(0, ?), updated_at = NOW() WHERE id IN ({$inClause})";
                    $stmt = $this->db->prepare($sql);
                    return $stmt->execute(array_merge([$value], $ids));
                }

            case 'offers':
                $mode = $params['mode'] ?? 'clear'; // 'percentage' | 'fixed' | 'clear'
                if ($mode === 'clear') {
                    $sql = "UPDATE productos SET precio_oferta = NULL, updated_at = NOW() WHERE id IN ({$inClause})";
                    $stmt = $this->db->prepare($sql);
                    return $stmt->execute($ids);
                } elseif ($mode === 'percentage') {
                    $discountPct = (float)($params['value'] ?? 0); // e.g. 10 means 10% off
                    $multiplier = 1 - ($discountPct / 100);
                    $sql = "UPDATE productos SET precio_oferta = GREATEST(0, ROUND(precio_venta * ?, 2)), updated_at = NOW() WHERE id IN ({$inClause})";
                    $stmt = $this->db->prepare($sql);
                    return $stmt->execute(array_merge([$multiplier], $ids));
                } else {
                    $value = (float)($params['value'] ?? 0);
                    $sql = "UPDATE productos SET precio_oferta = GREATEST(0, ?), updated_at = NOW() WHERE id IN ({$inClause})";
                    $stmt = $this->db->prepare($sql);
                    return $stmt->execute(array_merge([$value], $ids));
                }

            case 'stock':
                $mode = $params['mode'] ?? 'add'; // 'add' | 'fixed'
                $value = (float)($params['value'] ?? 0);
                if ($mode === 'add') {
                    $sql = "UPDATE productos SET stock_actual = GREATEST(0, stock_actual + ?), updated_at = NOW() WHERE id IN ({$inClause})";
                    $stmt = $this->db->prepare($sql);
                    return $stmt->execute(array_merge([$value], $ids));
                } else {
                    $sql = "UPDATE productos SET stock_actual = GREATEST(0, ?), updated_at = NOW() WHERE id IN ({$inClause})";
                    $stmt = $this->db->prepare($sql);
                    return $stmt->execute(array_merge([$value], $ids));
                }
        }

        return false;
    }

    /**
     * Actualizar detalles específicos de la tienda en un producto
     */
    public function updateTiendaProduct(int $id, array $data): bool
    {
        $sql = "UPDATE productos SET 
                    subcategoria = ?,
                    precio_venta = ?,
                    precio_oferta = ?,
                    stock_actual = ?,
                    estado_stock = ?,
                    peso_gramos = ?,
                    dimensiones = ?,
                    es_tienda = ?,
                    es_destacado = ?,
                    updated_at = NOW()
                WHERE id = ?";
        
        $stmt = $this->db->prepare($sql);
        return $stmt->execute([
            $data['subcategoria'] ?? null,
            $data['price'] ?? 0,
            $data['oldPrice'] ?? null,
            $data['stock_actual'] ?? 0,
            $data['stockStatus'] ?? 'ready',
            $data['weightGrams'] ?? 50,
            $data['size'] ?? null,
            isset($data['es_tienda']) ? ($data['es_tienda'] ? 1 : 0) : 1,
            isset($data['es_destacado']) ? ($data['es_destacado'] ? 1 : 0) : 0,
            $id
        ]);
    }

    /**
     * Obtener categorías públicas de la tienda con sus íconos y subcategorías
     */
    public function getCategoriasPublicas(): array
    {
        try {
            $sql = "SELECT c.id, c.nombre AS name, COALESCE(c.icono, '✨') AS icon, c.es_destacada,
                           (SELECT COUNT(*) FROM productos p WHERE p.categoria_id = c.id AND p.activo = 1 AND p.es_tienda = 1) AS productos_count
                    FROM categorias_producto c
                    ORDER BY c.es_destacada DESC, c.nombre ASC";
            $stmt = $this->db->prepare($sql);
            $stmt->execute();
            $cats = $stmt->fetchAll(PDO::FETCH_ASSOC);

            $result = [];
            foreach ($cats as $cat) {
                $catId = (int)$cat['id'];
                $subs = [];
                try {
                    $subStmt = $this->db->prepare("SELECT DISTINCT subcategoria FROM productos WHERE categoria_id = ? AND subcategoria IS NOT NULL AND subcategoria != '' AND activo = 1 AND es_tienda = 1");
                    $subStmt->execute([$catId]);
                    $subs = $subStmt->fetchAll(PDO::FETCH_COLUMN) ?: [];
                } catch (\Throwable $e) {
                    $subs = [];
                }

                $result[] = [
                    'id' => $cat['name'],
                    'categoria_id' => $catId,
                    'name' => $cat['name'],
                    'icon' => $cat['icon'] ?: '✨',
                    'es_destacada' => (bool)$cat['es_destacada'],
                    'subcategories' => !empty($subs) ? array_merge(['Todos'], $subs) : [],
                    'productos_count' => (int)$cat['productos_count'],
                ];
            }
            return $result;
        } catch (\Throwable $e) {
            return [];
        }
    }
}

