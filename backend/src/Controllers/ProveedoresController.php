<?php

declare(strict_types=1);

namespace App\Controllers;

use App\Database;
use App\Helpers\Response;
use Psr\Http\Message\ResponseInterface;
use Psr\Http\Message\ServerRequestInterface;
use Throwable;

class ProveedoresController
{
    private array $config;

    public function __construct(array $config)
    {
        $this->config = $config;
    }

    public function index(ServerRequestInterface $request, ResponseInterface $response): ResponseInterface
    {
        try {
            $db     = (new Database($this->config))->getConnection();
            $params = $request->getQueryParams();

            $q       = $params['q']        ?? '';
            $page    = max(1, (int) ($params['page']     ?? 1));
            $perPage = min(1000, max(1, (int) ($params['per_page'] ?? 500)));
            $offset  = ($page - 1) * $perPage;

            $where = "WHERE activo = 1";
            $binds = [];

            if (!empty($q)) {
                $where  .= " AND (nombre LIKE ? OR email LIKE ? OR contacto LIKE ?)";
                $like    = "%{$q}%";
                $binds   = [$like, $like, $like];
            }

            $stmtCount = $db->prepare("SELECT COUNT(*) FROM proveedores {$where}");
            $stmtCount->execute($binds);
            $total = (int) $stmtCount->fetchColumn();

            $sql = "SELECT * FROM proveedores {$where} ORDER BY nombre ASC LIMIT ? OFFSET ?";
            $stmt = $db->prepare($sql);
            $stmt->execute(array_merge($binds, [$perPage, $offset]));
            $proveedores = $stmt->fetchAll();

            return Response::paginated($proveedores, $total, $page, $perPage);
        } catch (Throwable $e) {
            return Response::error('Error al obtener proveedores: ' . $e->getMessage(), 500);
        }
    }

    public function show(ServerRequestInterface $request, ResponseInterface $response, array $args): ResponseInterface
    {
        try {
            $db = (new Database($this->config))->getConnection();
            $id = (int) $args['id'];

            $stmt = $db->prepare("SELECT * FROM proveedores WHERE id = ? AND activo = 1");
            $stmt->execute([$id]);
            $proveedor = $stmt->fetch();

            if (!$proveedor) {
                return Response::error('Proveedor no encontrado', 404);
            }

            return Response::success($proveedor);
        } catch (Throwable $e) {
            return Response::error('Error al obtener proveedor: ' . $e->getMessage(), 500);
        }
    }

    public function create(ServerRequestInterface $request, ResponseInterface $response): ResponseInterface
    {
        try {
            $db   = (new Database($this->config))->getConnection();
            $body = $request->getParsedBody() ?? [];

            if (empty(trim($body['nombre'] ?? ''))) {
                return Response::error('El nombre del proveedor es requerido', 422);
            }

            $stmt = $db->prepare(
                "INSERT INTO proveedores (nombre, contacto, telefono, email, direccion, notas, activo, created_at)
                 VALUES (?, ?, ?, ?, ?, ?, 1, NOW())"
            );

            $stmt->execute([
                trim($body['nombre']),
                $body['contacto']  ?? null,
                $body['telefono']  ?? null,
                $body['email']     ?? null,
                $body['direccion'] ?? null,
                $body['notas']     ?? null,
            ]);

            $newId = (int) $db->lastInsertId();
            $stmt2 = $db->prepare("SELECT * FROM proveedores WHERE id = ?");
            $stmt2->execute([$newId]);

            return Response::success($stmt2->fetch(), 201);
        } catch (Throwable $e) {
            return Response::error('Error al crear proveedor: ' . $e->getMessage(), 500);
        }
    }

