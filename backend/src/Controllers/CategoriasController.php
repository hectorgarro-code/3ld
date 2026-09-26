<?php

declare(strict_types=1);

namespace App\Controllers;

use App\Database;
use App\Helpers\Response;
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
                "SELECT c.id, c.nombre, c.descripcion, c.icono, c.imagen_url, c.es_destacada, c.created_at,
                        (SELECT COUNT(*) FROM productos p WHERE p.categoria_id = c.id AND p.activo = 1) AS productos_count
                 FROM categorias_producto c
                 ORDER BY c.es_destacada DESC, c.nombre ASC"
            );
            $stmt->execute();
            $categorias = $stmt->fetchAll();

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

            $stmt = $db->prepare(
                "INSERT INTO categorias_producto (nombre, descripcion, icono, imagen_url, es_destacada, created_at)
                 VALUES (?, ?, ?, ?, ?, NOW())"
            );
            $stmt->execute([
                trim($body['nombre']),
                $body['descripcion'] ?? null,
                $body['icono'] ?? '✨',
                $body['imagen_url'] ?? null,
                !empty($body['es_destacada']) ? 1 : 0,
            ]);

            $newId = (int) $db->lastInsertId();
            $stmt2 = $db->prepare("SELECT id, nombre, descripcion, icono, imagen_url, es_destacada, created_at, 0 AS productos_count FROM categorias_producto WHERE id = ?");
            $stmt2->execute([$newId]);

            return Response::success($stmt2->fetch(), 201);
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

            $stmt = $db->prepare("UPDATE categorias_producto SET nombre = ?, descripcion = ?, icono = ?, imagen_url = ?, es_destacada = ? WHERE id = ?");
            $stmt->execute([
                trim($body['nombre']),
                $body['descripcion'] ?? null,
                $body['icono'] ?? '✨',
                $body['imagen_url'] ?? null,
                !empty($body['es_destacada']) ? 1 : 0,
                $id
            ]);

            $stmt2 = $db->prepare(
                "SELECT c.id, c.nombre, c.descripcion, c.icono, c.imagen_url, c.es_destacada, c.created_at,
                        (SELECT COUNT(*) FROM productos p WHERE p.categoria_id = c.id AND p.activo = 1) AS productos_count
                 FROM categorias_producto c WHERE c.id = ?"
            );
            $stmt2->execute([$id]);

            return Response::success($stmt2->fetch());
        } catch (Throwable $e) {
            return Response::error('Error al actualizar categoría: ' . $e->getMessage(), 500);
        }
    }

    /**
     * DELETE /api/v1/categorias/{id}
     * Verifica que la categoría esté vacía (0 productos asociados) antes de eliminar
     */
    public function destroy(ServerRequestInterface $request, ResponseInterface $response, array $args): ResponseInterface
    {
        try {
            $id = (int) $args['id'];
            $db = (new Database($this->config))->getConnection();

            // Verificar si hay productos asociados a esta categoría
            $stmtCheck = $db->prepare("SELECT COUNT(*) FROM productos WHERE categoria_id = ? AND activo = 1");
            $stmtCheck->execute([$id]);
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
