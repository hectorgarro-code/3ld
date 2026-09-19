<?php

declare(strict_types=1);

if (PHP_SAPI === 'cli-server') {
    $url  = parse_url($_SERVER['REQUEST_URI']);
    $file = __DIR__ . $url['path'];
    if (is_file($file)) {
        return false;
    }
}

use App\Controllers\AuthController;
use App\Controllers\CategoriasController;
use App\Controllers\ClientesController;
use App\Controllers\CotizadorController;
use App\Controllers\DashboardController;
use App\Controllers\FilamentosController;
use App\Controllers\ImpresorasController;
use App\Controllers\PedidosController;
use App\Controllers\ProductosController;
use App\Controllers\ProduccionController;
use App\Controllers\ProveedoresController;
use App\Controllers\ComprasController;
use App\Controllers\TiendaController;
use App\Controllers\AiController;
use App\Services\OpenAiService;
use App\Services\MakerWorldScraper;
use App\Repositories\TiendaRepository;
use App\Middleware\AuthMiddleware;
use App\Middleware\CorsMiddleware;
use Slim\Factory\AppFactory;
use Slim\Routing\RouteCollectorProxy;
use DI\ContainerBuilder;

use App\Repositories\ProductoRepository;
use App\Repositories\DashboardRepository;
use App\Repositories\ClienteRepository;

// ── Bootstrap ────────────────────────────────────────────────────────────────
require_once __DIR__ . '/../vendor/autoload.php';

$config = require __DIR__ . '/../config/config.php';

$containerBuilder = new ContainerBuilder();
$containerBuilder->addDefinitions([
    'config' => $config,
    PDO::class => function ($c) {
        return (new \App\Database($c->get('config')))->getConnection();
    },
    OpenAiService::class => function ($c) {
        return new OpenAiService($c->get('config'));
    },
    MakerWorldScraper::class => function () {
        return new MakerWorldScraper();
    },
    AiController::class => function ($c) {
        return new AiController($c->get(OpenAiService::class), $c->get(MakerWorldScraper::class));
    },
    ProductoRepository::class => function ($c) {
        return new ProductoRepository($c->get(PDO::class));
    },
    ProductosController::class => function ($c) {
        return new ProductosController($c->get(ProductoRepository::class));
    },
    DashboardRepository::class => function ($c) {
        return new DashboardRepository($c->get(PDO::class));
    },
    DashboardController::class => function ($c) {
        return new DashboardController($c->get(DashboardRepository::class));
    },
    ClienteRepository::class => function ($c) {
        return new ClienteRepository($c->get(PDO::class));
    },
    ClientesController::class => function ($c) {
        return new ClientesController($c->get(ClienteRepository::class));
    },
    TiendaRepository::class => function ($c) {
        return new TiendaRepository($c->get(PDO::class));
    },
    TiendaController::class => function ($c) {
        return new TiendaController($c->get(TiendaRepository::class));
    },
    AuthController::class => function ($c) {
        return new AuthController($c->get('config'));
    },
    CategoriasController::class => function ($c) {
        return new CategoriasController($c->get('config'));
    },
    ComprasController::class => function ($c) {
        return new ComprasController($c->get('config'));
    },
    CotizadorController::class => function ($c) {
        return new CotizadorController($c->get('config'));
    },
    FilamentosController::class => function ($c) {
        return new FilamentosController($c->get('config'));
    },
    ImpresorasController::class => function ($c) {
        return new ImpresorasController($c->get('config'));
    },
    PedidosController::class => function ($c) {
        return new PedidosController($c->get('config'));
    },
    ProduccionController::class => function ($c) {
        return new ProduccionController($c->get('config'));
    },
    ProveedoresController::class => function ($c) {
        return new ProveedoresController($c->get('config'));
    },
]);
$container = $containerBuilder->build();
AppFactory::setContainer($container);

// ── App setup ────────────────────────────────────────────────────────────────
$app = AppFactory::create();

// Strip trailing slashes for cleaner URLs
$app->addRoutingMiddleware();

// Parse incoming request bodies (JSON, form, etc.)
$app->addBodyParsingMiddleware();

// CORS – must be added before routing so OPTIONS is handled first
$app->add(new CorsMiddleware());

// Error middleware – last registered, first executed
$errorMiddleware = $app->addErrorMiddleware(
    (bool) ($config['app']['debug'] ?? false),
    true,
    true
);

// Custom error handler to always return JSON
$errorMiddleware->setDefaultErrorHandler(
    function (
        \Psr\Http\Message\ServerRequestInterface $request,
        \Throwable $exception,
        bool $displayErrorDetails
    ) use ($app): \Psr\Http\Message\ResponseInterface {
        $response = $app->getResponseFactory()->createResponse();
        $payload  = [
            'success' => false,
            'message' => $exception->getMessage() ?: 'Error interno del servidor',
        ];
        if ($displayErrorDetails) {
            $payload['trace'] = $exception->getTraceAsString();
        }
        $response->getBody()->write(
            json_encode($payload, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES)
        );
        return $response
            ->withStatus(500)
            ->withHeader('Content-Type', 'application/json');
    }
);

