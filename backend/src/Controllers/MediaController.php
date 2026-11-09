<?php

declare(strict_types=1);

namespace App\Controllers;

use App\Helpers\UploadHelper;

class MediaController
{
    private \PDO $db;

    public function __construct(\PDO $db)
    {
        $this->db = $db;
    }

    /**
     * Lista todas las imágenes almacenadas en las carpetas de uploads
     */
    public function index($req, $res)
    {
        $dirs = UploadHelper::getTargetDirectories();
        $primaryDir = $dirs[0] ?? null;

        if (!$primaryDir || !is_dir($primaryDir)) {
            $res->getBody()->write(json_encode([
                'success' => true,
                'data' => []
            ]));
            return $res->withHeader('Content-Type', 'application/json');
        }

        $files = glob($primaryDir . '*.*');
        $mediaList = [];

        if ($files) {
            foreach ($files as $filePath) {
                $basename = basename($filePath);
                $ext = strtolower(pathinfo($basename, PATHINFO_EXTENSION));
                if (!in_array($ext, ['jpg', 'jpeg', 'png', 'webp', 'gif', 'svg'])) {
                    continue;
                }

                $sizeBytes = @filesize($filePath) ?: 0;
                $modifiedAt = @filemtime($filePath) ? date('Y-m-d H:i:s', filemtime($filePath)) : null;
                $dimensions = null;
                if (in_array($ext, ['jpg', 'jpeg', 'png', 'webp'])) {
                    $imageInfo = @getimagesize($filePath);
                    if ($imageInfo) {
                        $dimensions = [
                            'width' => $imageInfo[0],
                            'height' => $imageInfo[1]
                        ];
                    }
                }

                $mediaList[] = [
                    'filename' => $basename,
                    'url' => '/backend/public/uploads/productos/' . $basename,
                    'size_bytes' => $sizeBytes,
                    'size_formatted' => $this->formatSize($sizeBytes),
                    'format' => $ext,
                    'is_webp' => ($ext === 'webp'),
                    'dimensions' => $dimensions,
                    'modified_at' => $modifiedAt,
                ];
            }
        }

        // Ordenar más recientes primero
        usort($mediaList, function ($a, $b) {
            return strcmp($b['modified_at'] ?? '', $a['modified_at'] ?? '');
        });

        $res->getBody()->write(json_encode([
            'success' => true,
            'total' => count($mediaList),
            'data' => $mediaList
        ]));
        return $res->withHeader('Content-Type', 'application/json');
    }

