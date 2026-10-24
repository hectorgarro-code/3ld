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
    public function calculate(array $items, array $shipping): array {
        if (!$items || count($items) > 100) throw new InvalidArgumentException('Revisá los artículos del carrito.');
        $query = $this->db->prepare('SELECT * FROM productos WHERE id = ? LIMIT 1');
        $validated = []; $subtotal = 0; $weight = 0; $units = 0;
        foreach ($items as $item) {
            if (!is_array($item)) throw new InvalidArgumentException('Artículo inválido.');
            $id = filter_var($item['id'] ?? null, FILTER_VALIDATE_INT);
            $qty = filter_var($item['quantity'] ?? $item['qty'] ?? null, FILTER_VALIDATE_INT);
            if (!$id || $id < 1 || !$qty || $qty < 1 || $qty > 1000) throw new InvalidArgumentException('Producto o cantidad inválidos.');
            $query->execute([$id]); $product = $query->fetch(PDO::FETCH_ASSOC);
            if (!$product || !(int)$product['activo'] || !((int)($product['es_tienda'] ?? 0) || (int)($product['es_vendible'] ?? 0))) {
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
            if ($pieces) {
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
            if ($all) {
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
            $units += $qty;
        }
        $subtotal = $subtotal / 100;
        $delivery = $shipping['method'] ?? '';
        if (!in_array($delivery,['pickup','shipping'],true)) throw new InvalidArgumentException('Elegí retiro o envío.');
        $cost = 0; $service = 'Retiro en Taller (Salta 3169, San Bernardo)';
        if ($delivery === 'shipping') {
            $cp = trim((string)($shipping['postal_code'] ?? ''));
            if (!preg_match('/^[0-9]{4}$/D',$cp)) throw new InvalidArgumentException('Ingresá un código postal argentino de cuatro dígitos.');
            if (empty(trim((string)($shipping['direccion'] ?? '')))) throw new InvalidArgumentException('Completá la dirección de entrega.');
            $cpNumber = (int)$cp;
            if (!in_array($cp, ['7104','7105','7106','7107','7108','7109','7111','7112','7113'], true)) throw new InvalidArgumentException('Entregamos en localidades de La Costa, excepto Costa Esmeralda. Para ese código postal consultá al WhatsApp 2257559540 antes de pagar, o elegí retiro.');
            if (preg_match('/costa[\s\p{Z}-]*esmeralda/iu', (string)$shipping['direccion'])) throw new InvalidArgumentException('Costa Esmeralda está fuera de nuestra cobertura de entrega. Podés elegir retiro en el taller.');
            if (str_starts_with($cp,'71')) {
                $cost = $subtotal >= 30000 ? 0 : 2500; $service = 'Envío Local La Costa / San Bernardo';
            } else {
                $regional = ($cpNumber >= 1000 && $cpNumber <= 2999) || ($cpNumber >= 6000 && $cpNumber <= 8999);
                $side = (int)round(pow(max(2250,$units * 850),1/3));
                $billable = max(max($weight,100)/1000, max(10,$side)*max(15,$side)*max(15,$side)/4000);
                $cost = $regional ? 5200 : 6900;
                if ($billable > 1 && $billable <= 2) $cost += 1200;
                elseif ($billable > 2 && $billable <= 5) $cost += 2800;
                elseif ($billable > 5) $cost += 2800 + ceil($billable - 5) * 900;
                $service = 'Correo Argentino a Domicilio (' . ($regional ? 'Regional (Bs As / CABA)' : 'Nacional') . ')';
            }
        }
        return ['items'=>$validated,'subtotal'=>$subtotal,'shipping'=>['cost'=>$cost,'service'=>$service], 'total'=>round($subtotal+$cost,2)];
    }
}
