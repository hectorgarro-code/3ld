<?php

declare(strict_types=1);

namespace App\Controllers;

use App\Database;
use App\Helpers\Response;
use Psr\Http\Message\ResponseInterface;
use Psr\Http\Message\ServerRequestInterface;
use Throwable;

class ComprasController
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

            $proveedorId = (int) ($params['proveedor_id'] ?? 0);
            $page        = max(1, (int) ($params['page']     ?? 1));
            $perPage     = min(1000, max(1, (int) ($params['per_page'] ?? 500)));
            $offset      = ($page - 1) * $perPage;

            $where = "WHERE 1=1";
            $binds = [];

            if ($proveedorId > 0) {
                $where .= " AND c.proveedor_id = ?";
                $binds[] = $proveedorId;
            }

            $stmtCount = $db->prepare("SELECT COUNT(*) FROM compras c {$where}");
            $stmtCount->execute($binds);
            $total = (int) $stmtCount->fetchColumn();

            $sql = "SELECT c.*, p.nombre AS proveedor_nombre, u.nombre AS usuario_nombre 
                    FROM compras c
                    LEFT JOIN proveedores p ON p.id = c.proveedor_id
                    LEFT JOIN usuarios u ON u.id = c.created_by
                    {$where}
                    ORDER BY c.fecha DESC, c.id DESC
                    LIMIT {$perPage} OFFSET {$offset}";
            $stmt = $db->prepare($sql);
            $stmt->execute($binds);
            $compras = $stmt->fetchAll();

            return Response::paginated($compras, $total, $page, $perPage);
        } catch (Throwable $e) {
            return Response::error('Error al obtener compras: ' . $e->getMessage(), 500);
        }
    }

    public function show(ServerRequestInterface $request, ResponseInterface $response, array $args): ResponseInterface
    {
        try {
            $db = (new Database($this->config))->getConnection();
            $id = (int) $args['id'];

            $stmt = $db->prepare(
                "SELECT c.*, p.nombre AS proveedor_nombre, u.nombre AS usuario_nombre 
                 FROM compras c
                 LEFT JOIN proveedores p ON p.id = c.proveedor_id
                 LEFT JOIN usuarios u ON u.id = c.created_by
                 WHERE c.id = ?"
            );
            $stmt->execute([$id]);
            $compra = $stmt->fetch();

            if (!$compra) {
                return Response::error('Compra no encontrada', 404);
            }

            $stmtItems = $db->prepare(
                "SELECT ci.*, pr.nombre AS producto_nombre, pr.sku AS producto_sku 
                 FROM compra_items ci
                 LEFT JOIN productos pr ON pr.id = ci.producto_id
                 WHERE ci.compra_id = ?"
            );
            $stmtItems->execute([$id]);
            $compra['items'] = $stmtItems->fetchAll();

            return Response::success($compra);
        } catch (Throwable $e) {
            return Response::error('Error al obtener compra: ' . $e->getMessage(), 500);
        }
    }

    public function create(ServerRequestInterface $request, ResponseInterface $response): ResponseInterface
    {
        try {
            $db   = (new Database($this->config))->getConnection();
            $body = $request->getParsedBody() ?? [];
            $user = $request->getAttribute('user');

            if (empty($body['proveedor_id'])) {
                return Response::error('El proveedor es requerido', 422);
            }
            if (empty($body['items']) || !is_array($body['items'])) {
                return Response::error('Se requieren ítems para la compra', 422);
            }

            $db->beginTransaction();

            $fecha = $body['fecha'] ?? date('Y-m-d');
            $total = 0.0;

            foreach ($body['items'] as $item) {
                $cant = (float)($item['cantidad'] ?? 0);
                $prec = (float)($item['precio_unitario'] ?? 0);
                $total += ($cant * $prec);
            }

            $stmt = $db->prepare(
                "INSERT INTO compras (proveedor_id, numero_comprobante, total, estado, notas, fecha, created_by, created_at, updated_at)
                 VALUES (?, ?, ?, 'completada', ?, ?, ?, NOW(), NOW())"
            );

            $stmt->execute([
                (int) $body['proveedor_id'],
                $body['numero_comprobante'] ?? null,
                $total,
                $body['notas'] ?? null,
                $fecha,
                $user['id'] ?? null,
            ]);

            $compraId = (int) $db->lastInsertId();

            foreach ($body['items'] as $item) {
                $productoId = !empty($item['producto_id']) ? (int) $item['producto_id'] : null;
                $cant = (float)($item['cantidad'] ?? 0);
                $prec = (float)($item['precio_unitario'] ?? 0);
                $subtotal = $cant * $prec;
                
                $desc = $item['descripcion'] ?? null;

                $stmtItem = $db->prepare(
                    "INSERT INTO compra_items (compra_id, producto_id, descripcion, cantidad, precio_unitario, subtotal, created_at)
                     VALUES (?, ?, ?, ?, ?, ?, NOW())"
                );
                $stmtItem->execute([$compraId, $productoId, $desc, $cant, $prec, $subtotal]);

                // Actualizar stock y precio_costo
                if ($productoId && $cant > 0) {
                    $stmtUpdate = $db->prepare(
                        "UPDATE productos 
                         SET stock_actual = stock_actual + ?, precio_costo = ?, updated_at = NOW() 
                         WHERE id = ?"
                    );
                    $stmtUpdate->execute([$cant, $prec, $productoId]);

                    // Registrar movimiento de stock
                    $stmtMov = $db->prepare(
                        "INSERT INTO movimientos_stock (producto_id, cantidad, tipo_movimiento, referencia_id, notas) 
                         VALUES (?, ?, 'compra', ?, 'Ingreso por compra a proveedor')"
                    );
                    $stmtMov->execute([$productoId, $cant, $compraId]);
                }
            }

            $db->commit();

            return Response::success(['id' => $compraId, 'message' => 'Compra registrada y stock actualizado'], 201);
        } catch (Throwable $e) {
            if (isset($db) && $db->inTransaction()) {
                $db->rollBack();
            }
            return Response::error('Error al registrar compra: ' . $e->getMessage(), 500);
        }
    }
}
