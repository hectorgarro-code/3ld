<?php
declare(strict_types=1);
namespace App\Services;
use PDO;

/** Embudo privado por sesión diaria. La confirmación procede de pedidos, nunca de eventos públicos. */
final class CartFunnel
{
    public function __construct(private PDO $db) {
        $suffix=$db->getAttribute(PDO::ATTR_DRIVER_NAME)==='mysql'?' ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci':'';
        $db->exec('CREATE TABLE IF NOT EXISTS tienda_checkout_sesiones (pedido_id INTEGER PRIMARY KEY, session_id VARCHAR(64) NOT NULL, visitor_id VARCHAR(64) NOT NULL, created_at DATETIME NOT NULL)'.$suffix);
    }
    public function linkCheckout(int $orderId, mixed $identity): void {
        if (!is_array($identity)) return;
        $session=$identity['session_id'] ?? ''; $visitor=$identity['visitor_id'] ?? '';
        if (!is_string($session)||!is_string($visitor)||!preg_match('/^s_[a-zA-Z0-9_-]{4,62}$/D',$session)||!preg_match('/^v_[a-zA-Z0-9_-]{4,62}$/D',$visitor)) return;
        $s=$this->db->prepare('SELECT id FROM pedidos WHERE id=?');$s->execute([$orderId]); if (!$s->fetchColumn()) return;
        $s=$this->db->prepare('SELECT pedido_id FROM tienda_checkout_sesiones WHERE pedido_id=?');$s->execute([$orderId]);if($s->fetchColumn()) return;
        $s=$this->db->prepare('INSERT INTO tienda_checkout_sesiones (pedido_id,session_id,visitor_id,created_at) VALUES (?,?,?,CURRENT_TIMESTAMP)');
        $s->execute([$orderId,$session,$visitor]);
    }
    public function report(string $period='7d', ?int $now=null): array {
        $now=$now ?? time();
        $date=(new \DateTimeImmutable('@'.$now))->setTimezone(new \DateTimeZone('America/Argentina/Buenos_Aires'));
        $start=$period==='today'?$date->setTime(0,0)->getTimestamp():$date->modify('-'.match($period){'30d'=>30,'90d'=>90,default=>7}.' days')->getTimestamp();
        $where='e.created_at >= FROM_UNIXTIME(?) AND e.created_at <= FROM_UNIXTIME(?) AND v.is_bot=0 AND v.is_staff=0';
        $s=$this->db->prepare('SELECT COUNT(DISTINCT e.session_id) FROM tienda_visitas_eventos e INNER JOIN tienda_visitas v ON v.session_id=e.session_id WHERE '.$where);
        $s->execute([$start,$now]);$visits=(int)$s->fetchColumn();
        $s=$this->db->prepare("SELECT e.session_id,e.tipo,e.metadata,UNIX_TIMESTAMP(e.created_at) AS event_time,UNIX_TIMESTAMP(v.updated_at) AS last_active,v.device_type,v.referer,v.landing_page FROM tienda_visitas_eventos e INNER JOIN tienda_visitas v ON v.session_id=e.session_id WHERE $where AND e.tipo IN ('carrito_estado','carrito_abierto','iniciar_pago','pago_error','pedido_whatsapp') ORDER BY e.created_at,e.id");
        $s->execute([$start,$now]);$events=$s->fetchAll(PDO::FETCH_ASSOC);
        $s=$this->db->prepare("SELECT a.session_id,a.pedido_id,UNIX_TIMESTAMP(a.created_at) AS checkout_time,p.mercadopago_status,p.mercadopago_payment_id,p.total FROM tienda_checkout_sesiones a INNER JOIN pedidos p ON p.id=a.pedido_id WHERE a.created_at >= FROM_UNIXTIME(?) AND a.created_at <= FROM_UNIXTIME(?)");
        $s->execute([$start,$now]);
        return self::summarize($events,$s->fetchAll(PDO::FETCH_ASSOC),$visits,$now)+['window_start'=>gmdate('c',$start),'window_end'=>gmdate('c',$now)];
    }
    private static function source(array $event): string {
        $query=[];parse_str((string)parse_url((string)($event['landing_page']??''),PHP_URL_QUERY),$query);
        $utm=strtolower(is_string($query['utm_source']??null)?$query['utm_source']:'');
        $host=strtolower((string)parse_url((string)($event['referer']??''),PHP_URL_HOST));
        if(in_array($utm,['ig','instagram'],true)||str_contains($host,'instagram.com'))return 'Instagram';
        if(in_array($utm,['fb','facebook'],true)||str_contains($host,'facebook.com'))return 'Facebook';
        if($utm==='google'||str_contains($host,'google.'))return 'Google';
        if(in_array($utm,['wa','whatsapp'],true)||str_contains($host,'whatsapp.'))return 'WhatsApp';
        return $utm===''&&$host===''?'Directo / sin referencia':'Otros';
    }
    public static function summarize(array $events,array $orders,int $visits,int $now): array {
        $sessions=[];
        foreach($events as $e){
            $id=$e['session_id'];$at=(int)$e['event_time'];if($at>$now)continue;
            $sessions[$id]??=['first_cart'=>null,'quantity'=>0,'checkout'=>false,'whatsapp'=>false,'error'=>false,'paid'=>false,'pending'=>false,'reversed'=>false,'last'=>0,'device'=>in_array($e['device_type']??'', ['mobile','desktop','tablet'],true)?$e['device_type']:'other','source'=>self::source($e)];
            $s=&$sessions[$id];$s['last']=max($s['last'],min($now,(int)($e['last_active']??$at)),$at);
            $meta=json_decode((string)($e['metadata']??''),true);$meta=is_array($meta)?$meta:[];
            if($e['tipo']==='carrito_estado'&&($meta['version']??null)===1&&is_int($meta['articulos']??null)&&$meta['articulos']>=0){
                $s['quantity']=$meta['articulos'];if($s['quantity']>0&&$s['first_cart']===null)$s['first_cart']=$at;
            }
            if($e['tipo']==='iniciar_pago')$s['checkout']=true;
            if($e['tipo']==='pedido_whatsapp')$s['whatsapp']=true;
            if($e['tipo']==='pago_error')$s['error']=true;
            unset($s);
        }
        foreach($orders as $order){
            $id=$order['session_id'];if(!isset($sessions[$id])||$sessions[$id]['first_cart']===null)continue;
            if((int)$order['checkout_time']<$sessions[$id]['first_cart']||(int)$order['checkout_time']>$now)continue;
            $sessions[$id]['checkout']=true;
            if(($order['mercadopago_status']??'')==='approved'&&(float)$order['total']>0)$sessions[$id]['paid']=true;
            elseif(!empty($order['mercadopago_payment_id'])&&in_array($order['mercadopago_status']??'', ['refunded','charged_back','in_mediation'],true))$sessions[$id]['reversed']=true;
            elseif(!empty($order['mercadopago_payment_id'])&&in_array($order['mercadopago_status']??'', ['pending','in_process'],true))$sessions[$id]['pending']=true;
        }
        $result=['version'=>1,'sesiones'=>$visits,'carritos'=>0,'inicios_pago'=>0,'compras_confirmadas'=>0,'whatsapp'=>0,'en_curso'=>0,'pagos_pendientes'=>0,'pagos_revertidos'=>0,'vaciados'=>0,'abandono_antes_pago'=>0,'abandono_durante_pago'=>0,'errores_pago'=>0];
        $groups=['devices'=>[],'sources'=>[]];
        foreach($sessions as $s){
            if($s['first_cart']===null)continue;
            $result['carritos']++;if($s['checkout'])$result['inicios_pago']++;if($s['error'])$result['errores_pago']++;
            if($s['paid'])$state='compras_confirmadas';elseif($s['reversed'])$state='pagos_revertidos';elseif($s['pending'])$state='pagos_pendientes';elseif($s['whatsapp'])$state='whatsapp';elseif($s['quantity']===0)$state='vaciados';elseif($now-$s['last']<1800)$state='en_curso';else $state=$s['checkout']?'abandono_durante_pago':'abandono_antes_pago';
            $result[$state]++;
            foreach(['devices'=>'device','sources'=>'source'] as $group=>$key){$label=$s[$key];$groups[$group][$label]??=['nombre'=>$label,'carritos'=>0,'abandono'=>0,'compras'=>0,'whatsapp'=>0];$g=&$groups[$group][$label];$g['carritos']++;if(str_starts_with($state,'abandono_'))$g['abandono']++;if($state==='compras_confirmadas')$g['compras']++;if($state==='whatsapp')$g['whatsapp']++;unset($g);}
        }
        $result['abandono']=$result['abandono_antes_pago']+$result['abandono_durante_pago'];
        $mature=$result['abandono']+$result['compras_confirmadas'];
        $result['tasa_abandono']=$mature?round($result['abandono']/$mature*100,1):null;
        $result['base_tasa']=$mature;
        foreach($groups as $name=>$rows){$rows=array_values($rows);usort($rows,static fn($a,$b)=>$b['carritos']<=>$a['carritos']);$result[$name]=$rows;}
        return $result;
    }
}
