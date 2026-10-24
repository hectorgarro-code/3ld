<?php
declare(strict_types=1);
namespace App\Services;

/** Archivos privados persistentes; no depende de migraciones o del correo para registrar. */
final class ReturnRequests
{
    private const PREFIX = "<?php http_response_code(404); exit; ?>\n";
    public function __construct(private string $directory = __DIR__ . '/../../var/return-requests') {}
    public function create(array $body, string $ip): array {
        $contact = $body['contacto'] ?? '';
        if (!is_string($contact) || !trim($contact) || strlen($contact) > 200) throw new \InvalidArgumentException('Ingresá un email o teléfono de contacto.');
        $contact = trim($contact);
        if (!filter_var($contact,FILTER_VALIDATE_EMAIL) && !preg_match('/^[+()0-9 .-]{6,30}$/D',$contact)) throw new \InvalidArgumentException('Revisá el email o teléfono.');
        $order = $body['pedido'] ?? ''; $reason = $body['observaciones'] ?? '';
        if (!is_string($order) || !is_string($reason) || strlen($order)>80 || strlen($reason)>2000) throw new \InvalidArgumentException('Revisá los datos de la solicitud.');
        if (!empty($body['website'])) throw new \InvalidArgumentException('No se pudo procesar la solicitud.');
        if (!is_dir($this->directory) && !mkdir($this->directory,0750,true) && !is_dir($this->directory)) throw new \RuntimeException('No se pudo registrar la solicitud.');
        $bucket = substr(hash('sha256',$ip),0,20) . '-' . gmdate('YmdH');
        if (count(glob($this->directory . '/' . $bucket . '-*.php') ?: []) >= 10) throw new \OverflowException('Hay varias solicitudes recientes. Contactanos por email o WhatsApp.');
        $id = '3LD-DEV-' . gmdate('Ymd') . '-' . strtoupper(bin2hex(random_bytes(6)));
        $request = ['id'=>$id,'fecha'=>gmdate('c'),'pedido'=>trim($order),'contacto'=>$contact,'observaciones'=>trim($reason),'estado'=>'pendiente'];
        $file = $this->directory . '/' . $bucket . '-' . $id . '.php';
        $handle = fopen($file,'x');
        if (!$handle) throw new \RuntimeException('No se pudo registrar la solicitud.');
        try {
            $content = self::PREFIX . json_encode($request, JSON_UNESCAPED_UNICODE|JSON_THROW_ON_ERROR);
            if (fwrite($handle,$content) !== strlen($content)) throw new \RuntimeException('No se pudo registrar la solicitud completa.');
        } finally { fclose($handle); }
        chmod($file,0600);
        return $request;
    }
    public function all(): array {
        $requests=[];
        foreach (glob($this->directory.'/*.php') ?: [] as $file) {
            $content = file_get_contents($file);
            if (!str_starts_with($content,self::PREFIX)) continue;
            $request = json_decode(substr($content,strlen(self::PREFIX)),true);
            if (is_array($request) && isset($request['id'])) $requests[]=$request;
        }
        usort($requests,static fn($a,$b)=>strcmp($b['fecha'],$a['fecha']));
        return $requests;
    }
}