    /**
     * Sube o guarda una nueva imagen (base64 o multipart form)
     */
    public function upload($req, $res)
    {
        $body = $req->getParsedBody() ?? [];
        $imageData = $body['image'] ?? $body['image_base64'] ?? null;
        $customName = $body['filename'] ?? null;

        if (empty($imageData)) {
            $uploadedFiles = $req->getUploadedFiles();
            if (!empty($uploadedFiles['file'])) {
                $file = $uploadedFiles['file'];
                if ($file->getError() === UPLOAD_ERR_OK) {
                    $contents = (string)$file->getStream();
                    if (strlen($contents) < 12) {
                        $res->getBody()->write(json_encode([
                            'success' => false,
                            'message' => 'El archivo está vacío o dañado'
                        ]));
                        return $res->withStatus(400)->withHeader('Content-Type', 'application/json');
                    }

                    // Validación estricta por contenido binario real (MIME type)
                    $finfo = new \finfo(FILEINFO_MIME_TYPE);
                    $mime = $finfo->buffer($contents) ?: '';
                    $allowedMimes = [
                        'image/jpeg' => 'jpg',
                        'image/png'  => 'png',
                        'image/webp' => 'webp',
                        'image/gif'  => 'gif',
                    ];

                    if (!isset($allowedMimes[$mime])) {
                        $res->getBody()->write(json_encode([
                            'success' => false,
                            'message' => 'Contenido de archivo no permitido. Solo se admiten imágenes JPG, PNG, WEBP o GIF reales'
                        ]));
                        return $res->withStatus(400)->withHeader('Content-Type', 'application/json');
                    }

                    $ext = $allowedMimes[$mime];
                    $filename = ($customName ? preg_replace('/[^a-zA-Z0-9_-]/', '_', $customName) : uniqid('media_')) . '.' . $ext;
                    $url = UploadHelper::saveImageBinary($filename, $contents);
                    
                    $res->getBody()->write(json_encode([
                        'success' => true,
                        'message' => 'Imagen cargada correctamente',
                        'data' => [
                            'filename' => $filename,
                            'url' => $url
                        ]
                    ]));
                    return $res->withHeader('Content-Type', 'application/json');
                }
            }
        }

        if (!empty($imageData)) {
            $savedUrl = UploadHelper::processSingleImage($imageData, $customName);
            if ($savedUrl) {
                $basename = basename($savedUrl);

                // Si se especificó un nombre original a reemplazar, actualizar productos en BD
                $origFilename = $body['original_filename'] ?? null;
                if (!empty($origFilename) && $origFilename !== $basename) {
                    $origBasename = basename($origFilename);
                    try {
                        $stmt1 = $this->db->prepare("UPDATE productos SET imagen_url = REPLACE(imagen_url, :orig, :new) WHERE imagen_url LIKE :like");
                        $stmt1->execute([
                            'orig' => $origBasename,
                            'new' => $basename,
                            'like' => '%' . $origBasename . '%'
                        ]);

                        $stmt2 = $this->db->prepare("UPDATE productos SET imagenes = REPLACE(imagenes, :orig, :new) WHERE imagenes LIKE :like");
                        $stmt2->execute([
                            'orig' => $origBasename,
                            'new' => $basename,
                            'like' => '%' . $origBasename . '%'
                        ]);

                        if (!empty($body['delete_original'])) {
                            $dirs = UploadHelper::getTargetDirectories();
                            foreach ($dirs as $dir) {
                                if (file_exists($dir . $origBasename)) {
                                    @unlink($dir . $origBasename);
                                }
                            }
                        }
                    } catch (\Throwable $e) {
                        // Continuar si la BD no requiere actualización
                    }
                }

                $res->getBody()->write(json_encode([
                    'success' => true,
                    'message' => 'Imagen procesada y guardada correctamente',
                    'data' => [
                        'filename' => $basename,
                        'url' => $savedUrl
                    ]
                ]));
                return $res->withHeader('Content-Type', 'application/json');
            }
        }

        $res->getBody()->write(json_encode([
            'success' => false,
            'message' => 'No se recibió ninguna imagen válida'
        ]));
        return $res->withStatus(400)->withHeader('Content-Type', 'application/json');
    }

    /**
     * Elimina un archivo de imagen de todas las carpetas físicas
     */
    public function delete($req, $res)
    {
        $body = $req->getParsedBody() ?? [];
        $filename = $body['filename'] ?? null;

        if (empty($filename)) {
            $res->getBody()->write(json_encode([
                'success' => false,
                'message' => 'Especificar nombre de archivo'
            ]));
            return $res->withStatus(400)->withHeader('Content-Type', 'application/json');
        }

        $safeFilename = basename($filename);
        $dirs = UploadHelper::getTargetDirectories();
        $deleted = 0;

        foreach ($dirs as $dir) {
            $target = $dir . $safeFilename;
            if (file_exists($target)) {
                if (@unlink($target)) {
                    $deleted++;
                }
            }
        }

        $res->getBody()->write(json_encode([
            'success' => true,
            'message' => "Archivo {$safeFilename} eliminado",
            'deleted_locations' => $deleted
        ]));
        return $res->withHeader('Content-Type', 'application/json');
    }

    private function formatSize(int $bytes): string
    {
        if ($bytes >= 1048576) {
            return number_format($bytes / 1048576, 2) . ' MB';
        }
        if ($bytes >= 1024) {
            return number_format($bytes / 1024, 1) . ' KB';
        }
        return $bytes . ' B';
    }

