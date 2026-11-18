<?php

declare(strict_types=1);

require __DIR__ . '/../vendor/autoload.php';

use App\Controllers\ClientesController;
use App\Repositories\ClienteRepository;
use Slim\Psr7\Factory\ServerRequestFactory;
use Slim\Psr7\Response;

function verify(bool $condition, string $label): void
{
    if (!$condition) {
        throw new RuntimeException($label);
    }
    echo "OK: $label\n";
}

$db = new PDO('sqlite::memory:', null, null, [
    PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
    PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
]);
$db->sqliteCreateFunction('NOW', static fn () => '2026-11-18 11:00:00');
$db->exec('CREATE TABLE clientes (
    id INTEGER PRIMARY KEY AUTOINCREMENT, nombre TEXT, email TEXT, telefono TEXT, empresa TEXT,
    cuit TEXT, direccion TEXT, notas TEXT, tipo_cliente TEXT, descuento_porcentaje REAL DEFAULT 0,
    activo INTEGER NOT NULL DEFAULT 1, destacado_pos INTEGER NOT NULL DEFAULT 0,
    created_at TEXT, updated_at TEXT
);
CREATE TABLE pedidos(id INTEGER, cliente_id INTEGER, total REAL, numero_pedido TEXT,
    estado TEXT, saldo_pendiente REAL, created_at TEXT)');
$add = $db->prepare('INSERT INTO clientes (nombre, email, telefono, tipo_cliente, activo, destacado_pos) VALUES (?, ?, ?, ?, ?, ?)');
$add->execute(['Alicia Prueba', 'alicia@example.test', null, 'minorista', 1, 0]);
$add->execute(['CONS. FINAL', null, null, 'minorista', 1, 0]);
for ($index = 0; $index < 110; $index++) {
    $add->execute([sprintf('Comprador %03d', $index), null, null, 'minorista', 1, 0]);
}
$add->execute(['Zeta Prueba', 'zeta@example.test', '+54 (2257) 51-2597', 'mayorista', 1, 1]);
$favorite = (int) $db->lastInsertId();
$add->execute(['Baja Prueba', 'baja@example.test', null, 'minorista', 0, 1]);

$repo = new ClienteRepository($db);
$controller = new ClientesController($repo);
$request = (new ServerRequestFactory())->createServerRequest('PUT', '/');
$firstPage = $repo->findAll(['orden' => 'destacados', 'per_page' => 2]);
verify((int) $firstPage['data'][0]['id'] === $favorite && $firstPage['data'][0]['destacado_pos'] === true,
    'Los destacados activos aparecen primero antes de paginar');
verify($firstPage['meta']['total'] === 113 && $firstPage['meta']['last_page'] === 57, 'Excluye inactivos y permite recorrer toda la lista');
verify($repo->findAll(['orden' => 'pos_default', 'per_page' => 1])['data'][0]['nombre'] === 'CONS. FINAL',
    'El cliente predeterminado del ticket sigue siendo consumidor final');
verify($repo->findAll(['per_page' => 1])['data'][0]['nombre'] === 'Alicia Prueba',
    'El listado general conserva el orden alfabético');
foreach (['Zeta', 'zeta@example.test', '2257512597'] as $term) {
    $found = $repo->findAll(['orden' => 'destacados', 'q' => $term, 'per_page' => 1]);
    verify((int) $found['data'][0]['id'] === $favorite, "Busca por $term fuera de las primeras páginas");
}

$updated = $controller->update($request->withParsedBody(['destacado_pos' => false]), new Response(), ['id' => $favorite]);
verify($updated->getStatusCode() === 200 && !$repo->findById($favorite)['destacado_pos'], 'Se puede quitar una estrella');
$invalid = $controller->update($request->withParsedBody(['destacado_pos' => 'false']), new Response(), ['id' => $favorite]);
verify($invalid->getStatusCode() === 422, 'Se rechazan valores de destacado ambiguos');

$saved = $repo->create([
    'nombre' => 'Cliente nuevo de prueba', 'email' => 'nuevo@example.test',
    'telefono' => '2257000000', 'direccion' => 'Calle ficticia 123', 'tipo_cliente' => 'mayorista',
]);
verify($saved['direccion'] === 'Calle ficticia 123' && $saved['email'] === 'nuevo@example.test'
    && $saved['tipo_cliente'] === 'mayorista' && $saved['destacado_pos'] === false,
    'Guarda email y dirección opcionales en el cliente, sin asignarle estrella');
$repo->update((int) $saved['id'], ['destacado_pos' => true]);
$after = $repo->findById((int) $saved['id']);
verify($after['destacado_pos'] && $after['direccion'] === 'Calle ficticia 123' && $after['tipo_cliente'] === 'mayorista',
    'Cambiar la estrella conserva la dirección y la tarifa del cliente');
$db->exec('ALTER TABLE clientes DROP COLUMN empresa; ALTER TABLE clientes DROP COLUMN cuit');
$legacy = $repo->findAll(['orden' => 'destacados', 'q' => 'CONS. FINAL', 'per_page' => 20]);
verify($legacy['data'][0]['nombre'] === 'CONS. FINAL', 'La búsqueda del POS funciona con datos de contacto de instalaciones anteriores');
