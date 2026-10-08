<?php
declare(strict_types=1);

require_once __DIR__ . '/../vendor/autoload.php';
$config = require __DIR__ . '/../config/config.php';

try {
    $db = (new App\Database($config))->getConnection();
    echo "Conectado a la base de datos con éxito.\n";

    $openAiService = new App\Services\OpenAiService($config);

    // Obtener todos los productos
    $stmt = $db->query("SELECT id, nombre, descripcion, categoria_id, seo_title, seo_description FROM productos WHERE activo = 1 ORDER BY id ASC");
    $productos = $stmt->fetchAll(PDO::FETCH_ASSOC);

    echo "Total de productos a procesar: " . count($productos) . "\n";

    $stmtUpdate = $db->prepare("UPDATE productos SET seo_title = ?, seo_description = ? WHERE id = ?");

    $countUpdated = 0;
    foreach ($productos as $p) {
        $id = (int)$p['id'];
        $nombre = trim($p['nombre'] ?? '');
        $desc = trim($p['descripcion'] ?? '');
        
        // Obtener nombre de categoría si existe
        $catName = null;
        if (!empty($p['categoria_id'])) {
            $stmtC = $db->prepare("SELECT nombre FROM categorias_producto WHERE id = ?");
            $stmtC->execute([$p['categoria_id']]);
            $catName = $stmtC->fetchColumn() ?: null;
        }

        // Generar SEO con OpenAI o fallback inteligente
        $seo = $openAiService->generateProductSeo($nombre, $desc, $catName);

        $seoTitle = $seo['seo_title'];
        $seoDesc = $seo['seo_description'];

        $stmtUpdate->execute([$seoTitle, $seoDesc, $id]);
        $countUpdated++;

        echo "[$id] {$nombre}\n";
        echo "   -> SEO Title: {$seoTitle}\n";
        echo "   -> SEO Desc : {$seoDesc}\n\n";
    }

    echo "¡Completado con éxito! Se actualizaron {$countUpdated} productos con Título y Descripción SEO.\n";
} catch (\Throwable $e) {
    echo "Error: " . $e->getMessage() . "\n" . $e->getTraceAsString() . "\n";
    exit(1);
}
