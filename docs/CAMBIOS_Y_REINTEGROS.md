# Cambios, devoluciones y reintegros

Acceso: menú Ventas → Cambios y reintegros, ruta privada `/devoluciones`.

1. Las solicitudes web ingresan automáticamente. Para WhatsApp o atención presencial, crear una ficha seleccionando el pedido, tipo, contacto y detalle de productos/cantidades.
2. Registrar contacto con lo acordado. Registrar recepción cuando se recibe el producto.
3. Para un cambio, registrar los productos y cantidades entregados en el detalle del movimiento. Para una devolución, efectuar primero el pago por el medio acordado y después registrar importe ARS, medio y referencia del comprobante.
4. Cerrar después de registrar entrega del cambio o reintegro. El historial conserva fecha y usuario de cada movimiento. Las fichas cerradas permiten notas aclaratorias.

El módulo registra hechos; no ejecuta reintegros, no cancela ventas, no ajusta stock y no envía mensajes al cliente. El límite de importes es el total del pedido, no una comprobación de fondos cobrados o del comprobante ante el banco. Revisar el comprobante antes de registrarlo. Una devolución parcial se documenta por su importe y detalle; el cierre es una decisión del operador.

Datos en tabla privada `tienda_devoluciones` de la misma conexión MySQL que pedidos. Creación automática al primer uso; SQL equivalente en `database/update_devoluciones.sql`. Incluir la tabla en el respaldo habitual de BD. Las instalaciones que comparten BD comparten fichas.

Solicitudes anteriores: se importan de `backend/var/return-requests` por ID, sin borrar los archivos. Cada instalación importa sus archivos al abrir una conexión de BD, y el controlador vuelve a sincronizarlos. Si falla la BD al recibir una solicitud pública, el archivo conserva el registro y la sincronización se reintenta en la siguiente conexión. Conservar esos archivos en los respaldos hasta comprobar la importación.

Guardas: API de gestión con JWT existente; estados validados en servidor; importes positivos con dos decimales; referencia obligatoria; límite acumulado de todas las fichas de un pedido; bloqueo de recepción duplicada; claves de operación para reintentos; versión para evitar sobrescrituras. Sin borrado de historial ni edición retroactiva de movimientos.

Validación: `php backend/tests/return-ledger.php`, `php backend/tests/return-requests.php`, lint de ReturnsPage y build del frontend. Pruebas con SQLite y archivos temporales, sin pagos ni solicitudes reales.
