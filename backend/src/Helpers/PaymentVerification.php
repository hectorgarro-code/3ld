<?php
declare(strict_types=1);
namespace App\Helpers;

/** Valida el pago consultado a Mercado Pago contra el pedido interno. */
final class PaymentVerification
{
    public static function matchesApprovedOrder(array $payment, array $order): bool
    {
        $amount = $payment['transaction_amount'] ?? null;
        $total = $order['total'] ?? null;
        if (($payment['status'] ?? '') !== 'approved'
            || ($payment['currency_id'] ?? '') !== 'ARS'
            || !is_numeric($amount) || !is_numeric($total)
            || !is_finite((float)$amount) || !is_finite((float)$total)
            || (float)$amount <= 0 || (float)$total <= 0) return false;
        return (string)($payment['external_reference'] ?? '') === (string)($order['id'] ?? '')
            && (int)round((float)$amount * 100) === (int)round((float)$total * 100);
    }
}
