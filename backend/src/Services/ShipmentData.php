<?php

declare(strict_types=1);

namespace App\Services;

use InvalidArgumentException;

final class ShipmentData
{
    private const FIELDS = [
        'name' => 120, 'email' => 180, 'phone' => 35, 'street' => 120,
        'number' => 16, 'floor' => 3, 'apartment' => 3, 'city' => 100,
        'province' => 1, 'postal_code' => 8, 'reference' => 160, 'agency' => 24,
    ];

    public static function read(array $input, bool $strict = false): array
    {
        $data = [];
        foreach (self::FIELDS as $field => $limit) {
            $value = $input[$field] ?? '';
            if (!is_string($value)) {
                throw new InvalidArgumentException('Revisá los datos del destinatario.');
            }
            $data[$field] = trim(preg_replace('/[\x00-\x1F\x7F]/u', ' ', $value) ?? '');
            if (mb_strlen($data[$field]) > $limit) {
                throw new InvalidArgumentException('Uno de los datos del destinatario es demasiado largo.');
            }
        }

        $data['postal_code'] = strtoupper($data['postal_code']);
        $data['agency'] = strtoupper($data['agency']);
        $data['delivery'] = $input['delivery'] ?? 'D';
        $data['product_type'] = $input['product_type'] ?? 'CP';
        if (!in_array($data['delivery'], ['D', 'S'], true) || !in_array($data['product_type'], ['CP', 'EP'], true)) {
            throw new InvalidArgumentException('Elegí una modalidad y un servicio de Correo Argentino.');
        }
        foreach (['weight' => 25000, 'height' => 150, 'width' => 150, 'length' => 150] as $field => $limit) {
            $value = $input[$field] ?? '';
            $data[$field] = $value === '' ? '' : filter_var($value, FILTER_VALIDATE_INT, [
                'options' => ['min_range' => 1, 'max_range' => $limit],
            ]);
            if ($data[$field] === false) {
                throw new InvalidArgumentException('Revisá el peso y las medidas del paquete.');
            }
        }
        $value = $input['declared_value'] ?? '';
        $data['declared_value'] = '';
        if ($value !== '') {
            if (!is_numeric($value) || !is_finite((float) $value) || (float) $value <= 0 || (float) $value > 999999999) {
                throw new InvalidArgumentException('Ingresá un valor declarado válido.');
            }
            $data['declared_value'] = round((float) $value, 2);
        }

        if ($strict) {
            self::validateRecipient($data);
        }
        return $data;
    }

    private static function validateRecipient(array $data): void
    {
        if ($data['name'] === '' || !filter_var($data['email'], FILTER_VALIDATE_EMAIL)) {
            throw new InvalidArgumentException('Completá el nombre y un email válido del destinatario.');
        }
        if ($data['phone'] !== '' && !preg_match('/^[+0-9()\s.-]{7,35}$/D', $data['phone'])) {
            throw new InvalidArgumentException('Ingresá un número de celular válido.');
        }
        if (!preg_match('/^[A-HJ-NP-Z]$/D', $data['province'])) {
            throw new InvalidArgumentException('Elegí la provincia de destino.');
        }
        if ($data['delivery'] === 'S') {
            if (!preg_match('/^[A-Z0-9-]{1,24}$/D', $data['agency'])) {
                throw new InvalidArgumentException('Ingresá el código de la sucursal de destino.');
            }
            return;
        }
        if ($data['street'] === '' || $data['number'] === '' || $data['city'] === ''
            || !preg_match('/^(?:\d{4}|[A-Z]\d{4}[A-Z]{3})$/D', $data['postal_code'])) {
            throw new InvalidArgumentException('Completá calle, altura, localidad y código postal del destino.');
        }
    }

    public static function carrierPayload(array $data, string $reference, ?string $orderNumber): array
    {
        self::validateRecipient($data);
        foreach (['weight', 'height', 'width', 'length', 'declared_value'] as $field) {
            if ($data[$field] === '') {
                throw new InvalidArgumentException('Completá el peso, las medidas y el valor declarado del paquete.');
            }
        }
        $shipping = [
            'deliveryType' => $data['delivery'],
            'productType' => $data['product_type'],
            'weight' => $data['weight'],
            'height' => $data['height'],
            'width' => $data['width'],
            'length' => $data['length'],
            'declaredValue' => $data['declared_value'],
        ];
        if ($data['delivery'] === 'D') {
            $shipping['address'] = [
                'streetName' => $data['street'], 'streetNumber' => $data['number'],
                'floor' => $data['floor'], 'apartment' => $data['apartment'],
                'city' => $data['city'], 'provinceCode' => $data['province'],
                'postalCode' => $data['postal_code'],
            ];
        } else {
            $shipping['agency'] = $data['agency'];
        }
        return [
            'extOrderId' => $reference,
            'orderNumber' => $orderNumber ?? $reference,
            'recipient' => [
                'name' => $data['name'], 'email' => $data['email'],
                'cellPhone' => preg_replace('/\D/', '', $data['phone']),
            ],
            'shipping' => $shipping,
        ];
    }
}