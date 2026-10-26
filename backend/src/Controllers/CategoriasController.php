<?php

declare(strict_types=1);

namespace App\Controllers;

use App\Database;
use App\Helpers\Response;
use App\Helpers\UploadHelper;
use Psr\Http\Message\ResponseInterface;
use Psr\Http\Message\ServerRequestInterface;
use Throwable;

class CategoriasController
{
    private array $config;

    public function __construct(array $config)
    {
        $this->config = $config;
    }

    /**
     * GET /api/v1/categorias
     */
    public function index(ServerRequestInterface $request, ResponseInterface $response): ResponseInterface
    {
        try {
            $db = (new Database($this->config))->getConnection();

            $stmt = $db->prepare(
                "SELECT c.id, c.nombre, c.descripcion, c.icono, c.imagen_url, c.es_destacada, c.parent_id,
                        p.nombre AS parent_nombre, c.created_at,
                        (SELECT COUNT(*) FROM productos prod WHERE (prod.categoria_id = c.id OR prod.categoria_secundaria_id = c.id) AND prod.activo = 1) AS productos_count
                 FROM categorias_producto c
                 LEFT JOIN categorias_producto p ON p.id = c.parent_id
                 ORDER BY COALESCE(p.nombre, c.nombre) ASC, c.parent_id IS NOT NULL ASC, c.nombre ASC"
            );
            $stmt->execute();
            $categorias = $stmt->fetchAll();

            // Map id to category for building full paths (e.g. DIDACTICOS > MATEMATICA)
            $byId = [];
            foreach ($categorias as $cat) {
                $byId[$cat['id']] = $cat;
            }

            foreach ($categorias as &$cat) {
                $path = [$cat['nombre']];
                $currParentId = $cat['parent_id'] ? (int) $cat['parent_id'] : null;
                $visited = [$cat['id']];
                while ($currParentId && isset($byId[$currParentId]) && !in_array($currParentId, $visited, true)) {
                    $visited[] = $currParentId;
                    array_unshift($path, $byId[$currParentId]['nombre']);
                    $currParentId = $byId[$currParentId]['parent_id'] ? (int) $byId[$currParentId]['parent_id'] : null;
                }
                $cat['path'] = implode(' > ', $path);
            }
            unset($cat);

            return Response::success($categorias);
        } catch (Throwable $e) {
            return Response::error('Error al obtener categorías: ' . $e->getMessage(), 500);
        }
    }

    /**
     * POST /api/v1/categorias
     */
    public function create(ServerRequestInterface $request, ResponseInterface $response): ResponseInterface
    {
        try {
            $db   = (new Database($this->config))->getConnection();
            $body = $request->getParsedBody() ?? [];

            if (empty(trim($body['nombre'] ?? ''))) {
                return Response::error('El nombre de la categoría es requerido', 422);
            }

            $parentId = !empty($body['parent_id']) ? (int) $body['parent_id'] : null;
            if ($parentId !== null) {
                $stmtP = $db->prepare("SELECT id FROM categorias_producto WHERE id = ?");
                $stmtP->execute([$parentId]);
                if (!$stmtP->fetch()) {
                    return Response::error('La categoría padre seleccionada no existe', 422);
                }
            }

            $imagenUrl = $this->processImage($body['imagen_url'] ?? null);

            $stmt = $db->prepare(
                "INSERT INTO categorias_producto (nombre, descripcion, icono, imagen_url, es_destacada, parent_id, created_at)
                 VALUES (?, ?, ?, ?, ?, ?, NOW())"
            );
            $stmt->execute([
                trim($body['nombre']),
                $body['descripcion'] ?? null,
                $body['icono'] ?? '✨',
                $imagenUrl,
                !empty($body['es_destacada']) ? 1 : 0,
                $parentId
            ]);

            $newId = (int) $db->lastInsertId();
            $stmt2 = $db->prepare(
                "SELECT c.id, c.nombre, c.descripcion, c.icono, c.imagen_url, c.es_destacada, c.parent_id,
                        p.nombre AS parent_nombre, c.created_at, 0 AS productos_count
                 FROM categorias_producto c
                 LEFT JOIN categorias_producto p ON p.id = c.parent_id
                 WHERE c.id = ?"
            );
            $stmt2->execute([$newId]);
            $created = $stmt2->fetch();
            $created['path'] = $created['parent_nombre'] ? "{$created['parent_nombre']} > {$created['nombre']}" : $created['nombre'];

            return Response::success($created, 201);
        } catch (Throwable $e) {
            return Response::error('Error al crear categoría: ' . $e->getMessage(), 500);
        }
    }

