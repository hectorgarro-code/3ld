<?php

declare(strict_types=1);

namespace App\Controllers;

use App\Database;
use App\Helpers\Response;
use Psr\Http\Message\ResponseInterface;
use Psr\Http\Message\ServerRequestInterface;
use Throwable;

class FilamentosController
{
    private array $config;

    public function __construct(array $config)
    {
        $this->config = $config;
    }

    /**
     * GET /api/v1/filamentos
     */
    public function index(ServerRequestInterface $request, ResponseInterface $response): ResponseInterface
    {
        try {
            $db     = (new Database($this->config))->getConnection();
            $params = $request->getQueryParams();

            $q       = $params['q']        ?? '';
            $page    = max(1, (int) ($params['page']     ?? 1));
            $perPage = min(1000, max(1, (int) ($params['per_page'] ?? 500)));
            $offset  = ($page - 1) * $perPage;

            $where = "WHERE f.activo = 1";
            $binds = [];

            if (!empty($q)) {
                $where  .= " AND (f.nombre LIKE ? OR f.color LIKE ?)";
                $like    = "%{$q}%";
                $binds   = [$like, $like];
            }

            $stmtCount = $db->prepare("SELECT COUNT(*) FROM v_filamentos f {$where}");
            $stmtCount->execute($binds);
            $total = (int) $stmtCount->fetchColumn();

            $sql = "SELECT f.*
                    FROM v_filamentos f
                    {$where}
                    ORDER BY f.nombre ASC
                    LIMIT {$perPage} OFFSET {$offset}";

            $stmt = $db->prepare($sql);
            $stmt->execute($binds);
            $filamentos = $stmt->fetchAll();

            return Response::paginated($filamentos, $total, $page, $perPage);
        } catch (Throwable $e) {
            return Response::error('Error al obtener filamentos: ' . $e->getMessage(), 500);
        }
    }

    /**
     * GET /api/v1/filamentos/{id}
     */
    public function show(ServerRequestInterface $request, ResponseInterface $response, array $args): ResponseInterface
    {
        try {
            $db = (new Database($this->config))->getConnection();
            $id = (int) $args['id'];

            $stmt = $db->prepare("SELECT * FROM v_filamentos WHERE id = ? AND activo = 1");
            $stmt->execute([$id]);
            $filamento = $stmt->fetch();

            if (!$filamento) {
                return Response::error('Filamento no encontrado', 404);
            }

            return Response::success($filamento);
        } catch (Throwable $e) {
            return Response::error('Error al obtener filamento: ' . $e->getMessage(), 500);
        }
    }

