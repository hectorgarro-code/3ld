/**
 * Tracker de analíticas ultra liviano y asíncrono para 3LD
 * Diseñado con ZERO impacto en el rendimiento y velocidad de carga.
 * Utiliza navigator.sendBeacon con fallback a fetch en segundo plano (requestIdleCallback).
 */

const SESSION_KEY = '3ld_visita_session_id';

function getOrCreateSessionId(): string {
  try {
    let sid = sessionStorage.getItem(SESSION_KEY);
    if (!sid) {
      sid = 's_' + Math.random().toString(36).substring(2, 12) + '_' + Date.now().toString(36);
      sessionStorage.setItem(SESSION_KEY, sid);
    }
    return sid;
  } catch {
    return 'anon_' + Date.now().toString(36);
  }
}

export type EventType =
  | 'pageview'
  | 'ver_producto'
  | 'ver_historia'
  | 'like_producto'
  | 'agregar_carrito'
  | 'whatsapp_click'
  | 'cotizar_click';

interface TrackOptions {
  tipo: EventType;
  producto_id?: string | number;
  producto_nombre?: string;
  url?: string;
  metadata?: Record<string, any>;
}

// Cola en memoria para evitar llamadas redundantes repetidas
const recentEventsCache = new Set<string>();

export function trackEvent(options: TrackOptions): void {
  // Evitar trackear llamadas repetidas exactamente iguales en un lapso de 2 segundos
  const dedupeKey = `${options.tipo}_${options.producto_id || ''}_${options.producto_nombre || ''}`;
  if (recentEventsCache.has(dedupeKey)) return;
  recentEventsCache.add(dedupeKey);
  setTimeout(() => recentEventsCache.delete(dedupeKey), 2500);

  // Ejecución fuera del hilo crítico (requestIdleCallback o setTimeout)
  const dispatch = () => {
    try {
      const sessionId = getOrCreateSessionId();
      const payload = {
        session_id: sessionId,
        tipo: options.tipo,
        producto_id: options.producto_id ? String(options.producto_id) : undefined,
        producto_nombre: options.producto_nombre,
        url: options.url || window.location.href,
        referer: document.referrer || '',
        metadata: options.metadata || {},
      };

      const jsonStr = JSON.stringify(payload);
      const endpoint = '/api/v1/analytics/track';

      // 1. Usar navigator.sendBeacon (canal de red del navegador en background sin bloquear UI)
      if (typeof navigator !== 'undefined' && typeof navigator.sendBeacon === 'function') {
        const blob = new Blob([jsonStr], { type: 'application/json' });
        const sent = navigator.sendBeacon(endpoint, blob);
        if (sent) return;
      }

      // 2. Fallback a fetch asíncrono con keepalive
      fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: jsonStr,
        keepalive: true,
      }).catch(() => {
        // Silencioso por diseño
      });
    } catch {
      // Garantía absoluta de no interrumpir la experiencia de usuario
    }
  };

  if (typeof window !== 'undefined' && 'requestIdleCallback' in window) {
    (window as any).requestIdleCallback(dispatch, { timeout: 1500 });
  } else {
    setTimeout(dispatch, 80);
  }
}

export function trackPageView(path?: string): void {
  trackEvent({
    tipo: 'pageview',
    url: path ? `${window.location.origin}${path}` : window.location.href,
  });
}

export function trackViewProduct(product: { id: string | number; title?: string; nombre?: string }): void {
  trackEvent({
    tipo: 'ver_producto',
    producto_id: product.id,
    producto_nombre: product.title || product.nombre,
  });
}

export function trackViewStory(product: { id: string | number; title?: string; nombre?: string }): void {
  trackEvent({
    tipo: 'ver_historia',
    producto_id: product.id,
    producto_nombre: product.title || product.nombre,
  });
}

export function trackAddToCart(product: { id: string | number; title?: string; nombre?: string }, qty = 1): void {
  trackEvent({
    tipo: 'agregar_carrito',
    producto_id: product.id,
    producto_nombre: product.title || product.nombre,
    metadata: { cantidad: qty },
  });
}

export function trackWhatsAppClick(context?: string, product?: { id: string | number; title?: string }): void {
  trackEvent({
    tipo: 'whatsapp_click',
    producto_id: product?.id,
    producto_nombre: product?.title,
    metadata: { context: context || 'general' },
  });
}

export function trackQuoteClick(): void {
  trackEvent({
    tipo: 'cotizar_click',
  });
}
