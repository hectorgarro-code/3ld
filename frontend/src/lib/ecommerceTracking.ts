/** Capa de datos GA4; no carga etiquetas ni envía datos a terceros por sí sola. */
type Item = { id?: string | number; producto_id?: string | number; title?: string; nombre?: string; descripcion?: string; price?: number | string; precio_unit?: number | string; qty?: number; cantidad?: number };
type Order = { id?: string | number; mercadopago_status?: string; total?: number | string; items?: Item[] };
declare global { interface Window { dataLayer?: unknown[] } }
const emitted = new Set<string>();
const numeric = (value: unknown) => Number.isFinite(Number(value)) ? Number(value) : 0;
const items = (values: Item[]) => values.filter(i => (i.producto_id ?? i.id) != null).map(i => ({
  item_id: `3LD_${String(i.producto_id ?? i.id).replace(/^3LD_|^p-/, '')}`,
  item_name: i.title || i.nombre || i.descripcion || '',
  price: numeric(i.precio_unit ?? i.price), quantity: Math.max(1, numeric(i.cantidad ?? i.qty ?? 1)),
}));
function emit(event: string, ecommerce: Record<string, unknown>) {
  if (typeof window === 'undefined') return;
  try {
    const staff = JSON.parse(localStorage.getItem('3ld-auth-storage') || 'null');
    if (staff?.state?.isAuthenticated || staff?.state?.token || localStorage.getItem('3ld_analytics_opt_out') === 'true') return;
  } catch { /* Sin almacenamiento, el evento local puede continuar. */ }
  window.dataLayer = window.dataLayer || [];
  window.dataLayer.push({ ecommerce: null });
  if (window.gtag) window.gtag('event', event, ecommerce);
  else window.dataLayer.push({ event, ecommerce });
  return true;
}
export const ecommerceTracking = {
  viewItem(item: Item) { emit('view_item', { currency: 'ARS', value: numeric(item.price), items: items([item]) }); },
  addToCart(item: Item, quantity = 1) { emit('add_to_cart', { currency: 'ARS', value: numeric(item.price) * quantity, items: items([{ ...item, qty: quantity }]) }); },
  beginCheckout(cart: Item[], value: number) { emit('begin_checkout', { currency: 'ARS', value: numeric(value), items: items(cart) }); },
  purchase(order: Order) {
    if (order.mercadopago_status !== 'approved' || !Number.isSafeInteger(Number(order.id)) || Number(order.id) <= 0 || numeric(order.total) <= 0) return;
    const id = `order_${order.id}`;
    if (emitted.has(id)) return;
    const productItems = items(order.items || []);
    const value = productItems.reduce((sum, i) => sum + i.price * i.quantity, 0);
    if (emit('purchase', { transaction_id: id, currency: 'ARS', value,
      shipping: Math.max(0, numeric(order.total) - value), items: productItems })) emitted.add(id);
  },
};
