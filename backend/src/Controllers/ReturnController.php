<?php
declare(strict_types=1);
namespace App\Controllers;
use App\Helpers\Response;
use App\Services\ReturnRequests;
use Psr\Http\Message\ServerRequestInterface;
use Psr\Http\Message\ResponseInterface;
final class ReturnController
{
    public function create(ServerRequestInterface $request, ResponseInterface $response): ResponseInterface {
        try {
            $entry = (new ReturnRequests())->create((array)$request->getParsedBody(),(string)($request->getServerParams()['REMOTE_ADDR'] ?? 'unknown'));
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
        return Response::success((new ReturnRequests())->all())->withHeader('Cache-Control','private, no-store');
    }
}