    /**
     * POST /api/v1/filamentos
     */
    public function create(ServerRequestInterface $request, ResponseInterface $response): ResponseInterface
    {
        try {
            $db   = (new Database($this->config))->getConnection();
            $body = $request->getParsedBody() ?? [];

            if (empty(trim($body['nombre'] ?? ''))) {
                return Response::error('El nombre del filamento es requerido', 422);
            }

            $stmt = $db->prepare(
                "INSERT INTO filamentos
                    (nombre, tipo, color, color_hex, material_id, diametro_mm,
                     stock_rollos, stock_minimo_rollos,
                     precio_compra, proveedor, activo, created_at, updated_at)
                 VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1, NOW(), NOW())"
            );

            $stockRollos = (int) ($body['stock_rollos'] ?? 0);

            $stmt->execute([
                trim($body['nombre']),
                $body['tipo']           ?? 'PLA',
                $body['color']          ?? 'Natural',
                $body['color_hex']      ?? '#808080',
                $body['material_id']    ?? null,
                (float) ($body['diametro_mm']    ?? 1.75),
                $stockRollos,
                (int) ($body['stock_minimo_rollos'] ?? 1),
                (float) ($body['precio_compra']  ?? 0),
                $body['proveedor']      ?? null,
            ]);

            $newId = (int) $db->lastInsertId();
            $stmt2 = $db->prepare("SELECT * FROM v_filamentos WHERE id = ?");
            $stmt2->execute([$newId]);

            return Response::success($stmt2->fetch(), 201);
        } catch (Throwable $e) {
            return Response::error('Error al crear filamento: ' . $e->getMessage(), 500);
        }
    }

    /**
     * PUT /api/v1/filamentos/{id}
     */
    public function update(ServerRequestInterface $request, ResponseInterface $response, array $args): ResponseInterface
    {
        try {
            $db   = (new Database($this->config))->getConnection();
            $id   = (int) $args['id'];
            $body = $request->getParsedBody() ?? [];

            $check = $db->prepare("SELECT id FROM filamentos WHERE id = ? AND activo = 1");
            $check->execute([$id]);
            if (!$check->fetch()) {
                return Response::error('Filamento no encontrado', 404);
            }

            $fields = [];
            $binds  = [];

            $map = [
                'nombre'             => 'string',
                'tipo'               => 'string',
                'color'              => 'string',
                'color_hex'          => 'string',
                'material_id'        => 'int',
                'diametro_mm'        => 'float',
                'stock_rollos'       => 'int',
                'stock_minimo_rollos'=> 'int',
                'precio_compra'      => 'float',
                'proveedor'          => 'string',
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

            $db->prepare("UPDATE filamentos SET " . implode(', ', $fields) . " WHERE id = ?")
               ->execute($binds);

            $stmt = $db->prepare("SELECT * FROM v_filamentos WHERE id = ?");
            $stmt->execute([$id]);

            return Response::success($stmt->fetch());
        } catch (Throwable $e) {
            return Response::error('Error al actualizar filamento: ' . $e->getMessage(), 500);
        }
    }

    /**
     * DELETE /api/v1/filamentos/{id}
     */
    public function destroy(ServerRequestInterface $request, ResponseInterface $response, array $args): ResponseInterface
    {
        try {
            $db = (new Database($this->config))->getConnection();
            $id = (int) $args['id'];

            $check = $db->prepare("SELECT id FROM filamentos WHERE id = ? AND activo = 1");
            $check->execute([$id]);
            if (!$check->fetch()) {
                return Response::error('Filamento no encontrado', 404);
            }

            $db->prepare("UPDATE filamentos SET activo = 0, updated_at = NOW() WHERE id = ?")
               ->execute([$id]);

            return Response::success(['message' => 'Filamento eliminado correctamente']);
        } catch (Throwable $e) {
            return Response::error('Error al eliminar filamento: ' . $e->getMessage(), 500);
        }
    }

    /**
     * PUT /api/v1/filamentos/{id}/stock
     * Body: { delta: int }
     */
    public function updateStock(ServerRequestInterface $request, ResponseInterface $response, array $args): ResponseInterface
    {
        try {
            $db   = (new Database($this->config))->getConnection();
            $id   = (int) $args['id'];
            $body = $request->getParsedBody() ?? [];

            $delta = (int) ($body['delta'] ?? 0);

            if ($delta === 0) {
                return Response::error('El delta debe ser distinto de 0', 422);
            }

            $stmt = $db->prepare("SELECT id, stock_rollos FROM filamentos WHERE id = ? AND activo = 1");
            $stmt->execute([$id]);
            $filamento = $stmt->fetch();

            if (!$filamento) {
                return Response::error('Filamento no encontrado', 404);
            }

            $nuevoStock = max(0, $filamento['stock_rollos'] + $delta);

            $db->prepare(
                "UPDATE filamentos SET stock_rollos = ?, updated_at = NOW() WHERE id = ?"
            )->execute([$nuevoStock, $id]);

            $stmtNew = $db->prepare("SELECT * FROM v_filamentos WHERE id = ?");
            $stmtNew->execute([$id]);
            $updated = $stmtNew->fetch();

            return Response::success([
                'filamento'    => $updated,
                'delta'        => $delta,
                'stock_nuevo'  => $nuevoStock,
            ]);
        } catch (Throwable $e) {
            return Response::error('Error al actualizar stock: ' . $e->getMessage(), 500);
        }
    }
}
