# Medición publicitaria 3LD — 9/11/2026

Cuenta publicitaria: 3974051066243771. Página: 207393749128013. Portfolio: 1283532473004666.
Pixel existente: 612576675192830. GA4 existente: G-WD1S1HMZGV. No se crean propiedades duplicadas.

## Configuración aplicada al código

- UTM de última campaña explícita conservada hasta 30 días en el navegador; no se guardan contactos ni click IDs en esa atribución. Tráfico directo conserva la campaña; una fuente explícita nueva la reemplaza.
- Metadatos de campaña en los eventos internos, capturados antes de la tarea asíncrona para conservar el origen de un clic que abandona la página.
- Panel privado por fuente/medio/campaña/anuncio: sesiones, vistas, carrito, clic a WhatsApp, inicio de pago y pedidos web aprobados con importe. Última campaña observada antes del checkout. Cada pedido se atribuye una sola vez; no depende de un evento público de compra.
- Pixel excluye staff, panel privado, previsualización y opt-out también en su inicialización.
- WhatsAppClick en Meta y whatsapp_click en GA4 identifican intención de abrir chat. Nunca son Lead ni Purchase. El panel aclara que no acreditan mensaje ni venta.
- Endpoint de seguimiento devuelve tracked:false si falla el almacenamiento.
- Se conservan Pixel/GA4/CAPI existentes y sus IDs estables de compra order_ID. No se generan compras de prueba en producción.

## Etiquetas creadas para consultas

Campaña: 3LD | Egresados 2026, 3LD | Navidad Kawaii.
Etapas excluyentes: 3LD | Consulta nueva, 3LD | Cotizado, 3LD | Pendiente de pago, 3LD | Pagado, 3LD | Entregado, 3LD | No concretado.
Aplicar campaña según anuncio/mensaje de origen; marcar Pagado sólo tras verificar acreditación. Etiquetar una conversación no la informa automáticamente como compra al sistema ni a Meta.

Condiciones del servicio de contactos aceptadas con autorización explícita del usuario. Se verificaron las ocho etiquetas creadas en Meta Business Suite para la página 3LD; no se asignaron a conversaciones históricas sin evidencia. El portfolio no tenía cuenta de WhatsApp agregada; enlace iniciado con +54 9 2257 55-9540 y verificación enviada a la app; falta que el usuario complete la verificación.

## Enlaces de sitio etiquetados

Estos enlaces sirven para piezas que lleven a la tienda. Los anuncios actuales abren WhatsApp directamente: las UTM del sitio no miden sus conversaciones.

- Egresados A: https://3ld.com.ar/?producto=114&utm_source=instagram&utm_medium=paid_social&utm_campaign=egresados_2026&utm_content=eg26_a&utm_id=120254835594820471
- Egresados B: https://3ld.com.ar/?producto=114&utm_source=instagram&utm_medium=paid_social&utm_campaign=egresados_2026&utm_content=eg26_b&utm_id=120254835594820471
- Navidad A: https://3ld.com.ar/?utm_source=instagram&utm_medium=paid_social&utm_campaign=navidad_kawaii_2026&utm_content=nav26_a&utm_id=120254835894900471
- Navidad B: https://3ld.com.ar/?utm_source=instagram&utm_medium=paid_social&utm_campaign=navidad_kawaii_2026&utm_content=nav26_b&utm_id=120254835894900471

Cambiar utm_source a facebook en enlaces de Facebook. No reutilizar la misma fuente en ambos canales. No se cambiaron los destinos de los borradores publicitarios.

## Límites y pendientes de Meta

Meta confirmó actividad del Pixel: PageView, ViewContent, AddToCart e InitiateCheckout. La vista revisada no mostró Purchase ni integración CAPI activa. El código local tiene CAPI, pero no un token configurado. El usuario autorizó expresamente generar un token persistente y enviar a Meta importe, productos y email/teléfono/nombre con hash al aprobarse el pago. Se incorporó un panel administrativo para validar el acceso al píxel y guardar el token sólo en el servidor; el estado final de activación debe comprobarse en ese panel. La configuración local no demuestra el estado del secreto del servidor de producción.

El panel no importa gasto, impresiones ni conversaciones directas de Meta y no calcula ROAS. Pedidos por transferencia/WhatsApp sin vínculo al checkout web quedan fuera. No reconstruye datos de campaña ausentes. Una compra real controlada es necesaria para cerrar la validación de extremo a extremo; las pruebas automatizadas no envían eventos ni cobran.

## Pruebas

Build TypeScript/Vite, campaign-attribution.cjs, campaign-report.php, cart-tracking.cjs, cart-funnel.php, commerce-regression.cjs, commerce-regression.php y meta-capi-contract.php. La fixture antigua de catálogo se actualizó para incluir las columnas de categorías y la condición es_vendible requeridas por el repositorio actual; sin modificar lógica de catálogo.

## Administración privada de CAPI

Configuración → Conversiones de Meta — 3LD. Sólo rol admin: GET/POST /api/v1/config/meta-capi. El secreto no se devuelve y las respuestas llevan private, no-store. El token se valida enviando un PageView sintético exclusivamente con el código TEST del administrador de eventos. No se envían compras ni datos de clientes para probar. Este código de prueba no se conserva en la configuración activa; las compras reales siguen el modo normal. Guardado atómico en backend/public/uploads/.3ld-private/meta-capi.php (archivo PHP sin salida pública, directorio protegido por .htaccess, ignorado en git y excluido en ambos destinos FTP por la exclusión existente de uploads). CAPI puede desactivarse aunque el token haya sido revocado. El estado configurado no acredita todavía una compra recibida: requiere un pago real y su recepción en Meta. Pruebas adicionales: backend/tests/meta-tracking-config.php.

Validación en producción: se detectaron collations distintas entre tablas históricas de sesiones y atribución de checkout. El informe compara identificadores anónimos de forma binaria exacta para evitar el error 1267, sin alterar registros ni migrar tablas. Se retiró el diagnóstico SQL temporal del panel tras identificar la causa.
