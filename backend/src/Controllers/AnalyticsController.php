<?php

declare(strict_types=1);

namespace App\Controllers;

use App\Helpers\Response;
use App\Repositories\AnalyticsRepository;
use Psr\Http\Message\ResponseInterface;
use Psr\Http\Message\ServerRequestInterface;
use Throwable;

class AnalyticsController
{
    private AnalyticsRepository $repository;

    public function __construct(AnalyticsRepository $repository)
    {
        $this->repository = $repository;
    }

    /**
     * POST /api/v1/analytics/track
     * Endpoint público ultra liviano y optimizado para navigator.sendBeacon y fetch background
     */
    public function track(ServerRequestInterface $request, ResponseInterface $response): ResponseInterface
    {
        try {
            $parsed = $request->getParsedBody();

            // Si vino como raw JSON o string (típico de sendBeacon)
            if (empty($parsed) || !is_array($parsed)) {
                $raw = (string)$request->getBody();
                if (!empty($raw)) {
                    $decoded = json_decode($raw, true);
                    if (is_array($decoded)) {
                        $parsed = $decoded;
                    }
                }
            }

            if (!is_array($parsed)) {
                $parsed = [];
            }

            // Extraer IP del cliente considerando proxies (Cloudflare / Hostinger)
            $serverParams = $request->getServerParams();
            $ip = $serverParams['HTTP_CF_CONNECTING_IP']
                ?? $serverParams['HTTP_X_FORWARDED_FOR']
                ?? $serverParams['REMOTE_ADDR']
                ?? '127.0.0.1';

            if (str_contains($ip, ',')) {
                $ip = trim(explode(',', $ip)[0]);
            }

            $ua = $serverParams['HTTP_USER_AGENT'] ?? '';

            $this->repository->recordTrack($parsed, $ip, $ua);

            $res = Response::success(['tracked' => true]);
            // Encabezados para evitar almacenamiento en caché de analíticas
            return $res->withHeader('Cache-Control', 'no-store, no-cache, must-revalidate');
        } catch (Throwable $e) {
            // No romper la experiencia en caso de fallo
            return Response::success(['tracked' => false]);
        }
    }

    /**
     * GET /api/v1/analytics/stats
     * Endpoint administrativo protegido para ver métricas consolidadas
     */
    public function getStats(ServerRequestInterface $request, ResponseInterface $response): ResponseInterface
    {
        try {
            $params = $request->getQueryParams();
            $period = $params['period'] ?? '7d';

            $stats = $this->repository->getStats($period);
            return Response::success($stats);
        } catch (Throwable $e) {
            return Response::error('Error al obtener estadísticas de visitas: ' . $e->getMessage(), 500);
        }
    }
}
