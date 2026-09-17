<?php

declare(strict_types=1);

namespace App\Helpers;

use Psr\Http\Message\ResponseInterface;
use Slim\Psr7\Response as SlimResponse;

class Response
{
    /**
     * Return a successful JSON response.
     */
    public static function success(mixed $data, int $status = 200): ResponseInterface
    {
        $payload = [
            'success' => true,
            'data'    => $data,
        ];

        return self::json($payload, $status);
    }

    /**
     * Return an error JSON response.
     */
    public static function error(string $message, int $status = 400, mixed $errors = null): ResponseInterface
    {
        $payload = [
            'success' => false,
            'message' => $message,
        ];

        if ($errors !== null) {
            $payload['errors'] = $errors;
        }

        return self::json($payload, $status);
    }

    /**
     * Return a paginated JSON response.
     */
    public static function paginated(array $data, int $total, int $page, int $perPage): ResponseInterface
    {
        $lastPage = (int) ceil($total / max($perPage, 1));

        $payload = [
            'success' => true,
            'data'    => $data,
            'meta'    => [
                'total'       => $total,
                'page'        => $page,
                'per_page'    => $perPage,
                'last_page'   => $lastPage,
                'from'        => ($page - 1) * $perPage + 1,
                'to'          => min($page * $perPage, $total),
            ],
        ];

        return self::json($payload, 200);
    }

    /**
     * Build a PSR-7 JSON response.
     */
    private static function json(array $payload, int $status): ResponseInterface
    {
        $response = new SlimResponse($status);
        $response->getBody()->write(
            json_encode($payload, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES)
        );

        return $response->withHeader('Content-Type', 'application/json');
    }
}
