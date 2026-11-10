<?php
declare(strict_types=1);
namespace App\Services;

/** Secreto sólo en servidor; nunca se devuelve el token al navegador ni se guarda en git. */
final class MetaTrackingConfig {
    public const PIXEL_ID='612576675192830';
    public function __construct(private string $path=__DIR__.'/../../public/uploads/.3ld-private/meta-capi.php') {}
    public function read(): array {
        if(!is_file($this->path))return [];
        $data=require $this->path;
        return is_array($data)?$data:[];
    }
    public function save(string $token,bool $enabled): void {
        if(!preg_match('/^[a-zA-Z0-9|_.-]{20,4096}$/D',$token))throw new \InvalidArgumentException('Formato de token inválido');
        $dir=dirname($this->path);
        if(!is_dir($dir) && !mkdir($dir,0700,true) && !is_dir($dir))throw new \RuntimeException('No se pudo crear el directorio privado');
        if(file_put_contents($dir.'/.htaccess', "Options -Indexes\nOrder deny,allow\nDeny from all\n", LOCK_EX)===false)throw new \RuntimeException('No se pudo proteger el directorio privado');
        if(!is_writable($dir))throw new \RuntimeException('No se pudo guardar la configuración privada');
        $temp=tempnam($dir,'.meta-');
        if($temp===false)throw new \RuntimeException('No se pudo guardar la configuración privada');
        try {
            chmod($temp,0600);
            $json='<?php return '.var_export(['pixel_id'=>self::PIXEL_ID,'access_token'=>$token,'enabled'=>$enabled,'authorized_at'=>gmdate('c')],true).';';
            if(file_put_contents($temp,$json,LOCK_EX)===false||!rename($temp,$this->path))throw new \RuntimeException('No se pudo guardar la configuración privada');
            chmod($this->path,0600);
        } finally { if(is_file($temp))unlink($temp); }
    }
}
