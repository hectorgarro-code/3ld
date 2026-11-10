<?php
declare(strict_types=1);
namespace App\Services;

/** Secreto sólo en servidor; nunca se devuelve el token al navegador ni se guarda en git. */
final class MetaTrackingConfig {
    public const PIXEL_ID='612576675192830';
    private string $path;
    private ?string $fallbackPath=null;
    public function __construct(?string $path=null,?string $applicationRoot=null) {
        if($path!==null){$this->path=$path;return;}
        $applicationRoot=$applicationRoot??dirname(__DIR__,3);
        $sharedRoot=$applicationRoot;
        if(basename($applicationRoot)==='sistema' && is_dir(dirname($applicationRoot).'/backend/src'))$sharedRoot=dirname($applicationRoot);
        $this->path=$sharedRoot.'/backend/public/uploads/.3ld-private/meta-capi.php';
        if(is_dir($sharedRoot.'/sistema/backend/src'))$this->fallbackPath=$sharedRoot.'/sistema/backend/public/uploads/.3ld-private/meta-capi.php';
    }
    public function sharedInstallation(): bool {return $this->fallbackPath!==null;}

    public function read(): array {
        foreach(array_unique(array_filter([$this->path,$this->fallbackPath])) as $file){
            if(!is_file($file))continue;
            $data=require $file;
            if(is_array($data))return $data;
        }
        return [];
    }
    public function save(string $token,bool $enabled): void {
        if(!preg_match('/^[a-zA-Z0-9|_.-]{20,4096}$/D',$token))throw new \InvalidArgumentException('Formato de token inválido');
        $dir=dirname($this->path);
        if(!is_dir($dir) && !mkdir($dir,0700,true) && !is_dir($dir))throw new \RuntimeException('No se pudo crear el directorio privado');
        if(file_put_contents($dir.'/.htaccess', "Options -Indexes\nOrder deny,allow\nDeny from all\n", LOCK_EX)===false)throw new \RuntimeException('No se pudo proteger el directorio privado');
        if(!is_writable($dir))throw new \RuntimeException('No se pudo guardar la configuración privada');
        $initial=tempnam($dir,'.meta-');
        if($initial===false)throw new \RuntimeException('No se pudo guardar la configuración privada');
        $temp=$initial.'.php';
        if(!rename($initial,$temp)){unlink($initial);throw new \RuntimeException('No se pudo guardar la configuración privada');}
        try {
            chmod($temp,0600);
            $json='<?php return '.var_export(['pixel_id'=>self::PIXEL_ID,'access_token'=>$token,'enabled'=>$enabled,'authorized_at'=>gmdate('c')],true).';';
            if(file_put_contents($temp,$json,LOCK_EX)===false||!rename($temp,$this->path))throw new \RuntimeException('No se pudo guardar la configuración privada');
            chmod($this->path,0600);
            if(function_exists('opcache_invalidate'))@opcache_invalidate($this->path,true);
        } finally { if(is_file($temp))unlink($temp); }
    }
}
