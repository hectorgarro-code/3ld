import React, { useState } from 'react'
import { X, Share2, Copy, Check, MessageCircle, Link2, ExternalLink } from 'lucide-react'
import { toast } from '@/store/toastStore'
import { resolveImageUrl } from '@/lib/utils'

interface CustomerShareModalProps {
  isOpen: boolean
  onClose: () => void
  product: {
    id: string | number
    title?: string
    nombre?: string
    price?: number | string
    precio_venta?: number | string
    image?: string
    imagen_url?: string
    imagenes?: string[]
  } | null
}

export function CustomerShareModal({ isOpen, onClose, product }: CustomerShareModalProps) {
  const [copied, setCopied] = useState(false)

  if (!isOpen || !product) return null

  const title = String(product.nombre || product.title || 'Producto 3LD')
  const rawPrice = product.precio_venta ?? product.price ?? 0
  const numPrice = typeof rawPrice === 'number' ? rawPrice : (parseFloat(String(rawPrice)) || 0)
  const priceFormatted = numPrice.toLocaleString('es-AR')

  let mainImage = ''
  if (typeof product.imagen_url === 'string' && product.imagen_url.trim()) {
    mainImage = product.imagen_url
  } else if (typeof product.image === 'string' && product.image.trim()) {
    mainImage = product.image
  } else if (Array.isArray(product.imagenes) && product.imagenes.length > 0 && typeof product.imagenes[0] === 'string') {
    mainImage = product.imagenes[0]
  }

  const shareUrl = typeof window !== 'undefined'
    ? `${window.location.origin}/tienda?producto=${product.id}`
    : `https://3ld.com.ar/tienda?producto=${product.id}`

  const copyToClipboard = async () => {
    let success = false
    try {
      if (typeof navigator !== 'undefined' && navigator.clipboard && navigator.clipboard.writeText) {
        await navigator.clipboard.writeText(shareUrl)
        success = true
      }
    } catch {}

    if (!success) {
      try {
        const textArea = document.createElement('textarea')
        textArea.value = shareUrl
        textArea.style.position = 'fixed'
        textArea.style.left = '-999999px'
        textArea.style.top = '-999999px'
        document.body.appendChild(textArea)
        textArea.focus()
        textArea.select()
        success = document.execCommand('copy')
        document.body.removeChild(textArea)
      } catch {}
    }

    if (success) {
      setCopied(true)
      setTimeout(() => setCopied(false), 2500)
      toast('¡Enlace del producto copiado!', 'success')
    } else {
      toast('Copia el enlace manualmente desde el recuadro', 'info')
    }
  }

  const handleShareWhatsApp = () => {
    const text = `¡Mirá este producto en 3LD! ✨\n*${title}* - $${priceFormatted}\n${shareUrl}`
    const waUrl = `https://api.whatsapp.com/send?text=${encodeURIComponent(text)}`
    window.open(waUrl, '_blank')
  }

  const handleNativeShare = async () => {
    if (typeof navigator !== 'undefined' && navigator.share) {
      try {
        await navigator.share({
          title: `${title} | 3LD Impresión 3D`,
          text: `Mirá esta pieza en 3LD: ${title} - $${priceFormatted}`,
          url: shareUrl,
        })
      } catch (err: any) {
        if (err?.name !== 'AbortError') {
          copyToClipboard()
        }
      }
    } else {
      copyToClipboard()
    }
  }

  const canNativeShare = typeof navigator !== 'undefined' && !!navigator.share

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-xs animate-in fade-in duration-150">
      <div className="w-full max-w-md bg-white rounded-3xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col animate-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="p-4 border-b border-slate-100 bg-slate-900 text-white flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-2xl bg-cyan-500/20 text-cyan-400 flex items-center justify-center font-black">
              <Share2 className="w-4 h-4" />
            </div>
            <div>
              <h3 className="font-extrabold text-sm text-white leading-tight">Compartir este producto</h3>
              <p className="text-[11px] text-slate-400 font-medium">Envíalo a un amigo o guárdalo</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-white hover:bg-slate-800 rounded-xl transition"
            aria-label="Cerrar"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Product Preview */}
        <div className="p-5 space-y-4">
          <div className="flex items-center gap-3 p-3 bg-slate-50 border border-slate-200/80 rounded-2xl">
            {mainImage ? (
              <img
                src={resolveImageUrl(mainImage)}
                alt={title}
                className="w-14 h-14 rounded-xl object-cover bg-white border border-slate-200 shrink-0"
              />
            ) : (
              <div className="w-14 h-14 rounded-xl bg-cyan-100 text-cyan-700 flex items-center justify-center shrink-0 font-bold text-xs">
                3LD
              </div>
            )}
            <div className="min-w-0 flex-1">
              <p className="text-xs font-bold text-slate-900 truncate">{title}</p>
              <p className="text-sm font-extrabold text-cyan-700 mt-0.5">${priceFormatted}</p>
            </div>
          </div>

          {/* Enlace directo para copiar */}
          <div className="space-y-1.5">
            <label className="text-[11px] font-bold text-slate-700 flex items-center gap-1.5">
              <Link2 className="w-3.5 h-3.5 text-slate-500" />
              <span>Enlace directo del producto</span>
            </label>
            <div className="flex items-center gap-2 p-1.5 bg-slate-100 border border-slate-200 rounded-2xl">
              <input
                type="text"
                readOnly
                value={shareUrl}
                className="flex-1 bg-transparent px-2.5 py-1 text-xs text-slate-700 font-mono truncate focus:outline-none"
              />
              <button
                type="button"
                onClick={copyToClipboard}
                className={`px-3.5 py-2 rounded-xl text-xs font-extrabold flex items-center gap-1.5 transition active:scale-95 shrink-0 ${
                  copied
                    ? 'bg-emerald-600 text-white shadow-xs'
                    : 'bg-slate-900 hover:bg-slate-800 text-white shadow-xs'
                }`}
              >
                {copied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                <span>{copied ? '¡Copiado!' : 'Copiar'}</span>
              </button>
            </div>
          </div>

          {/* Botones de acción rápida */}
          <div className="space-y-2 pt-1">
            <button
              type="button"
              onClick={handleShareWhatsApp}
              className="w-full py-3 px-4 bg-emerald-600 hover:bg-emerald-700 text-white rounded-2xl text-xs font-black flex items-center justify-center gap-2 shadow-md shadow-emerald-600/20 transition active:scale-98"
            >
              <MessageCircle className="w-4 h-4" />
              <span>Compartir por WhatsApp</span>
            </button>

            {canNativeShare && (
              <button
                type="button"
                onClick={handleNativeShare}
                className="w-full py-2.5 px-4 bg-slate-100 hover:bg-slate-200 text-slate-800 rounded-2xl text-xs font-extrabold flex items-center justify-center gap-2 transition"
              >
                <Share2 className="w-3.5 h-3.5 text-slate-600" />
                <span>Más opciones para compartir</span>
              </button>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="p-3 bg-slate-50 border-t border-slate-200 flex justify-end">
          <button
            type="button"
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
