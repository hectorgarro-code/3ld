-- phpMyAdmin SQL Dump
-- version 5.2.2
-- https://www.phpmyadmin.net/
--
-- Servidor: 127.0.0.1:3306
-- Tiempo de generación: 26-06-2026 a las 16:09:27
-- Versión del servidor: 11.8.6-MariaDB-log
-- Versión de PHP: 7.2.34

SET SQL_MODE = "NO_AUTO_VALUE_ON_ZERO";
START TRANSACTION;
SET time_zone = "+00:00";


/*!40101 SET @OLD_CHARACTER_SET_CLIENT=@@CHARACTER_SET_CLIENT */;
/*!40101 SET @OLD_CHARACTER_SET_RESULTS=@@CHARACTER_SET_RESULTS */;
/*!40101 SET @OLD_COLLATION_CONNECTION=@@COLLATION_CONNECTION */;
/*!40101 SET NAMES utf8mb4 */;

--
-- Base de datos: `u803496046_sistema3ld`
--

-- --------------------------------------------------------

--
-- Estructura de tabla para la tabla `categorias_producto`
--

CREATE TABLE `categorias_producto` (
  `id` int(10) UNSIGNED NOT NULL,
  `nombre` varchar(100) NOT NULL,
  `descripcion` text DEFAULT NULL,
  `icono` varchar(10) DEFAULT '?',
  `color_hex` char(7) DEFAULT '#6366F1',
  `created_at` datetime NOT NULL DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Volcado de datos para la tabla `categorias_producto`
--

INSERT INTO `categorias_producto` (`id`, `nombre`, `descripcion`, `icono`, `color_hex`, `created_at`) VALUES
(1, 'Cerámica', NULL, '🏺', '#F59E0B', '2026-05-31 15:56:53'),
(2, 'Juegos Didácticos', NULL, '🎲', '#10B981', '2026-05-31 15:56:53'),
(3, 'Impresión 3D', NULL, '🖨️', '#6366F1', '2026-05-31 15:56:53'),
(4, 'Reventa', NULL, '🛍️', '#EC4899', '2026-05-31 15:56:53'),
(5, 'Kits y Combos', NULL, '📦', '#8B5CF6', '2026-05-31 15:56:53'),
(6, 'Herramientas', NULL, '🔧', '#EF4444', '2026-05-31 15:56:53');

-- --------------------------------------------------------

--
-- Estructura de tabla para la tabla `clientes`
--

CREATE TABLE `clientes` (
  `id` int(10) UNSIGNED NOT NULL,
  `nombre` varchar(200) NOT NULL,
  `email` varchar(200) DEFAULT NULL,
  `telefono` varchar(30) DEFAULT NULL,
  `whatsapp` varchar(30) DEFAULT NULL,
  `empresa` varchar(200) DEFAULT NULL,
  `tipo_cliente` enum('particular','empresa') DEFAULT 'particular',
  `dni_cuit` varchar(20) DEFAULT NULL,
  `direccion` text DEFAULT NULL,
  `ciudad` varchar(100) DEFAULT NULL,
  `provincia` varchar(100) DEFAULT NULL,
  `pais` varchar(100) DEFAULT 'Argentina',
  `notas` text DEFAULT NULL,
  `descuento_pct` decimal(5,2) DEFAULT 0.00,
  `total_compras` decimal(12,2) DEFAULT 0.00,
  `cantidad_pedidos` int(10) UNSIGNED DEFAULT 0,
  `activo` tinyint(1) NOT NULL DEFAULT 1,
  `created_at` datetime NOT NULL DEFAULT current_timestamp(),
  `updated_at` datetime NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Volcado de datos para la tabla `clientes`
--

INSERT INTO `clientes` (`id`, `nombre`, `email`, `telefono`, `whatsapp`, `empresa`, `tipo_cliente`, `dni_cuit`, `direccion`, `ciudad`, `provincia`, `pais`, `notas`, `descuento_pct`, `total_compras`, `cantidad_pedidos`, `activo`, `created_at`, `updated_at`) VALUES
(0, 'CONS. FINAL', '', '', NULL, NULL, 'particular', NULL, '', NULL, NULL, 'Argentina', '', 0.00, 0.00, 0, 1, '2026-06-26 01:09:41', '2026-06-26 16:05:48'),
(0, 'CONS. FINAL', '', '', NULL, NULL, 'particular', NULL, '', NULL, NULL, 'Argentina', '', 0.00, 0.00, 0, 1, '2026-06-26 01:09:49', '2026-06-26 16:05:48'),
(0, 'CONS. FINAL', '', '', NULL, NULL, 'particular', NULL, '', NULL, NULL, 'Argentina', '', 0.00, 0.00, 0, 1, '2026-06-26 01:09:58', '2026-06-26 16:05:48');

-- --------------------------------------------------------

--
-- Estructura de tabla para la tabla `compras`
--

CREATE TABLE `compras` (
  `id` int(10) UNSIGNED NOT NULL,
  `proveedor_id` int(10) UNSIGNED NOT NULL,
  `numero_comprobante` varchar(100) DEFAULT NULL,
  `total` decimal(12,2) NOT NULL DEFAULT 0.00,
  `estado` enum('completada','cancelada') NOT NULL DEFAULT 'completada',
  `notas` text DEFAULT NULL,
  `fecha` date NOT NULL,
  `created_by` int(10) UNSIGNED DEFAULT NULL,
  `created_at` datetime NOT NULL DEFAULT current_timestamp(),
  `updated_at` datetime NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------

--
-- Estructura de tabla para la tabla `compra_items`
--

CREATE TABLE `compra_items` (
  `id` int(10) UNSIGNED NOT NULL,
  `compra_id` int(10) UNSIGNED NOT NULL,
  `producto_id` int(10) UNSIGNED DEFAULT NULL,
  `descripcion` varchar(200) DEFAULT NULL,
  `cantidad` decimal(10,2) NOT NULL DEFAULT 1.00,
  `precio_unitario` decimal(10,2) NOT NULL DEFAULT 0.00,
  `subtotal` decimal(12,2) NOT NULL DEFAULT 0.00,
  `created_at` datetime NOT NULL DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------

--
-- Estructura de tabla para la tabla `config_costos`
--

CREATE TABLE `config_costos` (
  `id` int(10) UNSIGNED NOT NULL,
  `precio_kwh` decimal(8,4) NOT NULL DEFAULT 150.0000,
  `valor_hora_operario` decimal(10,2) NOT NULL DEFAULT 2000.00,
  `margen_default_pct` decimal(5,2) NOT NULL DEFAULT 40.00,
  `multiplicador_default` decimal(5,2) NOT NULL DEFAULT 1.00,
  `consumo_watts_default` decimal(8,2) NOT NULL DEFAULT 250.00,
  `costo_mantenimiento_mensual` decimal(10,2) DEFAULT 5000.00,
  `updated_at` datetime NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------

--
-- Estructura de tabla para la tabla `cotizaciones`
--

CREATE TABLE `cotizaciones` (
  `id` int(10) UNSIGNED NOT NULL,
  `cliente_id` int(10) UNSIGNED DEFAULT NULL,
  `gramos` decimal(8,2) NOT NULL,
  `tiempo_min` int(10) UNSIGNED NOT NULL,
  `filamento_id` int(10) UNSIGNED DEFAULT NULL,
  `precio_kwh` decimal(8,4) DEFAULT NULL,
  `consumo_watts` decimal(8,2) DEFAULT NULL,
  `valor_hora_operario` decimal(10,2) DEFAULT NULL,
  `margen_pct` decimal(5,2) DEFAULT NULL,
  `multiplicador` decimal(5,2) DEFAULT NULL,
  `costo_material` decimal(10,2) DEFAULT NULL,
  `costo_energia` decimal(10,2) DEFAULT NULL,
  `costo_amortizacion` decimal(10,2) DEFAULT NULL,
  `costo_mano_obra` decimal(10,2) DEFAULT NULL,
  `costo_total` decimal(10,2) DEFAULT NULL,
  `precio_sugerido` decimal(10,2) DEFAULT NULL,
  `precio_final` decimal(10,2) DEFAULT NULL,
  `pedido_id` int(10) UNSIGNED DEFAULT NULL,
  `created_by` int(10) UNSIGNED DEFAULT NULL,
  `created_at` datetime NOT NULL DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------

--
-- Estructura de tabla para la tabla `fallas_produccion`
--

CREATE TABLE `fallas_produccion` (
  `id` int(10) UNSIGNED NOT NULL,
  `orden_id` int(10) UNSIGNED NOT NULL,
  `tipo_falla` varchar(80) DEFAULT 'otro',
  `descripcion` text NOT NULL,
  `gramos_perdidos` decimal(8,2) DEFAULT 0.00,
  `tiempo_perdido_min` int(10) UNSIGNED DEFAULT 0,
  `solucion` text DEFAULT NULL,
  `usuario_id` int(10) UNSIGNED DEFAULT NULL,
  `created_at` datetime NOT NULL DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------

--
-- Estructura de tabla para la tabla `filamentos`
--

CREATE TABLE `filamentos` (
  `id` int(10) UNSIGNED NOT NULL,
  `nombre` varchar(150) NOT NULL,
  `color` varchar(80) NOT NULL DEFAULT 'Natural',
  `color_hex` char(7) DEFAULT '#808080',
  `material_id` int(10) UNSIGNED DEFAULT NULL COMMENT 'FK a materiales/tipos si se normaliza en el futuro',
  `tipo` varchar(30) NOT NULL DEFAULT 'PLA' COMMENT 'PLA, PETG, ABS, TPU, etc.',
  `diametro_mm` decimal(4,2) NOT NULL DEFAULT 1.75,
  `stock_rollos` int(11) NOT NULL DEFAULT 1,
  `stock_minimo_rollos` int(11) NOT NULL DEFAULT 0,
  `precio_compra` decimal(10,2) NOT NULL DEFAULT 0.00,
  `proveedor` varchar(150) DEFAULT NULL,
  `fecha_compra` date DEFAULT NULL,
  `lote` varchar(80) DEFAULT NULL,
  `activo` tinyint(1) NOT NULL DEFAULT 1,
  `notas` text DEFAULT NULL,
  `created_at` datetime NOT NULL DEFAULT current_timestamp(),
  `updated_at` datetime NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Volcado de datos para la tabla `filamentos`
--

INSERT INTO `filamentos` (`id`, `nombre`, `color`, `color_hex`, `material_id`, `tipo`, `diametro_mm`, `stock_rollos`, `stock_minimo_rollos`, `precio_compra`, `proveedor`, `fecha_compra`, `lote`, `activo`, `notas`, `created_at`, `updated_at`) VALUES
(1, 'PLA Blanco Bambu', 'Blanco', '#FFFFFF', NULL, 'PLA', 1.75, 1, 0, 4500.00, NULL, NULL, NULL, 1, NULL, '2026-05-31 15:56:53', '2026-05-31 15:56:53'),
(2, 'PLA Rojo Bambu', 'Rojo', '#EF4444', NULL, 'PLA', 1.75, 0, 0, 4500.00, NULL, NULL, NULL, 1, NULL, '2026-05-31 15:56:53', '2026-06-01 14:40:56'),
(3, 'PETG Negro eSUN', 'Negro', '#1F2937', NULL, 'PETG', 1.75, 6, 0, 20000.00, '', NULL, NULL, 1, NULL, '2026-05-31 15:56:53', '2026-06-01 22:03:27'),
(4, 'PLA Amarillo', 'Amarillo', '#FDE68A', NULL, 'PLA', 1.75, 1, 0, 4500.00, NULL, NULL, NULL, 1, NULL, '2026-05-31 15:56:53', '2026-05-31 15:56:53'),
(0, '3N3', 'BLANCO', '#808080', NULL, 'PLA', 1.75, 1, 0, 17000.00, 'MERCADOLIBRE', NULL, NULL, 1, NULL, '2026-06-05 01:37:05', '2026-06-05 01:37:05'),
(0, '3N3', 'BLANCO', '#808080', NULL, 'PLA', 1.75, 1, 0, 17000.00, 'MERCADOLIBRE', NULL, NULL, 1, NULL, '2026-06-05 01:37:09', '2026-06-05 01:37:09'),
(0, '3N3', 'BLANCO', '#808080', NULL, 'PLA', 1.75, 1, 0, 17000.00, 'MERCADOLIBRE', NULL, NULL, 1, NULL, '2026-06-05 01:37:09', '2026-06-05 01:37:09');

-- --------------------------------------------------------

--
-- Estructura de tabla para la tabla `impresoras`
--

CREATE TABLE `impresoras` (
  `id` int(10) UNSIGNED NOT NULL,
  `nombre` varchar(100) NOT NULL,
  `marca` varchar(100) DEFAULT NULL,
  `modelo` varchar(100) DEFAULT NULL,
  `numero_serie` varchar(100) DEFAULT NULL,
  `tipo_impresion` varchar(30) DEFAULT 'FDM',
  `volumen_x_mm` decimal(8,2) DEFAULT 0.00,
  `volumen_y_mm` decimal(8,2) DEFAULT 0.00,
  `volumen_z_mm` decimal(8,2) DEFAULT 0.00,
  `consumo_watts` decimal(8,2) DEFAULT 200.00,
  `valor_compra` decimal(10,2) DEFAULT 0.00,
  `vida_util_horas` decimal(10,2) DEFAULT 5000.00,
  `fecha_compra` date DEFAULT NULL,
  `horas_acumuladas` decimal(10,2) NOT NULL DEFAULT 0.00,
  `estado` enum('libre','ocupada','mantenimiento','averiada','fuera_de_servicio') NOT NULL DEFAULT 'libre',
  `notas` text DEFAULT NULL,
  `activo` tinyint(1) NOT NULL DEFAULT 1,
  `created_at` datetime NOT NULL DEFAULT current_timestamp(),
  `updated_at` datetime NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Volcado de datos para la tabla `impresoras`
--

INSERT INTO `impresoras` (`id`, `nombre`, `marca`, `modelo`, `numero_serie`, `tipo_impresion`, `volumen_x_mm`, `volumen_y_mm`, `volumen_z_mm`, `consumo_watts`, `valor_compra`, `vida_util_horas`, `fecha_compra`, `horas_acumuladas`, `estado`, `notas`, `activo`, `created_at`, `updated_at`) VALUES
(1, 'Bambu Lab #1', 'Bambu Lab', 'P1S', NULL, 'FDM', 0.00, 0.00, 0.00, 350.00, 850000.00, 5000.00, NULL, 245.50, 'libre', NULL, 0, '2026-05-31 15:56:53', '2026-06-05 01:33:11'),
(2, 'Ender 3 #1', 'Creality', 'Ender 3 V2', NULL, 'FDM', 0.00, 0.00, 0.00, 180.00, 180000.00, 5000.00, NULL, 1240.00, 'libre', NULL, 0, '2026-05-31 15:56:53', '2026-06-05 01:32:48'),
(3, 'Ender 3 #2', 'Creality', 'Ender 3 V2', NULL, 'FDM', 0.00, 0.00, 0.00, 180.00, 180000.00, 5000.00, NULL, 890.00, 'mantenimiento', NULL, 0, '2026-05-31 15:56:53', '2026-06-05 01:32:51'),
(0, 'BAMBULAB 1', 'BAMBULAB', 'A1', NULL, 'FDM', 0.00, 0.00, 0.00, 120.00, 0.00, 5000.00, NULL, 1825.00, 'libre', '', 1, '2026-06-05 01:35:17', '2026-06-05 01:35:17'),
(0, 'BAMBULAB 2', 'BAMBULAB', 'A1', NULL, 'FDM', 0.00, 0.00, 0.00, 120.00, 0.00, 5000.00, NULL, 1825.00, 'libre', '', 1, '2026-06-05 01:35:53', '2026-06-05 01:35:53'),
(0, 'BAMBULAB 3', 'BAMBULAB', 'A1', NULL, 'FDM', 0.00, 0.00, 0.00, 120.00, 0.00, 5000.00, NULL, 1825.00, 'libre', '', 1, '2026-06-05 01:36:19', '2026-06-05 01:36:19');

-- --------------------------------------------------------

--
-- Estructura de tabla para la tabla `movimientos_stock`
--

CREATE TABLE `movimientos_stock` (
  `id` int(10) UNSIGNED NOT NULL,
  `producto_id` int(10) UNSIGNED NOT NULL,
  `cantidad` decimal(10,2) NOT NULL,
  `tipo_movimiento` enum('ajuste_manual','venta','compra','produccion','devolucion','anulacion_venta') NOT NULL,
  `referencia_id` int(11) DEFAULT NULL,
  `notas` text DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------

--
-- Estructura de tabla para la tabla `ordenes_produccion`
--

CREATE TABLE `ordenes_produccion` (
  `id` int(10) UNSIGNED NOT NULL,
  `numero_orden` varchar(20) NOT NULL,
  `pedido_id` int(10) UNSIGNED DEFAULT NULL,
  `producto_id` int(10) UNSIGNED DEFAULT NULL,
  `impresora_id` int(10) UNSIGNED DEFAULT NULL,
  `filamento_id` int(10) UNSIGNED DEFAULT NULL,
  `operador_id` int(10) UNSIGNED DEFAULT NULL,
  `estado` enum('pendiente','en_cola','imprimiendo','postprocesado','post_proceso','control_calidad','listo','entregado','cancelado','fallido') NOT NULL DEFAULT 'pendiente',
  `cantidad` int(10) UNSIGNED NOT NULL DEFAULT 1,
  `gramos_estimados` decimal(8,2) DEFAULT NULL,
  `gramos_reales` decimal(8,2) DEFAULT NULL,
  `tiempo_estimado_min` int(10) UNSIGNED DEFAULT NULL,
  `tiempo_real_min` int(10) UNSIGNED DEFAULT NULL,
  `prioridad` tinyint(3) UNSIGNED DEFAULT 5,
  `notas` text DEFAULT NULL,
  `fecha_inicio` datetime DEFAULT NULL,
  `fecha_fin` datetime DEFAULT NULL,
  `created_at` datetime NOT NULL DEFAULT current_timestamp(),
  `updated_at` datetime NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------

--
-- Estructura de tabla para la tabla `pedidos`
--

CREATE TABLE `pedidos` (
  `id` int(10) UNSIGNED NOT NULL,
  `numero_pedido` varchar(20) NOT NULL,
  `cliente_id` int(10) UNSIGNED DEFAULT NULL,
  `estado` enum('presupuesto','aprobado','en_produccion','terminado','entregado','cobrado','anulado') NOT NULL DEFAULT 'presupuesto',
  `subtotal` decimal(12,2) NOT NULL DEFAULT 0.00,
  `descuento_pct` decimal(5,2) DEFAULT 0.00,
  `impuesto_pct` decimal(5,2) DEFAULT 21.00,
  `total` decimal(12,2) NOT NULL DEFAULT 0.00,
  `costo_total` decimal(12,2) DEFAULT 0.00,
  `margen_bruto` decimal(12,2) DEFAULT 0.00,
  `notas` text DEFAULT NULL,
  `notas_internas` text DEFAULT NULL,
  `fecha_entrega_estimada` date DEFAULT NULL,
  `fecha_entrega_real` datetime DEFAULT NULL,
  `created_at` datetime NOT NULL DEFAULT current_timestamp(),
  `updated_at` datetime NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------

--
-- Estructura de tabla para la tabla `pedido_historial`
--

CREATE TABLE `pedido_historial` (
  `id` int(10) UNSIGNED NOT NULL,
  `pedido_id` int(10) UNSIGNED NOT NULL,
  `estado_anterior` varchar(50) DEFAULT NULL,
  `estado_nuevo` varchar(50) NOT NULL,
  `nota` text DEFAULT NULL,
  `usuario_id` int(10) UNSIGNED DEFAULT NULL,
  `created_at` datetime NOT NULL DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------

--
-- Estructura de tabla para la tabla `pedido_items`
--

CREATE TABLE `pedido_items` (
  `id` int(10) UNSIGNED NOT NULL,
  `pedido_id` int(10) UNSIGNED NOT NULL,
  `producto_id` int(10) UNSIGNED DEFAULT NULL,
  `descripcion` varchar(300) DEFAULT NULL,
  `cantidad` decimal(10,2) NOT NULL DEFAULT 1.00,
  `precio_unit` decimal(10,2) NOT NULL DEFAULT 0.00,
  `costo_unitario` decimal(10,2) DEFAULT 0.00,
  `descuento_pct` decimal(5,2) DEFAULT 0.00,
  `subtotal` decimal(12,2) NOT NULL DEFAULT 0.00,
  `stock_descontado` tinyint(1) DEFAULT 0,
  `notas` text DEFAULT NULL,
  `created_at` datetime NOT NULL DEFAULT current_timestamp(),
  `estado` enum('presupuesto','aprobado','en_produccion','terminado','entregado','cobrado','anulado') NOT NULL DEFAULT 'presupuesto'
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------

--
-- Estructura de tabla para la tabla `productos`
--

CREATE TABLE `productos` (
  `id` int(10) UNSIGNED NOT NULL,
  `nombre` varchar(200) NOT NULL,
  `variante` varchar(200) DEFAULT NULL,
  `descripcion` text DEFAULT NULL,
  `tipo` enum('impresion_3d','ceramica','juguete_educativo','accesorio','comprado','fabricado','compuesto') NOT NULL DEFAULT 'impresion_3d',
  `categoria_id` int(10) UNSIGNED DEFAULT NULL,
  `sku` varchar(80) DEFAULT NULL,
  `precio_venta` decimal(10,2) NOT NULL DEFAULT 0.00,
  `precio_costo` decimal(10,2) DEFAULT 0.00,
  `stock_actual` decimal(10,2) NOT NULL DEFAULT 0.00,
  `stock_minimo` decimal(10,2) DEFAULT 0.00,
  `unidad_medida` varchar(30) DEFAULT 'unidad',
  `imagen_url` varchar(500) DEFAULT NULL,
  `activo` tinyint(1) NOT NULL DEFAULT 1,
  `es_vendible` tinyint(1) NOT NULL DEFAULT 1,
  `es_insumo` tinyint(1) NOT NULL DEFAULT 0,
  `created_at` datetime NOT NULL DEFAULT current_timestamp(),
  `updated_at` datetime NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Volcado de datos para la tabla `productos`
--

INSERT INTO `productos` (`id`, `nombre`, `variante`, `descripcion`, `tipo`, `categoria_id`, `sku`, `precio_venta`, `precio_costo`, `stock_actual`, `stock_minimo`, `unidad_medida`, `imagen_url`, `activo`, `es_vendible`, `es_insumo`, `created_at`, `updated_at`) VALUES
(1, 'CHOP PRIMERA NACIONAL', NULL, '', 'impresion_3d', NULL, 'PRD-1Q3FJ', 15000.00, 9000.00, 1.00, 1.00, 'unidad', NULL, 1, 1, 0, '2026-05-31 21:58:04', '2026-05-31 21:58:04'),
(0, 'CHOP LIGA LOCAL', NULL, '', 'impresion_3d', 3, 'PRD-8UMVY', 15000.00, 8999.99, 1.00, 1.00, 'unidad', NULL, 1, 1, 0, '2026-06-03 15:07:53', '2026-06-04 00:57:45'),
(0, 'CHOP MAYORISTA', NULL, '', 'impresion_3d', 3, 'PRD-7JHSV', 12000.00, 7000.00, 1.00, 1.00, 'unidad', '/uploads/productos/6a3dd2083de41.jpeg', 1, 1, 0, '2026-06-26 01:12:40', '2026-06-26 01:12:40'),
(0, 'CHOP MAYORISTA', NULL, '', 'impresion_3d', 3, 'PRD-7JHSV', 12000.00, 7000.00, 1.00, 1.00, 'unidad', '/uploads/productos/6a3dd21115322.jpeg', 1, 1, 0, '2026-06-26 01:12:49', '2026-06-26 01:12:49'),
(0, 'CHOP 600 cc', NULL, '', 'impresion_3d', 3, 'PRD-DFW3F', 15000.00, 7500.00, 1.00, 1.00, 'unidad', NULL, 1, 1, 0, '2026-06-26 11:23:51', '2026-06-26 11:23:51'),
(0, 'CHOP 600 CC', NULL, '', 'impresion_3d', NULL, 'PRD-Z7Z4P', 15000.00, 7500.00, 1.00, 1.00, 'unidad', '/uploads/productos/6a3ea3e34cfd9.jpeg', 1, 1, 0, '2026-06-26 16:08:03', '2026-06-26 16:08:03');

-- --------------------------------------------------------

--
-- Estructura de tabla para la tabla `proveedores`
--

CREATE TABLE `proveedores` (
  `id` int(10) UNSIGNED NOT NULL,
  `nombre` varchar(200) NOT NULL,
  `contacto` varchar(150) DEFAULT NULL,
  `telefono` varchar(30) DEFAULT NULL,
  `email` varchar(200) DEFAULT NULL,
  `direccion` text DEFAULT NULL,
  `notas` text DEFAULT NULL,
  `activo` tinyint(1) NOT NULL DEFAULT 1,
  `created_at` datetime NOT NULL DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Volcado de datos para la tabla `proveedores`
--

INSERT INTO `proveedores` (`id`, `nombre`, `contacto`, `telefono`, `email`, `direccion`, `notas`, `activo`, `created_at`) VALUES
(1, 'TIENDA DE BOLSAS', 'NN', '+54 9 11 7829-7295', '', '', '', 1, '2026-06-01 23:37:35');

-- --------------------------------------------------------

--
-- Estructura de tabla para la tabla `stock_historial`
--

CREATE TABLE `stock_historial` (
  `fecha` date NOT NULL,
  `valor_filamentos` decimal(12,2) DEFAULT 0.00,
  `valor_insumos` decimal(12,2) DEFAULT 0.00,
  `valor_mercaderia` decimal(12,2) DEFAULT 0.00,
  `created_at` datetime NOT NULL DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------

--
-- Estructura de tabla para la tabla `usuarios`
--

CREATE TABLE `usuarios` (
  `id` int(10) UNSIGNED NOT NULL,
  `nombre` varchar(150) NOT NULL,
  `email` varchar(200) NOT NULL,
  `password` varchar(255) NOT NULL,
  `rol` enum('admin','produccion','ventas','operador') NOT NULL DEFAULT 'operador',
  `telefono` varchar(30) DEFAULT NULL,
  `avatar_url` varchar(500) DEFAULT NULL,
  `activo` tinyint(1) NOT NULL DEFAULT 1,
  `ultimo_login` datetime DEFAULT NULL,
  `created_at` datetime NOT NULL DEFAULT current_timestamp(),
  `updated_at` datetime NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Volcado de datos para la tabla `usuarios`
--

INSERT INTO `usuarios` (`id`, `nombre`, `email`, `password`, `rol`, `telefono`, `avatar_url`, `activo`, `ultimo_login`, `created_at`, `updated_at`) VALUES
(1, 'Administrador 3LD', 'admin@3ld.com', '$2y$10$DmA1sqqP8ROcuTyPmVQgPuvz4q6gHGUYOCmN2/wx1/iFlMKsZ6Xoy', 'admin', NULL, NULL, 1, '2026-06-26 01:49:13', '2026-05-31 15:56:53', '2026-06-26 01:49:13');

--
-- Índices para tablas volcadas
--

--
-- Indices de la tabla `movimientos_stock`
--
ALTER TABLE `movimientos_stock`
  ADD PRIMARY KEY (`id`);

--
-- Indices de la tabla `stock_historial`
--
ALTER TABLE `stock_historial`
  ADD PRIMARY KEY (`fecha`);

--
-- AUTO_INCREMENT de las tablas volcadas
--

--
-- AUTO_INCREMENT de la tabla `movimientos_stock`
--
ALTER TABLE `movimientos_stock`
  MODIFY `id` int(10) UNSIGNED NOT NULL AUTO_INCREMENT;
COMMIT;

/*!40101 SET CHARACTER_SET_CLIENT=@OLD_CHARACTER_SET_CLIENT */;
/*!40101 SET CHARACTER_SET_RESULTS=@OLD_CHARACTER_SET_RESULTS */;
/*!40101 SET COLLATION_CONNECTION=@OLD_COLLATION_CONNECTION */;
