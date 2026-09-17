import { useState, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { X, PackagePlus, ShoppingBag, Camera, ImagePlus, Loader2, ArrowLeft, Sparkles } from 'lucide-react'
import { compressImage } from '@/lib/imageUtils'
import { toast } from '@/store/toastStore'

interface QuickCreateModalProps {
  isOpen: boolean
  onClose: () => void
  onOpenProductForm: (initialImages?: string[]) => void
}

type Step = 'select-type' | 'product-image'

export function QuickCreateModal({ isOpen, onClose, onOpenProductForm }: QuickCreateModalProps) {
  const navigate = useNavigate()
  const [step, setStep] = useState<Step>('select-type')
  const [isCompressing, setIsCompressing] = useState(false)

  const cameraInputRef = useRef<HTMLInputElement>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  if (!isOpen) return null

  const handleClose = () => {
    setStep('select-type')
    onClose()
  }

  const handleSelectPedido = () => {
    handleClose()
    navigate('/pedidos/nuevo')
  }

  const handleSelectProducto = () => {
    setStep('product-image')
  }

  const handleFilesSelected = async (files: FileList | null) => {
    if (!files || files.length === 0) return
    setIsCompressing(true)
    try {
      const compressedImages: string[] = []
      for (let i = 0; i < files.length; i++) {
        const compressed = await compressImage(files[i])
        compressedImages.push(compressed)
      }
      handleClose()
      onOpenProductForm(compressedImages)
      toast(`${compressedImages.length} foto(s) cargada(s)`, 'success')
    } catch (error) {
      toast('Error al procesar las imágenes', 'error')
    } finally {
      setIsCompressing(false)
    }
  }

  const handleSkipImage = () => {
    handleClose()
    onOpenProductForm([])
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200">
      {/* Hidden file inputs */}
      <input
        ref={cameraInputRef}
        type="file"
        accept="image/*"
        capture="environment"
        multiple
        className="hidden"
        onChange={(e) => handleFilesSelected(e.target.files)}
      />
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        multiple
        className="hidden"
        onChange={(e) => handleFilesSelected(e.target.files)}
      />

      <div className="w-full sm:max-w-md rounded-t-3xl sm:rounded-3xl bg-white shadow-2xl border border-slate-100 overflow-hidden animate-in slide-in-from-bottom duration-300">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-100 px-6 py-4">
          <div className="flex items-center gap-2">
            {step === 'product-image' && (
              <button
                onClick={() => setStep('select-type')}
                className="mr-1 rounded-full p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-700 transition-colors"
                aria-label="Volver"
              >
                <ArrowLeft className="h-5 w-5" />
              </button>
            )}
            <h2 className="text-lg font-black text-slate-800">
              {step === 'select-type' ? 'Crear Nuevo' : 'Foto del Producto'}
            </h2>
          </div>
          <button
            onClick={handleClose}
            className="rounded-full p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-700 transition-colors"
            aria-label="Cerrar"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6">
          {step === 'select-type' ? (
            <div className="space-y-4">
              <p className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-2">
                ¿Qué deseas registrar hoy?
              </p>

              {/* Option 1: Nuevo Pedido */}
              <button
                onClick={handleSelectPedido}
                className="w-full flex items-center gap-4 p-4 rounded-2xl border-2 border-slate-100 bg-slate-50/50 hover:bg-primary/5 hover:border-primary/40 transition-all text-left group"
              >
                <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br from-primary to-primary-dark text-white shadow-md shadow-primary/20 group-hover:scale-105 transition-transform">
                  <PackagePlus className="h-6 w-6" />
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="text-base font-black text-slate-800 group-hover:text-primary transition-colors">
                    Nuevo Pedido
                  </h3>
                  <p className="text-xs text-slate-500 truncate">
                    Registrar una nueva venta o pedido de cliente
                  </p>
                </div>
              </button>

              {/* Option 2: Nuevo Producto */}
              <button
                onClick={handleSelectProducto}
                className="w-full flex items-center gap-4 p-4 rounded-2xl border-2 border-slate-100 bg-slate-50/50 hover:bg-secondary/5 hover:border-secondary/40 transition-all text-left group"
              >
                <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br from-secondary to-brand-purple text-white shadow-md shadow-secondary/20 group-hover:scale-105 transition-transform">
                  <ShoppingBag className="h-6 w-6" />
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="text-base font-black text-slate-800 group-hover:text-secondary transition-colors">
                    Nuevo Producto
                  </h3>
                  <p className="text-xs text-slate-500 truncate">
                    Agregar producto escaneando o sacando fotos
                  </p>
                </div>
              </button>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="text-center mb-4">
                <div className="inline-flex items-center justify-center h-12 w-12 rounded-full bg-secondary/10 text-secondary mb-2">
                  <Sparkles className="h-6 w-6" />
                </div>
                <h3 className="text-base font-black text-slate-800">
                  Comencemos con las fotos
                </h3>
                <p className="text-xs text-slate-500 mt-1 max-w-xs mx-auto">
                  Selecciona o tomá una o varias fotos del producto. Luego completarás el resto de los datos.
                </p>
              </div>

              {isCompressing ? (
                <div className="py-8 text-center space-y-3">
                  <Loader2 className="h-8 w-8 animate-spin text-primary mx-auto" />
                  <p className="text-xs font-bold text-slate-600">Procesando y optimizando imágenes...</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {/* Button: Camera */}
                  <button
                    onClick={() => cameraInputRef.current?.click()}
                    className="flex flex-col items-center justify-center p-5 rounded-2xl border-2 border-slate-100 bg-slate-50 hover:bg-primary/5 hover:border-primary transition-all group"
                  >
                    <div className="h-12 w-12 rounded-xl bg-primary/10 text-primary flex items-center justify-center mb-2 group-hover:scale-110 transition-transform">
                      <Camera className="h-6 w-6" />
                    </div>
                    <span className="text-xs font-bold text-slate-800 group-hover:text-primary">
                      Abrir Cámara
                    </span>
                    <span className="text-[10px] text-slate-400 mt-0.5">Tomar foto ahora</span>
                  </button>

                  {/* Button: Gallery */}
                  <button
                    onClick={() => fileInputRef.current?.click()}
                    className="flex flex-col items-center justify-center p-5 rounded-2xl border-2 border-slate-100 bg-slate-50 hover:bg-secondary/5 hover:border-secondary transition-all group"
                  >
                    <div className="h-12 w-12 rounded-xl bg-secondary/10 text-secondary flex items-center justify-center mb-2 group-hover:scale-110 transition-transform">
                      <ImagePlus className="h-6 w-6" />
                    </div>
                    <span className="text-xs font-bold text-slate-800 group-hover:text-secondary">
                      Galería / Archivo
                    </span>
                    <span className="text-[10px] text-slate-400 mt-0.5">Seleccionar varias</span>
                  </button>
                </div>
              )}

              <div className="pt-2 border-t border-slate-100 text-center">
                <button
                  type="button"
                  onClick={handleSkipImage}
                  disabled={isCompressing}
                  className="text-xs font-bold text-slate-400 hover:text-slate-600 transition-colors py-1 px-3 rounded-lg"
                >
                  Saltar fotos y cargar datos directamente
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
