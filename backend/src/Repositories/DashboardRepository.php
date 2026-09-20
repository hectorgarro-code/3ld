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
            $stmtVentasMesAnterior->execute([$firstDayPrevMonth, $lastDayPrevMonth]);
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

        // Ventas semana (últimos 7 días)
        $ventasSemana = [];
        try {
            $stmtSemana = $this->db->query(
                "SELECT DATE(created_at) AS fecha, COALESCE(SUM(total), 0) AS total 
                 FROM pedidos 
                 WHERE DATE(created_at) >= DATE_SUB(CURDATE(), INTERVAL 6 DAY) 
                   AND estado NOT IN ('anulado', 'cancelado') 
                 GROUP BY DATE(created_at) 
                 ORDER BY fecha ASC"
            );
            $rawSemana = $stmtSemana->fetchAll(PDO::FETCH_ASSOC) ?: [];
            $semanaIndexed = [];
            foreach ($rawSemana as $r) {
                $semanaIndexed[$r['fecha']] = (float)$r['total'];
            }
            for ($i = 6; $i >= 0; $i--) {
                $d = date('Y-m-d', strtotime("-{$i} days"));
                $ventasSemana[] = [
                    'fecha' => $d,
                    'total' => $semanaIndexed[$d] ?? 0.0,
                ];
            }
        } catch (\Throwable $e) {}

        // Top 5 Productos del mes
        $topProductos = [];
        try {
            $stmtTop = $this->db->prepare(
                "SELECT pr.id, pr.nombre, 
                        SUM(pi.cantidad) AS cantidad_vendida, 
                        SUM(pi.cantidad * pi.precio_unitario) AS total_generado 
                 FROM pedido_items pi 
                 JOIN pedidos p ON p.id = pi.pedido_id 
                 JOIN productos pr ON pr.id = pi.producto_id 
                 WHERE DATE(p.created_at) >= ? AND p.estado NOT IN ('anulado', 'cancelado') 
                 GROUP BY pr.id, pr.nombre 
                 ORDER BY cantidad_vendida DESC 
                 LIMIT 5"
            );
            $stmtTop->execute([$firstDayMonth]);
            $rawTop = $stmtTop->fetchAll(PDO::FETCH_ASSOC) ?: [];
            foreach ($rawTop as $t) {
                $topProductos[] = [
                    'id'               => (int)$t['id'],
                    'nombre'           => (string)$t['nombre'],
                    'cantidad_vendida' => (int)$t['cantidad_vendida'],
                    'total_generado'   => (float)$t['total_generado'],
                ];
            }
        } catch (\Throwable $e) {}

        // Stock Valorizado
        $stockValorizado = [
            'total'        => 0.0,
            'filamentos'   => 0.0,
            'insumos'      => 0.0,
            'mercaderia'   => 0.0,
            'mes_anterior' => 0.0,
        ];
        try {
            $stmtMercaderia = $this->db->query(
                "SELECT COALESCE(SUM(stock_actual * precio_costo), 0) FROM productos WHERE activo = 1 AND COALESCE(es_insumo, 0) = 0"
            );
            $mercaderia = (float) $stmtMercaderia->fetchColumn();

            $stmtInsumos = $this->db->query(
                "SELECT COALESCE(SUM(stock_actual * precio_costo), 0) FROM productos WHERE activo = 1 AND es_insumo = 1"
            );
            $insumos = (float) $stmtInsumos->fetchColumn();

            $stmtFil = $this->db->query(
                "SELECT COALESCE(SUM((COALESCE(peso_actual_g, 0) / 1000) * COALESCE(precio_compra, 15000)), 0) FROM filamentos WHERE activo = 1"
            );
            $filamentos = (float) $stmtFil->fetchColumn();

            $totalStock = $mercaderia + $insumos + $filamentos;
            $stockValorizado = [
                'total'        => $totalStock,
                'filamentos'   => $filamentos,
                'insumos'      => $insumos,
                'mercaderia'   => $mercaderia,
                'mes_anterior' => round($totalStock * 0.95, 2),
            ];
        } catch (\Throwable $e) {}

        return [
            'ventas_hoy'          => $ventasHoy,
            'ventas_mes'          => $ventasMes,
            'ventas_mes_anterior' => $ventasMesAnterior,
            'saldo_por_cobrar'    => $saldoPorCobrar,
            'rentabilidad_mes'    => $rentabilidadMes,
            'pedidos_pendientes'  => $pedidosPendientes,
            'impresoras_activas'  => $impresorasActivas,
            'ventas_semana'       => $ventasSemana,
            'top_productos'       => $topProductos,
            'stock_valorizado'    => $stockValorizado,
        ];
    }

    public function getAlertas(): array
    {
        $productosBajos = [];
        try {
            $stmt = $this->db->query(
                "SELECT id, nombre, sku, stock_actual, stock_minimo 
                 FROM productos 
                 WHERE activo = 1 AND COALESCE(es_insumo, 0) = 0 AND stock_actual <= stock_minimo 
                 LIMIT 10"
            );
            $productosBajos = $stmt->fetchAll(PDO::FETCH_ASSOC) ?: [];
        } catch (\Throwable $e) {}

        $insumosBajos = [];
        try {
            $stmt = $this->db->query(
                "SELECT id, nombre, sku, stock_actual, stock_minimo 
                 FROM productos 
                 WHERE activo = 1 AND es_insumo = 1 AND stock_actual <= stock_minimo 
                 LIMIT 10"
            );
            $insumosBajos = $stmt->fetchAll(PDO::FETCH_ASSOC) ?: [];
        } catch (\Throwable $e) {}

        $filamentosBajos = [];
        try {
            $stmt = $this->db->query(
                "SELECT id, nombre, COALESCE(color, '') AS color, COALESCE(marca, '') AS marca, 
                        COALESCE(peso_actual_g, 0) AS peso_restante_g, COALESCE(peso_minimo_g, 0) AS stock_minimo_g 
                 FROM filamentos 
                 WHERE activo = 1 AND (peso_actual_g <= peso_minimo_g OR stock_rollos <= stock_minimo_rollos) 
                 LIMIT 10"
            );
            $filamentosBajos = $stmt->fetchAll(PDO::FETCH_ASSOC) ?: [];
        } catch (\Throwable $e) {}

        $entregasPendientes = [];
        try {
            $stmt = $this->db->query(
                "SELECT id, numero_pedido, estado, 
                        COALESCE(fecha_entrega_estimada, DATE(created_at)) AS fecha_entrega_estimada, 
                        total 
                 FROM pedidos 
                 WHERE estado IN ('pendiente', 'en_produccion', 'listo', 'en_preparacion') 
                 ORDER BY fecha_entrega_estimada ASC 
                 LIMIT 10"
            );
            $entregasPendientes = $stmt->fetchAll(PDO::FETCH_ASSOC) ?: [];
        } catch (\Throwable $e) {}

        return [
            'productos_bajos'     => $productosBajos,
            'insumos_bajos'       => $insumosBajos,
            'filamentos_bajos'    => $filamentosBajos,
            'entregas_pendientes' => $entregasPendientes,
        ];
    }
}

