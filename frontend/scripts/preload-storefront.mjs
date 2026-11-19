import { readFile, writeFile } from 'node:fs/promises'
import { getThumbnailUrl } from '../src/lib/utils.ts'

if (process.env.GITHUB_ACTIONS !== 'true' && !process.argv.includes('--preview')) process.exit(0)

const origin = 'https://3ld.com.ar'

try {
  const response = await fetch(origin + '/api/v1/tienda/productos', {
    signal: AbortSignal.timeout(8000),
  })
  if (!response.ok) throw new Error('HTTP ' + response.status)

  const { success, data } = await response.json()
  const image = success && Array.isArray(data) ? data[0]?.image : null
  if (typeof image !== 'string' || !image) throw new Error('No hay imagen principal')

  const url = new URL(image, origin)
  if (!['http:', 'https:'].includes(url.protocol)) throw new Error('Formato de imagen no compatible')
  if (url.hostname === 'sistema.3ld.com.ar') url.host = new URL(origin).host
  const href = getThumbnailUrl(url.href, 400)
    .replaceAll('&', '&amp;')
    .replaceAll('"', '&quot;')
    .replaceAll('<', '&lt;')

  const index = await readFile(new URL('../dist/index.html', import.meta.url), 'utf8')
  const preload = '<link rel="preload" as="image" fetchpriority="high" href="' + href + '">'
  const storefront = index.replace(/(<meta charset=[^>]+>)/i, '$1\n    ' + preload)
  await writeFile(new URL('../dist/storefront.html', import.meta.url), storefront)
  console.log('Portada preparada con la primera miniatura del catálogo.')
} catch (error) {
  console.warn('La portada usará el HTML habitual: ' + error.message)
}
