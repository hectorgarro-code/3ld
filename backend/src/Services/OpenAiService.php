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

    /**
     * Optimiza título, descripción y sugiere precio y categoría para un producto extraído de MakerWorld
     */
    public function optimizeProductForSales(string $rawTitle, string $rawDescription): array
    {
        $prompt = "Eres un experto en e-commerce y marketing para un taller de impresión 3D llamado '3LD'.
Dado este modelo 3D de MakerWorld:
Título original: {$rawTitle}
Descripción original: {$rawDescription}

Genera un JSON estrictamente válido con los siguientes campos:
{
  \"title\": \"Título comercial atractivo en español (máx 70 caracteres)\",
  \"description\": \"Descripción orientada a la venta en español, destacando utilidades, calidad de acabado, durabilidad en PLA/PETG y llamado a la acción (2 párrafos)\",
  \"category\": \"Una de estas categorías: cortantes, ceramica, didacticos, moldes, figuras, personalizados, accesorio\",
  \"suggested_price\": 9500
}

RESPONDE ÚNICAMENTE CON EL OBJETO JSON SINTÁCTICAMENTE VÁLIDO SIN MARKDOWN O TEXTO EXTRA.";

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
