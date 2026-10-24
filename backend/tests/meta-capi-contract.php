<?php
declare(strict_types=1);
namespace App\Services {
 function curl_init($url) { $GLOBALS['captured_url']=$url; return true; }
 function curl_setopt($handle,$key,$value) { $GLOBALS['captured_options'][$key]=$value; return true; }
 function curl_exec($handle) { return '{"events_received":1}'; }
 function curl_getinfo($handle,$key) { return 200; }
 function curl_error($handle) { return ''; }
 function curl_close($handle) {}
}
namespace {
 require __DIR__.'/../vendor/autoload.php';
 function check($value,$message) { if(!$value) throw new \RuntimeException($message); }
 $config=['meta'=>['access_token'=>'test-placeholder','pixel_id'=>'123']];
 $pedido=['id'=>1,'total'=>100,'mercadopago_status'=>'approved'];
 $service=new \App\Services\MetaCapiService($config);
 $result=$service->sendPurchaseEvent($pedido,[['producto_id'=>116,'cantidad'=>1,'precio_unit'=>100]]);
 check($result['success'],'mocked response');
 check(str_starts_with($GLOBALS['captured_url'],'https://graph.facebook.com/v26.0/123/events?'),'default Graph version');
 $payload=json_decode($GLOBALS['captured_options'][CURLOPT_POSTFIELDS],true);
 check($payload['data'][0]['event_id']==='order_1','stable deduplication');
 check($payload['data'][0]['custom_data']['content_ids']===['3LD_116'],'catalog match');
 $config['meta']['api_version']='v25.0';
 (new \App\Services\MetaCapiService($config))->sendPurchaseEvent($pedido,[]);
 check(str_contains($GLOBALS['captured_url'],'/v25.0/'),'configurable version');
 $config['meta']['api_version']='https://example.invalid';
 (new \App\Services\MetaCapiService($config))->sendPurchaseEvent($pedido,[]);
 check(str_contains($GLOBALS['captured_url'],'/v26.0/'),'invalid version fallback');
 echo "CAPI contract checks passed with intercepted HTTP; no events sent.\n";
}
