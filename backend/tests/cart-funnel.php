<?php
declare(strict_types=1);
require __DIR__.'/../vendor/autoload.php';
use App\Services\CartFunnel;
function verify(bool $ok,string $label):void{if(!$ok)throw new RuntimeException($label);echo "OK: $label\n";}
$now=strtotime('2026-10-24 18:00:00 UTC');$events=[];
function event(string $session,string $type,int $at,array $meta=[],?int $last=null):array{return ['session_id'=>$session,'tipo'=>$type,'metadata'=>json_encode($meta),'event_time'=>$at,'last_active'=>$last??$at,'device_type'=>'mobile','referer'=>'','landing_page'=>'https://3ld.com.ar/?utm_source=ig'];}
foreach(['paid','wa','active','before','after','empty','pending','reversed','fake'] as $session)$events[]=event($session,'carrito_estado',$now-4000,['version'=>1,'articulos'=>2]);
$events[]=event('paid','iniciar_pago',$now-3900);$events[]=event('after','iniciar_pago',$now-3900);$events[]=event('after','pago_error',$now-3800);
$events[]=event('wa','pedido_whatsapp',$now-3900);$events[]=event('active','carrito_abierto',$now-1799);$events[]=event('empty','carrito_estado',$now-3900,['version'=>1,'articulos'=>0]);
$events[]=event('fake','purchase',$now-3900,['status'=>'approved']);
$events[]=event('no_cart','iniciar_pago',$now-3800);$events[]=event('future','carrito_estado',$now+1,['version'=>1,'articulos'=>1]);
$orders=[];foreach(['paid'=>'approved','pending'=>'in_process','reversed'=>'refunded'] as $session=>$status)$orders[]=['session_id'=>$session,'pedido_id'=>count($orders)+1,'checkout_time'=>$now-3950,'mercadopago_status'=>$status,'mercadopago_payment_id'=>'TEST','total'=>100];
$orders[]=$orders[0];
$r=CartFunnel::summarize($events,$orders,20,$now);
verify($r['carritos']===9,'Una sesión diaria por carrito; ignora eventos sin carrito y futuros');
verify($r['compras_confirmadas']===1,'Pedido aprobado del servidor; duplicar fila no duplica compras');
verify($r['whatsapp']===1&&$r['en_curso']===1&&$r['vaciados']===1,'WhatsApp, sesiones activas y vaciados separados');
verify($r['pagos_pendientes']===1&&$r['pagos_revertidos']===1,'Pagos reales pendientes/revertidos no se declaran abandonados');
verify($r['abandono']===3&&$r['abandono_durante_pago']===1&&$r['abandono_antes_pago']===2,'Localiza antes y después del pago; evento purchase público no confirma venta');
verify($r['base_tasa']===4&&$r['tasa_abandono']===75.0,'Tasa con denominador explícito y exclusiones');
verify($r['errores_pago']===1&&$r['sources'][0]['nombre']==='Instagram'&&$r['devices'][0]['nombre']==='mobile','Errores y desgloses por origen/dispositivo');
$threshold=CartFunnel::summarize([event('x','carrito_estado',$now-1800,['version'=>1,'articulos'=>1])],[],1,$now);
verify($threshold['abandono']===1,'Umbral exacto de treinta minutos');
verify(CartFunnel::summarize([],[],0,$now)['tasa_abandono']===null,'Sin denominador no inventa tasa cero');
$db=new PDO('sqlite::memory:',null,null,[PDO::ATTR_ERRMODE=>PDO::ERRMODE_EXCEPTION,PDO::ATTR_DEFAULT_FETCH_MODE=>PDO::FETCH_ASSOC]);
$db->sqliteCreateFunction('FROM_UNIXTIME',fn($n)=>gmdate('Y-m-d H:i:s',(int)$n),1);
$db->sqliteCreateFunction('UNIX_TIMESTAMP',fn($date)=>$date?strtotime($date.' UTC'):null,1);
$db->exec('CREATE TABLE pedidos(id INTEGER PRIMARY KEY,mercadopago_status TEXT,mercadopago_payment_id TEXT,total NUMERIC); CREATE TABLE tienda_visitas(session_id TEXT,is_bot INTEGER,is_staff INTEGER,updated_at TEXT,device_type TEXT,referer TEXT,landing_page TEXT); CREATE TABLE tienda_visitas_eventos(id INTEGER PRIMARY KEY,session_id TEXT,tipo TEXT,metadata TEXT,created_at TEXT); INSERT INTO pedidos VALUES(1,"approved","TEST",100),(2,"pending",NULL,100)');
$service=new CartFunnel($db);$service->linkCheckout(1,['session_id'=>'s_customer_0001','visitor_id'=>'v_customer_0001']);$service->linkCheckout(1,['session_id'=>'s_other_0002','visitor_id'=>'v_other_0002']);
verify((int)$db->query('SELECT COUNT(*) FROM tienda_checkout_sesiones')->fetchColumn()===1&&$db->query('SELECT session_id FROM tienda_checkout_sesiones')->fetchColumn()==='s_customer_0001','Vinculación idempotente y sin reasignar pedido');
$service->linkCheckout(2,['session_id'=>['bad'],'visitor_id'=>'v_invalid_0001']);$service->linkCheckout(99,['session_id'=>'s_missing_0001','visitor_id'=>'v_missing_0001']);verify((int)$db->query('SELECT COUNT(*) FROM tienda_checkout_sesiones')->fetchColumn()===1,'Identidad inválida y pedido inexistente se ignoran');
$db->exec("UPDATE tienda_checkout_sesiones SET created_at='2026-10-24 02:00:00'");
$visit=$db->prepare('INSERT INTO tienda_visitas VALUES(?,?,?,?,?,?,?)');$insert=$db->prepare('INSERT INTO tienda_visitas_eventos(session_id,tipo,metadata,created_at) VALUES(?,?,?,?)');
foreach(['s_customer_0001'=>[0,0],'s_real_0002'=>[0,0],'s_staff_0003'=>[0,1],'s_bot_0004'=>[1,0]] as $session=>$flags){$visit->execute([$session,$flags[0],$flags[1],'2026-10-24 05:00:00','desktop','','']);$insert->execute([$session,'carrito_estado','{"version":1,"articulos":1}','2026-10-24 01:00:00']);}
$today=$service->report('today',$now);verify($today['sesiones']===0,'Hoy comienza a medianoche Argentina y no en UTC');
$insert->execute(['s_real_0002','carrito_estado','{"version":1,"articulos":1}','2026-10-24 04:00:00']);
$today=$service->report('today',$now);verify($today['sesiones']===1&&$today['carritos']===1,'Consulta SQL por actividad y ventana del período');
$week=$service->report('7d',$now);verify($week['carritos']===2&&$week['compras_confirmadas']===1,'Excluye bots/personal y vincula pagos en SQL');
verify((float)$db->query('SELECT total FROM pedidos WHERE id=1')->fetchColumn()===100.0,'Medición no cambia pagos ni importes');
echo "Embudo verificado sin red, clientes ni pagos reales.\n";
