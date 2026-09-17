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
                "SELECT id, nombre, descripcion, created_at
                 FROM categorias_producto
                 ORDER BY nombre ASC"
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
                "INSERT INTO categorias_producto (nombre, descripcion, created_at)
                 VALUES (?, ?, NOW())"
            );
            $stmt->execute([
                trim($body['nombre']),
                $body['descripcion'] ?? null,
            ]);

            $newId = (int) $db->lastInsertId();
            $stmt2 = $db->prepare("SELECT * FROM categorias_producto WHERE id = ?");
            $stmt2->execute([$newId]);

            return Response::success($stmt2->fetch(), 201);
        } catch (Throwable $e) {
            return Response::error('Error al crear categoría: ' . $e->getMessage(), 500);
        }
    }
}
