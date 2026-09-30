<?php

declare(strict_types=1);

namespace App\Controllers;

use App\Helpers\Response;
use PDO;
use Psr\Http\Message\ResponseInterface;
use Psr\Http\Message\ServerRequestInterface;
use Throwable;

class MercadoPagoController
{
    private PDO $db;
    private string $configFile;

    public function __construct(PDO $db)
    {
        $this->db = $db;
        $this->configFile = __DIR__ . '/../../config/mercadopago.json';
    }

    private function getStoredConfig(): array
    {
        if (file_exists($this->configFile)) {
            $data = json_decode((string)file_get_contents($this->configFile), true);
            if (is_array($data)) {
                return $data;
            }
        }
        return [
            'activo'        => false,
            'access_token'  => '',
            'public_key'    => '',
            'sandbox'       => false,
        ];
    }

    /**
     * GET /api/v1/config/mercadopago (Admin)
     */
    public function getConfig(ServerRequestInterface $request, ResponseInterface $response): ResponseInterface
    {
        $cfg = $this->getStoredConfig();
        $token = $cfg['access_token'] ?? '';
        $maskedToken = '';
        if (!empty($token)) {
            $len = strlen($token);
            $maskedToken = $len > 12 ? substr($token, 0, 8) . str_repeat('*', $len - 12) . substr($token, -4) : '********';
        }

        return Response::success([
            'activo'        => !empty($cfg['activo']),
            'has_token'     => !empty($token),
            'masked_token'  => $maskedToken,
            'public_key'    => $cfg['public_key'] ?? '',
            'sandbox'       => !empty($cfg['sandbox']),
        ]);
    }

    /**
     * POST /api/v1/config/mercadopago (Admin)
     */
    public function saveConfig(ServerRequestInterface $request, ResponseInterface $response): ResponseInterface
    {
        try {
            $body = (array) $request->getParsedBody();
            $current = $this->getStoredConfig();

            $token = trim((string)($body['access_token'] ?? ''));
            // Si el token enviado contiene asteriscos o está vacío pero ya existía uno, preservar el actual
            if (empty($token) || str_contains($token, '*')) {
                $token = $current['access_token'] ?? '';
            }

            $newConfig = [
                'activo'       => !empty($body['activo']),
                'access_token' => $token,
                'public_key'   => trim((string)($body['public_key'] ?? '')),
                'sandbox'      => !empty($body['sandbox']),
                'updated_at'   => date('Y-m-d H:i:s'),
            ];

            $dir = dirname($this->configFile);
            if (!is_dir($dir)) {
                @mkdir($dir, 0775, true);
            }

            file_put_contents($this->configFile, json_encode($newConfig, JSON_PRETTY_PRINT | JSON_UNESCAPED_SLASHES));

            return Response::success([
                'message' => 'Configuración de Mercado Pago guardada correctamente',
                'activo'  => $newConfig['activo'],
                'sandbox' => $newConfig['sandbox'],
            ]);
        } catch (Throwable $e) {
            return Response::error('Error al guardar configuración: ' . $e->getMessage(), 500);
        }
    }

    /**
     * POST /api/v1/config/mercadopago/test (Admin)
     */
    public function testConnection(ServerRequestInterface $request, ResponseInterface $response): ResponseInterface
    {
        try {
            $body = (array) $request->getParsedBody();
            $cfg = $this->getStoredConfig();

            $token = trim((string)($body['access_token'] ?? ''));
            if (empty($token) || str_contains($token, '*')) {
                $token = $cfg['access_token'] ?? '';
            }

            if (empty($token)) {
                return Response::error('No se ha proporcionado un Access Token de Mercado Pago.', 400);
            }

            $ch = curl_init('https://api.mercadopago.com/users/me');
            curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
            curl_setopt($ch, CURLOPT_HTTPHEADER, [
                'Authorization: Bearer ' . $token,
                'Content-Type: application/json',
            ]);
            curl_setopt($ch, CURLOPT_TIMEOUT, 10);
            $res = curl_exec($ch);
            $httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
            curl_close($ch);

            if ($httpCode === 200 && $res) {
                $data = json_decode($res, true);
                return Response::success([
                    'connected' => true,
                    'nickname'  => $data['nickname'] ?? 'Vendedor Mercado Pago',
                    'site_id'   => $data['site_id'] ?? 'MLA',
                    'email'     => $data['email'] ?? '',
                ]);
            }

            return Response::error('El Access Token no es válido o fue revocado por Mercado Pago (Código HTTP ' . $httpCode . ').', 400);
        } catch (Throwable $e) {
            return Response::error('Error al probar conexión: ' . $e->getMessage(), 500);
        }
    }

