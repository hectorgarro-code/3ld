<?php
declare(strict_types=1);
require __DIR__ . '/../vendor/autoload.php';
use App\Helpers\ReceiptAccess;
use App\Helpers\PaymentVerification;
function check(bool $ok, string $label): void {
    if (!$ok) throw new RuntimeException($label);
    echo "OK: $label\n";
}
$token = ReceiptAccess::token(17, 'preference-test-only');
check(ReceiptAccess::allows(17, 'preference-test-only', $token), 'Comprador original puede acceder al comprobante');
check(!ReceiptAccess::allows(18, 'preference-test-only', $token), 'Token de otro pedido rechazado');
check(!ReceiptAccess::allows(17, '', $token) && !ReceiptAccess::allows(17, 'preference-test-only', ''), 'Comprobantes históricos sin clave permanecen privados');
$payment = ['status'=>'approved','currency_id'=>'ARS','transaction_amount'=>123.45,'external_reference'=>'17'];
$order = ['id'=>17,'total'=>'123.45'];
check(PaymentVerification::matchesApprovedOrder($payment, $order), 'Pago aprobado con importe y referencia correctos');
foreach (['status'=>'pending','currency_id'=>'USD','transaction_amount'=>1,'external_reference'=>'18'] as $key=>$value) {
    check(!PaymentVerification::matchesApprovedOrder(array_replace($payment, [$key=>$value]), $order), "Pago inválido rechazado: $key");
}
$db = new PDO('sqlite::memory:', null, null, [PDO::ATTR_ERRMODE=>PDO::ERRMODE_EXCEPTION,PDO::ATTR_DEFAULT_FETCH_MODE=>PDO::FETCH_ASSOC]);
$db->exec('CREATE TABLE clientes(id INTEGER,nombre TEXT,email TEXT,telefono TEXT,empresa TEXT,direccion TEXT);
CREATE TABLE pedidos(id INTEGER,cliente_id INTEGER,total REAL,estado TEXT,numero_pedido TEXT,subtotal REAL,descuento_pct REAL,impuesto_pct REAL,fecha_entrega_estimada TEXT,fecha_entrega_real TEXT,notas TEXT,created_at TEXT,updated_at TEXT,saldo_pendiente REAL,mercadopago_status TEXT,mercadopago_preference_id TEXT);
CREATE TABLE productos(id INTEGER,nombre TEXT,sku TEXT,unidad_medida TEXT,archivo_url TEXT,precio_costo REAL);
CREATE TABLE pedido_items(id INTEGER,pedido_id INTEGER,producto_id INTEGER,cantidad REAL,costo_unitario REAL,estado TEXT,archivo_url TEXT,descripcion TEXT,precio_unit REAL,subtotal REAL,notas TEXT);
CREATE TABLE pedido_historial(id INTEGER,pedido_id INTEGER,usuario_id INTEGER,created_at TEXT);
CREATE TABLE usuarios(id INTEGER,nombre TEXT);
INSERT INTO productos(id,precio_costo) VALUES(1,800);
INSERT INTO pedidos(id,total,estado,numero_pedido,mercadopago_status,mercadopago_preference_id) VALUES(17,10000,"cobrado","WEB-TEST","approved","preference-test-only");
INSERT INTO pedido_items(id,pedido_id,producto_id,cantidad,costo_unitario,estado) VALUES
(1,17,1,2,500,"cobrado"),(2,17,1,1,0,"cobrado"),(3,17,1,1,NULL,"cobrado"),(4,17,NULL,1,NULL,"cobrado"),(5,17,1,1,9999,"anulado");');
$repo = new App\Repositories\PedidoRepository($db);
$detail = $repo->findById(17);
check($detail['costo_total'] === 1800.0 && $detail['margen'] === 82.0 && $detail['items_sin_costo'] === 1, 'Detalle respeta costo histórico, cero explícito, fallback NULL y anulados');
$list = $repo->findAll([],20,0)['data'][0];
check($list['costo_total'] === $detail['costo_total'] && $list['margen'] === $detail['margen'], 'Lista y detalle muestran costos coherentes');
$controller = new App\Controllers\MercadoPagoController($db, null, ['app'=>['env'=>'test']]);
$request = (new Slim\Psr7\Factory\ServerRequestFactory())->createServerRequest('GET','/');
$denied = $controller->getPedidoPublico($request,new Slim\Psr7\Response(),['numero'=>'17']);
check($denied->getStatusCode() === 404 && !str_contains((string)$denied->getBody(),'cliente_email'), 'Endpoint real impide acceso sin token');
$allowed = $controller->getPedidoPublico($request->withHeader('X-Receipt-Token',$token),new Slim\Psr7\Response(),['numero'=>'WEB-TEST']);
check($allowed->getStatusCode() === 200 && $allowed->getHeaderLine('Cache-Control') === 'private, no-store' && !str_contains((string)$allowed->getBody(),'preference-test-only'), 'Endpoint permite token válido sin divulgar clave ni cachear');
class FixtureCatalog extends App\Controllers\MetaCatalogController {
    protected function getCatalogProducts(): array { return [
        ['id'=>113,'nombre'=>'Set & prueba','descripcion'=>'<b>Descripción</b>','precio_venta'=>13200,'precio_oferta'=>12000,'stock_actual'=>0,'estado_stock'=>'custom','imagen_url'=>'/test.png','imagenes'=>null,'categoria_nombre'=>'Juegos','subcategoria'=>'Moldes'],
        ['id'=>114,'nombre'=>'Agotado','descripcion'=>'','precio_venta'=>2500,'stock_actual'=>0,'estado_stock'=>'ready','imagen_url'=>null,'categoria_nombre'=>'Llaveros'],
        ['id'=>115,'nombre'=>'Sin precio','descripcion'=>'','precio_venta'=>0]
    ]; }
}
$catalog = new FixtureCatalog($db);
foreach (['getXml'=>'in stock','getGoogleXml'=>'in_stock'] as $method=>$availability) {
    $xml = (string)$catalog->$method($request,new Slim\Psr7\Response())->getBody();
    $dom = new DOMDocument(); check($dom->loadXML($xml), "$method produce XML válido");
    $xpath = new DOMXPath($dom); $xpath->registerNamespace('g','http://base.google.com/ns/1.0');
    check($xpath->query('//item')->length === 2 && $xpath->evaluate('string(//item[1]/g:availability)') === $availability && $xpath->evaluate('string(//item[1]/g:mpn)') === '3LD_113', "$method mantiene IDs, disponibilidad y exclusión de productos sin precio");
}
$publicDb = new PDO('sqlite::memory:', null, null, [PDO::ATTR_ERRMODE=>PDO::ERRMODE_EXCEPTION,PDO::ATTR_DEFAULT_FETCH_MODE=>PDO::FETCH_ASSOC]);
$columns = ['id INTEGER','nombre TEXT','subcategoria TEXT','descripcion TEXT','precio_venta REAL','precio_oferta REAL','stock_actual REAL','estado_stock TEXT','imagen_url TEXT','imagenes TEXT','colores TEXT','piezas TEXT','peso_gramos REAL','dimensiones TEXT','alto_mm REAL','ancho_mm REAL','profundidad_mm REAL','es_destacado INTEGER','categoria_id INTEGER','seo_title TEXT','seo_description TEXT','activo INTEGER','es_vendible INTEGER','es_tienda INTEGER','precios_cantidad TEXT'];
$publicDb->exec('CREATE TABLE productos('.implode(',', $columns).'); CREATE TABLE categorias_producto(id INTEGER,nombre TEXT)');
$pieces = json_encode([['id'=>'x','nombre'=>'Pieza','precio'=>2500,'precio_costo'=>800,'dato_interno'=>'privado']]);
$publicDb->prepare('INSERT INTO productos(id,nombre,precio_venta,activo,es_tienda,piezas) VALUES(113,?,2500,1,1,?)')->execute(['Producto', $pieces]);
$public = (new App\Repositories\TiendaRepository($publicDb))->getProductosPublicos()[0];
check($public['piezas'][0]['precio'] === 2500 && !array_key_exists('precio_costo',$public['piezas'][0]) && !array_key_exists('dato_interno',$public['piezas'][0]), 'API pública conserva precio y oculta campos internos de piezas');
check(str_contains($publicDb->query('SELECT piezas FROM productos')->fetchColumn(),'precio_costo'), 'Sanitización no altera los costos administrativos guardados');
$capi = new App\Services\MetaCapiService(['meta'=>['access_token'=>'test-only-never-used']]);
check(!$capi->sendPurchaseEvent(['id'=>17,'total'=>100,'mercadopago_status'=>'pending'],[])['success'], 'CAPI rechaza compra pendiente antes de realizar llamadas');
check(!$capi->sendPurchaseEvent(['id'=>17,'total'=>0,'mercadopago_status'=>'approved'],[])['success'], 'CAPI rechaza importe cero antes de realizar llamadas');
echo "Regresiones de comercio aprobadas. BD temporal; sin red ni pagos.\n";
