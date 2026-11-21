<?php

declare(strict_types=1);

namespace OpenAiDiagnostics;

final class RequestLog
{
    private const MAX_FILE_BYTES = 5 * 1024 * 1024;

    public static function operationId(): string
    {
        try {
            return bin2hex(random_bytes(12));
        } catch (\Throwable $error) {
            return uniqid('', true);
        }
    }

    public static function execute(
        \CurlHandle $request,
        string $system,
        string $feature,
        string $endpoint,
        string $model,
        ?string $operationId = null
    ): array {
        $requestId = null;
        curl_setopt($request, CURLOPT_HEADERFUNCTION, static function ($handle, string $header) use (&$requestId): int {
            if (stripos($header, 'x-request-id:') === 0) {
                $requestId = trim(substr($header, strlen('x-request-id:')));
            }
            return strlen($header);
        });

        $body = curl_exec($request);
        $status = (int) curl_getinfo($request, CURLINFO_HTTP_CODE);
        $duration = (float) curl_getinfo($request, CURLINFO_TOTAL_TIME);
        $curlErrorNumber = curl_errno($request);
        $curlError = curl_error($request);
        curl_close($request);
        $decoded = is_string($body) ? json_decode($body, true) : null;

        try {
            $usage = $decoded['usage'] ?? [];
            $event = [
                'timestamp_utc' => (new \DateTimeImmutable('now', new \DateTimeZone('UTC')))->format('Y-m-d\TH:i:s.v\Z'),
                'system' => $system,
                'feature' => self::identifier($feature) ?? 'other',
                'endpoint' => $endpoint,
                'operation_id' => self::identifier($operationId) ?? self::operationId(),
                'openai_request_id' => self::identifier($requestId),
                'model' => self::identifier($model),
                'response_model' => self::identifier($decoded['model'] ?? null),
                'duration_ms' => (int) round($duration * 1000),
                'http_status' => $status ?: null,
                'curl_errno' => $curlErrorNumber ?: null,
                'error_code' => self::identifier($decoded['error']['code'] ?? null),
                'error_type' => self::identifier($decoded['error']['type'] ?? null),
                'input_tokens' => self::tokenCount($usage['input_tokens'] ?? $usage['prompt_tokens'] ?? null),
                'cached_input_tokens' => self::tokenCount(
                    $usage['input_tokens_details']['cached_tokens'] ?? $usage['prompt_tokens_details']['cached_tokens'] ?? null
                ),
                'output_tokens' => self::tokenCount($usage['output_tokens'] ?? $usage['completion_tokens'] ?? null),
                'reasoning_tokens' => self::tokenCount(
                    $usage['output_tokens_details']['reasoning_tokens'] ?? $usage['completion_tokens_details']['reasoning_tokens'] ?? null
                ),
                'total_tokens' => self::tokenCount($usage['total_tokens'] ?? null),
            ];
            self::append($system, json_encode($event, JSON_THROW_ON_ERROR) . "\n");
        } catch (\Throwable $error) {
            // Diagnostics must never interrupt the application.
        }

        return [$body, $status, $curlError, $decoded];
    }

    private static function identifier($value): ?string
    {
        if (!is_string($value) || str_starts_with($value, 'sk-') || !preg_match('/\A[\w.:-]{1,120}\z/D', $value)) {
            return null;
        }
        return $value;
    }

    private static function tokenCount($value): ?int
    {
        return is_int($value) && $value >= 0 ? $value : null;
    }

    private static function append(string $system, string $line): void
    {
        $base = getenv('OPENAI_REQUEST_LOG_DIR') ?: sys_get_temp_dir();
        $directory = rtrim($base, '/\\') . DIRECTORY_SEPARATOR . 'openai-' . $system . '-' . substr(hash('sha256', __DIR__), 0, 16);
        $parent = @realpath($base);
        $documentRoot = empty($_SERVER['DOCUMENT_ROOT']) ? false : @realpath($_SERVER['DOCUMENT_ROOT']);
        if ($parent === false || is_link($directory)) {
            return;
        }
        if ($documentRoot !== false) {
            $basePath = rtrim(str_replace('\\', '/', $parent), '/') . '/';
            $publicPath = rtrim(str_replace('\\', '/', $documentRoot), '/') . '/';
            if (strncasecmp($basePath, $publicPath, strlen($publicPath)) === 0) {
                return;
            }
        }
        if (!is_dir($directory) && !@mkdir($directory, 0700) && !is_dir($directory)) {
            return;
        }

        $current = $directory . DIRECTORY_SEPARATOR . 'requests.jsonl';
        $previous = $current . '.1';
        $lockPath = $directory . DIRECTORY_SEPARATOR . 'write.lock';
        if (is_link($current) || is_link($previous) || is_link($lockPath)) {
            return;
        }
        $lock = @fopen($lockPath, 'c');
        if ($lock === false) {
            return;
        }

        try {
            if (!@flock($lock, LOCK_EX)) {
                return;
            }
            clearstatcache(true, $current);
            $size = @filesize($current);
            if ($size !== false && $size + strlen($line) > self::MAX_FILE_BYTES) {
                if (is_file($previous) && !@unlink($previous)) {
                    return;
                }
                if (!@rename($current, $previous)) {
                    return;
                }
            }
            @file_put_contents($current, $line, FILE_APPEND);
        } finally {
            fclose($lock);
        }
    }
}
