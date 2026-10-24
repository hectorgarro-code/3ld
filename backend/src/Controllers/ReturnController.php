<?php
declare(strict_types=1);
namespace App\Controllers;
use App\Helpers\Response;
use App\Services\ReturnRequests;
use Psr\Http\Message\ServerRequestInterface;
use Psr\Http\Message\ResponseInterface;
final class ReturnController
{
    public function __construct(private ?\PDO $db = null) {}
    private function ledger(): \App\Services\ReturnLedger {
        $db=$this->db ?? (new \App\Database(require __DIR__.'/../../config/config.php'))->getConnection();
        $ledger=new \App\Services\ReturnLedger($db);
        $ledger->importLegacy(new ReturnRequests());
        return $ledger;
    }
    public function create(ServerRequestInterface $request, ResponseInterface $response): ResponseInterface {
        try {
            $entry = (new ReturnRequests())->create((array)$request->getParsedBody(),(string)($request->getServerParams()['REMOTE_ADDR'] ?? 'unknown'));
            try { $this->ledger(); } catch (\Throwable $e) { error_log('3LD: pendiente sincronizar una solicitud de devolución privada.'); }
            // La solicitud queda guardada incluso si el hosting no entrega el aviso por email.
            @mail('3lddidacticos@gmail.com','Solicitud de devolución '.$entry['id'],
                "Solicitud registrada. Revisar en el panel privado de 3LD.\nCódigo: ".$entry['id'],
                'From: 3LD <3lddidacticos@gmail.com>');
            return Response::success(['id'=>$entry['id'],'fecha'=>$entry['fecha']])->withHeader('Cache-Control','no-store');
        } catch (\InvalidArgumentException $e) { return Response::error($e->getMessage(),400); }
        catch (\OverflowException $e) { return Response::error($e->getMessage(),429); }
        catch (\Throwable $e) { return Response::error('No se pudo registrar. Escribí a 3lddidacticos@gmail.com o al WhatsApp 2257559540.',500); }
    }
    public function index(ServerRequestInterface $request, ResponseInterface $response): ResponseInterface {
        try { return Response::success($this->ledger()->all())->withHeader('Cache-Control','private, no-store'); }
        catch (\Throwable $e) { return Response::error('No se pudieron cargar las devoluciones.',500); }
    }

    public function register(ServerRequestInterface $request, ResponseInterface $response): ResponseInterface {
        return $this->save($request, fn($store,$body,$user)=>$store->create($body,$user));
    }
    public function movement(ServerRequestInterface $request, ResponseInterface $response, array $args): ResponseInterface {
        return $this->save($request, fn($store,$body,$user)=>$store->movement((string)$args['id'],$body,$user));
    }
    private function save(ServerRequestInterface $request, callable $action): ResponseInterface {
        try { return Response::success($action($this->ledger(),(array)$request->getParsedBody(),(array)$request->getAttribute('user')))->withHeader('Cache-Control','private, no-store'); }
        catch (\InvalidArgumentException $e) { return Response::error($e->getMessage(),422); }
        catch (\OutOfBoundsException $e) { return Response::error($e->getMessage(),404); }
        catch (\DomainException $e) { return Response::error($e->getMessage(),409); }
        catch (\Throwable $e) { return Response::error('No se pudo guardar el movimiento. Actualizá y revisá el historial antes de reintentar.',500); }
    }
}
