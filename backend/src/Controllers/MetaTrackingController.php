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
        return Response::success(['pixel_id'=>MetaTrackingConfig::PIXEL_ID,'has_token'=>!empty($data['access_token']),'enabled'=>!empty($data['enabled']),'authorized_at'=>$data['authorized_at']??null])->withHeader('Cache-Control','private, no-store');
    }
    protected function verifyToken(string $token): bool {
        $ch=curl_init('https://graph.facebook.com/v26.0/'.MetaTrackingConfig::PIXEL_ID.'?fields=id');
        curl_setopt_array($ch,[CURLOPT_RETURNTRANSFER=>true,CURLOPT_HTTPHEADER=>['Authorization: Bearer '.$token],CURLOPT_CONNECTTIMEOUT=>4,CURLOPT_TIMEOUT=>8]);
        $body=curl_exec($ch);$status=curl_getinfo($ch,CURLINFO_HTTP_CODE);curl_close($ch);
        $data=json_decode((string)$body,true);
        return $status===200&&(string)($data['id']??'')===MetaTrackingConfig::PIXEL_ID;
    }
    public function save(ServerRequestInterface $r,ResponseInterface $res): ResponseInterface {
        if(!$this->admin($r))return Response::error('Sólo administradores',403);
        $body=$r->getParsedBody();$body=is_array($body)?$body:[];
        $saved=$this->store->read();$token=trim((string)($body['access_token']??''));
        if($token==='')$token=(string)($saved['access_token']??'');
        if(!preg_match('/^[a-zA-Z0-9|_.-]{20,4096}$/D',$token))return Response::error('Ingresá un token de acceso válido',422);
        if(!is_bool($body['enabled']??null))return Response::error('Indicá si CAPI debe estar activo',422);
        if($body['enabled'] && ($body['consent']??false)!==true)return Response::error('Confirmá la autorización del envío a Meta',422);
        try {
            // Valida el acceso sin crear eventos, contactos ni compras de prueba.
            if($body['enabled'] && !$this->verifyToken($token))return Response::error('Meta no confirmó acceso al píxel de 3LD. Revisá el token y sus permisos.',422);
            $this->store->save($token,$body['enabled']);
            return $this->status($r,$res);
        } catch(\Throwable $e) {return Response::error('No se pudo verificar o guardar CAPI. El token no se guardó.',500);}
    }
}
