/**
 * Tracker de analíticas ultra liviano y asíncrono para 3LD
 * Diseñado con ZERO impacto en el rendimiento y velocidad de carga.
 *
 * Características clave:
 * 1. Persona única (visitor_id): Persistente en localStorage para distinguir visitantes individuales reales.
 * 2. Sesión consolidada (session_id): Si un usuario recorre la tienda mirando productos durante el mismo día,
 *    se mantiene como una única sesión compartida entre pestañas y recargas.
 * 3. Exclusión estricta de personal del sistema: Usuarios con sesión administrativa o en modo edición/preview NO son registrados.
 */

const VISITOR_KEY = '3ld_analytics_vid';
const SESSION_KEY = '3ld_analytics_session_data';

/**
 * Obtiene o crea el identificador persistente del visitante (persona/dispositivo físico).
 * Dura indefinidamente en localStorage.
 */
export function getOrCreateVisitorId(): string {
  try {
    let vid = localStorage.getItem(VISITOR_KEY);
    if (!vid) {
      vid = 'v_' + Math.random().toString(36).substring(2, 10) + '_' + Date.now().toString(36);
      localStorage.setItem(VISITOR_KEY, vid);
    }
    return vid;
  } catch {
    return 'v_anon_' + Date.now().toString(36);
  }
}

/**
 * Obtiene o crea la sesión activa del usuario.
 * Regla: Mientras sea el mismo día calendario, se mantiene la MISMA sesión
 * consolidando todas las visitas y productos que mire.
 */
export function getOrCreateSession(): { sessionId: string; visitorId: string } {
  const visitorId = getOrCreateVisitorId();
  try {
    const now = new Date();
    const todayDate = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;

    const raw = localStorage.getItem(SESSION_KEY);
    if (raw) {
      const data = JSON.parse(raw);
      if (data && data.date === todayDate && data.sessionId) {
        data.lastActive = Date.now();
        localStorage.setItem(SESSION_KEY, JSON.stringify(data));
        return { sessionId: data.sessionId, visitorId };
      }
    }

    // Nueva sesión diaria para este visitante
    const cleanVid = visitorId.replace(/^v_/, '').substring(0, 8);
    const newSessionId = `s_${cleanVid}_${todayDate.replace(/-/g, '')}_${Math.random().toString(36).substring(2, 6)}`;
    const sessionData = {
      sessionId: newSessionId,
      date: todayDate,
      visitorId,
      createdAt: Date.now(),
      lastActive: Date.now(),
    };
    localStorage.setItem(SESSION_KEY, JSON.stringify(sessionData));
    return { sessionId: newSessionId, visitorId };
  } catch {
    return {
      sessionId: 's_' + Date.now().toString(36),
      visitorId,
    };
  }
}

/**
 * Verifica si el usuario actual es personal administrativo del sistema
 * o si está en modo previsualización o depuración, para NO alterar las métricas reales.
 */
export function isSystemOrStaffUser(): boolean {
  try {
    // 1. Sesión activa en el store de autenticación administrativa de 3LD
    const authData = localStorage.getItem('3ld-auth-storage');
    if (authData) {
      const parsed = JSON.parse(authData);
      if (parsed?.state?.isAuthenticated || parsed?.state?.token) {
        return true;
      }
    }

    // 2. Parámetros de previsualización o edición en la URL
    if (typeof window !== 'undefined') {
      const search = window.location.search.toLowerCase();
      if (search.includes('preview=') || search.includes('admin=true') || search.includes('mode=builder')) {
        return true;
      }

      // Rutas internas del sistema (excluir por completo páginas del panel)
      const path = window.location.pathname.toLowerCase();
      if (!path.startsWith('/tienda') && path !== '/' && path !== '') {
        return true;
      }
    }

    // 3. Flag opcional de exclusión manual en localStorage
    if (localStorage.getItem('3ld_analytics_opt_out') === 'true') {
      return true;
    }
  } catch {}
  return false;
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

// Cola en memoria para evitar llamadas redundantes repetidas dentro de 2.5 segundos
const recentEventsCache = new Set<string>();

export function trackEvent(options: TrackOptions): void {
  // EXCLUSIÓN TOTAL: Si es administrador, operario o previsualización del sistema, NO registrar
  if (isSystemOrStaffUser()) {
    return;
  }

  // Evitar trackear llamadas repetidas exactamente iguales en un lapso de 2.5 segundos
  const dedupeKey = `${options.tipo}_${options.producto_id || ''}_${options.producto_nombre || ''}`;
  if (recentEventsCache.has(dedupeKey)) return;
  recentEventsCache.add(dedupeKey);
  setTimeout(() => recentEventsCache.delete(dedupeKey), 2500);

  // Ejecución fuera del hilo crítico (requestIdleCallback o setTimeout)
  const dispatch = () => {
    try {
      const { sessionId, visitorId } = getOrCreateSession();
      const payload = {
        session_id: sessionId,
        visitor_id: visitorId,
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
