<?php

declare(strict_types=1);

namespace App\Controllers;

use App\Helpers\Response;
use App\Services\MiCorreo;
use InvalidArgumentException;
use RuntimeException;
use Psr\Http\Message\ResponseInterface;
use Psr\Http\Message\ServerRequestInterface;

final class MiCorreoController
{
    private function isAdmin(ServerRequestInterface $request): bool
    {
        return ($request->getAttribute('user')['rol'] ?? '') === 'admin';
    }

    public function status(ServerRequestInterface $request): ResponseInterface
    {
        if (!$this->isAdmin($request)) {
            return Response::error('Sólo administradores', 403);
        }
        $config = MiCorreo::configuration();
        return Response::success([
            'configured' => (bool) $config,
            'customer_id' => $config['customer_id'] ?? '',
            'origin' => $config['origin'] ?? '',
        ])->withHeader('Cache-Control', 'private, no-store');
    }

    public function save(ServerRequestInterface $request): ResponseInterface
    {
        if (!$this->isAdmin($request)) {
            return Response::error('Sólo administradores', 403);
        }
        $body = (array) $request->getParsedBody();
        $config = [
            'username' => trim((string) ($body['username'] ?? '')),
            'password' => (string) ($body['password'] ?? ''),
            'customer_id' => trim((string) ($body['customer_id'] ?? '')),
            'origin' => trim((string) ($body['origin'] ?? '')),
        ];
        if (!preg_match('/^[a-zA-Z0-9_.@-]{1,128}$/D', $config['username'])
            || strlen($config['password']) < 1 || strlen($config['password']) > 512
            || !preg_match('/^\d{10}$/D', $config['customer_id'])
            || !preg_match('/^\d{4}$/D', $config['origin'])) {
            return Response::error('Revisá las credenciales, el número de cliente y el código postal de origen.', 422);
        }
        $parcel = ['postal_code' => '1900', 'delivery' => 'D', 'weight' => 350, 'height' => 15, 'width' => 20, 'length' => 25];
        try {
            $test = MiCorreo::quote($config, $parcel);
            $this->writeConfig($config);
            return Response::success($test)->withHeader('Cache-Control', 'private, no-store');
        } catch (InvalidArgumentException | RuntimeException $e) {
            return Response::error($e->getMessage(), 422)->withHeader('Cache-Control', 'private, no-store');
        }
    }

    public function availability(): ResponseInterface
    {
        return Response::success(['configured' => (bool) MiCorreo::configuration()])
            ->withHeader('Cache-Control', 'private, no-store');
    }

    public function quote(ServerRequestInterface $request): ResponseInterface
    {
        $config = MiCorreo::configuration();
        if (!$config) {
            return Response::error('Pedile a un administrador que configure MiCorreo en Ajustes.', 503);
        }
        try {
            $quote = MiCorreo::quote($config, (array) $request->getParsedBody());
            return Response::success($quote)->withHeader('Cache-Control', 'private, no-store');
        } catch (InvalidArgumentException $e) {
            return Response::error($e->getMessage(), 422);
        } catch (RuntimeException $e) {
            return Response::error($e->getMessage(), 502);
        }
    }

    private function writeConfig(array $config): void
    {
        $path = MiCorreo::configPath();
        $dir = dirname($path);
        if (!is_dir($dir) && !@mkdir($dir, 0700, true) && !is_dir($dir)) {
            throw new RuntimeException('No se pudo crear el directorio privado de MiCorreo.');
        }
        if (!is_file($dir . '/.htaccess') && file_put_contents($dir . '/.htaccess', "Order deny,allow\nDeny from all\n", LOCK_EX) === false) {
            throw new RuntimeException('No se pudo proteger el directorio privado de MiCorreo.');
        }

        $temporary = $dir . '/.mi-correo-' . bin2hex(random_bytes(8)) . '.php';
        $contents = '<?php return ' . var_export($config, true) . ';';
        try {
            if (file_put_contents($temporary, '<?php', LOCK_EX) === false
                || !chmod($temporary, 0600)
                || file_put_contents($temporary, $contents, LOCK_EX) === false
                || !rename($temporary, $path)) {
                throw new RuntimeException('No se pudo guardar la configuración privada de MiCorreo.');
            }
            if (function_exists('opcache_invalidate')) {
                opcache_invalidate($path, true);
            }
        } finally {
            if (is_file($temporary)) {
                unlink($temporary);
            }
        }
    }
}