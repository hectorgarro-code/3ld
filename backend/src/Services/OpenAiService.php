<?php

declare(strict_types=1);

namespace App\Services;

use RuntimeException;

class OpenAiService
{
    private string $apiKey;
    private string $model;

    public function __construct(array $config)
    {
        $this->apiKey = $config['openai']['api_key'] ?? '';
        $this->model  = $config['openai']['model'] ?? 'gpt-4o-mini';
    }

    public function optimizeProductForSales(string $rawTitle, string $rawDescription, array $extraContext = []): array
    {
        $tagsStr = !empty($extraContext['tags']) && is_array($extraContext['tags']) ? implode(', ', $extraContext['tags']) : '';
        $urlStr  = !empty($extraContext['url']) ? $extraContext['url'] : '';

        $prompt = "Actuá como un copywriter senior especializado en e-commerce, SEO y conversión para productos impresos en 3D.

Tu tarea es analizar una página de MakerWorld y convertir ese modelo en una publicación para vender el OBJETO FÍSICO YA IMPRESO, no el archivo STL.

CONTEXTO DE MI NEGOCIO:
- Marca: 3LD Impresiones
- Vendo únicamente productos impresos en 3D.
- Los productos se fabrican bajo pedido.
- Material habitual: PLA de alta calidad.
- Público: Mercado Libre, Tienda Nube y redes sociales.

INFORMACIÓN EXTRAÍDA DE LA PÁGINA MAKERWORLD:
- Título original: {$rawTitle}
- Descripción original del modelo (CONTEXTO PRINCIPAL):
{$rawDescription}
" . (!empty($tagsStr) ? "- Etiquetas / Tags: {$tagsStr}\n" : "") . "
" . (!empty($urlStr) ? "- URL del modelo: {$urlStr}\n" : "") . "

INSTRUCCIONES OBLIGATORIAS:
1. Analizá toda la información disponible en la página (título, descripción, imágenes, medidas, cantidad de piezas, instrucciones y usos).
2. Reescribí el contenido pensando en un comprador final del objeto impreso.
3. NUNCA menciones STL, descarga, MakerWorld, Bambu Studio, impresión casera, slicer o archivos digitales.
4. No inventes funciones que el producto no tenga.
5. Si una medida no está disponible, no la inventes.
6. TÍTULO: Debe tener entre 55 y 70 caracteres, optimizado para SEO, con las palabras clave con mayor intención de compra, natural y atractivo, sin exceso de mayúsculas ni emojis.
7. DESCRIPCIÓN: Debe tener entre 500 y 1200 caracteres. Empezá con un gancho que despierte interés, explicá qué es, para quién sirve y qué beneficios aporta, convertí las características técnicas en beneficios para el comprador, incorporá naturalmente las palabras clave SEO y terminá con un llamado a la acción para comprar.
8. TÍTULO SEO (Google): Máximo 60 caracteres. Intención de búsqueda con palabras clave principales + ' | 3LD'.
9. DESCRIPCIÓN SEO (Meta Google): Entre 135 y 155 caracteres atractiva para CTR en resultados de búsqueda.
10. Elegí la categoría más adecuada entre: cortantes, ceramica, didacticos, moldes, figuras, personalizados, accesorio.
11. Sugiere categorías secundarias o etiquetas relevantes separadas por coma en el campo 'subcategoria' (ej. 'Decoración, San Valentín, Llaveros').
12. Sugiere un precio estimado de venta razonable en pesos ($).

Entregá ÚNICAMENTE un objeto JSON sintácticamente válido:
{
  \"title\": \"Título comercial optimizado entre 55 y 70 caracteres\",
  \"description\": \"Descripción vendedora entre 500 y 1200 caracteres enfocado en el producto físico ya impreso\",
  \"seo_title\": \"Título SEO para Google (máx 60 caracteres)\",
  \"seo_description\": \"Meta descripción atractiva para Google (135 a 155 caracteres)\",
  \"category\": \"categoría_elegida\",
  \"subcategoria\": \"etiqueta1, etiqueta2\",
  \"suggested_price\": 9500
}";

        $jsonResponse = $this->callOpenAi($prompt);
        
        // Limpiar posible formato markdown triple backticks (```json ... ```)
        $cleanJson = preg_replace('/^```(?:json)?\s*|\s*```$/i', '', trim($jsonResponse));
        $data = json_decode($cleanJson, true);

        if (!is_array($data) || !isset($data['title'])) {
            $fallbackTitle = mb_substr($rawTitle, 0, 70);
            return [
                'title'           => $fallbackTitle,
                'description'     => $rawDescription,
                'seo_title'       => mb_substr($fallbackTitle . ' | 3LD', 0, 60),
                'seo_description' => mb_substr(strip_tags($rawDescription), 0, 155),
                'category'        => 'accesorio',
                'subcategoria'    => !empty($options['tags']) ? implode(', ', array_slice($options['tags'], 0, 3)) : '',
                'suggested_price' => 8500,
            ];
        }

        if (empty($data['seo_title'])) {
            $data['seo_title'] = mb_substr(($data['title'] ?? $rawTitle) . ' | 3LD', 0, 60);
        }
        if (empty($data['seo_description'])) {
            $data['seo_description'] = mb_substr(strip_tags($data['description'] ?? $rawDescription), 0, 155);
        }

        return $data;
    }

