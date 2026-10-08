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

            // 1. Descartar bots y rastreadores web automáticos
            if ($this->isBot($ua)) {
                return Response::success(['tracked' => false, 'reason' => 'bot_excluded']);
            }

            // 2. Descartar accesos de personal administrativo u operarios (con token en cabecera)
            $authHeader = $request->getHeaderLine('Authorization');
            if (!empty($authHeader) && str_starts_with($authHeader, 'Bearer ')) {
                return Response::success(['tracked' => false, 'reason' => 'staff_excluded']);
            }

            // 3. Descartar si el cliente reporta modo previsualización o personal
            if (!empty($parsed['is_staff']) || !empty($parsed['is_preview'])) {
                return Response::success(['tracked' => false, 'reason' => 'preview_excluded']);
            }

            // 4. Descartar si la URL corresponde a pantallas privadas del panel del sistema
            $pageUrl = (string)($parsed['url'] ?? '');
            if (preg_match('#/(ventas|pedidos|dashboard|configuracion|clientes|produccion|compras|proveedores|login)#i', $pageUrl)) {
                return Response::success(['tracked' => false, 'reason' => 'internal_route_excluded']);
            }

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
     * Detectar si el User-Agent proviene de un bot, scraper o rastreador
     */
    private function isBot(string $ua): bool
    {
        if (empty($ua)) {
            return false;
        }
        $botPattern = '/(bot|crawler|spider|slurp|facebookexternalhit|whatsapp|google-read-aloud|semrush|ahrefs|bingbot|yandex|bytespider|duckduckbot|applebot|headlesschrome|lighthouse|phantomjs|curl|wget|python|postman|insomnia|headless)/i';
        return (bool)preg_match($botPattern, $ua);
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
