<?php
declare(strict_types=1);
namespace App\Services;
use PDO;

final class DeliveryCoverageReport
{
    public function __construct(private PDO $db) {}

    public function report(string $period): array
    {
        $days = match ($period) { '30d' => 30, '90d' => 90, default => 7 };
        $since = $period === 'today' ? 'CURDATE()' : "DATE_SUB(NOW(), INTERVAL {$days} DAY)";
        $events = $this->db->query("SELECT e.session_id,e.metadata FROM tienda_visitas_eventos e INNER JOIN tienda_visitas v ON BINARY v.session_id=BINARY e.session_id WHERE e.tipo='whatsapp_click' AND e.created_at >= $since AND e.created_at <= NOW() AND v.is_bot=0 AND v.is_staff=0 ORDER BY e.created_at,e.id")->fetchAll(PDO::FETCH_ASSOC);
        return self::summarize($events);
    }

    public static function summarize(array $events): array
    {
        $groups = [];
        foreach ($events as $event) {
            $meta = json_decode((string)($event['metadata'] ?? ''), true);
            if (!is_array($meta) || ($meta['origen'] ?? '') !== 'carrito_fuera_cobertura') continue;
            $cp = trim((string)($meta['codigo_postal'] ?? ''));
            if (!preg_match('/^\d{4}$/D', $cp)) $cp = 'Sin código válido';
            $session = (string)($event['session_id'] ?? '');
            if ($session === '') continue;
            $groups[$cp] ??= ['codigo_postal' => $cp, 'clics' => 0, 'sesiones' => []];
            $groups[$cp]['clics']++;
            $value = $meta['valor'] ?? 0;
            $groups[$cp]['sesiones'][$session] = is_numeric($value) && is_finite((float)$value) && (float)$value >= 0 ? (float)$value : 0.0;
        }
        $rows = [];
        foreach ($groups as $group) {
            $rows[] = ['codigo_postal' => $group['codigo_postal'], 'clics' => $group['clics'], 'sesiones' => count($group['sesiones']), 'valor_carritos' => round(array_sum($group['sesiones']), 2)];
        }
        usort($rows, fn($a, $b) => ($b['sesiones'] <=> $a['sesiones']) ?: ($b['clics'] <=> $a['clics']) ?: strcmp($a['codigo_postal'], $b['codigo_postal']));
        return $rows;
    }
}