// ── Auth middleware instance (shared) ────────────────────────────────────────
$auth = new AuthMiddleware($config);

// ── Routes ───────────────────────────────────────────────────────────────────
$app->group('/api/v1', function (RouteCollectorProxy $api) use ($config, $auth, $container) {

    // ── Auth ─────────────────────────────────────────────────────────────────
    $api->group('/auth', function (RouteCollectorProxy $g) use ($config, $container, $auth) {
        $g->post('/login', function ($req, $res) use ($container) {
            return $container->get(AuthController::class)->login($req, $res);
        });

        // Protected auth routes
        $g->get('/me', function ($req, $res) use ($container) {
            return $container->get(AuthController::class)->me($req, $res);
        })->add($auth);

        $g->post('/refresh', function ($req, $res) use ($container) {
            return $container->get(AuthController::class)->refresh($req, $res);
        })->add($auth);
    });

    // ── Dashboard ─────────────────────────────────────────────────────────────
    $api->group('/dashboard', function (RouteCollectorProxy $g) use ($container) {
        $g->get('/kpis',    function ($req, $res) use ($container) {
            return $container->get(DashboardController::class)->kpis($req, $res);
        });
        $g->get('/alertas', function ($req, $res) use ($container) {
            return $container->get(DashboardController::class)->alertas($req, $res);
        });
    })->add($auth);

    // ── Clientes ──────────────────────────────────────────────────────────────
    $api->group('/clientes', function (RouteCollectorProxy $g) use ($container) {
        $g->get('',        function ($req, $res) use ($container) {
            return $container->get(ClientesController::class)->index($req, $res);
        });
        $g->get('/{id}',   function ($req, $res, $args) use ($container) {
            return $container->get(ClientesController::class)->show($req, $res, $args);
        });
        $g->post('',       function ($req, $res) use ($container) {
            return $container->get(ClientesController::class)->create($req, $res);
        });
        $g->put('/{id}',   function ($req, $res, $args) use ($container) {
            return $container->get(ClientesController::class)->update($req, $res, $args);
        });
        $g->delete('/{id}',function ($req, $res, $args) use ($container) {
            return $container->get(ClientesController::class)->destroy($req, $res, $args);
        });
    })->add($auth);

    // ── Categorías ────────────────────────────────────────────────────────────
    $api->group('/categorias', function (RouteCollectorProxy $g) use ($container) {
        $g->get('', function ($req, $res) use ($container) {
            return $container->get(CategoriasController::class)->index($req, $res);
        });
        $g->post('', function ($req, $res) use ($container) {
            return $container->get(CategoriasController::class)->create($req, $res);
        });
        $g->put('/{id}', function ($req, $res, $args) use ($container) {
            return $container->get(CategoriasController::class)->update($req, $res, $args);
        });
        $g->delete('/{id}', function ($req, $res, $args) use ($container) {
            return $container->get(CategoriasController::class)->destroy($req, $res, $args);
        });
    })->add($auth);

    // ── Proveedores ───────────────────────────────────────────────────────────
    $api->group('/proveedores', function (RouteCollectorProxy $g) use ($container) {
        $g->get('',        function ($req, $res) use ($container) {
            return $container->get(ProveedoresController::class)->index($req, $res);
        });
        $g->get('/{id}',   function ($req, $res, $args) use ($container) {
            return $container->get(ProveedoresController::class)->show($req, $res, $args);
        });
        $g->get('/{id}/articulos', function ($req, $res, $args) use ($container) {
            return $container->get(ProveedoresController::class)->articulos($req, $res, $args);
        });
        $g->post('',       function ($req, $res) use ($container) {
            return $container->get(ProveedoresController::class)->create($req, $res);
        });
        $g->put('/{id}',   function ($req, $res, $args) use ($container) {
            return $container->get(ProveedoresController::class)->update($req, $res, $args);
        });
        $g->delete('/{id}',function ($req, $res, $args) use ($container) {
            return $container->get(ProveedoresController::class)->destroy($req, $res, $args);
        });
    })->add($auth);

    // ── Compras ───────────────────────────────────────────────────────────────
    $api->group('/compras', function (RouteCollectorProxy $g) use ($container) {
        $g->get('',      function ($req, $res) use ($container) {
            return $container->get(ComprasController::class)->index($req, $res);
        });
        $g->get('/{id}', function ($req, $res, $args) use ($container) {
            return $container->get(ComprasController::class)->show($req, $res, $args);
        });
        $g->post('',     function ($req, $res) use ($container) {
            return $container->get(ComprasController::class)->create($req, $res);
        });
    })->add($auth);

    // ── Productos ─────────────────────────────────────────────────────────────
    $api->group('/productos', function (RouteCollectorProxy $g) use ($container) {
        $g->get('',        function ($req, $res) use ($container) {
            return $container->get(ProductosController::class)->index($req, $res);
        });
        $g->get('/{id}',   function ($req, $res, $args) use ($container) {
            return $container->get(ProductosController::class)->show($req, $res, $args);
        });
        $g->get('/{id}/movimientos', function ($req, $res, $args) use ($container) {
            return $container->get(ProductosController::class)->movimientos($req, $res, $args);
        });
        $g->post('',       function ($req, $res) use ($container) {
            return $container->get(ProductosController::class)->create($req, $res);
        });
        $g->put('/{id}',   function ($req, $res, $args) use ($container) {
            return $container->get(ProductosController::class)->update($req, $res, $args);
        });
        $g->delete('/{id}',function ($req, $res, $args) use ($container) {
            return $container->get(ProductosController::class)->destroy($req, $res, $args);
        });
    })->add($auth);

    // ── Pedidos ───────────────────────────────────────────────────────────────
    $api->group('/pedidos', function (RouteCollectorProxy $g) use ($container) {
        $g->get('',                  function ($req, $res) use ($container) {
            return $container->get(PedidosController::class)->index($req, $res);
        });
        $g->get('/items',            function ($req, $res) use ($container) {
            return $container->get(PedidosController::class)->itemsIndex($req, $res);
        });
        $g->put('/items/{id}/estado',function ($req, $res, $args) use ($container) {
            return $container->get(PedidosController::class)->cambiarEstadoItem($req, $res, $args);
        });
        $g->get('/{id}',             function ($req, $res, $args) use ($container) {
            return $container->get(PedidosController::class)->show($req, $res, $args);
        });
        $g->post('',                 function ($req, $res) use ($container) {
            return $container->get(PedidosController::class)->create($req, $res);
        });
        $g->put('/{id}',             function ($req, $res, $args) use ($container) {
            return $container->get(PedidosController::class)->update($req, $res, $args);
        });
        $g->delete('/{id}',          function ($req, $res, $args) use ($container) {
            return $container->get(PedidosController::class)->destroy($req, $res, $args);
        });
        $g->post('/{id}/items',      function ($req, $res, $args) use ($container) {
            return $container->get(PedidosController::class)->addItem($req, $res, $args);
        });
        $g->get('/{id}/simular-entrega', function ($req, $res, $args) use ($container) {
            return $container->get(PedidosController::class)->simularEntrega($req, $res, $args);
        });
        $g->put('/{id}/estado',      function ($req, $res, $args) use ($container) {
            return $container->get(PedidosController::class)->cambiarEstado($req, $res, $args);
        });
    })->add($auth);

    // ── Filamentos ────────────────────────────────────────────────────────────
    $api->group('/filamentos', function (RouteCollectorProxy $g) use ($container) {
        $g->get('',              function ($req, $res) use ($container) {
            return $container->get(FilamentosController::class)->index($req, $res);
        });
        $g->get('/{id}',         function ($req, $res, $args) use ($container) {
            return $container->get(FilamentosController::class)->show($req, $res, $args);
        });
        $g->post('',             function ($req, $res) use ($container) {
            return $container->get(FilamentosController::class)->create($req, $res);
        });
        $g->put('/{id}',         function ($req, $res, $args) use ($container) {
            return $container->get(FilamentosController::class)->update($req, $res, $args);
        });
        $g->delete('/{id}',      function ($req, $res, $args) use ($container) {
            return $container->get(FilamentosController::class)->destroy($req, $res, $args);
        });
        $g->put('/{id}/stock', function ($req, $res, $args) use ($container) {
            return $container->get(FilamentosController::class)->updateStock($req, $res, $args);
        });
    })->add($auth);

    // ── Impresoras ────────────────────────────────────────────────────────────
    $api->group('/impresoras', function (RouteCollectorProxy $g) use ($container) {
        $g->get('',             function ($req, $res) use ($container) {
            return $container->get(ImpresorasController::class)->index($req, $res);
        });
        $g->get('/{id}',        function ($req, $res, $args) use ($container) {
            return $container->get(ImpresorasController::class)->show($req, $res, $args);
        });
        $g->post('',            function ($req, $res) use ($container) {
            return $container->get(ImpresorasController::class)->create($req, $res);
        });
        $g->put('/{id}',        function ($req, $res, $args) use ($container) {
            return $container->get(ImpresorasController::class)->update($req, $res, $args);
        });
        $g->delete('/{id}',     function ($req, $res, $args) use ($container) {
            return $container->get(ImpresorasController::class)->destroy($req, $res, $args);
        });
        $g->put('/{id}/estado', function ($req, $res, $args) use ($container) {
            return $container->get(ImpresorasController::class)->cambiarEstado($req, $res, $args);
        });
    })->add($auth);

    // ── Órdenes de Producción ─────────────────────────────────────────────────
    $api->group('/ordenes', function (RouteCollectorProxy $g) use ($container) {
        $g->get('',              function ($req, $res) use ($container) {
            return $container->get(ProduccionController::class)->index($req, $res);
        });
        $g->get('/{id}',         function ($req, $res, $args) use ($container) {
            return $container->get(ProduccionController::class)->show($req, $res, $args);
        });
        $g->post('',             function ($req, $res) use ($container) {
            return $container->get(ProduccionController::class)->create($req, $res);
        });
        $g->put('/{id}',         function ($req, $res, $args) use ($container) {
            return $container->get(ProduccionController::class)->update($req, $res, $args);
        });
        $g->delete('/{id}',      function ($req, $res, $args) use ($container) {
            return $container->get(ProduccionController::class)->destroy($req, $res, $args);
        });
        $g->put('/{id}/estado',  function ($req, $res, $args) use ($container) {
            return $container->get(ProduccionController::class)->cambiarEstado($req, $res, $args);
        });
        $g->post('/{id}/falla',  function ($req, $res, $args) use ($container) {
            return $container->get(ProduccionController::class)->registrarFalla($req, $res, $args);
        });
    })->add($auth);

    // ── Cotizador ─────────────────────────────────────────────────────────────
    $api->group('/cotizador', function (RouteCollectorProxy $g) use ($container) {
        $g->post('/calcular', function ($req, $res) use ($container) {
            return $container->get(CotizadorController::class)->calcular($req, $res);
        });
        $g->post('/guardar',  function ($req, $res) use ($container) {
            return $container->get(CotizadorController::class)->guardar($req, $res);
        });
        $g->get('/config',    function ($req, $res) use ($container) {
            return $container->get(CotizadorController::class)->config($req, $res);
        });
    })->add($auth);

    // ── Config / Costos (admin only) ──────────────────────────────────────────
    $api->group('/config', function (RouteCollectorProxy $g) use ($container) {
        $g->get('/costos',  function ($req, $res) use ($container) {
            return $container->get(CotizadorController::class)->config($req, $res);
        });
        $g->put('/costos',  function ($req, $res) use ($container) {
            return $container->get(CotizadorController::class)->updateConfig($req, $res);
        });
    })->add($auth);

    // Tienda Admin
    $api->group('/tienda', function (RouteCollectorProxy $g) use ($container) {
        $g->post('/productos/bulk-update', function ($req, $res) use ($container) {
            return $container->get(TiendaController::class)->bulkUpdate($req, $res);
        });
        $g->put('/productos/{id}', function ($req, $res, $args) use ($container) {
            return $container->get(TiendaController::class)->updateProducto($req, $res, $args);
        });
        $g->post('/productos/{id}/toggle', function ($req, $res, $args) use ($container) {
            return $container->get(TiendaController::class)->toggle($req, $res, $args);
        });
        $g->post('/config', function ($req, $res) use ($container) {
            return $container->get(TiendaController::class)->saveConfig($req, $res);
        });
    })->add($auth);


    // AI & MakerWorld Integration
    $api->group('/ai', function (RouteCollectorProxy $g) use ($container) {
        $g->post('/import-makerworld', function ($req, $res) use ($container) {
            return $container->get(AiController::class)->importMakerWorld($req, $res);
        });
        $g->post('/generate-text', function ($req, $res) use ($container) {
            return $container->get(AiController::class)->generateText($req, $res);
        });
    })->add($auth);
});

// Tienda Pública (sin autenticación requerida)
$app->get('/api/v1/tienda/productos', function ($req, $res) use ($container) {
    return $container->get(TiendaController::class)->getProductos($req, $res);
});
$app->get('/api/v1/tienda/config', function ($req, $res) use ($container) {
    return $container->get(TiendaController::class)->getConfig($req, $res);
});

// Proxy público de imágenes de MakerWorld
$app->get('/api/v1/ai/proxy-image', function ($req, $res) use ($container) {
    return $container->get(AiController::class)->proxyImage($req, $res);
});

// ── Health check (no auth) ───────────────────────────────────────────────────
$app->get('/api/v1/health', function ($req, $res) {
    $res->getBody()->write(json_encode([
        'success' => true,
        'message' => 'Sistema 3LD API funcionando',
        'version' => '1.0.0',
        'time'    => date('c'),
    ]));
    return $res->withHeader('Content-Type', 'application/json');
});

$app->run();
