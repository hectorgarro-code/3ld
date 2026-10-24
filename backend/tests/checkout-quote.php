<?php
declare(strict_types=1);
require __DIR__ . '/../vendor/autoload.php';
function verify(bool $ok, string $label): void { if (!$ok) throw new RuntimeException($label); echo "OK: $label\n"; }
function rejected(callable $action, string $label): void { try { $action(); } catch (InvalidArgumentException $e) { verify(true,$label); return; } throw new RuntimeException($label); }
$db = new PDO('sqlite::memory:',null,null,[PDO::ATTR_ERRMODE=>PDO::ERRMODE_EXCEPTION,PDO::ATTR_DEFAULT_FETCH_MODE=>PDO::FETCH_ASSOC]);
$db->exec('CREATE TABLE productos(id INTEGER, nombre TEXT, activo INTEGER, es_tienda INTEGER, es_vendible INTEGER, precio_venta REAL, precio_oferta REAL, piezas TEXT, precios_cantidad TEXT, peso_gramos REAL, imagen_url TEXT)');
$insert=$db->prepare('INSERT INTO productos VALUES(?,?,?,?,?,?,?,?,?,?,?)');
$insert->execute([1,'Oferta',1,1,0,10000,8000,null,json_encode([['cantidad'=>3,'precio'=>7000]]),120,'/test.png']);
$insert->execute([2,'Piezas',1,1,0,5000,null,json_encode([['id'=>'a','nombre'=>'A','precio'=>2000],['id'=>'b','nombre'=>'B','precio'=>3000]]),null,120,null]);
$insert->execute([3,'Privado',1,0,0,10000,null,null,null,120,null]);
$insert->execute([4,'Inactivo',0,1,1,10000,null,null,null,120,null]);
$quote=new App\Services\CheckoutQuote($db);
$pickup=['method'=>'pickup']; $ship=['method'=>'shipping','postal_code'=>'7111','direccion'=>'Dirección ficticia'];
$result=$quote->calculate([['id'=>1,'quantity'=>1,'unit_price'=>1,'title'=>'Falso']],$pickup);
verify($result['total']===8000.0 && $result['items'][0]['title']==='Oferta','Precio y nombre vienen del servidor, no del cliente');
verify($quote->calculate([['id'=>1,'quantity'=>3]],$pickup)['total']===21000.0,'Escala por cantidad vigente');
verify($quote->calculate([['id'=>2,'quantity'=>2,'selected_piece_ids'=>['b']]],$pickup)['total']===6000.0,'Solo suma las piezas seleccionadas');
verify($quote->calculate([['id'=>2,'quantity'=>1,'selected_piece_ids'=>['a','b']]],$pickup)['total']===5000.0,'Conjunto completo');
foreach ([['id'=>99,'quantity'=>1],['id'=>3,'quantity'=>1],['id'=>4,'quantity'=>1],['id'=>1,'quantity'=>-1],['id'=>1,'quantity'=>1.5],['id'=>2,'quantity'=>1],['id'=>2,'quantity'=>1,'selected_piece_ids'=>['a','a']],['id'=>2,'quantity'=>1,'selected_piece_ids'=>['x']]] as $bad) rejected(fn()=>$quote->calculate([$bad],$pickup),'Rechaza producto/cantidad/selección inválida');
verify($quote->calculate([['id'=>1,'quantity'=>1]],$ship+['costo'=>0])['shipping']['cost']===2500,'Ignora envío manipulado a cero');
verify($quote->calculate([['id'=>1,'quantity'=>5]],$ship)['shipping']['cost']===0,'Envío local gratis desde 30000');
rejected(fn()=>$quote->calculate([['id'=>1,'quantity'=>1]],array_replace($ship,['postal_code'=>'1425'])),'No admite envío por correo no coordinado');
rejected(fn()=>$quote->calculate([['id'=>1,'quantity'=>1]],array_replace($ship,['postal_code'=>'7100'])),'No considera todo código 71xx como zona local');
rejected(fn()=>$quote->calculate([['id'=>1,'quantity'=>1]],array_replace($ship,['postal_code'=>'xxxx'])),'Código postal inválido');
verify($quote->calculate([['id'=>1,'quantity'=>1]],array_replace($ship,['postal_code'=>'7104']))['shipping']['cost']===2500,'Incluye Costa del Este');
rejected(fn()=>$quote->calculate([['id'=>1,'quantity'=>1]],array_replace($ship,['postal_code'=>'7167'])),'Excluye CP de Costa Esmeralda');
rejected(fn()=>$quote->calculate([['id'=>1,'quantity'=>1]],array_replace($ship,['direccion'=>'COSTA ESMERALDA, lote de prueba'])),'Excluye Costa Esmeralda aunque se ingrese un CP local');
rejected(fn()=>$quote->calculate([['id'=>1,'quantity'=>1]],array_replace($ship,['postal_code'=>'7110'])),'No admite códigos intermedios fuera de la lista de cobertura');
echo "Cotizaciones verificadas sin red, clientes ni pedidos reales.\n";
