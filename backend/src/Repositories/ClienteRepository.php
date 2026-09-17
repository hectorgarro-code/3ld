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

    public function findAll(array $params = []): array
    {
        $q       = $params['q']        ?? '';
        $page    = max(1, (int) ($params['page']     ?? 1));
        $perPage = min(100, max(1, (int) ($params['per_page'] ?? 15)));
        $offset  = ($page - 1) * $perPage;

        $where = "WHERE c.activo = 1";
        $binds = [];

        if (!empty($q)) {
            $where .= " AND (c.nombre LIKE ? OR c.email LIKE ? OR c.telefono LIKE ? OR c.empresa LIKE ? OR c.cuit LIKE ?)";
            $like   = "%{$q}%";
            $binds  = array_merge($binds, [$like, $like, $like, $like, $like]);
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
                ORDER BY c.nombre ASC
                LIMIT {$perPage} OFFSET {$offset}";

        $stmt = $this->db->prepare($sql);
        $stmt->execute($binds);
        $clientes = $stmt->fetchAll();

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

        $stmtPedidos = $this->db->prepare(
            "SELECT id, numero_pedido, estado, total, saldo_pendiente, created_at
             FROM pedidos
             WHERE cliente_id = ?
             ORDER BY created_at DESC
             LIMIT 10"
        );
        $stmtPedidos->execute([$id]);
        $cliente['ultimos_pedidos'] = $stmtPedidos->fetchAll();

        return $cliente;
    }

    public function create(array $data): array
    {
        $stmt = $this->db->prepare(
            "INSERT INTO clientes (nombre, email, telefono, empresa, cuit, direccion, notas, activo, created_at, updated_at)
             VALUES (?, ?, ?, ?, ?, ?, ?, 1, NOW(), NOW())"
        );
        $stmt->execute([
            trim($data['nombre']),
            $data['email']     ?? null,
            $data['telefono']  ?? null,
            $data['empresa']   ?? null,
            $data['cuit']      ?? null,
            $data['direccion'] ?? null,
            $data['notas']     ?? null,
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
            'nombre'    => 'string',
            'email'     => 'string',
            'telefono'  => 'string',
            'empresa'   => 'string',
            'cuit'      => 'string',
            'direccion' => 'string',
            'notas'     => 'string',
        ];

        foreach ($map as $col => $type) {
            if (array_key_exists($col, $data)) {
                $fields[] = "{$col} = ?";
                $val      = $data[$col];
                $binds[]  = $val !== null ? (string) $val : null;
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

    public function delete(int $id): bool
    {
        $stmt = $this->db->prepare("UPDATE clientes SET activo = 0, updated_at = NOW() WHERE id = ? AND activo = 1");
        $stmt->execute([$id]);
        return $stmt->rowCount() > 0;
    }
}
