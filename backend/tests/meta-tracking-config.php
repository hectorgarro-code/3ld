<?php
declare(strict_types=1);
require __DIR__.'/../vendor/autoload.php';
use App\Services\MetaTrackingConfig;
use App\Controllers\MetaTrackingController;
function check($v,$m){if(!$v)throw new RuntimeException($m);}
class TestTrackingController extends MetaTrackingController {
    public bool $valid=true;
    protected function verifyToken(string $token): bool {return $this->valid;}
}
$dir=sys_get_temp_dir().'/3ld-meta-test-'.bin2hex(random_bytes(8));mkdir($dir,0700);$path=$dir.'/meta-capi.php';
try {
 $store=new MetaTrackingConfig($path);$controller=new TestTrackingController($store);
 $factory=new Slim\Psr7\Factory\ServerRequestFactory();$request=$factory->createServerRequest('POST','/config/meta-capi');$response=new Slim\Psr7\Response();
 check($controller->status($request,$response)->getStatusCode()===403,'sin admin no lee estado');
 check($controller->save($request->withAttribute('user',['rol'=>'operario']),$response)->getStatusCode()===403,'operario no guarda secretos');
 $admin=$request->withAttribute('user',['rol'=>'admin']);$body=['access_token'=>str_repeat('testonly',8),'enabled'=>true];
 check($controller->save($admin->withParsedBody($body),$response)->getStatusCode()===422,'no activa sin autorización');
 $body['consent']=true;$controller->valid=false;
 check($controller->save($admin->withParsedBody($body),$response)->getStatusCode()===422&&!is_file($path),'token sin acceso no se guarda');
 $controller->valid=true;$result=$controller->save($admin->withParsedBody($body),$response);
 check($result->getStatusCode()===200&&is_file($path),'guarda tras validar acceso');
 $json=(string)$result->getBody();check(!str_contains($json,$body['access_token'])&&str_contains($json,'has_token'),'nunca devuelve credencial');
 check($result->getHeaderLine('Cache-Control')==='private, no-store','sin caché');
 $controller->valid=false;$result=$controller->save($admin->withParsedBody(['access_token'=>'','enabled'=>false]),$response);
 check($result->getStatusCode()===200&&!$store->read()['enabled'],'permite desactivar incluso con token revocado');
 check($store->read()['pixel_id']===MetaTrackingConfig::PIXEL_ID,'píxel fijo de 3LD');
 echo "OK: CAPI sólo admin, autorización explícita, validación antes de guardar, secreto oculto y desactivación. Sin red.\n";
} finally {if(is_file($path))unlink($path);if(is_file($dir.'/.htaccess'))unlink($dir.'/.htaccess');if(is_dir($dir))rmdir($dir);}
