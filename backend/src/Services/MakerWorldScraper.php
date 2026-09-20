<?php

declare(strict_types=1);

namespace App\Services;

use RuntimeException;

class MakerWorldScraper
{
    /**
     * Extrae información y descarga fotos de una URL de MakerWorld guardándolas localmente
     */
    public function scrape(string $url): array
    {
        if (filter_var($url, FILTER_VALIDATE_URL) === false || !str_contains($url, 'makerworld.com')) {
            throw new RuntimeException('La URL provista no es un enlace válido de MakerWorld.');
        }

        $modelId = '';
        if (preg_match('/models\/(\d+)/i', $url, $matches)) {
            $modelId = $matches[1];
        }

        $slugTitle = '';
        if (preg_match('/models\/\d+-([a-z0-9-]+)/i', $url, $matches)) {
            $slugTitle = ucwords(str_replace('-', ' ', $matches[1]));
        }

        $title          = '';
        $description    = '';
        $rawImages      = [];
        $pesoGramos     = 0;
        $horasImpresion = 0.0;

        // 1. Intentar consultar la API interna de MakerWorld design-service
        if (!empty($modelId)) {
            $apiData = $this->fetchDesignApi($modelId);
            if (!empty($apiData)) {
                $title = trim((string)($apiData['title'] ?? $apiData['titleTranslated'] ?? ''));
                if (!empty($apiData['summary'])) {
                    $description = trim(strip_tags((string)$apiData['summary']));
                }

                if (!empty($apiData['instances']) && is_array($apiData['instances'])) {
                    $selectedInst = $apiData['instances'][0];
                    foreach ($apiData['instances'] as $inst) {
                        if (!empty($inst['isDefault'])) {
                            $selectedInst = $inst;
                            break;
                        }
                    }

                    if (isset($selectedInst['weight']) && is_numeric($selectedInst['weight'])) {
                        $pesoGramos = (int) $selectedInst['weight'];
                    }

                    if (isset($selectedInst['prediction']) && is_numeric($selectedInst['prediction'])) {
                        $horasImpresion = round(((float) $selectedInst['prediction']) / 3600.0, 2);
                    }
                }

                $this->collectAllImagesFromApi($apiData, $rawImages);
            }
        }

        // 2. Scraping HTML para obtener título/descripción faltantes o más fotos de la página
        if (empty($title) || count($rawImages) < 5) {
            $html = '';
            try {
                $html = $this->fetchUrl($url);
            } catch (\Throwable $e) {
                // Ignore error if blocked
            }

            if (!empty($html)) {
                if (empty($title)) {
                    if (preg_match('/<meta\s+property=["\']og:title["\']\s+content=["\'](.*?)["\']/i', $html, $matches)) {
                        $title = html_entity_decode($matches[1], ENT_QUOTES, 'UTF-8');
                    } elseif (preg_match('/<title>(.*?)<\/title>/i', $html, $matches)) {
                        $title = html_entity_decode($matches[1], ENT_QUOTES, 'UTF-8');
                    }
                    $title = str_replace([' | MakerWorld', ' - MakerWorld'], '', $title);
                }

                if (empty($description)) {
                    if (preg_match('/<meta\s+property=["\']og:description["\']\s+content=["\'](.*?)["\']/i', $html, $matches)) {
                        $description = html_entity_decode($matches[1], ENT_QUOTES, 'UTF-8');
                    } elseif (preg_match('/<meta\s+name=["\']description["\']\s+content=["\'](.*?)["\']/i', $html, $matches)) {
                        $description = html_entity_decode($matches[1], ENT_QUOTES, 'UTF-8');
                    }
                }

                preg_match_all('/(?:https?:)?\/\/[^\s"\'\`]+?\.(?:png|jpg|jpeg|webp)(?:\?[^\s"\'\`]*)?/i', $html, $allMatches);
                foreach ($allMatches[0] as $imgUrl) {
                    if (str_starts_with($imgUrl, '//')) {
                        $imgUrl = 'https:' . $imgUrl;
                    }
                    if (
                        (str_contains($imgUrl, 'makerworld') || str_contains($imgUrl, 'bblmw') || str_contains($imgUrl, 'bambulab') || str_contains($imgUrl, 'cloudfront')) &&
                        !str_contains($imgUrl, 'avatar') && !str_contains($imgUrl, 'icon') && !str_contains($imgUrl, 'logo') && !str_contains($imgUrl, 'plate_')
                    ) {
                        $rawImages[] = $imgUrl;
                    }
                }
            }
        }

        if (empty($title)) {
            $title = !empty($slugTitle) ? $slugTitle : 'Modelo 3D MakerWorld';
        }

        if (empty($description)) {
            $description = 'Modelo 3D descargado de MakerWorld. Diseñado para fabricación aditiva con acabados de alta calidad.';
        }

        // Filtrar imágenes repetidas e ignorar diagramas de impresoras (plate_X.png)
        $uniqueRaw = [];
        foreach ($rawImages as $img) {
            if (!str_contains($img, 'plate_') && !str_contains($img, 'us.png') && !in_array($img, $uniqueRaw, true)) {
                $uniqueRaw[] = $img;
            }
        }

        // 3. Generar URLs a través del proxy de imágenes del sistema (hasta 10 fotos)
        $proxyImages = [];
        foreach (array_slice($uniqueRaw, 0, 10) as $remoteUrl) {
            $proxyImages[] = '/api/v1/ai/proxy-image?url=' . urlencode($remoteUrl);
        }

        if (empty($proxyImages)) {
            $proxyImages[] = 'https://images.unsplash.com/photo-1581092160607-ee22621dd758?w=600&auto=format&fit=crop&q=80';
        }

        return [
            'raw_title'       => trim($title),
            'raw_description' => trim($description),
            'images'          => array_values(array_unique($proxyImages)),
            'peso_gramos'     => $pesoGramos,
            'horas_impresion' => $horasImpresion,
        ];
    }

