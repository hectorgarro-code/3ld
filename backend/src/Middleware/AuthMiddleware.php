<?php

declare(strict_types=1);

namespace App\Middleware;

use App\Helpers\Response as ApiResponse;
use Firebase\JWT\JWT;
use Firebase\JWT\Key;
use Firebase\JWT\ExpiredException;
use Firebase\JWT\SignatureInvalidException;
use Psr\Http\Message\ResponseInterface;
use Psr\Http\Message\ServerRequestInterface;
use Psr\Http\Server\MiddlewareInterface;
use Psr\Http\Server\RequestHandlerInterface;
use Throwable;

class AuthMiddleware implements MiddlewareInterface
{
    private array $config;

    public function __construct(array $config)
    {
        $this->config = $config;
    }

    public function process(ServerRequestInterface $request, RequestHandlerInterface $handler): ResponseInterface
    {
        // Skip auth check for preflight requests
        if ($request->getMethod() === 'OPTIONS') {
            return $handler->handle($request);
        }

        $authHeader = $request->getHeaderLine('Authorization');

        if (empty($authHeader) || !str_starts_with($authHeader, 'Bearer ')) {
            return ApiResponse::error('Token de autenticación requerido', 401);
        }

        $token = substr($authHeader, 7);

        try {
            $secret  = $this->config['jwt']['secret'];
            $decoded = JWT::decode($token, new Key($secret, 'HS256'));
            $user    = (array) $decoded;

            // Attach decoded user to the request
            $request = $request->withAttribute('user', $user);

            return $handler->handle($request);
        } catch (ExpiredException $e) {
            return ApiResponse::error('Token expirado', 401);
        } catch (SignatureInvalidException $e) {
            return ApiResponse::error('Token inválido', 401);
        } catch (Throwable $e) {
            return ApiResponse::error('Token inválido: ' . $e->getMessage(), 401);
        }
    }
}
