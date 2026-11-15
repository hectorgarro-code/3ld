<?php
require __DIR__.'/../src/Services/DeliveryCoverageReport.php';
use App\Services\DeliveryCoverageReport;
function event($session,$cp,$value,$origin='carrito_fuera_cobertura') { return ['session_id'=>$session,'metadata'=>json_encode(['origen'=>$origin,'codigo_postal'=>$cp,'valor'=>$value])]; }
$rows=DeliveryCoverageReport::summarize([event('a','1000',10000),event('a','1000',12000),event('b','1000',5000),event('a','7600',9000),event('c','1000',999,'otro'),['session_id'=>'d','metadata'=>'invalid'],event('e','bad',-50)]);
if ($rows[0] !== ['codigo_postal'=>'1000','clics'=>3,'sesiones'=>2,'valor_carritos'=>17000.0]) throw new RuntimeException('Duplicación de clics o importes');
if (count($rows)!==3 || DeliveryCoverageReport::summarize([])!==[]) throw new RuntimeException('Filtro o estado vacío incorrecto');
$invalid=array_values(array_filter($rows,fn($r)=>$r['codigo_postal']==='Sin código válido'));
if ($invalid[0]['valor_carritos']!==0.0) throw new RuntimeException('Valor inválido');
echo "OK: agrupación, deduplicación, filtros y estado vacío\n";