    /**
     * GET /api/v1/tienda/mercadopago/status (Público)
     */
    public function getPublicStatus(ServerRequestInterface $request, ResponseInterface $response): ResponseInterface
    {
        $cfg = $this->getStoredConfig();
        $isConfigured = !empty($cfg['activo']) && !empty($cfg['access_token']);

        return Response::success([
            'enabled'    => $isConfigured,
            'public_key' => $isConfigured ? ($cfg['public_key'] ?? '') : '',
            'sandbox'    => !empty($cfg['sandbox']),
        ]);
    }

    /**
     * POST /api/v1/tienda/mercadopago/crear-preferencia (Público)
     */
    public function createPreference(ServerRequestInterface $request, ResponseInterface $response): ResponseInterface
    {
        try {
            $cfg = $this->getStoredConfig();
            if (empty($cfg['activo']) || empty($cfg['access_token'])) {
                return Response::error('El cobro con Mercado Pago no está activo en este momento.', 400);
            }

            $body = (array) $request->getParsedBody();
            $items = (array) ($body['items'] ?? []);
            if (empty($items)) {
                return Response::error('El carrito está vacío.', 400);
            }

            $comprador = (array) ($body['comprador'] ?? []);
            $envio = (array) ($body['envio'] ?? []);
            $costoEnvio = max(0, (float)($envio['costo'] ?? 0));
            $notas = trim((string)($body['notas'] ?? ''));

            // 1. Obtener o crear cliente
            $nombreComprador = trim((string)($comprador['nombre'] ?? 'Cliente Tienda Online'));
            if (empty($nombreComprador)) {
                $nombreComprador = 'Cliente Tienda Online';
            }
            $emailComprador = trim((string)($comprador['email'] ?? ''));
            $telComprador = trim((string)($comprador['telefono'] ?? ''));
            $dirComprador = trim((string)($comprador['direccion'] ?? ''));

            $clienteId = null;
            if (!empty($emailComprador)) {
                $stmtC = $this->db->prepare("SELECT id FROM clientes WHERE email = ? AND activo = 1 LIMIT 1");
                $stmtC->execute([$emailComprador]);
                $clienteId = $stmtC->fetchColumn() ?: null;
            }

            if (!$clienteId && !empty($telComprador)) {
                $stmtC = $this->db->prepare("SELECT id FROM clientes WHERE telefono = ? AND activo = 1 LIMIT 1");
                $stmtC->execute([$telComprador]);
                $clienteId = $stmtC->fetchColumn() ?: null;
            }

            if (!$clienteId) {
                $stmtNew = $this->db->prepare(
                    "INSERT INTO clientes (nombre, email, telefono, direccion, tipo_cliente, notas, activo, created_at, updated_at)
                     VALUES (?, ?, ?, ?, 'minorista', 'Registrado desde Checkout Tienda Web', 1, NOW(), NOW())"
                );
                $stmtNew->execute([
                    $nombreComprador,
                    !empty($emailComprador) ? $emailComprador : null,
                    !empty($telComprador) ? $telComprador : null,
                    !empty($dirComprador) ? $dirComprador : null,
                ]);
                $clienteId = (int)$this->db->lastInsertId();
            }

            // 2. Calcular totales y crear pedido
            $subtotal = 0.0;
            foreach ($items as $it) {
                $qty = max(1, (int)($it['quantity'] ?? $it['qty'] ?? 1));
                $price = max(0, (float)($it['unit_price'] ?? $it['price'] ?? 0));
                $subtotal += ($qty * $price);
            }
            $total = $subtotal + $costoEnvio;

            // Generar número de pedido único
            $numeroPedido = 'WEB-' . date('ymd') . '-' . str_pad((string)mt_rand(1, 9999), 4, '0', STR_PAD_LEFT);

            $stmtPed = $this->db->prepare(
                "INSERT INTO pedidos (numero_pedido, cliente_id, estado, subtotal, total, saldo_pendiente, notas, created_at, updated_at)
                 VALUES (?, ?, 'presupuesto', ?, ?, ?, ?, NOW(), NOW())"
            );
            $notasPedido = "Pedido Tienda Online\nComprador: {$nombreComprador}\nTel: {$telComprador}\nEmail: {$emailComprador}\nEnvío: " . ($envio['tipo'] ?? 'A coordinar') . " (" . ($envio['direccion'] ?? '') . ")\n" . $notas;
            $stmtPed->execute([$numeroPedido, $clienteId, $subtotal, $total, $total, trim($notasPedido)]);
            $pedidoId = (int)$this->db->lastInsertId();

            // Insertar items de pedido
            $stmtItem = $this->db->prepare(
                "INSERT INTO pedido_items (pedido_id, producto_id, descripcion, cantidad, precio_unit, subtotal, notas, estado, created_at)
                 VALUES (?, ?, ?, ?, ?, ?, ?, 'presupuesto', NOW())"
            );
            foreach ($items as $it) {
                $qty = max(1, (float)($it['quantity'] ?? $it['qty'] ?? 1));
                $price = max(0, (float)($it['unit_price'] ?? $it['price'] ?? 0));
                $itSub = $qty * $price;
                $prodId = !empty($it['id']) && is_numeric($it['id']) ? (int)$it['id'] : null;
                $desc = ($it['title'] ?? 'Producto Impresión 3D') . (!empty($it['color']) ? " (Color: {$it['color']})" : '');

                $stmtItem->execute([$pedidoId, $prodId, substr($desc, 0, 300), $qty, $price, $itSub, $it['color'] ?? null]);
            }

            if ($costoEnvio > 0) {
                $stmtItem->execute([
                    $pedidoId,
                    null,
                    'Costo de Envío: ' . ($envio['tipo'] ?? 'Correo / Andreani'),
                    1,
                    $costoEnvio,
                    $costoEnvio,
                    'Destino: ' . ($envio['direccion'] ?? ''),
                ]);
            }

            // 3. Armar preferencia de Mercado Pago
            $mpItems = [];
            foreach ($items as $it) {
                $title = trim((string)($it['title'] ?? 'Producto Impresión 3D'));
                if (!empty($it['color'])) {
                    $title .= " [{$it['color']}]";
                }
                $mpItems[] = [
                    'id'          => (string)($it['id'] ?? 'item'),
                    'title'       => substr($title, 0, 250),
                    'quantity'    => max(1, (int)($it['quantity'] ?? $it['qty'] ?? 1)),
                    'currency_id' => 'ARS',
                    'unit_price'  => (float)($it['unit_price'] ?? $it['price'] ?? 0),
                    'picture_url' => !empty($it['image']) ? (string)$it['image'] : null,
                ];
            }

            if ($costoEnvio > 0) {
                $mpItems[] = [
                    'id'          => 'shipping_cost',
                    'title'       => 'Envío ' . ($envio['tipo'] ?? 'Correo Argentino'),
                    'quantity'    => 1,
                    'currency_id' => 'ARS',
                    'unit_price'  => $costoEnvio,
                ];
            }

            // URLs de retorno
            $origin = 'https://3ld.com.ar';
            if (isset($_SERVER['HTTP_ORIGIN']) && !empty($_SERVER['HTTP_ORIGIN'])) {
                $origin = rtrim($_SERVER['HTTP_ORIGIN'], '/');
            } elseif (isset($_SERVER['HTTP_HOST']) && !empty($_SERVER['HTTP_HOST'])) {
                $origin = 'https://' . $_SERVER['HTTP_HOST'];
            }

            $cleanPhone = preg_replace('/\D/', '', $telComprador);
            $payerEmail = filter_var($emailComprador, FILTER_VALIDATE_EMAIL) ? $emailComprador : 'comprador_test@3ld.com.ar';

            $payerData = [
                'name'  => !empty($nombreComprador) ? $nombreComprador : 'Cliente Tienda',
                'email' => $payerEmail,
            ];
            if (!empty($cleanPhone)) {
                $payerData['phone'] = ['number' => $cleanPhone];
            }
            if (!empty($dirComprador)) {
                $payerData['address'] = ['street_name' => $dirComprador];
            }

            $preferenceData = [
                'items'               => $mpItems,
                'payer'               => $payerData,
                'back_urls'           => [
                    'success' => "{$origin}/tienda?mp_status=approved&pedido={$numeroPedido}",
                    'pending' => "{$origin}/tienda?mp_status=pending&pedido={$numeroPedido}",
                    'failure' => "{$origin}/tienda?mp_status=failure&pedido={$numeroPedido}",
                ],
                'external_reference'  => (string)$pedidoId,
                'statement_descriptor'=> '3LD IMPRESION 3D',
                'notification_url'    => "https://3ld.com.ar/api/v1/mercadopago/webhook",
            ];

            if (empty($cfg['sandbox'])) {
                $preferenceData['auto_return'] = 'approved';
            }

            // 4. Llamar a la API de Mercado Pago
            $ch = curl_init('https://api.mercadopago.com/checkout/preferences');
            curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
            curl_setopt($ch, CURLOPT_POST, true);
            curl_setopt($ch, CURLOPT_POSTFIELDS, json_encode($preferenceData));
            curl_setopt($ch, CURLOPT_HTTPHEADER, [
                'Authorization: Bearer ' . $cfg['access_token'],
                'Content-Type: application/json',
            ]);
            curl_setopt($ch, CURLOPT_TIMEOUT, 15);
            $res = curl_exec($ch);
            $httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
            curl_close($ch);

            if (($httpCode === 200 || $httpCode === 201) && $res) {
                $prefData = json_decode($res, true);
                $prefId = $prefData['id'] ?? '';
                $initPoint = !empty($cfg['sandbox']) ? ($prefData['sandbox_init_point'] ?? $prefData['init_point']) : ($prefData['init_point'] ?? '');

                // Guardar preference_id en el pedido
                try {
                    $stmtUp = $this->db->prepare("UPDATE pedidos SET mercadopago_preference_id = ? WHERE id = ?");
                    $stmtUp->execute([$prefId, $pedidoId]);
                } catch (\Throwable $e) {}

                // Enviar email de confirmación y aviso al taller
                $this->enviarEmailConfirmacion([
                    'email'            => $emailComprador,
                    'nombre'           => $nombreComprador,
                    'numero_pedido'    => $numeroPedido,
                    'total'            => $total,
                    'envio_tipo'       => $envio['tipo'] ?? 'Retiro en taller (Salta 3169, San Bernardo)',
                    'envio_direccion'  => $envio['direccion'] ?? '',
                    'items'            => $items,
                ]);

                return Response::success([
                    'preference_id' => $prefId,
                    'init_point'    => $initPoint,
                    'pedido_id'     => $pedidoId,
                    'numero_pedido' => $numeroPedido,
                ]);
            }

            return Response::error('Error al generar la preferencia de pago en Mercado Pago (HTTP ' . $httpCode . '): ' . substr((string)$res, 0, 200), 500);
        } catch (Throwable $e) {
            return Response::error('Error en el checkout de Mercado Pago: ' . $e->getMessage(), 500);
        }
    }

