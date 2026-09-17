<?php
header('Content-Type: text/plain; charset=utf-8');
echo "=== PHP VERSION ===\n" . PHP_VERSION . "\n\n";
echo "=== MEMORY LIMIT ===\n" . ini_get('memory_limit') . "\n";
echo "=== MAX EXEC TIME ===\n" . ini_get('max_execution_time') . "\n";
echo "=== EXTENSIONS ===\n" . implode(', ', get_loaded_extensions()) . "\n";
echo "=== OPCACHE ===\n" . "enable: " . ini_get('opcache.enable') . "\n";
echo "validate_timestamps: " . ini_get('opcache.validate_timestamps') . "\n";
?>
