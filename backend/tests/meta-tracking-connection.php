<?php
declare(strict_types=1);
namespace App\Controllers {
 function curl_init($url){$GLOBALS['test_url']=$url;return true;}
 function curl_setopt_array($handle,$options){$GLOBALS['test_options']=$options;return true;}
 function curl_exec($handle){return '{"events_received":1}';}
 function curl_getinfo($handle,$key){return 200;}
 function curl_close($handle){}

}
namespace {
 require __DIR__.'/../vendor/autoload.php';
 function check($v,$m){if(!$v)throw new RuntimeException($m);}
 class ConnectionProbe extends App\Controllers\MetaTrackingController {public function probe(string $token,string $code): bool{return $this->verifyToken($token,$code);}}
 $probe=new ConnectionProbe();
 check($probe->probe('synthetic-token-never-used','TEST12345'),'respuesta confirmada');
 check($GLOBALS['test_url']==='https://graph.facebook.com/v26.0/612576675192830/events','píxel fijo y token fuera de URL');
 $payload=json_decode($GLOBALS['test_options'][CURLOPT_POSTFIELDS],true);
 check($payload['test_event_code']==='TEST12345','sólo modo de pruebas');
 $event=$payload['data'][0];check($event['event_name']==='PageView'&&!isset($event['custom_data']['value']),'nunca prueba de compra');
 check(array_keys($event['user_data'])===['external_id'],'sin datos de compradores');
 check(str_starts_with($event['event_id'],'3ld_capi_connection_test_'),'ID sintético distinguible');
 echo "OK: validación CAPI usa TEST, PageView sintético, sin compras/clientes ni token en URL. HTTP interceptado.\n";
}
