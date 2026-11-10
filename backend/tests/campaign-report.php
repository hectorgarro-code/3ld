<?php
declare(strict_types=1);
require __DIR__.'/../src/Services/CampaignReport.php';
use App\Services\CampaignReport;
function check($v,$m){if(!$v)throw new RuntimeException($m);}
$event=static fn($source,$ad,$time,$type='pageview')=>['session_id'=>'s_one','tipo'=>$type,'created_at'=>$time,'metadata'=>json_encode(['attribution'=>['utm_source'=>$source,'utm_medium'=>'paid_social','utm_campaign'=>'egresados_2026','utm_content'=>$ad]])];
$events=[$event('instagram','a','2026-11-09 10:00:00'),$event('instagram','a','2026-11-09 10:01:00','whatsapp_click'),$event('instagram','a','2026-11-09 10:02:00','whatsapp_click'),$event('facebook','b','2026-11-09 10:03:00'),$event('instagram','later','2026-11-09 11:00:00')];
$order=['session_id'=>'s_one','pedido_id'=>1,'created_at'=>'2026-11-09 10:04:00','mercadopago_status'=>'approved','total'=>30000];
$rows=CampaignReport::summarize($events,[$order,$order,$order+['x'=>1]])['rows'];
check(array_sum(array_column($rows,'compras_confirmadas'))===1,'pedido duplicado sólo una vez');
check(array_sum(array_column($rows,'ingresos_confirmados'))===30000.0,'importe confirmado');
foreach($rows as $r){if($r['utm_content']==='b')check($r['compras_confirmadas']===1,'última campaña anterior al checkout');if($r['utm_content']==='a')check($r['clics_whatsapp']===1,'clics repetidos una sesión');if($r['utm_content']==='later')check($r['compras_confirmadas']===0,'campaña futura no roba compra');}
$order['mercadopago_status']='pending';check(array_sum(array_column(CampaignReport::summarize($events,[$order])['rows'],'compras_confirmadas'))===0,'pendiente no es compra');
check(CampaignReport::summarize([['session_id'=>'s','tipo'=>'pageview','created_at'=>'2026-11-09','metadata'=>'{}']],[])['rows']===[],'sin UTM no inventa campaña');
echo "OK: atribución por campaña, última antes del checkout, pedidos/clics deduplicados y compras sólo aprobadas. Sin red.\n";

$source=file_get_contents(__DIR__.'/../src/Services/CampaignReport.php');
check(str_contains($source,'BINARY v.session_id=BINARY a.session_id')&&str_contains($source,'BINARY v.session_id=BINARY e.session_id'),'comparación exacta de IDs compatible con collations históricas distintas');
