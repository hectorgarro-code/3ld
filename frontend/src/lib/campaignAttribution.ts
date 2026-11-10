/** Última campaña explícita, conservada 30 días en este navegador. Sin contactos ni click IDs. */
export type CampaignAttribution = Partial<Record<'utm_source' | 'utm_medium' | 'utm_campaign' | 'utm_content' | 'utm_term' | 'utm_id', string>>;
const KEY = '3ld_campaign_attribution_v1';
const TTL = 30 * 86400000;
const keys = ['utm_source', 'utm_medium', 'utm_campaign', 'utm_content', 'utm_term', 'utm_id'] as const;
export function getCampaignAttribution(): CampaignAttribution | null {
  if (typeof window === 'undefined') return null;
  try {
    const auth = JSON.parse(localStorage.getItem('3ld-auth-storage') || 'null');
    if (auth?.state?.isAuthenticated || auth?.state?.token || localStorage.getItem('3ld_analytics_opt_out') === 'true') return null;
  } catch { /* La medición no interrumpe la navegación. */ }
  const params = new URLSearchParams(window.location.search);
  const campaign: CampaignAttribution = {};
  for (const key of keys) {
    const value = params.get(key)?.trim();
    if (value && value.length <= 120 && /^[a-zA-Z0-9_. -]+$/.test(value)) campaign[key] = value;
  }
  // Una nueva fuente explícita sustituye la anterior; el tráfico directo no la borra.
  if (campaign.utm_source) {
    try { localStorage.setItem(KEY, JSON.stringify({ campaign, capturedAt: Date.now() })); } catch { /* Opcional. */ }
    return campaign;
  }
  try {
    const saved = JSON.parse(localStorage.getItem(KEY) || 'null');
    if (!saved || !Number.isFinite(saved.capturedAt) || Date.now() - saved.capturedAt > TTL || saved.capturedAt > Date.now()) return null;
    const result: CampaignAttribution = {};
    for (const key of keys) {
      const value = saved.campaign?.[key];
      if (typeof value === 'string' && value.length <= 120 && /^[a-zA-Z0-9_. -]+$/.test(value)) result[key] = value;
    }
    return result.utm_source ? result : null;
  } catch { return null; }
}
