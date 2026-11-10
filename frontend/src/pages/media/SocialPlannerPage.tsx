import React, { useState, useMemo } from 'react'
import {
  Share2,
  Sparkles,
  Calendar,
  Download,
  Copy,
  Check,
  RefreshCw,
  Sliders,
  ExternalLink,
  Layers,
  Clock,
  Hash,
  Eye,
  CheckSquare,
  Square,
  Image as ImageIcon,
  MessageCircle,
  Video,
  FileText
} from 'lucide-react'
import { useCategorias } from '@/hooks/useProductos'
import api from '@/lib/api'
import { toast } from '@/store/toastStore'
import { resolveImageUrl, getThumbnailUrl } from '@/lib/utils'

export interface SocialPostItem {
  day: number
  product_id: number
  product_name: string
  image_url: string
  format: 'Feed' | 'Reel' | 'Historia'
  hook: string
  caption: string
  hashtags: string
  visual_guide: string
  suggested_time: string
  isScheduled?: boolean
}

export default function SocialPlannerPage() {
  const { data: categorias = [] } = useCategorias()

  // Form Controls
  const [selectedCategoriaId, setSelectedCategoriaId] = useState<string>('all')
  const [daysCount, setDaysCount] = useState<number>(30)
  const [campaignFocus, setCampaignFocus] = useState<string>('balanced')
  const [voiceTone, setVoiceTone] = useState<string>('cercano')
  const [aiModel, setAiModel] = useState<string>('gpt-4o')
  const [customCta, setCustomCta] = useState<string>('Envíos a todo el país. Comprá en 3ld.com.ar con envío gratis desde $30.000!')

  // Output State
  const [posts, setPosts] = useState<SocialPostItem[]>(() => {
    try {
      const saved = localStorage.getItem('3ld_social_calendar_posts')
      return saved ? JSON.parse(saved) : []
    } catch {
      return []
    }
  })
  const [isGenerating, setIsGenerating] = useState(false)
  const [copiedDay, setCopiedDay] = useState<number | null>(null)
  const [activeFilterFormat, setActiveFilterFormat] = useState<string>('all')
  const [searchFilter, setSearchFilter] = useState<string>('')
  const [selectedPostModal, setSelectedPostModal] = useState<SocialPostItem | null>(null)

  // Guardar en localStorage
  const savePostsState = (newPosts: SocialPostItem[]) => {
    setPosts(newPosts)
    try {
      localStorage.setItem('3ld_social_calendar_posts', JSON.stringify(newPosts))
    } catch {}
  }

  // Generar Calendario con OpenAI
  const handleGenerate = async () => {
    setIsGenerating(true)
    try {
      const res = await api.post('/ai/generate-social-calendar', {
        days_count: daysCount,
        categoria_id: selectedCategoriaId === 'all' ? null : Number(selectedCategoriaId),
        focus: campaignFocus,
        tone: voiceTone,
        custom_cta: customCta,
        model: aiModel
      })

      if (res.data?.success && Array.isArray(res.data.data)) {
        savePostsState(res.data.data)
        toast(`¡Campaña de ${res.data.data.length} publicaciones generada con éxito con IA!`, 'success')
      } else {
        toast('No se pudo generar el calendario. Verificá los datos.', 'error')
      }
    } catch (err: any) {
      toast(err.response?.data?.message || err.message || 'Error al conectar con la IA', 'error')
    } finally {
      setIsGenerating(false)
    }
  }

  // Marcar agendado
  const toggleScheduled = (day: number) => {
    const updated = posts.map((p) => (p.day === day ? { ...p, isScheduled: !p.isScheduled } : p))
    savePostsState(updated)
  }

  // Copiar copy completo para Meta
  const copyPostContent = (post: SocialPostItem) => {
    const fullText = `${post.hook}\n\n${post.caption}\n\n${post.hashtags}`
    navigator.clipboard.writeText(fullText)
    setCopiedDay(post.day)
    toast(`¡Publicación del Día ${post.day} copiada para Meta Business Suite!`, 'success')
    setTimeout(() => setCopiedDay(null), 2500)
  }

  // Exportar a CSV compatible con Meta Business Suite Planner
  const exportToMetaCSV = () => {
    if (posts.length === 0) {
      toast('No hay publicaciones para exportar', 'info')
      return
    }

    let csv = '\uFEFF' // BOM para UTF-8 en Excel
    csv += 'Dia,Formato,Producto,Horario_Sugerido,Hook,Copywriting,Hashtags,Guion_Visual,Agendado,Imagen_URL\r\n'

    posts.forEach((p) => {
      const cleanCopy = `"${p.caption.replace(/"/g, '""')}"`
      const cleanHook = `"${p.hook.replace(/"/g, '""')}"`
      const cleanVisual = `"${p.visual_guide.replace(/"/g, '""')}"`
      const cleanProd = `"${p.product_name.replace(/"/g, '""')}"`
      const cleanImg = `"${resolveImageUrl(p.image_url)}"`

      const row = [
        p.day,
        p.format,
        cleanProd,
        `"${p.suggested_time}"`,
        cleanHook,
        cleanCopy,
        `"${p.hashtags}"`,
        cleanVisual,
        p.isScheduled ? 'SI' : 'NO',
        cleanImg
      ].join(',')
      csv += row + '\r\n'
    })

    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.setAttribute('download', `3LD_Campana_Redes_${posts.length}_Dias.csv`)
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    URL.revokeObjectURL(url)

    toast('Archivo CSV generado y descargado correctamente', 'success')
  }

  // Filtrado de publicaciones en pantalla
  const filteredPosts = useMemo(() => {
    return posts.filter((p) => {
      if (activeFilterFormat !== 'all' && p.format.toLowerCase() !== activeFilterFormat.toLowerCase()) {
        return false
      }
      if (searchFilter.trim()) {
        const q = searchFilter.toLowerCase().trim()
        const matchName = p.product_name.toLowerCase().includes(q)
        const matchCopy = p.caption.toLowerCase().includes(q)
        const matchHook = p.hook.toLowerCase().includes(q)
        if (!matchName && !matchCopy && !matchHook) return false
      }
      return true
    })
  }, [posts, activeFilterFormat, searchFilter])

  const scheduledCount = posts.filter((p) => p.isScheduled).length

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-6 rounded-3xl border border-slate-200 shadow-xs">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-sky-500 to-indigo-600 flex items-center justify-center text-white shadow-md">
            <Share2 className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-xl font-black text-slate-900 tracking-tight flex items-center gap-2">
              Planificador de Redes & Campañas IA
              <span className="text-xs bg-indigo-100 text-indigo-700 px-2.5 py-0.5 rounded-full font-bold">
                Meta Business Suite
              </span>
            </h1>
            <p className="text-xs text-slate-500 font-medium mt-0.5">
              Generá copies de alta conversión, ganchos y guiones basados exclusivamente en las fotos y stock real de tu tienda.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2.5">
          {posts.length > 0 && (
            <button
              onClick={exportToMetaCSV}
              className="inline-flex items-center gap-2 px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-800 rounded-xl text-xs font-bold transition"
            >
              <Download className="w-4 h-4 text-slate-600" />
              <span>Exportar CSV Meta</span>
            </button>
          )}

          <a
            href="https://business.facebook.com/latest/composer"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 px-4 py-2.5 bg-[#0866FF] hover:bg-[#0759DF] text-white rounded-xl text-xs font-bold transition shadow-sm"
          >
            <ExternalLink className="w-4 h-4" />
            <span>Abrir Meta Planner</span>
          </a>
        </div>
      </div>

      {/* Controles del Generador IA */}
      <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-xs space-y-4">
        <div className="flex items-center justify-between pb-3 border-b border-slate-100">
          <h2 className="text-sm font-extrabold text-slate-800 flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-amber-500" />
            Configurar Estrategia de Campaña
          </h2>
          <span className="text-xs text-slate-400 font-medium">Motor IA con Conexión a Base de Datos</span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 text-xs">
          {/* Categoría */}
          <div>
            <label className="block font-bold text-slate-700 mb-1.5">Categoría de Productos:</label>
            <select
              value={selectedCategoriaId}
              onChange={(e) => setSelectedCategoriaId(e.target.value)}
              className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 text-xs font-medium text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
            >
              <option value="all">Todas las categorías activas</option>
              {categorias.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.nombre}
                </option>
              ))}
            </select>
          </div>

          {/* Días a Planificar */}
          <div>
            <label className="block font-bold text-slate-700 mb-1.5">Cantidad de Días:</label>
            <select
              value={daysCount}
              onChange={(e) => setDaysCount(Number(e.target.value))}
              className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 text-xs font-medium text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
            >
              <option value={7}>7 Días (1 Semana express)</option>
              <option value={15}>15 Días (Quincena)</option>
              <option value={30}>30 Días (1 Mes completo)</option>
              <option value={60}>60 Días (2 Meses)</option>
              <option value={90}>90 Días (Trimestre)</option>
              <option value={120}>120 Días (Cuatrimestre estacional)</option>
            </select>
          </div>

          {/* Enfoque Temático */}
          <div>
            <label className="block font-bold text-slate-700 mb-1.5">Enfoque de Campaña:</label>
            <select
              value={campaignFocus}
              onChange={(e) => setCampaignFocus(e.target.value)}
              className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 text-xs font-medium text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
            >
              <option value="balanced">Equilibrado (Ventas, Tips, Ganchos y Beneficios)</option>
              <option value="navidad">Especial Campaña Navidad (Mesa, Árbol y Regalos)</option>
              <option value="egresados">Graduación & Egresados 2026</option>
              <option value="reposteria">Repostería & Cortantes con Filo Preciso</option>
              <option value="hogar">Deco Hogar, Mates y Organizadores</option>
            </select>
          </div>

          {/* Modelo IA */}
          <div>
            <label className="block font-bold text-slate-700 mb-1.5">Modelo IA Avanzado:</label>
            <select
              value={aiModel}
              onChange={(e) => setAiModel(e.target.value)}
              className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 text-xs font-medium text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
            >
              <option value="gpt-4o">GPT-4o (Máxima creatividad y persuasión comercial)</option>
              <option value="gpt-4o-mini">GPT-4o mini (Ultrarrápido y económico)</option>
            </select>
          </div>
        </div>

        {/* CTA personalizado */}
        <div>
          <label className="block font-bold text-slate-700 mb-1 text-xs">
            Llamado a la Acción (CTA) y Promoción en cada post:
          </label>
          <input
            type="text"
            value={customCta}
            onChange={(e) => setCustomCta(e.target.value)}
            placeholder="Ej: Envío gratis desde $30.000. Pedilo en 3ld.com.ar o al WhatsApp!"
            className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 text-xs font-medium text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
          />
        </div>

        {/* Botón de Acción */}
        <div className="flex items-center justify-between pt-2">
          <span className="text-xs text-slate-400">
            {posts.length > 0 ? `${posts.length} publicaciones cargadas en memoria` : 'Aún no generaste contenido'}
          </span>
          <button
            onClick={handleGenerate}
            disabled={isGenerating}
            className="inline-flex items-center gap-2 px-6 py-2.5 bg-gradient-to-r from-sky-600 to-indigo-600 hover:from-sky-700 hover:to-indigo-700 text-white rounded-xl text-xs font-black shadow-md transition disabled:opacity-50"
          >
            {isGenerating ? (
              <>
                <RefreshCw className="w-4 h-4 animate-spin" />
                <span>Diseñando Estrategia 3LD con {aiModel}...</span>
              </>
            ) : (
              <>
                <Sparkles className="w-4 h-4" />
                <span>Generar Campaña con IA</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* Barra de Filtros y Métricas Rápidas */}
      {posts.length > 0 && (
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3 bg-white p-3.5 rounded-2xl border border-slate-200 shadow-xs">
          {/* Filtro por Formato */}
          <div className="flex items-center gap-1.5 overflow-x-auto w-full sm:w-auto">
            <button
              onClick={() => setActiveFilterFormat('all')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition ${
                activeFilterFormat === 'all'
                  ? 'bg-indigo-600 text-white'
                  : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
              }`}
            >
              Todos ({posts.length})
            </button>
            <button
              onClick={() => setActiveFilterFormat('feed')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition ${
                activeFilterFormat === 'feed'
                  ? 'bg-sky-600 text-white'
                  : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
              }`}
            >
              Feed / Carrusel ({posts.filter((p) => p.format.toLowerCase() === 'feed').length})
            </button>
            <button
              onClick={() => setActiveFilterFormat('reel')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition ${
                activeFilterFormat === 'reel'
                  ? 'bg-slate-900 text-white'
                  : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
              }`}
            >
              Reels ({posts.filter((p) => p.format.toLowerCase() === 'reel').length})
            </button>
            <button
              onClick={() => setActiveFilterFormat('historia')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition ${
                activeFilterFormat === 'historia'
                  ? 'bg-rose-600 text-white'
                  : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
              }`}
            >
              Historias ({posts.filter((p) => p.format.toLowerCase() === 'historia').length})
            </button>
          </div>

          {/* Barra de Búsqueda y Progreso */}
          <div className="flex items-center gap-3 w-full sm:w-auto justify-between">
            <input
              type="text"
              placeholder="Filtrar por texto o producto..."
              value={searchFilter}
              onChange={(e) => setSearchFilter(e.target.value)}
              className="py-1.5 px-3 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 focus:outline-none w-full sm:w-56"
            />
            <div className="text-xs font-bold text-slate-600 shrink-0">
              <span className="text-emerald-600">{scheduledCount}</span> de {posts.length} agendados
            </div>
          </div>
        </div>
      )}

      {/* Grid de Publicaciones */}
      {posts.length === 0 ? (
        <div className="bg-white p-12 rounded-3xl border border-slate-200 text-center space-y-3">
          <Calendar className="w-12 h-12 text-slate-300 mx-auto" />
          <h3 className="font-extrabold text-sm text-slate-800">No hay publicaciones planificadas</h3>
          <p className="text-xs text-slate-500 max-w-md mx-auto">
            Elegí una categoría y la cantidad de días arriba, y hacé clic en "Generar Campaña con IA" para armar tu mes de contenidos listo para Meta Business Suite.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredPosts.map((post) => {
            const isCopied = copiedDay === post.day
            const fullImgUrl = resolveImageUrl(post.image_url)

            return (
              <div
                key={post.day}
                className={`bg-white rounded-3xl border p-5 flex flex-col justify-between transition-all duration-200 shadow-xs hover:shadow-md ${
                  post.isScheduled ? 'border-emerald-300 bg-emerald-50/15' : 'border-slate-200'
                }`}
              >
                <div>
                  {/* Encabezado de la Tarjeta */}
                  <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                    <div className="flex items-center gap-2">
                      <span className="w-7 h-7 rounded-xl bg-slate-900 text-white text-xs font-black flex items-center justify-center">
                        D{post.day}
                      </span>
                      <span
                        className={`text-[10px] font-black px-2.5 py-0.5 rounded-full uppercase tracking-wider ${
                          post.format.toLowerCase() === 'reel'
                            ? 'bg-slate-900 text-white'
                            : post.format.toLowerCase() === 'historia'
                            ? 'bg-rose-100 text-rose-800'
                            : 'bg-sky-100 text-sky-800'
                        }`}
                      >
                        {post.format}
                      </span>
                    </div>

                    <div className="flex items-center gap-1.5 text-xs text-slate-500 font-semibold">
                      <Clock className="w-3.5 h-3.5 text-slate-400" />
                      <span>{post.suggested_time || '20:00 hs'}</span>
                    </div>
                  </div>

                  {/* Foto y Producto Asociado */}
                  <div className="flex items-center gap-3 my-3 p-2 bg-slate-50 rounded-2xl border border-slate-100">
                    <div className="w-14 h-14 rounded-xl overflow-hidden bg-slate-200 shrink-0 border border-slate-200">
                      <img
                        src={getThumbnailUrl(post.image_url, 160)}
                        alt={post.product_name}
                        className="w-full h-full object-cover"
                        onError={(e) => {
                          if (e.currentTarget.src !== fullImgUrl) {
                            e.currentTarget.src = fullImgUrl
                          }
                        }}
                      />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-xs font-black text-slate-800 truncate" title={post.product_name}>
                        {post.product_name}
                      </p>
                      <a
                        href={`https://3ld.com.ar/tienda?producto=${post.product_id}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-[10px] font-bold text-sky-600 hover:underline flex items-center gap-1 mt-0.5"
                      >
                        <span>Ver en tienda</span>
                        <ExternalLink className="w-2.5 h-2.5" />
                      </a>
                    </div>
                  </div>

                  {/* Gancho Visual (Hook) */}
                  <div className="mb-3">
                    <p className="text-xs font-black text-slate-900 leading-snug">
                      🎯 {post.hook}
                    </p>
                  </div>

                  {/* Copywriting */}
                  <div className="mb-3">
                    <p className="text-xs text-slate-600 leading-relaxed line-clamp-4 whitespace-pre-line">
                      {post.caption}
                    </p>
                  </div>

                  {/* Guion / Indicación Visual */}
                  {post.visual_guide && (
                    <div className="p-2.5 bg-slate-50 rounded-xl border border-slate-100 text-[11px] text-slate-500 mb-3 space-y-1">
                      <span className="font-bold text-slate-700 block">🎬 Idea visual / Guión:</span>
                      <p className="line-clamp-2">{post.visual_guide}</p>
                    </div>
                  )}

                  {/* Hashtags */}
                  <div className="text-[10px] text-indigo-600 font-semibold truncate mb-4">
                    {post.hashtags}
                  </div>
                </div>

                {/* Acciones Inferiores */}
                <div className="pt-3 border-t border-slate-100 flex items-center justify-between gap-2">
                  <button
                    onClick={() => toggleScheduled(post.day)}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition ${
                      post.isScheduled
                        ? 'bg-emerald-100 text-emerald-800 hover:bg-emerald-200'
                        : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                    }`}
                  >
                    {post.isScheduled ? (
                      <>
                        <CheckSquare className="w-4 h-4 text-emerald-600" />
                        <span>Agendado</span>
                      </>
                    ) : (
                      <>
                        <Square className="w-4 h-4 text-slate-400" />
                        <span>Marcar Agendado</span>
                      </>
                    )}
                  </button>

                  <button
                    onClick={() => copyPostContent(post)}
                    className="flex items-center gap-1.5 px-3.5 py-1.5 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-black shadow-xs transition"
                  >
                    {isCopied ? (
                      <>
                        <Check className="w-3.5 h-3.5 text-emerald-400" />
                        <span>¡Copiado!</span>
                      </>
                    ) : (
                      <>
                        <Copy className="w-3.5 h-3.5" />
                        <span>Copiar Copy</span>
                      </>
                    )}
                  </button>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}

