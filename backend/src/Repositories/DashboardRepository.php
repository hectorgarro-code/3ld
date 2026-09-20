<?php

declare(strict_types=1);

namespace App\Repositories;

use PDO;

class DashboardRepository
{
    private PDO $db;

    public function __construct(PDO $db)
    {
        $this->db = $db;
    }

    public function getKpis(): array
    {
        $today = date('Y-m-d');
        $firstDayMonth = date('Y-m-01');
        $firstDayPrevMonth = date('Y-m-01', strtotime('-1 month'));
        $lastDayPrevMonth = date('Y-m-t', strtotime('-1 month'));

        $ventasHoy = 0.0;
        try {
            $stmtVentasHoy = $this->db->prepare(
                "SELECT COALESCE(SUM(total), 0) FROM pedidos 
                 WHERE DATE(created_at) = ? AND estado NOT IN ('anulado', 'cancelado')"
            );
            $stmtVentasHoy->execute([$today]);
            $ventasHoy = (float) $stmtVentasHoy->fetchColumn();
        } catch (\Throwable $e) {}

        $ventasMes = 0.0;
        try {
            $stmtVentasMes = $this->db->prepare(
                "SELECT COALESCE(SUM(total), 0) FROM pedidos 
                 WHERE DATE(created_at) >= ? AND estado NOT IN ('anulado', 'cancelado')"
            );
            $stmtVentasMes->execute([$firstDayMonth]);
            $ventasMes = (float) $stmtVentasMes->fetchColumn();
        } catch (\Throwable $e) {}

        $ventasMesAnterior = 0.0;
        try {
            $stmtVentasMesAnterior = $this->db->prepare(
                "SELECT COALESCE(SUM(total), 0) FROM pedidos 
                 WHERE DATE(created_at) BETWEEN ? AND ? AND estado NOT IN ('anulado', 'cancelado')"
            );
            $stmtVentasMesAnterior->execute([$firstDayMonth ? $firstDayPrevMonth : $today, $lastDayPrevMonth]);
            $ventasMesAnterior = (float) $stmtVentasMesAnterior->fetchColumn();
        } catch (\Throwable $e) {}

        $saldoPorCobrar = 0.0;
        try {
            $stmtSaldoCobrar = $this->db->query(
                "SELECT COALESCE(SUM(CASE WHEN saldo_pendiente > 0 THEN saldo_pendiente ELSE total END), 0) FROM pedidos 
                 WHERE estado NOT IN ('anulado', 'cancelado', 'cobrado')"
            );
            $saldoPorCobrar = (float) $stmtSaldoCobrar->fetchColumn();
        } catch (\Throwable $e) {
            try {
                $stmtSaldoCobrar = $this->db->query(
                    "SELECT COALESCE(SUM(total), 0) FROM pedidos 
                     WHERE estado NOT IN ('anulado', 'cancelado', 'cobrado')"
                );
                $saldoPorCobrar = (float) $stmtSaldoCobrar->fetchColumn();
            } catch (\Throwable $e2) {}
        }

        $costosMes = 0.0;
        try {
            $stmtCostosMes = $this->db->prepare(
                "SELECT COALESCE(SUM(pi.cantidad * COALESCE(pi.costo_unitario, pr.precio_costo, 0)), 0) 
                 FROM pedido_items pi 
                 JOIN pedidos p ON p.id = pi.pedido_id 
                 LEFT JOIN productos pr ON pr.id = pi.producto_id
                 WHERE DATE(p.created_at) >= ? AND p.estado NOT IN ('anulado', 'cancelado')"
            );
            $stmtCostosMes->execute([$firstDayMonth]);
            $costosMes = (float) $stmtCostosMes->fetchColumn();
        } catch (\Throwable $e) {}
        $rentabilidadMes = max(0, $ventasMes - $costosMes);

        $pedidosPendientes = 0;
        try {
            $stmtPendientes = $this->db->query(
                "SELECT COUNT(*) FROM pedidos WHERE estado IN ('pendiente', 'en_produccion', 'listo')"
            );
            $pedidosPendientes = (int) $stmtPendientes->fetchColumn();
        } catch (\Throwable $e) {}

        $impresorasActivas = 0;
        try {
            $stmtImpresoras = $this->db->query("SELECT COUNT(*) FROM impresoras WHERE estado = 'imprimiendo'");
            $impresorasActivas = (int) $stmtImpresoras->fetchColumn();
        } catch (\Throwable $e) {}

        return [
            'ventas_hoy'          => $ventasHoy,
            'ventas_mes'          => $ventasMes,
            'ventas_mes_anterior' => $ventasMesAnterior,
            'saldo_por_cobrar'    => $saldoPorCobrar,
            'rentabilidad_mes'    => $rentabilidadMes,
            'pedidos_pendientes'  => $pedidosPendientes,
            'impresoras_activas'  => $impresorasActivas,
        ];
    }

    public function getAlertas(): array
    {
        $alertas = [];

        // Productos bajo stock mínimo
        try {
            $stmtStock = $this->db->query(
                "SELECT id, nombre, stock_actual, stock_minimo 
                 FROM productos 
                 WHERE activo = 1 AND stock_actual <= stock_minimo 
                 LIMIT 10"
            );
            $stockBajo = $stmtStock->fetchAll();
            foreach ($stockBajo as $item) {
                $alertas[] = [
                    'tipo'    => 'stock_minimo',
                    'titulo'  => 'Stock Crítico',
                    'mensaje' => "El producto '{$item['nombre']}' tiene stock actual de {$item['stock_actual']} (mínimo: {$item['stock_minimo']})",
                    'item_id' => $item['id'],
                ];
            }
        } catch (\Throwable $e) {}

        // Filamentos bajo stock
        try {
            $stmtFil = $this->db->query(
                "SELECT id, nombre, stock_rollos, stock_minimo_rollos 
                 FROM filamentos 
                 WHERE activo = 1 AND stock_rollos <= stock_minimo_rollos 
                 LIMIT 10"
            );
            $filBajo = $stmtFil->fetchAll();
            foreach ($filBajo as $f) {
                $alertas[] = [
                    'tipo'    => 'filamento_bajo',
                    'titulo'  => 'Filamento Agotándose',
                    'mensaje' => "El filamento '{$f['nombre']}' tiene {$f['stock_rollos']} rollo(s) (mínimo: {$f['stock_minimo_rollos']})",
                    'item_id' => $f['id'],
                ];
            }
        } catch (\Throwable $e) {
            try {
                $stmtFil = $this->db->query(
                    "SELECT id, nombre, peso_actual_g, peso_minimo_g 
                     FROM filamentos 
                     WHERE activo = 1 AND peso_actual_g <= peso_minimo_g 
                     LIMIT 10"
                );
                $filBajo = $stmtFil->fetchAll();
                foreach ($filBajo as $f) {
                    $alertas[] = [
                        'tipo'    => 'filamento_bajo',
                        'titulo'  => 'Filamento Agotándose',
                        'mensaje' => "El filamento '{$f['nombre']}' tiene {$f['peso_actual_g']}g (mínimo: {$f['peso_minimo_g']}g)",
                        'item_id' => $f['id'],
                    ];
                }
            } catch (\Throwable $e2) {}
        }

        return $alertas;
    }
}
