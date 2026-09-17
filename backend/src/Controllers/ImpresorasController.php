<?php

declare(strict_types=1);

namespace App\Controllers;

use App\Database;
use App\Helpers\Response;
use Psr\Http\Message\ResponseInterface;
use Psr\Http\Message\ServerRequestInterface;
use Throwable;

class ImpresorasController
{
    private array $config;

    public function __construct(array $config)
    {
        $this->config = $config;
    }

    /**
     * GET /api/v1/impresoras
     */
    public function index(ServerRequestInterface $request, ResponseInterface $response): ResponseInterface
    {
        try {
            $db     = (new Database($this->config))->getConnection();
            $params = $request->getQueryParams();

            $q       = $params['q']        ?? '';
            $estado  = $params['estado']   ?? '';
            $page    = max(1, (int) ($params['page']     ?? 1));
            $perPage = min(1000, max(1, (int) ($params['per_page'] ?? 500)));
            $offset  = ($page - 1) * $perPage;

            $where = "WHERE activo = 1";
            $binds = [];

            if (!empty($q)) {
                $where  .= " AND (nombre LIKE ? OR marca LIKE ? OR modelo LIKE ?)";
                $like    = "%{$q}%";
                $binds   = [$like, $like, $like];
            }

            if (!empty($estado)) {
                $where  .= " AND estado = ?";
                $binds[] = $estado;
            }

            $stmtCount = $db->prepare("SELECT COUNT(*) FROM impresoras {$where}");
            $stmtCount->execute($binds);
            $total = (int) $stmtCount->fetchColumn();

            $sql = "SELECT *
                    FROM impresoras
                    {$where}
                    ORDER BY nombre ASC
                    LIMIT ? OFFSET ?";

            $stmt = $db->prepare($sql);
            $stmt->execute(array_merge($binds, [$perPage, $offset]));
            $impresoras = $stmt->fetchAll();

            return Response::paginated($impresoras, $total, $page, $perPage);
        } catch (Throwable $e) {
            return Response::error('Error al obtener impresoras: ' . $e->getMessage(), 500);
        }
    }

    /**
     * GET /api/v1/impresoras/{id}
     */
    public function show(ServerRequestInterface $request, ResponseInterface $response, array $args): ResponseInterface
    {
        try {
            $db = (new Database($this->config))->getConnection();
            $id = (int) $args['id'];

            $stmt = $db->prepare("SELECT * FROM impresoras WHERE id = ? AND activo = 1");
            $stmt->execute([$id]);
            $impresora = $stmt->fetch();

            if (!$impresora) {
                return Response::error('Impresora no encontrada', 404);
            }

            // Latest production orders for this printer
            $stmtOrdenes = $db->prepare(
                "SELECT id, numero_orden, estado, fecha_inicio, fecha_fin, created_at
                 FROM ordenes_produccion WHERE impresora_id = ?
                 ORDER BY created_at DESC LIMIT 10"
            );
            $stmtOrdenes->execute([$id]);
            $impresora['ordenes_recientes'] = $stmtOrdenes->fetchAll();

            return Response::success($impresora);
        } catch (Throwable $e) {
            return Response::error('Error al obtener impresora: ' . $e->getMessage(), 500);
        }
    }

