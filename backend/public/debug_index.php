<?php
ini_set('display_errors', '1');
error_reporting(E_ALL);

header('Content-Type: text/plain');

echo "Step 1: autoload\n";
require_once __DIR__ . '/../vendor/autoload.php';
echo "Step 1 OK\n";

echo "Step 2: config\n";
$config = require __DIR__ . '/../config/config.php';
echo "Step 2 OK\n";

echo "Step 3: ContainerBuilder\n";
$containerBuilder = new \DI\ContainerBuilder();
echo "Step 3 OK\n";

echo "Step 4: Database getConnection\n";
try {
    $db = (new \App\Database($config))->getConnection();
    echo "Step 4 OK: DB connected\n";
} catch (\Throwable $e) {
    echo "Step 4 FAILED: " . $e->getMessage() . "\n";
}

echo "Step 5: AppFactory create\n";
try {
    $container = $containerBuilder->build();
    \Slim\Factory\AppFactory::setContainer($container);
    $app = \Slim\Factory\AppFactory::create();
    echo "Step 5 OK: App created\n";
} catch (\Throwable $e) {
    echo "Step 5 FAILED: " . $e->getMessage() . "\n";
}

echo "ALL STEPS COMPLETED\n";