    /**
     * GET /api/v1/tienda/pedido/{numero} (Público)
     * Obtener comprobante de pedido para el comprador
     */
    public function getPedidoPublico(ServerRequestInterface $request, ResponseInterface $response, array $args): ResponseInterface
    {
        try {
            $numero = trim((string)($args['numero'] ?? ''));
            if (empty($numero)) {
                return Response::error('Número de pedido requerido', 400);
            }

            $stmt = $this->db->prepare(
                "SELECT p.id, p.numero_pedido, p.estado, p.subtotal, p.total, p.saldo_pendiente,
                        p.notas, p.created_at, p.mercadopago_status,
                        c.nombre AS cliente_nombre, c.telefono AS cliente_telefono, c.email AS cliente_email, c.direccion AS cliente_direccion
                 FROM pedidos p
                 LEFT JOIN clientes c ON c.id = p.cliente_id
                 WHERE p.numero_pedido = ? OR p.id = ?
                 LIMIT 1"
            );
            $stmt->execute([$numero, is_numeric($numero) ? (int)$numero : 0]);
            $pedido = $stmt->fetch(PDO::FETCH_ASSOC);

            if (!$pedido) {
                return Response::error('Pedido no encontrado', 404);
            }

            // Items
            $stmtItems = $this->db->prepare(
                "SELECT pi.id, pi.producto_id, pi.descripcion, pi.cantidad, pi.precio_unit, pi.subtotal, pi.notas
                 FROM pedido_items pi
                 WHERE pi.pedido_id = ?
                 ORDER BY pi.id ASC"
            );
            $stmtItems->execute([$pedido['id']]);
            $items = $stmtItems->fetchAll(PDO::FETCH_ASSOC) ?: [];

            $pedido['items'] = $items;

            return Response::success($pedido);
        } catch (Throwable $e) {
            return Response::error('Error al obtener pedido: ' . $e->getMessage(), 500);
        }
    }

