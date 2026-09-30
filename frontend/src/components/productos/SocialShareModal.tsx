import React, { useState, useRef, useEffect } from 'react'
import {
  X,
  Share2,
  Copy,
  ExternalLink,
  Download,
  Check,
  Sparkles,
  MessageCircle,
  Camera,
  Image as ImageIcon
} from 'lucide-react'
import { toast } from '@/store/toastStore'
import { resolveImageUrl } from '@/lib/utils'

const FacebookIcon = ({ className = "w-4 h-4" }: { className?: string }) => (
  <svg className={className} fill="currentColor" viewBox="0 0 24 24">
    <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/>
  </svg>
)

const InstagramIcon = ({ className = "w-4 h-4" }: { className?: string }) => (
  <svg className={className} fill="currentColor" viewBox="0 0 24 24">
    <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z"/>
  </svg>
)

interface SocialShareModalProps {
  isOpen: boolean
  onClose: () => void
  product: {
    id: number | string
    nombre?: string
    title?: string
    precio_venta?: number
    price?: number
    descripcion?: string
    description?: string
    imagen_url?: string
    image?: string
    imagenes?: string[]
    categoria_nombre?: string
    category?: string
    variante?: string
  } | null
}

export function SocialShareModal({ isOpen, onClose, product }: SocialShareModalProps) {
  const [copied, setCopied] = useState(false)
  const [isGeneratingStory, setIsGeneratingStory] = useState(false)
  const [storyImageUrl, setStoryImageUrl] = useState<string | null>(null)
  const canvasRef = useRef<HTMLCanvasElement | null>(null)

  if (!isOpen || !product) return null

  const title = product.nombre || product.title || 'Producto 3LD'
  const price = product.precio_venta ?? product.price ?? 0
  const rawDesc = product.descripcion || product.description || 'Pieza 3D confeccionada con PLA de alta resistencia.'
  const category = product.categoria_nombre || product.category || 'General'
  const mainImage = product.imagen_url || product.image || (product.imagenes && product.imagenes[0]) || ''

  // Formato preparado para Facebook Marketplace
  const marketplaceText = `${title}${product.variante ? ` (${product.variante})` : ''}

💰 PRECIO: $${price.toLocaleString('es-AR')}
📍 RETIRO: Salta 3169, San Bernardo del Tuyú (Partido de La Costa)
🚚 ENVÍOS: Envíos por Andreani a todo el país o cadetería local.

DESCRIPCIÓN:
${rawDesc}

✨ Confeccionado en PLA biodegrable de alta calidad y excelente acabado.
💬 Consultas por mensajes o WhatsApp: +54 9 2257 55-9540
🌐 Ver catálogo completo: https://3ld.com.ar/tienda

#3LD #Impresion3D #SanBernardo #LaCosta #${category.replace(/\s+/g, '')}`

  const handleCopyMarketplaceText = () => {
    navigator.clipboard.writeText(marketplaceText)
    setCopied(true)
    setTimeout(() => setCopied(false), 2500)
    toast('¡Texto copiado al portapapeles!', 'success')
  }

  const handleOpenMarketplace = () => {
    handleCopyMarketplaceText()
    // Si hay imagen, intentar descargarla
    if (mainImage) {
      const imgUrl = resolveImageUrl(mainImage)
      const a = document.createElement('a')
      a.href = imgUrl
      a.download = `${title.toLowerCase().replace(/\s+/g, '-')}-3ld.jpg`
      a.target = '_blank'
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
    }

    toast('Redirigiendo a Facebook Marketplace...', 'info')
    setTimeout(() => {
      window.open('https://www.facebook.com/marketplace/create/item', '_blank')
    }, 500)
  }

  // Generar placa 9:16 para Instagram Story en Canvas
  useEffect(() => {
    if (!product || !mainImage) return

    setIsGeneratingStory(true)
    const canvas = document.createElement('canvas')
    canvas.width = 1080
    canvas.height = 1920
    const ctx = canvas.getContext('2d')

    if (!ctx) return

    const img = new Image()
    img.crossOrigin = 'anonymous'
    img.src = resolveImageUrl(mainImage)

    img.onload = () => {
      // 1. Fondo gradiente oscuro elegante
      const grad = ctx.createLinearGradient(0, 0, 0, 1920)
      grad.addColorStop(0, '#0f172a') // Slate-900
      grad.addColorStop(0.5, '#1e1b4b') // Indigo-950
      grad.addColorStop(1, '#020617') // Slate-950
      ctx.fillStyle = grad
      ctx.fillRect(0, 0, 1080, 1920)

      // 2. Círculos decorativos brillantes de fondo
      ctx.fillStyle = 'rgba(6, 182, 212, 0.15)' // Cyan glow
      ctx.beginPath()
      ctx.arc(200, 300, 350, 0, Math.PI * 2)
      ctx.fill()

      ctx.fillStyle = 'rgba(107, 102, 200, 0.15)' // Purple glow
      ctx.beginPath()
      ctx.arc(900, 1600, 400, 0, Math.PI * 2)
      ctx.fill()

      // 3. Header Logo 3LD
      ctx.fillStyle = '#ffffff'
      ctx.font = '900 64px sans-serif'
      ctx.textAlign = 'center'
      ctx.fillText('3LD IMPRESIÓN 3D', 540, 160)

      ctx.fillStyle = '#06b6d4' // Cyan 3LD
      ctx.font = '700 32px sans-serif'
      ctx.fillText('TALLER DE FABRICACIÓN & DISEÑO', 540, 215)

      // 4. Contenedor de la foto principal (Tarjeta redondeada)
      const cardX = 90
      const cardY = 280
      const cardW = 900
      const cardH = 900
      const radius = 40

      ctx.save()
      ctx.beginPath()
      ctx.moveTo(cardX + radius, cardY)
      ctx.lineTo(cardX + cardW - radius, cardY)
      ctx.quadraticCurveTo(cardX + cardW, cardY, cardX + cardW, cardY + radius)
      ctx.lineTo(cardX + cardW, cardY + cardH - radius)
      ctx.quadraticCurveTo(cardX + cardW, cardY + cardH, cardX + cardW - radius, cardY + cardH)
      ctx.lineTo(cardX + radius, cardY + cardH)
      ctx.quadraticCurveTo(cardX, cardY + cardH, cardX, cardY + cardH - radius)
      ctx.lineTo(cardX, cardY + radius)
      ctx.quadraticCurveTo(cardX, cardY, cardX + radius, cardY)
      ctx.closePath()
      ctx.clip()

      // Dibujar imagen escalada proporcionalmente
      const imgRatio = img.width / img.height
      const cardRatio = cardW / cardH
      let drawW = cardW
      let drawH = cardH
      let drawX = cardX
      let drawY = cardY

      if (imgRatio > cardRatio) {
        drawW = cardH * imgRatio
        drawX = cardX - (drawW - cardW) / 2
      } else {
        drawH = cardW / imgRatio
        drawY = cardY - (drawH - cardH) / 2
      }

      ctx.drawImage(img, drawX, drawY, drawW, drawH)
      ctx.restore()

      // Borde brillante en tarjeta
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.2)'
      ctx.lineWidth = 6
      ctx.strokeRect(cardX, cardY, cardW, cardH)

      // 5. Título del Producto
      ctx.fillStyle = '#ffffff'
      ctx.font = '900 56px sans-serif'
      ctx.textAlign = 'center'
      
      // Wrapear texto si es muy largo
      const maxTitleW = 900
      const words = title.split(' ')
      let line = ''
      let currentY = 1260

      for (let n = 0; n < words.length; n++) {
        const testLine = line + words[n] + ' '
        const metrics = ctx.measureText(testLine)
        if (metrics.width > maxTitleW && n > 0) {
          ctx.fillText(line, 540, currentY)
          line = words[n] + ' '
          currentY += 68
        } else {
          line = testLine
        }
      }
      ctx.fillText(line, 540, currentY)

      // 6. Insignia de Precio Destacado
      const priceY = currentY + 110
      ctx.fillStyle = '#06b6d4'
      ctx.beginPath()
      ctx.roundRect(540 - 240, priceY - 65, 480, 100, 50)
      ctx.fill()

      ctx.fillStyle = '#ffffff'
      ctx.font = '900 52px sans-serif'
      ctx.fillText(`$${price.toLocaleString('es-AR')}`, 540, priceY + 5)

      // 7. Footer / Contacto / WhatsApp
      ctx.fillStyle = '#94a3b8'
      ctx.font = '700 34px sans-serif'
      ctx.fillText('📍 Salta 3169, San Bernardo', 540, 1720)

      ctx.fillStyle = '#10b981' // Emerald WhatsApp
      ctx.font = '900 36px sans-serif'
      ctx.fillText('💬 WhatsApp: +54 9 2257 55-9540', 540, 1785)

      ctx.fillStyle = '#cbd5e1'
      ctx.font = '700 28px sans-serif'
      ctx.fillText('www.3ld.com.ar', 540, 1840)

      const urlData = canvas.toDataURL('image/png')
      setStoryImageUrl(urlData)
      setIsGeneratingStory(false)
    }

    img.onerror = () => {
      setIsGeneratingStory(false)
    }
  }, [product, mainImage])

  const handleDownloadStory = () => {
    if (!storyImageUrl) return
    const a = document.createElement('a')
    a.href = storyImageUrl
    a.download = `historia-instagram-${title.toLowerCase().replace(/\s+/g, '-')}.png`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    toast('¡Imagen 9:16 para Historia descargada!', 'success')
  }

  const handleShareStoryNative = async () => {
    if (!storyImageUrl) return
    try {
      const blob = await (await fetch(storyImageUrl)).blob()
      const file = new File([blob], 'historia-3ld.png', { type: 'image/png' })

      if (navigator.canShare && navigator.canShare({ files: [file] })) {
        await navigator.share({
          files: [file],
          title: title,
          text: `Disponible en 3LD Impresión 3D: ${title} - $${price.toLocaleString('es-AR')}`,
        })
        toast('¡Compartiendo en redes!', 'success')
      } else {
        handleDownloadStory()
      }
    } catch {
      handleDownloadStory()
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-xs animate-in fade-in duration-150">
      <div className="w-full max-w-lg bg-white rounded-3xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="p-4 border-b border-slate-100 bg-slate-900 text-white flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-cyan-500/20 text-cyan-400 flex items-center justify-center font-black">
              <Share2 className="w-4 h-4" />
            </div>
            <div>
              <h3 className="font-extrabold text-sm text-white leading-tight">Compartir en Redes</h3>
              <p className="text-[11px] text-slate-400 font-semibold truncate max-w-xs">{title}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-white hover:bg-slate-800 rounded-xl transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Body */}
        <div className="p-5 overflow-y-auto space-y-5 flex-1">
          {/* Opción 1: Facebook Marketplace */}
          <div className="p-4 bg-blue-50/70 rounded-2xl border border-blue-100 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-blue-900 font-black text-xs">
                <FacebookIcon className="w-4 h-4 text-blue-600 shrink-0" />
                <span>Facebook Marketplace (Publicación Rápida)</span>
              </div>
              <span className="text-[10px] bg-blue-200/80 text-blue-800 font-bold px-2 py-0.5 rounded-full">
                1-Click
              </span>
            </div>

            <p className="text-[11px] text-slate-600 leading-snug">
              Copia el título, precio, descripción optimizada con hashtags y descarga la foto del artículo para crear la publicación en Facebook.
            </p>

            <div className="relative">
              <textarea
                readOnly
                rows={3}
                value={marketplaceText}
                className="w-full p-2.5 bg-white border border-blue-200 rounded-xl text-[11px] font-mono text-slate-700 focus:outline-none resize-none"
              />
              <button
                onClick={handleCopyMarketplaceText}
                className="absolute right-2 top-2 px-2.5 py-1 bg-slate-900 text-white rounded-lg text-[10px] font-bold flex items-center gap-1 hover:bg-slate-800"
              >
                {copied ? <Check className="w-3 w-3 text-emerald-400" /> : <Copy className="w-3 w-3" />}
                <span>{copied ? 'Copiado' : 'Copiar'}</span>
              </button>
            </div>

            <button
              onClick={handleOpenMarketplace}
              className="w-full py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-black flex items-center justify-center gap-2 shadow-md shadow-blue-500/20 transition active:scale-95"
            >
              <ExternalLink className="w-4 h-4" />
              <span>Copiar Texto, Foto y Abrir Facebook Marketplace</span>
            </button>
          </div>

          {/* Opción 2: Instagram Story (Placa 9:16) */}
          <div className="p-4 bg-purple-50/70 rounded-2xl border border-purple-100 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-purple-950 font-black text-xs">
                <InstagramIcon className="w-4 h-4 text-pink-600 shrink-0" />
                <span>Instagram Story (Generador 9:16)</span>
              </div>
              <span className="text-[10px] bg-purple-200/80 text-purple-900 font-bold px-2 py-0.5 rounded-full">
                1080x1920 HD
              </span>
            </div>

            <p className="text-[11px] text-slate-600 leading-snug">
              Genera una placa gráfica vertical con la foto, precio en oferta, logo de 3LD y contacto de WhatsApp lista para subir a tus historias.
            </p>

            {/* Preview de la Placa */}
            {storyImageUrl ? (
              <div className="relative aspect-[9/16] w-36 mx-auto rounded-2xl overflow-hidden border-2 border-purple-300 shadow-lg group cursor-pointer" onClick={handleShareStoryNative}>
                <img src={storyImageUrl} alt="Preview Historia" className="w-full h-full object-cover" />
                <div className="absolute inset-0 bg-slate-950/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-white text-[10px] font-bold text-center p-2">
                  Haz clic para descargar o compartir
                </div>
              </div>
            ) : isGeneratingStory ? (
              <div className="flex items-center justify-center py-6 text-xs text-purple-700 font-bold gap-2">
                <Sparkles className="w-4 h-4 animate-spin" />
                <span>Generando placa vertical 9:16...</span>
              </div>
            ) : null}

            <div className="grid grid-cols-2 gap-2 pt-1">
              <button
                onClick={handleDownloadStory}
                disabled={!storyImageUrl}
                className="py-2.5 bg-white border border-purple-300 text-purple-900 hover:bg-purple-100 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition disabled:opacity-50"
              >
                <Download className="w-4 h-4 text-purple-600" />
                <span>Descargar Foto</span>
              </button>

              <button
                onClick={handleShareStoryNative}
                disabled={!storyImageUrl}
                className="py-2.5 bg-gradient-to-r from-purple-600 via-pink-600 to-amber-500 text-white hover:brightness-110 rounded-xl text-xs font-black flex items-center justify-center gap-1.5 shadow-md transition active:scale-95 disabled:opacity-50"
              >
                <Share2 className="w-4 h-4" />
                <span>Compartir Story</span>
              </button>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="p-3 bg-slate-50 border-t border-slate-200 flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-slate-200 hover:bg-slate-300 text-slate-800 text-xs font-bold rounded-xl transition"
          >
            Cerrar
          </button>
        </div>
      </div>
    </div>
  )
}
