<?php

declare(strict_types=1);

namespace App\Controllers;

use App\Helpers\Response;
use App\Services\MiCorreo;
use App\Services\ShipmentData;
use App\Services\ShipmentStore;
use DomainException;
use InvalidArgumentException;
use PDO;
use PDOException;
use Psr\Http\Message\ResponseInterface;
use Psr\Http\Message\ServerRequestInterface;
use RuntimeException;

final class ShippingController
{
    public function __construct(private PDO $db) {}

    public function whatsapp(ServerRequestInterface $request): ResponseInterface
    {
        return $this->respond(function (ShipmentStore $store) use ($request) {
            $recipient = array_intersect_key((array) $request->getParsedBody(), array_flip([
                'name', 'phone', 'email', 'street', 'number', 'city', 'province', 'postal_code',
                'floor', 'apartment', 'reference',
            ]));
            $data = ShipmentData::read($recipient, true);
            if ($data['phone'] === '') {
                throw new InvalidArgumentException('Completá el celular de contacto.');
            }
            $draft = $store->create($data, 'whatsapp');
            return Response::success(['ref' => $draft['ref']], 201);
        });
    }

    public function order(ServerRequestInterface $request, int $id): ResponseInterface
    {
        return $this->respond(function (ShipmentStore $store) use ($request, $id) {
            $order = $this->requireOrder($store, $id);
            if ($request->getMethod() === 'POST') {
                $input = (array) $request->getParsedBody();
                if (!empty($input['ref'])) {
                    $ref = $this->reference($input['ref']);
                    $this->requireShipment($store, $ref);
                    $store->link($ref, $id);
                } else {
                    $data = ShipmentData::read((array) ($input['data'] ?? []));
                    return Response::success($store->create($data, 'pedido', $id), 201);
                }
            }
            return Response::success([
                'shipment' => $store->find('pedido_id', $id),
                'defaults' => ['name' => $order['nombre'] ?? '', 'email' => $order['email'] ?? '', 'phone' => $order['telefono'] ?? ''],
            ]);
        });
    }

    public function manual(ServerRequestInterface $request): ResponseInterface
    {
        return $this->respond(fn (ShipmentStore $store) => Response::success(
            $store->create(ShipmentData::read((array) $request->getParsedBody()), 'manual'), 201
        ));
    }

    public function shipment(ServerRequestInterface $request, string $ref): ResponseInterface
    {
        return $this->respond(function (ShipmentStore $store) use ($request, $ref) {
            $ref = $this->reference($ref);
            $row = $this->requireShipment($store, $ref);
            if ($request->getMethod() === 'PUT') {
                if ($row['order_id'] !== null) {
                    $this->requireOrder($store, $row['order_id']);
                }
                $store->update($ref, ShipmentData::read((array) $request->getParsedBody()));
                $row = $this->requireShipment($store, $ref);
            }
            return Response::success($row);
        });
    }

    public function import(string $ref): ResponseInterface
    {
        return $this->respond(function (ShipmentStore $store) use ($ref) {
            $ref = $this->reference($ref);
            $row = $this->requireShipment($store, $ref);
            if ($row['imported']) {
                return Response::success($row);
            }
            $config = MiCorreo::configuration();
            if (!$config) {
                throw new DomainException('Activá MiCorreo en Configuración antes de preparar el envío.');
            }
            if (!$store->claim($ref)) {
                throw new DomainException('El envío está en preparación o ya tiene un rótulo.');
            }
            $imported = false;
            try {
                $row = $this->requireShipment($store, $ref);
                $order = $row['order_id'] === null ? null : $this->requireOrder($store, $row['order_id']);
                $payload = ShipmentData::carrierPayload($row['data'], $ref, $order['numero_pedido'] ?? null);
                MiCorreo::importShipment($config, $payload);
                $imported = true;
            } finally {
                $store->finish($ref, $imported);
            }
            return Response::success($this->requireShipment($store, $ref));
        });
    }

    public function label(ServerRequestInterface $request, ResponseInterface $response, string $ref): ResponseInterface
    {
        return $this->respond(function (ShipmentStore $store) use ($request, $response, $ref) {
            $ref = $this->reference($ref);
            $row = $this->requireShipment($store, $ref);
            if ($request->getMethod() === 'GET') {
                $pdf = $store->label($ref);
                if ($pdf === null) {
                    return Response::error('Este envío todavía no tiene un rótulo guardado.', 404);
                }
                $response->getBody()->write($pdf);
                return $response->withHeader('Content-Type', 'application/pdf')
                    ->withHeader('Content-Disposition', 'attachment; filename="rotulo-' . $ref . '.pdf"')
                    ->withHeader('X-Content-Type-Options', 'nosniff');
            }
            if ($row['order_id'] !== null) {
                $this->requireOrder($store, $row['order_id']);
            }
            $body = (array) $request->getParsedBody();
            $tracking = strtoupper(trim((string) ($body['tracking'] ?? '')));
            $file = $request->getUploadedFiles()['pdf'] ?? null;
            if (!preg_match('/^[A-Z0-9-]{8,80}$/D', $tracking) || str_starts_with($tracking, 'TN-')) {
                throw new InvalidArgumentException('Ingresá el número de seguimiento emitido por Correo Argentino.');
            }
            if (!$file instanceof \Psr\Http\Message\UploadedFileInterface || $file->getError() !== UPLOAD_ERR_OK
                || ($file->getSize() ?? 0) < 8 || $file->getSize() > 4 * 1024 * 1024) {
                throw new InvalidArgumentException('Adjuntá el rótulo PDF de MiCorreo de hasta 4 MB.');
            }
            $pdf = $file->getStream()->getContents();
            if (!str_starts_with($pdf, '%PDF-') || !str_contains(substr($pdf, -4096), '%%EOF')) {
                throw new InvalidArgumentException('El archivo no es un PDF válido.');
            }
            $store->attachLabel($ref, $tracking, $pdf);
            return Response::success($this->requireShipment($store, $ref));
        });
    }

    private function reference(mixed $value): string
    {
        $ref = is_string($value) ? strtoupper(trim($value)) : '';
        if (!preg_match('/^[A-F0-9]{20}$/D', $ref)) {
            throw new InvalidArgumentException('Ingresá la referencia del envío que aparece en WhatsApp.');
        }
        return $ref;
    }

    private function requireShipment(ShipmentStore $store, string $ref): array
    {
        return $store->find('ref', $ref) ?? throw new DomainException('El envío no existe o la referencia venció.');
    }

    private function requireOrder(ShipmentStore $store, int $id): array
    {
        $order = $store->order($id);
        if (!$order || $order['estado'] === 'anulado') {
            throw new DomainException('El pedido no está disponible para preparar un envío.');
        }
        return $order;
    }

    private function respond(callable $action): ResponseInterface
    {
        try {
            $response = $action(new ShipmentStore($this->db));
        } catch (InvalidArgumentException $error) {
            $response = Response::error($error->getMessage(), 422);
        } catch (DomainException $error) {
            $response = Response::error($error->getMessage(), 409);
        } catch (PDOException $error) {
            $response = (string) $error->getCode() === '23000'
                ? Response::error('El pedido ya tiene una ficha de envío. Actualizá la página.', 409)
                : Response::error('No se pudo guardar o recuperar el envío.', 500);
        } catch (RuntimeException $error) {
            $response = Response::error($error->getMessage(), 502);
        }
        return $response->withHeader('Cache-Control', 'private, no-store');
    }
}