<?php
declare(strict_types=1);

require __DIR__ . '/../vendor/autoload.php';

class ComboFixtureDb extends PDO
{
    public function prepare(string $query, array $options = []): PDOStatement|false
    {
        return parent::prepare(str_replace(' FOR UPDATE', '', $query), $options);
    }
}

function verifyCombo(bool $result, string $label): void
{
    if (!$result) throw new RuntimeException($label);
    echo "OK: $label\n";
}

$db = new ComboFixtureDb('sqlite::memory:', null, null, [
    PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
    PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
]);
$db->sqliteCreateFunction('NOW', fn() => '2026-11-19', 0);
$db->exec('CREATE TABLE productos(id INTEGER, nombre TEXT, stock_actual REAL, piezas TEXT, tipo TEXT, updated_at TEXT,
    activo INTEGER DEFAULT 1, es_tienda INTEGER DEFAULT 1, es_vendible INTEGER DEFAULT 1,
    precio_venta REAL DEFAULT 10000, precio_oferta REAL DEFAULT 8000, imagen_url TEXT);
    CREATE TABLE pedido_items(id INTEGER, producto_id INTEGER, cantidad REAL, stock_descontado INTEGER);
    CREATE TABLE movimientos_stock(producto_id INTEGER, cantidad REAL, tipo_movimiento TEXT, notas TEXT);
    CREATE TABLE producto_recetas(producto_id INTEGER, insumo_id INTEGER, cantidad REAL);');
$insert = $db->prepare('INSERT INTO productos(id,nombre,stock_actual,piezas,tipo,imagen_url) VALUES(?,?,?,?,?,?)');
$insert->execute([1,'Pieza A',8,null,'impresion_3d',null]);
$insert->execute([2,'Pieza B',7,null,'impresion_3d',null]);
$insert->execute([3,'Combo <A y B>',0,json_encode([
    ['id'=>1,'producto_id'=>1,'nombre'=>'Pieza A','cantidad'=>2,'precio'=>2500],
    ['id'=>2,'producto_id'=>2,'nombre'=>'Pieza B','cantidad'=>1,'precio'=>5000],
]),'compuesto','/uploads/portada-combo.jpg']);

$quote = new App\Services\CheckoutQuote($db);
foreach ([[], ['1','2']] as $pieces) {
    $result = $quote->calculate([['id'=>3,'quantity'=>2,'selected_piece_ids'=>$pieces]], ['method'=>'pickup']);
    verifyCombo($result['total'] === 16000.0 && $result['items'][0]['selected_piece_ids'] === [], 'Combo completo con o sin selección histórica, a $8.000 por unidad');
}
try {
    $quote->calculate([['id'=>3,'quantity'=>1,'selected_piece_ids'=>['1']]], ['method'=>'pickup']);
    throw new RuntimeException('Se aceptó un combo parcial');
} catch (InvalidArgumentException $e) {
    verifyCombo($e->getMessage() === 'El combo se vende completo.', 'Selección parcial rechazada');
}

$repo = new App\Repositories\PedidoRepository($db);
$stock = fn() => implode(',', $db->query('SELECT stock_actual FROM productos ORDER BY id')->fetchAll(PDO::FETCH_COLUMN));
$db->exec('INSERT INTO pedido_items VALUES(1,3,2,0)');
$repo->procesarStockItem(1,'cobrado');
verifyCombo($stock() === '4,5,0', 'Dos combos descuentan 4 y 2 unidades, sin stock propio del combo');
$repo->procesarStockItem(1,'cobrado');
verifyCombo($stock() === '4,5,0', 'Cobro repetido no duplica el descuento');
$repo->procesarStockItem(1,'anulado');
$repo->procesarStockItem(1,'anulado');
verifyCombo($stock() === '8,7,0', 'Anular restaura exactamente los componentes una sola vez');

$controller = new App\Controllers\TiendaController(new App\Repositories\TiendaRepository($db));
$html = (string)$controller->compartirProducto(new Slim\Psr7\Response(), 3)->getBody();
verifyCombo(str_contains($html, 'Combo &lt;A y B&gt;')
    && str_contains($html, '$8.000 · Incluye 2 × Pieza A, 1 × Pieza B')
    && str_contains($html, 'content="https://3ld.com.ar/uploads/portada-combo.jpg"')
    && str_contains($html, 'href="https://3ld.com.ar/?producto=3"'), 'Vista previa WhatsApp incluye portada, precio, cantidades y ficha');