    public function update(ServerRequestInterface $request, ResponseInterface $response, array $args): ResponseInterface
    {
        try {
            $db   = (new Database($this->config))->getConnection();
            $id   = (int) $args['id'];
            $body = $request->getParsedBody() ?? [];

            $check = $db->prepare("SELECT id FROM proveedores WHERE id = ? AND activo = 1");
            $check->execute([$id]);
            if (!$check->fetch()) {
                return Response::error('Proveedor no encontrado', 404);
            }

            $fields = [];
            $binds  = [];

            $map = ['nombre', 'contacto', 'telefono', 'email', 'direccion', 'notas'];

            foreach ($map as $field) {
                if (array_key_exists($field, $body)) {
                    $fields[] = "{$field} = ?";
                    $binds[]  = (string) $body[$field];
                }
            }

            if (empty($fields)) {
                return Response::error('No hay campos para actualizar', 422);
            }

            $binds[] = $id;

            $db->prepare("UPDATE proveedores SET " . implode(', ', $fields) . " WHERE id = ?")
               ->execute($binds);

            $stmt = $db->prepare("SELECT * FROM proveedores WHERE id = ?");
            $stmt->execute([$id]);

            return Response::success($stmt->fetch());
        } catch (Throwable $e) {
            return Response::error('Error al actualizar proveedor: ' . $e->getMessage(), 500);
        }
    }

    public function destroy(ServerRequestInterface $request, ResponseInterface $response, array $args): ResponseInterface
    {
        try {
            $db = (new Database($this->config))->getConnection();
            $id = (int) $args['id'];

            $check = $db->prepare("SELECT id FROM proveedores WHERE id = ? AND activo = 1");
            $check->execute([$id]);
            if (!$check->fetch()) {
                return Response::error('Proveedor no encontrado', 404);
            }

            // Validar que no tenga compras
            $checkCompras = $db->prepare("SELECT id FROM compras WHERE proveedor_id = ? LIMIT 1");
            $checkCompras->execute([$id]);
            if ($checkCompras->fetch()) {
                return Response::error('No se puede eliminar porque existen compras asociadas', 409);
            }

            $db->prepare("UPDATE proveedores SET activo = 0 WHERE id = ?")->execute([$id]);

            return Response::success(['message' => 'Proveedor eliminado correctamente']);
        } catch (Throwable $e) {
            return Response::error('Error al eliminar proveedor: ' . $e->getMessage(), 500);
        }
    }

    public function articulos(ServerRequestInterface $request, ResponseInterface $response, array $args): ResponseInterface
    {
        try {
            $db = (new Database($this->config))->getConnection();
            $id = (int) $args['id'];

            $check = $db->prepare("SELECT id FROM proveedores WHERE id = ?");
            $check->execute([$id]);
            if (!$check->fetch()) {
                return Response::error('Proveedor no encontrado', 404);
            }

            $sql = "
                SELECT p.id as producto_id,
                       p.nombre,
                       p.sku,
                       p.es_insumo,
                       p.es_vendible,
                       MAX(c.fecha) as ultima_fecha_compra,
                       SUM(ci.cantidad) as total_comprado,
                       (SELECT ci2.precio_unitario 
                        FROM compra_items ci2 
                        JOIN compras c2 ON c2.id = ci2.compra_id 
                        WHERE ci2.producto_id = p.id AND c2.proveedor_id = ? 
                          AND c2.estado != 'cancelada'
                        ORDER BY c2.fecha DESC, c2.id DESC LIMIT 1) as ultimo_precio
                FROM compra_items ci
                JOIN compras c ON c.id = ci.compra_id
                JOIN productos p ON p.id = ci.producto_id
                WHERE c.proveedor_id = ?
                  AND c.estado != 'cancelada'
                GROUP BY p.id, p.nombre, p.sku, p.es_insumo, p.es_vendible
                ORDER BY ultima_fecha_compra DESC
            ";

            $stmt = $db->prepare($sql);
            $stmt->execute([$id, $id]);
            $articulos = $stmt->fetchAll();

            return Response::success($articulos);
        } catch (Throwable $e) {
            return Response::error('Error al obtener artículos del proveedor: ' . $e->getMessage(), 500);
        }
    }
}