    /**
     * Enviar email de confirmación al cliente y copia al taller
     */
    private function enviarEmailConfirmacion(array $pedidoInfo): void
    {
        try {
            $to = $pedidoInfo['email'] ?? '';
            $numero = $pedidoInfo['numero_pedido'] ?? '';
            $total = number_format((float)($pedidoInfo['total'] ?? 0), 2, ',', '.');
            $envioTipo = $pedidoInfo['envio_tipo'] ?? 'Retiro en taller (Salta 3169, San Bernardo)';
            $envioDir = $pedidoInfo['envio_direccion'] ?? '';

            $itemsHtml = '';
            foreach ($pedidoInfo['items'] as $it) {
                $desc = htmlspecialchars($it['title'] ?? 'Producto') . (!empty($it['color']) ? ' (' . htmlspecialchars($it['color']) . ')' : '');
                $qty = (int)($it['quantity'] ?? $it['qty'] ?? 1);
                $pr = number_format((float)($it['unit_price'] ?? $it['price'] ?? 0), 2, ',', '.');
                $sub = number_format($qty * (float)($it['unit_price'] ?? $it['price'] ?? 0), 2, ',', '.');
                $itemsHtml .= "<tr><td style='padding:8px; border-bottom:1px solid #eee;'>{$desc}</td><td style='padding:8px; border-bottom:1px solid #eee; text-align:center;'>x{$qty}</td><td style='padding:8px; border-bottom:1px solid #eee; text-align:right;'>\${$sub}</td></tr>";
            }

            $subject = "Confirmación de Pedido {$numero} - 3LD Impresión 3D";
            $message = "
            <html>
            <body style='font-family: Arial, sans-serif; color:#333; line-height:1.6; max-width:600px; margin:0 auto; padding:20px;'>
                <div style='text-align:center; padding-bottom:20px; border-bottom:2px solid #6B66C8;'>
                    <h1 style='color:#6B66C8; margin:0;'>3LD Impresión 3D</h1>
                    <p style='color:#666; margin:5px 0 0 0;'>¡Gracias por tu compra!</p>
                </div>
                <div style='padding:20px 0;'>
                    <p>Hola <strong>" . htmlspecialchars($pedidoInfo['nombre'] ?? 'Cliente') . "</strong>,</p>
                    <p>Recibimos tu pedido <strong>{$numero}</strong> correctamente. A continuación los detalles:</p>
                    <table style='width:100%; border-collapse:collapse; margin:20px 0;'>
                        <thead>
                            <tr style='background:#f8f8fc; color:#6B66C8;'>
                                <th style='padding:8px; text-align:left;'>Producto</th>
                                <th style='padding:8px; text-align:center;'>Cant.</th>
                                <th style='padding:8px; text-align:right;'>Subtotal</th>
                            </tr>
                        </thead>
                        <tbody>
                            {$itemsHtml}
                        </tbody>
                    </table>
                    <div style='background:#f9f9fb; padding:15px; border-radius:10px; margin-bottom:20px;'>
                        <p style='margin:5px 0;'><strong>Método de entrega:</strong> " . htmlspecialchars($envioTipo) . "</p>
                        " . (!empty($envioDir) ? "<p style='margin:5px 0;'><strong>Dirección:</strong> " . htmlspecialchars($envioDir) . "</p>" : "") . "
                        <p style='margin:10px 0 0 0; font-size:16px;'><strong>Total:</strong> <span style='color:#059669; font-weight:bold;'>\${$total}</span></p>
                    </div>
                    <div style='background:#eef2ff; border-left:4px solid #6B66C8; padding:12px; margin-bottom:20px;'>
                        <p style='margin:0; font-size:13px;'>📍 <strong>Retiro en taller:</strong> Salta 3169, San Bernardo del Tuyú. Te avisaremos en cuanto tu pedido esté terminado.</p>
                        <p style='margin:5px 0 0 0; font-size:13px;'>💬 ¿Dudas o consultas? Escribinos a nuestro WhatsApp: <a href='https://wa.me/5492257559540'>+54 9 2257 55-9540</a></p>
                    </div>
                </div>
                <div style='text-align:center; font-size:12px; color:#999; border-top:1px solid #eee; padding-top:15px;'>
                    3LD Impresión 3D • San Bernardo del Tuyú • www.3ld.com.ar
                </div>
            </body>
            </html>
            ";

            $headers = [
                'MIME-Version: 1.0',
                'Content-type: text/html; charset=UTF-8',
                'From: 3LD Impresión 3D <ventas@3ld.com.ar>',
                'Reply-To: ventas@3ld.com.ar',
                'Bcc: ventas@3ld.com.ar',
            ];

            if (filter_var($to, FILTER_VALIDATE_EMAIL)) {
                @mail($to, $subject, $message, implode("\r\n", $headers));
            } else {
                @mail('ventas@3ld.com.ar', $subject, $message, implode("\r\n", $headers));
            }
        } catch (\Throwable $e) {}
    }

