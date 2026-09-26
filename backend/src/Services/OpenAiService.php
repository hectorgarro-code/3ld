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

        $prompt = "Eres un redactor experto en e-commerce y marketing para el taller de impresión 3D llamado '3LD'.
Se te proporciona el contenido y la descripción original completa extraída de la página de un modelo 3D en MakerWorld.
Tu objetivo es USAR ESTE CONTEXTO COMPLETO (detalles del modelo, partes incluidas, estética, utilidades y recomendaciones del creador) para redactar una propuesta comercial de venta en español súper atractiva para la tienda web.

INFORMACIÓN DE LA PÁGINA MAKERWORLD:
- Título original: {$rawTitle}
- Descripción del modelo (CONTEXTO PRINCIPAL):
{$rawDescription}
" . (!empty($tagsStr) ? "- Etiquetas / Tags: {$tagsStr}\n" : "") . "

REGLAS DE GENERACIÓN OBLIGATORIAS:
1. Traduce e interpreta el contexto original (esté en inglés, chino u otro idioma) al español rioplatense/latino neutro.
2. Analiza los elementos específicos que menciona el creador en la descripción (ej: letrero, bandeja, accesorios, florero, velas LED, montaje, etc.) e inclúyelos en la venta comercial. NO inventes características ajenas ni uses explicaciones genéricas sin contenido.
3. Genera un título comercial en español (máx. 70 caracteres) que represente el producto real.
4. Genera una descripción orientada a la venta en español (2 a 3 párrafos), destacando qué es, sus componentes, calidad de fabricación en PLA/PETG y llamado a la compra.
5. Elige la categoría más adecuada entre: cortantes, ceramica, didacticos, moldes, figuras, personalizados, accesorio.
6. Sugiere un precio estimado de venta en pesos ($).

Genera ÚNICAMENTE un objeto JSON sintácticamente válido:
{
  \"title\": \"Título comercial descriptivo en español\",
  \"description\": \"Descripción detallada orientada a la venta usando el contexto real del modelo\",
  \"category\": \"categoría_elegida\",
  \"suggested_price\": 9500
}";

        $jsonResponse = $this->callOpenAi($prompt);
        
        // Limpiar posible formato markdown triple backticks (```json ... ```)
        $cleanJson = preg_replace('/^```(?:json)?\s*|\s*```$/i', '', trim($jsonResponse));
        $data = json_decode($cleanJson, true);

        if (!is_array($data) || !isset($data['title'])) {
            return [
                'title'           => $rawTitle,
                'description'     => $rawDescription,
                'category'        => 'accesorio',
                'suggested_price' => 8500,
            ];
        }

        return $data;
    }

    /**
     * Genera un texto comercial a partir de un prompt o datos del producto
     */
    public function generateSalesCopy(string $title, string $details): array
    {
        $prompt = "Eres un redactor creativo de marketing para e-commerce de productos 3D.
Crea un título publicitario mejorado y una descripción persuasiva en español para este producto:
Nombre/Ref: {$title}
Detalles adicionales: {$details}

Responde en formato JSON único:
{
  \"title\": \"Título mejorado comercial\",
  \"description\": \"Descripción detallada enfocada en beneficios y llamado a la compra\"
}";

        $jsonResponse = $this->callOpenAi($prompt);
        $cleanJson = preg_replace('/^```(?:json)?\s*|\s*```$/i', '', trim($jsonResponse));
        $data = json_decode($cleanJson, true);

        if (!is_array($data) || !isset($data['title'])) {
            return [
                'title'       => $title,
                'description' => $details,
            ];
        }

        return $data;
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
