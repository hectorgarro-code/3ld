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

    /**
     * GET /api/v1/clientes/{id}/precios-especiales
     */
    public function getPreciosEspeciales(ServerRequestInterface $request, ResponseInterface $response, array $args): ResponseInterface
    {
        try {
            $id = (int) $args['id'];
            $list = $this->repository->getPreciosEspeciales($id);
            return Response::success($list);
        } catch (Throwable $e) {
            return Response::error('Error al obtener precios especiales: ' . $e->getMessage(), 500);
        }
    }

    /**
     * POST /api/v1/clientes/{id}/precios-especiales
     */
    public function setPrecioEspecial(ServerRequestInterface $request, ResponseInterface $response, array $args): ResponseInterface
    {
        try {
            $id = (int) $args['id'];
            $body = $request->getParsedBody() ?? [];
            $productoId = (int) ($body['producto_id'] ?? 0);
            $precio = (float) ($body['precio_especial'] ?? 0);

            if ($productoId <= 0 || $precio < 0) {
                return Response::error('Datos inválidos para precio especial', 422);
            }

            $this->repository->setPrecioEspecial($id, $productoId, $precio);
            return Response::success(['message' => 'Precio especial guardado correctamente']);
        } catch (Throwable $e) {
            return Response::error('Error al guardar precio especial: ' . $e->getMessage(), 500);
        }
    }

    /**
     * DELETE /api/v1/clientes/{id}/precios-especiales/{productoId}
     */
    public function deletePrecioEspecial(ServerRequestInterface $request, ResponseInterface $response, array $args): ResponseInterface
    {
        try {
            $id = (int) $args['id'];
            $productoId = (int) $args['productoId'];

            $this->repository->deletePrecioEspecial($id, $productoId);
            return Response::success(['message' => 'Precio especial eliminado correctamente']);
        } catch (Throwable $e) {
            return Response::error('Error al eliminar precio especial: ' . $e->getMessage(), 500);
        }
    }
}
