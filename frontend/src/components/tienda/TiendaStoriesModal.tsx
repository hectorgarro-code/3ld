import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import {
  X,
  Heart,
  ShoppingCart,
  Share2,
  MessageCircle,
  ChevronLeft,
  ChevronRight,
  Pause,
  Play,
  Sparkles,
  Zap,
  Info,
  Layers,
  ArrowRight
} from 'lucide-react';
import type { StoreProduct } from '@/pages/tienda/TiendaPage';
import { trackViewStory, trackWhatsAppClick, trackEvent } from '@/lib/analyticsTracker';

interface TiendaStoriesModalProps {
  isOpen: boolean;
  onClose: () => void;
  products: StoreProduct[];
  onOpenProduct: (product: StoreProduct) => void;
  onAddToCart: (product: StoreProduct) => void;
  favorites: (string | number)[];
  onToggleFavorite: (productId: string | number) => void;
}

const STORY_DURATION_MS = 6000; // 6 segundos por producto

export function TiendaStoriesModal({
  isOpen,
  onClose,
  products,
  onOpenProduct,
  onAddToCart,
  favorites,
  onToggleFavorite,
}: TiendaStoriesModalProps) {
  // Lista barajada de productos con foto válida
  const [shuffledProducts, setShuffledProducts] = useState<StoreProduct[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [progress, setProgress] = useState(0);
  const [isPaused, setIsPaused] = useState(false);
  const [showHeartBurst, setShowHeartBurst] = useState(false);
  const [showFavoritesView, setShowFavoritesView] = useState(false);

  // Referencias para control táctil y temporal
  const timerRef = useRef<number | null>(null);
  const touchStartRef = useRef<{ x: number; y: number; time: number } | null>(null);
  const isHoldingRef = useRef(false);
  const holdTimeoutRef = useRef<number | null>(null);

  // Barajar productos cada vez que se abre la vista
  useEffect(() => {
    if (isOpen) {
      const valid = products.filter((p) => Boolean(p.image));
      // Shuffle con algoritmo Fisher-Yates
      const copy = [...valid];
      for (let i = copy.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [copy[i], copy[j]] = [copy[j], copy[i]];
      }
      setShuffledProducts(copy);
      setCurrentIndex(0);
      setProgress(0);
      setIsPaused(false);
      setShowFavoritesView(false);

      // Gestión del botón "Atrás" del celular
      window.history.pushState({ modal: 'historias' }, '', window.location.href);
      const handlePop = (e: PopStateEvent) => {
        if (e.state?.modal !== 'historias') {
          onClose();
        }
      };
      window.addEventListener('popstate', handlePop);
      return () => {
        window.removeEventListener('popstate', handlePop);
      };
    }
  }, [isOpen, products, onClose]);

  const handleCloseModal = useCallback(() => {
    if (window.history.state?.modal === 'historias') {
      window.history.back();
    }
    onClose();
  }, [onClose]);

  const currentProduct = shuffledProducts[currentIndex];
  const isFavorite = currentProduct ? favorites.includes(currentProduct.id) : false;

  // Registrar analítica de historia vista
  useEffect(() => {
    if (isOpen && currentProduct) {
      trackViewStory(currentProduct);
    }
  }, [isOpen, currentProduct?.id]);

  const nextStory = useCallback(() => {
    if (currentIndex < shuffledProducts.length - 1) {
      setCurrentIndex((prev) => prev + 1);
      setProgress(0);
    } else {
      // Si llegó al final, volver a barajar o cerrar
      handleCloseModal();
    }
  }, [currentIndex, shuffledProducts.length, handleCloseModal]);

  const prevStory = useCallback(() => {
    if (currentIndex > 0) {
      setCurrentIndex((prev) => prev - 1);
      setProgress(0);
    } else {
      setProgress(0);
    }
  }, [currentIndex]);

  // Timer de progreso automático
  useEffect(() => {
    if (!isOpen || isPaused || shuffledProducts.length === 0 || showFavoritesView) {
      if (timerRef.current) clearInterval(timerRef.current);
      return;
    }

    const interval = 50; // cada 50ms actualiza el progreso
    const step = (interval / STORY_DURATION_MS) * 100;

    timerRef.current = window.setInterval(() => {
      setProgress((prev) => {
        if (prev >= 100) {
          nextStory();
          return 0;
        }
        return prev + step;
      });
    }, interval);

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [isOpen, isPaused, currentIndex, shuffledProducts.length, nextStory, showFavoritesView]);

  // Manejo táctil (pausa al mantener, avance/retroceso al tocar, swipe down para cerrar)
  const handleTouchStart = (e: React.TouchEvent | React.MouseEvent) => {
    const clientX = 'touches' in e ? e.touches[0].clientX : (e as React.MouseEvent).clientX;
    const clientY = 'touches' in e ? e.touches[0].clientY : (e as React.MouseEvent).clientY;

    touchStartRef.current = { x: clientX, y: clientY, time: Date.now() };

    // Si mantiene presionado más de 180ms, pausar la historia
    holdTimeoutRef.current = window.setTimeout(() => {
      isHoldingRef.current = true;
      setIsPaused(true);
    }, 180);
  };

  const handleTouchEnd = (e: React.TouchEvent | React.MouseEvent) => {
    if (holdTimeoutRef.current) clearTimeout(holdTimeoutRef.current);

    const clientX = 'changedTouches' in e ? e.changedTouches[0].clientX : (e as React.MouseEvent).clientX;
    const clientY = 'changedTouches' in e ? e.changedTouches[0].clientY : (e as React.MouseEvent).clientY;

    if (isHoldingRef.current) {
      isHoldingRef.current = false;
      setIsPaused(false);
      return;
    }

    if (!touchStartRef.current) return;
    const deltaX = clientX - touchStartRef.current.x;
    const deltaY = clientY - touchStartRef.current.y;
    const touchDuration = Date.now() - touchStartRef.current.time;

    // Detectar Swipe hacia abajo para cerrar historia
    if (deltaY > 80 && Math.abs(deltaY) > Math.abs(deltaX)) {
      handleCloseModal();
      return;
    }

    // Toque lateral: izquierda (< 40%) retrocede a la anterior, derecha (>= 40%) avanza a la siguiente
    if (touchDuration < 350 && Math.abs(deltaX) < 40 && Math.abs(deltaY) < 40) {
      const screenWidth = window.innerWidth;
      if (clientX < screenWidth * 0.4) {
        prevStory();
      } else {
        nextStory();
      }
    }
  };

  const handleShareCurrent = async () => {
    if (!currentProduct) return;
    const url = `${window.location.origin}/tienda?producto=${currentProduct.id}`;
    if (navigator.share) {
      try {
        await navigator.share({
          title: currentProduct.title,
          text: `Mirá esta pieza en 3LD: ${currentProduct.title} - $${currentProduct.price.toLocaleString('es-AR')}`,
          url
        });
      } catch {}
    } else {
      navigator.clipboard.writeText(url);
    }
  };

  const handleWhatsAppConsult = () => {
    if (!currentProduct) return;
    trackWhatsAppClick('historia', currentProduct);
    const phone = '5492257559540';
    const text = `¡Hola 3LD! 👋 Vi esta historia en la tienda y me interesa saber más:\n\n*${currentProduct.title}*\nPrecio: $${currentProduct.price.toLocaleString('es-AR')}\nEnlace: ${window.location.origin}/tienda?producto=${currentProduct.id}`;
    window.open(`https://wa.me/${phone}?text=${encodeURIComponent(text)}`, '_blank');
  };

  // Productos favoritos listados
  const favoriteProducts = useMemo(() => {
    return products.filter((p) => favorites.includes(p.id));
  }, [products, favorites]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-black text-white flex flex-col justify-between overflow-hidden select-none touch-none">
      {/* Estilos para el efecto de movimiento cinematográfico (Ken Burns) */}
      <style>{`
        @keyframes kenBurnsEffect {
          0% {
            transform: scale(1.02) translate(0%, 0%);
          }
          50% {
            transform: scale(1.14) translate(-1.5%, -1%);
          }
          100% {
            transform: scale(1.08) translate(1%, 0.5%);
          }
        }
        .animate-ken-burns {
          animation: kenBurnsEffect 7s ease-in-out infinite alternate;
        }
        @keyframes heartPop {
          0% {
            transform: translate(-50%, -50%) scale(0);
            opacity: 0;
          }
          40% {
            transform: translate(-50%, -50%) scale(1.4);
            opacity: 1;
          }
          70% {
            transform: translate(-50%, -50%) scale(1.1);
            opacity: 0.9;
          }
          100% {
            transform: translate(-50%, -50%) scale(1.8);
            opacity: 0;
          }
        }
        .animate-heart-pop {
          animation: heartPop 0.85s cubic-bezier(0.175, 0.885, 0.32, 1.275) forwards;
        }
      `}</style>

      {/* VISTA DE FAVORITOS (OVERLAY) */}
      {showFavoritesView ? (
        <div className="absolute inset-0 z-40 bg-slate-950/95 backdrop-blur-md flex flex-col p-5 overflow-y-auto animate-in fade-in duration-200">
          <div className="flex items-center justify-between pb-4 border-b border-slate-800">
            <div className="flex items-center gap-2">
              <Heart className="w-5 h-5 text-red-500 fill-red-500" />
              <h2 className="text-base font-black tracking-tight">Mis Favoritos ({favoriteProducts.length})</h2>
            </div>
            <button
              onClick={() => setShowFavoritesView(false)}
              className="p-2 bg-slate-800 hover:bg-slate-700 text-white rounded-full transition"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {favoriteProducts.length === 0 ? (
            <div className="flex-1 flex flex-col items-center justify-center text-center p-6 text-slate-400">
              <Heart className="w-12 h-12 text-slate-700 mb-3" />
              <p className="text-sm font-semibold">Aún no agregaste piezas a favoritos</p>
              <p className="text-xs text-slate-500 mt-1 max-w-xs">
                Tocá dos veces en la foto de cualquier historia o pulsá el corazón para guardarla aquí.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-3 pt-4 pb-20">
              {favoriteProducts.map((p) => (
                <div
                  key={p.id}
                  onClick={() => {
                    setShowFavoritesView(false);
                    onOpenProduct(p);
                  }}
                  className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden cursor-pointer active:scale-95 transition flex flex-col group"
                >
                  <div className="relative aspect-square bg-slate-800 overflow-hidden">
                    <img src={p.image} alt={p.title} className="w-full h-full object-cover group-hover:scale-105 transition" />
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        onToggleFavorite(p.id);
                      }}
                      className="absolute top-2 right-2 p-1.5 bg-black/60 rounded-full text-red-500"
                    >
                      <Heart className="w-4 h-4 fill-red-500" />
                    </button>
                  </div>
                  <div className="p-2.5 flex flex-col flex-1 justify-between">
                    <p className="text-xs font-bold line-clamp-1 text-slate-200">{p.title}</p>
                    <p className="text-sm font-black text-cyan-400 mt-1">${p.price.toLocaleString('es-AR')}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      ) : null}

      {/* CONTENIDO PRINCIPAL DE LA HISTORIA */}
      {currentProduct && (
        <div
          className="absolute inset-0 z-0 overflow-hidden cursor-pointer"
          onMouseDown={handleTouchStart}
          onMouseUp={handleTouchEnd}
          onTouchStart={handleTouchStart}
          onTouchEnd={handleTouchEnd}
        >
          {/* Fondo difuminado ambiental inmersivo */}
          <div
            className="absolute inset-0 bg-cover bg-center filter blur-3xl opacity-50 scale-150 transition-all duration-700 pointer-events-none"
            style={{ backgroundImage: `url(${currentProduct.image})` }}
          />

          {/* Imagen central 4:3 contenida al 100% sin recortes con Ken Burns */}
          <div className="relative w-full h-full flex items-center justify-center px-4 pt-16 pb-48 overflow-hidden pointer-events-none">
            <div className="relative max-h-full max-w-full flex items-center justify-center">
              <img
                key={currentProduct.id}
                src={currentProduct.image}
                alt={currentProduct.title}
                className="max-h-[52vh] sm:max-h-[62vh] w-auto max-w-[92vw] sm:max-w-md object-contain rounded-2xl shadow-2xl drop-shadow-[0_20px_40px_rgba(0,0,0,0.85)] border border-white/10 animate-ken-burns pointer-events-none"
              />
            </div>
            {/* Gradientes oscuros superior e inferior para legibilidad */}
            <div className="absolute inset-0 bg-gradient-to-t from-black via-transparent to-black/70 pointer-events-none" />
          </div>

          {/* Efecto Corazón Pop en Doble Tap */}
          {showHeartBurst && (
            <div className="absolute top-1/2 left-1/2 pointer-events-none animate-heart-pop z-30">
              <Heart className="w-28 h-28 text-red-500 fill-red-500 drop-shadow-2xl" />
            </div>
          )}
        </div>
      )}

      {/* HEADER SUPERIOR: Barras de Progreso e Información */}
      <div className="relative z-20 pt-3 px-3 sm:px-4 space-y-2 bg-gradient-to-b from-black/80 to-transparent">
        {/* Barras de Progreso tipo WhatsApp/Instagram */}
        <div className="flex items-center gap-1 w-full max-w-lg mx-auto">
          {shuffledProducts.slice(0, 24).map((_, idx) => {
            const isCompleted = idx < currentIndex;
            const isCurrent = idx === currentIndex;
            return (
              <div key={idx} className="h-1 flex-1 bg-white/30 rounded-full overflow-hidden">
                <div
                  className="h-full bg-white transition-all duration-75"
                  style={{
                    width: isCompleted ? '100%' : isCurrent ? `${progress}%` : '0%',
                  }}
                />
              </div>
            );
          })}
        </div>

        {/* Barra superior con avatar de tienda y botones */}
        <div className="flex items-center justify-between py-1 max-w-lg mx-auto">
          <div className="flex items-center gap-2.5">
            <div className="p-0.5 rounded-full bg-gradient-to-tr from-[#06b6d4] via-[#6B66C8] to-[#F88D86]">
              <img src="/logo.png" alt="3LD" className="w-8 h-8 rounded-full bg-white object-contain p-0.5" />
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <span className="font-extrabold text-xs tracking-wide">3LD Impresión 3D</span>
                <span className="bg-[#6B66C8]/80 text-[10px] font-black px-1.5 py-0.2 rounded text-white flex items-center gap-0.5">
                  <Sparkles className="w-2.5 h-2.5" /> Feed
                </span>
              </div>
              <p className="text-[10px] text-white/70">
                {currentIndex + 1} de {shuffledProducts.length} • {currentProduct?.category || 'Catálogo'}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {/* Botón Pausa / Reproducir */}
            <button
              onClick={(e) => {
                e.stopPropagation();
                setIsPaused(!isPaused);
              }}
              className="p-2 bg-black/40 hover:bg-black/60 backdrop-blur-md rounded-full text-white/90 transition active:scale-90"
              aria-label={isPaused ? 'Reanudar' : 'Pausar'}
            >
              {isPaused ? <Play className="w-4 h-4 fill-white" /> : <Pause className="w-4 h-4" />}
            </button>

            {/* Acceso rápido a Favoritos */}
            <button
              onClick={(e) => {
                e.stopPropagation();
                setShowFavoritesView(true);
              }}
              className="relative p-2 bg-black/40 hover:bg-black/60 backdrop-blur-md rounded-full text-white/90 transition active:scale-90"
              aria-label="Ver favoritos"
            >
              <Heart className={`w-4 h-4 ${favorites.length > 0 ? 'text-red-400 fill-red-400' : 'text-white'}`} />
              {favorites.length > 0 && (
                <span className="absolute -top-1 -right-1 bg-red-500 text-white text-[9px] font-black w-4 h-4 rounded-full flex items-center justify-center shadow">
                  {favorites.length}
                </span>
              )}
            </button>

            {/* Botón Cerrar */}
            <button
              onClick={(e) => {
                e.stopPropagation();
                handleCloseModal();
              }}
              className="p-2 bg-black/40 hover:bg-black/60 backdrop-blur-md rounded-full text-white/90 transition active:scale-90"
              aria-label="Cerrar historias"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* COLUMNA LATERAL DERECHA (Botones estilo TikTok / Reels) */}
      {currentProduct && (
        <div className="absolute right-3 bottom-28 z-20 flex flex-col items-center gap-4">
          {/* Botón de Like */}
          <button
            onClick={(e) => {
              e.stopPropagation();
              onToggleFavorite(currentProduct.id);
              if (!isFavorite) {
                setShowHeartBurst(true);
                setTimeout(() => setShowHeartBurst(false), 900);
              }
            }}
            className="flex flex-col items-center gap-1 group active:scale-90 transition"
          >
            <div className={`p-3 rounded-full backdrop-blur-md transition ${isFavorite ? 'bg-red-500 text-white shadow-lg shadow-red-500/50' : 'bg-black/40 text-white group-hover:bg-black/60'}`}>
              <Heart className={`w-6 h-6 ${isFavorite ? 'fill-white text-white' : 'text-white'}`} />
            </div>
            <span className="text-[10px] font-bold drop-shadow">{isFavorite ? 'Guardado' : 'Like'}</span>
          </button>

          {/* Botón WhatsApp */}
          <button
            onClick={(e) => {
              e.stopPropagation();
              handleWhatsAppConsult();
            }}
            className="flex flex-col items-center gap-1 active:scale-90 transition"
          >
            <div className="p-3 bg-emerald-500 hover:bg-emerald-600 rounded-full text-white shadow-lg shadow-emerald-500/40 backdrop-blur-md">
              <MessageCircle className="w-6 h-6 fill-white" />
            </div>
            <span className="text-[10px] font-bold drop-shadow">Consultar</span>
          </button>

          {/* Botón Compartir */}
          <button
            onClick={(e) => {
              e.stopPropagation();
              handleShareCurrent();
            }}
            className="flex flex-col items-center gap-1 active:scale-90 transition"
          >
            <div className="p-3 bg-black/40 hover:bg-black/60 rounded-full text-white backdrop-blur-md">
              <Share2 className="w-6 h-6" />
            </div>
            <span className="text-[10px] font-bold drop-shadow">Compartir</span>
          </button>
        </div>
      )}

      {/* FOOTER INFERIOR: Información del Producto y Botón "Más Info" */}
      {currentProduct && (
        <div className="relative z-20 p-4 sm:p-5 pb-6 bg-gradient-to-t from-black via-black/80 to-transparent max-w-lg mx-auto w-full">
          <div className="space-y-3">
            {/* Badges de Categoría y Stock */}
            <div className="flex items-center gap-2 flex-wrap">
              <span className="px-2.5 py-0.5 rounded-full bg-white/20 backdrop-blur-md text-[11px] font-bold text-white">
                {currentProduct.category}
              </span>
              {currentProduct.stockStatus === 'ready' && (
                <span className="px-2.5 py-0.5 rounded-full bg-emerald-500/80 backdrop-blur-md text-[11px] font-black text-white flex items-center gap-1">
                  <Zap className="w-3 h-3 fill-white" /> En Stock
                </span>
              )}
              {currentProduct.piezas && currentProduct.piezas.length > 0 && (
                <span className="px-2 py-0.5 rounded-full bg-cyan-500/80 backdrop-blur-md text-[10px] font-bold text-white flex items-center gap-1">
                  <Layers className="w-3 h-3" /> {currentProduct.piezas.length} piezas
                </span>
              )}
            </div>

            {/* Título y Precio */}
            <div>
              <h1 className="text-lg sm:text-xl font-black text-white drop-shadow-md line-clamp-2 leading-tight">
                {currentProduct.title}
              </h1>
              <div className="flex items-baseline gap-2 mt-1">
                <span className="text-2xl font-black text-cyan-400 drop-shadow">
                  ${currentProduct.price.toLocaleString('es-AR')}
                </span>
                {currentProduct.oldPrice && currentProduct.oldPrice > currentProduct.price && (
                  <span className="text-xs text-white/60 line-through">
                    ${currentProduct.oldPrice.toLocaleString('es-AR')}
                  </span>
                )}
              </div>
            </div>

            {/* Botones de Acción Principal: Más info y Carrito */}
            <div className="grid grid-cols-2 gap-2 pt-1">
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  handleCloseModal();
                  onOpenProduct(currentProduct);
                }}
                className="py-3 px-4 bg-white hover:bg-slate-100 text-slate-950 font-black text-xs rounded-2xl shadow-xl transition active:scale-95 flex items-center justify-center gap-2"
              >
                <Info className="w-4 h-4 text-[#6B66C8]" />
                <span>Más Info</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>

              <button
                onClick={(e) => {
                  e.stopPropagation();
                  if (currentProduct.piezas && currentProduct.piezas.length > 0) {
                    onOpenProduct(currentProduct);
                  } else {
                    onAddToCart(currentProduct);
                  }
                }}
                className="py-3 px-4 bg-gradient-to-r from-[#6B66C8] to-[#5752B3] hover:brightness-110 text-white font-black text-xs rounded-2xl shadow-xl transition active:scale-95 flex items-center justify-center gap-2"
              >
                <ShoppingCart className="w-4 h-4" />
                <span>Al Carrito</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