    /**
     * Genera un texto comercial a partir de un prompt o datos del producto
     */
    public function generateSalesCopy(string $title, string $details): array
    {
        $prompt = "Actuá como un copywriter senior especializado en e-commerce, SEO y conversión para productos impresos en 3D (3LD Impresiones).
Tu tarea es escribir una publicación para vender el OBJETO FÍSICO YA IMPRESO en PLA de alta calidad bajo pedido.

INFORMACIÓN BASE DEL PRODUCTO:
- Nombre/Ref: {$title}
- Detalles: {$details}

INSTRUCCIONES:
1. Jamás menciones STL, descargas, archivos digitales, MakerWorld o impresión casera.
2. TÍTULO: Entre 55 y 70 caracteres. Optimizado para SEO y conversión.
3. DESCRIPCIÓN: Entre 500 y 1200 caracteres. Gancho inicial, explicá qué es y sus beneficios para el comprador final, llamado a la acción para comprar.
4. TÍTULO SEO (Google): Máximo 60 caracteres con intención de compra transaccional + ' | 3LD'.
5. DESCRIPCIÓN SEO (Google): Entre 135 y 155 caracteres atractiva para CTR en buscadores.

Responde ÚNICAMENTE en JSON sintácticamente válido:
{
  \"title\": \"Título comercial SEO (55 a 70 caracteres)\",
  \"description\": \"Descripción de venta (500 a 1200 caracteres)\",
  \"seo_title\": \"Título SEO Google (máx 60 caracteres)\",
  \"seo_description\": \"Meta descripción Google (135 a 155 caracteres)\"
}";

        $jsonResponse = $this->callOpenAi($prompt);
        $cleanJson = preg_replace('/^```(?:json)?\s*|\s*```$/i', '', trim($jsonResponse));
        $data = json_decode($cleanJson, true);

        if (!is_array($data) || !isset($data['title'])) {
            return [
                'title'           => $title,
                'description'     => $details,
                'seo_title'       => mb_substr($title . ' | 3LD', 0, 60),
                'seo_description' => mb_substr(strip_tags($details), 0, 155),
            ];
        }

        if (empty($data['seo_title'])) {
            $data['seo_title'] = mb_substr($data['title'] . ' | 3LD', 0, 60);
        }
        if (empty($data['seo_description'])) {
            $data['seo_description'] = mb_substr(strip_tags($data['description']), 0, 155);
        }

        return $data;
    }

