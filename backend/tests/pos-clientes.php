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

$db->exec('ALTER TABLE clientes ADD COLUMN empresa TEXT; ALTER TABLE clientes ADD COLUMN dni_cuit TEXT');
$legacyClient = $repo->create([
    'nombre' => 'Alta POS anterior', 'email' => 'alta@example.test',
    'direccion' => 'Calle de prueba 43', 'cuit' => '20999999991',
]);
verify($legacyClient['email'] === 'alta@example.test' && $legacyClient['direccion'] === 'Calle de prueba 43',
    'El alta rápida guarda correo y dirección con el esquema histórico');
verify($legacyClient['cuit'] === '20999999991' && $repo->findAll(['q' => '20999999991'])['meta']['total'] === 1,
    'La ficha y el listado general reconocen el identificador fiscal histórico');
verify($repo->update((int) $legacyClient['id'], ['cuit' => '20999999992'])['cuit'] === '20999999992',
    'Editar el identificador fiscal funciona con ambos nombres de columna');

$post = (new ServerRequestFactory())->createServerRequest('POST', '/');
$newPayload = [
    'nombre' => 'Duplicado de prueba', 'email' => ' ZETA@example.test ',
    'telefono' => '+54 9 2257 512597', 'verificar_duplicados' => true,
];
$before = (int) $db->query('SELECT COUNT(*) FROM clientes')->fetchColumn();
$warning = $controller->create($post->withParsedBody($newPayload), new Response());
$matches = json_decode((string) $warning->getBody(), true)['errors']['coincidencias'];
verify($warning->getStatusCode() === 409 && (int) $db->query('SELECT COUNT(*) FROM clientes')->fetchColumn() === $before,
    'El alta POS devuelve un aviso antes de crear un duplicado');
verify($matches === [['id' => $favorite, 'nombre' => 'Zeta Prueba', 'email' => true, 'telefono' => true]],
    'Identifica el email sin distinguir mayúsculas y el mismo teléfono con formatos nacionales e internacionales');
verify($repo->findContactMatches('baja@example.test', '') === [] && $repo->findContactMatches('', '12') === [],
    'Ignora fichas inactivas y números incompletos');
$other = $repo->create(['nombre' => 'Segundo contacto', 'telefono' => '02257512597']);
$confirmation = $controller->create($post->withParsedBody($newPayload + ['confirmar_coincidencias' => [$favorite]]), new Response());
verify($confirmation->getStatusCode() === 409, 'Vuelve a pedir confirmación si aparece una coincidencia nueva');
$confirmAll = $controller->create($post->withParsedBody($newPayload + ['confirmar_coincidencias' => [$favorite, $other['id']]]), new Response());
verify($confirmAll->getStatusCode() === 201 && (int) $db->query('SELECT COUNT(*) FROM clientes')->fetchColumn() === $before + 2,
    'Permite separar fichas cuando el operador confirma conscientemente las coincidencias');
$unique = $controller->create($post->withParsedBody(['nombre' => 'Sin coincidencias', 'email' => 'nadie@example.test', 'verificar_duplicados' => true]), new Response());
verify($unique->getStatusCode() === 201, 'El alta de un contacto único se guarda directamente');
