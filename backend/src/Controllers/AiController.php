<?php

declare(strict_types=1);

namespace App\Controllers;

use App\Helpers\Response;
use App\Services\MakerWorldScraper;
use App\Services\OpenAiService;
use Psr\Http\Message\ResponseInterface;
use Psr\Http\Message\ServerRequestInterface;
use Throwable;

class AiController
{
    private OpenAiService $openAiService;
    private MakerWorldScraper $scraper;

    public function __construct(OpenAiService $openAiService, MakerWorldScraper $scraper)
    {
        $this->openAiService = $openAiService;
        $this->scraper       = $scraper;
    }

    /**
     * POST /api/v1/ai/import-makerworld
     * Extrae información de MakerWorld y genera copia de venta optimizada con IA
     */
    public function importMakerWorld(ServerRequestInterface $request, ResponseInterface $response): ResponseInterface
    {
        try {
            $data = (array) $request->getParsedBody();
            $url  = trim((string) ($data['url'] ?? ''));

            if (empty($url)) {
                return Response::error('La URL de MakerWorld es requerida', 400);
            }

            // 1. Scrape MakerWorld Page
            $scraped = $this->scraper->scrape($url);

            // 2. Process with OpenAI GPT (con fallback en caso de error de API/Red)
            try {
                $aiResult = $this->openAiService->optimizeProductForSales(
                    $scraped['raw_title'],
                    $scraped['raw_description'],
                    [
                        'tags' => $scraped['tags'] ?? [],
                        'url'  => $url,
                    ]
                );
            } catch (Throwable $aiErr) {
                $aiResult = [
                    'title'           => $scraped['raw_title'],
                    'description'     => $scraped['raw_description'],
                    'category'        => 'accesorio',
                    'subcategoria'    => !empty($scraped['tags']) ? implode(', ', array_slice($scraped['tags'], 0, 3)) : '',
                    'suggested_price' => 8500,
                    'ai_error'        => $aiErr->getMessage(),
                ];
            }

            return Response::success([
                'title'           => $aiResult['title'] ?? $scraped['raw_title'],
                'description'     => $aiResult['description'] ?? $scraped['raw_description'],
                'seo_title'       => $aiResult['seo_title'] ?? mb_substr(($aiResult['title'] ?? $scraped['raw_title']) . ' | 3LD', 0, 60),
                'seo_description' => $aiResult['seo_description'] ?? mb_substr(strip_tags($aiResult['description'] ?? $scraped['raw_description']), 0, 155),
                'category'        => $aiResult['category'] ?? 'accesorio',
                'subcategoria'    => $aiResult['subcategoria'] ?? (!empty($scraped['tags']) ? implode(', ', array_slice($scraped['tags'], 0, 3)) : ''),
                'suggested_price' => $aiResult['suggested_price'] ?? 8500,
                'peso_gramos'     => $scraped['peso_gramos'] ?? 0,
                'horas_impresion' => $scraped['horas_impresion'] ?? 0,
                'raw_title'       => $scraped['raw_title'],
                'raw_description' => $scraped['raw_description'],
                'images'          => $scraped['images'],
                'source_url'      => $url,
                'ai_error'        => $aiResult['ai_error'] ?? null,
            ]);
        } catch (Throwable $e) {
            return Response::error('Error al importar desde MakerWorld: ' . $e->getMessage(), 500);
        }
    }

    /**
     * POST /api/v1/ai/generate-text
     * Genera títulos y descripciones comerciales para la carga manual de productos
     */
    public function generateText(ServerRequestInterface $request, ResponseInterface $response): ResponseInterface
    {
        try {
            $data    = (array) $request->getParsedBody();
            $title   = trim((string) ($data['title'] ?? ''));
            $details = trim((string) ($data['details'] ?? ''));

            if (empty($title) && empty($details)) {
                return Response::error('Ingresá al menos un título o detalle para generar con IA', 400);
            }

            try {
                $aiResult = $this->openAiService->generateSalesCopy($title, $details);
            } catch (Throwable $aiErr) {
                $aiResult = [
                    'title'           => $title,
                    'description'     => $details,
                    'seo_title'       => mb_substr($title . ' | 3LD', 0, 60),
                    'seo_description' => mb_substr(strip_tags($details), 0, 155),
                    'ai_error'        => $aiErr->getMessage(),
                ];
            }

            return Response::success($aiResult);
        } catch (Throwable $e) {
            return Response::error('Error al generar texto con IA: ' . $e->getMessage(), 500);
        }
    }

    /**
     * POST /api/v1/ai/generate-seo
     * Genera título y descripción SEO optimizados para Google
     */
    public function generateSeo(ServerRequestInterface $request, ResponseInterface $response): ResponseInterface
    {
        try {
            $data        = (array) $request->getParsedBody();
            $title       = trim((string) ($data['title'] ?? ''));
            $description = trim((string) ($data['description'] ?? ''));
            $category    = trim((string) ($data['category'] ?? ''));

            if (empty($title)) {
                return Response::error('El título es requerido para generar SEO', 400);
            }

            $seo = $this->openAiService->generateProductSeo($title, $description, $category);
            return Response::success($seo);
        } catch (Throwable $e) {
            return Response::error('Error al generar SEO: ' . $e->getMessage(), 500);
        }
    }

    /**
     * GET /api/v1/ai/proxy-image
     * Sirve imágenes de MakerWorld evitando bloqueo por Content-Type: application/octet-stream
     */
    public function proxyImage(ServerRequestInterface $request, ResponseInterface $response): ResponseInterface
    {
        $params = $request->getQueryParams();
        $imgUrl = trim((string)($params['url'] ?? ''));

        if (empty($imgUrl)) {
            return Response::error('URL requerida', 400);
        }

        if (str_starts_with($imgUrl, '//')) {
            $imgUrl = 'https:' . $imgUrl;
        }

        $parsed = parse_url($imgUrl);
        $scheme = strtolower($parsed['scheme'] ?? '');
        if (!in_array($scheme, ['http', 'https'], true)) {
            return Response::error('Protocolo de imagen no válido', 400);
        }

        $host = strtolower($parsed['host'] ?? '');
        if (empty($host) || $host === 'localhost') {
            return Response::error('Host inválido', 400);
        }

        $ip = gethostbyname($host);
        if (filter_var($ip, FILTER_VALIDATE_IP, FILTER_FLAG_NO_PRIV_RANGE | FILTER_FLAG_NO_RES_RANGE) === false) {
            return Response::error('Acceso a recursos internos restringido', 403);
        }

        $uploadDir = __DIR__ . '/../../public/uploads/productos/';
        if (!is_dir($uploadDir)) {
            mkdir($uploadDir, 0777, true);
        }

        $filename = 'mw_' . md5($imgUrl) . '.jpg';
        $destPath = $uploadDir . $filename;

        if (!file_exists($destPath) || filesize($destPath) < 500) {
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

            if ($httpCode === 200 && !empty($data) && strlen($data) > 500) {
                file_put_contents($destPath, $data);
            }
        }

        if (file_exists($destPath) && filesize($destPath) > 500) {
            $stream = fopen($destPath, 'rb');
            return $response
                ->withHeader('Content-Type', 'image/jpeg')
                ->withHeader('Cache-Control', 'public, max-age=86400')
                ->withBody(new \Slim\Psr7\Stream($stream));
        }

        return $response->withHeader('Location', $imgUrl)->withStatus(302);
    }
}
