<?php

declare(strict_types=1);

namespace App;

use PDO;
use PDOException;

class Database
{
    private static ?PDO $instance = null;
    private array $config;

    public function __construct(array $config)
    {
        $this->config = $config;
    }

    public function getConnection(): PDO
    {
        if (self::$instance === null) {
            $host    = $this->config['db']['host'];
            $dbname  = $this->config['db']['dbname'];
            $charset = $this->config['db']['charset'] ?? 'utf8mb4';
            $user    = $this->config['db']['user'];
            $pass    = $this->config['db']['pass'];

            $dsn = "mysql:host={$host};dbname={$dbname};charset={$charset}";

            $options = [
                PDO::ATTR_ERRMODE            => PDO::ERRMODE_EXCEPTION,
                PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
                PDO::ATTR_EMULATE_PREPARES   => true,
                PDO::MYSQL_ATTR_INIT_COMMAND => "SET NAMES {$charset} COLLATE utf8mb4_unicode_ci",
            ];

            try {
                self::$instance = new PDO($dsn, $user, $pass, $options);
                self::ensureSchema(self::$instance);
            } catch (PDOException $e) {
                throw new PDOException(
                    'Error al conectar con la base de datos: ' . $e->getMessage(),
                    (int) $e->getCode()
                );
            }
        }

        return self::$instance;
    }

    private static function ensureSchema(PDO $db): void
    {
        try {
            $db->exec("ALTER TABLE productos ADD COLUMN archivo_url VARCHAR(500) NULL");
        } catch (\Throwable $e) {
            // Se ignora si la columna ya existe
        }
        try {
            $db->exec("CREATE TABLE IF NOT EXISTS producto_recetas (
                id INT AUTO_INCREMENT PRIMARY KEY,
                producto_id INT NOT NULL,
                insumo_id INT NOT NULL,
                cantidad DECIMAL(10,4) NOT NULL DEFAULT 1.0000,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4");
        } catch (\Throwable $e) {
            // Se ignora si ya existe
        }
        try {
            $db->exec("ALTER TABLE productos ADD COLUMN imagenes TEXT NULL");
        } catch (\Throwable $e) {
            // Se ignora si la columna ya existe
        }
        try {
            $db->exec("ALTER TABLE categorias_producto ADD COLUMN icono VARCHAR(50) NULL DEFAULT '✨'");
        } catch (\Throwable $e) {
            // Se ignora si ya existe
        }
        try {
            $db->exec("ALTER TABLE categorias_producto ADD COLUMN es_destacada TINYINT(1) NOT NULL DEFAULT 0");
        } catch (\Throwable $e) {
            // Se ignora si ya existe
        }
        try {
            $db->exec("ALTER TABLE pedidos ADD COLUMN saldo_pendiente DECIMAL(12,2) NOT NULL DEFAULT 0.00");
        } catch (\Throwable $e) {
            // Se ignora si ya existe
        }
        try {
            $db->exec("ALTER TABLE productos ADD COLUMN horas_impresion DECIMAL(8,2) NOT NULL DEFAULT 0.00");
        } catch (\Throwable $e) {
            // Se ignora si ya existe
        }
        try {
            $db->exec("ALTER TABLE productos ADD COLUMN peso_gramos INT NOT NULL DEFAULT 0");
        } catch (\Throwable $e) {
            // Se ignora si ya existe
        }
        try {
            $db->exec("ALTER TABLE productos ADD COLUMN alto_mm DECIMAL(8,2) NOT NULL DEFAULT 0.00");
        } catch (\Throwable $e) {
            // Se ignora si ya existe
        }
        try {
            $db->exec("ALTER TABLE productos ADD COLUMN ancho_mm DECIMAL(8,2) NOT NULL DEFAULT 0.00");
        } catch (\Throwable $e) {
            // Se ignora si ya existe
        }
        try {
            $db->exec("ALTER TABLE productos ADD COLUMN profundidad_mm DECIMAL(8,2) NOT NULL DEFAULT 0.00");
        } catch (\Throwable $e) {
            // Se ignora si ya existe
        }
    }

    /**
     * Reset singleton (useful for testing)
     */
    public static function reset(): void
    {
        self::$instance = null;
    }
}
