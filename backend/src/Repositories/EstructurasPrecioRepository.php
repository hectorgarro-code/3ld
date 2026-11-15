<?php

declare(strict_types=1);

namespace App\Repositories;

use PDO;

class EstructurasPrecioRepository
{
    private PDO $db;

    public function __construct(PDO $db)
    {
        $this->db = $db;
        $this->ensureSchema();
    }

    private function mysql(): bool
    {
        return $this->db->getAttribute(PDO::ATTR_DRIVER_NAME) === 'mysql';
    }

    private function ensureSchema(): void
    {
        $suffix = $this->mysql() ? ' ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci' : '';
        $this->db->exec("
            CREATE TABLE IF NOT EXISTS estructuras_precio_cantidad (
                id INT AUTO_INCREMENT PRIMARY KEY,
                nombre VARCHAR(120) NOT NULL UNIQUE,
                escalas TEXT NOT NULL,
                created_at DATETIME NOT NULL,
                updated_at DATETIME NOT NULL
            ) {$suffix}
        ");

        // Agregar columna estructura_precio_id a productos si no existe
        try {
            $cols = $this->db->query("SHOW COLUMNS FROM productos LIKE 'estructura_precio_id'")->fetchAll();
            if (empty($cols)) {
                $this->db->exec("ALTER TABLE productos ADD COLUMN estructura_precio_id INT NULL AFTER precios_cantidad");
            }
        } catch (\Throwable $e) {}
    }

    public function getAll(): array
    {
        $sql = "
            SELECT e.id, e.nombre, e.escalas, e.created_at, e.updated_at,
                   (SELECT COUNT(*) FROM productos p WHERE p.estructura_precio_id = e.id AND p.activo = 1) AS productos_count
            FROM estructuras_precio_cantidad e
            ORDER BY e.nombre ASC
        ";
        $stmt = $this->db->query($sql);
        $rows = $stmt->fetchAll(PDO::FETCH_ASSOC) ?: [];

        foreach ($rows as &$r) {
            $r['id'] = (int)$r['id'];
            $r['productos_count'] = (int)$r['productos_count'];
            $dec = is_string($r['escalas']) ? json_decode($r['escalas'], true) : $r['escalas'];
            $r['escalas'] = is_array($dec) ? array_values($dec) : [];
        }

        return $rows;
    }

    public function findById(int $id): ?array
    {
        $stmt = $this->db->prepare("
            SELECT e.id, e.nombre, e.escalas, e.created_at, e.updated_at,
                   (SELECT COUNT(*) FROM productos p WHERE p.estructura_precio_id = e.id AND p.activo = 1) AS productos_count
            FROM estructuras_precio_cantidad e
            WHERE e.id = ?
        ");
        $stmt->execute([$id]);
        $row = $stmt->fetch(PDO::FETCH_ASSOC);
        if (!$row) return null;

        $row['id'] = (int)$row['id'];
        $row['productos_count'] = (int)$row['productos_count'];
        $dec = is_string($row['escalas']) ? json_decode($row['escalas'], true) : $row['escalas'];
        $row['escalas'] = is_array($dec) ? array_values($dec) : [];

        return $row;
    }

    public function save(string $nombre, array $escalas, ?int $id = null): array
    {
        $cleanEscalas = array_values(array_filter($escalas, function ($e) {
            return !empty($e['cantidad']) && (int)$e['cantidad'] > 0 && isset($e['precio']) && (float)$e['precio'] >= 0;
        }));

        usort($cleanEscalas, fn($a, $b) => (int)$a['cantidad'] <=> (int)$b['cantidad']);
        $jsonEscalas = json_encode($cleanEscalas, JSON_UNESCAPED_UNICODE);

        if ($id && $id > 0) {
            $stmt = $this->db->prepare("
                UPDATE estructuras_precio_cantidad 
                SET nombre = ?, escalas = ?, updated_at = NOW() 
                WHERE id = ?
            ");
            $stmt->execute([trim($nombre), $jsonEscalas, $id]);
            return $this->findById($id);
        } else {
            // Verificar si existe por nombre
            $check = $this->db->prepare("SELECT id FROM estructuras_precio_cantidad WHERE nombre = ?");
            $check->execute([trim($nombre)]);
            $existingId = $check->fetchColumn();

            if ($existingId) {
                $stmt = $this->db->prepare("
                    UPDATE estructuras_precio_cantidad 
                    SET escalas = ?, updated_at = NOW() 
                    WHERE id = ?
                ");
                $stmt->execute([$jsonEscalas, (int)$existingId]);
                return $this->findById((int)$existingId);
            }

            $stmt = $this->db->prepare("
                INSERT INTO estructuras_precio_cantidad (nombre, escalas, created_at, updated_at) 
                VALUES (?, ?, NOW(), NOW())
            ");
            $stmt->execute([trim($nombre), $jsonEscalas]);
            $newId = (int)$this->db->lastInsertId();
            return $this->findById($newId);
        }
    }

    public function delete(int $id): bool
    {
        // Desvincular productos antes de borrar
        try {
            $stUnlink = $this->db->prepare("UPDATE productos SET estructura_precio_id = NULL WHERE estructura_precio_id = ?");
            $stUnlink->execute([$id]);
        } catch (\Throwable $e) {}

        $stmt = $this->db->prepare("DELETE FROM estructuras_precio_cantidad WHERE id = ?");
        return $stmt->execute([$id]);
    }

    /**
     * Devuelve los productos asociados a una estructura, o todos los productos si estructuraId <= 0
     */
    public function getProductosByEstructura(int $estructuraId): array
    {
        if ($estructuraId > 0) {
            $stmt = $this->db->prepare("
                SELECT p.id, p.nombre, p.sku, p.precio_venta, p.precio_costo, p.imagen_url, p.imagenes, 
                       p.precios_cantidad, p.estructura_precio_id, p.categoria_id, c.nombre AS categoria_nombre
                FROM productos p
                LEFT JOIN categorias_producto c ON c.id = p.categoria_id
                WHERE p.estructura_precio_id = ? AND p.activo = 1
                ORDER BY p.nombre ASC
            ");
            $stmt->execute([$estructuraId]);
        } else {
            $stmt = $this->db->prepare("
                SELECT p.id, p.nombre, p.sku, p.precio_venta, p.precio_costo, p.imagen_url, p.imagenes, 
                       p.precios_cantidad, p.estructura_precio_id, p.categoria_id, c.nombre AS categoria_nombre
                FROM productos p
                LEFT JOIN categorias_producto c ON c.id = p.categoria_id
                WHERE p.activo = 1
                ORDER BY p.nombre ASC
            ");
            $stmt->execute();
        }
        $rows = $stmt->fetchAll(PDO::FETCH_ASSOC) ?: [];

        foreach ($rows as &$r) {
            $r['id'] = (int)$r['id'];
            $r['precio_venta'] = (float)$r['precio_venta'];
            $r['categoria_id'] = $r['categoria_id'] !== null ? (int)$r['categoria_id'] : null;
            $r['estructura_precio_id'] = $r['estructura_precio_id'] !== null ? (int)$r['estructura_precio_id'] : null;
            $dec = is_string($r['precios_cantidad']) ? json_decode($r['precios_cantidad'], true) : $r['precios_cantidad'];
            $r['precios_cantidad'] = is_array($dec) ? array_values($dec) : [];
        }

        return $rows;
    }

    /**
     * Aplica masivamente una estructura o nuevas escalas a una lista de productos
     */
    public function applyToProducts(int $estructuraId, array $productIds, ?array $customEscalas = null): int
    {
        if (empty($productIds)) return 0;

        $estructura = $this->findById($estructuraId);
        if (!$estructura) return 0;

        $escalas = $customEscalas !== null ? $customEscalas : $estructura['escalas'];

        // Si customEscalas vino con cambios, actualizamos también la estructura
        if ($customEscalas !== null) {
            $this->save($estructura['nombre'], $customEscalas, $estructuraId);
        }

        $jsonEscalas = json_encode($escalas, JSON_UNESCAPED_UNICODE);
        $inClause = implode(',', array_fill(0, count($productIds), '?'));

        $sql = "
            UPDATE productos 
            SET estructura_precio_id = ?, precios_cantidad = ?, updated_at = NOW() 
            WHERE id IN ({$inClause})
        ";

        $stmt = $this->db->prepare($sql);
        $stmt->execute(array_merge([$estructuraId, $jsonEscalas], $productIds));

        return $stmt->rowCount();
    }
}

