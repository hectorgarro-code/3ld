<?php

declare(strict_types=1);

namespace App\Controllers;

use PDO;
use Psr\Http\Message\ResponseInterface;
use Psr\Http\Message\ServerRequestInterface;
use App\Helpers\Response;

class MetaCatalogController
{
    private PDO $db;
    private string $baseUrl = 'https://3ld.com.ar';

    public function __construct(PDO $db)
    {
        $this->db = $db;
    }

    /**
     * Obtiene los productos publicables para el catálogo de Meta (Facebook, Instagram y WhatsApp)
     */
    private function getCatalogProducts(): array
    {
        $sql = "SELECT 
                    p.id, 
                    p.nombre, 
                    p.descripcion, 
                    p.precio_venta, 
                    p.precio_oferta, 
                    p.stock_actual, 
                    p.estado_stock, 
                    p.imagen_url, 
                    p.imagenes, 
                    p.subcategoria, 
                    p.peso_gramos,
                    p.dimensiones,
                    p.updated_at,
                    COALESCE(c.nombre, 'Impresión 3D') AS categoria_nombre
                FROM productos p
                LEFT JOIN categorias_producto c ON c.id = p.categoria_id
                WHERE p.activo = 1 AND (p.es_tienda = 1 OR p.es_vendible = 1)
                ORDER BY p.es_destacado DESC, p.id DESC";

        $stmt = $this->db->query($sql);
        return $stmt->fetchAll(PDO::FETCH_ASSOC) ?: [];
    }

    /**
     * Resuelve una URL absoluta para imágenes
     */
    private function formatImageUrl(?string $url): string
    {
        if (empty($url)) {
            return $this->baseUrl . '/favicon.png';
        }
        if (str_starts_with($url, 'http://') || str_starts_with($url, 'https://')) {
            return $url;
        }
        $trimmed = ltrim($url, '/');
        return $this->baseUrl . '/' . $trimmed;
    }

    /**
     * GET /api/v1/meta/catalog.xml
     * Catálogo en formato XML RSS 2.0 (Google Merchant / Facebook Catalog Specification)
     */
    public function getXml(ServerRequestInterface $request, ResponseInterface $response): ResponseInterface
    {
        $products = $this->getCatalogProducts();

        $xml = '<?xml version="1.0" encoding="UTF-8"?>' . "\n";
        $xml .= '<rss version="2.0" xmlns:g="http://base.google.com/ns/1.0">' . "\n";
        $xml .= "  <channel>\n";
        $xml .= "    <title>Catálogo Oficial 3LD</title>\n";
        $xml .= "    <link>{$this->baseUrl}/tienda</link>\n";
        $xml .= "    <description>Catálogo de productos de impresión 3D para WhatsApp, Facebook e Instagram</description>\n";

        foreach ($products as $p) {
            $id = '3LD_' . $p['id'];
            $title = trim(strip_tags((string)$p['nombre']));
            $desc = trim(strip_tags((string)$p['descripcion']));
            if (empty($desc)) {
                $desc = $title . ' - Fabricado con precisión 3D en 3LD.';
            }

            $priceNum = (float)($p['precio_venta'] ?? 0);
            if ($priceNum <= 0) {
                // Meta requiere un precio mayor a 0
                continue;
            }

            $priceFormatted = number_format($priceNum, 2, '.', '') . ' ARS';
            $salePriceNum = isset($p['precio_oferta']) && $p['precio_oferta'] !== null ? (float)$p['precio_oferta'] : 0;
            $hasSale = $salePriceNum > 0 && $salePriceNum < $priceNum;
            $salePriceFormatted = $hasSale ? number_format($salePriceNum, 2, '.', '') . ' ARS' : null;

            $link = "{$this->baseUrl}/tienda?producto=" . $p['id'];
            $imageLink = $this->formatImageUrl($p['imagen_url']);

            // Disponibilidad: in stock / out of stock
            $stock = isset($p['stock_actual']) ? (float)$p['stock_actual'] : 0;
            $estadoStock = $p['estado_stock'] ?? 'ready';
            $isAvailable = $stock > 0 || $estadoStock === 'custom';
            $availability = $isAvailable ? 'in stock' : 'out of stock';

            // Categoría
            $cat = trim((string)$p['categoria_nombre']);
            $subcat = trim((string)($p['subcategoria'] ?? ''));
            $productType = $cat;
            if (!empty($subcat)) {
                $productType .= ' > ' . $subcat;
            }

            $xml .= "    <item>\n";
            $xml .= "      <g:id>" . htmlspecialchars((string)$id, ENT_XML1) . "</g:id>\n";
            $xml .= "      <g:title>" . htmlspecialchars($title, ENT_XML1) . "</g:title>\n";
            $xml .= "      <g:description>" . htmlspecialchars($desc, ENT_XML1) . "</g:description>\n";
            $xml .= "      <g:link>" . htmlspecialchars($link, ENT_XML1) . "</g:link>\n";
            $xml .= "      <g:image_link>" . htmlspecialchars($imageLink, ENT_XML1) . "</g:image_link>\n";

            // Imágenes adicionales
            if (!empty($p['imagenes'])) {
                $imgs = is_string($p['imagenes']) ? json_decode($p['imagenes'], true) : $p['imagenes'];
                if (is_array($imgs)) {
                    $count = 0;
                    foreach ($imgs as $extraImg) {
                        if (!empty($extraImg) && $extraImg !== $p['imagen_url'] && $count < 10) {
                            $xml .= "      <g:additional_image_link>" . htmlspecialchars($this->formatImageUrl($extraImg), ENT_XML1) . "</g:additional_image_link>\n";
                            $count++;
                        }
                    }
                }
            }

            $xml .= "      <g:brand>3LD</g:brand>\n";
            $xml .= "      <g:condition>new</g:condition>\n";
            $xml .= "      <g:availability>{$availability}</g:availability>\n";
            $xml .= "      <g:price>{$priceFormatted}</g:price>\n";
            if ($hasSale && $salePriceFormatted) {
                $xml .= "      <g:sale_price>{$salePriceFormatted}</g:sale_price>\n";
            }
            $xml .= "      <g:product_type>" . htmlspecialchars($productType, ENT_XML1) . "</g:product_type>\n";
            $xml .= "      <g:custom_label_0>" . htmlspecialchars($estadoStock === 'custom' ? 'Fabricación a Pedido' : 'En Stock Inmediato', ENT_XML1) . "</g:custom_label_0>\n";
            $xml .= "    </item>\n";
        }

        $xml .= "  </channel>\n";
        $xml .= "</rss>";

        $response->getBody()->write($xml);
        return $response->withHeader('Content-Type', 'application/xml; charset=utf-8')
                        ->withHeader('Cache-Control', 'public, max-age=1800');
    }