    /**
     * POST /api/v1/media/batch-optimize
     * Optimiza imágenes existentes a formato WebP directamente en el servidor usando GD
     */
    public function batchOptimize($req, $res)
    {
        $body = $req->getParsedBody() ?? [];
        $filenames = $body['filenames'] ?? [];
        $quality = isset($body['quality']) ? max(10, min(100, (int)$body['quality'])) : 80;
        $maxWidth = isset($body['max_width']) ? max(300, min(2400, (int)$body['max_width'])) : 1200;
        $deleteOriginal = !empty($body['delete_original']);

        $dirs = UploadHelper::getTargetDirectories();
        $primaryDir = $dirs[0] ?? null;

        if (!$primaryDir || !is_dir($primaryDir)) {
            $res->getBody()->write(json_encode(['success' => false, 'message' => 'Directorio de uploads no encontrado']));
            return $res->withStatus(500)->withHeader('Content-Type', 'application/json');
        }

        if (!extension_loaded('gd') || !function_exists('imagewebp')) {
            $res->getBody()->write(json_encode(['success' => false, 'message' => 'La extensión PHP GD con soporte WebP no está disponible']));
            return $res->withStatus(500)->withHeader('Content-Type', 'application/json');
        }

        // Si no se especificaron filenames, procesar todos los archivos que no sean webp
        if (empty($filenames)) {
            $files = glob($primaryDir . '*.*');
            $filenames = [];
            foreach ($files as $f) {
                $ext = strtolower(pathinfo($f, PATHINFO_EXTENSION));
                if (in_array($ext, ['jpg', 'jpeg', 'png']) && !str_ends_with($f, '.webp')) {
                    $filenames[] = basename($f);
                }
            }
        }

        $limit = isset($body['limit']) ? (int)$body['limit'] : 25;
        $targets = array_slice($filenames, 0, $limit);

        $processed = 0;
        $errors = [];

        foreach ($targets as $filename) {
            $basename = basename($filename);
            $ext = strtolower(pathinfo($basename, PATHINFO_EXTENSION));
            if (!in_array($ext, ['jpg', 'jpeg', 'png'])) {
                continue;
            }

            $sourcePath = $primaryDir . $basename;
            if (!file_exists($sourcePath)) {
                continue;
            }

            try {
                $info = @getimagesize($sourcePath);
                if (!$info) {
                    continue;
                }

                $srcW = $info[0];
                $srcH = $info[1];
                $mime = $info['mime'];

                $srcImg = null;
                switch ($mime) {
                    case 'image/jpeg':
                        $srcImg = @imagecreatefromjpeg($sourcePath);
                        break;
                    case 'image/png':
                        $srcImg = @imagecreatefrompng($sourcePath);
                        break;
                }

                if (!$srcImg) {
                    continue;
                }

                // Calcular dimensiones
                $dstW = $srcW;
                $dstH = $srcH;
                if ($maxWidth > 0 && $dstW > $maxWidth) {
                    $dstH = (int)round(($maxWidth / $dstW) * $dstH);
                    $dstW = $maxWidth;
                }

                $dstImg = imagecreatetruecolor($dstW, $dstH);
                imagealphablending($dstImg, false);
                imagesavealpha($dstImg, true);

                imagecopyresampled($dstImg, $srcImg, 0, 0, 0, 0, $dstW, $dstH, $srcW, $srcH);

                $cleanBase = pathinfo($basename, PATHINFO_FILENAME);
                $webpName = $cleanBase . '.webp';

                // Guardar en todas las carpetas físicas
                foreach ($dirs as $dir) {
                    @imagewebp($dstImg, $dir . $webpName, $quality);
                }

                imagedestroy($srcImg);
                imagedestroy($dstImg);

                // Actualizar BD: reemplazar $basename por $webpName en productos
                if ($basename !== $webpName) {
                    try {
                        $stmt1 = $this->db->prepare("UPDATE productos SET imagen_url = REPLACE(imagen_url, :orig, :new) WHERE imagen_url LIKE :like");
                        $stmt1->execute([
                            'orig' => $basename,
                            'new' => $webpName,
                            'like' => '%' . $basename . '%'
                        ]);

                        $stmt2 = $this->db->prepare("UPDATE productos SET imagenes = REPLACE(imagenes, :orig, :new) WHERE imagenes LIKE :like");
                        $stmt2->execute([
                            'orig' => $basename,
                            'new' => $webpName,
                            'like' => '%' . $basename . '%'
                        ]);

                        if ($deleteOriginal && file_exists($primaryDir . $webpName) && filesize($primaryDir . $webpName) > 100) {
                            foreach ($dirs as $dir) {
                                if (file_exists($dir . $basename)) {
                                    @unlink($dir . $basename);
                                }
                            }
                        }
                    } catch (\Throwable $e) {}
                }

                $processed++;
            } catch (\Throwable $e) {
                $errors[] = $basename . ': ' . $e->getMessage();
            }
        }

        $res->getBody()->write(json_encode([
            'success' => true,
            'processed' => $processed,
            'total_queued' => count($filenames),
            'remaining' => count($filenames) - $processed,
            'errors' => $errors
        ]));
        return $res->withHeader('Content-Type', 'application/json');
    }
}
