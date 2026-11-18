<?php

declare(strict_types=1);

namespace App\Repositories;

use PDO;

class ClienteRepository
{
    private PDO $db;

    public function __construct(PDO $db)
    {
        $this->db = $db;
    }

    private function fiscalIdColumn(): string
    {
        $columns = $this->db->query('SELECT * FROM clientes WHERE 1 = 0');
        for ($index = 0; $index < $columns->columnCount(); $index++) {
            if (($columns->getColumnMeta($index)['name'] ?? null) === 'cuit') {
                return 'cuit';
            }
        }
        return 'dni_cuit';
    }

    public function findAll(array $params = []): array
    {
        $q = is_string($params['q'] ?? null) ? trim($params['q']) : '';
        $order = $params['orden'] ?? '';
        $orderBy = match ($order) {
            'destacados' => 'c.destacado_pos DESC, c.nombre ASC, c.id ASC',
            'pos_default' => "CASE WHEN LOWER(TRIM(c.nombre)) IN ('cons. final', 'cons final', 'consumidor final')
                OR LOWER(c.nombre) LIKE '%consumidor final%' OR LOWER(c.nombre) LIKE '%mostrador%' THEN 0 ELSE 1 END, c.nombre ASC, c.id ASC",
            default => 'c.nombre ASC, c.id ASC',
        };
        $page    = max(1, (int) ($params['page']     ?? 1));
        $perPage = min(100, max(1, (int) ($params['per_page'] ?? 15)));
        $offset  = ($page - 1) * $perPage;

        $where = "WHERE c.activo = 1";
        $binds = [];

        if ($q !== '') {
            $where .= " AND (c.nombre LIKE ? OR c.email LIKE ? OR c.telefono LIKE ?";
            $like = "%{$q}%";
            $binds = [$like, $like, $like];
            if ($order !== 'destacados') {
                $fiscalIdColumn = $this->fiscalIdColumn();
                $where .= " OR c.empresa LIKE ? OR c.{$fiscalIdColumn} LIKE ?";
                $binds[] = $like;
                $binds[] = $like;
            }
            if ($order === 'destacados' && preg_match('/^[+0-9 .()\-]+$/D', $q)) {
                $digits = preg_replace('/\D/', '', $q);
                if ($digits !== '') {
                    $where .= " OR REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(c.telefono, ' ', ''), '-', ''), '(', ''), ')', ''), '+', ''), '.', '') LIKE ?";
                    $binds[] = "%{$digits}%";
                }
            }
            $where .= ')';
        }

        $stmtCount = $this->db->prepare("SELECT COUNT(*) FROM clientes c {$where}");
        $stmtCount->execute($binds);
        $total = (int) $stmtCount->fetchColumn();

        $sql = "SELECT c.*,
                       COUNT(p.id) AS total_pedidos,
                       COALESCE(SUM(p.total), 0) AS total_comprado
                FROM clientes c
                LEFT JOIN pedidos p ON p.cliente_id = c.id
                {$where}
                GROUP BY c.id
                ORDER BY {$orderBy}
                LIMIT {$perPage} OFFSET {$offset}";

        $stmt = $this->db->prepare($sql);
        $stmt->execute($binds);
        $clientes = $stmt->fetchAll();

        foreach ($clientes as &$c) {
            $c['tipo_cliente'] = ($c['tipo_cliente'] ?? '') === 'mayorista' ? 'mayorista' : 'minorista';
            $c['destacado_pos'] = (bool) ($c['destacado_pos'] ?? false);
            $c['cuit'] = $c['cuit'] ?? $c['dni_cuit'] ?? null;
        }
        unset($c);

        return [
            'data' => $clientes,
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
            "SELECT c.*,
                    COUNT(p.id) AS total_pedidos,
                    COALESCE(SUM(p.total), 0) AS total_comprado
             FROM clientes c
             LEFT JOIN pedidos p ON p.cliente_id = c.id
             WHERE c.id = ? AND c.activo = 1
             GROUP BY c.id"
        );
        $stmt->execute([$id]);
        $cliente = $stmt->fetch();

        if (!$cliente) {
            return null;
        }

        $cliente['tipo_cliente'] = ($cliente['tipo_cliente'] ?? '') === 'mayorista' ? 'mayorista' : 'minorista';
        $cliente['destacado_pos'] = (bool) ($cliente['destacado_pos'] ?? false);
        $cliente['cuit'] = $cliente['cuit'] ?? $cliente['dni_cuit'] ?? null;

        try {
            $stmtPE = $this->db->prepare(
                "SELECT pe.producto_id, pe.precio_especial, p.nombre AS producto_nombre, p.sku
                 FROM cliente_precios_especiales pe
                 JOIN productos p ON p.id = pe.producto_id
                 WHERE pe.cliente_id = ?"
            );
            $stmtPE->execute([$id]);
            $cliente['precios_especiales'] = $stmtPE->fetchAll();
        } catch (\Throwable $e) {
            $cliente['precios_especiales'] = [];
        }

        try {
            $stmtPedidos = $this->db->prepare(
                "SELECT id, numero_pedido, estado, total, saldo_pendiente, created_at
                 FROM pedidos
                 WHERE cliente_id = ?
                 ORDER BY created_at DESC
                 LIMIT 10"
            );
            $stmtPedidos->execute([$id]);
            $cliente['ultimos_pedidos'] = $stmtPedidos->fetchAll();
        } catch (\Throwable $e) {
            try {
                $stmtPedidos = $this->db->prepare(
                    "SELECT id, numero_pedido, estado, total, 0 AS saldo_pendiente, created_at
                     FROM pedidos
                     WHERE cliente_id = ?
                     ORDER BY created_at DESC
                     LIMIT 10"
                );
                $stmtPedidos->execute([$id]);
                $cliente['ultimos_pedidos'] = $stmtPedidos->fetchAll();
            } catch (\Throwable $e2) {
                $cliente['ultimos_pedidos'] = [];
            }
        }

        return $cliente;
    }

