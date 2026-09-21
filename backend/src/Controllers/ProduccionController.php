<?php

declare(strict_types=1);

namespace App\Controllers;

use App\Database;
use App\Helpers\Response;
use Psr\Http\Message\ResponseInterface;
use Psr\Http\Message\ServerRequestInterface;
use Throwable;

class ProduccionController
{
    private array $config;

    public function __construct(array $config)
    {
        $this->config = $config;
    }

    // ─── Helpers ─────────────────────────────────────────────────────────────

    private function generarNumeroOrden(\PDO $db): string
    {
        $stmt  = $db->query("SELECT COUNT(*) FROM ordenes_produccion");
        $count = (int) $stmt->fetchColumn();
        return 'OP-' . date('Y') . '-' . str_pad((string) ($count + 1), 4, '0', STR_PAD_LEFT);
    }

    // ─── CRUD ────────────────────────────────────────────────────────────────

    /**
     * GET /api/v1/ordenes
     */
    public function index(ServerRequestInterface $request, ResponseInterface $response): ResponseInterface
    {
        try {
            $db     = (new Database($this->config))->getConnection();
            $params = $request->getQueryParams();

            $q       = $params['q']      ?? '';
            $estado  = $params['estado'] ?? '';
            $page    = max(1, (int) ($params['page']     ?? 1));
            $perPage = min(1000, max(1, (int) ($params['per_page'] ?? 500)));
            $offset  = ($page - 1) * $perPage;

            $where = "WHERE 1=1";
            $binds = [];

            if (!empty($q)) {
                $where  .= " AND (op.numero_orden LIKE ? OR pr.nombre LIKE ?)";
                $like    = "%{$q}%";
                $binds   = array_merge($binds, [$like, $like]);
            }

            if (!empty($estado)) {
                $where  .= " AND op.estado = ?";
                $binds[] = $estado;
            }

            $stmtCount = $db->prepare(
                "SELECT COUNT(*) FROM ordenes_produccion op
                 LEFT JOIN productos pr ON pr.id = op.producto_id
                 {$where}"
            );
            $stmtCount->execute($binds);
            $total = (int) $stmtCount->fetchColumn();

            $sql = "SELECT op.id, op.numero_orden, op.estado, op.cantidad,
                           op.gramos_estimados, op.gramos_reales,
                           op.tiempo_estimado_min, op.tiempo_real_min,
                           op.fecha_inicio, op.fecha_fin, op.prioridad,
                           op.created_at, op.updated_at,
                           pr.id AS producto_id, pr.nombre AS producto_nombre, pr.sku AS producto_sku,
                           i.id AS impresora_id, i.nombre AS impresora_nombre,
                           f.id AS filamento_id, f.nombre AS filamento_nombre, f.color AS filamento_color
                    FROM ordenes_produccion op
                    LEFT JOIN productos pr  ON pr.id = op.producto_id
                    LEFT JOIN impresoras i  ON i.id  = op.impresora_id
                    LEFT JOIN filamentos f  ON f.id  = op.filamento_id
                    {$where}
                    ORDER BY op.prioridad DESC, op.created_at ASC
                    LIMIT {$perPage} OFFSET {$offset}";

            $stmt = $db->prepare($sql);
            $stmt->execute($binds);
            $ordenes = $stmt->fetchAll();

            return Response::paginated($ordenes, $total, $page, $perPage);
        } catch (Throwable $e) {
            return Response::error('Error al obtener órdenes: ' . $e->getMessage(), 500);
        }
    }

