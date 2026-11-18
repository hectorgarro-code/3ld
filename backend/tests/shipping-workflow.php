<?php

declare(strict_types=1);

namespace App\Services {
    final class MiCorreo
    {
        public static array $imports = [];

        public static function configuration(): array
        {
            return ['customer_id' => 'fixture'];
        }

        public static function importShipment(array $config, array $shipment): void
        {
            self::$imports[] = $shipment;
        }
    }
}

namespace {
    require __DIR__ . '/../vendor/autoload.php';

    use App\Controllers\ShippingController;
    use App\Services\MiCorreo;
    use App\Services\ShipmentStore;
    use Slim\Psr7\Factory\ServerRequestFactory;
    use Slim\Psr7\Factory\StreamFactory;
    use Slim\Psr7\Factory\UploadedFileFactory;
    use Slim\Psr7\Response;

    function verify(bool $condition, string $label): void
    {
        if (!$condition) {
            throw new RuntimeException($label);
        }
        echo "OK: $label\n";
    }

    $db = new PDO('sqlite::memory:', null, null, [PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION]);
    $db->exec('CREATE TABLE clientes (id INTEGER, nombre TEXT, email TEXT, telefono TEXT);
        CREATE TABLE pedidos (id INTEGER, cliente_id INTEGER, estado TEXT, numero_pedido TEXT);
        INSERT INTO clientes VALUES (1, "Cliente de prueba", "cliente@example.test", "2990000000");
        INSERT INTO pedidos VALUES (10, 1, "aprobado", "PRUEBA-10"), (11, 1, "aprobado", "PRUEBA-11"), (12, 1, "anulado", "PRUEBA-12")');

    $driver = new ShippingController($db);
    $requests = new ServerRequestFactory();
    $request = $requests->createServerRequest('POST', '/');
    $recipient = [
        'name' => 'Destinataria de prueba', 'email' => 'destinataria@example.test', 'phone' => '+54 299 000 0000',
        'street' => 'Calle de prueba', 'number' => '123', 'city' => 'Neuquén', 'province' => 'Q',
        'postal_code' => 'q8300aaa', 'reference' => 'Portón de prueba',
    ];
    $missing = $driver->whatsapp($request->withParsedBody(array_replace($recipient, ['street' => ''])));
    verify($missing->getStatusCode() === 422, 'El borrador de WhatsApp exige domicilio completo');
    $draft = $driver->whatsapp($request->withParsedBody($recipient + ['weight' => 12000, 'declared_value' => 5]));
    $public = json_decode((string) $draft->getBody(), true)['data'];
    verify($draft->getStatusCode() === 201 && array_keys($public) === ['ref'], 'El endpoint público devuelve únicamente una referencia');
    verify($draft->getHeaderLine('Cache-Control') === 'private, no-store', 'El borrador no se cachea');
    $ref = $public['ref'];

    $linked = $driver->order($request->withParsedBody(['ref' => $ref]), 10);
    $linkedData = json_decode((string) $linked->getBody(), true)['data']['shipment'];
    verify($linkedData['order_id'] === 10 && $linkedData['data']['postal_code'] === 'Q8300AAA', 'Recupera el domicilio y vincula el borrador al pedido');
    verify($linkedData['data']['weight'] === '', 'El borrador público no fija valores del paquete');
    verify($driver->order($request->withParsedBody(['ref' => $ref]), 11)->getStatusCode() === 409, 'Impide reutilizar una referencia en otro pedido');
    verify($driver->order($request->withParsedBody(['ref' => $ref]), 12)->getStatusCode() === 409, 'Impide vincular a un pedido anulado');

    verify($driver->import($ref)->getStatusCode() === 422 && !MiCorreo::$imports, 'Valida el paquete antes de transmitirlo al Correo');
    $parcel = ['weight' => 650, 'height' => 12, 'width' => 20, 'length' => 25, 'declared_value' => 1000];
    $edit = $requests->createServerRequest('PUT', '/')->withParsedBody($recipient + $parcel);
    verify($driver->shipment($edit, $ref)->getStatusCode() === 200, 'Guarda medidas y datos de entrega');
    verify($driver->import($ref)->getStatusCode() === 200 && $driver->import($ref)->getStatusCode() === 200, 'La importación puede consultarse o repetirse con seguridad');
    verify(count(MiCorreo::$imports) === 1 && MiCorreo::$imports[0]['extOrderId'] === $ref
        && MiCorreo::$imports[0]['shipping']['address']['provinceCode'] === 'Q', 'Transmite una sola vez y conserva la referencia externa');
    verify($driver->shipment($edit, $ref)->getStatusCode() === 409, 'Bloquea la edición de datos ya importados');

    $fileFactory = new UploadedFileFactory();
    $streamFactory = new StreamFactory();
    $makeFile = static fn (string $body) => $fileFactory->createUploadedFile(
        $streamFactory->createStream($body), strlen($body), UPLOAD_ERR_OK, 'rotulo.pdf', 'application/pdf'
    );
    $invalidLabel = $request->withParsedBody(['tracking' => 'TN-202600012345'])->withUploadedFiles(['pdf' => $makeFile('invalid')]);
    verify($driver->label($invalidLabel, new Response(), $ref)->getStatusCode() === 422, 'Rechaza el seguimiento interno simulado');
    $pdf = "%PDF-1.4\n%fixture\n%%EOF";
    $label = $request->withParsedBody(['tracking' => 'PRUEBA0000001'])->withUploadedFiles(['pdf' => $makeFile($pdf)]);
    verify($driver->label($label, new Response(), $ref)->getStatusCode() === 200, 'Guarda el PDF provisto y el seguimiento conjuntamente');
    $download = $driver->label($requests->createServerRequest('GET', '/'), new Response(), $ref);
    verify((string) $download->getBody() === $pdf && $download->getHeaderLine('Content-Type') === 'application/pdf', 'Descarga exactamente el PDF almacenado');

    $manual = $driver->manual($request->withParsedBody(array_replace($recipient + $parcel, ['delivery' => 'S', 'agency' => 'b0107'])));
    $manualRef = json_decode((string) $manual->getBody(), true)['data']['ref'];
    verify($driver->import($manualRef)->getStatusCode() === 200
        && MiCorreo::$imports[1]['shipping']['agency'] === 'B0107', 'Envía a sucursal desde una ficha manual');
    $expired = (new ShipmentStore($db))->create([], 'whatsapp')['ref'];
    $db->prepare('UPDATE envios_3ld SET expira = 1 WHERE ref = ?')->execute([$expired]);
    verify($driver->shipment($requests->createServerRequest('GET', '/'), $expired)->getStatusCode() === 409, 'Los borradores vencidos quedan inaccesibles');
}