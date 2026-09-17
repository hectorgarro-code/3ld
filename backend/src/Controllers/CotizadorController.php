<?php

declare(strict_types=1);

namespace App\Controllers;

use App\Database;
use App\Helpers\Response;
use App\Repositories\CotizadorRepository;
use Psr\Http\Message\ResponseInterface;
use Psr\Http\Message\ServerRequestInterface;
use Throwable;

class CotizadorController
{
    private CotizadorRepository $repository;

    public function __construct(array $config)
    {
        $db = (new Database($config))->getConnection();
        $this->repository = new CotizadorRepository($db);
    }

    public function calcular(ServerRequestInterface $request, ResponseInterface $response): ResponseInterface
    {
        try {
            $body = $request->getParsedBody() ?? [];

            $gramos       = (float) ($body['gramos']       ?? 0);
            $tiempoMin    = (float) ($body['tiempo_min']   ?? 0);
            $filamentoId  = (int)   ($body['filamento_id'] ?? 0);
            $margenPct    = (float) ($body['margen_pct']   ?? 30);
            $multiplicador = (float) ($body['multiplicador'] ?? 1.0);

            if ($gramos <= 0 || $tiempoMin <= 0) {
                return Response::error('Gramos y tiempo_min deben ser mayores a 0', 422);
            }

            $cfg = $this->repository->getConfigCostos();

            $costoPorGramo = 0.0;
            $filamentoInfo = null;

            if ($filamentoId > 0) {
                $filamentoInfo = $this->repository->getFilamentoInfo($filamentoId);
                if ($filamentoInfo) {
                    $costoPorGramo = (float) ($filamentoInfo['costo_por_gramo'] ?? 0);
                }
            }

            $tiempoHoras = $tiempoMin / 60;

            $costoMaterial    = $gramos * $costoPorGramo;
            $costoEnergia     = ($cfg['consumo_watts'] ?? 200) / 1000 * $tiempoHoras * (float) $cfg['precio_kwh'];
            $costoAmortizacion = (float) $cfg['valor_compra_impresora_promedio']
                                 / max(1, (float) $cfg['vida_util_horas_promedio'])
                                 * $tiempoHoras;
            $costoManoObra    = $tiempoHoras * (float) $cfg['valor_hora_operario'];

            $costoTotal  = $costoMaterial + $costoEnergia + $costoAmortizacion + $costoManoObra;
            $costoTotal *= $multiplicador;

            $margen      = $costoTotal * ($margenPct / 100);
            $precioVenta = $costoTotal + $margen;

            return Response::success([
                'inputs' => [
                    'gramos'        => $gramos,
                    'tiempo_min'    => $tiempoMin,
                    'filamento_id'  => $filamentoId,
                    'margen_pct'    => $margenPct,
                    'multiplicador' => $multiplicador,
                ],
                'filamento' => $filamentoInfo,
                'breakdown' => [
                    'costo_material'     => round($costoMaterial, 2),
                    'costo_energia'      => round($costoEnergia, 2),
                    'costo_amortizacion' => round($costoAmortizacion, 2),
                    'costo_mano_obra'    => round($costoManoObra, 2),
                    'costo_total'        => round($costoTotal, 2),
                    'margen'             => round($margen, 2),
                    'precio_venta'       => round($precioVenta, 2),
                ],
                'config_costos' => $cfg,
            ]);
        } catch (Throwable $e) {
            return Response::error('Error al calcular cotización: ' . $e->getMessage(), 500);
        }
    }

    public function guardar(ServerRequestInterface $request, ResponseInterface $response): ResponseInterface
    {
        try {
            $body = $request->getParsedBody() ?? [];
            $user = $request->getAttribute('user');

            if (empty($body['precio_venta'])) {
                return Response::error('precio_venta es requerido', 422);
            }

            $cotizacion = $this->repository->guardarCotizacion($body, $user['id'] ?? null);

            return Response::success($cotizacion, 201);
        } catch (Throwable $e) {
            return Response::error('Error al guardar cotización: ' . $e->getMessage(), 500);
        }
    }

    public function config(ServerRequestInterface $request, ResponseInterface $response): ResponseInterface
    {
        try {
            $cfg = $this->repository->getConfigCostos();
            return Response::success($cfg);
        } catch (Throwable $e) {
            return Response::error('Error al obtener configuración: ' . $e->getMessage(), 500);
        }
    }

    public function updateConfig(ServerRequestInterface $request, ResponseInterface $response): ResponseInterface
    {
        try {
            $body = $request->getParsedBody() ?? [];
            $user = $request->getAttribute('user');

            if (($user['rol'] ?? '') !== 'admin') {
                return Response::error('Acceso denegado: se requiere rol admin', 403);
            }

            $cfg = $this->repository->updateConfig($body);

            if (!$cfg) {
                return Response::error('No hay campos para actualizar', 422);
            }

            return Response::success($cfg);
        } catch (Throwable $e) {
            return Response::error('Error al actualizar configuración: ' . $e->getMessage(), 500);
        }
    }
}
