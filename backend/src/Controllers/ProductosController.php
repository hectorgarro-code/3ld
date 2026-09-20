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

    private function processSingleImage(string $img, string $uploadDir): ?string
    {
        $img = trim($img);
        if (empty($img)) {
            return null;
        }

        // Caso 1: Imagen Base64
        if (preg_match('/^data:image\/(\w+);base64,/', $img, $type)) {
            $base64Data = substr($img, strpos($img, ',') + 1);
            $ext = strtolower($type[1]);
            if (!in_array($ext, ['jpg', 'jpeg', 'png', 'webp'])) {
                $ext = 'jpg';
            }
            $decoded = base64_decode($base64Data);
            if ($decoded !== false) {
                $fileName = uniqid('prd_') . '.' . $ext;
                $filePath = $uploadDir . $fileName;
                if (file_put_contents($filePath, $decoded)) {
                    return '/backend/public/uploads/productos/' . $fileName;
                }
            }
        }

        // Caso 2: Imagen desde Proxy MakerWorld
        if (str_contains($img, 'proxy-image')) {
            $parsed = parse_url($img);
            parse_str($parsed['query'] ?? '', $qParams);
            if (!empty($qParams['url'])) {
                $rawUrl = $qParams['url'];
                $hashName = 'mw_' . md5($rawUrl) . '.jpg';
                $destPath = $uploadDir . $hashName;
                if (!file_exists($destPath) || filesize($destPath) < 500) {
                    $ch = curl_init();
                    curl_setopt($ch, CURLOPT_URL, $rawUrl);
                    curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
                    curl_setopt($ch, CURLOPT_FOLLOWLOCATION, true);
                    curl_setopt($ch, CURLOPT_USERAGENT, 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36');
                    curl_setopt($ch, CURLOPT_TIMEOUT, 15);
                    curl_setopt($ch, CURLOPT_SSL_VERIFYPEER, false);
                    $data = curl_exec($ch);
                    curl_close($ch);
                    if (!empty($data) && strlen($data) > 500) {
                        file_put_contents($destPath, $data);
                    }
                }
                if (file_exists($destPath) && filesize($destPath) > 500) {
                    return '/backend/public/uploads/productos/' . $hashName;
                }
            }
        }

        // Caso 3: URL ya existente o remota válida
        return $img;
    }

    private function handleImageUpload(array &$body): void
    {
        $uploadDir = __DIR__ . '/../../public/uploads/productos/';
        if (!is_dir($uploadDir)) {
            mkdir($uploadDir, 0777, true);
        }

        $processedImages = [];

        // Si se envió array de imágenes (hasta 5)
        if (!empty($body['imagenes']) && is_array($body['imagenes'])) {
            foreach (array_slice($body['imagenes'], 0, 5) as $imgItem) {
                if (is_string($imgItem)) {
                    $res = $this->processSingleImage($imgItem, $uploadDir);
                    if ($res) {
                        $processedImages[] = $res;
                    }
                }
            }
        }

        // Si se envió imagen_base64 individual
        if (!empty($body['imagen_base64'])) {
            $single = $this->processSingleImage($body['imagen_base64'], $uploadDir);
            if ($single && !in_array($single, $processedImages, true)) {
                array_unshift($processedImages, $single);
            }
        }

        // Si se envió imagen_url individual
        if (!empty($body['imagen_url'])) {
            $single = $this->processSingleImage($body['imagen_url'], $uploadDir);
            if ($single && !in_array($single, $processedImages, true)) {
                if (empty($processedImages)) {
                    $processedImages[] = $single;
                }
            }
        }

        $processedImages = array_values(array_unique(array_slice($processedImages, 0, 5)));

        if (!empty($processedImages)) {
            $body['imagen_url'] = $processedImages[0];
            $body['imagenes']   = $processedImages;
        }
    }
}
