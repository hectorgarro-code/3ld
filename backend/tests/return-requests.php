<?php
declare(strict_types=1);
require __DIR__.'/../vendor/autoload.php';
$directory = sys_get_temp_dir().'/3ld-returns-test-'.bin2hex(random_bytes(6));
$store = new App\Services\ReturnRequests($directory);
try {
    try { $store->create(['contacto'=>'inválido'],'test'); throw new RuntimeException('Aceptó contacto inválido'); } catch (InvalidArgumentException $e) {}
    $request=$store->create(['contacto'=>'test@example.invalid','pedido'=>'FAKE-TEST','observaciones'=>'<script>sin ejecutar</script>'],'test');
    if (!$request['id'] || count($store->all())!==1 || $store->all()[0]['pedido']!=='FAKE-TEST') throw new RuntimeException('No persistió la solicitud');
    $file=(glob($directory.'/*.php') ?: [])[0];
    if (!str_starts_with(file_get_contents($file),'<?php http_response_code(404); exit; ?>')) throw new RuntimeException('Falta protección del archivo');
    for($i=0;$i<9;$i++) $store->create(['contacto'=>'test@example.invalid'],'test');
    try { $store->create(['contacto'=>'test@example.invalid'],'test'); throw new RuntimeException('No limitó solicitudes'); } catch (OverflowException $e) {}
    echo "OK: valida contacto, persiste ID real, lee solicitudes, protege archivo y limita solicitudes. Sin correo ni datos reales.\n";
} finally {
    foreach(glob($directory.'/*.php') ?: [] as $file) unlink($file);
    if(is_dir($directory)) rmdir($directory);
}