    /**
     * PUT /api/v1/categorias/{id}
     */
    public function update(ServerRequestInterface $request, ResponseInterface $response, array $args): ResponseInterface
    {
        try {
            $id   = (int) $args['id'];
            $db   = (new Database($this->config))->getConnection();
            $body = $request->getParsedBody() ?? [];

            if (empty(trim($body['nombre'] ?? ''))) {
                return Response::error('El nombre de la categoría es requerido', 422);
            }

            $parentId = !empty($body['parent_id']) ? (int) $body['parent_id'] : null;
            if ($parentId !== null) {
                if ($parentId === $id) {
                    return Response::error('Una categoría no puede ser su propia categoría padre', 422);
                }
                // Prevenir loops en el árbol
                $curr = $parentId;
                $visited = [$id];
                while ($curr) {
                    if (in_array($curr, $visited, true)) {
                        return Response::error('No se puede asignar una subcategoría dependiente como categoría padre (referencia circular)', 422);
                    }
                    $visited[] = $curr;
                    $stmtC = $db->prepare("SELECT parent_id FROM categorias_producto WHERE id = ?");
                    $stmtC->execute([$curr]);
                    $row = $stmtC->fetch();
                    $curr = $row && $row['parent_id'] ? (int)$row['parent_id'] : null;
                }
            }

            $imagenUrl = $this->processImage($body['imagen_url'] ?? null);

            $stmt = $db->prepare("UPDATE categorias_producto SET nombre = ?, descripcion = ?, icono = ?, imagen_url = ?, es_destacada = ?, parent_id = ? WHERE id = ?");
            $stmt->execute([
                trim($body['nombre']),
                $body['descripcion'] ?? null,
                $body['icono'] ?? '✨',
                $imagenUrl,
                !empty($body['es_destacada']) ? 1 : 0,
                $parentId,
                $id
            ]);

            $stmt2 = $db->prepare(
                "SELECT c.id, c.nombre, c.descripcion, c.icono, c.imagen_url, c.es_destacada, c.parent_id,
                        p.nombre AS parent_nombre, c.created_at,
                        (SELECT COUNT(*) FROM productos prod WHERE (prod.categoria_id = c.id OR prod.categoria_secundaria_id = c.id) AND prod.activo = 1) AS productos_count
                 FROM categorias_producto c
                 LEFT JOIN categorias_producto p ON p.id = c.parent_id
                 WHERE c.id = ?"
            );
            $stmt2->execute([$id]);
            $updated = $stmt2->fetch();
            $updated['path'] = $updated['parent_nombre'] ? "{$updated['parent_nombre']} > {$updated['nombre']}" : $updated['nombre'];

            return Response::success($updated);
        } catch (Throwable $e) {
            return Response::error('Error al actualizar categoría: ' . $e->getMessage(), 500);
        }
    }

    private function processImage(?string $img): ?string
    {
        if (empty($img)) {
            return null;
        }
        return UploadHelper::processSingleImage($img);
    }

    /**
     * DELETE /api/v1/categorias/{id}
     * Verifica que la categoría no tenga subcategorías ni productos asociados antes de eliminar
     */
    public function destroy(ServerRequestInterface $request, ResponseInterface $response, array $args): ResponseInterface
    {
        try {
            $id = (int) $args['id'];
            $db = (new Database($this->config))->getConnection();

            // Verificar si hay subcategorías que dependen de esta categoría
            $stmtSubs = $db->prepare("SELECT COUNT(*) FROM categorias_producto WHERE parent_id = ?");
            $stmtSubs->execute([$id]);
            $subCount = (int) $stmtSubs->fetchColumn();
            if ($subCount > 0) {
                return Response::error("No se puede eliminar la categoría porque contiene {$subCount} subcategoría(s) hija(s). Reasigne o elimine las subcategorías primero.", 400);
            }

            // Verificar si hay productos asociados a esta categoría (como principal o secundaria)
            $stmtCheck = $db->prepare("SELECT COUNT(*) FROM productos WHERE (categoria_id = ? OR categoria_secundaria_id = ?) AND activo = 1");
            $stmtCheck->execute([$id, $id]);
            $count = (int) $stmtCheck->fetchColumn();

            if ($count > 0) {
                return Response::error("No se puede eliminar la categoría porque contiene {$count} producto(s) asociado(s). Reasigne o elimine los productos primero.", 400);
            }

            $stmtDelete = $db->prepare("DELETE FROM categorias_producto WHERE id = ?");
            $stmtDelete->execute([$id]);

            if ($stmtDelete->rowCount() === 0) {
                return Response::error('Categoría no encontrada', 404);
            }

            return Response::success(['message' => 'Categoría eliminada correctamente']);
        } catch (Throwable $e) {
            return Response::error('Error al eliminar categoría: ' . $e->getMessage(), 500);
        }
    }
}
