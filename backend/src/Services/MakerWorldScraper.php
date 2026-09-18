<?php

declare(strict_types=1);

namespace App\Services;

use RuntimeException;

class MakerWorldScraper
{
    /**
     * Extrae información y fotos de una URL de MakerWorld
     */
    public function scrape(string $url): array
    {
        if (filter_var($url, FILTER_VALIDATE_URL) === false || !str_contains($url, 'makerworld.com')) {
            throw new RuntimeException('La URL provista no es un enlace válido de MakerWorld.');
        }

        // Extraer título sugerido desde el slug de la URL
        $slugTitle = '';
        if (preg_match('/models\/\d+-([a-z0-9-]+)/i', $url, $matches)) {
            $slugTitle = ucwords(str_replace('-', ' ', $matches[1]));
        }

        $html = '';
        try {
            $html = $this->fetchUrl($url);
        } catch (\Throwable $e) {
            // Si cURL falla o es bloqueado por Cloudflare, continuamos con el slug extraído
        }

        $title = '';
        $description = '';
        $images = [];

        if (!empty($html)) {
            // Extraer Título (og:title o <title>)
            if (preg_match('/<meta\s+property=["\']og:title["\']\s+content=["\'](.*?)["\']/i', $html, $matches)) {
                $title = html_entity_decode($matches[1], ENT_QUOTES, 'UTF-8');
            } elseif (preg_match('/<title>(.*?)<\/title>/i', $html, $matches)) {
                $title = html_entity_decode($matches[1], ENT_QUOTES, 'UTF-8');
            }
            $title = str_replace([' | MakerWorld', ' - MakerWorld'], '', $title);

            // Extraer Descripción (og:description o meta description)
            if (preg_match('/<meta\s+property=["\']og:description["\']\s+content=["\'](.*?)["\']/i', $html, $matches)) {
                $description = html_entity_decode($matches[1], ENT_QUOTES, 'UTF-8');
            } elseif (preg_match('/<meta\s+name=["\']description["\']\s+content=["\'](.*?)["\']/i', $html, $matches)) {
                $description = html_entity_decode($matches[1], ENT_QUOTES, 'UTF-8');
            }

            // Extraer Imágenes (og:image y URLs en el HTML)
            if (preg_match_all('/<meta\s+property=["\']og:image["\']\s+content=["\'](.*?)["\']/i', $html, $matches)) {
                foreach ($matches[1] as $imgUrl) {
                    if (!empty($imgUrl) && filter_var($imgUrl, FILTER_VALIDATE_URL)) {
                        $images[] = $imgUrl;
                    }
                }
            }

            // Buscar más imágenes de alta resolución en el HTML (CDN MakerWorld / BambuLab / Cloudfront)
            preg_match_all('/https?:\/\/[^\s"\']+\.(?:png|jpg|jpeg|webp)/i', $html, $allMatches);
            foreach ($allMatches[0] as $imgUrl) {
                if (
                    (str_contains($imgUrl, 'makerworld') || str_contains($imgUrl, 'bambulab') || str_contains($imgUrl, 'cloudfront')) &&
                    !str_contains($imgUrl, 'avatar') && !str_contains($imgUrl, 'icon') && !str_contains($imgUrl, 'logo')
                ) {
                    if (!in_array($imgUrl, $images, true)) {
                        $images[] = $imgUrl;
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

        if (empty($images)) {
            $images[] = 'https://images.unsplash.com/photo-1581092160607-ee22621dd758?w=600&auto=format&fit=crop&q=80';
        }

        return [
            'raw_title'       => trim($title),
            'raw_description' => trim($description),
            'images'          => array_values(array_unique($images)),
        ];
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
