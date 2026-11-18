<?php

declare(strict_types=1);

namespace App\Services;

use InvalidArgumentException;
use RuntimeException;

final class MiCorreo
{
    private const BASE_URL = 'https://api.correoargentino.com.ar/micorreo/v1';

    public static function configPath(): string
    {
        $root = dirname(__DIR__, 3);
        if (basename($root) === 'sistema' && is_dir(dirname($root) . '/backend/src')) {
            $root = dirname($root);
        }
        return $root . '/backend/public/uploads/.3ld-private/mi-correo.php';
    }

    public static function configuration(): array
    {
        $path = self::configPath();
        return is_file($path) ? require $path : [];
    }

    public static function quote(array $config, array $parcel): array
    {
        $postalCode = trim((string) ($parcel['postal_code'] ?? ''));
        $delivery = $parcel['delivery'] ?? '';
        if (!preg_match('/^\d{4}$/D', $postalCode) || !in_array($delivery, ['D', 'S'], true)) {
            throw new InvalidArgumentException('Ingresá un código postal de cuatro dígitos y elegí el tipo de entrega.');
        }

        $dimensions = [];
        foreach (['weight' => 25000, 'height' => 150, 'width' => 150, 'length' => 150] as $key => $limit) {
            $value = filter_var($parcel[$key] ?? null, FILTER_VALIDATE_INT, [
                'options' => ['min_range' => 1, 'max_range' => $limit],
            ]);
            if ($value === false) {
                throw new InvalidArgumentException('Revisá el peso y las medidas. Correo admite hasta 25 kg y 150 cm por lado.');
            }
            $dimensions[$key] = $value;
        }

        $auth = 'Basic ' . base64_encode($config['username'] . ':' . $config['password']);
        $token = self::request('/token', $auth)['token'] ?? null;
        if (!is_string($token) || $token === '' || preg_match('/[\r\n]/', $token)) {
            throw new RuntimeException('MiCorreo no devolvió un token válido.');
        }

        $quote = self::request('/rates', 'Bearer ' . $token, [
            'customerId' => $config['customer_id'],
            'postalCodeOrigin' => $config['origin'],
            'postalCodeDestination' => $postalCode,
            'deliveredType' => $delivery,
            'dimensions' => $dimensions,
        ]);
        $reportedValidity = strtotime((string) ($quote['validTo'] ?? ''));
        $now = time();
        if ($reportedValidity === false || $reportedValidity < $now - 30) {
            throw new RuntimeException('MiCorreo no devolvió una cotización vigente.');
        }
        // Production can return the current instant as validTo. Limit how long the UI retains that rate.
        $expiresAt = $reportedValidity > $now + 5 ? min($reportedValidity, $now + 300) : $now + 300;

        $rates = [];
        foreach ($quote['rates'] ?? [] as $rate) {
            if (($rate['deliveredType'] ?? '') !== $delivery
                || !is_numeric($rate['price'] ?? null) || (float) $rate['price'] <= 0
                || empty($rate['productName'])) {
                continue;
            }
            $rates[] = [
                'service' => (string) $rate['productName'],
                'product_type' => (string) ($rate['productType'] ?? ''),
                'price' => round((float) $rate['price'], 2),
                'days_min' => (int) ($rate['deliveryTimeMin'] ?? 0),
                'days_max' => (int) ($rate['deliveryTimeMax'] ?? 0),
            ];
        }
        if (!$rates) {
            throw new InvalidArgumentException('Correo Argentino no ofreció tarifas para este paquete y destino.');
        }
        return ['rates' => $rates, 'expires_at' => $expiresAt];
    }

    private static function request(string $route, string $authorization, ?array $payload = null): array
    {
        $context = stream_context_create([
            'http' => [
                'method' => 'POST',
                'header' => [
                    'Authorization: ' . $authorization,
                    'Content-Type: application/json',
                    'Accept: application/json',
                    'Connection: close',
                ],
                'content' => $payload === null ? '' : json_encode($payload, JSON_THROW_ON_ERROR),
                'timeout' => 8,
                'follow_location' => 0,
                'ignore_errors' => true,
            ],
        ]);
        $body = @file_get_contents(self::BASE_URL . $route, false, $context, 0, 1048576);
        preg_match('/^HTTP\/\S+ (\d{3})/', $http_response_header[0] ?? '', $match);
        $status = (int) ($match[1] ?? 0);

        if ($route === '/token' && in_array($status, [401, 403], true)) {
            throw new RuntimeException('MiCorreo rechazó las credenciales de la API.');
        }
        $data = is_string($body) ? json_decode($body, true) : null;
        if ($status < 200 || $status >= 300 || !is_array($data)) {
            throw new RuntimeException('No se pudo consultar MiCorreo (HTTP ' . $status . ').');
        }
        return $data;
    }
}
