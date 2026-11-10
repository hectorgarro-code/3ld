<?php
declare(strict_types=1);
namespace App\Services;
use PDO;

/** Atribución interna por última campaña observada antes del checkout; no equivale a Meta Ads. */
final class CampaignReport {
    public function __construct(private PDO $db) {}
    public function report(string $period): array {
        $days=match($period){'30d'=>30,'90d'=>90,default=>7};
        $since=$period==='today'?'CURDATE()':"DATE_SUB(NOW(), INTERVAL {$days} DAY)";
        $events=$this->db->query("SELECT e.session_id,e.tipo,e.metadata,e.created_at,v.landing_page FROM tienda_visitas_eventos e INNER JOIN tienda_visitas v ON v.session_id=e.session_id WHERE e.created_at >= $since AND e.created_at <= NOW() AND v.is_bot=0 AND v.is_staff=0 ORDER BY e.created_at,e.id")->fetchAll(PDO::FETCH_ASSOC);
        $orders=$this->db->query("SELECT a.session_id,a.pedido_id,a.created_at,p.total,p.mercadopago_status FROM tienda_checkout_sesiones a INNER JOIN pedidos p ON p.id=a.pedido_id INNER JOIN tienda_visitas v ON v.session_id=a.session_id WHERE a.created_at >= $since AND a.created_at <= NOW() AND v.is_bot=0 AND v.is_staff=0")->fetchAll(PDO::FETCH_ASSOC);
        return self::summarize($events,$orders);
    }
    public static function summarize(array $events,array $orders): array {
        $groups=[]; $history=[];
        foreach($events as $e){
            $meta=json_decode((string)($e['metadata']??''),true);
            $a=is_array($meta['attribution']??null)?$meta['attribution']:[];
            if(empty($a['utm_source'])) { parse_str((string)parse_url((string)($e['landing_page']??''),PHP_URL_QUERY),$a); }
            $clean=[];
            foreach(['utm_source','utm_medium','utm_campaign','utm_content'] as $key) {
                $v=$a[$key]??'';
                $clean[$key]=is_string($v)&&strlen($v)<=120&&preg_match('/^[a-zA-Z0-9_. -]+$/D',$v)?$v:'';
            }
            if($clean['utm_source']==='') continue;
            $key=json_encode($clean); $id=(string)$e['session_id'];
            $groups[$key]??=$clean+['sesiones'=>0,'vistas_producto'=>0,'carritos'=>0,'clics_whatsapp'=>0,'inicios_pago'=>0,'compras_confirmadas'=>0,'ingresos_confirmados'=>0.0,'seen'=>[]];
            $g=&$groups[$key];
            if(!isset($g['seen']['session'][$id])){$g['sesiones']++;$g['seen']['session'][$id]=true;}
            $metric=match($e['tipo']){'ver_producto'=>'vistas_producto','agregar_carrito','carrito_estado'=>'carritos','whatsapp_click','pedido_whatsapp'=>'clics_whatsapp','iniciar_pago'=>'inicios_pago',default=>null};
            // Cada paso cuenta sesiones, no repeticiones de clics.
            if($e['tipo']==='carrito_estado' && (int)($meta['articulos']??0)<=0) $metric=null;
            if($metric && !isset($g['seen'][$metric][$id])){$g[$metric]++;$g['seen'][$metric][$id]=true;}
            $history[$id][]=['time'=>$e['created_at'],'key'=>$key]; unset($g);
        }
        $counted=[];
        foreach($orders as $o){
            if(($o['mercadopago_status']??'')!=='approved'||!is_numeric($o['total']??null)||!is_finite((float)$o['total'])||(float)$o['total']<=0||isset($counted[$o['pedido_id']]))continue;
            $choice=null;
            foreach($history[(string)$o['session_id']]??[] as $h){if($h['time']<=$o['created_at'])$choice=$h['key'];}
            if($choice===null)continue;
            $counted[$o['pedido_id']]=true;$groups[$choice]['compras_confirmadas']++;$groups[$choice]['ingresos_confirmados']+=(float)$o['total'];
        }
        foreach($groups as &$g){unset($g['seen']);$g['ingresos_confirmados']=round($g['ingresos_confirmados'],2);}unset($g);
        $rows=array_values($groups);usort($rows,static fn($a,$b)=>$b['sesiones']<=>$a['sesiones']);
        return ['version'=>1,'rows'=>$rows];
    }
}
