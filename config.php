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
    'meta' => [
        'pixel_id'        => getenv('META_PIXEL_ID') ?: '612576675192830',
        'access_token'    => getenv('META_CAPI_ACCESS_TOKEN') ?: '',
        'test_event_code' => getenv('META_CAPI_TEST_EVENT_CODE') ?: null,
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
    if (is_array($localConfig)) {
        $config = array_replace_recursive($config, $localConfig);
    }
}

return $config;
