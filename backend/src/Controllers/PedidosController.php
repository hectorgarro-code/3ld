<?php

declare(strict_types=1);

namespace App\Controllers;

use App\Database;
use App\Helpers\Response;
use App\Repositories\PedidoRepository;
use Psr\Http\Message\ResponseInterface;
use Psr\Http\Message\ServerRequestInterface;
use Throwable;

class PedidosController
{
    private PedidoRepository $repository;

    public function __construct(array $config)
    {
        $db = (new Database($config))->getConnection();
        $this->repository = new PedidoRepository($db);
    }

    public function index(ServerRequestInterface $request, ResponseInterface $response): ResponseInterface
    {
        try {
            $params = $request->getQueryParams();
            $page      = max(1, (int) ($params['page']     ?? 1));
            $perPage   = min(1000, max(1, (int) ($params['per_page'] ?? 500)));
            $offset    = ($page - 1) * $perPage;

            $result = $this->repository->findAll($params, $perPage, $offset);

            return Response::paginated($result['data'], $result['total'], $page, $perPage);
        } catch (Throwable $e) {
            return Response::error('Error al obtener pedidos: ' . $e->getMessage(), 500);
        }
    }

    public function show(ServerRequestInterface $request, ResponseInterface $response, array $args): ResponseInterface
    {
        try {
            $id = (int) $args['id'];
            $pedido = $this->repository->findById($id);

            if (!$pedido) {
                return Response::error('Pedido no encontrado', 404);
            }

            return Response::success($pedido);
        } catch (Throwable $e) {
            return Response::error('Error al obtener pedido: ' . $e->getMessage(), 500);
        }
    }

    public function create(ServerRequestInterface $request, ResponseInterface $response): ResponseInterface
    {
        try {
            $body = $request->getParsedBody() ?? [];
            $user = $request->getAttribute('user');

            if (empty($body['cliente_id'])) {
                return Response::error('El cliente es requerido', 422);
            }

            $pedido = $this->repository->create($body, $user['id'] ?? null);

            return Response::success($pedido, 201);
        } catch (Throwable $e) {
            return Response::error('Error al crear pedido: ' . $e->getMessage(), 500);
        }
    }

    public function update(ServerRequestInterface $request, ResponseInterface $response, array $args): ResponseInterface
    {
        try {
            $id   = (int) $args['id'];
            $body = $request->getParsedBody() ?? [];

            if (!$this->repository->exists($id)) {
                return Response::error('Pedido no encontrado', 404);
            }

            $pedido = $this->repository->update($id, $body);

            return Response::success($pedido);
        } catch (Throwable $e) {
            return Response::error('Error al actualizar pedido: ' . $e->getMessage(), 500);
        }
    }

    public function destroy(ServerRequestInterface $request, ResponseInterface $response, array $args): ResponseInterface
    {
        try {
            $id = (int) $args['id'];
            $estado = $this->repository->findEstado($id);

            if (!$estado) {
                return Response::error('Pedido no encontrado', 404);
            }

            if (in_array($estado, ['en_produccion', 'terminado', 'entregado'], true)) {
                return Response::error('No se puede eliminar un pedido en estado: ' . $estado, 409);
            }

            $this->repository->delete($id);

            return Response::success(['message' => 'Pedido anulado correctamente']);
        } catch (Throwable $e) {
            return Response::error('Error al anular pedido: ' . $e->getMessage(), 500);
        }
    }

    public function addItem(ServerRequestInterface $request, ResponseInterface $response, array $args): ResponseInterface
    {
        try {
            $id   = (int) $args['id'];
            $body = $request->getParsedBody() ?? [];
            $user = $request->getAttribute('user');

            if (!$this->repository->exists($id)) {
                return Response::error('Pedido no encontrado', 404);
            }

            $item = $this->repository->addItem($id, $body, $user['id'] ?? null);

            return Response::success($item, 201);
        } catch (Throwable $e) {
            return Response::error('Error al agregar item: ' . $e->getMessage(), 500);
        }
    }

    public function cambiarEstado(ServerRequestInterface $request, ResponseInterface $response, array $args): ResponseInterface
    {
        try {
            $id   = (int) $args['id'];
            $body = $request->getParsedBody() ?? [];
            $user = $request->getAttribute('user');

            $estadosValidos = [
                'presupuesto', 'aprobado', 'en_produccion',
                'terminado', 'entregado', 'cobrado', 'anulado',
            ];

            $nuevoEstado = $body['estado'] ?? '';

            if (!in_array($nuevoEstado, $estadosValidos, true)) {
                return Response::error(
                    'Estado inválido. Valores: ' . implode(', ', $estadosValidos),
                    422
                );
            }

            if (!$this->repository->exists($id)) {
                return Response::error('Pedido no encontrado', 404);
            }

            $estadoActual = $this->repository->findEstado($id);

            if ($nuevoEstado === 'cobrado' && $estadoActual !== 'entregado') {
                return Response::error('El pedido debe estar entregado antes de poder marcarse como cobrado para asegurar el descuento de stock.', 422);
            }

            $pedido = $this->repository->cambiarEstado($id, $nuevoEstado, $body['nota'] ?? null, $user['id'] ?? null);

            return Response::success($pedido);
        } catch (Throwable $e) {
            return Response::error('Error al cambiar estado: ' . $e->getMessage(), 500);
        }
    }

    public function simularEntrega(ServerRequestInterface $request, ResponseInterface $response, array $args): ResponseInterface
    {
        try {
            $id = (int) $args['id'];
            if (!$this->repository->exists($id)) {
                return Response::error('Pedido no encontrado', 404);
            }

            $impactos = $this->repository->simularEntrega($id);
            return Response::success(['impactos' => $impactos]);
        } catch (Throwable $e) {
            return Response::error('Error al simular entrega: ' . $e->getMessage(), 500);
        }
    }

    public function itemsIndex(ServerRequestInterface $request, ResponseInterface $response): ResponseInterface
    {
        try {
            $params = $request->getQueryParams();
            $page      = max(1, (int) ($params['page']     ?? 1));
            $perPage   = min(1000, max(1, (int) ($params['per_page'] ?? 500)));
            $offset    = ($page - 1) * $perPage;

            $result = $this->repository->findAllItems($params, $perPage, $offset);

            return Response::paginated($result['data'], $result['total'], $page, $perPage);
        } catch (Throwable $e) {
            return Response::error('Error al obtener ítems: ' . $e->getMessage(), 500);
        }
    }

    public function cambiarEstadoItem(ServerRequestInterface $request, ResponseInterface $response, array $args): ResponseInterface
    {
        try {
            $id   = (int) $args['id'];
            $body = $request->getParsedBody() ?? [];
            $user = $request->getAttribute('user');

            $estadosValidos = [
                'presupuesto', 'aprobado', 'en_produccion',
                'terminado', 'entregado', 'cobrado', 'anulado',
            ];

            $nuevoEstado = $body['estado'] ?? '';

            if (!in_array($nuevoEstado, $estadosValidos, true)) {
                return Response::error('Estado inválido', 422);
            }

            // In repository, find item logic is inside cambiarEstadoItem directly
            $this->repository->cambiarEstadoItem($id, $nuevoEstado, $user['id'] ?? null);

            return Response::success(['message' => 'Estado actualizado']);
        } catch (Throwable $e) {
            return Response::error('Error al cambiar estado del ítem: ' . $e->getMessage(), 500);
        }
    }
}
