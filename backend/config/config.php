<?php
// Configuración por defecto (Desarrollo)
$config = [
    'db' => [
        'host'    => 'localhost',
        'dbname'  => 'sistema3ld',
        'user'    => 'root',
        'pass'    => '',
        'charset' => 'utf8mb4',
    ],
    'jwt' => [
        'secret'     => 'sistema3ld_jwt_secret_cambia_en_produccion_2024',
        'expiration' => 86400, // 24 horas en segundos
    ],
    'app' => [
        'debug' => true, // false en producción
        'env'   => 'development',
    ],
];

// Si existe un archivo de configuración local (Producción), sobrescribe los valores
$localConfigPath = __DIR__ . '/config.local.php';
if (file_exists($localConfigPath)) {
    $localConfig = require $localConfigPath;
    $config = array_replace_recursive($config, $localConfig);
}

return $config;
