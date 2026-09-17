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

        $sql = "SELECT p.id, p.nombre AS title, p.subcategoria, p.descripcion,
                       p.precio_venta AS price, p.precio_oferta AS oldPrice,
                       p.stock_actual, p.estado_stock AS stockStatus,
                       p.imagen_url AS image, p.peso_gramos AS weightGrams,
                       p.dimensiones AS size, p.es_destacado,
                       c.nombre AS category
                FROM productos p
                LEFT JOIN categorias_producto c ON c.id = p.categoria_id
                {$where}
                {$orderBy}";

        $stmt = $this->db->prepare($sql);
        $stmt->execute($binds);
        return $stmt->fetchAll(PDO::FETCH_ASSOC);
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
}
