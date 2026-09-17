<?php

declare(strict_types=1);

namespace App\Controllers;

use App\Helpers\Response;
use App\Repositories\ProductoRepository;
use Psr\Http\Message\ResponseInterface;
use Psr\Http\Message\ServerRequestInterface;
use Throwable;

class ProductosController
{
    private ProductoRepository $repository;

    public function __construct(ProductoRepository $repository)
    {
        $this->repository = $repository;
    }

    /**
     * GET /api/v1/productos
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
            return Response::error('Error al obtener productos: ' . $e->getMessage(), 500);
        }
    }

    /**
     * GET /api/v1/productos/{id}
     */
    public function show(ServerRequestInterface $request, ResponseInterface $response, array $args): ResponseInterface
    {
        try {
            $id = (int) $args['id'];
            $producto = $this->repository->findById($id);

            if (!$producto) {
                return Response::error('Producto no encontrado', 404);
            }

            return Response::success($producto);
        } catch (Throwable $e) {
            return Response::error('Error al obtener producto: ' . $e->getMessage(), 500);
        }
    }

    /**
     * POST /api/v1/productos
     */
    public function create(ServerRequestInterface $request, ResponseInterface $response): ResponseInterface
    {
        try {
            $body = $request->getParsedBody() ?? [];

            $this->handleImageUpload($body);

            if (empty(trim($body['nombre'] ?? ''))) {
                return Response::error('El nombre del producto es requerido', 422);
            }

            $nuevoProducto = $this->repository->create($body);
            return Response::success($nuevoProducto, 201);
        } catch (Throwable $e) {
            return Response::error('Error al crear producto: ' . $e->getMessage(), 500);
        }
    }

    /**
     * PUT /api/v1/productos/{id}
     */
    public function update(ServerRequestInterface $request, ResponseInterface $response, array $args): ResponseInterface
    {
        try {
            $id   = (int) $args['id'];
            $body = $request->getParsedBody() ?? [];

            $this->handleImageUpload($body);

            $updated = $this->repository->update($id, $body);
            if (!$updated) {
                return Response::error('Producto no encontrado o nada que actualizar', 404);
            }

            return Response::success($updated);
        } catch (Throwable $e) {
            return Response::error('Error al actualizar producto: ' . $e->getMessage(), 500);
        }
    }

    /**
     * DELETE /api/v1/productos/{id}
     */
    public function destroy(ServerRequestInterface $request, ResponseInterface $response, array $args): ResponseInterface
    {
        try {
            $id = (int) $args['id'];
            $deleted = $this->repository->delete($id);
            if (!$deleted) {
                return Response::error('Producto no encontrado', 404);
            }

            return Response::success(['message' => 'Producto eliminado correctamente']);
        } catch (Throwable $e) {
            return Response::error('Error al eliminar producto: ' . $e->getMessage(), 500);
        }
    }

    private function handleImageUpload(array &$body): void
    {
        if (!empty($body['imagen_base64'])) {
            $base64Data = $body['imagen_base64'];
            if (preg_match('/^data:image\/(\w+);base64,/', $base64Data, $type)) {
                $base64Data = substr($base64Data, strpos($base64Data, ',') + 1);
                $ext = strtolower($type[1]);
                if (!in_array($ext, ['jpg', 'jpeg', 'png', 'webp'])) {
                    throw new \Exception('Formato de imagen inválido');
                }
                $decoded = base64_decode($base64Data);
                if ($decoded === false) {
                    throw new \Exception('Fallo al decodificar imagen Base64');
                }
                
                $uploadDir = __DIR__ . '/../../public/uploads/productos/';
                if (!is_dir($uploadDir)) {
                    mkdir($uploadDir, 0777, true);
                }
                
                $fileName = uniqid() . '.' . $ext;
                $filePath = $uploadDir . $fileName;
                
                if (file_put_contents($filePath, $decoded)) {
                    $body['imagen_url'] = '/uploads/productos/' . $fileName;
                } else {
                    throw new \Exception('No se pudo guardar la imagen en disco');
                }
            }
        }
    }
}
