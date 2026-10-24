<?php
declare(strict_types=1);
namespace App\Helpers;

/** Acceso limitado al comprobante del checkout que posee el comprador. */
final class ReceiptAccess
{
    public static function token(int $orderId, string $preferenceId): string
    {
        if ($orderId <= 0 || trim($preferenceId) === '') return '';
        return hash_hmac('sha256', '3ld-receipt:' . $orderId, $preferenceId);
    }

    public static function allows(int $orderId, string $preferenceId, string $token): bool
    {
        $expected = self::token($orderId, $preferenceId);
        return $expected !== '' && preg_match('/^[a-f0-9]{64}$/D', $token) === 1
            && hash_equals($expected, $token);
    }
}
