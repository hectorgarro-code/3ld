# Informe de abandono del carrito

Acceso privado: Ventas → Visitas y Métricas → Embudo y abandono del carrito. Comparte el período seleccionado y la actualización automática de las métricas.

Unidad: sesión diaria existente. El carrito se reconoce por su estado medido, incluyendo un carrito guardado que se retoma. Se cuenta una vez por paso. Compra web confirmada: pedido vinculado a esa sesión al generar preferencia, con estado Mercado Pago aprobado e importe positivo en la BD. Un evento público o un parámetro de retorno no confirma compra.

Sin compra web registrada: carrito con artículos, media hora sin actividad, sin compra aprobada vinculada, sin pago realmente pendiente o revertido y sin clic de coordinación por WhatsApp. Se separa antes/después de iniciar pago. No demuestra venta perdida: podría terminar fuera de la web, en otro dispositivo o posteriormente. WhatsApp mide el clic; no acredita envío de mensaje ni venta.

Tasa: sin compra registrada / (sin compra registrada + sesiones con compra aprobada vinculada). Se excluyen sesiones activas, carritos vaciados, WhatsApp y pagos pendientes/revertidos. Denominador cero se muestra sin base, no cero por ciento. Los filtros de bots y personal existentes se conservan. Errores de pago son sesiones con fallo registrado al intentar iniciar el checkout, no todos los rechazos bancarios.

La medición nueva empieza con esta actualización; no reconstruye el pasado. El origen procede de utm_source o referencia y se agrupa sin exponer contactos ni URLs. No genera mensajes, recuperaciones automáticas ni anuncios.

Tabla privada adicional: tienda_checkout_sesiones, creada automáticamente; SQL equivalente en database/update_embudo_carritos.sql. Incluirla en respaldos habituales. No altera pedidos ni pagos. Si falla la medición, el pago continúa y el informe se presenta como no disponible cuando corresponda. No cambia los eventos Purchase de GA4/Meta ni genera ventas para pruebas.

Pruebas: backend/tests/cart-funnel.php (SQLite temporal y cálculo de estados/tasas), frontend/tests/cart-tracking.cjs (privacidad/deduplicación/identidad) y regresiones de comercio. Se requiere una compra real controlada para completar la validación de extremo a extremo; no se simulan compras en producción.
