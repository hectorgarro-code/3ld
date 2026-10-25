<?php
declare(strict_types=1);
require __DIR__.'/../vendor/autoload.php';
function verify(bool $ok,string $message):void{if(!$ok)throw new RuntimeException($message);echo "OK: $message\n";}
function database(bool $full=true): PDO {
 $db=new PDO('sqlite::memory:',null,null,[PDO::ATTR_ERRMODE=>PDO::ERRMODE_EXCEPTION,PDO::ATTR_DEFAULT_FETCH_MODE=>PDO::FETCH_ASSOC]);$db->sqliteCreateFunction('NOW',fn()=>gmdate('Y-m-d H:i:s'));
 $columns='nombre TEXT,variante TEXT,sku TEXT UNIQUE,descripcion TEXT,tipo TEXT,categoria_id INTEGER,precio_venta NUMERIC,precio_costo NUMERIC,precio_mayorista NUMERIC,stock_actual NUMERIC,stock_minimo NUMERIC,unidad_medida TEXT,imagen_url TEXT,imagenes TEXT,archivo_url TEXT,es_vendible INTEGER,es_insumo INTEGER,es_tienda INTEGER,subcategoria TEXT,precio_oferta NUMERIC,peso_gramos INTEGER,horas_impresion NUMERIC,alto_mm NUMERIC,ancho_mm NUMERIC,profundidad_mm NUMERIC,dimensiones TEXT,estado_stock TEXT,es_destacado INTEGER,piezas TEXT,'.($full?'precios_cantidad TEXT,':'').'seo_title TEXT,seo_description TEXT,activo INTEGER,created_at TEXT,updated_at TEXT';
 $db->exec('CREATE TABLE productos(id INTEGER PRIMARY KEY AUTOINCREMENT,'.$columns.'); CREATE TABLE categorias_producto(id INTEGER PRIMARY KEY,nombre TEXT); INSERT INTO categorias_producto VALUES(1,"Egresados")');return $db;
}
$payload=['nombre'=>'Abecedario de prueba','precio_costo'=>570,'precio_venta'=>1200,'peso_gramos'=>12,'horas_impresion'=>0.78,'es_tienda'=>0,'categoria_id'=>1,'archivo_url'=>'https://makerworld.com/es/models/123-test','piezas'=>[['id'=>'a','nombre'=>'Letra A','precio_costo'=>570,'precio'=>1200,'medidas'=>'']],'precios_cantidad'=>[],'seo_title'=>'Prueba'];
$db=database();$repo=new App\Repositories\ProductoRepository($db);$created=$repo->create($payload);
verify($created['id']===1&&$created['sku']==='PRD-00001','Guarda artículo completo con SKU automático');
verify((float)$created['precio_costo']===570.0&&(float)$created['precio_venta']===1200.0,'Conserva costo y precio redondeado');
verify((int)$created['peso_gramos']===12&&(float)$created['horas_impresion']===0.78,'Conserva datos de impresión');
verify(count($created['piezas'])===1&&$created['piezas'][0]['nombre']==='Letra A'&&(float)$created['piezas'][0]['precio_costo']===570.0,'Conserva piezas configurables con su costo y precio');
verify((int)$created['es_tienda']===0&&$created['piezas'][0]['medidas']==='','No publica ni inventa medidas');
$broken=database(false);try{(new App\Repositories\ProductoRepository($broken))->create($payload);throw new RuntimeException('Guardó un artículo incompleto');}catch(PDOException $e){verify((int)$broken->query('SELECT COUNT(*) FROM productos')->fetchColumn()===0,'Esquema incompleto no guarda una versión reducida ni oculta el error original');}
echo "Alta verificada con SQLite temporal, sin artículos reales.\n";
