<?php

declare(strict_types=1);

namespace App\Repositories;

use PDO;

class CotizadorRepository
{
    private PDO $db;

    public function __construct(PDO $db)
    {
        $this->db = $db;
    }

    public function getConfigCostos(): array
    {
        $stmt = $this->db->query("SELECT * FROM config_costos ORDER BY id DESC LIMIT 1");
        $cfg  = $stmt->fetch();

        if (!$cfg) {
            return [
                'precio_kwh'                       => 150.0,
                'valor_hora_operario'              => 1500.0,
                'valor_compra_impresora_promedio'  => 350000.0,
                'vida_util_horas_promedio'         => 10000.0,
                'margen_minimo_pct'                => 20.0,
                'updated_at'                       => null,
            ];
        }

        return $cfg;
    }

    public function getFilamentoInfo(int $filamentoId): ?array
    {
        $stmtFil = $this->db->prepare(
            "SELECT f.id, f.nombre, f.color, '' AS marca,
                    1000 AS peso_total_g, f.precio_compra,
                    ROUND(f.precio_compra / 1000, 4) AS costo_por_gramo
             FROM filamentos f
             WHERE f.id = ? AND f.activo = 1"
        );
        $stmtFil->execute([$filamentoId]);
        $res = $stmtFil->fetch();
        
        return $res ?: null;
    }

    public function guardarCotizacion(array $body, ?int $usuarioId): array
    {
        $stmt = $this->db->prepare(
            "INSERT INTO cotizaciones
                (cliente_id, filamento_id, descripcion,
                 gramos, tiempo_min, multiplicador,
                 costo_material, costo_energia, costo_amortizacion, costo_mano_obra,
                 costo_total, margen_pct, margen, precio_venta,
                 usuario_id, estado, created_at, updated_at)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'borrador', NOW(), NOW())"
        );

        $stmt->execute([
            $body['cliente_id']          ?? null,
            $body['filamento_id']        ?? null,
            $body['descripcion']         ?? null,
            (float) ($body['gramos']     ?? 0),
            (int)   ($body['tiempo_min'] ?? 0),
            (float) ($body['multiplicador']       ?? 1),
            (float) ($body['costo_material']      ?? 0),
            (float) ($body['costo_energia']       ?? 0),
            (float) ($body['costo_amortizacion']  ?? 0),
            (float) ($body['costo_mano_obra']     ?? 0),
            (float) ($body['costo_total']         ?? 0),
            (float) ($body['margen_pct']          ?? 0),
            (float) ($body['margen']              ?? 0),
            (float) $body['precio_venta'],
            $usuarioId,
        ]);

        $newId = (int) $this->db->lastInsertId();
        $stmtNew = $this->db->prepare("SELECT * FROM cotizaciones WHERE id = ?");
        $stmtNew->execute([$newId]);

        return $stmtNew->fetch();
    }

    public function updateConfig(array $body): ?array
    {
        $stmtCheck = $this->db->query("SELECT id FROM config_costos ORDER BY id DESC LIMIT 1");
        $existing  = $stmtCheck->fetch();

        $map = [
            'precio_kwh'                      => 'float',
            'valor_hora_operario'             => 'float',
            'valor_compra_impresora_promedio' => 'float',
            'vida_util_horas_promedio'        => 'float',
            'margen_minimo_pct'               => 'float',
            'consumo_watts'                   => 'float',
        ];

        if ($existing) {
            $fields = [];
            $binds  = [];

            foreach ($map as $field => $type) {
                if (array_key_exists($field, $body)) {
                    $fields[] = "{$field} = ?";
                    $binds[]  = (float) $body[$field];
                }
            }

            if (empty($fields)) {
                return null;
            }

            $fields[] = "updated_at = NOW()";
            $binds[]  = $existing['id'];

            $this->db->prepare("UPDATE config_costos SET " . implode(', ', $fields) . " WHERE id = ?")
               ->execute($binds);

            $configId = $existing['id'];
        } else {
            $stmt = $this->db->prepare(
                "INSERT INTO config_costos
                    (precio_kwh, valor_hora_operario, valor_compra_impresora_promedio,
                     vida_util_horas_promedio, margen_minimo_pct, consumo_watts,
                     created_at, updated_at)
                 VALUES (?, ?, ?, ?, ?, ?, NOW(), NOW())"
            );
            $stmt->execute([
                (float) ($body['precio_kwh']                      ?? 150),
                (float) ($body['valor_hora_operario']             ?? 1500),
                (float) ($body['valor_compra_impresora_promedio'] ?? 350000),
                (float) ($body['vida_util_horas_promedio']        ?? 10000),
                (float) ($body['margen_minimo_pct']               ?? 20),
                (float) ($body['consumo_watts']                   ?? 200),
            ]);
            $configId = (int) $this->db->lastInsertId();
        }

        $stmtNew = $this->db->prepare("SELECT * FROM config_costos WHERE id = ?");
        $stmtNew->execute([$configId]);

        return $stmtNew->fetch();
    }
}
