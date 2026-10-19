import React, { useState } from 'react'
import {
  X,
  Copy,
  Check,
  ExternalLink,
  Share2,
  RefreshCw,
  CheckCircle2,
  HelpCircle,
  Sparkles,
  ShoppingBag,
  MessageCircle
} from 'lucide-react'

interface MetaSyncModalProps {
  isOpen: boolean
  onClose: () => void
  totalProducts: number
  readyProducts: number
}

export const MetaSyncModal: React.FC<MetaSyncModalProps> = ({
  isOpen,
  onClose,
  totalProducts,
  readyProducts
}) => {
  const [copiedType, setCopiedType] = useState<'xml' | 'csv' | null>(null)
  const [activeTab, setActiveTab] = useState<'guide' | 'urls'>('guide')

  if (!isOpen) return null

  // URL del feed oficial en producción y fallback al origen actual
  const origin = window.location.origin.includes('localhost')
    ? 'https://3ld.com.ar'
    : window.location.origin
  const xmlUrl = `${origin}/api/v1/meta/catalog.xml`
  const csvUrl = `${origin}/api/v1/meta/catalog.csv`

  const handleCopy = (text: string, type: 'xml' | 'csv') => {
    navigator.clipboard.writeText(text)
    setCopiedType(type)
    setTimeout(() => setCopiedType(null), 2500)
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-150">
      <div className="relative w-full max-w-2xl bg-white rounded-3xl shadow-2xl border border-slate-100 overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 text-white p-6 relative">
          <button
            onClick={onClose}
            className="absolute top-5 right-5 p-2 rounded-full bg-white/10 hover:bg-white/20 text-slate-300 hover:text-white transition"
          >
            <X className="h-5 w-5" />
          </button>

          <div className="flex items-center gap-2 mb-2">
            <span className="flex items-center justify-center h-8 w-8 rounded-xl bg-gradient-to-tr from-emerald-500 to-teal-400 text-slate-950 shadow-md">
              <Share2 className="h-4 w-4" />
            </span>
            <span className="text-xs font-bold uppercase tracking-wider text-emerald-400">
              Sincronización Automática
            </span>
          </div>

          <h2 className="text-xl font-extrabold tracking-tight">
            Catálogo para WhatsApp, Facebook e Instagram
          </h2>
          <p className="text-xs text-slate-300 mt-1">
            Meta Commerce Manager actualiza tus productos periódicamente leyendo el feed en vivo de 3LD.
          </p>

          {/* Social Badges */}
          <div className="flex flex-wrap items-center gap-2 mt-4">
            <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-emerald-500/20 text-emerald-300 rounded-full text-xs font-bold border border-emerald-500/30">
              <MessageCircle className="h-3.5 w-3.5" /> WhatsApp Business
            </span>
            <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-pink-500/20 text-pink-300 rounded-full text-xs font-bold border border-pink-500/30">
              <svg className="h-3.5 w-3.5 fill-current" viewBox="0 0 24 24">
                <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z"/>
              </svg>
              <span>Instagram Shopping</span>
            </span>
            <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-blue-500/20 text-blue-300 rounded-full text-xs font-bold border border-blue-500/30">
              <svg className="h-3.5 w-3.5 fill-current" viewBox="0 0 24 24">
                <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/>
              </svg>
              <span>Facebook Shop</span>
            </span>
          </div>
        </div>

        {/* Navigation Tabs */}
        <div className="flex border-b border-slate-100 bg-slate-50/70 px-6 pt-3 gap-2">
          <button
            onClick={() => setActiveTab('guide')}
            className={`pb-3 px-3 text-xs font-bold border-b-2 transition ${
              activeTab === 'guide'
                ? 'border-indigo-600 text-indigo-600'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            Paso a Paso (Cómo conectar)
          </button>
          <button
            onClick={() => setActiveTab('urls')}
            className={`pb-3 px-3 text-xs font-bold border-b-2 transition ${
              activeTab === 'urls'
                ? 'border-indigo-600 text-indigo-600'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            URLs del Feed & Diagnóstico
          </button>
        </div>

        {/* Content Body */}
        <div className="p-6 overflow-y-auto space-y-5 text-slate-700 text-xs">
          {/* Feed URL Banner */}
          <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4">
            <div className="flex items-center justify-between gap-2 mb-2">
              <div className="flex items-center gap-2">
                <span className="px-2 py-0.5 bg-indigo-100 text-indigo-700 rounded-md font-bold text-[10px]">
                  RECOMENDADO
                </span>
                <span className="font-extrabold text-slate-800 text-sm">URL del Feed Oficial (XML)</span>
              </div>
              <a
                href={xmlUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="text-indigo-600 hover:underline flex items-center gap-1 font-bold text-xs"
              >
                <span>Probar XML</span>
                <ExternalLink className="h-3.5 w-3.5" />
              </a>
            </div>

            <div className="flex items-center gap-2">
              <input
                type="text"
                readOnly
                value={xmlUrl}
                className="flex-1 bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs font-mono text-slate-600 select-all focus:outline-hidden"
              />
              <button
                onClick={() => handleCopy(xmlUrl, 'xml')}
                className={`px-4 py-2 rounded-xl font-bold flex items-center gap-1.5 transition ${
                  copiedType === 'xml'
                    ? 'bg-emerald-600 text-white'
                    : 'bg-indigo-600 hover:bg-indigo-700 text-white'
                }`}
              >
                {copiedType === 'xml' ? (
                  <>
                    <Check className="h-4 w-4" />
                    <span>¡Copiado!</span>
                  </>
                ) : (
                  <>
                    <Copy className="h-4 w-4" />
                    <span>Copiar</span>
                  </>
                )}
              </button>
            </div>
            <p className="text-[11px] text-slate-400 mt-2">
              Formato RSS 2.0 estándar de Google Merchant / Meta Catalog. Incluye precios, fotos, disponibilidad y enlaces directos a la tienda.
            </p>
          </div>

          {activeTab === 'guide' ? (
            <div className="space-y-4">
              <h3 className="font-extrabold text-slate-900 text-sm flex items-center gap-2">
                <HelpCircle className="h-4 w-4 text-indigo-600" />
                Cómo vincularlo en Meta Commerce Manager
              </h3>

              <div className="space-y-3">
                {/* Paso 1 */}
                <div className="flex items-start gap-3 p-3 bg-white border border-slate-200 rounded-2xl shadow-2xs">
                  <span className="flex-shrink-0 flex items-center justify-center h-6 w-6 rounded-full bg-indigo-600 text-white font-black text-xs">
                    1
                  </span>
                  <div>
                    <h4 className="font-bold text-slate-800">Acceder al Administrador de Ventas de Meta</h4>
                    <p className="text-slate-500 mt-0.5 leading-relaxed">
                      Entra a{' '}
                      <a
                        href="https://business.facebook.com/commerce"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-indigo-600 font-bold underline inline-flex items-center gap-0.5"
                      >
                        business.facebook.com/commerce <ExternalLink className="h-3 w-3 inline" />
                      </a>{' '}
                      con tu cuenta comercial de Meta (Meta Business Suite).
                    </p>
                  </div>
                </div>

                {/* Paso 2 */}
                <div className="flex items-start gap-3 p-3 bg-white border border-slate-200 rounded-2xl shadow-2xs">
                  <span className="flex-shrink-0 flex items-center justify-center h-6 w-6 rounded-full bg-indigo-600 text-white font-black text-xs">
                    2
                  </span>
                  <div>
                    <h4 className="font-bold text-slate-800">Agregar Origen de Datos (Feed)</h4>
                    <p className="text-slate-500 mt-0.5 leading-relaxed">
                      En el menú lateral de tu catálogo, ve a <strong>Catálogo &gt; Orígenes de datos</strong>. Haz clic en <strong>Agregar productos</strong> y selecciona <strong>Usar lista de datos (Data Feed)</strong>.
                    </p>
                  </div>
                </div>

                {/* Paso 3 */}
                <div className="flex items-start gap-3 p-3 bg-white border border-slate-200 rounded-2xl shadow-2xs">
                  <span className="flex-shrink-0 flex items-center justify-center h-6 w-6 rounded-full bg-indigo-600 text-white font-black text-xs">
                    3
                  </span>
                  <div>
                    <h4 className="font-bold text-slate-800">Configurar la Lista Programada</h4>
                    <p className="text-slate-500 mt-0.5 leading-relaxed">
                      Selecciona <strong>Lista programada</strong>, pega la URL del Feed XML que copiaste arriba, elige actualización (ej: <em>Cada hora</em> o <em>Diario</em>) y selecciona moneda <strong>ARS</strong>.
                    </p>
                  </div>
                </div>

                {/* Paso 4 */}
                <div className="flex items-start gap-3 p-3 bg-white border border-slate-200 rounded-2xl shadow-2xs">
                  <span className="flex-shrink-0 flex items-center justify-center h-6 w-6 rounded-full bg-emerald-600 text-white font-black text-xs">
                    4
                  </span>
                  <div>
                    <h4 className="font-bold text-slate-800">Conectar tus Canales de Venta</h4>
                    <p className="text-slate-500 mt-0.5 leading-relaxed">
                      Dentro del mismo catálogo, en <strong>Configuración &gt; Canales de negocio</strong>:
                    </p>
                    <ul className="list-disc pl-4 mt-1 text-slate-600 space-y-1">
                      <li><strong>WhatsApp Business:</strong> Vincula tu número y activa "Mostrar catálogo en el perfil".</li>
                      <li><strong>Instagram:</strong> Vincula tu perfil de empresa y solicita la aprobación de Instagram Shopping.</li>
                      <li><strong>Facebook:</strong> Conecta tu página de Facebook para que aparezca la pestaña "Tienda".</li>
                    </ul>
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              <h3 className="font-extrabold text-slate-900 text-sm">
                Formatos Disponibles & Estado
              </h3>

              {/* Status Counters */}
              <div className="grid grid-cols-2 gap-3">
                <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl">
                  <span className="text-[11px] font-semibold text-slate-500">Productos en Catálogo Tienda</span>
                  <p className="text-lg font-black text-slate-800 mt-0.5">{totalProducts}</p>
                </div>
                <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl">
                  <span className="text-[11px] font-semibold text-emerald-700">Aptos con Precio y Foto</span>
                  <p className="text-lg font-black text-emerald-800 mt-0.5">{readyProducts}</p>
                </div>
              </div>

              {/* Alternative CSV */}
              <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4">
                <div className="flex items-center justify-between gap-2 mb-2">
                  <span className="font-bold text-slate-800">Feed alternativo en CSV</span>
                  <a
                    href={csvUrl}
                    download="meta_catalog_3ld.csv"
                    className="text-indigo-600 hover:underline flex items-center gap-1 font-bold text-xs"
                  >
                    <span>Descargar CSV</span>
                    <ExternalLink className="h-3.5 w-3.5" />
                  </a>
                </div>
                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    readOnly
                    value={csvUrl}
                    className="flex-1 bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs font-mono text-slate-600 select-all focus:outline-hidden"
                  />
                  <button
                    onClick={() => handleCopy(csvUrl, 'csv')}
                    className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-white rounded-xl font-bold flex items-center gap-1.5 transition"
                  >
                    {copiedType === 'csv' ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                    <span>{copiedType === 'csv' ? '¡Copiado!' : 'Copiar'}</span>
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 bg-slate-50 border-t border-slate-100 flex items-center justify-between">
          <a
            href="https://business.facebook.com/commerce"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1.5 text-indigo-600 hover:text-indigo-700 font-extrabold text-xs"
          >
            <span>Ir a Meta Commerce Manager</span>
            <ExternalLink className="h-3.5 w-3.5" />
          </a>
          <button
            onClick={onClose}
            className="px-5 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-xl font-bold text-xs transition"
          >
            Cerrar
          </button>
        </div>
      </div>
    </div>
  )
}
