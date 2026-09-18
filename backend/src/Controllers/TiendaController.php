<?php

declare(strict_types=1);

namespace App\Controllers;

use App\Helpers\Response;
use App\Repositories\TiendaRepository;
use Psr\Http\Message\ResponseInterface;
use Psr\Http\Message\ServerRequestInterface;
use Throwable;

class TiendaController
{
    private TiendaRepository $repository;

    public function __construct(TiendaRepository $repository)
    {
        $this->repository = $repository;
    }

    /**
     * GET /api/v1/tienda/productos
     * Endpoint público para cargar el catálogo de la tienda
     */
    public function getProductos(ServerRequestInterface $request, ResponseInterface $response): ResponseInterface
    {
        try {
            $params = $request->getQueryParams();
            $productos = $this->repository->getProductosPublicos($params);
            return Response::success($productos);
        } catch (Throwable $e) {
            return Response::error('Error al obtener productos de tienda: ' . $e->getMessage(), 500);
        }
    }

    /**
     * PUT /api/v1/tienda/productos/{id}
     * Endpoint admin para actualizar la publicación en tienda
     */
    public function updateProducto(ServerRequestInterface $request, ResponseInterface $response, array $args): ResponseInterface
    {
        try {
            $id = (int) $args['id'];
            $data = (array) $request->getParsedBody();
            $success = $this->repository->updateTiendaProduct($id, $data);
            if ($success) {
                return Response::success(['message' => 'Producto actualizado en la tienda']);
            }
            return Response::error('No se pudo actualizar el producto', 400);
        } catch (Throwable $e) {
            return Response::error('Error: ' . $e->getMessage(), 500);
        }
    }

    /**
     * POST /api/v1/tienda/productos/{id}/toggle
     * Activar o desactivar publicación en la tienda
     */
    public function toggle(ServerRequestInterface $request, ResponseInterface $response, array $args): ResponseInterface
    {
        try {
            $id = (int) $args['id'];
            $data = (array) $request->getParsedBody();
            $esTienda = !empty($data['es_tienda']);
            $this->repository->toggleTiendaStatus($id, $esTienda);
            return Response::success(['message' => $esTienda ? 'Producto publicado en tienda' : 'Producto retirado de la tienda']);
        } catch (Throwable $e) {
            return Response::error('Error al cambiar visibilidad: ' . $e->getMessage(), 500);
        }
    }

    /**
     * GET /api/v1/tienda/config
     * Obtener configuración visual y bloques de la tienda (Elementor)
     */
    public function getConfig(ServerRequestInterface $request, ResponseInterface $response): ResponseInterface
    {
        try {
            $file = __DIR__ . '/../../config/tienda_config.json';
            if (file_exists($file)) {
                $content = json_decode(file_get_contents($file), true);
                return Response::success($content);
            }
            return Response::success(null);
        } catch (Throwable $e) {
            return Response::error('Error al leer configuración de tienda: ' . $e->getMessage(), 500);
        }
    }

    /**
     * POST /api/v1/tienda/config
     * Guardar configuración visual del editor de tienda (Elementor)
     */
    public function saveConfig(ServerRequestInterface $request, ResponseInterface $response): ResponseInterface
    {
        try {
            $data = $request->getParsedBody();
            $file = __DIR__ . '/../../config/tienda_config.json';
            file_put_contents($file, json_encode($data, JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE));
            return Response::success(['config' => $data, 'message' => 'Configuración visual guardada correctamente']);
        } catch (Throwable $e) {
            return Response::error('Error al guardar configuración: ' . $e->getMessage(), 500);
        }
    }
}