    /**
     * GET /api/v1/meta/catalog.csv
     * Catálogo en formato CSV estándar de Meta
     */
    public function getCsv(ServerRequestInterface $request, ResponseInterface $response): ResponseInterface
    {
        $products = $this->getCatalogProducts();

        $output = fopen('php://temp', 'r+');
        // Encabezados estándar de Meta Commerce Manager
        fputcsv($output, [
            'id',
            'title',
            'description',
            'availability',
            'condition',
            'price',
            'sale_price',
            'link',
            'image_link',
            'brand',
            'product_type',
            'custom_label_0'
        ]);

        foreach ($products as $p) {
            $id = '3LD_' . $p['id'];
            $title = trim(strip_tags((string)$p['nombre']));
            $desc = trim(strip_tags((string)$p['descripcion']));
            if (empty($desc)) {
                $desc = $title . ' - Fabricado en 3LD.';
            }

            $priceNum = (float)($p['precio_venta'] ?? 0);
            if ($priceNum <= 0) continue;

            $priceFormatted = number_format($priceNum, 2, '.', '') . ' ARS';
            $salePriceNum = isset($p['precio_oferta']) && $p['precio_oferta'] !== null ? (float)$p['precio_oferta'] : 0;
            $hasSale = $salePriceNum > 0 && $salePriceNum < $priceNum;
            $salePriceFormatted = $hasSale ? number_format($salePriceNum, 2, '.', '') . ' ARS' : '';

            $link = "{$this->baseUrl}/tienda?producto=" . $p['id'];
            $imageLink = $this->formatImageUrl($p['imagen_url']);

            $stock = isset($p['stock_actual']) ? (float)$p['stock_actual'] : 0;
            $estadoStock = $p['estado_stock'] ?? 'ready';
            $isAvailable = $stock > 0 || $estadoStock === 'custom';
            $availability = $isAvailable ? 'in stock' : 'out of stock';

            $cat = trim((string)$p['categoria_nombre']);
            $subcat = trim((string)($p['subcategoria'] ?? ''));
            $productType = $cat . (!empty($subcat) ? ' > ' . $subcat : '');

            fputcsv($output, [
                $id,
                $title,
                $desc,
                $availability,
                'new',
                $priceFormatted,
                $salePriceFormatted,
                $link,
                $imageLink,
                '3LD',
                $productType,
                $estadoStock === 'custom' ? 'Fabricación a Pedido' : 'En Stock Inmediato'
            ]);
        }

        rewind($output);
        $csvContent = stream_get_contents($output);
        fclose($output);

        $response->getBody()->write($csvContent);
        return $response->withHeader('Content-Type', 'text/csv; charset=utf-8')
                        ->withHeader('Content-Disposition', 'attachment; filename="meta_catalog_3ld.csv"')
                        ->withHeader('Cache-Control', 'public, max-age=1800');
    }

    /**
     * GET /api/v1/meta/status
     * Resumen de salud y estadísticas del feed para el panel de administración
     */
    public function getStatus(ServerRequestInterface $request, ResponseInterface $response): ResponseInterface
    {
        $products = $this->getCatalogProducts();
        $total = count($products);
        $withPrice = 0;
        $inStock = 0;
        $custom = 0;

        foreach ($products as $p) {
            if ((float)($p['precio_venta'] ?? 0) > 0) {
                $withPrice++;
            }
            if ((float)($p['stock_actual'] ?? 0) > 0) {
                $inStock++;
            }
            if (($p['estado_stock'] ?? '') === 'custom') {
                $custom++;
            }
        }

        return Response::success([
            'total_productos' => $total,
            'aptos_meta' => $withPrice,
            'en_stock' => $inStock,
            'a_pedido' => $custom,
            'xml_url' => "{$this->baseUrl}/api/v1/meta/catalog.xml",
            'csv_url' => "{$this->baseUrl}/api/v1/meta/catalog.csv",
        ]);
    }
}