    /**
     * Genera específicamente el SEO Title y Meta Description para Google de un producto existente
     */
    public function generateProductSeo(string $title, string $description, ?string $category = null): array
    {
        $prompt = "Actuá como un experto en SEO técnico y redacción e-commerce para la tienda 3LD (artículos en impresión 3D: cortantes de repostería, sellos y herramientas para cerámica, juguetes didácticos, macetas, organizadores y regalos personalizados en Argentina).

PRODUCTO:
- Título actual: {$title}
- Categoría: " . ($category ?: 'General') . "
- Descripción: " . mb_substr($description, 0, 600) . "

INSTRUCCIONES SEO ESTRICTAS:
1. SEO TITLE: Debe tener exactamente entre 45 y 60 caracteres. Incluir la palabra clave principal de búsqueda, beneficio o material y terminar con '| 3LD'.
2. SEO DESCRIPTION: Debe tener exactamente entre 135 y 155 caracteres. Redactada para maximizar el CTR en Google: qué es, calidad del diseño, envíos a todo el país y llamado a comprar.
3. No uses mayúsculas sostenidas ni emojis.
4. Generá solo JSON:
{
  \"seo_title\": \"Título SEO optimizado\",
  \"seo_description\": \"Meta descripción atractiva entre 135 y 155 caracteres.\"
}";

        try {
            $jsonResponse = $this->callOpenAi($prompt);
            $cleanJson = preg_replace('/^```(?:json)?\s*|\s*```$/i', '', trim($jsonResponse));
            $data = json_decode($cleanJson, true);

            if (is_array($data) && !empty($data['seo_title']) && !empty($data['seo_description'])) {
                return [
                    'seo_title'       => mb_substr(trim($data['seo_title']), 0, 70),
                    'seo_description' => mb_substr(trim($data['seo_description']), 0, 160),
                ];
            }
        } catch (\Throwable $e) {
            // Fallback inteligente sin IA si la llamada falla
        }

        // Generador heurístico de alto impacto
        $cleanName = trim($title);
        $seoTitle = mb_substr($cleanName, 0, 48) . ' | 3LD';
        $descPlain = trim(preg_replace('/\s+/', ' ', strip_tags($description)));
        if (mb_strlen($descPlain) > 20) {
            $seoDesc = mb_substr($descPlain, 0, 125) . '. Envíos a todo el país en 3LD.';
        } else {
            $seoDesc = "Comprá " . $cleanName . " en 3LD. Diseños exclusivos impresos en 3D con máxima calidad y terminación. Envíos rápidos a todo el país.";
        }
        $seoDesc = mb_substr($seoDesc, 0, 155);

        return [
            'seo_title'       => $seoTitle,
            'seo_description' => $seoDesc,
        ];
    }

    /**
     * Realiza la llamada HTTP cURL a la API de OpenAI
     */
    private function callOpenAi(string $prompt): string
    {
        if (empty($this->apiKey)) {
            throw new RuntimeException('API Key de OpenAI no configurada.');
        }

        $url = 'https://api.openai.com/v1/chat/completions';
        
        $payload = [
            'model' => $this->model,
            'messages' => [
                ['role' => 'system', 'content' => 'Eres un asistente experto en e-commerce y redacción comercial en español.'],
                ['role' => 'user', 'content' => $prompt]
            ],
            'temperature' => 0.7,
        ];

        $ch = curl_init($url);
        curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
        curl_setopt($ch, CURLOPT_POST, true);
        curl_setopt($ch, CURLOPT_POSTFIELDS, json_encode($payload));
        curl_setopt($ch, CURLOPT_HTTPHEADER, [
            'Content-Type: application/json',
            'Authorization: Bearer ' . $this->apiKey,
        ]);
        curl_setopt($ch, CURLOPT_TIMEOUT, 30);
        curl_setopt($ch, CURLOPT_SSL_VERIFYPEER, false);

        $response = curl_exec($ch);
        $httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
        $error    = curl_error($ch);
        curl_close($ch);

        if ($response === false || !empty($error)) {
            throw new RuntimeException('Error de red al conectar con OpenAI: ' . $error);
        }

        if ($httpCode !== 200) {
            $errData = json_decode($response, true);
            $msg = $errData['error']['message'] ?? 'Error ' . $httpCode . ' devuelto por OpenAI';
            throw new RuntimeException('OpenAI Error: ' . $msg);
        }

        $resData = json_decode($response, true);
        $content = $resData['choices'][0]['message']['content'] ?? '';

        if (empty($content)) {
            throw new RuntimeException('Respuesta vacía recibida de OpenAI');
        }

        return $content;
    }
}
