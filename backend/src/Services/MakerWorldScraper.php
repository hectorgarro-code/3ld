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

        $html = $this->fetchUrl($url);

        // Extraer Título (og:title o <title>)
        $title = '';
        if (preg_match('/<meta\s+property=["\']og:title["\']\s+content=["\'](.*?)["\']/i', $html, $matches)) {
            $title = html_entity_decode($matches[1], ENT_QUOTES, 'UTF-8');
        } elseif (preg_match('/<title>(.*?)<\/title>/i', $html, $matches)) {
            $title = html_entity_decode($matches[1], ENT_QUOTES, 'UTF-8');
        }
        $title = str_replace([' | MakerWorld', ' - MakerWorld'], '', $title);

        // Extraer Descripción (og:description o meta description)
        $description = '';
        if (preg_match('/<meta\s+property=["\']og:description["\']\s+content=["\'](.*?)["\']/i', $html, $matches)) {
            $description = html_entity_decode($matches[1], ENT_QUOTES, 'UTF-8');
        } elseif (preg_match('/<meta\s+name=["\']description["\']\s+content=["\'](.*?)["\']/i', $html, $matches)) {
            $description = html_entity_decode($matches[1], ENT_QUOTES, 'UTF-8');
        }

        // Extraer Imágenes (og:image y URLs en el HTML)
        $images = [];
        if (preg_match_all('/<meta\s+property=["\']og:image["\']\s+content=["\'](.*?)["\']/i', $html, $matches)) {
            foreach ($matches[1] as $imgUrl) {
                if (!empty($imgUrl) && filter_var($imgUrl, FILTER_VALIDATE_URL)) {
                    $images[] = $imgUrl;
                }
            }
        }

        // Buscar más imágenes de alta resolución en el HTML (CDN MakerWorld / BambuLab)
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

        // Fallback de imágenes de ejemplo si la página requiere JS dinámico
        if (empty($images)) {
            $images[] = 'https://images.unsplash.com/photo-1581092160607-ee22621dd758?w=600&auto=format&fit=crop&q=80';
        }

        if (empty($title)) {
            $title = 'Modelo 3D MakerWorld';
        }

        return [
            'raw_title'       => trim($title),
            'raw_description' => trim($description ?: 'Pieza diseñada para impresión 3D disponible en MakerWorld.'),
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
        curl_setopt($ch, CURLOPT_TIMEOUT, 15);
        curl_setopt($ch, CURLOPT_SSL_VERIFYPEER, false);

        $html = curl_exec($ch);
        $httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
        curl_close($ch);

        if ($html === false || $httpCode >= 400) {
            throw new RuntimeException('No se pudo descargar el contenido de la URL de MakerWorld (Código HTTP: ' . $httpCode . ').');
        }

        return $html;
    }
}
