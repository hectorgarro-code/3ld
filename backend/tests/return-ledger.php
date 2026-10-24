<?php
declare(strict_types=1);
require __DIR__.'/../vendor/autoload.php';
function check(bool $ok,string $message): void { if (!$ok) throw new RuntimeException($message); echo "OK: $message\n"; }
function rejects(callable $action,string $class,string $message): void { try { $action(); } catch (Throwable $e) { if ($e instanceof $class) { check(true,$message); return; } throw $e; } throw new RuntimeException($message); }
$db=new PDO('sqlite::memory:',null,null,[PDO::ATTR_ERRMODE=>PDO::ERRMODE_EXCEPTION,PDO::ATTR_DEFAULT_FETCH_MODE=>PDO::FETCH_ASSOC]);
$db->exec('CREATE TABLE clientes(id INTEGER,telefono TEXT,email TEXT); CREATE TABLE pedidos(id INTEGER,numero_pedido TEXT,total NUMERIC,cliente_id INTEGER); INSERT INTO clientes VALUES(1,"0000000000","test@example.invalid"); INSERT INTO pedidos VALUES(1,"TEST-1",100.50,1),(2,"TEST-2",200,1)');
$store=new App\Services\ReturnLedger($db); $user=['id'=>7,'nombre'=>'Operador de prueba'];
function createCase($store,$user,$type='devolucion',$operation='manual-operation-0001',$order=1) { return $store->create(['tipo'=>$type,'pedido_id'=>$order,'observaciones'=>'Prueba aislada, sin operación real.','operacion_id'=>$operation],$user); }
function moveCase($store,$user,$entry,$action,$extra=[],$key=null) { return $store->movement($entry['id'],['version'=>$entry['version'],'accion'=>$action,'operacion_id'=>$key ?? bin2hex(random_bytes(16)),'nota'=>'Detalle ficticio de prueba.']+$extra,$user); }
$case=createCase($store,$user);
check($case['pedido']==='TEST-1' && $case['historial'][0]['usuario']['id']===7,'Vincula pedido real del entorno de prueba y responsable');
check(createCase($store,$user)['id']===$case['id'] && count($store->all())===1,'Reintentar alta no duplica ficha');
rejects(fn()=>createCase($store,$user,'cambio'),DomainException::class,'Reutilizar operación de alta con otros datos se rechaza');
rejects(fn()=>createCase($store,$user,'devolucion','manual-operation-unknown',99),InvalidArgumentException::class,'No vincula pedidos inexistentes');
rejects(fn()=>moveCase($store,$user,$case,'reintegro',['importe'=>'10','medio'=>'efectivo','referencia'=>'TEST']),InvalidArgumentException::class,'No registra dinero antes de recibir');
rejects(fn()=>moveCase($store,$user,$case,'cerrar'),InvalidArgumentException::class,'No permite cierre sin resolución');
$old=$case; $case=moveCase($store,$user,$case,'recibir');
rejects(fn()=>moveCase($store,$user,$old,'nota'),DomainException::class,'Detecta edición concurrente con versión desactualizada');
rejects(fn()=>moveCase($store,$user,$case,'recibir'),InvalidArgumentException::class,'No duplica recepción');
foreach (['-1','0','1.001','NaN','1e2'] as $amount) rejects(fn()=>moveCase($store,$user,$case,'reintegro',['importe'=>$amount,'medio'=>'efectivo','referencia'=>'TEST']),InvalidArgumentException::class,'Rechaza importe inválido '.$amount);
rejects(fn()=>moveCase($store,$user,$case,'reintegro',['importe'=>'20','medio'=>'transferencia','referencia'=>'']),InvalidArgumentException::class,'Exige referencia de comprobante');
$key='refund-idempotent-0001';
$before=$case;
$case=moveCase($store,$user,$case,'reintegro',['importe'=>'60.25','medio'=>'transferencia','referencia'=>'TEST-REF-1'],$key);
$retry=moveCase($store,$user,$before,'reintegro',['importe'=>'60.25','medio'=>'transferencia','referencia'=>'TEST-REF-1'],$key);
check($retry['version']===$case['version'] && count($retry['historial'])===3,'Reintento de reintegro no duplica historial ni importe');
rejects(fn()=>moveCase($store,$user,$case,'reintegro',['importe'=>'61','medio'=>'transferencia','referencia'=>'TEST-REF-1'],$key),DomainException::class,'No reutiliza clave de reintegro con otro importe');
$other=createCase($store,$user,'devolucion','manual-operation-0002'); $other=moveCase($store,$user,$other,'recibir');
rejects(fn()=>moveCase($store,$user,$other,'reintegro',['importe'=>'40.26','medio'=>'efectivo','referencia'=>'TEST']),InvalidArgumentException::class,'Controla límite acumulado entre fichas del mismo pedido');
$other=moveCase($store,$user,$other,'reintegro',['importe'=>'40.25','medio'=>'efectivo','referencia'=>'TEST-REF-2']);
check(end($other['historial'])['importe_centavos']===4025,'Conserva centavos exactos y admite el saldo restante');
$case=moveCase($store,$user,$case,'cerrar');
rejects(fn()=>moveCase($store,$user,$case,'reintegro',['importe'=>'1','medio'=>'efectivo','referencia'=>'TEST']),InvalidArgumentException::class,'Cierre impide nuevos movimientos de dinero');
$case=moveCase($store,$user,$case,'nota'); check($case['estado']==='cerrado','Permite aclaraciones posteriores sin reabrir ni borrar');
$exchange=createCase($store,$user,'cambio','manual-operation-0003',2);
rejects(fn()=>moveCase($store,$user,$exchange,'entregar_cambio'),InvalidArgumentException::class,'Cambio exige recepción previa');
$exchange=moveCase($store,$user,$exchange,'recibir'); $exchange=moveCase($store,$user,$exchange,'entregar_cambio'); $exchange=moveCase($store,$user,$exchange,'cerrar'); check($exchange['estado']==='cerrado','Completa cambio con entrega y cierre sin mover dinero');
$directory=sys_get_temp_dir().'/3ld-return-ledger-'.bin2hex(random_bytes(6));
try {
 $files=new App\Services\ReturnRequests($directory);
 $legacy=$files->create(['contacto'=>'test@example.invalid','pedido'=>'REFERENCIA-ANTIGUA'],'test');
 $store->importLegacy($files); $store->importLegacy($files);
 $imported=array_values(array_filter($store->all(),fn($e)=>$e['id']===$legacy['id']));
 check(count($imported)===1 && $imported[0]['historial']===[],'Importa solicitudes antiguas una sola vez y conserva referencia');
 $linked=moveCase($store,$user,$imported[0],'vincular',['pedido_id'=>2]); check($linked['pedido_id']===2,'Permite vincular solicitud web con pedido verificado');
 check(count(glob($directory.'/*.php'))===1,'La importación conserva el archivo original');
} finally { foreach(glob($directory.'/*.php') ?: [] as $file) unlink($file); if(is_dir($directory)) rmdir($directory); }
check((float)$db->query('SELECT total FROM pedidos WHERE id=1')->fetchColumn()===100.50,'No altera ventas ni totales originales');
echo "Registro verificado con SQLite temporal, sin clientes, pagos ni solicitudes reales.\n";