    /**
     * GET /api/v1/ordenes/{id}
     */
    public function show(ServerRequestInterface $request, ResponseInterface $response, array $args): ResponseInterface
    {
        try {
            $db = (new Database($this->config))->getConnection();
            $id = (int) $args['id'];

            $stmt = $db->prepare(
                "SELECT op.*,
                        pr.nombre AS producto_nombre, pr.sku AS producto_sku,
                        i.nombre AS impresora_nombre,
                        f.nombre AS filamento_nombre, f.color AS filamento_color
                 FROM ordenes_produccion op
                 LEFT JOIN productos pr ON pr.id = op.producto_id
                 LEFT JOIN impresoras i ON i.id  = op.impresora_id
                 LEFT JOIN filamentos f ON f.id  = op.filamento_id
                 WHERE op.id = ?"
            );
            $stmt->execute([$id]);
            $orden = $stmt->fetch();

            if (!$orden) {
                return Response::error('Orden de producción no encontrada', 404);
            }

            // Fallas de producción
            $stmtFallas = $db->prepare(
                "SELECT fp.*, u.nombre AS usuario_nombre
                 FROM fallas_produccion fp
                 LEFT JOIN usuarios u ON u.id = fp.usuario_id
                 WHERE fp.orden_id = ?
                 ORDER BY fp.created_at ASC"
            );
            $stmtFallas->execute([$id]);
            $orden['fallas'] = $stmtFallas->fetchAll();

            return Response::success($orden);
        } catch (Throwable $e) {
            return Response::error('Error al obtener orden: ' . $e->getMessage(), 500);
        }
    }

    /**
     * POST /api/v1/ordenes
     */
    public function create(ServerRequestInterface $request, ResponseInterface $response): ResponseInterface
    {
        try {
            $db   = (new Database($this->config))->getConnection();
            $body = $request->getParsedBody() ?? [];

            if (empty($body['producto_id'])) {
                return Response::error('El producto es requerido', 422);
            }

            $numeroOrden = $this->generarNumeroOrden($db);

            $stmt = $db->prepare(
                "INSERT INTO ordenes_produccion
                    (numero_orden, producto_id, pedido_id, impresora_id, filamento_id,
                     estado, cantidad, gramos_estimados, tiempo_estimado_min,
                     prioridad, notas, created_at, updated_at)
                 VALUES (?, ?, ?, ?, ?, 'en_cola', ?, ?, ?, ?, ?, NOW(), NOW())"
            );

            $stmt->execute([
                $numeroOrden,
                (int)   $body['producto_id'],
                isset($body['pedido_id'])   ? (int)   $body['pedido_id']   : null,
                isset($body['impresora_id'])? (int)   $body['impresora_id']: null,
                isset($body['filamento_id'])? (int)   $body['filamento_id']: null,
                (int)   ($body['cantidad']            ?? 1),
                (float) ($body['gramos_estimados']    ?? 0),
                (int)   ($body['tiempo_estimado_min'] ?? 0),
                (int)   ($body['prioridad']           ?? 5),
                $body['notas'] ?? null,
            ]);

            $newId = (int) $db->lastInsertId();
            $stmt2 = $db->prepare(
                "SELECT op.*, pr.nombre AS producto_nombre, i.nombre AS impresora_nombre,
                        f.nombre AS filamento_nombre
                 FROM ordenes_produccion op
                 LEFT JOIN productos  pr ON pr.id = op.producto_id
                 LEFT JOIN impresoras i  ON i.id  = op.impresora_id
                 LEFT JOIN filamentos f  ON f.id  = op.filamento_id
                 WHERE op.id = ?"
            );
            $stmt2->execute([$newId]);

            return Response::success($stmt2->fetch(), 201);
        } catch (Throwable $e) {
            return Response::error('Error al crear orden: ' . $e->getMessage(), 500);
        }
    }

