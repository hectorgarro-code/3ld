<?php

declare(strict_types=1);

namespace App\Helpers;

class UploadHelper
{
    /**
     * Devuelve todas las rutas físicas de carpetas uploads posibles en el servidor
     */
    public static function getTargetDirectories(): array
    {
        $primaryDir = __DIR__ . '/../../public/uploads/productos/';
        if (!is_dir($primaryDir)) {
            @mkdir($primaryDir, 0777, true);
        }

        $validDirs = [$primaryDir];

        // Direct formal uploads directory at root level (public_html/uploads/productos/)
        $rootDir = dirname(dirname(dirname(__DIR__))) . '/uploads/productos/';
        if (!is_dir($rootDir) && is_dir(dirname(dirname(dirname(__DIR__))))) {
            @mkdir($rootDir, 0777, true);
        }
        if (is_dir($rootDir) && !in_array($rootDir, $validDirs, true)) {
            $validDirs[] = $rootDir;
        }

        // Check document root ONLY for direct uploads directory
        if (!empty($_SERVER['DOCUMENT_ROOT'])) {
            $docRoot = rtrim($_SERVER['DOCUMENT_ROOT'], '/\\');
            $docUploads = $docRoot . '/uploads/productos/';
            if (is_dir($docRoot) && !is_dir($docUploads)) {
                @mkdir($docUploads, 0777, true);
            }
            if (is_dir($docUploads) && !in_array($docUploads, $validDirs, true)) {
                $validDirs[] = $docUploads;
            }

            // Si estamos dentro del subdominio sistema (ej. public_html/sistema), agregar también el dominio raíz (public_html)
            $parentDocRoot = dirname($docRoot);
            if (is_dir($parentDocRoot) && (basename($docRoot) === 'sistema' || is_dir($parentDocRoot . '/backend'))) {
                $parentUploads1 = $parentDocRoot . '/uploads/productos/';
                $parentUploads2 = $parentDocRoot . '/backend/public/uploads/productos/';
                foreach ([$parentUploads1, $parentUploads2] as $pDir) {
                    if (!is_dir($pDir)) {
                        @mkdir($pDir, 0777, true);
                    }
                    if (is_dir($pDir) && !in_array($pDir, $validDirs, true)) {
                        $validDirs[] = $pDir;
                    }
                }
            }

            // Y si estamos en el dominio raíz, verificar y sincronizar también con el subdominio sistema
            $sistemaDocRoot = $docRoot . '/sistema';
            if (is_dir($sistemaDocRoot)) {
                $subUploads1 = $sistemaDocRoot . '/uploads/productos/';
                $subUploads2 = $sistemaDocRoot . '/backend/public/uploads/productos/';
                foreach ([$subUploads1, $subUploads2] as $sDir) {
                    if (!is_dir($sDir)) {
                        @mkdir($sDir, 0777, true);
                    }
                    if (is_dir($sDir) && !in_array($sDir, $validDirs, true)) {
                        $validDirs[] = $sDir;
                    }
                }
            }
        }

        return $validDirs;
    }

    /**
     * Guarda contenido binario de imagen en TODAS las ubicaciones físicas del servidor
     */
    public static function saveImageBinary(string $filename, string $binaryData): string
    {
        $dirs = self::getTargetDirectories();
        foreach ($dirs as $dir) {
            @file_put_contents($dir . $filename, $binaryData);
        }
        return '/backend/public/uploads/productos/' . $filename;
    }

    /**
     * Procesa una imagen en base64, URL de proxy o URL directa,
     * la guarda físicamente en todas las ubicaciones y devuelve la URL estandarizada.
     */
    public static function processSingleImage(string $img, ?string $customFilename = null): ?string
    {
        $img = trim($img);
        if (empty($img)) {
            return null;
        }

        // Caso 1: Imagen Base64
        if (preg_match('/^data:image\/(\w+);base64,/', $img, $type)) {
            $base64Data = substr($img, strpos($img, ',') + 1);
            $ext = strtolower($type[1]);
            if (!in_array($ext, ['jpg', 'jpeg', 'png', 'webp'])) {
                $ext = 'jpg';
            }
            $decoded = base64_decode($base64Data);
            if ($decoded !== false && strlen($decoded) > 50) {
                if ($customFilename) {
                    $cleanName = preg_replace('/[^a-zA-Z0-9_.-]/', '_', $customFilename);
                    if (!str_ends_with(strtolower($cleanName), '.' . $ext)) {
                        $cleanName = pathinfo($cleanName, PATHINFO_FILENAME) . '.' . $ext;
                    }
                    $fileName = $cleanName;
                } else {
                    $fileName = uniqid('prd_') . '.' . $ext;
                }
                return self::saveImageBinary($fileName, $decoded);
            }
        }

        // Caso 2: Imagen desde Proxy MakerWorld
        if (str_contains($img, 'proxy-image')) {
            $parsed = parse_url($img);
            parse_str($parsed['query'] ?? '', $qParams);
            if (!empty($qParams['url'])) {
                $rawUrl = $qParams['url'];
                $filename = 'mw_' . md5($rawUrl) . '.jpg';
                
                // Verificar si ya existe en alguna carpeta
                $dirs = self::getTargetDirectories();
                foreach ($dirs as $d) {
                    if (file_exists($d . $filename) && filesize($d . $filename) > 500) {
                        return '/backend/public/uploads/productos/' . $filename;
                    }
                }

                $ch = curl_init();
                curl_setopt($ch, CURLOPT_URL, $rawUrl);
                curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
                curl_setopt($ch, CURLOPT_FOLLOWLOCATION, true);
                curl_setopt($ch, CURLOPT_USERAGENT, 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36');
                curl_setopt($ch, CURLOPT_TIMEOUT, 15);
                curl_setopt($ch, CURLOPT_SSL_VERIFYPEER, false);
                $data = curl_exec($ch);
                curl_close($ch);

                if (!empty($data) && strlen($data) > 500) {
                    return self::saveImageBinary($filename, $data);
                }
            }
        }

        // Caso 3: URL existente
        return $img;
    }

    /**
     * Sincroniza retroactivamente todas las fotos existentes entre todas las carpetas conocidas
     */
    public static function syncAllExistingFiles(): void
    {
        try {
            $dirs = self::getTargetDirectories();
            if (count($dirs) < 2) return;

            $allFiles = [];
            foreach ($dirs as $dir) {
                if (is_dir($dir)) {
                    $files = glob($dir . '*.*');
                    if ($files) {
                        foreach ($files as $f) {
                            $basename = basename($f);
                            if (!isset($allFiles[$basename]) && filesize($f) > 50) {
                                $allFiles[$basename] = $f;
                            }
                        }
                    }
                }
            }

            foreach ($allFiles as $basename => $sourceFile) {
                $content = @file_get_contents($sourceFile);
                if ($content !== false && !empty($content)) {
                    foreach ($dirs as $targetDir) {
                        $targetPath = $targetDir . $basename;
                        if (!file_exists($targetPath) || filesize($targetPath) === 0) {
                            @file_put_contents($targetPath, $content);
                        }
                    }
                }
            }
        } catch (\Throwable $e) {
            // Ignorar errores silenciosos en sync
        }
    }
}
