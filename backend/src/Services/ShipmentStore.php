<?php

declare(strict_types=1);

namespace App\Services;

use DomainException;
use PDO;

final class ShipmentStore
{
    private const COLUMNS = 'ref, pedido_id, origen, datos, expira, lease_until, importado, seguimiento, etiqueta_at';

    public function __construct(private PDO $db)
    {
        $mysql = $db->getAttribute(PDO::ATTR_DRIVER_NAME) === 'mysql';
        $pdfType = $mysql ? 'MEDIUMBLOB' : 'BLOB';
        $suffix = $mysql ? ', INDEX envios_expira (expira)) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4' : ')';
        $db->exec("CREATE TABLE IF NOT EXISTS envios_3ld (
            ref VARCHAR(20) PRIMARY KEY, pedido_id BIGINT NULL UNIQUE,
            origen VARCHAR(12) NOT NULL, datos TEXT NOT NULL, expira BIGINT NULL,
            lease_until BIGINT NOT NULL DEFAULT 0, importado BIGINT NULL,
            seguimiento VARCHAR(80) NULL, etiqueta_at BIGINT NULL, etiqueta $pdfType NULL" . $suffix);
    }

    public function order(int $id): ?array
    {
        $query = $this->db->prepare('SELECT p.id, p.estado, p.numero_pedido, c.nombre, c.email, c.telefono FROM pedidos p LEFT JOIN clientes c ON c.id = p.cliente_id WHERE p.id = ?');
        $query->execute([$id]);
        return $query->fetch(PDO::FETCH_ASSOC) ?: null;
    }

    public function create(array $data, string $source, ?int $orderId = null): array
    {
        if ($source === 'whatsapp') {
            $this->db->prepare('DELETE FROM envios_3ld WHERE expira < ?')->execute([time()]);
        }
        $ref = strtoupper(bin2hex(random_bytes(10)));
        $this->db->prepare('INSERT INTO envios_3ld (ref,pedido_id,origen,datos,expira) VALUES (?,?,?,?,?)')->execute([
            $ref, $orderId, $source, json_encode($data, JSON_THROW_ON_ERROR | JSON_UNESCAPED_UNICODE),
            $source === 'whatsapp' ? time() + 7 * 86400 : null,
        ]);
        return $this->find('ref', $ref);
    }

    public function find(string $field, string|int $value): ?array
    {
        $column = $field === 'pedido_id' ? 'pedido_id' : 'ref';
        $query = $this->db->prepare('SELECT ' . self::COLUMNS . " FROM envios_3ld WHERE $column = ? AND (expira IS NULL OR expira >= ?)");
        $query->execute([$value, time()]);
        $row = $query->fetch(PDO::FETCH_ASSOC);
        if (!$row) {
            return null;
        }
        return [
            'ref' => $row['ref'], 'order_id' => $row['pedido_id'] === null ? null : (int) $row['pedido_id'],
            'source' => $row['origen'], 'data' => json_decode($row['datos'], true, 512, JSON_THROW_ON_ERROR),
            'busy' => (int) $row['lease_until'] > time(), 'imported' => $row['importado'] !== null,
            'tracking' => $row['seguimiento'], 'has_label' => $row['etiqueta_at'] !== null,
        ];
    }

    public function link(string $ref, int $orderId): void
    {
        $query = $this->db->prepare('UPDATE envios_3ld SET pedido_id = ?, expira = NULL WHERE ref = ? AND (pedido_id IS NULL OR pedido_id = ?) AND (expira IS NULL OR expira >= ?) AND lease_until <= ?');
        $query->execute([$orderId, $ref, $orderId, time(), time()]);
        if (!$query->rowCount() && ($this->find('ref', $ref)['order_id'] ?? null) !== $orderId) {
            throw new DomainException('La referencia venció o está vinculada a otro pedido.');
        }
    }

    public function update(string $ref, array $data): void
    {
        $query = $this->db->prepare('UPDATE envios_3ld SET datos = ?, expira = NULL WHERE ref = ? AND importado IS NULL AND etiqueta_at IS NULL AND lease_until <= ? AND (expira IS NULL OR expira >= ?)');
        $query->execute([json_encode($data, JSON_THROW_ON_ERROR | JSON_UNESCAPED_UNICODE), $ref, time(), time()]);
        if (!$query->rowCount()) {
            $row = $this->find('ref', $ref);
            if (!$row || $row['busy'] || $row['imported'] || $row['has_label']) {
                throw new DomainException('El envío no se puede editar en su estado actual.');
            }
        }
    }

    public function claim(string $ref): bool
    {
        $query = $this->db->prepare('UPDATE envios_3ld SET lease_until = ? WHERE ref = ? AND importado IS NULL AND etiqueta_at IS NULL AND lease_until <= ? AND (expira IS NULL OR expira >= ?)');
        $now = time();
        $query->execute([$now + 90, $ref, $now, $now]);
        return $query->rowCount() === 1;
    }

    public function finish(string $ref, bool $imported): void
    {
        if ($imported) {
            $this->db->prepare('UPDATE envios_3ld SET lease_until = 0, importado = ?, expira = NULL WHERE ref = ?')->execute([time(), $ref]);
        } else {
            $this->db->prepare('UPDATE envios_3ld SET lease_until = 0 WHERE ref = ?')->execute([$ref]);
        }
    }

    public function attachLabel(string $ref, string $tracking, string $pdf): void
    {
        $query = $this->db->prepare('UPDATE envios_3ld SET etiqueta = ?, etiqueta_at = ?, seguimiento = ?, expira = NULL WHERE ref = ? AND lease_until <= ? AND (expira IS NULL OR expira >= ?)');
        $query->bindValue(1, $pdf, PDO::PARAM_LOB);
        $query->bindValue(2, time(), PDO::PARAM_INT);
        $query->bindValue(3, $tracking);
        $query->bindValue(4, $ref);
        $query->bindValue(5, time(), PDO::PARAM_INT);
        $query->bindValue(6, time(), PDO::PARAM_INT);
        $query->execute();
        if (!$query->rowCount()) {
            throw new DomainException('No se pudo guardar el rótulo mientras el envío se está preparando.');
        }
    }

    public function label(string $ref): ?string
    {
        $query = $this->db->prepare('SELECT etiqueta FROM envios_3ld WHERE ref = ? AND etiqueta_at IS NOT NULL');
        $query->execute([$ref]);
        $pdf = $query->fetchColumn();
        return is_string($pdf) ? $pdf : null;
    }
}