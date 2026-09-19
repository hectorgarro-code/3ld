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
                    $scraped['raw_description']
                );
            } catch (Throwable $aiErr) {
                $aiResult = [
                    'title'           => $scraped['raw_title'],
                    'description'     => $scraped['raw_description'],
                    'category'        => 'accesorio',
                    'suggested_price' => 8500,
                    'ai_error'        => $aiErr->getMessage(),
                ];
            }

            return Response::success([
                'title'           => $aiResult['title'] ?? $scraped['raw_title'],
                'description'     => $aiResult['description'] ?? $scraped['raw_description'],
                'category'        => $aiResult['category'] ?? 'accesorio',
                'suggested_price' => $aiResult['suggested_price'] ?? 8500,
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
                    'title'       => $title,
                    'description' => $details,
                    'ai_error'    => $aiErr->getMessage(),
                ];
            }

            return Response::success($aiResult);
        } catch (Throwable $e) {
            return Response::error('Error al generar texto con IA: ' . $e->getMessage(), 500);
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
