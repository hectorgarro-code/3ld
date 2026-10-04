<?php

declare(strict_types=1);

namespace App\Repositories;

use PDO;
use Throwable;

class AnalyticsRepository
{
    private PDO $db;

    public function __construct(PDO $db)
    {
        $this->db = $db;
    }

    /**
     * Parsear dispositivo, navegador y sistema operativo desde User-Agent
     */
    private function parseUserAgent(string $ua): array
    {
        $uaLower = strtolower($ua);

        // Dispositivo
        $device = 'desktop';
        if (preg_match('/(ipad|tablet|(android(?!.*mobile))|(windows(?!.*phone)(.*touch))|kindle)/i', $uaLower)) {
            $device = 'tablet';
        } elseif (preg_match('/(mobile|iphone|ipod|android.*mobile|blackberry|iemobile|opera mini)/i', $uaLower)) {
            $device = 'mobile';
        }

        // Sistema Operativo
        $os = 'Otro';
        if (str_contains($uaLower, 'android')) {
            $os = 'Android';
        } elseif (str_contains($uaLower, 'iphone') || str_contains($uaLower, 'ipad') || str_contains($uaLower, 'ios')) {
            $os = 'iOS';
        } elseif (str_contains($uaLower, 'windows')) {
            $os = 'Windows';
        } elseif (str_contains($uaLower, 'mac os') || str_contains($uaLower, 'macintosh')) {
            $os = 'macOS';
        } elseif (str_contains($uaLower, 'linux')) {
            $os = 'Linux';
        }

        // Navegador / App
        $browser = 'Navegador Web';
        if (str_contains($uaLower, 'whatsapp')) {
            $browser = 'WhatsApp In-App';
        } elseif (str_contains($uaLower, 'instagram')) {
            $browser = 'Instagram In-App';
        } elseif (str_contains($uaLower, 'fbav') || str_contains($uaLower, 'facebook')) {
            $browser = 'Facebook In-App';
        } elseif (str_contains($uaLower, 'edg/')) {
            $browser = 'Edge';
        } elseif (str_contains($uaLower, 'chrome/') && !str_contains($uaLower, 'edg/')) {
            $browser = 'Chrome';
        } elseif (str_contains($uaLower, 'safari/') && !str_contains($uaLower, 'chrome/')) {
            $browser = 'Safari';
        } elseif (str_contains($uaLower, 'firefox/')) {
            $browser = 'Firefox';
        }

        return [
            'device_type' => $device,
            'os'          => $os,
            'browser'     => $browser,
        ];
    }

    /**
     * Registrar evento de visita de forma ultra ligera y no bloqueante
     */
    public function recordTrack(array $payload, string $ip, string $ua): bool
    {
        try {
            $sessionId = !empty($payload['session_id']) ? substr((string)$payload['session_id'], 0, 64) : bin2hex(random_bytes(16));
            $tipo = !empty($payload['tipo']) ? substr((string)$payload['tipo'], 0, 50) : 'pageview';
            $url = !empty($payload['url']) ? substr((string)$payload['url'], 0, 500) : null;
            $referer = !empty($payload['referer']) ? substr((string)$payload['referer'], 0, 500) : null;
            $productoId = !empty($payload['producto_id']) ? substr((string)$payload['producto_id'], 0, 50) : null;
            $productoNombre = !empty($payload['producto_nombre']) ? substr((string)$payload['producto_nombre'], 0, 255) : null;
            $metadata = !empty($payload['metadata']) ? json_encode($payload['metadata']) : null;

            $ipHash = hash('sha256', $ip . date('Y-m'));
            $uaInfo = $this->parseUserAgent($ua);

            // 1. Upsert en tienda_visitas (sesión)
            $stmtVisit = $this->db->prepare(
                "INSERT INTO tienda_visitas
                    (session_id, ip_hash, user_agent, device_type, browser, os, referer, landing_page, created_at, updated_at)
                 VALUES (?, ?, ?, ?, ?, ?, ?, ?, NOW(), NOW())
                 ON DUPLICATE KEY UPDATE
                    updated_at = NOW(),
                    device_type = VALUES(device_type),
                    browser = VALUES(browser),
                    os = VALUES(os)"
            );
            $stmtVisit->execute([
                $sessionId,
                $ipHash,
                substr($ua, 0, 500),
                $uaInfo['device_type'],
                $uaInfo['browser'],
                $uaInfo['os'],
                $referer,
                $url
            ]);

            // 2. Insertar evento en tienda_visitas_eventos
            $stmtEvent = $this->db->prepare(
                "INSERT INTO tienda_visitas_eventos
                    (session_id, tipo, producto_id, producto_nombre, metadata, url, created_at)
                 VALUES (?, ?, ?, ?, ?, ?, NOW())"
            );
            $stmtEvent->execute([
                $sessionId,
                $tipo,
                $productoId,
                $productoNombre,
                $metadata,
                $url
            ]);

            return true;
        } catch (Throwable $e) {
            // Falla en silencio para garantizar 0 impacto en la experiencia del usuario
            error_log('[AnalyticsRepository Error] ' . $e->getMessage());
            return false;
        }
    }