    /**
     * POST /api/v1/impresoras
     */
    public function create(ServerRequestInterface $request, ResponseInterface $response): ResponseInterface
    {
        try {
            $db   = (new Database($this->config))->getConnection();
            $body = $request->getParsedBody() ?? [];

            if (empty(trim($body['nombre'] ?? ''))) {
                return Response::error('El nombre de la impresora es requerido', 422);
            }

            $stmt = $db->prepare(
                "INSERT INTO impresoras
                    (nombre, marca, modelo, numero_serie, tipo_impresion,
                     volumen_x_mm, volumen_y_mm, volumen_z_mm,
                     consumo_watts, valor_compra, vida_util_horas, fecha_compra,
                     estado, horas_acumuladas, activo, notas, created_at, updated_at)
                 VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1, ?, NOW(), NOW())"
            );

            $stmt->execute([
                trim($body['nombre']),
                $body['marca']          ?? null,
                $body['modelo']         ?? null,
                $body['numero_serie']   ?? null,
                $body['tipo_impresion'] ?? 'FDM',
                (float) ($body['volumen_x_mm']  ?? 0),
                (float) ($body['volumen_y_mm']  ?? 0),
                (float) ($body['volumen_z_mm']  ?? 0),
                (float) ($body['consumo_watts'] ?? 0),
                (float) ($body['valor_compra']  ?? 0),
                (float) ($body['vida_util_horas'] ?? 5000),
                $body['fecha_compra']   ?? null,
                $body['estado']         ?? 'libre',
                (float) ($body['horas_acumuladas'] ?? 0),
                $body['notas']          ?? null,
            ]);

            $newId = (int) $db->lastInsertId();
            $stmt2 = $db->prepare("SELECT * FROM impresoras WHERE id = ?");
            $stmt2->execute([$newId]);

            return Response::success($stmt2->fetch(), 201);
        } catch (Throwable $e) {
            return Response::error('Error al crear impresora: ' . $e->getMessage(), 500);
        }
    }

    /**
     * PUT /api/v1/impresoras/{id}
     */
    public function update(ServerRequestInterface $request, ResponseInterface $response, array $args): ResponseInterface
    {
        try {
            $db   = (new Database($this->config))->getConnection();
            $id   = (int) $args['id'];
            $body = $request->getParsedBody() ?? [];

            $check = $db->prepare("SELECT id FROM impresoras WHERE id = ? AND activo = 1");
            $check->execute([$id]);
            if (!$check->fetch()) {
                return Response::error('Impresora no encontrada', 404);
            }

            $fields = [];
            $binds  = [];

            $map = [
                'nombre'           => 'string',
                'marca'            => 'string',
                'modelo'           => 'string',
                'numero_serie'     => 'string',
                'tipo_impresion'   => 'string',
                'volumen_x_mm'     => 'float',
                'volumen_y_mm'     => 'float',
                'volumen_z_mm'     => 'float',
                'consumo_watts'    => 'float',
                'valor_compra'     => 'float',
                'vida_util_horas'  => 'float',
                'fecha_compra'     => 'string',
                'estado'           => 'string',
                'horas_acumuladas' => 'float',
                'notas'            => 'string',
            ];

            foreach ($map as $field => $type) {
                if (array_key_exists($field, $body)) {
                    $fields[] = "{$field} = ?";
                    if ($type === 'int')        $binds[] = (int)   $body[$field];
                    elseif ($type === 'float')  $binds[] = (float) $body[$field];
                    else                        $binds[] = (string) $body[$field];
                }
            }

            if (empty($fields)) {
                return Response::error('No hay campos para actualizar', 422);
            }

            $fields[] = "updated_at = NOW()";
            $binds[]  = $id;

            $db->prepare("UPDATE impresoras SET " . implode(', ', $fields) . " WHERE id = ?")
               ->execute($binds);

            $stmt = $db->prepare("SELECT * FROM impresoras WHERE id = ?");
            $stmt->execute([$id]);

            return Response::success($stmt->fetch());
        } catch (Throwable $e) {
            return Response::error('Error al actualizar impresora: ' . $e->getMessage(), 500);
        }
    }

    /**
     * DELETE /api/v1/impresoras/{id}
     */
    public function destroy(ServerRequestInterface $request, ResponseInterface $response, array $args): ResponseInterface
    {
        try {
            $db = (new Database($this->config))->getConnection();
            $id = (int) $args['id'];

            $check = $db->prepare("SELECT id FROM impresoras WHERE id = ? AND activo = 1");
            $check->execute([$id]);
            if (!$check->fetch()) {
                return Response::error('Impresora no encontrada', 404);
            }

            $db->prepare("UPDATE impresoras SET activo = 0, updated_at = NOW() WHERE id = ?")
               ->execute([$id]);

            return Response::success(['message' => 'Impresora eliminada correctamente']);
        } catch (Throwable $e) {
            return Response::error('Error al eliminar impresora: ' . $e->getMessage(), 500);
        }
    }

    /**
     * PUT /api/v1/impresoras/{id}/estado
     * Body: { estado: string }
     */
    public function cambiarEstado(ServerRequestInterface $request, ResponseInterface $response, array $args): ResponseInterface
    {
        try {
            $db   = (new Database($this->config))->getConnection();
            $id   = (int) $args['id'];
            $body = $request->getParsedBody() ?? [];

            $estadosValidos = ['libre', 'ocupada', 'mantenimiento', 'averiada'];
            $estado         = $body['estado'] ?? '';

            if (!in_array($estado, $estadosValidos, true)) {
                return Response::error(
                    'Estado inválido. Valores permitidos: ' . implode(', ', $estadosValidos),
                    422
                );
            }

            $check = $db->prepare("SELECT id FROM impresoras WHERE id = ? AND activo = 1");
            $check->execute([$id]);
            if (!$check->fetch()) {
                return Response::error('Impresora no encontrada', 404);
            }

            $db->prepare("UPDATE impresoras SET estado = ?, updated_at = NOW() WHERE id = ?")
               ->execute([$estado, $id]);

            $stmt = $db->prepare("SELECT * FROM impresoras WHERE id = ?");
            $stmt->execute([$id]);

            return Response::success($stmt->fetch());
        } catch (Throwable $e) {
            return Response::error('Error al cambiar estado: ' . $e->getMessage(), 500);
        }
    }
}