    /**
     * Consulta la API pública de MakerWorld design-service
     */
    private function fetchDesignApi(string $modelId): ?array
    {
        $ep = "https://makerworld.com/api/v1/design-service/design/{$modelId}";
        $ch = curl_init();
        curl_setopt($ch, CURLOPT_URL, $ep);
        curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
        curl_setopt($ch, CURLOPT_FOLLOWLOCATION, true);
        curl_setopt($ch, CURLOPT_HTTPHEADER, [
            'User-Agent: Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
            'Accept: application/json',
            'Referer: https://makerworld.com/es/models/' . $modelId,
        ]);
        curl_setopt($ch, CURLOPT_TIMEOUT, 10);
        curl_setopt($ch, CURLOPT_SSL_VERIFYPEER, false);

        $response = curl_exec($ch);
        $httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
        curl_close($ch);

        if ($httpCode === 200 && !empty($response)) {
            $data = json_decode($response, true);
            return is_array($data) ? $data : null;
        }

        return null;
    }

    /**
     * Descarga una imagen remota y la guarda en public/uploads/productos/
     */
    private function downloadImageToServer(string $imgUrl): ?string
    {
        try {
            if (str_starts_with($imgUrl, '//')) {
                $imgUrl = 'https:' . $imgUrl;
            } elseif (!str_starts_with($imgUrl, 'http')) {
                $imgUrl = 'https://' . ltrim($imgUrl, '/');
            }

            $uploadDir = __DIR__ . '/../../public/uploads/productos/';
            if (!is_dir($uploadDir)) {
                mkdir($uploadDir, 0777, true);
            }

            $parsedPath = parse_url($imgUrl, PHP_URL_PATH) ?? '';
            $ext = strtolower(pathinfo($parsedPath, PATHINFO_EXTENSION));
            if (empty($ext) || !in_array($ext, ['jpg', 'jpeg', 'png', 'webp'])) {
                $ext = 'jpg';
            }

            $filename = 'mw_' . md5($imgUrl) . '.' . $ext;
            $destPath = $uploadDir . $filename;
            $publicUrl = '/uploads/productos/' . $filename;

            // Si ya fue descargada previamente, retornar la URL directamente
            if (file_exists($destPath) && filesize($destPath) > 1000) {
                return $publicUrl;
            }

            $ch = curl_init();
            curl_setopt($ch, CURLOPT_URL, $imgUrl);
            curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
            curl_setopt($ch, CURLOPT_FOLLOWLOCATION, true);
            curl_setopt($ch, CURLOPT_USERAGENT, 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36');
            curl_setopt($ch, CURLOPT_TIMEOUT, 15);
            curl_setopt($ch, CURLOPT_SSL_VERIFYPEER, false);

            $data = curl_exec($ch);
            $httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
            curl_close($ch);

            if ($httpCode === 200 && !empty($data) && strlen($data) > 1000) {
                file_put_contents($destPath, $data);
                return $publicUrl;
            }
        } catch (\Throwable $e) {
            // Si falla la descarga, retornar la URL remota normalizada
        }

        return $imgUrl;
    }

    private function collectAllImagesFromApi(array $data, array &$rawImages): void
    {
        array_walk_recursive($data, function ($value, $key) use (&$rawImages) {
            if (is_string($value) && in_array($key, ['cover', 'coverUrl', 'url', 'originUrl', 'coverPortrait', 'coverLandscape'], true)) {
                $url = trim($value);
                if (str_starts_with($url, '//')) {
                    $url = 'https:' . $url;
                }
                if (str_starts_with($url, 'http') && (str_contains($url, 'makerworld') || str_contains($url, 'bblmw') || str_contains($url, 'bambulab') || str_contains($url, 'cloudfront'))) {
                    if (!str_contains($url, 'avatar') && !str_contains($url, 'icon') && !str_contains($url, 'logo') && !str_contains($url, 'plate_') && !str_contains($url, 'public/us.png')) {
                        $rawImages[] = $url;
                    }
                }
            }
        });
    }

    private function fetchUrl(string $url): string
    {
        $ch = curl_init();
        curl_setopt($ch, CURLOPT_URL, $url);
        curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
        curl_setopt($ch, CURLOPT_FOLLOWLOCATION, true);
        curl_setopt($ch, CURLOPT_USERAGENT, 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36');
        curl_setopt($ch, CURLOPT_TIMEOUT, 10);
        curl_setopt($ch, CURLOPT_SSL_VERIFYPEER, false);

        $html = curl_exec($ch);
        $httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
        curl_close($ch);

        if ($html === false || $httpCode >= 400) {
            throw new RuntimeException('No se pudo descargar el contenido HTML de MakerWorld.');
        }

        return $html;
    }
}
