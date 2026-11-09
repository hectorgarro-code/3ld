<?php

declare(strict_types=1);

namespace App\Controllers;

use App\Helpers\UploadHelper;
use Psr\Http\Message\ResponseInterface;
use Psr\Http\Message\ServerRequestInterface;

class ThumbnailController
{
    /**
     * GET /api/v1/thumbnail
     * Query params:
     *   url: string (URL o ruta relativa de la imagen)
     *   w: int (ancho deseado, ej. 128 o 256, default 160)
     */
    public function getThumbnail(ServerRequestInterface $request, ResponseInterface $response): ResponseInterface
    {
        $params = $request->getQueryParams();
        $rawUrl = trim((string)($params['url'] ?? ''));
        $width  = max(32, min(640, (int)($params['w'] ?? 160)));

        if (empty($rawUrl)) {
            return $response->withStatus(400);
        }

        // 1. Si es una imagen de MakerWorld, redirigir al CDN OSS nativo con WebP ultra-liviano (~2 KB)
        if (str_contains($rawUrl, 'makerworld.bblmw.com')) {
            $cleanUrl = preg_replace('/(\?|&)x-oss-process=[^&]*/', '', $rawUrl);
            $sep = str_contains($cleanUrl, '?') ? '&' : '?';
            $resizedUrl = $cleanUrl . $sep . "x-oss-process=image/resize,w_{$width}/format,webp";
            return $response
                ->withHeader('Location', $resizedUrl)
                ->withHeader('Cache-Control', 'public, max-age=31536000, immutable')
                ->withStatus(302);
        }

        // Si es un data URI o blob, no se procesa
        if (str_starts_with($rawUrl, 'data:') || str_starts_with($rawUrl, 'blob:')) {
            return $response->withStatus(400);
        }

        // 2. Extraer el nombre del archivo de la ruta/URL
        $parsed = parse_url($rawUrl);
        $path   = $parsed['path'] ?? $rawUrl;
        $basename = basename($path);

        if (empty($basename) || !preg_match('/\.(jpg|jpeg|png|webp|gif)$/i', $basename)) {
            if (str_starts_with($rawUrl, 'http://') || str_starts_with($rawUrl, 'https://')) {
                return $response->withHeader('Location', $rawUrl)->withStatus(302);
            }
            return $response->withStatus(404);
        }

        // 3. Directorio de cache de thumbnails
        $thumbDir = __DIR__ . '/../../public/uploads/thumbs/';
        if (!is_dir($thumbDir)) {
            @mkdir($thumbDir, 0777, true);
        }

        $hash = md5($basename);
        $thumbWebp = "thumb_{$width}_{$hash}.webp";
        $thumbWebpPath = $thumbDir . $thumbWebp;
        $thumbJpg = "thumb_{$width}_{$hash}.jpg";
        $thumbJpgPath = $thumbDir . $thumbJpg;

        // Si ya existe el thumbnail WebP cacheado, servirlo directamente
        if (file_exists($thumbWebpPath) && filesize($thumbWebpPath) > 80) {
            return $this->serveStaticImage($request, $response, $thumbWebpPath, 'image/webp');
        }

        // Si ya existe el thumbnail JPG cacheado, servirlo directamente
        if (file_exists($thumbJpgPath) && filesize($thumbJpgPath) > 80) {
            return $this->serveStaticImage($request, $response, $thumbJpgPath, 'image/jpeg');
        }

        // 4. Localizar el archivo fuente original
        $sourcePath = null;
        $targetDirs = UploadHelper::getTargetDirectories();
        foreach ($targetDirs as $dir) {
            if (file_exists($dir . $basename)) {
                $sourcePath = $dir . $basename;
                break;
            }
        }

        if (!$sourcePath && !empty($_SERVER['DOCUMENT_ROOT'])) {
            $candidate = rtrim($_SERVER['DOCUMENT_ROOT'], '/\\') . '/' . ltrim($path, '/\\');
            if (file_exists($candidate)) {
                $sourcePath = $candidate;
            }
        }

        if (!$sourcePath || !file_exists($sourcePath)) {
            if (str_starts_with($rawUrl, 'http://') || str_starts_with($rawUrl, 'https://')) {
                return $response->withHeader('Location', $rawUrl)->withStatus(302);
            }
            return $response->withStatus(404);
        }

        // 5. Generar thumbnail optimizado con GD
        if (extension_loaded('gd')) {
            try {
                $info = @getimagesize($sourcePath);
                if ($info && $info[0] > 0 && $info[1] > 0) {
                    $origW = (int) $info[0];
                    $origH = (int) $info[1];
                    $mime  = (string) ($info['mime'] ?? '');

                    $srcImg = match ($mime) {
                        'image/jpeg' => @imagecreatefromjpeg($sourcePath),
                        'image/png'  => @imagecreatefrompng($sourcePath),
                        'image/webp' => function_exists('imagecreatefromwebp') ? @imagecreatefromwebp($sourcePath) : null,
                        default      => null,
                    };

                    if ($srcImg) {
                        // Calcular altura manteniendo el aspecto
                        $targetH = max(1, (int) round(($origH * $width) / $origW));
                        $dstImg  = imagecreatetruecolor($width, $targetH);

                        if ($mime === 'image/png' || $mime === 'image/webp') {
                            imagealphablending($dstImg, false);
                            imagesavealpha($dstImg, true);
                            $transparent = imagecolorallocatealpha($dstImg, 255, 255, 255, 127);
                            imagefilledrectangle($dstImg, 0, 0, $width, $targetH, $transparent);
                        }

                        imagecopyresampled($dstImg, $srcImg, 0, 0, 0, 0, $width, $targetH, $origW, $origH);

                        if (function_exists('imagewebp')) {
                            @imagewebp($dstImg, $thumbWebpPath, 78);
                            imagedestroy($dstImg);
                            imagedestroy($srcImg);
                            if (file_exists($thumbWebpPath) && filesize($thumbWebpPath) > 80) {
                                return $this->serveStaticImage($request, $response, $thumbWebpPath, 'image/webp');
                            }
                        } else {
                            @imagejpeg($dstImg, $thumbJpgPath, 78);
                            imagedestroy($dstImg);
                            imagedestroy($srcImg);
                            if (file_exists($thumbJpgPath) && filesize($thumbJpgPath) > 80) {
                                return $this->serveStaticImage($request, $response, $thumbJpgPath, 'image/jpeg');
                            }
                        }
                    }
                }
            } catch (\Throwable $e) {
                // Fallback silencioso
            }
        }

        // 6. Fallback: servir imagen original
        $ext = strtolower(pathinfo($sourcePath, PATHINFO_EXTENSION));
        $mime = match ($ext) {
            'png'  => 'image/png',
            'webp' => 'image/webp',
            default => 'image/jpeg',
        };

        return $this->serveStaticImage($request, $response, $sourcePath, $mime, 86400);
    }

    private function serveStaticImage(
        ServerRequestInterface $request,
        ResponseInterface $response,
        string $filePath,
        string $contentType,
        int $maxAge = 31536000
    ): ResponseInterface {
        $etag = '"' . md5((string) @filemtime($filePath) . '_' . (string) @filesize($filePath)) . '"';
        if ($request->getHeaderLine('If-None-Match') === $etag) {
            return $response->withStatus(304);
        }

        $stream = fopen($filePath, 'rb');
        return $response
            ->withHeader('Content-Type', $contentType)
            ->withHeader('Cache-Control', "public, max-age={$maxAge}, immutable")
            ->withHeader('ETag', $etag)
            ->withHeader('Access-Control-Allow-Origin', '*')
            ->withBody(new \Slim\Psr7\Stream($stream));
    }
}

