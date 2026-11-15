<?php

declare(strict_types=1);

namespace App\Controllers;

use App\Helpers\Response;
use App\Repositories\EstructurasPrecioRepository;
use Psr\Http\Message\ResponseInterface;
use Psr\Http\Message\ServerRequestInterface;
use Throwable;

class EstructurasPrecioController
{
    private EstructurasPrecioRepository $repo;

    public function __construct(EstructurasPrecioRepository $repo)
    {
        $this->repo = $repo;
    }

    /**
     * GET /api/v1/estructuras-precio
     */
    public function index(ServerRequestInterface $request, ResponseInterface $response): ResponseInterface
    {
        try {
            $list = $this->repo->getAll();
            return Response::success($list);
        } catch (Throwable $e) {
            return Response::error('Error al listar estructuras de precio: ' . $e->getMessage(), 500);
        }
    }

    /**
     * POST /api/v1/estructuras-precio
     */
    public function store(ServerRequestInterface $request, ResponseInterface $response): ResponseInterface
    {
        try {
            $data = (array)$request->getParsedBody();
            $nombre = trim((string)($data['nombre'] ?? ''));
            $escalas = (array)($data['escalas'] ?? []);
            $id = !empty($data['id']) ? (int)$data['id'] : null;

            if (empty($nombre)) {
                return Response::error('El nombre de la estructura es obligatorio.', 400);
            }

            if (empty($escalas)) {
                return Response::error('Debes definir al menos una escala de cantidad y precio.', 400);
            }

            $saved = $this->repo->save($nombre, $escalas, $id);
            return Response::success($saved);
        } catch (Throwable $e) {
            return Response::error('Error al guardar estructura de precio: ' . $e->getMessage(), 500);
        }
    }

    /**
     * DELETE /api/v1/estructuras-precio/{id}
     */
    public function destroy(ServerRequestInterface $request, ResponseInterface $response, array $args): ResponseInterface
    {
        try {
            $id = (int)$args['id'];
            $ok = $this->repo->delete($id);
            return Response::success(['deleted' => $ok]);
        } catch (Throwable $e) {
            return Response::error('Error al eliminar estructura: ' . $e->getMessage(), 500);
        }
    }

    /**
     * GET /api/v1/estructuras-precio/{id}/productos
     */
    public function getProductos(ServerRequestInterface $request, ResponseInterface $response, array $args): ResponseInterface
    {
        try {
            $id = (int)$args['id'];
            $prods = $this->repo->getProductosByEstructura($id);
            return Response::success($prods);
        } catch (Throwable $e) {
            return Response::error('Error al obtener productos de la estructura: ' . $e->getMessage(), 500);
        }
    }

    /**
     * POST /api/v1/estructuras-precio/{id}/aplicar
     * Aplica la estructura y sus escalas a los productos seleccionados
     */
    public function apply(ServerRequestInterface $request, ResponseInterface $response, array $args): ResponseInterface
    {
        try {
            $id = (int)$args['id'];
            $data = (array)$request->getParsedBody();
            $productIds = array_map('intval', (array)($data['product_ids'] ?? []));
            $customEscalas = isset($data['escalas']) && is_array($data['escalas']) ? $data['escalas'] : null;

            if (empty($productIds)) {
                return Response::error('Debes seleccionar al menos un producto.', 400);
            }

            $count = $this->repo->applyToProducts($id, $productIds, $customEscalas);
            return Response::success([
                'message' => "Estructura aplicada con éxito a {$count} producto(s).",
                'affected_count' => $count
            ]);
        } catch (Throwable $e) {
            return Response::error('Error al aplicar estructura masiva: ' . $e->getMessage(), 500);
        }
    }
}