    public function create(array $data): array
    {
        $tipoRaw = strtolower(trim((string)($data['tipo_cliente'] ?? 'minorista')));
        $tipoCliente = ($tipoRaw === 'mayorista') ? 'mayorista' : 'minorista';

        $fiscalIdColumn = $this->fiscalIdColumn();
        $stmt = $this->db->prepare(
            "INSERT INTO clientes (nombre, email, telefono, empresa, {$fiscalIdColumn}, direccion, notas, tipo_cliente, descuento_porcentaje, activo, created_at, updated_at)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 1, NOW(), NOW())"
        );
        $stmt->execute([
            trim($data['nombre']),
            $data['email']                ?? null,
            $data['telefono']             ?? null,
            $data['empresa']              ?? null,
            $data['cuit']                 ?? null,
            $data['direccion']            ?? null,
            $data['notas']                ?? null,
            $tipoCliente,
            (float)($data['descuento_porcentaje'] ?? 0),
        ]);

        $newId = (int) $this->db->lastInsertId();
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
            'nombre'               => 'string',
            'email'                => 'string',
            'telefono'             => 'string',
            'empresa'              => 'string',
            'cuit'                 => 'string',
            'direccion'            => 'string',
            'notas'                => 'string',
            'tipo_cliente'         => 'string',
            'descuento_porcentaje' => 'float',
            'destacado_pos'        => 'bool',
        ];

        foreach ($map as $col => $type) {
            if (array_key_exists($col, $data)) {
                $column = $col === 'cuit' ? $this->fiscalIdColumn() : $col;
                $fields[] = "{$column} = ?";
                $val      = $data[$col];
                if ($col === 'tipo_cliente') {
                    $tipoRaw = strtolower(trim((string)$val));
                    $binds[] = ($tipoRaw === 'mayorista') ? 'mayorista' : 'minorista';
                } elseif ($type === 'bool') {
                    $binds[] = (int) $val;
                } else {
                    $binds[]  = $val !== null ? ($type === 'float' ? (float)$val : (string)$val) : null;
                }
            }
        }

        if (!empty($fields)) {
            $fields[] = "updated_at = NOW()";
            $binds[]  = $id;
            $sql      = "UPDATE clientes SET " . implode(', ', $fields) . " WHERE id = ?";
            $this->db->prepare($sql)->execute($binds);
        }

        return $this->findById($id);
    }

    public function getPreciosEspeciales(int $clienteId): array
    {
        $stmt = $this->db->prepare(
            "SELECT pe.id, pe.cliente_id, pe.producto_id, pe.precio_especial, p.nombre AS producto_nombre, p.sku, p.precio_venta
             FROM cliente_precios_especiales pe
             JOIN productos p ON p.id = pe.producto_id
             WHERE pe.cliente_id = ?"
        );
        $stmt->execute([$clienteId]);
        return $stmt->fetchAll();
    }

    public function setPrecioEspecial(int $clienteId, int $productoId, float $precio): bool
    {
        $stmt = $this->db->prepare(
            "INSERT INTO cliente_precios_especiales (cliente_id, producto_id, precio_especial)
             VALUES (?, ?, ?)
             ON DUPLICATE KEY UPDATE precio_especial = VALUES(precio_especial)"
        );
        return $stmt->execute([$clienteId, $productoId, $precio]);
    }

    public function deletePrecioEspecial(int $clienteId, int $productoId): bool
    {
        $stmt = $this->db->prepare("DELETE FROM cliente_precios_especiales WHERE cliente_id = ? AND producto_id = ?");
        return $stmt->execute([$clienteId, $productoId]);
    }

    public function delete(int $id): bool
    {
        $stmt = $this->db->prepare("UPDATE clientes SET activo = 0, updated_at = NOW() WHERE id = ? AND activo = 1");
        $stmt->execute([$id]);
        return $stmt->rowCount() > 0;
    }
}
