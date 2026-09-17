-- ==============================================
-- SISTEMA 3LD — Schema MySQL v1.1
-- Corregido para coincidir con los Controllers
-- Charset: utf8mb4
-- ==============================================

CREATE DATABASE IF NOT EXISTS sistema3ld CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE sistema3ld;

SET NAMES utf8mb4;
SET FOREIGN_KEY_CHECKS = 0;

-- ==============================================
-- USUARIOS
-- Column 'password' is used by AuthController (not password_hash)
-- ==============================================
CREATE TABLE IF NOT EXISTS usuarios (
  id           INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  nombre       VARCHAR(150)  NOT NULL,
  email        VARCHAR(200)  NOT NULL UNIQUE,
  password     VARCHAR(255)  NOT NULL,
  rol          ENUM('admin','produccion','ventas','operador') NOT NULL DEFAULT 'operador',
  telefono     VARCHAR(30),
  avatar_url   VARCHAR(500),
  activo       TINYINT(1) NOT NULL DEFAULT 1,
  ultimo_login DATETIME,
  created_at   DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at   DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ==============================================
-- PROVEEDORES
-- ==============================================
CREATE TABLE IF NOT EXISTS proveedores (
  id        INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  nombre    VARCHAR(200) NOT NULL,
  contacto  VARCHAR(150),
  telefono  VARCHAR(30),
  email     VARCHAR(200),
  direccion TEXT,
  notas     TEXT,
  activo    TINYINT(1) NOT NULL DEFAULT 1,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ==============================================
-- FILAMENTOS
-- FilamentosController uses: nombre, marca, color, material_id, diametro_mm,
--   peso_total_g, peso_restante_g, stock_minimo_g, precio_compra, proveedor, activo
-- View v_filamentos computes costo_por_gramo
-- ==============================================
CREATE TABLE IF NOT EXISTS filamentos (
  id               INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  nombre           VARCHAR(150) NOT NULL,
  color            VARCHAR(80)  NOT NULL DEFAULT 'Natural',
  color_hex        CHAR(7)      DEFAULT '#808080',
  material_id      INT UNSIGNED COMMENT 'FK a materiales/tipos si se normaliza en el futuro',
  tipo             VARCHAR(30)  NOT NULL DEFAULT 'PLA' COMMENT 'PLA, PETG, ABS, TPU, etc.',
  diametro_mm      DECIMAL(4,2) NOT NULL DEFAULT 1.75,
  stock_rollos     INT NOT NULL DEFAULT 1,
  stock_minimo_rollos INT NOT NULL DEFAULT 0,
  precio_compra    DECIMAL(10,2) NOT NULL DEFAULT 0.00,
  proveedor        VARCHAR(150),
  fecha_compra     DATE,
  lote             VARCHAR(80),
  activo           TINYINT(1) NOT NULL DEFAULT 1,
  notas            TEXT,
  created_at       DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at       DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- View for computed costo_por_gramo used by FilamentosController
CREATE OR REPLACE VIEW v_filamentos AS
SELECT *,
  ROUND(precio_compra / 1000, 4) AS costo_por_gramo
FROM filamentos
WHERE activo = 1;

-- ==============================================
-- IMPRESORAS 3D
-- ImpresorasController uses: nombre, marca, modelo, numero_serie, tipo_impresion,
--   volumen_x_mm, volumen_y_mm, volumen_z_mm, consumo_watts, valor_compra,
--   fecha_compra, estado, horas_acumuladas, activo, notas
-- ==============================================
CREATE TABLE IF NOT EXISTS impresoras (
  id               INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  nombre           VARCHAR(100) NOT NULL,
  marca            VARCHAR(100),
  modelo           VARCHAR(100),
  numero_serie     VARCHAR(100),
  tipo_impresion   VARCHAR(30)  DEFAULT 'FDM',
  volumen_x_mm     DECIMAL(8,2) DEFAULT 0.00,
  volumen_y_mm     DECIMAL(8,2) DEFAULT 0.00,
  volumen_z_mm     DECIMAL(8,2) DEFAULT 0.00,
  consumo_watts    DECIMAL(8,2) DEFAULT 200.00,
  valor_compra     DECIMAL(10,2) DEFAULT 0.00,
  vida_util_horas  DECIMAL(10,2) DEFAULT 5000.00,
  fecha_compra     DATE,
  horas_acumuladas DECIMAL(10,2) NOT NULL DEFAULT 0.00,
  estado           ENUM('libre','ocupada','mantenimiento','averiada','fuera_de_servicio') NOT NULL DEFAULT 'libre',
  notas            TEXT,
  activo           TINYINT(1) NOT NULL DEFAULT 1,
  created_at       DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at       DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ==============================================
-- CATEGORÍAS DE PRODUCTOS
-- ProductosController JOINs: categorias_producto (c.id, c.nombre)
-- CategoriasController queries: categorias_producto (id, nombre, descripcion)
-- ==============================================
CREATE TABLE IF NOT EXISTS categorias_producto (
  id          INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  nombre      VARCHAR(100) NOT NULL UNIQUE,
  descripcion TEXT,
  icono       VARCHAR(10)  DEFAULT '📦',
  color_hex   CHAR(7)      DEFAULT '#6366F1',
  created_at  DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ==============================================
-- PRODUCTOS
-- ProductosController uses: nombre, sku, descripcion, tipo, categoria_id,
--   precio_venta, precio_costo, stock_actual, stock_minimo, unidad_medida,
--   imagen_url, activo
-- JOIN: categorias_producto c ON c.id = p.categoria_id → c.nombre AS categoria_nombre
-- ==============================================
CREATE TABLE IF NOT EXISTS productos (
  id             INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  nombre         VARCHAR(200) NOT NULL,
  variante       VARCHAR(200) DEFAULT NULL,
  descripcion    TEXT,
  tipo           ENUM('impresion_3d','ceramica','juguete_educativo','accesorio','comprado','fabricado','compuesto')
                 NOT NULL DEFAULT 'impresion_3d',
  categoria_id   INT UNSIGNED,
  sku            VARCHAR(80) UNIQUE,
  precio_venta   DECIMAL(10,2) NOT NULL DEFAULT 0.00,
  precio_costo   DECIMAL(10,2) DEFAULT 0.00,
  stock_actual   DECIMAL(10,2) NOT NULL DEFAULT 0.00,
  stock_minimo   DECIMAL(10,2) DEFAULT 0.00,
  unidad_medida  VARCHAR(30)  DEFAULT 'unidad',
  imagen_url     VARCHAR(500),
  activo         TINYINT(1) NOT NULL DEFAULT 1,
  es_vendible    TINYINT(1) NOT NULL DEFAULT 1,
  es_insumo      TINYINT(1) NOT NULL DEFAULT 0,
  created_at     DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at     DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (categoria_id) REFERENCES categorias_producto(id) ON DELETE SET NULL,
  INDEX idx_productos_activo_tipo (activo, es_vendible, es_insumo)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ==============================================
-- RECETAS DE PRODUCTOS (BOM)
-- ==============================================
CREATE TABLE IF NOT EXISTS producto_recetas (
  producto_id INT UNSIGNED NOT NULL,
  insumo_id   INT UNSIGNED NOT NULL,
  cantidad    DECIMAL(8,2) NOT NULL DEFAULT 1,
  PRIMARY KEY (producto_id, insumo_id),
  FOREIGN KEY (producto_id) REFERENCES productos(id) ON DELETE CASCADE,
  FOREIGN KEY (insumo_id)   REFERENCES productos(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ==============================================
-- CLIENTES
-- ClientesController uses: nombre, email, telefono, empresa, tipo_cliente,
--   dni_cuit, direccion, ciudad, provincia, pais, notas, activo
--   total_compras, cantidad_pedidos
-- ==============================================
CREATE TABLE IF NOT EXISTS clientes (
  id               INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  nombre           VARCHAR(200) NOT NULL,
  email            VARCHAR(200),
  telefono         VARCHAR(30),
  whatsapp         VARCHAR(30),
  empresa          VARCHAR(200),
  tipo_cliente     ENUM('particular','empresa') DEFAULT 'particular',
  dni_cuit         VARCHAR(20),
  direccion        TEXT,
  ciudad           VARCHAR(100),
  provincia        VARCHAR(100),
  pais             VARCHAR(100) DEFAULT 'Argentina',
  notas            TEXT,
  descuento_pct    DECIMAL(5,2) DEFAULT 0.00,
  total_compras    DECIMAL(12,2) DEFAULT 0.00,
  cantidad_pedidos INT UNSIGNED  DEFAULT 0,
  activo           TINYINT(1) NOT NULL DEFAULT 1,
  created_at       DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at       DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ==============================================
-- PEDIDOS
-- PedidosController uses: numero_pedido, cliente_id, estado, subtotal,
--   descuento_pct, impuesto_pct, total, margen_bruto, fecha_entrega_estimada,
--   fecha_entrega_real, notas
-- Estado includes 'en_produccion' (controller uses this value)
-- ==============================================
CREATE TABLE IF NOT EXISTS pedidos (
  id                      INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  numero_pedido           VARCHAR(20)  NOT NULL UNIQUE,
  cliente_id              INT UNSIGNED,
  estado                  ENUM('presupuesto','aprobado','en_produccion','terminado','entregado','cobrado','anulado')
                          NOT NULL DEFAULT 'presupuesto',
  subtotal                DECIMAL(12,2) NOT NULL DEFAULT 0.00,
  descuento_pct           DECIMAL(5,2)  DEFAULT 0.00,
  impuesto_pct            DECIMAL(5,2)  DEFAULT 21.00,
  total                   DECIMAL(12,2) NOT NULL DEFAULT 0.00,
  costo_total             DECIMAL(12,2) DEFAULT 0.00,
  margen_bruto            DECIMAL(12,2) DEFAULT 0.00,
  notas                   TEXT,
  notas_internas          TEXT,
  fecha_entrega_estimada  DATE,
  fecha_entrega_real      DATETIME,
  created_at              DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at              DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (cliente_id) REFERENCES clientes(id) ON DELETE SET NULL,
  INDEX idx_pedidos_estado_created (estado, created_at),
  INDEX idx_pedidos_fecha_entrega (fecha_entrega_estimada)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ==============================================
-- ITEMS DEL PEDIDO
-- PedidosController uses: pedido_id, producto_id, descripcion, cantidad,
--   precio_unit (frontend sends precio_unit), descuento_pct, subtotal, notas
-- ==============================================
CREATE TABLE IF NOT EXISTS pedido_items (
  id                INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  pedido_id         INT UNSIGNED NOT NULL,
  producto_id       INT UNSIGNED,
  descripcion       VARCHAR(300),
  cantidad          DECIMAL(10,2) NOT NULL DEFAULT 1.00,
  precio_unit       DECIMAL(10,2) NOT NULL DEFAULT 0.00,
  costo_unitario    DECIMAL(10,2) DEFAULT 0.00,
  descuento_pct     DECIMAL(5,2)  DEFAULT 0.00,
  subtotal          DECIMAL(12,2) NOT NULL DEFAULT 0.00,
  estado            ENUM('presupuesto','aprobado','en_produccion','terminado','entregado','cobrado','anulado') NOT NULL DEFAULT 'presupuesto',
  notas             TEXT,
  created_at        DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (pedido_id)   REFERENCES pedidos(id)   ON DELETE CASCADE,
  FOREIGN KEY (producto_id) REFERENCES productos(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ==============================================
-- HISTORIAL DE PEDIDOS
-- PedidosController uses: pedido_id, estado_anterior, estado_nuevo, nota, usuario_id
-- ==============================================
CREATE TABLE IF NOT EXISTS pedido_historial (
  id              INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  pedido_id       INT UNSIGNED NOT NULL,
  estado_anterior VARCHAR(50),
  estado_nuevo    VARCHAR(50) NOT NULL,
  nota            TEXT,
  usuario_id      INT UNSIGNED,
  created_at      DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (pedido_id)  REFERENCES pedidos(id)   ON DELETE CASCADE,
  FOREIGN KEY (usuario_id) REFERENCES usuarios(id)  ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ==============================================
-- ÓRDENES DE PRODUCCIÓN
-- ProduccionController uses: numero_orden, producto_id, pedido_id, impresora_id,
--   filamento_id, estado, cantidad, gramos_estimados, gramos_reales,
--   tiempo_estimado_min, tiempo_real_min, prioridad, notas, fecha_inicio, fecha_fin
-- Estado: 'en_cola','imprimiendo','postprocesado','listo','cancelado','fallido'
-- (Frontend maps: pendiente→en_cola, post_proceso→postprocesado, etc.)
-- ==============================================
CREATE TABLE IF NOT EXISTS ordenes_produccion (
  id                  INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  numero_orden        VARCHAR(20)  NOT NULL UNIQUE,
  pedido_id           INT UNSIGNED,
  producto_id         INT UNSIGNED,
  impresora_id        INT UNSIGNED,
  filamento_id        INT UNSIGNED,
  operador_id         INT UNSIGNED,
  estado              ENUM('pendiente','en_cola','imprimiendo','postprocesado','post_proceso',
                           'control_calidad','listo','entregado','cancelado','fallido')
                      NOT NULL DEFAULT 'pendiente',
  cantidad            INT UNSIGNED  NOT NULL DEFAULT 1,
  gramos_estimados    DECIMAL(8,2),
  gramos_reales       DECIMAL(8,2),
  tiempo_estimado_min INT UNSIGNED,
  tiempo_real_min     INT UNSIGNED,
  prioridad           TINYINT UNSIGNED DEFAULT 5,
  notas               TEXT,
  fecha_inicio        DATETIME,
  fecha_fin           DATETIME,
  created_at          DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at          DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (pedido_id)    REFERENCES pedidos(id)    ON DELETE SET NULL,
  FOREIGN KEY (producto_id)  REFERENCES productos(id)  ON DELETE SET NULL,
  FOREIGN KEY (impresora_id) REFERENCES impresoras(id) ON DELETE SET NULL,
  FOREIGN KEY (filamento_id) REFERENCES filamentos(id) ON DELETE SET NULL,
  FOREIGN KEY (operador_id)  REFERENCES usuarios(id)   ON DELETE SET NULL,
  INDEX idx_ordenes_estado_prioridad (estado, prioridad)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ==============================================
-- FALLAS DE PRODUCCIÓN
-- ProduccionController uses: orden_id, tipo_falla, descripcion,
--   gramos_perdidos, tiempo_perdido_min, solucion, usuario_id
-- ==============================================
CREATE TABLE IF NOT EXISTS fallas_produccion (
  id                INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  orden_id          INT UNSIGNED NOT NULL,
  tipo_falla        VARCHAR(80)  DEFAULT 'otro',
  descripcion       TEXT NOT NULL,
  gramos_perdidos   DECIMAL(8,2)  DEFAULT 0.00,
  tiempo_perdido_min INT UNSIGNED DEFAULT 0,
  solucion          TEXT,
  usuario_id        INT UNSIGNED,
  created_at        DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (orden_id)   REFERENCES ordenes_produccion(id) ON DELETE CASCADE,
  FOREIGN KEY (usuario_id) REFERENCES usuarios(id)           ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ==============================================
-- CONFIGURACIÓN DE COSTOS
-- CotizadorController uses: precio_kwh, valor_hora_operario,
--   margen_default_pct, multiplicador_default
-- Also checks for 'consumo_watts_default' → added as alias
-- ==============================================
CREATE TABLE IF NOT EXISTS config_costos (
  id                         INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  precio_kwh                 DECIMAL(8,4)  NOT NULL DEFAULT 150.00,
  valor_hora_operario        DECIMAL(10,2) NOT NULL DEFAULT 2000.00,
  margen_default_pct         DECIMAL(5,2)  NOT NULL DEFAULT 40.00,
  multiplicador_default      DECIMAL(5,2)  NOT NULL DEFAULT 1.00,
  consumo_watts_default      DECIMAL(8,2)  NOT NULL DEFAULT 250.00,
  costo_mantenimiento_mensual DECIMAL(10,2) DEFAULT 5000.00,
  updated_at                 DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ==============================================
-- COTIZACIONES
-- ==============================================
CREATE TABLE IF NOT EXISTS cotizaciones (
  id                  INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  cliente_id          INT UNSIGNED,
  gramos              DECIMAL(8,2)  NOT NULL,
  tiempo_min          INT UNSIGNED  NOT NULL,
  filamento_id        INT UNSIGNED,
  precio_kwh          DECIMAL(8,4),
  consumo_watts       DECIMAL(8,2),
  valor_hora_operario DECIMAL(10,2),
  margen_pct          DECIMAL(5,2),
  multiplicador       DECIMAL(5,2),
  costo_material      DECIMAL(10,2),
  costo_energia       DECIMAL(10,2),
  costo_amortizacion  DECIMAL(10,2),
  costo_mano_obra     DECIMAL(10,2),
  costo_total         DECIMAL(10,2),
  precio_sugerido     DECIMAL(10,2),
  precio_final        DECIMAL(10,2),
  pedido_id           INT UNSIGNED,
  created_by          INT UNSIGNED,
  created_at          DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (cliente_id)  REFERENCES clientes(id)           ON DELETE SET NULL,
  FOREIGN KEY (filamento_id) REFERENCES filamentos(id)        ON DELETE SET NULL,
  FOREIGN KEY (pedido_id)   REFERENCES pedidos(id)            ON DELETE SET NULL,
  FOREIGN KEY (created_by)  REFERENCES usuarios(id)           ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ==============================================
-- COMPRAS
-- ==============================================
CREATE TABLE IF NOT EXISTS compras (
  id                  INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  proveedor_id        INT UNSIGNED NOT NULL,
  numero_comprobante  VARCHAR(100),
  total               DECIMAL(12,2) NOT NULL DEFAULT 0.00,
  estado              ENUM('completada', 'cancelada') NOT NULL DEFAULT 'completada',
  notas               TEXT,
  fecha               DATE NOT NULL,
  created_by          INT UNSIGNED,
  created_at          DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at          DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (proveedor_id) REFERENCES proveedores(id) ON DELETE RESTRICT,
  FOREIGN KEY (created_by) REFERENCES usuarios(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS compra_items (
  id                INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  compra_id         INT UNSIGNED NOT NULL,
  producto_id       INT UNSIGNED,
  descripcion       VARCHAR(200),
  cantidad          DECIMAL(10,2) NOT NULL DEFAULT 1.00,
  precio_unitario   DECIMAL(10,2) NOT NULL DEFAULT 0.00,
  subtotal          DECIMAL(12,2) NOT NULL DEFAULT 0.00,
  created_at        DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (compra_id) REFERENCES compras(id) ON DELETE CASCADE,
  FOREIGN KEY (producto_id) REFERENCES productos(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

SET FOREIGN_KEY_CHECKS = 1;

-- ==============================================
-- SEED DATA
-- ==============================================

-- Config costos por defecto
INSERT INTO config_costos
  (precio_kwh, valor_hora_operario, margen_default_pct, multiplicador_default, consumo_watts_default)
VALUES (150.00, 2000.00, 40.00, 1.00, 250.00);

-- Categorías de productos
INSERT INTO categorias_producto (nombre, icono, color_hex) VALUES
  ('Cerámica',           '🏺', '#F59E0B'),
  ('Juegos Didácticos',  '🎲', '#10B981'),
  ('Impresión 3D',       '🖨️', '#6366F1'),
  ('Reventa',            '🛍️', '#EC4899'),
  ('Kits y Combos',      '📦', '#8B5CF6'),
  ('Herramientas',       '🔧', '#EF4444');

-- Usuario admin
-- password: 'Admin3LD#2026!'
-- Hash generado con: password_hash('Admin3LD#2026!', PASSWORD_BCRYPT)
INSERT INTO usuarios (nombre, email, password, rol)
VALUES ('Administrador 3LD', 'admin@3ld.com', '$2y$10$PAnyF1b1yYkYeVEaQxp/auQbrZgdjGrMZiqZenlk9jjw1wqTuz9Ke', 'admin');

-- Impresoras de ejemplo
INSERT INTO impresoras
  (nombre, marca, modelo, consumo_watts, valor_compra, vida_util_horas, horas_acumuladas, estado)
VALUES
  ('Bambu Lab #1', 'Bambu Lab', 'P1S',       350.00, 850000.00, 5000.00, 245.50, 'libre'),
  ('Ender 3 #1',   'Creality',  'Ender 3 V2', 180.00, 180000.00, 5000.00, 1240.00, 'libre'),
  ('Ender 3 #2',   'Creality',  'Ender 3 V2', 180.00, 180000.00, 5000.00, 890.00, 'mantenimiento');

-- Filamentos de ejemplo
INSERT INTO filamentos
  (nombre, marca, tipo, color, color_hex, peso_total_g, peso_restante_g, precio_compra, stock_minimo_g)
VALUES
  ('PLA Blanco Bambu', 'Bambu Lab', 'PLA',  'Blanco',   '#FFFFFF', 1000.00, 780.00, 4500.00, 200.00),
  ('PLA Rojo Bambu',   'Bambu Lab', 'PLA',  'Rojo',     '#EF4444', 1000.00, 320.00, 4500.00, 200.00),
  ('PETG Negro eSUN',  'eSUN',      'PETG', 'Negro',    '#1F2937', 1000.00, 150.00, 5200.00, 200.00),
  ('PLA Amarillo',     'Bambu Lab', 'PLA',  'Amarillo', '#FDE68A', 1000.00, 890.00, 4500.00, 200.00);

-- Clientes de ejemplo
INSERT INTO clientes (nombre, email, telefono, tipo_cliente)
VALUES
  ('María García',    'maria@example.com',   '11-1234-5678', 'particular'),
  ('TechStore SRL',   'compras@techstore.ar', '11-9876-5432', 'empresa'),
  ('Juan Pérez',      'juan@gmail.com',       '11-5555-1234', 'particular');
