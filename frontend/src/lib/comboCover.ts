import { createOptimizedThumbnail } from './imageOptimization'
import { resolveImageUrl } from './utils'

export async function buildComboCover(components: { imagen_url?: string }[]): Promise<string | null> {
  const urls = components.map(item => item.imagen_url).filter((url): url is string => Boolean(url)).slice(0, 4)
  const photos = (await Promise.all(urls.map(async url => {
    const src = await createOptimizedThumbnail(resolveImageUrl(url), 560, 0.9)
    const image = new Image()
    image.crossOrigin = 'anonymous'
    image.src = src
    try { await image.decode(); return image } catch { return null }
  }))).filter((image): image is HTMLImageElement => image !== null)
  if (photos.length < 2) return null

  const canvas = document.createElement('canvas')
  canvas.width = 1200
  canvas.height = 1200
  const ctx = canvas.getContext('2d')
  if (!ctx) return null
  ctx.fillStyle = '#F4F1FB'
  ctx.fillRect(0, 0, 1200, 1200)
  const cellHeight = photos.length > 2 ? 496 : 1012
  photos.forEach((image, index) => {
    const x = photos.length === 3 && index === 2 ? 321 : 32 + (index % 2) * 578
    const y = 140 + Math.floor(index / 2) * 516
    ctx.fillStyle = '#FFFFFF'
    ctx.beginPath()
    ctx.roundRect(x, y, 558, cellHeight, 22)
    ctx.fill()
    const scale = Math.min(522 / image.width, (cellHeight - 36) / image.height)
    const width = image.width * scale
    const height = image.height * scale
    ctx.drawImage(image, x + (558 - width) / 2, y + (cellHeight - height) / 2, width, height)
  })
  ctx.fillStyle = '#332D63'
  ctx.font = 'bold 58px sans-serif'
  ctx.fillText('Combo 3LD', 32, 94)
  ctx.textAlign = 'right'
  ctx.font = 'bold 34px sans-serif'
  ctx.fillText(components.length + ' productos', 1168, 94)
  return canvas.toDataURL('image/jpeg', 0.87)
}
