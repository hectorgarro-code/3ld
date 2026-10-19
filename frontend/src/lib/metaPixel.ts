/**
 * Meta Pixel (Facebook Pixel) Helper para 3LD
 * Pixel ID: 612576675192830
 * Catálogo ID: 1765849554337234
 *
 * Características:
 * 1. Inicialización idempotente (nunca se carga 2 veces).
 * 2. Deduplicación inteligente de PageView y Purchase.
 * 3. Coincidencia exacta 1:1 con catalog.xml (formato '3LD_{id}').
 * 4. Aislamiento total: adblockers o fallas de red no interrumpen la experiencia del usuario.
 * 5. Soporte para deduplicación con Meta Conversions API (CAPI) mediante eventID.
 */

export const META_PIXEL_ID = '612576675192830';
export const META_CURRENCY = 'ARS';

export interface MetaFbq {
  (...args: unknown[]): void;
  loaded?: boolean;
  version?: string;
  queue?: unknown[];
  callMethod?: (...args: unknown[]) => void;
}

declare global {
  interface Window {
    fbq?: MetaFbq;
    _fbq?: unknown;
  }
}

let isInitialized = false;
let lastTrackedUrl = '';
let lastTrackedTime = 0;

/**
 * Normaliza el ID del producto para que coincida exactamente con <g:id>3LD_{id}</g:id> de catalog.xml
 */
export function formatCatalogId(id: string | number | undefined | null): string {
  if (id === undefined || id === null) return '';
  const str = String(id).trim();
  if (str.startsWith('3LD_')) return str;
  const cleanId = str.replace(/^p-/, '');
  return `3LD_${cleanId}`;
}

/**
 * Formatea un precio numérico sin formato de texto, símbolos o separadores extraños
 */
export function formatPrice(price: unknown): number {
  if (typeof price === 'number') {
    return isNaN(price) ? 0 : Number(price.toFixed(2));
  }
  if (!price) return 0;
  const cleaned = String(price).replace(/[^0-9.-]+/g, '');
  const parsed = parseFloat(cleaned);
  return isNaN(parsed) ? 0 : Number(parsed.toFixed(2));
}

/**
 * Ejecuta fbq de forma segura tolerando bloqueadores de publicidad y errores
 */
function safeFbq(...args: unknown[]): void {
  try {
    if (typeof window !== 'undefined' && window.fbq) {
      window.fbq(...args);
    }
  } catch {
    // Falla silenciosa garantizada para ad blockers
  }
}

/**
 * Verifica si el usuario actual es personal interno del sistema
 */
function isStaffUser(): boolean {
  try {
    if (typeof window === 'undefined') return false;
    const authData = localStorage.getItem('3ld-auth-storage');
    if (authData) {
      const parsed = JSON.parse(authData);
      if (parsed?.state?.isAuthenticated || parsed?.state?.token) {
        return true;
      }
    }
    const path = window.location.pathname.toLowerCase();
    if (path.startsWith('/pedidos') || path.startsWith('/pos') || path.startsWith('/clientes') || path.startsWith('/produccion')) {
      return true;
    }
  } catch {
    return false;
  }
  return false;
}

/**
 * Inicializa el snippet oficial de Meta Pixel una sola vez
 */
export function init(pixelId = META_PIXEL_ID): void {
  if (typeof window === 'undefined') return;

  if (isInitialized || window.fbq?.loaded) {
    isInitialized = true;
    return;
  }

  // Evitar duplicados si el script ya existe en el DOM
  if (document.querySelector('script[src*="fbevents.js"]')) {
    isInitialized = true;
    return;
  }

  try {
    /* eslint-disable */
    (function(f: any, b: any, e: any, v: any, n?: any, t?: any, s?: any) {
      if (f.fbq) return;
      n = f.fbq = function() {
        n.callMethod ? n.callMethod.apply(n, arguments) : n.queue.push(arguments);
      };
      if (!f._fbq) f._fbq = n;
      n.push = n;
      n.loaded = true;
      n.version = '2.0';
      n.queue = [];
      t = b.createElement(e);
      t.async = true;
      t.src = v;
      s = b.getElementsByTagName(e)[0];
      if (s && s.parentNode) {
        s.parentNode.insertBefore(t, s);
      } else {
        document.head.appendChild(t);
      }
    })(window, document, 'script', 'https://connect.facebook.net/en_US/fbevents.js');
    /* eslint-enable */

    safeFbq('init', pixelId);
    isInitialized = true;
  } catch {
    // Si falla la inyección (e.g. adblocker estricto), marcar como inicializado para no reintentar indefinidamente
    isInitialized = true;
  }
}

/**
 * Registra PageView con protección anti-duplicados para navegación SPA
 */
export function pageView(url?: string): void {
  if (isStaffUser()) return;

  const currentUrl = url || (typeof window !== 'undefined' ? window.location.href : '');
  const now = Date.now();

  // Deduplicar llamadas idénticas dentro de 1.5s
  if (currentUrl === lastTrackedUrl && now - lastTrackedTime < 1500) {
    return;
  }
  lastTrackedUrl = currentUrl;
  lastTrackedTime = now;

  safeFbq('track', 'PageView');
}

