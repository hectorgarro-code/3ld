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
        $key = trim((string)($config['openai']['api_key'] ?? ''));
        if (empty($key)) {
            $key = (string) base64_decode('c2stcHJvai00VUxkU2d1NktORWhVbUhnekpTUmxELWlEQllaTTdybVFQWlgyYXhUdmJuNGdIVzBTVzVvMi1Cb1NkUlhsLU94bUNnNElQSXNRWVQzQmxia0ZKejB3LU9lc0tVUHk5Qjc0Mm1ZSmYxVml2UkNwWjlFbGRVUXRhUWtOZS1Hc2IzekRYZnFQcURja3R3YWlzMjhNSmNvYjh1Q3Qxa0E=');
        }
        $this->apiKey = $key;
        $this->model  = !empty($config['openai']['model']) ? $config['openai']['model'] : 'gpt-4o-mini';
    }

    public function optimizeProductForSales(string $rawTitle, string $rawDescription, array $extraContext = []): array
    {
        $tagsStr = !empty($extraContext['tags']) && is_array($extraContext['tags']) ? implode(', ', $extraContext['tags']) : '';
        $urlStr  = !empty($extraContext['url']) ? $extraContext['url'] : '';
        $images  = !empty($extraContext['images']) && is_array($extraContext['images']) ? $extraContext['images'] : [];
        $selectedModel = !empty($extraContext['model']) ? $extraContext['model'] : $this->model;
        if (!in_array($selectedModel, ['gpt-4o-mini', 'gpt-4o'])) {
            $selectedModel = 'gpt-4o-mini';
        }

        $systemPrompt = "Eres un copywriter senior y especialista en marketing digital y SEO e-commerce para la fábrica y tienda 3LD (3ld.com.ar) en Argentina.
REGLA N°1 ABSOLUTA E INQUEBRANTABLE: DEBES RESPONDER SIEMPRE Y EXCLUSIVAMENTE EN ESPAÑOL (CASTELLANO). Jamás dejes títulos, descripciones o categorías en inglés u otro idioma. Si la información de origen está en inglés u otro idioma, o es escasa, tradúcela, adáptala y enriquécela al español argentino neutro y persuasivo.";

        $prompt = "Tu tarea es analizar este modelo 3D y convertirlo en una publicación de venta altamente persuasiva para vender el OBJETO FÍSICO YA IMPRESO (en PLA de alta calidad bajo pedido), nunca el archivo STL ni la descarga digital.

CONTEXTO DE NUESTRO NEGOCIO:
- Marca: 3LD Impresiones (3ld.com.ar).
- Fabricamos y vendemos productos físicos terminados en impresión 3D de alta precisión.
- Material: PLA premium no tóxico, biodegradable y resistente.
- Clientes: Hogar, decoración, repostería, regalos empresariales, souvenirs, eventos y colegios.

INFORMACIÓN EXTRAÍDA DEL MODELO:
- Título original: {$rawTitle}
- Descripción original:
{$rawDescription}
" . (!empty($tagsStr) ? "- Etiquetas / Tags: {$tagsStr}\n" : "") . "
" . (!empty($urlStr) ? "- URL de origen: {$urlStr}\n" : "") . "

INSTRUCCIONES ESTRICTAS:
1. IDIOMA 100% EN ESPAÑOL: Todos los campos ('title', 'description', 'seo_title', 'seo_description', 'subcategoria') deben estar redactados en perfecto español. Está terminantemente prohibido generar texto en inglés.
2. ANÁLISIS DE FOTOS / MODELO: Si la descripción original es corta, genérica, en otro idioma o no tiene suficiente información, analiza detalladamente la foto del producto para deducir qué objeto es, su forma, utilidad, público objetivo y detalles estéticos (por ejemplo: árbol navideño decorativo, cortante, organizador, etc.).
3. ENFOQUE COMERCIAL FÍSICO: Hablale al comprador final del objeto terminado. Jamás menciones palabras como STL, descarga, MakerWorld, Bambu Studio, impresión casera, slicer, archivos digitales ni modelos 3D para imprimir.
4. TÍTULO ('title'): En español, entre 50 y 70 caracteres, atractivo, comercial y con palabras clave SEO de compra directa (ej: 'Árbol Navideño Decorativo Personalizado con Nombres').
5. DESCRIPCIÓN ('description'): En español, entre 400 y 900 caracteres. Gancho inicial cautivador, explicación de qué es y para qué sirve, beneficios para el comprador, detalles de terminación de alta calidad y un llamado a la acción para comprar.
6. TÍTULO SEO ('seo_title'): En español, máximo 60 caracteres terminando en ' | 3LD'.
7. DESCRIPCIÓN SEO ('seo_description'): En español, entre 135 y 155 caracteres optimizada para clics en Google.
8. CATEGORÍA ('category'): Elegí la categoría más precisa entre: cortantes, ceramica, didacticos, moldes, figuras, personalizados, accesorio, hogar, deco.
9. SUBCATEGORÍA ('subcategoria'): Sugiere 2 o 3 palabras clave o etiquetas en español separadas por coma (ej: 'Navidad, Decoración, Regalos').
10. PRECIO SUGERIDO ('suggested_price'): Sugiere un precio estimado razonable en pesos argentinos (ARS).

Entregá ÚNICAMENTE un objeto JSON sintácticamente válido (sin texto extra):
{
  \"title\": \"Título comercial en español entre 50 y 70 caracteres\",
  \"description\": \"Descripción vendedora en español enfocada en el producto físico ya impreso\",
  \"seo_title\": \"Título SEO en español (máx 60 caracteres) | 3LD\",
  \"seo_description\": \"Meta descripción en español (135 a 155 caracteres)\",
  \"category\": \"categoría_elegida\",
  \"subcategoria\": \"etiqueta1, etiqueta2\",
  \"suggested_price\": 8500
}";

        // Si tenemos fotos del producto, usamos OpenAI con visión para inspeccionar la foto
        $imageUrlToAnalyze = !empty($images[0]) ? $images[0] : null;
        if ($imageUrlToAnalyze && str_starts_with($imageUrlToAnalyze, '//')) {
            $imageUrlToAnalyze = 'https:' . $imageUrlToAnalyze;
        }

        $jsonResponse = '';
        $lastException = null;

        // 1. Intento con visión multimodal si hay imagen disponible
        if ($imageUrlToAnalyze && str_starts_with($imageUrlToAnalyze, 'http')) {
            try {
                $jsonResponse = $this->callOpenAiVision($prompt, $imageUrlToAnalyze, $systemPrompt, $selectedModel);
            } catch (\Throwable $e) {
                $lastException = $e;
            }
        }

        // 2. Si no hay imagen o la visión falló (ej: timeout o formato de imagen no aceptado), llamada textual directa
        if (empty($jsonResponse)) {
            try {
                $jsonResponse = $this->callOpenAiWithSystem($prompt, $systemPrompt, $selectedModel);
            } catch (\Throwable $e) {
                $lastException = $e;
                // Reintentar con modelo alternativo equilibrado
                $altModel = ($selectedModel === 'gpt-4o') ? 'gpt-4o-mini' : 'gpt-4o';
                try {
                    $jsonResponse = $this->callOpenAiWithSystem($prompt, $systemPrompt, $altModel);
                } catch (\Throwable $e2) {
                    $lastException = $e2;
                }
            }
        }

        if (empty($jsonResponse) && $lastException) {
            throw $lastException;
        }
        
        $cleanJson = preg_replace('/^```(?:json)?\s*|\s*```$/i', '', trim($jsonResponse));
        $data = json_decode($cleanJson, true);

        if (!is_array($data) || empty($data['title'])) {
            throw new RuntimeException("La IA no devolvió un JSON con el formato esperado.");
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
    public function generateSalesCopy(string $title, string $details, ?string $customModel = null): array
    {
        $systemPrompt = "Eres un copywriter senior especializado en e-commerce y conversión para productos impresos en 3D (3LD Impresiones en Argentina).
REGLA OBLIGATORIA: DEBES RESPONDER 100% EN ESPAÑOL (CASTELLANO). Si el texto base está en inglés, tradúcelo y redacta todo en español.";

        $prompt = "Tu tarea es escribir una publicación para vender el OBJETO FÍSICO YA IMPRESO en PLA de alta calidad bajo pedido.

INFORMACIÓN BASE DEL PRODUCTO:
- Nombre/Ref: {$title}
- Detalles: {$details}

INSTRUCCIONES:
1. Jamás menciones STL, descargas, archivos digitales, MakerWorld o impresión casera.
2. TODO EN ESPAÑOL: Título, descripción y campos SEO deben estar en perfecto castellano.
3. TÍTULO: Entre 50 y 70 caracteres. Optimizado para SEO y conversión.
4. DESCRIPCIÓN: Entre 400 y 900 caracteres. Gancho inicial, explicá qué es y sus beneficios para el comprador final, llamado a la acción para comprar.
5. TÍTULO SEO (Google): Máximo 60 caracteres con intención de compra transaccional + ' | 3LD'.
6. DESCRIPCIÓN SEO (Google): Entre 135 y 155 caracteres atractiva para CTR en buscadores.

Responde ÚNICAMENTE en JSON sintácticamente válido:
{
  \"title\": \"Título comercial SEO en español (50 a 70 caracteres)\",
  \"description\": \"Descripción de venta en español (400 a 900 caracteres)\",
  \"seo_title\": \"Título SEO Google (máx 60 caracteres)\",
  \"seo_description\": \"Meta descripción Google (135 a 155 caracteres)\"
}";

        $jsonResponse = $this->callOpenAiWithSystem($prompt, $systemPrompt, $customModel);
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

TODO EN ESPAÑOL OBLIGATORIAMENTE.

PRODUCTO:
- Título actual: {$title}
- Categoría: " . ($category ?: 'General') . "
- Descripción: " . mb_substr($description, 0, 600) . "

INSTRUCCIONES SEO ESTRICTAS:
1. SEO TITLE: Debe tener exactamente entre 45 y 60 caracteres en español. Incluir la palabra clave principal de búsqueda, beneficio o material y terminar con '| 3LD'.
2. SEO DESCRIPTION: Debe tener exactamente entre 135 y 155 caracteres en español. Redactada para maximizar el CTR en Google: qué es, calidad del diseño, envíos a todo el país y llamado a comprar.
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
            // Fallback heurístico
        }

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
     * Genera un lote de publicaciones estratégicas para redes sociales (Meta Business Suite / Instagram / TikTok)
     */
    public function generateSocialCalendar(array $products, array $options = []): array
    {
        $daysCount   = max(1, min(120, (int)($options['days_count'] ?? 30)));
        $focus       = $options['focus'] ?? 'balanced';
        $tone        = $options['tone'] ?? 'cercano';
        $customCta   = $options['custom_cta'] ?? 'Envíos a todo el país. Comprá en 3ld.com.ar o escribinos por WhatsApp!';
        $modelChoice = !empty($options['model']) ? $options['model'] : 'gpt-4o';

        $simplifiedProds = [];
        foreach ($products as $p) {
            $simplifiedProds[] = [
                'id'          => $p['id'] ?? 0,
                'nombre'      => $p['nombre'] ?? ($p['title'] ?? ''),
                'categoria'   => $p['categoria_nombre'] ?? ($p['category'] ?? ''),
                'precio'      => (float)($p['precio_venta'] ?? ($p['price'] ?? 0)),
                'imagen_url'  => $p['imagen_url'] ?? ($p['image'] ?? ''),
                'descripcion' => mb_substr(strip_tags((string)($p['descripcion'] ?? '')), 0, 160),
            ];
        }

        $prodsJson = json_encode($simplifiedProds, JSON_UNESCAPED_UNICODE);

        $prompt = "Actuá como Director Creativo y Copywriter Senior de Redes Sociales (Instagram, Facebook y TikTok) para 3LD (3ld.com.ar), una fábrica y tienda online argentina de productos impresos en 3D (repostería, cortantes, deco hogar, mates térmicos, kits de graduación / egresados, navidad, etc.).

OBJETIVO:
Generar una grilla de {$daysCount} publicaciones estratégicas para Meta Business Suite (Feed, Carrusel, Reels o Historias con sticker). Cada publicación DEBE asociarse estrictamente a uno de los productos de la lista provista, utilizando su imagen real y datos de venta.

PARÁMETROS DE LA CAMPAÑA:
- Enfoque temático: {$focus}
- Tono de voz: {$tone}
- Llamado a la acción (CTA) sugerido: {$customCta}
- Promoción fija vigente de la tienda: Envío gratis local o nacional desde \$30.000. Tienda web: 3ld.com.ar

CATÁLOGO REAL DE PRODUCTOS DISPONIBLES:
{$prodsJson}

REGLAS DE COPYWRITING & FORMATO:
1. Variar formatos entre: 'Feed' (foto o carrusel), 'Reel' (video corto / guión dinámico) e 'Historia' (interacción y stickers).
2. Cada post debe tener:
   - 'day': número del día (1, 2, ..., {$daysCount}).
   - 'product_id': el ID exacto del producto seleccionado de la lista.
   - 'product_name': el nombre del producto.
   - 'image_url': la URL de la imagen del producto (exactamente como vino en la lista).
   - 'format': 'Feed', 'Reel' o 'Historia'.
   - 'hook': Primera línea o gancho irresistible.
   - 'caption': Copy completo y persuasivo para Instagram/Facebook en español con saltos de línea legibles, emojis medidos y CTA claro.
   - 'hashtags': 5 a 10 hashtags estratégicos relevantes en Argentina.
   - 'visual_guide': Indicación visual para la foto/video o guión segundo a segundo si es Reel.
   - 'suggested_time': Horario óptimo recomendado para publicar (ej. '19:30 hs').
3. No inventes productos ni enlaces falsos. Todos deben coincidir con la lista.

Responde ÚNICAMENTE con un arreglo JSON de objetos:
[
  {
    \"day\": 1,
    \"product_id\": 123,
    \"product_name\": \"Nombre del Producto\",
    \"image_url\": \"/backend/public/...\",
    \"format\": \"Feed\",
    \"hook\": \"Texto gancho\",
    \"caption\": \"Copywriting completo...\",
    \"hashtags\": \"#hashtag1 #hashtag2\",
    \"visual_guide\": \"Instrucción visual...\",
    \"suggested_time\": \"20:00 hs\"
  }
]";

        try {
            $rawResponse = $this->callOpenAi($prompt, $modelChoice, 0.7);
        } catch (\Throwable $e) {
            if ($modelChoice !== 'gpt-4o-mini') {
                $rawResponse = $this->callOpenAi($prompt, 'gpt-4o-mini', 0.7);
            } else {
                throw $e;
            }
        }

        $cleanJson = preg_replace('/^```(?:json)?\s*|\s*```$/i', '', trim($rawResponse));
        $calendar = json_decode($cleanJson, true);

        if (!is_array($calendar)) {
            throw new RuntimeException("La IA no devolvió un formato JSON válido.");
        }

        return $calendar;
    }

    /**
     * Llamada con prompt de sistema personalizado
     */
    public function callOpenAiWithSystem(string $prompt, string $systemPrompt, ?string $customModel = null, float $temperature = 0.7): string
    {
        if (empty($this->apiKey)) {
            throw new RuntimeException('API Key de OpenAI no configurada.');
        }

        $url = 'https://api.openai.com/v1/chat/completions';
        $payload = [
            'model' => $customModel ?: $this->model,
            'messages' => [
                ['role' => 'system', 'content' => $systemPrompt],
                ['role' => 'user', 'content' => $prompt]
            ],
            'temperature' => $temperature,
        ];

        return $this->executeCurl($url, $payload);
    }

    /**
     * Llamada con soporte de visión para analizar imágenes reales del producto
     */
    public function callOpenAiVision(string $prompt, string $imageUrl, string $systemPrompt, ?string $customModel = null): string
    {
        if (empty($this->apiKey)) {
            throw new RuntimeException('API Key de OpenAI no configurada.');
        }

        $url = 'https://api.openai.com/v1/chat/completions';
        // Modelo equilibrado y multimodal oficial de OpenAI (gpt-4o-mini o gpt-4o)
        $model = (!empty($customModel) && in_array($customModel, ['gpt-4o', 'gpt-4o-mini'])) ? $customModel : 'gpt-4o-mini';

        $payload = [
            'model' => $model,
            'messages' => [
                ['role' => 'system', 'content' => $systemPrompt],
                [
                    'role' => 'user',
                    'content' => [
                        [
                            'type' => 'text',
                            'text' => $prompt . "\n\nPor favor, inspecciona detalladamente la foto del producto adjunta para extraer la forma, función, temática y detalles visuales para redactar el título y descripción en español.",
                        ],
                        [
                            'type' => 'image_url',
                            'image_url' => [
                                'url' => $imageUrl,
                                'detail' => 'high'
                            ]
                        ]
                    ]
                ]
            ],
            'temperature' => 0.5,
        ];

        return $this->executeCurl($url, $payload);
    }

    /**
     * Realiza la llamada HTTP cURL a la API de OpenAI
     */
    public function callOpenAi(string $prompt, ?string $customModel = null, float $temperature = 0.7): string
    {
        return $this->callOpenAiWithSystem(
            $prompt,
            'Eres un director de marketing digital y copywriter senior especializado en E-commerce, Meta Ads, Instagram y TikTok para una fábrica y tienda de productos impresos en 3D en Argentina (3LD). Debes responder siempre en español.',
            $customModel,
            $temperature
        );
    }

    private function executeCurl(string $url, array $payload): string
    {
        $ch = curl_init($url);
        curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
        curl_setopt($ch, CURLOPT_POST, true);
        curl_setopt($ch, CURLOPT_POSTFIELDS, json_encode($payload));
        curl_setopt($ch, CURLOPT_HTTPHEADER, [
            'Content-Type: application/json',
            'Authorization: Bearer ' . $this->apiKey,
        ]);
        curl_setopt($ch, CURLOPT_TIMEOUT, 35);
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
