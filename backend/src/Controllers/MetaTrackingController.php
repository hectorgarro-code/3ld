<?php
declare(strict_types=1);
namespace App\Controllers;
use App\Helpers\Response;
use App\Services\MetaTrackingConfig;
use Psr\Http\Message\ResponseInterface;
use Psr\Http\Message\ServerRequestInterface;

class MetaTrackingController {
    public function __construct(private MetaTrackingConfig $store=new MetaTrackingConfig()) {}
    private function admin(ServerRequestInterface $r): bool {return ($r->getAttribute('user')['rol']??'')==='admin';}
    public function status(ServerRequestInterface $r,ResponseInterface $res): ResponseInterface {
        if(!$this->admin($r))return Response::error('Sólo administradores',403);
        $data=$this->store->read();
        return Response::success(['pixel_id'=>MetaTrackingConfig::PIXEL_ID,'shared_installation'=>$this->store->sharedInstallation(),'has_token'=>!empty($data['access_token']),'enabled'=>!empty($data['enabled']),'authorized_at'=>$data['authorized_at']??null])->withHeader('Cache-Control','private, no-store');
    }
    protected function verifyToken(string $token,string $testCode): bool {
        $ch=curl_init('https://graph.facebook.com/v26.0/'.MetaTrackingConfig::PIXEL_ID.'/events');
        $payload=['test_event_code'=>$testCode,'data'=>[['event_name'=>'PageView','event_time'=>time(),'event_id'=>'3ld_capi_connection_test_'.bin2hex(random_bytes(8)),'action_source'=>'website','event_source_url'=>'https://3ld.com.ar/','user_data'=>['external_id'=>[hash('sha256','3ld-capi-synthetic-connection-test')]]]]];
        curl_setopt_array($ch,[CURLOPT_RETURNTRANSFER=>true,CURLOPT_POST=>true,CURLOPT_POSTFIELDS=>json_encode($payload),CURLOPT_HTTPHEADER=>['Content-Type: application/json','Authorization: Bearer '.$token],CURLOPT_CONNECTTIMEOUT=>4,CURLOPT_TIMEOUT=>8]);
        $body=curl_exec($ch);$status=curl_getinfo($ch,CURLINFO_HTTP_CODE);curl_close($ch);
        $data=json_decode((string)$body,true);
        return $status===200&&(int)($data['events_received']??0)===1;
    }
    public function save(ServerRequestInterface $r,ResponseInterface $res): ResponseInterface {
        if(!$this->admin($r))return Response::error('Sólo administradores',403);
        $body=$r->getParsedBody();$body=is_array($body)?$body:[];
        $saved=$this->store->read();$token=trim((string)($body['access_token']??''));
        if($token==='')$token=(string)($saved['access_token']??'');
        if(!preg_match('/^[a-zA-Z0-9|_.-]{20,4096}$/D',$token))return Response::error('Ingresá un token de acceso válido',422);
        if(!is_bool($body['enabled']??null))return Response::error('Indicá si CAPI debe estar activo',422);
        if($body['enabled'] && ($body['consent']??false)!==true)return Response::error('Confirmá la autorización del envío a Meta',422);
        $testCode=trim((string)($body['test_event_code']??''));
        if($body['enabled'] && !preg_match('/^TEST[A-Z0-9]{3,40}$/D',$testCode))return Response::error('Ingresá el código de Probar eventos de Meta (TEST...)',422);
        try {
            // Evento sintético exclusivamente en modo de pruebas; nunca es Purchase ni usa datos de clientes.
            if($body['enabled'] && !$this->verifyToken($token,$testCode))return Response::error('Meta no aceptó el evento exclusivo de prueba en el píxel de 3LD. Revisá token y código TEST.',422);
            $this->store->save($token,$body['enabled']);
            return $this->status($r,$res);
        } catch(\Throwable $e) {return Response::error('No se pudo verificar o guardar CAPI. El token no se guardó.',500);}
    }
}