    /**
     * PUT /api/v1/ordenes/{id}
     */
    public function update(ServerRequestInterface $request, ResponseInterface $response, array $args): ResponseInterface
    {
        try {
            $db   = (new Database($this->config))->getConnection();
            $id   = (int) $args['id'];
            $body = $request->getParsedBody() ?? [];

            $check = $db->prepare("SELECT id FROM ordenes_produccion WHERE id = ?");
            $check->execute([$id]);
            if (!$check->fetch()) {
                return Response::error('Orden no encontrada', 404);
            }

            $fields = [];
            $binds  = [];

            $map = [
                'impresora_id'       => 'int',
                'filamento_id'       => 'int',
                'cantidad'           => 'int',
                'gramos_estimados'   => 'float',
                'gramos_reales'      => 'float',
                'tiempo_estimado_min'=> 'int',
                'tiempo_real_min'    => 'int',
                'prioridad'          => 'int',
                'notas'              => 'string',
                'fecha_inicio'       => 'string',
                'fecha_fin'          => 'string',
            ];

            foreach ($map as $field => $type) {
                if (array_key_exists($field, $body)) {
                    $fields[] = "{$field} = ?";
                    if ($type === 'int')        $binds[] = (int)   $body[$field];
                    elseif ($type === 'float')  $binds[] = (float) $body[$field];
                    else                        $binds[] = (string) $body[$field];
                }
            }

            if (!empty($fields)) {
                $fields[] = "updated_at = NOW()";
                $binds[]  = $id;
                $db->prepare("UPDATE ordenes_produccion SET " . implode(', ', $fields) . " WHERE id = ?")
                   ->execute($binds);
            }

            $stmt = $db->prepare(
                "SELECT op.*, pr.nombre AS producto_nombre, i.nombre AS impresora_nombre,
                        f.nombre AS filamento_nombre
                 FROM ordenes_produccion op
                 LEFT JOIN productos  pr ON pr.id = op.producto_id
                 LEFT JOIN impresoras i  ON i.id  = op.impresora_id
                 LEFT JOIN filamentos f  ON f.id  = op.filamento_id
                 WHERE op.id = ?"
            );
            $stmt->execute([$id]);

            return Response::success($stmt->fetch());
        } catch (Throwable $e) {
            return Response::error('Error al actualizar orden: ' . $e->getMessage(), 500);
        }
    }

    /**
     * DELETE /api/v1/ordenes/{id}  (soft via estado = 'cancelado')
     */
    public function destroy(ServerRequestInterface $request, ResponseInterface $response, array $args): ResponseInterface
    {
        try {
            $db = (new Database($this->config))->getConnection();
            $id = (int) $args['id'];

            $check = $db->prepare("SELECT id, estado FROM ordenes_produccion WHERE id = ?");
            $check->execute([$id]);
            $orden = $check->fetch();

            if (!$orden) {
                return Response::error('Orden no encontrada', 404);
            }

            if (in_array($orden['estado'], ['imprimiendo', 'listo'], true)) {
                return Response::error(
                    'No se puede eliminar una orden en estado: ' . $orden['estado'],
                    409
                );
            }

            $db->prepare(
                "UPDATE ordenes_produccion SET estado = 'cancelado', updated_at = NOW() WHERE id = ?"
            )->execute([$id]);

            return Response::success(['message' => 'Orden cancelada correctamente']);
        } catch (Throwable $e) {
            return Response::error('Error al cancelar orden: ' . $e->getMessage(), 500);
        }
    }

