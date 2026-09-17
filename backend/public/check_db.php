<?php
/**
 * SISTEMA 3LD — Diagnóstico y Autocorrección de Base de Datos
 */
declare(strict_types=1);

ini_set('display_errors', '1');
ini_set('display_startup_errors', '1');
error_reporting(E_ALL);

$outputHtml = "";
$dbConnected = false;
$diagnostics = [];
$pendingFixes = [];
$successMessage = "";
$errorMessage = "";
$createProductosSql = "";
$queryTests = [];

try {
    // 1. Cargar dependencias y config
    $autoloadPath = __DIR__ . '/../vendor/autoload.php';
    if (!file_exists($autoloadPath)) {
        throw new Exception("No se encontró el autoloader en: {$autoloadPath}. Asegúrate de ejecutar `composer install`.");
    }
    require_once $autoloadPath;

    $configPath = __DIR__ . '/../config/config.php';
    if (!file_exists($configPath)) {
        throw new Exception("No se encontró el archivo de configuración en: {$configPath}");
    }
    $config = require $configPath;

    // 2. Intentar conexión a la base de datos
    try {
        $db = (new \App\Database($config))->getConnection();
        $dbConnected = true;
    } catch (\Throwable $dbEx) {
        $dbConnected = false;
        throw new Exception("Error de conexión a la base de datos: " . $dbEx->getMessage());
    }

    // 3. Ejecutar diagnóstico si está conectado
    if ($dbConnected) {
        // Obtener tablas existentes
        $tablesStmt = $db->query("SHOW TABLES");
        $existingTables = $tablesStmt->fetchAll(PDO::FETCH_COLUMN);

        // A. Verificar Tabla: clientes
        if (!in_array('clientes', $existingTables)) {
            $diagnostics[] = [
                'component' => 'Tabla `clientes`',
                'status' => 'ERROR',
                'details' => 'La tabla no existe en la base de datos.',
                'fix_sql' => "CREATE TABLE clientes (
                    id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
                    nombre VARCHAR(200) NOT NULL,
                    email VARCHAR(200),
                    telefono VARCHAR(30),
                    whatsapp VARCHAR(30),
                    empresa VARCHAR(200),
                    tipo_cliente ENUM('particular','empresa') DEFAULT 'particular',
                    dni_cuit VARCHAR(20),
                    direccion TEXT,
                    ciudad VARCHAR(100),
                    provincia VARCHAR(100),
                    pais VARCHAR(100) DEFAULT 'Argentina',
                    notas TEXT,
                    descuento_pct DECIMAL(5,2) DEFAULT 0.00,
                    total_compras DECIMAL(12,2) DEFAULT 0.00,
                    cantidad_pedidos INT UNSIGNED DEFAULT 0,
                    activo TINYINT(1) NOT NULL DEFAULT 1,
                    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
                    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
                ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;"
            ];
        } else {
            // Verificar columnas específicas de clientes
            $columns = $db->query("DESCRIBE clientes")->fetchAll(PDO::FETCH_COLUMN);
            if (!in_array('descuento_pct', $columns)) {
                $diagnostics[] = [
                    'component' => 'Columna `clientes.descuento_pct`',
                    'status' => 'ERROR',
                    'details' => 'Falta el campo de descuento para el cliente.',
                    'fix_sql' => "ALTER TABLE clientes ADD COLUMN descuento_pct DECIMAL(5,2) DEFAULT 0.00 AFTER notas;"
                ];
            } else {
                $diagnostics[] = [
                    'component' => 'Columna `clientes.descuento_pct`',
                    'status' => 'OK',
                    'details' => 'La columna existe correctamente.'
                ];
            }
        }

        // B. Verificar Tabla: productos y columnas
        if (!in_array('productos', $existingTables)) {
            $diagnostics[] = [
                'component' => 'Tabla `productos`',
                'status' => 'ERROR',
                'details' => 'La tabla no existe en la base de datos.'
            ];
        } else {
            $columns = $db->query("DESCRIBE productos")->fetchAll(PDO::FETCH_COLUMN);
            
            // Check es_vendible
            if (!in_array('es_vendible', $columns)) {
                $diagnostics[] = [
                    'component' => 'Columna `productos.es_vendible`',
                    'status' => 'ERROR',
                    'details' => 'Falta definir si el producto es vendible.',
                    'fix_sql' => "ALTER TABLE productos ADD COLUMN es_vendible TINYINT(1) NOT NULL DEFAULT 1 AFTER activo;"
                ];
            } else {
                $diagnostics[] = [
                    'component' => 'Columna `productos.es_vendible`',
                    'status' => 'OK',
                    'details' => 'La columna existe correctamente.'
                ];
            }

            // Check es_insumo
            if (!in_array('es_insumo', $columns)) {
                $diagnostics[] = [
                    'component' => 'Columna `productos.es_insumo`',
                    'status' => 'ERROR',
                    'details' => 'Falta definir si el producto es un insumo.',
                    'fix_sql' => "ALTER TABLE productos ADD COLUMN es_insumo TINYINT(1) NOT NULL DEFAULT 0 AFTER es_vendible;"
                ];
            } else {
                $diagnostics[] = [
                    'component' => 'Columna `productos.es_insumo`',
                    'status' => 'OK',
                    'details' => 'La columna existe correctamente.'
                ];
            }

            // Info sobre id de productos y motor
            $idCol = $db->query("SHOW COLUMNS FROM productos LIKE 'id'")->fetch();
            $prodIdType = $idCol ? strtoupper($idCol['Type']) : 'Desconocido';
            $tableStatus = $db->query("SHOW TABLE STATUS LIKE 'productos'")->fetch();
            $prodEngine = $tableStatus ? $tableStatus['Engine'] : 'Desconocido';

            $diagnostics[] = [
                'component' => 'Metadatos de Tabla `productos`',
                'status' => 'INFO',
                'details' => "Tipo de ID: {$prodIdType} | Motor: {$prodEngine}"
            ];
        }

        // C. Verificar Tabla: pedido_items y columnas
        if (!in_array('pedido_items', $existingTables)) {
            $diagnostics[] = [
                'component' => 'Tabla `pedido_items`',
                'status' => 'ERROR',
                'details' => 'La tabla no existe en la base de datos.'
            ];
        } else {
            $columns = $db->query("DESCRIBE pedido_items")->fetchAll(PDO::FETCH_COLUMN);
            if (!in_array('stock_descontado', $columns)) {
                $diagnostics[] = [
                    'component' => 'Columna `pedido_items.stock_descontado`',
                    'status' => 'ERROR',
                    'details' => 'Falta la columna para registrar si el stock ya fue descontado.',
                    'fix_sql' => "ALTER TABLE pedido_items ADD COLUMN stock_descontado TINYINT(1) DEFAULT 0 AFTER subtotal;"
                ];
            } else {
                $diagnostics[] = [
                    'component' => 'Columna `pedido_items.stock_descontado`',
                    'status' => 'OK',
                    'details' => 'La columna existe correctamente.'
                ];
            }
        }

        // D. Verificar Tabla: filamentos y columnas
        if (!in_array('filamentos', $existingTables)) {
            $diagnostics[] = [
                'component' => 'Tabla `filamentos`',
                'status' => 'ERROR',
                'details' => 'La tabla no existe en la base de datos.'
            ];
        } else {
            $columns = $db->query("DESCRIBE filamentos")->fetchAll(PDO::FETCH_COLUMN);
            if (!in_array('stock_rollos', $columns)) {
                $diagnostics[] = [
                    'component' => 'Columna `filamentos.stock_rollos`',
                    'status' => 'ERROR',
                    'details' => 'Falta registrar el stock en rollos.',
                    'fix_sql' => "ALTER TABLE filamentos ADD COLUMN stock_rollos INT NOT NULL DEFAULT 1 AFTER diametro_mm;"
                ];
            } else {
                $diagnostics[] = [
                    'component' => 'Columna `filamentos.stock_rollos`',
                    'status' => 'OK',
                    'details' => 'La columna existe correctamente.'
                ];
            }

            if (!in_array('stock_minimo_rollos', $columns)) {
                $diagnostics[] = [
                    'component' => 'Columna `filamentos.stock_minimo_rollos`',
                    'status' => 'ERROR',
                    'details' => 'Falta registrar el stock mínimo de rollos.',
                    'fix_sql' => "ALTER TABLE filamentos ADD COLUMN stock_minimo_rollos INT NOT NULL DEFAULT 0 AFTER stock_rollos;"
                ];
            } else {
                $diagnostics[] = [
                    'component' => 'Columna `filamentos.stock_minimo_rollos`',
                    'status' => 'OK',
                    'details' => 'La columna existe correctamente.'
                ];
            }
        }

        // E. Verificar tabla `compras`
        if (!in_array('compras', $existingTables)) {
            $diagnostics[] = [
                'component' => 'Tabla `compras`',
                'status' => 'ERROR',
                'details' => 'Falta la tabla para gestionar el módulo de compras.',
                'fix_sql' => "CREATE TABLE compras (
                    id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
                    proveedor_id INT UNSIGNED NOT NULL,
                    numero_comprobante VARCHAR(100),
                    total DECIMAL(12,2) NOT NULL DEFAULT 0.00,
                    estado ENUM('completada', 'cancelada') NOT NULL DEFAULT 'completada',
                    notas TEXT,
                    fecha DATE NOT NULL,
                    created_by INT UNSIGNED,
                    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
                    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
                    FOREIGN KEY (proveedor_id) REFERENCES proveedores(id) ON DELETE RESTRICT,
                    FOREIGN KEY (created_by) REFERENCES usuarios(id) ON DELETE SET NULL
                ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;"
            ];
        } else {
            $diagnostics[] = [
                'component' => 'Tabla `compras`',
                'status' => 'OK',
                'details' => 'La tabla existe.'
            ];
        }

        // F. Verificar tabla `compra_items`
        if (!in_array('compra_items', $existingTables)) {
            $diagnostics[] = [
                'component' => 'Tabla `compra_items`',
                'status' => 'ERROR',
                'details' => 'Falta la tabla de items comprados.',
                'fix_sql' => "CREATE TABLE compra_items (
                    id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
                    compra_id INT UNSIGNED NOT NULL,
                    producto_id INT UNSIGNED,
                    descripcion VARCHAR(200),
                    cantidad DECIMAL(10,2) NOT NULL DEFAULT 1.00,
                    precio_unitario DECIMAL(10,2) NOT NULL DEFAULT 0.00,
                    subtotal DECIMAL(12,2) NOT NULL DEFAULT 0.00,
                    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
                    FOREIGN KEY (compra_id) REFERENCES compras(id) ON DELETE CASCADE,
                    FOREIGN KEY (producto_id) REFERENCES productos(id) ON DELETE SET NULL
                ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;"
            ];
        } else {
            $diagnostics[] = [
                'component' => 'Tabla `compra_items`',
                'status' => 'OK',
                'details' => 'La tabla existe.'
            ];
        }

        // G. Verificar tabla `movimientos_stock`
        if (!in_array('movimientos_stock', $existingTables)) {
            // Detectar dinámicamente si productos.id es UNSIGNED o no
            $prodIdType = 'INT UNSIGNED';
            if (in_array('productos', $existingTables)) {
                $idCol = $db->query("SHOW COLUMNS FROM productos LIKE 'id'")->fetch();
                if ($idCol && isset($idCol['Type'])) {
                    $rawType = strtoupper($idCol['Type']);
                    if (strpos($rawType, 'UNSIGNED') === false) {
                        $prodIdType = 'INT';
                    }
                }
            }

            $diagnostics[] = [
                'component' => 'Tabla `movimientos_stock`',
                'status' => 'ERROR',
                'details' => "Falta la tabla para registrar ingresos/egresos de stock. Tipo de ID referencia: {$prodIdType}",
                'fix_sql' => "CREATE TABLE movimientos_stock (
                    id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
                    producto_id {$prodIdType} NOT NULL,
                    cantidad DECIMAL(10,2) NOT NULL,
                    tipo_movimiento ENUM('ajuste_manual', 'venta', 'compra', 'produccion', 'devolucion', 'anulacion_venta') NOT NULL,
                    referencia_id INT DEFAULT NULL,
                    notas TEXT,
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
                ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
                ALTER TABLE movimientos_stock ADD CONSTRAINT fk_mov_stock_prod FOREIGN KEY (producto_id) REFERENCES productos(id) ON DELETE CASCADE;"
            ];
        } else {
            $diagnostics[] = [
                'component' => 'Tabla `movimientos_stock`',
                'status' => 'OK',
                'details' => 'La tabla existe.'
            ];
        }

        // H. Verificar tabla `stock_historial`
        if (!in_array('stock_historial', $existingTables)) {
            $diagnostics[] = [
                'component' => 'Tabla `stock_historial`',
                'status' => 'ERROR',
                'details' => 'Falta la tabla para estadísticas e historial de valor de stock.',
                'fix_sql' => "CREATE TABLE stock_historial (
                  fecha DATE PRIMARY KEY,
                  valor_filamentos DECIMAL(12,2) DEFAULT 0,
                  valor_insumos DECIMAL(12,2) DEFAULT 0,
                  valor_mercaderia DECIMAL(12,2) DEFAULT 0,
                  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
                ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;"
            ];
        } else {
            $diagnostics[] = [
                'component' => 'Tabla `stock_historial`',
                'status' => 'OK',
                'details' => 'La tabla existe.'
            ];
        }

        // I. Verificar Enums de estados en pedidos
        if (in_array('pedidos', $existingTables)) {
            $colDesc = $db->query("SHOW COLUMNS FROM pedidos LIKE 'estado'")->fetch();
            if ($colDesc && isset($colDesc['Type'])) {
                $type = $colDesc['Type'];
                // Chequear si contiene 'anulado' y 'cobrado'
                if (strpos($type, 'anulado') === false || strpos($type, 'cobrado') === false) {
                    $diagnostics[] = [
                        'component' => 'Estados en tabla `pedidos`',
                        'status' => 'ERROR',
                        'details' => 'Los estados de pedidos no están actualizados (faltan anulado/cobrado en el ENUM).',
                        'fix_sql' => "ALTER TABLE pedidos MODIFY COLUMN estado ENUM('presupuesto','aprobado','en_produccion','terminado','entregado','cobrado','anulado') NOT NULL DEFAULT 'presupuesto';"
                    ];
                } else {
                    $diagnostics[] = [
                        'component' => 'Estados en tabla `pedidos`',
                        'status' => 'OK',
                        'details' => 'Los estados contienen el ENUM correcto.'
                    ];
                }
            }
        }

        // J. Verificar Índices y Auto-incremento en todas las tablas principales
        $tablesToCheckKeys = [
            'usuarios', 'proveedores', 'clientes', 'filamentos', 'impresoras',
            'categorias_producto', 'productos', 'compras', 'compra_items',
            'pedidos', 'pedido_items', 'pedido_historial', 'ordenes_produccion',
            'fallas_produccion', 'cotizaciones', 'config_costos'
        ];

        foreach ($tablesToCheckKeys as $tbl) {
            if (in_array($tbl, $existingTables)) {
                // 1. Verificar si tiene PRIMARY KEY
                $pkQuery = $db->query("SHOW KEYS FROM `{$tbl}` WHERE Key_name = 'PRIMARY'")->fetchAll();
                $hasPk = !empty($pkQuery);

                // 2. Verificar si es AUTO_INCREMENT
                $autoInc = false;
                $colQuery = $db->query("SHOW COLUMNS FROM `{$tbl}` LIKE 'id'")->fetch();
                if ($colQuery && isset($colQuery['Extra']) && strpos(strtolower($colQuery['Extra']), 'auto_increment') !== false) {
                    $autoInc = true;
                }

                if (!$hasPk || !$autoInc) {
                    $diagDetails = "Falta: " . (!$hasPk ? "Llave Primaria (PRIMARY KEY) " : "") . (!$autoInc ? "Auto-incremento (AUTO_INCREMENT)" : "");
                    
                    $fixSqls = [];
                    // Resolver IDs duplicados (sobre todo los id = 0) de forma segura antes de crear la PK
                    $fixSqls[] = "SET @max_id_{$tbl} := (SELECT COALESCE(MAX(id), 0) FROM `{$tbl}` WHERE id > 0)";
                    $fixSqls[] = "UPDATE `{$tbl}` SET id = (@max_id_{$tbl} := @max_id_{$tbl} + 1) WHERE id = 0";
                    if (!$hasPk) {
                        $fixSqls[] = "ALTER TABLE `{$tbl}` ADD PRIMARY KEY (id)";
                    }
                    $fixSqls[] = "ALTER TABLE `{$tbl}` MODIFY id INT UNSIGNED AUTO_INCREMENT";

                    $diagnostics[] = [
                        'component' => "Estructura Claves Tabla `{$tbl}`",
                        'status' => 'ERROR',
                        'details' => $diagDetails,
                        'fix_sql' => implode(";\n", $fixSqls) . ";"
                    ];
                } else {
                    $diagnostics[] = [
                        'component' => "Estructura Claves Tabla `{$tbl}`",
                        'status' => 'OK',
                        'details' => 'Llave primaria y auto-incremento configurados correctamente.'
                    ];
                }
            }
        }

        // Recolectar SQLs pendientes
        foreach ($diagnostics as $d) {
            if ($d['status'] === 'ERROR' && isset($d['fix_sql'])) {
                $pendingFixes[] = $d['fix_sql'];
            }
        }

        // 4. Procesar autocorrección si se solicita
        if (isset($_GET['fix']) && $_GET['fix'] === '1') {
            if (empty($pendingFixes)) {
                $successMessage = "No hay problemas pendientes por corregir.";
            } else {
                try {
                    $db->exec("SET FOREIGN_KEY_CHECKS = 0;");
                    foreach ($pendingFixes as $sql) {
                        $queries = array_filter(array_map('trim', explode(';', $sql)));
                        foreach ($queries as $q) {
                            if (!empty($q)) {
                                try {
                                    $db->exec($q);
                                } catch (\Throwable $queryEx) {
                                    // Si la tabla falló al añadir una restricción de clave foránea,
                                    // permitimos que continúe para no bloquear la creación de la tabla en sí misma.
                                    if (strpos(strtolower($queryEx->getMessage()), 'foreign key') !== false || strpos(strtolower($queryEx->getMessage()), '150') !== false) {
                                        continue;
                                    } else {
                                        throw $queryEx;
                                    }
                                }
                            }
                        }
                    }
                    $db->exec("SET FOREIGN_KEY_CHECKS = 1;");
                    $successMessage = "¡Base de datos corregida con éxito! Se aplicaron las modificaciones.";
                    
                    // Limpiar listado y re-diagnosticar
                    $pendingFixes = [];
                    // Redirigir para refrescar estado limpio
                    header("Location: check_db.php?applied=1");
                    exit;
                } catch (\Throwable $txEx) {
                    throw new Exception("Error al aplicar correcciones: " . $txEx->getMessage());
                }
            }
        }
        // Obtener la estructura de productos si existe
        if (in_array('productos', $existingTables)) {
            try {
                $pRow = $db->query("SHOW CREATE TABLE productos")->fetch(PDO::FETCH_NUM);
                if ($pRow) {
                    $createProductosSql = $pRow[1];
                }
            } catch (\Throwable $pEx) {}
        }

        // Simular consultas de endpoints conflictivos para diagnosticar errores 500
        if ($dbConnected) {
            // Test 1: KPIs - Rentabilidad
            try {
                $db->query("SELECT COALESCE(SUM(margen_bruto), 0) FROM pedidos");
                $queryTests[] = ['name' => 'KPIs: margen_bruto en pedidos', 'status' => 'OK', 'details' => 'Columna margen_bruto existe y se puede consultar.'];
            } catch (\Throwable $e) {
                $queryTests[] = ['name' => 'KPIs: margen_bruto en pedidos', 'status' => 'ERROR', 'details' => $e->getMessage()];
            }

            // Test 2: KPIs - Valor Filamentos (peso_restante_g)
            try {
                $db->query("SELECT COALESCE(SUM((peso_restante_g / 1000) * precio_compra), 0) FROM filamentos WHERE activo = 1 AND peso_restante_g > 0");
                $queryTests[] = ['name' => 'KPIs: peso_restante_g en filamentos', 'status' => 'OK', 'details' => 'Columna peso_restante_g existe y se puede consultar.'];
            } catch (\Throwable $e) {
                $queryTests[] = ['name' => 'KPIs: peso_restante_g en filamentos', 'status' => 'ERROR', 'details' => $e->getMessage()];
            }

            // Test 3: Alertas - Filamentos (peso_restante_g, stock_minimo_g, marca)
            try {
                $db->query("SELECT f.id, f.nombre, f.color, f.marca, f.peso_restante_g, f.stock_minimo_g FROM filamentos f LIMIT 1");
                $queryTests[] = ['name' => 'Alertas: marca/peso/stock_minimo en filamentos', 'status' => 'OK', 'details' => 'Columnas marca, peso_restante_g, stock_minimo_g existen y se pueden consultar.'];
            } catch (\Throwable $e) {
                $queryTests[] = ['name' => 'Alertas: marca/peso/stock_minimo en filamentos', 'status' => 'ERROR', 'details' => $e->getMessage()];
            }

            // Test 4: Productos list (LIMIT/OFFSET placeholders)
            try {
                $stmt = $db->prepare("SELECT p.id FROM productos p LIMIT ? OFFSET ?");
                $stmt->execute([10, 0]);
                $stmt->fetchAll();
                $queryTests[] = ['name' => 'Productos: LIMIT/OFFSET con binding directo', 'status' => 'OK', 'details' => 'PDO permite binding de LIMIT/OFFSET con array en execute().'];
            } catch (\Throwable $e) {
                $queryTests[] = ['name' => 'Productos: LIMIT/OFFSET con binding directo', 'status' => 'ERROR', 'details' => $e->getMessage()];
            }

            // Test 5: Productos create (guardar producto)
            try {
                // Simular INSERT en una transacción que luego revertiremos
                $db->beginTransaction();
                $stmt = $db->prepare("INSERT INTO productos (nombre, variante, sku, descripcion, tipo, categoria_id, precio_venta, precio_costo, stock_actual, stock_minimo, unidad_medida, imagen_url, es_vendible, es_insumo, activo, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1, NOW(), NOW())");
                $stmt->execute(['Test Diagnostico', null, 'SKU-TEST-DIAG', 'Desc', 'impresion_3d', null, 0, 0, 0, 0, 'unidad', null, 1, 0]);
                $db->rollBack();
                $queryTests[] = ['name' => 'Productos: Guardar producto (INSERT)', 'status' => 'OK', 'details' => 'INSERT de prueba simulado y revertido correctamente.'];
            } catch (\Throwable $e) {
                if ($db->inTransaction()) {
                    try { $db->rollBack(); } catch (\Throwable $rollbackEx) {}
                }
                $queryTests[] = ['name' => 'Productos: Guardar producto (INSERT)', 'status' => 'ERROR', 'details' => $e->getMessage()];
            }
        }
    }
} catch (\Throwable $ex) {
    $errorMessage = $ex->getMessage();
    if (isset($db) && $db) {
        try {
            $innodbStatusRow = $db->query("SHOW ENGINE INNODB STATUS")->fetch(PDO::FETCH_ASSOC);
            if ($innodbStatusRow && isset($innodbStatusRow['Status'])) {
                $statusText = $innodbStatusRow['Status'];
                $pos = strpos($statusText, 'LATEST FOREIGN KEY ERROR');
                if ($pos !== false) {
                    $errorSection = substr($statusText, $pos);
                    $endPos = strpos($errorSection, '--------------', 30);
                    if ($endPos !== false) {
                        $errorSection = substr($errorSection, 0, $endPos);
                    }
                    $errorMessage .= "\n\n=== DETALLE INNODB LATEST FOREIGN KEY ERROR ===\n" . trim($errorSection);
                }
            }
        } catch (\Throwable $errDb) {}
    }
}

