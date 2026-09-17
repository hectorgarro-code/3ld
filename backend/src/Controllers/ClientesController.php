<?php

declare(strict_types=1);

namespace App\Controllers;

use App\Helpers\Response;
use App\Repositories\ClienteRepository;
use Psr\Http\Message\ResponseInterface;
use Psr\Http\Message\ServerRequestInterface;
use Throwable;

class ClientesController
{
    private ClienteRepository $repository;

    public function __construct(ClienteRepository $repository)
    {
        $this->repository = $repository;
    }

    /**
     * GET /api/v1/clientes
     */
    public function index(ServerRequestInterface $request, ResponseInterface $response): ResponseInterface
    {
        try {
            $params = $request->getQueryParams();
            $result = $this->repository->findAll($params);
            return Response::paginated(
                $result['data'],
                $result['meta']['total'],
                $result['meta']['page'],
                $result['meta']['per_page']
            );
        } catch (Throwable $e) {
            return Response::error('Error al obtener clientes: ' . $e->getMessage(), 500);
        }
    }

    /**
     * GET /api/v1/clientes/{id}
     */
    public function show(ServerRequestInterface $request, ResponseInterface $response, array $args): ResponseInterface
    {
        try {
            $id = (int) $args['id'];
            $cliente = $this->repository->findById($id);

            if (!$cliente) {
                return Response::error('Cliente no encontrado', 404);
            }

            return Response::success($cliente);
        } catch (Throwable $e) {
            return Response::error('Error al obtener cliente: ' . $e->getMessage(), 500);
        }
    }

    /**
     * POST /api/v1/clientes
     */
    public function create(ServerRequestInterface $request, ResponseInterface $response): ResponseInterface
    {
        try {
            $body = $request->getParsedBody() ?? [];

            if (empty(trim($body['nombre'] ?? ''))) {
                return Response::error('El nombre del cliente es requerido', 422);
            }

            $nuevoCliente = $this->repository->create($body);
            return Response::success($nuevoCliente, 201);
        } catch (Throwable $e) {
            return Response::error('Error al crear cliente: ' . $e->getMessage(), 500);
        }
    }

    /**
     * PUT /api/v1/clientes/{id}
     */
    public function update(ServerRequestInterface $request, ResponseInterface $response, array $args): ResponseInterface
    {
        try {
            $id   = (int) $args['id'];
            $body = $request->getParsedBody() ?? [];

            $updated = $this->repository->update($id, $body);
            if (!$updated) {
                return Response::error('Cliente no encontrado', 404);
            }

            return Response::success($updated);
        } catch (Throwable $e) {
            return Response::error('Error al actualizar cliente: ' . $e->getMessage(), 500);
        }
    }

    /**
     * DELETE /api/v1/clientes/{id}
     */
    public function destroy(ServerRequestInterface $request, ResponseInterface $response, array $args): ResponseInterface
    {
        try {
            $id = (int) $args['id'];
            $deleted = $this->repository->delete($id);
            if (!$deleted) {
                return Response::error('Cliente no encontrado', 404);
            }

            return Response::success(['message' => 'Cliente eliminado correctamente']);
        } catch (Throwable $e) {
            return Response::error('Error al eliminar cliente: ' . $e->getMessage(), 500);
        }
    }
}