    /**
     * POST / GET /api/v1/mercadopago/webhook
     * Webhook / IPN de Mercado Pago para procesar pagos aprobados en tiempo real
     */
    public function webhook(ServerRequestInterface $request, ResponseInterface $response): ResponseInterface
    {
        try {
            $params = $request->getQueryParams();
            $body = (array) $request->getParsedBody();

            $type = $params['type'] ?? $params['topic'] ?? $body['type'] ?? $body['action'] ?? '';
            $paymentId = $params['data_id'] ?? $params['data']['id'] ?? $params['id'] ?? $body['data']['id'] ?? $body['id'] ?? null;

            if (empty($paymentId) && !empty($body['resource'])) {
                // Formato /v1/payments/123456
                $parts = explode('/', (string)$body['resource']);
                $paymentId = end($parts);
            }

            if (!empty($paymentId) && is_numeric($paymentId)) {
                $cfg = $this->getStoredConfig();
                if (!empty($cfg['access_token'])) {
                    $ch = curl_init("https://api.mercadopago.com/v1/payments/{$paymentId}");
                    curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
                    curl_setopt($ch, CURLOPT_HTTPHEADER, [
                        'Authorization: Bearer ' . $cfg['access_token'],
                        'Content-Type: application/json',
                    ]);
                    curl_setopt($ch, CURLOPT_TIMEOUT, 10);
                    $res = curl_exec($ch);
                    $httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
                    curl_close($ch);

                    if ($httpCode === 200 && $res) {
                        $paymentData = json_decode($res, true);
                        $status = $paymentData['status'] ?? '';
                        $pedidoId = (int)($paymentData['external_reference'] ?? 0);

                        if ($pedidoId > 0) {
                            $nuevoEstado = ($status === 'approved') ? 'cobrado' : (($status === 'in_process') ? 'en_produccion' : null);

                            if ($nuevoEstado !== null) {
                                $stmtUp = $this->db->prepare(
                                    "UPDATE pedidos
                                     SET estado = ?,
                                         mercadopago_payment_id = ?,
                                         mercadopago_status = ?,
                                         saldo_pendiente = IF(? = 'cobrado', 0.00, saldo_pendiente),
                                         updated_at = NOW()
                                     WHERE id = ?"
                                );
                                $stmtUp->execute([$nuevoEstado, $paymentId, $status, $nuevoEstado, $pedidoId]);

                                // Registrar en historial de pedido si la tabla existe
                                try {
                                    $stmtH = $this->db->prepare(
                                        "INSERT INTO pedido_historial (pedido_id, estado_anterior, estado_nuevo, nota, created_at)
                                         VALUES (?, 'presupuesto', ?, ?, NOW())"
                                    );
                                    $stmtH->execute([$pedidoId, $nuevoEstado, "Pago confirmado automáticamente por Mercado Pago (ID {$paymentId})"]);
                                } catch (\Throwable $e) {}
                            }
                        }
                    }
                }
            }

            $response->getBody()->write(json_encode(['status' => 'ok']));
            return $response->withStatus(200)->withHeader('Content-Type', 'application/json');
        } catch (Throwable $e) {
            $response->getBody()->write(json_encode(['status' => 'error', 'message' => $e->getMessage()]));
            return $response->withStatus(200)->withHeader('Content-Type', 'application/json');
        }
    }
}
