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
        'secret'     => getenv('JWT_SECRET') ?: 'sistema3ld_jwt_secret_cambia_en_produccion_2024',
        'expiration' => 86400, // 24 horas en segundos
    ],
    'openai' => [
        'api_key' => getenv('OPENAI_API_KEY') ?: '',
        'model'   => 'gpt-4o-mini',
    ],
    'meta' => [
        'pixel_id'        => getenv('META_PIXEL_ID') ?: '612576675192830',
        'access_token'    => getenv('META_CAPI_ACCESS_TOKEN') ?: '',
        'test_event_code' => getenv('META_CAPI_TEST_EVENT_CODE') ?: null,
    ],
    'mercadopago' => [
        'activo'       => true,
        'access_token' => getenv('MERCADOPAGO_ACCESS_TOKEN') ?: 'APP_USR-2387555144218667-092807-477633907a0b9502d3ce44fc6f09a303-10693395',
        'public_key'   => getenv('MERCADOPAGO_PUBLIC_KEY') ?: '',
        'sandbox'      => false,
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
