let active = false;
declare global { interface Window { gtag?: (...args: unknown[]) => void } }

export function initGoogleAnalytics(id: string) {
  if (active || !/^G-[A-Z0-9]+$/.test(id) || typeof window === 'undefined') return;
  if (!['/', '/tienda'].includes(window.location.pathname)) return;
  try {
    const staff = JSON.parse(localStorage.getItem('3ld-auth-storage') || 'null');
    if (staff?.state?.isAuthenticated || staff?.state?.token || localStorage.getItem('3ld_analytics_opt_out') === 'true') return;
  } catch { /* La navegación sigue funcionando sin almacenamiento. */ }
  active = true;
  window.dataLayer = window.dataLayer || [];
  window.gtag = function () { window.dataLayer?.push(arguments); };
  window.gtag('js', new Date());
  window.gtag('config', id, { currency: 'ARS', allow_google_signals: false, allow_ad_personalization_signals: false });
  const script = document.createElement('script');
  script.async = true;
  script.src = `https://www.googletagmanager.com/gtag/js?id=${id}`;
  document.head.appendChild(script);
}