    /**
     * Obtener métricas consolidadas para el panel de administración
     */
    public function getStats(string $period = '7d'): array
    {
        $days = match ($period) {
            'today' => 1,
            '30d'   => 30,
            '90d'   => 90,
            default => 7,
        };

        $intervalSql = $period === 'today'
            ? "DATE(created_at) = CURDATE()"
            : "created_at >= DATE_SUB(NOW(), INTERVAL {$days} DAY)";

        // 1. Resumen general
        $stmtSummary = $this->db->query(
            "SELECT
                COUNT(DISTINCT session_id) AS total_sesiones,
                COUNT(DISTINCT ip_hash) AS visitantes_unicos
             FROM tienda_visitas
             WHERE {$intervalSql}"
        );
        $summary = $stmtSummary->fetch(PDO::FETCH_ASSOC) ?: ['total_sesiones' => 0, 'visitantes_unicos' => 0];

        // 2. Conteo de eventos agrupados por tipo
        $stmtEventos = $this->db->query(
            "SELECT tipo, COUNT(*) AS total
             FROM tienda_visitas_eventos
             WHERE {$intervalSql}
             GROUP BY tipo"
        );
        $eventosMap = [];
        while ($row = $stmtEventos->fetch(PDO::FETCH_ASSOC)) {
            $eventosMap[$row['tipo']] = (int)$row['total'];
        }

        // 3. Distribución por dispositivo
        $stmtDevices = $this->db->query(
            "SELECT device_type, COUNT(*) AS count
             FROM tienda_visitas
             WHERE {$intervalSql}
             GROUP BY device_type"
        );
        $devices = $stmtDevices->fetchAll(PDO::FETCH_ASSOC);

        // 4. Distribución por navegadores y OS
        $stmtBrowsers = $this->db->query(
            "SELECT browser, COUNT(*) AS count
             FROM tienda_visitas
             WHERE {$intervalSql}
             GROUP BY browser
             ORDER BY count DESC
             LIMIT 6"
        );
        $browsers = $stmtBrowsers->fetchAll(PDO::FETCH_ASSOC);

        $stmtOs = $this->db->query(
            "SELECT os, COUNT(*) AS count
             FROM tienda_visitas
             WHERE {$intervalSql}
             GROUP BY os
             ORDER BY count DESC
             LIMIT 6"
        );
        $operatingSystems = $stmtOs->fetchAll(PDO::FETCH_ASSOC);

        // 5. Productos más vistos
        $stmtTopProducts = $this->db->query(
            "SELECT producto_id, producto_nombre, COUNT(*) AS vistas
             FROM tienda_visitas_eventos
             WHERE {$intervalSql} AND tipo = 'ver_producto' AND producto_id IS NOT NULL
             GROUP BY producto_id, producto_nombre
             ORDER BY vistas DESC
             LIMIT 10"
        );
        $topProducts = $stmtTopProducts->fetchAll(PDO::FETCH_ASSOC);

        // 6. Timeline diario (últimos días)
        $stmtTimeline = $this->db->query(
            "SELECT
                DATE(created_at) AS fecha,
                COUNT(DISTINCT session_id) AS sesiones,
                COUNT(*) AS total_eventos
             FROM tienda_visitas_eventos
             WHERE {$intervalSql}
             GROUP BY DATE(created_at)
             ORDER BY fecha ASC"
        );
        $timeline = $stmtTimeline->fetchAll(PDO::FETCH_ASSOC);

        // 7. Últimas 40 visitas en vivo con sus últimos eventos
        $stmtRecent = $this->db->query(
            "SELECT v.session_id, v.device_type, v.browser, v.os, v.referer, v.landing_page,
                    v.created_at, v.updated_at,
                    (SELECT COUNT(*) FROM tienda_visitas_eventos e WHERE e.session_id = v.session_id) as total_acciones,
                    (SELECT e.tipo FROM tienda_visitas_eventos e WHERE e.session_id = v.session_id ORDER BY e.id DESC LIMIT 1) as ultima_accion,
                    (SELECT e.producto_nombre FROM tienda_visitas_eventos e WHERE e.session_id = v.session_id AND e.producto_nombre IS NOT NULL ORDER BY e.id DESC LIMIT 1) as ultimo_producto
             FROM tienda_visitas v
             ORDER BY v.updated_at DESC
             LIMIT 40"
        );
        $recentVisits = $stmtRecent->fetchAll(PDO::FETCH_ASSOC);

        return [
            'period'           => $period,
            'total_sesiones'   => (int)($summary['total_sesiones'] ?? 0),
            'visitantes_unicos'=> (int)($summary['visitantes_unicos'] ?? 0),
            'eventos'          => [
                'pageviews'        => $eventosMap['pageview'] ?? 0,
                'vistas_producto'  => $eventosMap['ver_producto'] ?? 0,
                'vistas_historias' => $eventosMap['ver_historia'] ?? 0,
                'likes'            => $eventosMap['like_producto'] ?? 0,
                'carritos'         => $eventosMap['agregar_carrito'] ?? 0,
                'whatsapp'         => $eventosMap['whatsapp_click'] ?? 0,
                'cotizaciones'     => $eventosMap['cotizar_click'] ?? 0,
            ],
            'devices'          => $devices,
            'browsers'         => $browsers,
            'os'               => $operatingSystems,
            'top_products'     => $topProducts,
            'timeline'         => $timeline,
            'recent_visits'    => $recentVisits,
        ];
    }
}
