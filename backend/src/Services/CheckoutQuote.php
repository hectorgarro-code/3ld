<?php
declare(strict_types=1);
namespace App\Services;
use PDO;
use InvalidArgumentException;

/** Cotización comercial de la tienda. No crea clientes, pedidos ni pagos. */
final class CheckoutQuote
{
    public function __construct(private PDO $db) {}
    private static function decode(mixed $value): array {
        if (is_string($value)) $value = json_decode($value, true);
        return is_array($value) ? array_values($value) : [];
    }
    public function calculate(array $items, array $shipping, bool $requireAddress = true): array {
        if (!$items || count($items) > 100) throw new InvalidArgumentException('Revisá los artículos del carrito.');
        $query = $this->db->prepare('SELECT * FROM productos WHERE id = ? LIMIT 1');
        $validated = []; $subtotal = 0; $weight = 0;
        $volume = 0; $longest = 0; $widest = 0; $tallest = 0;
        foreach ($items as $item) {
            if (!is_array($item)) throw new InvalidArgumentException('Artículo inválido.');
            $id = filter_var($item['id'] ?? null, FILTER_VALIDATE_INT);
            $qty = filter_var($item['quantity'] ?? $item['qty'] ?? null, FILTER_VALIDATE_INT);
            if (!$id || $id < 1 || !$qty || $qty < 1 || $qty > 1000) throw new InvalidArgumentException('Producto o cantidad inválidos.');
            $query->execute([$id]); $product = $query->fetch(PDO::FETCH_ASSOC);
            if (!$product || !(int)$product['activo'] || !(int)($product['es_tienda'] ?? 0) || !(int)($product['es_vendible'] ?? 0)) {
                throw new InvalidArgumentException('Un producto ya no está disponible en la tienda.');
            }
            $price = (float)($product['precio_venta'] ?? 0);
            $sale = (float)($product['precio_oferta'] ?? 0);
            $pieces = self::decode($product['piezas'] ?? []);
            $selection = $item['selected_piece_ids'] ?? [];
            if (!is_array($selection)) throw new InvalidArgumentException('Selección de piezas inválida.');
            $selection = array_map('strval', $selection);
            if (count($selection) !== count(array_unique($selection))) throw new InvalidArgumentException('Hay piezas repetidas.');
            $title = (string)$product['nombre']; $all = true;
            $comboPieces = array_filter($pieces, static fn($piece) => !empty($piece['producto_id']));
            $isCombo = count($comboPieces) > 0;
            if ($isCombo) {
                $componentIds = array_map(static fn($piece) => (string)($piece['id'] ?? $piece['producto_id']), $comboPieces);
                if ($selection && (count($selection) !== count($componentIds) || array_diff($selection, $componentIds))) {
                    throw new InvalidArgumentException('El combo se vende completo.');
                }
                $selection = [];
            }
            if ($pieces && !$isCombo) {
                if (!$selection) throw new InvalidArgumentException('Volvé a agregar el producto y elegí sus piezas.');
                $selected = [];
                foreach ($pieces as $piece) {
                    $key = (string)(!empty($piece['id']) ? $piece['id'] : ($piece['nombre'] ?? ''));
                    if (in_array($key, $selection, true)) $selected[$key] = $piece;
                }
                if (count($selected) !== count($selection)) throw new InvalidArgumentException('Una pieza seleccionada ya no existe.');
                $price = 0;
                foreach ($selected as $piece) {
                    $piecePrice = (float)($piece['precio'] ?? 0);
                    if (!is_finite($piecePrice) || $piecePrice <= 0) throw new InvalidArgumentException('Una pieza necesita cotización del taller.');
                    $price += $piecePrice;
                }
                $all = count($selected) === count($pieces);
                $title .= ' (' . implode(', ', array_column($selected, 'nombre')) . ')';
            } elseif ($selection) throw new InvalidArgumentException('El producto no tiene esas piezas.');
            if ($all && $sale > 0 && $sale < (float)($product['precio_venta'] ?? 0)) $price = $sale;
            if ($all && !$isCombo) {
                if (!empty($product['estructura_precio_id'])) {
                    try {
                        $stEp = $this->db->prepare('SELECT escalas FROM estructuras_precio_cantidad WHERE id = ? LIMIT 1');
                        $stEp->execute([(int)$product['estructura_precio_id']]);
                        $epEsc = $stEp->fetchColumn();
                        if (!empty($epEsc)) {
                            $product['precios_cantidad'] = $epEsc;
                        }
                    } catch (\Throwable $e) {}
                }
                $best = 0;
                foreach (self::decode($product['precios_cantidad'] ?? []) as $tier) {
                    $minimum = (int)($tier['cantidad'] ?? 0); $tierPrice = (float)($tier['precio'] ?? -1);
                    if ($minimum > $best && $minimum <= $qty && $tierPrice >= 0 && is_finite($tierPrice)) {
                        $best = $minimum; $price = $tierPrice;
                    }
                }
            }
            if (!is_finite($price) || $price <= 0) throw new InvalidArgumentException('Un producto necesita cotización del taller.');
            $price = round($price, 2);
            $validated[] = ['id'=>(string)$id,'prod_id'=>$id,'title'=>$title,'color'=>mb_substr((string)($item['color'] ?? ''),0,100),
                'quantity'=>$qty,'unit_price'=>$price,'image'=>empty($product['imagen_url']) ? null : (str_starts_with($product['imagen_url'], 'https://') ? $product['imagen_url'] : 'https://3ld.com.ar/' . ltrim($product['imagen_url'], '/')),'selected_piece_ids'=>$selection];
            $subtotal += (int)round($price * 100) * $qty;
            $weight += max(0, (float)($product['peso_gramos'] ?? 0)) > 0 ? (float)$product['peso_gramos'] * $qty : 120 * $qty;
            $sides = array_map(
                static fn (string $field): float => max(0, (float) ($product[$field] ?? 0)) / 10,
                ['alto_mm', 'ancho_mm', 'profundidad_mm']
            );
            sort($sides, SORT_NUMERIC);
            [$height, $width, $length] = $sides;
            $longest = max($longest, $length);
            $widest = max($widest, $width);
            $tallest = max($tallest, $height);
            $volume += ($height > 0 ? $height * $width * $length : 850) * $qty;
        }
        $subtotal = $subtotal / 100;
        $delivery = $shipping['method'] ?? '';
        if (!in_array($delivery,['pickup','shipping'],true)) throw new InvalidArgumentException('Elegí retiro o envío.');
        $quote = ['cost' => 0, 'service' => 'Retiro en Taller (Salta 3169, San Bernardo)', 'provider' => 'pickup'];
        if ($delivery === 'shipping') {
            $cp = trim((string) ($shipping['postal_code'] ?? ''));
            if (!preg_match('/^[0-9]{4}$/D', $cp)) {
                throw new InvalidArgumentException('Ingresá un código postal argentino de cuatro dígitos.');
            }
            $address = trim((string) ($shipping['direccion'] ?? ''));
            if ($requireAddress && $address === '') {
                throw new InvalidArgumentException('Completá la dirección de entrega.');
            }
            $isLocal = in_array($cp, ['7104','7105','7106','7107','7108','7109','7111','7112','7113'], true);
            $isCostaEsmeralda = preg_match('/costa[\s\p{Z}-]*esmeralda/iu', $address);
            $useCorreo = ($shipping['provider'] ?? '') === 'correo' || !$isLocal;
            if (!$useCorreo && $isCostaEsmeralda) {
                throw new InvalidArgumentException('Elegí Correo Argentino o retiro para una entrega en Costa Esmeralda.');
            }

            if ($useCorreo) {
                $config = MiCorreo::configuration();
                if (!$config) {
                    throw new InvalidArgumentException('Consultanos por WhatsApp para coordinar el envío a ese código postal.');
                }
                $side = (int) ceil(pow(max(2250, $volume), 1/3));
                $length = max(15, $side, (int) ceil($longest + 2));
                $width = max(15, $side, (int) ceil($widest + 2));
                $height = max(10, (int) ceil($volume / ($width * $length)) + 2, (int) ceil($tallest + 2));
                $postalQuote = MiCorreo::quote($config, [
                    'postal_code' => $cp,
                    'delivery' => 'D',
                    'weight' => max(100, (int) ceil($weight)),
                    'height' => $height,
                    'width' => $width,
                    'length' => $length,
                ]);
                $rates = $postalQuote['rates'];
                usort($rates, static fn (array $a, array $b) => [$a['product_type'] !== 'CP', $a['price']] <=> [$b['product_type'] !== 'CP', $b['price']]);
                $rate = $rates[0];
                $quote = [
                    'cost' => $rate['price'],
                    'service' => $rate['service'] . ' a domicilio',
                    'provider' => 'correo',
                    'expires_at' => $postalQuote['expires_at'],
                    'days_min' => $rate['days_min'],
                    'days_max' => $rate['days_max'],
                ];
            } else {
                $quote = [
                    'cost' => $subtotal >= 30000 ? 0 : 2500,
                    'service' => 'Envío Local La Costa / San Bernardo',
                    'provider' => 'local',
                ];
            }
        }
        return ['items' => $validated, 'subtotal' => $subtotal, 'shipping' => $quote, 'total' => round($subtotal + $quote['cost'], 2)];
    }
}
