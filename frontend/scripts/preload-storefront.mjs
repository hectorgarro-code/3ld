import { readFile, writeFile } from 'node:fs/promises'
import { getThumbnailUrl } from '../src/lib/utils.ts'

if (process.env.GITHUB_ACTIONS !== 'true' && !process.argv.includes('--preview')) process.exit(0)

const origin = 'https://3ld.com.ar'

function escapeHtml(value) {
  return String(value)
    .replaceAll('&', '&amp;')
    .replaceAll('"', '&quot;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
}

function thumbnail(image) {
  if (typeof image !== 'string' || !image) return ''
  const url = new URL(image, origin)
  if (!['http:', 'https:'].includes(url.protocol)) return ''
  if (url.hostname === 'sistema.3ld.com.ar') url.host = new URL(origin).host
  return getThumbnailUrl(url.href, 400)
}

try {
  const response = await fetch(origin + '/api/v1/tienda/productos', {
    signal: AbortSignal.timeout(8000),
  })
  if (!response.ok) throw new Error('HTTP ' + response.status)

  const { success, data } = await response.json()
  const products = success && Array.isArray(data) ? data.slice(0, 4) : []
  if (!products.length || !thumbnail(products[0].image)) throw new Error('No hay imagen principal')

  const cards = products.map((product, index) => {
    const image = thumbnail(product.image)
    const productUrl = '/?producto=' + encodeURIComponent(product.id)
    return `<a class="initial-product" href="${productUrl}">
      <div class="initial-product-image">${image ? `<img src="${escapeHtml(image)}" alt="" width="400" height="400" ${index < 2 ? 'fetchpriority="high"' : 'loading="lazy"'}>` : ''}</div>
      <div class="initial-product-info">
        <span>${escapeHtml(product.category ?? '')}</span>
        <h2>${escapeHtml(product.title)}</h2>
        <span class="initial-product-action">Ver producto</span>
      </div>
    </a>`
  }).join('\n')

  const firstImage = escapeHtml(thumbnail(products[0].image))
  const head = `<link rel="preload" as="image" fetchpriority="high" href="${firstImage}">
    <style>
      #initial-storefront { background: #f8f7fd; color: #0f172a; min-height: 100vh; }
      #initial-storefront + #root:not(:has([data-storefront-ready])) { display: none; }
      body:has([data-storefront-ready]) #initial-storefront { display: none; }
      .initial-notice { background: #6159bd; color: white; min-height: 33px; padding: 8px 16px; text-align: center; font-size: 11px; font-weight: 700; line-height: 16px; }
      .initial-header { background: white; border-bottom: 1px solid #e2e8f0; }
      .initial-container { max-width: 1280px; margin: auto; padding-inline: 16px; }
      .initial-header-row { height: 64px; display: flex; align-items: center; }
      .initial-header-row img { width: auto; height: 40px; }
      .initial-search-space { height: 50px; }
      .initial-category-space { background: white; border-bottom: 1px solid #e2e8f0; height: 49px; }
      .initial-catalog { padding-block: 24px; }
      .initial-catalog h1 { margin: 0; height: 120px; font-size: 20px; font-weight: 900; }
      .initial-product-grid { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 16px; }
      .initial-product { display: block; overflow: hidden; border: 1px solid #e2e8f0; border-radius: 16px; background: white; color: inherit; text-decoration: none; }
      .initial-product img { display: block; width: 100%; height: 100%; object-fit: cover; }
      .initial-product-image { aspect-ratio: 1; background: #f1f5f9; }
      .initial-product-info { min-height: 99px; padding: 12px; font-size: 11px; font-weight: 700; }
      .initial-product-info h2 { margin: 2px 0 8px; font-size: 12px; line-height: 1.35; }
      .initial-product-action { display: inline-block; color: #334155; }
      @media (max-width: 639px) { .initial-product:nth-child(n+3) { display: none; } }
      @media (min-width: 640px) {
        .initial-container { padding-inline: 24px; }
        .initial-header-row img { height: 48px; }
        .initial-catalog h1 { height: 72px; }
        .initial-product-grid { grid-template-columns: repeat(3, minmax(0, 1fr)); }
      }
      @media (min-width: 640px) and (max-width: 1023px) { .initial-product:nth-child(n+4) { display: none; } }
      @media (min-width: 768px) {
        .initial-search-space { display: none; }
        .initial-category-space { height: 57px; }
      }
      @media (min-width: 1024px) {
        .initial-container { padding-inline: 32px; }
        .initial-product-grid { grid-template-columns: repeat(4, minmax(0, 1fr)); }
      }
      @media print { #initial-storefront { display: none; } }
    </style>`

  const preview = `<div id="initial-storefront">
    <div class="initial-notice">🚚 Envío local gratis desde $30.000 | Entrega local en La Costa, excepto Costa Esmeralda</div>
    <header class="initial-header"><div class="initial-container"><div class="initial-header-row">
      <img src="/logo.png" alt="3LD" width="300" height="131">
    </div><div class="initial-search-space"></div></div></header>
    <div class="initial-category-space"></div>
    <main class="initial-container initial-catalog">
      <h1>Todo el Catálogo</h1>
      <div class="initial-product-grid">${cards}</div>
    </main>
  </div>`

  const index = await readFile(new URL('../dist/index.html', import.meta.url), 'utf8')
  if (!index.includes('<div id="root"></div>')) throw new Error('No se encontró el nodo de la aplicación')
  const storefront = index
    .replace(/<meta charset=[^>]+>/i, match => match + '\n    ' + head)
    .replace('<div id="root"></div>', match => preview + '\n    ' + match)
  await writeFile(new URL('../dist/storefront.html', import.meta.url), storefront)
  console.log('Portada preparada con la primera miniatura del catálogo.')
} catch (error) {
  console.warn('La portada usará el HTML habitual: ' + error.message)
}