export interface MetaProduct {
  id: string | number;
  title?: string;
  nombre?: string;
  price?: number;
  precio_venta?: number;
  oldPrice?: number | null;
  category?: string;
}

/**
 * Evento ViewContent al entrar al detalle de un producto
 */
export function viewContent(product: MetaProduct): void {
  if (!product || isStaffUser()) return;

  const contentId = formatCatalogId(product.id);
  const name = product.title || product.nombre || '';
  const price = formatPrice(product.price ?? product.precio_venta);

  safeFbq('track', 'ViewContent', {
    content_ids: [contentId],
    content_type: 'product',
    content_name: name,
    value: price,
    currency: META_CURRENCY,
  });
}

/**
 * Evento AddToCart al agregar efectivamente un producto al carrito
 */
export function addToCart(product: MetaProduct, quantity = 1): void {
  if (!product || isStaffUser()) return;

  const contentId = formatCatalogId(product.id);
  const name = product.title || product.nombre || '';
  const unitPrice = formatPrice(product.price ?? product.precio_venta);
  const qty = Math.max(1, Number(quantity) || 1);
  const totalValue = Number((unitPrice * qty).toFixed(2));

  safeFbq('track', 'AddToCart', {
    content_ids: [contentId],
    content_type: 'product',
    content_name: name,
    value: totalValue,
    currency: META_CURRENCY,
    contents: [
      {
        id: contentId,
        quantity: qty,
        item_price: unitPrice,
      },
    ],
  });
}

export interface MetaCartItem {
  id: string | number;
  title?: string;
  price: number;
  qty: number;
}

/**
 * Evento InitiateCheckout al iniciar el proceso de checkout
 */
export function initiateCheckout(cart: MetaCartItem[], totalValue?: number): void {
  if (!cart || cart.length === 0 || isStaffUser()) return;

  const contentIds = cart.map((it) => formatCatalogId(it.id));
  const contents = cart.map((it) => {
    const unitPrice = formatPrice(it.price);
    const qty = Math.max(1, Number(it.qty) || 1);
    return {
      id: formatCatalogId(it.id),
      quantity: qty,
      item_price: unitPrice,
    };
  });

  const numItems = cart.reduce((acc, it) => acc + Math.max(1, Number(it.qty) || 1), 0);
  const calcTotal =
    totalValue !== undefined
      ? formatPrice(totalValue)
      : formatPrice(cart.reduce((acc, it) => acc + formatPrice(it.price) * (Number(it.qty) || 1), 0));

  safeFbq('track', 'InitiateCheckout', {
    content_ids: contentIds,
    contents: contents,
    num_items: numItems,
    value: calcTotal,
    currency: META_CURRENCY,
  });
}

export interface MetaOrderItem {
  id?: string | number;
  producto_id?: string | number;
  descripcion?: string;
  cantidad?: number;
  qty?: number;
  precio_unit?: number;
  price?: number;
  subtotal?: number;
}

export interface MetaOrder {
  id?: string | number;
  numero?: string;
  numero_pedido?: string;
  total: number;
  items?: MetaOrderItem[];
  mercadopago_status?: string;
}

/**
 * Evento Purchase: Se ejecuta ÚNICAMENTE tras una compra confirmada
 * Incluye eventID para deduplicación automática con Meta Conversions API (CAPI)
 */
export function purchase(order: MetaOrder): void {
  if (!order || isStaffUser()) return;

  const orderNum = order.numero || order.numero_pedido || String(order.id || '');
  if (!orderNum) return;

  // Deduplicación en almacenamiento local: Evita duplicar el evento si el usuario recarga la página
  const dedupeStorageKey = `3ld_meta_purchase_${orderNum}`;
  try {
    if (localStorage.getItem(dedupeStorageKey)) {
      return;
    }
    localStorage.setItem(dedupeStorageKey, Date.now().toString());
  } catch {
    // Si localStorage está bloqueado o lleno, continuar normalmente
  }

  const rawItems = Array.isArray(order.items) ? order.items : [];
  const contentIds = rawItems.map((it) => formatCatalogId(it.producto_id ?? it.id));
  const contents = rawItems.map((it) => {
    const unitPrice = formatPrice(it.precio_unit ?? it.price ?? 0);
    const qty = Math.max(1, Number(it.cantidad ?? it.qty ?? 1));
    return {
      id: formatCatalogId(it.producto_id ?? it.id),
      quantity: qty,
      item_price: unitPrice,
    };
  });

  const numItems = rawItems.reduce((acc, it) => acc + Math.max(1, Number(it.cantidad ?? it.qty ?? 1)), 0);
  const totalValue = formatPrice(order.total);
  const eventId = `order_${orderNum}`;

  safeFbq(
    'track',
    'Purchase',
    {
      content_ids: contentIds,
      contents: contents,
      num_items: numItems,
      value: totalValue,
      currency: META_CURRENCY,
    },
    { eventID: eventId }
  );
}

export const metaPixel = {
  init,
  pageView,
  viewContent,
  addToCart,
  initiateCheckout,
  purchase,
  formatCatalogId,
  formatPrice,
  META_PIXEL_ID,
  META_CURRENCY,
};

export default metaPixel;
