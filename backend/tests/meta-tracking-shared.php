<?php
declare(strict_types=1);
require __DIR__.'/../vendor/autoload.php';
use App\Services\MetaTrackingConfig;
function check($v,$m){if(!$v)throw new RuntimeException($m);}
$base=sys_get_temp_dir().'/3ld-shared-'.bin2hex(random_bytes(8));
$dirs=[$base,$base.'/backend',$base.'/backend/src',$base.'/sistema',$base.'/sistema/backend',$base.'/sistema/backend/src'];
foreach($dirs as $dir)mkdir($dir,0700);
$legacyPath=$base.'/sistema/backend/public/uploads/.3ld-private/meta-capi.php';
$token=str_repeat('synthetic',6);
try {
 (new MetaTrackingConfig($legacyPath))->save($token,true);
 $web=new MetaTrackingConfig(null,$base);$erp=new MetaTrackingConfig(null,$base.'/sistema');
 check($web->sharedInstallation()&&$erp->sharedInstallation(),'reconoce ambos destinos del despliegue');
 check($web->read()['access_token']===$token&&$erp->read()['enabled'],'ambos leen la activación existente');
 $erp->save($token,false);
 check(!$web->read()['enabled']&&!$erp->read()['enabled'],'cambio central prevalece sobre copia anterior');
 check(is_file($base.'/backend/public/uploads/.3ld-private/meta-capi.php'),'guardado central compartido');
 echo "OK: tienda y sistema comparten CAPI; configuración central prevalece, sin secretos reales ni red.\n";
} finally {
 foreach([$base.'/backend/public/uploads/.3ld-private',$base.'/sistema/backend/public/uploads/.3ld-private'] as $private){
   foreach(['meta-capi.php','.htaccess'] as $name)if(is_file($private.'/'.$name))unlink($private.'/'.$name);
   foreach([$private,dirname($private),dirname($private,2)] as $dir)if(is_dir($dir))rmdir($dir);
 }
 foreach(array_reverse($dirs) as $dir)if(is_dir($dir))rmdir($dir);
}