if (isset($_GET['applied']) && $_GET['applied'] === '1') {
    $successMessage = "¡Las correcciones fueron aplicadas exitosamente en la base de datos!";
}

// 5. Verificar ClientesController (diagnóstico de código local)
$controllerStatus = "OK";
$controllerMsg = "El archivo ClientesController.php parece estar seguro.";
$controllerFile = __DIR__ . '/../src/Controllers/ClientesController.php';
if (file_exists($controllerFile)) {
    $content = file_get_contents($controllerFile);
    
    // Extraer el código del método update() para validar si le falta la cláusula WHERE
    $posUpdate = strpos($content, 'public function update');
    if ($posUpdate !== false) {
        $posDestroy = strpos($content, 'public function destroy', $posUpdate);
        $len = ($posDestroy !== false) ? ($posDestroy - $posUpdate) : 1500;
        $updateCodeSnippet = substr($content, $posUpdate, $len);
        
        if (strpos($updateCodeSnippet, 'WHERE id = ?') === false && strpos($updateCodeSnippet, 'WHERE id =') === false) {
            $controllerStatus = "ALERTA";
            $controllerMsg = "CRÍTICO: El método `update` en ClientesController.php NO TIENE la cláusula `WHERE id = ?`. ¡Esto modifica todos los clientes de la base de datos a la vez! Sube la versión correcta de ClientesController.php.";
        }
    } else {
        $controllerStatus = "INFO";
        $controllerMsg = "No se pudo encontrar el método `update` en ClientesController.php para realizar la auditoría.";
    }
} else {
    $controllerStatus = "INFO";
    $controllerMsg = "No se pudo leer el archivo local ClientesController.php (posiblemente ejecutándose en ambiente separado).";
}
?>
<!DOCTYPE html>
<html lang="es">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>SISTEMA 3LD — Diagnóstico de Base de Datos</title>
    <link href="https://fonts.googleapis.com/css2?family=Outfit:wght@300;400;600;700&display=swap" rel="stylesheet">
    <style>
        :root {
            --bg-color: #0f172a;
            --panel-bg: rgba(30, 41, 59, 0.7);
            --border-color: rgba(255, 255, 255, 0.08);
            --text-main: #f8fafc;
            --text-muted: #94a3b8;
            --primary: #6366f1;
            --primary-hover: #4f46e5;
            --success: #10b981;
            --error: #ef4444;
            --warning: #f59e0b;
        }

        * {
            box-sizing: border-box;
            margin: 0;
            padding: 0;
        }

        body {
            font-family: 'Outfit', sans-serif;
            background-color: var(--bg-color);
            color: var(--text-main);
            min-height: 100vh;
            display: flex;
            justify-content: center;
            align-items: center;
            padding: 2rem 1rem;
            background-image: radial-gradient(circle at 10% 20%, rgba(99, 102, 241, 0.15) 0%, transparent 40%),
                              radial-gradient(circle at 90% 80%, rgba(16, 185, 129, 0.1) 0%, transparent 40%);
        }

        .container {
            width: 100%;
            max-width: 850px;
            background: var(--panel-bg);
            backdrop-filter: blur(16px);
            border: 1px solid var(--border-color);
            border-radius: 24px;
            padding: 2.5rem;
            box-shadow: 0 20px 40px rgba(0, 0, 0, 0.3);
        }

        header {
            display: flex;
            justify-content: space-between;
            align-items: center;
            border-bottom: 1px solid var(--border-color);
            padding-bottom: 1.5rem;
            margin-bottom: 2rem;
        }

        h1 {
            font-size: 1.75rem;
            font-weight: 700;
            background: linear-gradient(135deg, #a5b4fc 0%, #6366f1 100%);
            -webkit-background-clip: text;
            -webkit-text-fill-color: transparent;
        }

        .logo-tag {
            font-size: 0.75rem;
            text-transform: uppercase;
            font-weight: 700;
            letter-spacing: 0.1em;
            background: rgba(99, 102, 241, 0.2);
            color: #a5b4fc;
            padding: 0.4rem 0.8rem;
            border-radius: 99px;
            border: 1px solid rgba(99, 102, 241, 0.3);
        }

        .alert {
            border-radius: 16px;
            padding: 1.25rem;
            margin-bottom: 2rem;
            font-size: 0.95rem;
            line-height: 1.5;
            display: flex;
            flex-direction: column;
            gap: 0.5rem;
        }

        .alert-error {
            background: rgba(239, 68, 68, 0.12);
            border: 1px solid rgba(239, 68, 68, 0.3);
            color: #fca5a5;
        }

        .alert-success {
            background: rgba(16, 185, 129, 0.12);
            border: 1px solid rgba(16, 185, 129, 0.3);
            color: #a7f3d0;
        }

        .alert-title {
            font-weight: 700;
            display: flex;
            align-items: center;
            gap: 0.5rem;
            font-size: 1.05rem;
        }

        .card {
            background: rgba(15, 23, 42, 0.4);
            border: 1px solid var(--border-color);
            border-radius: 16px;
            padding: 1.5rem;
            margin-bottom: 1.5rem;
        }

        .card h2 {
            font-size: 1.15rem;
            margin-bottom: 1rem;
            color: #cbd5e1;
            display: flex;
            align-items: center;
            gap: 0.5rem;
        }

        .diagnostic-row {
            display: flex;
            justify-content: space-between;
            align-items: center;
            padding: 0.8rem 0;
            border-bottom: 1px solid rgba(255, 255, 255, 0.04);
        }

        .diagnostic-row:last-child {
            border-bottom: none;
        }

        .comp-name {
            font-weight: 600;
            font-size: 0.95rem;
        }

        .comp-details {
            font-size: 0.85rem;
            color: var(--text-muted);
            margin-top: 0.25rem;
        }

        .badge {
            font-size: 0.75rem;
            font-weight: 700;
            padding: 0.25rem 0.6rem;
            border-radius: 6px;
            text-transform: uppercase;
        }

        .badge-ok {
            background: rgba(16, 185, 129, 0.15);
            color: #34d399;
            border: 1px solid rgba(16, 185, 129, 0.3);
        }

        .badge-error {
            background: rgba(239, 68, 68, 0.15);
            color: #f87171;
            border: 1px solid rgba(239, 68, 68, 0.3);
            animation: pulse 2s infinite;
        }

        .badge-warning {
            background: rgba(245, 158, 11, 0.15);
            color: #fbbf24;
            border: 1px solid rgba(245, 158, 11, 0.3);
        }

        .badge-info {
            background: rgba(99, 102, 241, 0.15);
            color: #818cf8;
            border: 1px solid rgba(99, 102, 241, 0.3);
        }

        .actions-panel {
            display: flex;
            justify-content: space-between;
            align-items: center;
            margin-top: 2rem;
            padding-top: 1.5rem;
            border-top: 1px solid var(--border-color);
        }

        .btn {
            font-family: inherit;
            font-size: 0.95rem;
            font-weight: 600;
            padding: 0.75rem 1.5rem;
            border-radius: 12px;
            border: none;
            cursor: pointer;
            transition: all 0.2s ease;
            text-decoration: none;
            display: inline-flex;
            align-items: center;
            gap: 0.5rem;
        }

        .btn-primary {
            background: var(--primary);
            color: white;
            box-shadow: 0 4px 12px rgba(99, 102, 241, 0.3);
        }

        .btn-primary:hover {
            background: var(--primary-hover);
            transform: translateY(-1px);
        }

        .btn-secondary {
            background: rgba(255, 255, 255, 0.05);
            color: var(--text-main);
            border: 1px solid var(--border-color);
        }

        .btn-secondary:hover {
            background: rgba(255, 255, 255, 0.1);
        }

        .sql-preview {
            background: #020617;
            padding: 1rem;
            border-radius: 12px;
            font-family: 'Courier New', Courier, monospace;
            font-size: 0.85rem;
            color: #38bdf8;
            overflow-x: auto;
            margin-top: 0.5rem;
            border: 1px solid rgba(56, 189, 248, 0.2);
        }

        @keyframes pulse {
            0% { opacity: 0.8; }
            50% { opacity: 1; box-shadow: 0 0 8px rgba(239, 68, 68, 0.3); }
            100% { opacity: 0.8; }
        }
    </style>
</head>
<body>

<div class="container">
    <header>
        <h1>Diagnóstico de Base de Datos</h1>
        <div class="logo-tag">Sistema 3LD</div>
    </header>

    <?php if (!empty($errorMessage)): ?>
        <div class="alert alert-error">
            <div class="alert-title">❌ Error del Diagnóstico</div>
            <p><?php echo htmlspecialchars($errorMessage); ?></p>
        </div>
    <?php endif; ?>

    <?php if (!empty($successMessage)): ?>
        <div class="alert alert-success">
            <div class="alert-title">✅ Operación Exitosa</div>
            <p><?php echo htmlspecialchars($successMessage); ?></p>
        </div>
    <?php endif; ?>

    <!-- Estado de Conexión -->
    <div class="card">
        <h2>🔌 Conexión Base de Datos</h2>
        <div class="diagnostic-row">
            <div>
                <div class="comp-name">
                    Host: <?php echo htmlspecialchars($config['db']['host'] ?? 'Desconocido'); ?> | 
                    BD: <?php echo htmlspecialchars($config['db']['dbname'] ?? 'Desconocido'); ?>
                </div>
                <div class="comp-details">Usuario: <?php echo htmlspecialchars($config['db']['user'] ?? ''); ?></div>
            </div>
            <div>
                <?php if ($dbConnected): ?>
                    <span class="badge badge-ok">Conectado</span>
                <?php else: ?>
                    <span class="badge badge-error">Desconectado</span>
                <?php endif; ?>
            </div>
        </div>
    </div>

    <!-- Resultados del Diagnóstico -->
    <?php if ($dbConnected): ?>
        <div class="card">
            <h2>📊 Estructura de Tablas y Columnas</h2>
            
            <?php foreach ($diagnostics as $diag): ?>
                <div class="diagnostic-row">
                    <div>
                        <div class="comp-name"><?php echo htmlspecialchars($diag['component']); ?></div>
                        <div class="comp-details"><?php echo htmlspecialchars($diag['details']); ?></div>
                        <?php if ($diag['status'] === 'ERROR' && isset($diag['fix_sql'])): ?>
                            <div class="sql-preview"><?php echo htmlspecialchars($diag['fix_sql']); ?></div>
                        <?php endif; ?>
                    </div>
                    <div>
                        <span class="badge badge-<?php echo strtolower($diag['status']); ?>">
                            <?php echo htmlspecialchars($diag['status']); ?>
                        </span>
                    </div>
                </div>
            <?php endforeach; ?>
        </div>

        <div class="card">
            <h2>🔒 Verificación de Controladores</h2>
            <div class="diagnostic-row">
                <div>
                    <div class="comp-name">ClientesController.php</div>
                    <div class="comp-details"><?php echo htmlspecialchars($controllerMsg); ?></div>
                </div>
                <div>
                    <span class="badge badge-<?php echo strtolower($controllerStatus === 'OK' ? 'ok' : ($controllerStatus === 'ALERTA' ? 'error' : 'info')); ?>">
                        <?php echo htmlspecialchars($controllerStatus); ?>
                    </span>
                </div>
            </div>
        </div>

        <?php if (!empty($queryTests)): ?>
            <div class="card">
                <h2>🔍 Pruebas de Consulta de Endpoints (Simulación)</h2>
                <?php foreach ($queryTests as $test): ?>
                    <div class="diagnostic-row" style="flex-direction: column; align-items: flex-start; gap: 0.5rem; padding: 1rem 0;">
                        <div style="display: flex; justify-content: space-between; width: 100%; align-items: center;">
                            <div class="comp-name"><?php echo htmlspecialchars($test['name']); ?></div>
                            <span class="badge badge-<?php echo strtolower($test['status'] === 'OK' ? 'ok' : 'error'); ?>">
                                <?php echo htmlspecialchars($test['status']); ?>
                            </span>
                        </div>
                        <div class="comp-details" style="color: <?php echo $test['status'] === 'ERROR' ? '#fca5a5' : 'var(--text-muted)'; ?>; font-family: monospace; font-size: 0.85rem; background: rgba(0,0,0,0.2); padding: 0.5rem; border-radius: 6px; width: 100%; word-break: break-all;">
                            <?php echo htmlspecialchars($test['details']); ?>
                        </div>
                    </div>
                <?php endforeach; ?>
            </div>
        <?php endif; ?>

        <?php if (!empty($createProductosSql)): ?>
            <div class="card">
                <h2>📋 Estructura de la Tabla `productos` en Producción</h2>
                <pre class="sql-preview" style="color: #cbd5e1; border-color: var(--border-color); font-family: monospace; font-size: 0.8rem; white-space: pre-wrap; text-align: left;"><?php echo htmlspecialchars($createProductosSql); ?></pre>
            </div>
        <?php endif; ?>

        <div class="actions-panel">
            <div>
                <?php if (!empty($pendingFixes)): ?>
                    <p style="color: var(--warning); font-size: 0.9rem; font-weight: 600;">
                        ⚠️ Se detectaron <?php echo count($pendingFixes); ?> discrepancias en la estructura.
                    </p>
                <?php else: ?>
                    <p style="color: var(--success); font-size: 0.9rem; font-weight: 600;">
                        ✨ ¡Estructura de base de datos al día! No se requieren acciones.
                    </p>
                <?php endif; ?>
            </div>
            <div>
                <?php if (!empty($pendingFixes)): ?>
                    <a href="check_db.php?fix=1" class="btn btn-primary" onclick="return confirm('¿Estás seguro de que deseas aplicar las correcciones automáticas a la base de datos? Esto ejecutará los comandos SQL necesarios.');">🛠️ Aplicar Correcciones</a>
                <?php else: ?>
                    <a href="check_db.php" class="btn btn-secondary">🔄 Recargar Diagnóstico</a>
                <?php endif; ?>
            </div>
        </div>
    <?php endif; ?>

</div>

<?php if (isset($_GET['applied']) && $_GET['applied'] === '1'): ?>
    <script>
        alert("¡Ejecutado con éxito! Las correcciones se aplicaron correctamente en la base de datos.");
    </script>
<?php endif; ?>

</body>
</html>
