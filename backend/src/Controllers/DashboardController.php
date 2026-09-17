<?php

declare(strict_types=1);

namespace App\Controllers;

use App\Helpers\Response;
use App\Repositories\DashboardRepository;
use Psr\Http\Message\ResponseInterface;
use Psr\Http\Message\ServerRequestInterface;
use Throwable;

class DashboardController
{
    private DashboardRepository $repository;

    public function __construct(DashboardRepository $repository)
    {
        $this->repository = $repository;
    }

    /**
     * GET /api/v1/dashboard/kpis
     */
    public function kpis(ServerRequestInterface $request, ResponseInterface $response): ResponseInterface
    {
        try {
            $kpis = $this->repository->getKpis();
            return Response::success($kpis);
        } catch (Throwable $e) {
            return Response::error('Error al obtener KPIs: ' . $e->getMessage(), 500);
        }
    }

    /**
     * GET /api/v1/dashboard/alertas
     */
    public function alertas(ServerRequestInterface $request, ResponseInterface $response): ResponseInterface
    {
        try {
            $alertas = $this->repository->getAlertas();
            return Response::success($alertas);
        } catch (Throwable $e) {
            return Response::error('Error al obtener alertas: ' . $e->getMessage(), 500);
        }
    }
}
