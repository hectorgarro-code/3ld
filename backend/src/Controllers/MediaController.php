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
                    $ext = strtolower(pathinfo($file->getClientFilename(), PATHINFO_EXTENSION)) ?: 'jpg';
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
            $savedUrl = UploadHelper::processSingleImage($imageData);
            if ($savedUrl) {
                $basename = basename($savedUrl);
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
}
