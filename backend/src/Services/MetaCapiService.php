<?php

declare(strict_types=1);

namespace App\Services;

class MetaCapiService
{
    private array $config;
    private string $pixelId;
    private string $apiVersion;
    private string $accessToken;
    private ?string $testEventCode;

    public function __construct(array $config)
    {
        $this->config = $config;
        $version = (string)($config['meta']['api_version'] ?? 'v26.0');
        $this->apiVersion = preg_match('/^v[0-9]+\.[0-9]+$/', $version) ? $version : 'v26.0';
        $this->pixelId = (string)($config['meta']['pixel_id'] ?? '612576675192830');
        $this->accessToken = (string)($config['meta']['access_token'] ?? '');
        $this->testEventCode = !empty($config['meta']['test_event_code']) ? (string)$config['meta']['test_event_code'] : null;
    }

    /**
     * Comprueba si Conversions API tiene credenciales configuradas
     */
    public function isConfigured(): bool
    {
        return !empty($this->accessToken) && !empty($this->pixelId);
    }

    /**
     * Normaliza y aplica hash SHA-256 según los requisitos de Meta
     */
    private function hashValue(?string $val): ?string
    {
        if ($val === null) return null;
        $clean = trim(strtolower($val));
        return !empty($clean) ? hash('sha256', $clean) : null;
    }

    /**
     * Normaliza y aplica hash al número de teléfono
     */
    private function hashPhone(?string $phone): ?string
    {
        if ($phone === null) return null;
        $clean = preg_replace('/[^0-9]/', '', $phone);
        if (empty($clean)) return null;

        // Si es número de Argentina sin código de país, asegurar formato internacional
        if (strlen($clean) === 10 && str_starts_with($clean, '11')) {
            $clean = '549' . $clean;
        } elseif (strlen($clean) === 10) {
            $clean = '54' . $clean;
        }

        return hash('sha256', $clean);
    }

    /**
     * Envía evento server-side Purchase a Meta Conversions API
     *
     * @param array $pedido Datos del pedido (numero_pedido, total, etc.)
     * @param array $items Ítems comprados con producto_id, cantidad, precio_unit
     * @param array $cliente Datos del comprador (email, telefono, nombre)
     * @param string|null $clientIp IP del comprador
     * @param string|null $clientUserAgent User Agent del navegador
     * @return array Resultado de la llamada a la Graph API de Meta
     */
    public function sendPurchaseEvent(
        array $pedido,
        array $items,
        array $cliente = [],
        ?string $clientIp = null,
        ?string $clientUserAgent = null
    ): array {
        if (!$this->isConfigured()) {
            return [
                'success' => false,
                'message' => 'Meta CAPI no configurado: falta META_CAPI_ACCESS_TOKEN en config.local.php',
            ];
        }

        $internalId = filter_var($pedido['id'] ?? null, FILTER_VALIDATE_INT);
        $total = $pedido['total'] ?? null;
        if (!$internalId || $internalId <= 0
            || ($pedido['mercadopago_status'] ?? '') !== 'approved'
            || !is_numeric($total) || !is_finite((float)$total) || (float)$total <= 0) {
            return ['success' => false, 'message' => 'Compra sin pago aprobado, importe o ID interno válido'];
        }

        // Deduplicación Pixel + CAPI exacta por ID interno inmutable
        $eventId = 'order_' . $internalId;

        // User Data con hashing SHA-256 requerido por Meta
        $userData = [];
        $hashedEmail = $this->hashValue($cliente['email'] ?? null);
        if ($hashedEmail) {
            $userData['em'] = [$hashedEmail];
        }

        $hashedPhone = $this->hashPhone($cliente['telefono'] ?? null);
        if ($hashedPhone) {
            $userData['ph'] = [$hashedPhone];
        }

        $nombreCompleto = trim((string)($cliente['nombre'] ?? ''));
        if (!empty($nombreCompleto)) {
            $parts = explode(' ', $nombreCompleto, 2);
            $fn = $this->hashValue($parts[0] ?? '');
            if ($fn) $userData['fn'] = [$fn];
            if (isset($parts[1])) {
                $ln = $this->hashValue($parts[1]);
                if ($ln) $userData['ln'] = [$ln];
            }
        }

        if (!empty($clientIp) && filter_var($clientIp, FILTER_VALIDATE_IP)) {
            $userData['client_ip_address'] = $clientIp;
        }

        if (!empty($clientUserAgent)) {
            $userData['client_user_agent'] = $clientUserAgent;
        }

        // Custom Data: Coincidencia 1:1 con catalog.xml ('3LD_{id}')
        $contentIds = [];
        $contents = [];
        $numItems = 0;

        foreach ($items as $it) {
            $prodId = (string)($it['producto_id'] ?? $it['id'] ?? '');
            if (empty($prodId)) continue;

            $formattedId = str_starts_with($prodId, '3LD_') ? $prodId : '3LD_' . $prodId;
            $qty = max(1, (int)($it['cantidad'] ?? $it['qty'] ?? 1));
            $price = (float)($it['precio_unit'] ?? $it['price'] ?? 0);

            $contentIds[] = $formattedId;
            $contents[] = [
                'id'         => $formattedId,
                'quantity'   => $qty,
                'item_price' => round($price, 2),
            ];
            $numItems += $qty;
        }

        $totalVal = round((float)($pedido['total'] ?? 0), 2);

        $eventPayload = [
            'event_name'       => 'Purchase',
            'event_time'       => time(),
            'event_id'         => $eventId,
            'event_source_url' => 'https://3ld.com.ar/tienda',
            'action_source'    => 'website',
            'user_data'        => (object)$userData,
            'custom_data'      => [
                'currency'     => 'ARS',
                'value'        => $totalVal,
                'content_ids'  => $contentIds,
                'content_type' => 'product',
                'contents'     => $contents,
                'num_items'    => $numItems,
            ],
        ];

        $requestBody = [
            'data' => [$eventPayload],
        ];

        if (!empty($this->testEventCode)) {
            $requestBody['test_event_code'] = $this->testEventCode;
        }

        $url = "https://graph.facebook.com/{$this->apiVersion}/{$this->pixelId}/events?access_token=" . urlencode($this->accessToken);

        $ch = curl_init($url);
        curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
        curl_setopt($ch, CURLOPT_POST, true);
        curl_setopt($ch, CURLOPT_POSTFIELDS, json_encode($requestBody));
        curl_setopt($ch, CURLOPT_HTTPHEADER, [
            'Content-Type: application/json',
        ]);
        curl_setopt($ch, CURLOPT_TIMEOUT, 6);

        $response = curl_exec($ch);
        $httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
        $curlError = curl_error($ch);
        curl_close($ch);

        if ($curlError) {
            return [
                'success' => false,
                'error'   => 'cURL error: ' . $curlError,
            ];
        }

        $decoded = json_decode((string)$response, true);
        $isSuccess = ($httpCode >= 200 && $httpCode < 300) && (!isset($decoded['error']));

        return [
            'success'   => $isSuccess,
            'http_code' => $httpCode,
            'event_id'  => $eventId,
            'response'  => $decoded,
        ];
    }
}