    /**
     * PUT /api/v1/ordenes/{id}/estado
     */
    public function cambiarEstado(ServerRequestInterface $request, ResponseInterface $response, array $args): ResponseInterface
    {
        try {
            $db   = (new Database($this->config))->getConnection();
            $id   = (int) $args['id'];
            $body = $request->getParsedBody() ?? [];

            $estadosValidos = ['en_cola', 'imprimiendo', 'postprocesado', 'listo', 'cancelado', 'fallido'];
            $nuevoEstado    = $body['estado'] ?? '';

            if (!in_array($nuevoEstado, $estadosValidos, true)) {
                return Response::error(
                    'Estado inválido. Valores: ' . implode(', ', $estadosValidos),
                    422
                );
            }

            $stmt = $db->prepare(
                "SELECT id, estado, impresora_id, filamento_id,
                        tiempo_real_min, gramos_reales
                 FROM ordenes_produccion WHERE id = ?"
            );
            $stmt->execute([$id]);
            $orden = $stmt->fetch();

            if (!$orden) {
                return Response::error('Orden no encontrada', 404);
            }

            $db->beginTransaction();

            $extraSet  = '';
            $extraVals = [];

            if ($nuevoEstado === 'imprimiendo') {
                $extraSet = ", fecha_inicio = NOW()";
            }

            if ($nuevoEstado === 'listo') {
                $extraSet = ", fecha_fin = NOW()";

                // Update printer accumulated hours
                if ($orden['impresora_id'] && $orden['tiempo_real_min']) {
                    $horas = $orden['tiempo_real_min'] / 60;
                    $db->prepare(
                        "UPDATE impresoras SET
                            horas_acumuladas = horas_acumuladas + ?,
                            estado = 'libre',
                            updated_at = NOW()
                         WHERE id = ?"
                    )->execute([$horas, $orden['impresora_id']]);
                }

                // Deduct filament if gramos_reales provided
                $gramosReales = isset($body['gramos_reales'])
                    ? (float) $body['gramos_reales']
                    : (float) ($orden['gramos_reales'] ?? 0);

                // Note: Automatic deduction of filament grams disabled since the system now tracks stock by rolls (stock_rollos)
                /*
                if ($orden['filamento_id'] && $gramosReales > 0) {
                    $db->prepare(
                        "UPDATE filamentos SET
                            peso_restante_g = GREATEST(0, peso_restante_g - ?),
                            updated_at = NOW()
                         WHERE id = ?"
                    )->execute([$gramosReales, $orden['filamento_id']]);
                }
                */

                if (isset($body['gramos_reales'])) {
                    $extraSet  .= ", gramos_reales = ?";
                    $extraVals[] = (float) $body['gramos_reales'];
                }
                if (isset($body['tiempo_real_min'])) {
                    $extraSet  .= ", tiempo_real_min = ?";
                    $extraVals[] = (int) $body['tiempo_real_min'];
                }
            }

            $binds = array_merge([$nuevoEstado], $extraVals, [$id]);
            $db->prepare(
                "UPDATE ordenes_produccion SET estado = ? {$extraSet}, updated_at = NOW() WHERE id = ?"
            )->execute($binds);

            $db->commit();

            $stmtNew = $db->prepare(
                "SELECT op.*, pr.nombre AS producto_nombre, i.nombre AS impresora_nombre,
                        f.nombre AS filamento_nombre
                 FROM ordenes_produccion op
                 LEFT JOIN productos  pr ON pr.id = op.producto_id
                 LEFT JOIN impresoras i  ON i.id  = op.impresora_id
                 LEFT JOIN filamentos f  ON f.id  = op.filamento_id
                 WHERE op.id = ?"
            );
            $stmtNew->execute([$id]);

            return Response::success($stmtNew->fetch());
        } catch (Throwable $e) {
            if (isset($db) && $db->inTransaction()) {
                $db->rollBack();
            }
            return Response::error('Error al cambiar estado: ' . $e->getMessage(), 500);
        }
    }

    /**
     * POST /api/v1/ordenes/{id}/falla
     */
    public function registrarFalla(ServerRequestInterface $request, ResponseInterface $response, array $args): ResponseInterface
    {
        try {
            $db   = (new Database($this->config))->getConnection();
            $id   = (int) $args['id'];
            $body = $request->getParsedBody() ?? [];
            $user = $request->getAttribute('user');

            $check = $db->prepare("SELECT id FROM ordenes_produccion WHERE id = ?");
            $check->execute([$id]);
            if (!$check->fetch()) {
                return Response::error('Orden no encontrada', 404);
            }

            if (empty(trim($body['descripcion'] ?? ''))) {
                return Response::error('La descripción de la falla es requerida', 422);
            }

            $stmt = $db->prepare(
                "INSERT INTO fallas_produccion
                    (orden_id, tipo_falla, descripcion, gramos_perdidos,
                     tiempo_perdido_min, solucion, usuario_id, created_at)
                 VALUES (?, ?, ?, ?, ?, ?, ?, NOW())"
            );

            $stmt->execute([
                $id,
                $body['tipo_falla']         ?? 'otro',
                trim($body['descripcion']),
                (float) ($body['gramos_perdidos']     ?? 0),
                (int)   ($body['tiempo_perdido_min']  ?? 0),
                $body['solucion']                     ?? null,
                $user['id']                           ?? null,
            ]);

            $fallaId = (int) $db->lastInsertId();

            // Update order status to 'fallido' if indicated
            if (!empty($body['marcar_fallido'])) {
                $db->prepare(
                    "UPDATE ordenes_produccion SET estado = 'fallido', updated_at = NOW() WHERE id = ?"
                )->execute([$id]);
            }

            $stmtFalla = $db->prepare("SELECT * FROM fallas_produccion WHERE id = ?");
            $stmtFalla->execute([$fallaId]);

            return Response::success($stmtFalla->fetch(), 201);
        } catch (Throwable $e) {
            return Response::error('Error al registrar falla: ' . $e->getMessage(), 500);
        }
    }
}
