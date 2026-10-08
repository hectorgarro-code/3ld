import React, { useState, useEffect, useMemo } from 'react';
import {
  ShoppingCart,
  Search,
  Plus,
  X,
  Truck,
  CreditCard,
  MessageCircle,
  Layers,
  ChevronLeft,
  ChevronRight,
  Filter,
  Sparkles,
  Package,
  Trash2,
  ArrowRight,
  ShieldCheck,
  Zap,
  MapPin,
  ExternalLink,
  Store,
  Menu,
  Star,
  Share2,
  Printer,
  Download,
  Headset,
  Loader2
} from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { useCartStore, type CartItem } from '@/store/cartStore';
import api from '@/lib/api';
import { optimizeImagesForPrint } from '@/lib/imageOptimization';
import { calcularTarifaCorreoArgentino } from '@/lib/correoArgentino';
import { SocialShareModal } from '@/components/productos/SocialShareModal';
const TiendaStoriesModal = React.lazy(() => import('@/components/tienda/TiendaStoriesModal').then(m => ({ default: m.TiendaStoriesModal })));
import {
  trackPageView,
  trackViewProduct,
  trackAddToCart,
  trackWhatsAppClick,
  trackQuoteClick,
} from '@/lib/analyticsTracker';

export type { CartItem };

export interface Category {
  id: string;
  name: string;
  icon: string;
  image?: string | null;
  subcategories: string[];
  es_destacada?: boolean;
  productos_count?: number;
}

export interface StoreProduct {
  id: string | number;
  title: string;
  category: string;
  subcategory?: string;
  price: number;
  oldPrice?: number | null;
  stock_actual?: number | string;
  stockStatus: 'ready' | 'custom' | string;
  image: string;
  images?: string[];
  colors?: (string | { name: string; hex: string })[];
  piezas?: { id: string; nombre: string; precio: number; precio_costo?: number; medidas?: string; imagen_url?: string }[];
  description: string;
  weightGrams?: number;
  size?: string;
  es_destacado?: boolean | number;
  seo_title?: string;
  seo_description?: string;
}

export const isProductInStock = (p?: { stockStatus?: string; stock_actual?: number | string } | null): boolean => {
  if (!p) return false;
  if (p.stock_actual !== undefined && p.stock_actual !== null && Number(p.stock_actual) <= 0) {
    return false;
  }
  return p.stockStatus === 'ready';
};

const INITIAL_CATEGORIES: Category[] = [
  { id: 'all', name: 'Todo el Catálogo', icon: '✨', subcategories: [] },
  { id: 'cortantes', name: 'Cortantes & Repostería', icon: '🍪', subcategories: ['Todos', 'Navidad', 'Pokémon', 'Cumpleaños', 'Disney', 'Animales'] },
  { id: 'ceramica', name: 'Herramientas Cerámica', icon: '🏺', subcategories: ['Todos', 'Sellos con mango', 'Texturizadores', 'Desbastadores'] },
  { id: 'didacticos', name: 'Didácticos Montessori', icon: '🧩', subcategories: ['Todos', 'STEAM', 'Motricidad Fina', 'Rutinas Visuales'] },
  { id: 'moldes', name: 'Moldes & Macetas', icon: '🪴', subcategories: ['Todos', 'Macetas Geométricas', 'Moldes Yeso/Cemento'] },
  { id: 'figuras', name: 'Figuras & Dummy 13', icon: '🤖', subcategories: ['Todos', 'Universo Dummy 13', 'Articulados'] },
  { id: 'personalizados', name: 'Llaveros & Logos', icon: '🏷️', subcategories: ['Todos', 'Comercios', 'Eventos', 'Vinchas'] }
];

const INITIAL_PRODUCTS: StoreProduct[] = [
  {
    id: 'p-1',
    title: 'Cortante para galletitas NERF',
    category: 'cortantes',
    subcategory: 'Cumpleaños',
    price: 8000,
    oldPrice: null,
    stockStatus: 'ready',
    image: 'https://images.unsplash.com/photo-1558961363-fa8fdf82db35?w=500&auto=format&fit=crop&q=60',
    description: 'Cortante y marcador con filo biselado de 0.8mm para cortes precisos en masa, fondant o porcelana fría.',
    weightGrams: 45,
    size: '8.5 x 4.5 cm'
  },
  {
    id: 'p-2',
    title: 'Kit Cortadores Navideños (Set x5)',
    category: 'cortantes',
    subcategory: 'Navidad',
    price: 9999,
    oldPrice: 12000,
    stockStatus: 'ready',
    image: 'https://images.unsplash.com/photo-1512496015851-a90fb38ba796?w=500&auto=format&fit=crop&q=60',
    description: 'Incluye Árbol, Bota navideña, Muñeco de nieve, Estrella y Galleta de jengibre en caja de presentación.',
    weightGrams: 180,
    size: '7 a 9 cm c/u'
  },
  {
    id: 'p-3',
    title: 'Sello Texturizador Floral para Arcilla',
    category: 'ceramica',
    subcategory: 'Texturizadores',
    price: 4500,
    oldPrice: null,
    stockStatus: 'ready',
    image: 'https://images.unsplash.com/photo-1565193566173-7a0ee3dbe261?w=500&auto=format&fit=crop&q=60',
    description: 'Mango ergonómico antiadherente. Crea relieves detallados en piezas de cerámica antes del bizcochado.',
    weightGrams: 60,
    size: '6 x 6 cm'
  },
  {
    id: 'p-4',
    title: 'Juego Didáctico de Motricidad Fina',
    category: 'didacticos',
    subcategory: 'Motricidad Fina',
    price: 14500,
    oldPrice: 16500,
    stockStatus: 'custom',
    image: 'https://images.unsplash.com/photo-1596461404969-9ae70f2830c1?w=500&auto=format&fit=crop&q=60',
    description: 'Tablero encastrable con piezas ergonómicas libres de aristas cortantes. Fomenta el agarre tipo pinza.',
    weightGrams: 320,
    size: '20 x 15 cm'
  },
  {
    id: 'p-5',
    title: 'Figura Articulada Universo Dummy 13',
    category: 'figuras',
    subcategory: 'Universo Dummy 13',
    price: 12000,
    oldPrice: null,
    stockStatus: 'ready',
    image: 'https://images.unsplash.com/photo-1607604276583-eef5d076aa5f?w=500&auto=format&fit=crop&q=60',
    description: '100% articulada con esqueleto resistente en PETG y coraza en PLA. Incluye set de 3 pares de manos intercambiables.',
    weightGrams: 90,
    size: '14 cm alto'
  },
  {
    id: 'p-6',
    title: 'Molde 2 Piezas Maceta Geométrica',
    category: 'moldes',
    subcategory: 'Macetas Geométricas',
    price: 11500,
    oldPrice: null,
    stockStatus: 'custom',
    image: 'https://images.unsplash.com/photo-1485955900006-10f4d324d411?w=500&auto=format&fit=crop&q=60',
    description: 'Molde con guías de encastre rápido para colado de cemento y yeso. No requiere desmoldantes abrasivos.',
    weightGrams: 280,
    size: '10 cm diám x 9 cm'
  }
];

const AVAILABLE_COLORS = [
  { name: 'Negro Mate', hex: '#1e293b' },
  { name: 'Blanco Puro', hex: '#f8fafc' },
  { name: 'Rojo Carmesí', hex: '#ef4444' },
  { name: 'Azul Cyan 3LD', hex: '#06b6d4' },
  { name: 'Dorado Seda', hex: '#eab308' },
  { name: 'Verde Pastel', hex: '#10b981' }
];


const hasValidSize = (size?: string | null) => {
  if (!size) return false;
  const s = String(size).trim().toLowerCase();
  if (!s || s === '0' || s === '0x0' || s === '0x0x0' || s === '0 x 0 x 0' || s === '0 x 0' || s === '0.0 x 0.0 x 0.0') return false;
  return true;
};

export default function TiendaPage() {
  // Data Fetching con React Query y caché instantáneo en LocalStorage
  const { data: products = [], isLoading: isLoadingProducts } = useQuery<StoreProduct[]>({
    queryKey: ['tienda-productos-publicos'],
    queryFn: async () => {
      const res = await api.get('/tienda/productos');
      const list = (res.data?.success && Array.isArray(res.data.data)) ? res.data.data : [];
      try {
        localStorage.setItem('3ld_cached_products', JSON.stringify(list));
      } catch {}
      return list;
    },
    initialData: () => {
      try {
        const cached = localStorage.getItem('3ld_cached_products');
        if (cached) {
          const parsed = JSON.parse(cached);
          if (Array.isArray(parsed) && parsed.length > 0) return parsed;
        }
      } catch {}
      return undefined;
    },
    staleTime: 1000 * 60 * 5,
  });

  const { data: rawCategories = [] } = useQuery({
    queryKey: ['tienda-categorias-publicas'],
    queryFn: async () => {
      const res = await api.get('/tienda/categorias');
      const list = (res.data?.data && Array.isArray(res.data.data)) ? res.data.data : [];
      try {
        localStorage.setItem('3ld_cached_categories', JSON.stringify(list));
      } catch {}
      return list;
    },
    initialData: () => {
      try {
        const cached = localStorage.getItem('3ld_cached_categories');
        if (cached) {
          const parsed = JSON.parse(cached);
          if (Array.isArray(parsed) && parsed.length > 0) return parsed;
        }
      } catch {}
      return undefined;
    },
    staleTime: 1000 * 60 * 10,
  });

  const categories = useMemo<Category[]>(() => {
    const allCat: Category = { id: 'all', name: 'Todo el Catálogo', icon: '✨', subcategories: [] };
    const loadedProducts = products;

    if (rawCategories && rawCategories.length > 0) {
      const dynamicCats = rawCategories.map((c: any) => {
        const catName = c.nombre || c.name || '';
        const countFromProds = loadedProducts.filter(
          (p: any) => p.category === catName || (c.id && String(p.categoria_id) === String(c.id))
        ).length;
        return {
          id: catName,
          name: catName,
          icon: c.icono || c.icon || '✨',
          image: c.image || c.imagen_url || c.imagen || null,
          subcategories: c.subcategories || [],
          es_destacada: Boolean(c.es_destacada),
          productos_count: countFromProds
        };
      });
      return [allCat, ...dynamicCats];
    }

    if (loadedProducts.length > 0) {
      const uniqueCats = Array.from(new Set(loadedProducts.map((p: any) => p.category).filter(Boolean))) as string[];
      const dynamicCats = uniqueCats.map((catName) => {
        const firstWithImg = loadedProducts.find((p: any) => p.category === catName && (p.image || (p.images && p.images[0])));
        return {
          id: catName,
          name: catName,
          icon: '📦',
          image: firstWithImg?.image || (firstWithImg?.images && firstWithImg.images[0]) || null,
          subcategories: [],
          es_destacada: false,
          productos_count: loadedProducts.filter((p: any) => p.category === catName).length
        };
      });
      return [allCat, ...dynamicCats];
    }

    return INITIAL_CATEGORIES;
  }, [rawCategories, products]);

  const { cart, addToCart: storeAddToCart, updateCartQty, removeCartItem, clearCart } = useCartStore();

  // Navigation & Filtering
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [selectedSubcategory, setSelectedSubcategory] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [stockFilter, setStockFilter] = useState('all'); // all, ready, custom
  const [sortOption, setSortOption] = useState('featured');

  // Modals & Notifications
  const [isCartOpen, setIsCartOpen] = useState(false);
  const [isStoriesOpen, setIsStoriesOpen] = useState(false);
  const [favorites, setFavorites] = useState<(string | number)[]>(() => {
    try {
      const saved = localStorage.getItem('3ld_tienda_favoritos');
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  const toggleFavorite = (productId: string | number) => {
    setFavorites((prev) => {
      const exists = prev.includes(productId);
      const next = exists ? prev.filter((id) => id !== productId) : [...prev, productId];
      try {
        localStorage.setItem('3ld_tienda_favoritos', JSON.stringify(next));
      } catch {}
      return next;
    });
  };

  const [activeProductModal, setActiveProductModal] = useState<StoreProduct | null>(null);
  const [socialShareProduct, setSocialShareProduct] = useState<StoreProduct | null>(null);
  const [modalActiveImage, setModalActiveImage] = useState<string | null>(null);
  const [isQuoteModalOpen, setIsQuoteModalOpen] = useState(false);
  const [isMobileCatMenuOpen, setIsMobileCatMenuOpen] = useState(false);
  const [modalSelectedColor, setModalSelectedColor] = useState('');
  const [modalSelectedPiezas, setModalSelectedPiezas] = useState<Record<string, boolean>>({});
  const [toastMessage, setToastMessage] = useState<{ text: string; type: string } | null>(null);

  useEffect(() => {
    if (activeProductModal && activeProductModal.piezas && activeProductModal.piezas.length > 0) {
      const initialMap: Record<string, boolean> = {};
      // Por defecto tildar solo la primera pieza para evitar distorsionar el precio total
      const first = activeProductModal.piezas[0];
      if (first) {
        initialMap[first.id || first.nombre] = true;
      }
      setModalSelectedPiezas(initialMap);
    } else {
      setModalSelectedPiezas({});
    }
  }, [activeProductModal]);

  const calculatedModalPrice = useMemo(() => {
    if (!activeProductModal) return 0;
    if (activeProductModal.piezas && activeProductModal.piezas.length > 0) {
      const selectedList = activeProductModal.piezas.filter(p => modalSelectedPiezas[p.id || p.nombre]);
      if (selectedList.length > 0) {
        return selectedList.reduce((sum, p) => sum + (Number(p.precio) || 0), 0);
      }
      return 0;
    }
    return activeProductModal.price;
  }, [activeProductModal, modalSelectedPiezas]);

  const openProductModal = (product: StoreProduct) => {
    setActiveProductModal(product);
    setModalActiveImage(product.image);
    trackViewProduct(product);

    const currentUrl = new URL(window.location.href);
    if (currentUrl.searchParams.get('producto') !== String(product.id)) {
      currentUrl.searchParams.set('producto', String(product.id));
      window.history.pushState(
        { modal: 'producto', id: product.id },
        '',
        currentUrl.pathname + currentUrl.search + currentUrl.hash
      );
    }
  };

  const closeProductModal = () => {
    setActiveProductModal(null);
    setModalActiveImage(null);
    setModalSelectedColor('');

    if (window.history.state?.modal === 'producto') {
      window.history.back();
    } else {
      const currentUrl = new URL(window.location.href);
      if (currentUrl.searchParams.has('producto')) {
        currentUrl.searchParams.delete('producto');
        const newSearch = currentUrl.searchParams.toString();
        window.history.replaceState(
          window.history.state,
          '',
          currentUrl.pathname + (newSearch ? `?${newSearch}` : '') + currentUrl.hash
        );
      }
    }
  };

  // Shipping & Delivery Method
  const [deliveryMethod, setDeliveryMethod] = useState<'pickup' | 'shipping'>('pickup');
  const [postalCode, setPostalCode] = useState('');
  const [shippingQuote, setShippingQuote] = useState<{
    serviceName: string;
    price: number;
    estimatedDays: string;
    isFree: boolean;
    weightKg?: number;
  } | null>(null);
  const [isCalculatingShipping, setIsCalculatingShipping] = useState(false);

  // Mercado Pago States & Comprobante
  const [isMpEnabled, setIsMpEnabled] = useState(false);
  const [isProcessingMp, setIsProcessingMp] = useState(false);
  const [isBuyerModalOpen, setIsBuyerModalOpen] = useState(false);
  const [buyerInfo, setBuyerInfo] = useState({
    nombre: '',
    email: '',
    telefono: '',
    direccion: '',
    notas: '',
  });
  const [paymentSuccessModal, setPaymentSuccessModal] = useState<string | null>(null);
  const [receiptOrder, setReceiptOrder] = useState<any | null>(null);
  const [isLoadingReceipt, setIsLoadingReceipt] = useState(false);

  const handleOpenReceipt = async (pedidoNum: string) => {
    setIsLoadingReceipt(true);
    try {
      const res = await api.get(`/tienda/pedido/${pedidoNum}`);
      if (res.data?.success && res.data?.data) {
        setReceiptOrder(res.data.data);
      } else {
        showToast('No se pudo cargar el detalle del comprobante', 'error');
      }
    } catch {
      showToast('Error al obtener comprobante', 'error');
    } finally {
      setIsLoadingReceipt(false);
    }
  };

  const handleDownloadReceiptTxt = (order: any) => {
    if (!order) return;
    const border = '='.repeat(48);
    const dash = '-'.repeat(48);
    let content = `${border}\r\n            3LD IMPRESIÓN 3D\r\n     COMPROBANTE DE PEDIDO & PAGO\r\n${border}\r\n\r\n`;
    content += `Orden de Pedido: #${order.numero || order.numero_pedido}\r\n`;
    content += `Fecha: ${order.fecha ? new Date(order.fecha).toLocaleString('es-AR') : new Date().toLocaleString('es-AR')}\r\n`;
    content += `Estado de Pago: ACREDITADO (Mercado Pago)\r\n\r\n`;
    content += `DATOS DEL CLIENTE:\r\n`;
    content += `• Nombre: ${order.cliente?.nombre || 'Consumidor Final'}\r\n`;
    if (order.cliente?.telefono) content += `• Teléfono: ${order.cliente.telefono}\r\n`;
    if (order.cliente?.email) content += `• Email: ${order.cliente.email}\r\n`;
    if (order.cliente?.direccion) content += `• Dirección: ${order.cliente.direccion}\r\n`;
    content += `\r\nFORMA DE ENTREGA:\r\n`;
    content += `• Tipo: ${order.entrega_tipo || 'Retiro en Taller'}\r\n`;
    if (order.entrega_direccion) content += `• Destino: ${order.entrega_direccion}\r\n`;
    content += `\r\n${dash}\r\nDETALLE DE PRODUCTOS:\r\n${dash}\r\n`;
    order.items?.forEach((it: any) => {
      content += `x${it.cantidad || 1} ${it.descripcion}\r\n`;
      content += `   Unit: $${Number(it.precio_unit || 0).toLocaleString('es-AR')} | Subtotal: $${Number(it.subtotal || 0).toLocaleString('es-AR')}\r\n`;
    });
    content += `\r\n${dash}\r\n`;
    content += `Subtotal: $${Number(order.subtotal || 0).toLocaleString('es-AR')}\r\n`;
    content += `Envío: ${Number(order.costo_envio || 0) === 0 ? 'GRATIS' : '$' + Number(order.costo_envio).toLocaleString('es-AR')}\r\n`;
    content += `TOTAL ABONADO: $${Number(order.total || 0).toLocaleString('es-AR')}\r\n`;
    content += `${border}\r\n\r\n`;
    content += `Taller 3LD: Salta 3169, San Bernardo del Tuyú\r\n`;
    content += `WhatsApp: +54 9 2257 55-9540\r\n`;
    content += `Web: https://3ld.com.ar\r\n`;
    content += `¡Muchas gracias por tu compra!\r\n`;

    const blob = new Blob([content], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `Comprobante-3LD-${order.numero || order.numero_pedido || 'Pedido'}.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    showToast('¡Comprobante guardado en tus descargas!', 'success');
  };

  useEffect(() => {
    api.get('/tienda/mercadopago/status')
      .then((res) => {
        if (res.data?.success && res.data?.data?.enabled) {
          setIsMpEnabled(true);
        }
      })
      .catch(() => {});

    // Capturar retorno de Checkout Pro
    const params = new URLSearchParams(window.location.search);
    const mpStatus = params.get('mp_status');
    const pedidoNum = params.get('pedido') || params.get('pedido_id');

    if (mpStatus === 'approved') {
      setPaymentSuccessModal(pedidoNum || 'OK');
      clearCart();
      if (pedidoNum && pedidoNum !== 'OK') {
        handleOpenReceipt(pedidoNum);
      }
      const cleanUrl = window.location.pathname;
      window.history.replaceState({}, '', cleanUrl);
    } else if (mpStatus === 'failure') {
      showToast('El pago no pudo procesarse en Mercado Pago. Podés reintentar o abonar por WhatsApp.', 'error');
      const cleanUrl = window.location.pathname;
      window.history.replaceState({}, '', cleanUrl);
    } else if (mpStatus === 'pending') {
      showToast('Tu pago está pendiente de acreditación. En cuanto se confirme comenzaremos tu pedido.', 'info');
      clearCart();
      const cleanUrl = window.location.pathname;
      window.history.replaceState({}, '', cleanUrl);
    }
  }, []);

  const handleMercadoPagoCheckout = async (e?: React.FormEvent) => {
    e?.preventDefault();
    if (cart.length === 0) return;

    if (!buyerInfo.nombre.trim() || !buyerInfo.telefono.trim()) {
      setIsBuyerModalOpen(true);
      return;
    }

    if (deliveryMethod === 'shipping' && !buyerInfo.direccion.trim()) {
      setIsBuyerModalOpen(true);
      showToast('Por favor completá la dirección de entrega', 'info');
      return;
    }

    setIsProcessingMp(true);
    try {
      const itemsPayload = cart.map(item => ({
        id: item.id,
        title: item.title,
        unit_price: item.price,
        quantity: item.qty,
        color: item.color,
        image: item.image,
      }));

      const envioPayload = deliveryMethod === 'pickup'
        ? {
            costo: 0,
            tipo: 'Retiro en Taller (Salta 3169, San Bernardo)',
            direccion: 'Salta 3169, San Bernardo del Tuyú',
          }
        : (shippingQuote ? {
            costo: shippingQuote.price,
            tipo: shippingQuote.serviceName,
            direccion: buyerInfo.direccion,
          } : {
            costo: 0,
            tipo: 'Envío a coordinar',
            direccion: buyerInfo.direccion,
          });

      const res = await api.post('/tienda/mercadopago/crear-preferencia', {
        items: itemsPayload,
        envio: envioPayload,
        comprador: buyerInfo,
        notas: buyerInfo.notas,
      });

      if (res.data?.success && res.data?.data?.init_point) {
        window.location.href = res.data.data.init_point;
      } else {
        showToast(res.data?.message || 'Error al iniciar pago en Mercado Pago', 'error');
      }
    } catch (err: any) {
      showToast(err?.response?.data?.error || err?.response?.data?.message || 'Error al conectar con Mercado Pago', 'error');
    } finally {
      setIsProcessingMp(false);
    }
  };

  // Sync URL search params on load (category, subcategory, search, product)
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const catParam = params.get('categoria');
    const subcatParam = params.get('subcategoria');
    const searchParam = params.get('buscar');
    const prodParam = params.get('producto');

    if (catParam) setSelectedCategory(catParam);
    if (subcatParam) setSelectedSubcategory(subcatParam);
    if (searchParam) setSearchQuery(searchParam);

    if (prodParam && products.length > 0) {
      const found = products.find((p) => String(p.id) === String(prodParam));
      if (found) {
        setActiveProductModal(found);
        setModalActiveImage(found.image);

        // Si se abrió directamente por link (?producto=), crear entrada de historial base
        // para que al presionar "Atrás" en el celular vuelva al inicio de la tienda en lugar de salir de la web
        if (window.history.state?.modal !== 'producto') {
          const baseParams = new URLSearchParams(window.location.search);
          baseParams.delete('producto');
          const baseSearchStr = baseParams.toString();
          const baseUrl = window.location.pathname + (baseSearchStr ? `?${baseSearchStr}` : '') + window.location.hash;
          const fullCurrentUrl = window.location.pathname + window.location.search + window.location.hash;

          window.history.replaceState({ modal: 'store' }, '', baseUrl);
          window.history.pushState({ modal: 'producto', id: found.id }, '', fullCurrentUrl);
        }
      }
    }
  }, [products]);

  // Registrar PageView al montar la página sin bloquear
  useEffect(() => {
    trackPageView();
  }, []);

  // Escuchar el botón "Atrás" del celular / navegador para cerrar el modal y volver a la tienda
  useEffect(() => {
    const handlePopState = () => {
      const params = new URLSearchParams(window.location.search);
      const prodParam = params.get('producto');

      if (prodParam && products.length > 0) {
        const found = products.find((p) => String(p.id) === String(prodParam));
        if (found) {
          setActiveProductModal(found);
          setModalActiveImage(found.image);
          return;
        }
      }

      // Si ya no hay parámetro de producto en la URL, cerrar el modal
      setActiveProductModal(null);
      setModalActiveImage(null);
      setModalSelectedColor('');
    };

    window.addEventListener('popstate', handlePopState);
    return () => {
      window.removeEventListener('popstate', handlePopState);
    };
  }, [products]);

  // Cerrar modal al presionar Escape en teclado físico
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && activeProductModal) {
        closeProductModal();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [activeProductModal]);

  // Schema.org Structured Data (JSON-LD) para indexación de catálogo en Google
  useEffect(() => {
    if (!products || products.length === 0) return;
    const scriptId = 'jsonld-tienda-items';
    let script = document.getElementById(scriptId) as HTMLScriptElement | null;
    if (!script) {
      script = document.createElement('script');
      script.id = scriptId;
      script.type = 'application/ld+json';
      document.head.appendChild(script);
    }
    const schemaData = {
      '@context': 'https://schema.org',
      '@type': 'ItemList',
      itemListElement: products.slice(0, 30).map((p, index) => ({
        '@type': 'ListItem',
        position: index + 1,
        item: {
          '@type': 'Product',
          name: p.title,
          description: p.description,
          image: p.image,
          offers: {
            '@type': 'Offer',
            price: p.price,
            priceCurrency: 'ARS',
            availability: isProductInStock(p)
              ? 'https://schema.org/InStock'
              : 'https://schema.org/PreOrder',
            seller: {
              '@type': 'Organization',
              name: '3LD Impresión 3D'
            }
          }
        }
      }))
    };
    script.textContent = JSON.stringify(schemaData);
    return () => {
      const existing = document.getElementById(scriptId);
      if (existing) existing.remove();
    };
  }, [products]);

  // Actualización dinámica de SEO (Title, Meta Description, OpenGraph, JSON-LD) al ver un producto
  useEffect(() => {
    const defaultTitle = '3LD | Cortantes de Repostería, Mates y Diseños en Impresión 3D';
    const defaultDesc = 'Tienda oficial de 3LD. Diseños exclusivos en impresión 3D: cortantes para galletitas, repostería, mates térmicos, herramientas para cerámica y regalos originales. Envíos a todo el país.';
    const defaultImage = 'https://3ld.com.ar/logo.png';

    if (activeProductModal) {
      const prodTitle = activeProductModal.seo_title || `${activeProductModal.title} | 3LD`;
      const prodDesc = activeProductModal.seo_description || activeProductModal.description || defaultDesc;
      document.title = prodTitle;

      const metaDesc = document.querySelector('meta[name="description"]');
      if (metaDesc) metaDesc.setAttribute('content', prodDesc);

      const ogTitle = document.querySelector('meta[property="og:title"]');
      if (ogTitle) ogTitle.setAttribute('content', prodTitle);

      const ogDesc = document.querySelector('meta[property="og:description"]');
      if (ogDesc) ogDesc.setAttribute('content', prodDesc);

      const ogImage = document.querySelector('meta[property="og:image"]');
      if (ogImage && activeProductModal.image) {
        ogImage.setAttribute('content', activeProductModal.image.startsWith('http') ? activeProductModal.image : `https://3ld.com.ar${activeProductModal.image}`);
      }

      const scriptId = 'jsonld-single-product';
      let script = document.getElementById(scriptId) as HTMLScriptElement | null;
      if (!script) {
        script = document.createElement('script');
        script.id = scriptId;
        script.type = 'application/ld+json';
        document.head.appendChild(script);
      }
      script.textContent = JSON.stringify({
        '@context': 'https://schema.org/',
        '@type': 'Product',
        name: activeProductModal.title,
        image: activeProductModal.images && activeProductModal.images.length > 0 ? activeProductModal.images : [activeProductModal.image],
        description: prodDesc,
        sku: `3LD-${activeProductModal.id}`,
        brand: {
          '@type': 'Brand',
          name: '3LD'
        },
        offers: {
          '@type': 'Offer',
          url: `https://3ld.com.ar/tienda?producto=${activeProductModal.id}`,
          priceCurrency: 'ARS',
          price: activeProductModal.price,
          availability: isProductInStock(activeProductModal) ? 'https://schema.org/InStock' : 'https://schema.org/PreOrder',
          seller: {
            '@type': 'Organization',
            name: '3LD Impresión 3D'
          }
        }
      });
    } else {
      document.title = defaultTitle;
      const metaDesc = document.querySelector('meta[name="description"]');
      if (metaDesc) metaDesc.setAttribute('content', defaultDesc);
      const ogTitle = document.querySelector('meta[property="og:title"]');
      if (ogTitle) ogTitle.setAttribute('content', defaultTitle);
      const ogDesc = document.querySelector('meta[property="og:description"]');
      if (ogDesc) ogDesc.setAttribute('content', defaultDesc);
      const ogImage = document.querySelector('meta[property="og:image"]');
      if (ogImage) ogImage.setAttribute('content', defaultImage);

      const singleScript = document.getElementById('jsonld-single-product');
      if (singleScript) singleScript.remove();
    }
  }, [activeProductModal]);

  const handleShareCatalog = () => {
    const url = new URL(window.location.href);
    if (selectedCategory !== 'all') url.searchParams.set('categoria', selectedCategory);
    else url.searchParams.delete('categoria');

    if (selectedSubcategory !== 'all') url.searchParams.set('subcategoria', selectedSubcategory);
    else url.searchParams.delete('subcategoria');

    if (searchQuery.trim()) url.searchParams.set('buscar', searchQuery.trim());
    else url.searchParams.delete('buscar');

    url.searchParams.delete('producto');

    const shareUrl = url.toString();
    const catName = currentCategoryData?.name || selectedCategory;
    const shareTitle = selectedCategory !== 'all' ? `Catálogo 3LD - ${catName}` : 'Catálogo de Productos 3LD';

    if (navigator.share) {
      navigator.share({ title: shareTitle, url: shareUrl }).catch(() => {});
    } else {
      navigator.clipboard.writeText(shareUrl);
      showToast('¡Enlace del catálogo copiado al portapapeles!', 'success');
    }
  };

  const handleShareProduct = (e: React.MouseEvent | null, product: StoreProduct) => {
    if (e) e.stopPropagation();
    setSocialShareProduct(product);
  };

  const [isPreparingCatalog, setIsPreparingCatalog] = useState(false);
  const [catalogThumbnails, setCatalogThumbnails] = useState<Record<string, string>>({});

  const handlePrintCatalog = async () => {
    setIsPreparingCatalog(true);
    try {
      const urls: string[] = [];
      filteredProducts.forEach((p) => {
        if (p.image) urls.push(p.image);
      });
      if (urls.length > 0) {
        const thumbMap = await optimizeImagesForPrint(urls, 320, 0.75);
        setCatalogThumbnails((prev) => ({ ...prev, ...thumbMap }));
      }
    } catch (err) {
      console.error('Error optimizando catálogo para PDF:', err);
    } finally {
      setIsPreparingCatalog(false);
    }

    setTimeout(() => {
      window.print();
    }, 150);
  };

  const getAdvisorWhatsAppUrl = () => {
    const phone = '5492257512597';
    let text = '¡Hola! Quisiera comunicarme con un asesor de 3LD.\n\n';

    if (activeProductModal) {
      text += `👀 *Producto que estoy viendo:*\n`;
      text += `• ${activeProductModal.title}\n`;
      text += `• Precio: $${activeProductModal.price.toLocaleString('es-AR')}\n`;
      if (activeProductModal.category) {
        text += `• Categoría: ${activeProductModal.category}${activeProductModal.subcategory ? ` / ${activeProductModal.subcategory}` : ''}\n`;
      }
      if (modalSelectedColor) {
        text += `• Color seleccionado: ${modalSelectedColor}\n`;
      }
      if (activeProductModal.size && hasValidSize(activeProductModal.size)) {
        text += `• Medidas: ${activeProductModal.size}\n`;
      }
      text += `• Enlace directo: ${window.location.origin}/tienda?producto=${activeProductModal.id}`;
    } else if (isCartOpen && cart.length > 0) {
      const totalCart = cart.reduce((acc, item) => acc + item.price * item.qty, 0);
      text += `🛒 *Estoy revisando mi carrito con ${cart.length} producto(s)* (Total: $${totalCart.toLocaleString('es-AR')}):\n`;
      cart.forEach((item) => {
        text += `• ${item.title} x${item.qty}${item.color ? ` (Color: ${item.color})` : ''}\n`;
      });
    } else if (isQuoteModalOpen) {
      text += `📐 *Estoy en la sección de cotización de archivos 3D / piezas personalizadas.*`;
    } else {
      const currentCatObj = categories.find((c) => c.id === selectedCategory);
      const catName = currentCatObj ? currentCatObj.name : selectedCategory;
      const filters: string[] = [];

      if (selectedCategory && selectedCategory !== 'all') {
        filters.push(`Categoría: ${catName}`);
      }
      if (selectedSubcategory && selectedSubcategory !== 'all') {
        filters.push(`Subcategoría: ${selectedSubcategory}`);
      }
      if (searchQuery.trim()) {
        filters.push(`Búsqueda: "${searchQuery.trim()}"`);
      }

      if (filters.length > 0) {
        text += `🔍 *Estoy explorando en la tienda:*\n• ${filters.join('\n• ')}\n`;
      } else {
        text += `🛍️ *Estoy explorando el catálogo general de la tienda.*\n`;
      }
      text += `• Enlace: ${window.location.href}`;
    }

    return `https://wa.me/${phone}?text=${encodeURIComponent(text)}`;
  };

  const showToast = (msg: string, type = 'info') => {
    setToastMessage({ text: msg, type });
    setTimeout(() => setToastMessage(null), 3500);
  };

  const addToCart = (product: StoreProduct, qty = 1, color = 'Negro Mate') => {
    storeAddToCart(product, qty, color);
    trackAddToCart(product, qty);
    showToast(`¡"${product.title}" agregado al carrito!`, 'success');
  };

  const cartSubtotal = useMemo(() => {
    return cart.reduce((sum, item) => sum + item.price * item.qty, 0);
  }, [cart]);

  const cartItemsCount = useMemo(() => {
    return cart.reduce((sum, item) => sum + item.qty, 0);
  }, [cart]);

  const categoryProductCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    products.forEach((p) => {
      if (p.category) {
        counts[p.category] = (counts[p.category] || 0) + 1;
      }
    });
    return counts;
  }, [products]);

  const freeShippingThreshold = 30000;
  const isFreeLocalShipping = cartSubtotal >= freeShippingThreshold;

  const mobileFeaturedCategories = useMemo(() => {
    const nonAll = categories.filter((c) => c.id !== 'all');
    const destacadas = nonAll.filter((c) => c.es_destacada);
    if (destacadas.length >= 3) {
      return destacadas.slice(0, 3);
    }
    const rest = nonAll.filter((c) => !c.es_destacada);
    return [...destacadas, ...rest].slice(0, 3);
  }, [categories]);

  const currentCategoryData = useMemo(() => {
    return categories.find((c) => c.id === selectedCategory || c.name === selectedCategory) || categories[0] || INITIAL_CATEGORIES[0];
  }, [categories, selectedCategory]);

  const filteredProducts = useMemo(() => {
    return products
      .filter((p) => {
        const pSubcategories = (p.subcategory || '')
          .split(',')
          .map((s) => s.trim().toLowerCase())
          .filter(Boolean);

        if (selectedCategory !== 'all') {
          const catIdLower = selectedCategory.toLowerCase();
          const catNameLower = (currentCategoryData?.name || '').toLowerCase();
          const catMatch = (p.category || '').toLowerCase() === catIdLower
                        || (p.category || '').toLowerCase() === catNameLower
                        || pSubcategories.includes(catIdLower)
                        || pSubcategories.includes(catNameLower);
          if (!catMatch) return false;
        }
        if (selectedSubcategory !== 'all') {
          const subcatLower = selectedSubcategory.toLowerCase();
          const subMatch = (p.subcategory || '').toLowerCase() === subcatLower
                        || pSubcategories.includes(subcatLower);
          if (!subMatch) return false;
        }
        if (stockFilter === 'ready' && !isProductInStock(p)) return false;
        if (stockFilter === 'custom' && isProductInStock(p)) return false;
        if (stockFilter !== 'all' && stockFilter !== 'ready' && stockFilter !== 'custom' && p.stockStatus !== stockFilter) return false;
        if (searchQuery.trim()) {
          const query = searchQuery.trim().toLowerCase();
          const inTitle = (p.title || '').toLowerCase().includes(query);
          const inDesc = (p.description || '').toLowerCase().includes(query);
          const inCat = (p.category || '').toLowerCase().includes(query);
          const inSub = pSubcategories.some((s) => s.includes(query)) || (p.subcategory || '').toLowerCase().includes(query);
          if (!inTitle && !inDesc && !inCat && !inSub) return false;
        }
        return true;
      })
      .sort((a, b) => {
        if (sortOption === 'price-asc') return a.price - b.price;
        if (sortOption === 'price-desc') return b.price - a.price;
        if (sortOption === 'name-asc') return (a.title || '').localeCompare(b.title || '');
        return 0;
      });
  }, [products, selectedCategory, currentCategoryData, selectedSubcategory, stockFilter, searchQuery, sortOption]);

  const getCategoryDisplayName = (catKey: string) => {
    if (!catKey) return '';
    const safeCatKey = String(catKey).toLowerCase();
    const found = categories.find(
      (c) => (c.id || '').toLowerCase() === safeCatKey || (c.name || '').toLowerCase() === safeCatKey
    );
    return found ? (found.icon ? `${found.icon} ${found.name}` : found.name) : catKey;
  };

  const printCategoriesGrouped = useMemo(() => {
    const catMap = new Map<string, StoreProduct[]>();

    filteredProducts.forEach((p) => {
      const catKey = p.category || 'Otros';
      if (!catMap.has(catKey)) {
        catMap.set(catKey, []);
      }
      catMap.get(catKey)!.push(p);
    });

    const hasMultiple = catMap.size > 1;
    if (!hasMultiple) {
      return {
        hasMultiple: false,
        groups: [{ categoryKey: '', categoryName: '', products: filteredProducts }]
      };
    }

    const sortedKeys = Array.from(catMap.keys()).sort((a, b) => {
      const nameA = getCategoryDisplayName(a).toLowerCase();
      const nameB = getCategoryDisplayName(b).toLowerCase();
      return nameA.localeCompare(nameB, 'es', { sensitivity: 'base' });
    });

    const groups = sortedKeys.map((key) => {
      const prods = [...catMap.get(key)!].sort((a, b) => {
        const subA = (a.subcategory || '').toLowerCase();
        const subB = (b.subcategory || '').toLowerCase();
        const subCmp = subA.localeCompare(subB, 'es', { sensitivity: 'base' });
        if (subCmp !== 0) return subCmp;
        return (a.title || '').localeCompare(b.title || '', 'es', { sensitivity: 'base' });
      });

      return {
        categoryKey: key,
        categoryName: getCategoryDisplayName(key),
        products: prods
      };
    });

    return {
      hasMultiple: true,
      groups
    };
  }, [filteredProducts, categories]);

  const calculateShippingForCp = (rawCp: string) => {
    const cp = rawCp.trim();
    if (!cp || cp.length < 4) return;
    if (cart.length === 0) {
      setShippingQuote(null);
      return;
    }

    const cpNum = parseInt(cp) || 0;
    const isLocalCost = cp.startsWith('71') || (cpNum >= 7100 && cpNum <= 7119);

    const totalItemsQty = cart.reduce((sum, item) => sum + item.qty, 0);
    const totalWeightGrams = cart.reduce((sum, item) => {
      const itemWeight = (item.weightGrams && item.weightGrams > 0) ? item.weightGrams : 120;
      return sum + itemWeight * item.qty;
    }, 0);

    // Estimación volumétrica y dimensiones del paquete según unidades
    const volumeCm3 = Math.max(2250, totalItemsQty * 850);
    const side = Math.round(Math.cbrt(volumeCm3));
    const altoCm = Math.max(10, side);
    const anchoCm = Math.max(15, side);
    const largoCm = Math.max(15, side);

    if (isLocalCost) {
      setShippingQuote({
        serviceName: 'Envío Local La Costa / San Bernardo',
        price: isFreeLocalShipping ? 0 : 2500,
        estimatedDays: '24 a 48 hs',
        isFree: isFreeLocalShipping
      });
    } else {
      const tarifa = calcularTarifaCorreoArgentino({
        provinciaCodigo: (cpNum >= 1000 && cpNum <= 1499) ? 'C' : ((cpNum >= 1600 && cpNum <= 1999) || (cpNum >= 6000 && cpNum <= 8999) ? 'B' : ''),
        codigoPostal: cp,
        pesoGramos: totalWeightGrams,
        altoCm,
        anchoCm,
        largoCm,
        deliveryType: 'homeDelivery'
      });

      setShippingQuote({
        serviceName: `Correo Argentino a Domicilio (${tarifa.zona})`,
        price: tarifa.precioFinal,
        estimatedDays: tarifa.zona === 'Regional (Bs As / CABA)' ? '2 a 4 días hábiles' : '3 a 6 días hábiles',
        isFree: false,
        weightKg: tarifa.pesoFacturableKg
      });
    }
  };

  const handleCalculateShipping = (e?: React.FormEvent) => {
    e?.preventDefault();
    const cp = postalCode.trim();
    if (!cp || cp.length < 4) {
      showToast('Ingresá un código postal válido (ej: 7111 o 1425)', 'info');
      return;
    }

    setIsCalculatingShipping(true);
    setTimeout(() => {
      setIsCalculatingShipping(false);
      calculateShippingForCp(cp);
    }, 350);
  };

  // Recalcular costo de envío si el usuario modifica cantidades en el carrito
  useEffect(() => {
    if (postalCode.trim().length >= 4 && shippingQuote && cart.length > 0) {
      calculateShippingForCp(postalCode.trim());
    } else if (cart.length === 0) {
      setShippingQuote(null);
    }
  }, [cart, isFreeLocalShipping]);

  const handleWhatsAppCheckout = () => {
    if (cart.length === 0) return;
    const phone = '5492257559540';
    let text = `¡Hola 3LD! 👋 Quiero encargar el siguiente pedido desde la tienda:\n\n`;

    cart.forEach((item) => {
      text += `• *${item.qty}x* ${item.title}\n  - Color PLA: ${item.color}\n  - Subtotal: $${(item.price * item.qty).toLocaleString('es-AR')}\n`;
    });

    text += `\n📦 *Subtotal:* $${cartSubtotal.toLocaleString('es-AR')}\n`;
    if (deliveryMethod === 'pickup') {
      text += `🏪 *Entrega:* Retiro en Taller (Salta 3169, San Bernardo del Tuyú - ¡GRATIS!)\n`;
      text += `💰 *TOTAL FINAL:* $${cartSubtotal.toLocaleString('es-AR')}\n`;
    } else if (shippingQuote) {
      text += `🚚 *Envío (${shippingQuote.serviceName}):* ${shippingQuote.price === 0 ? '¡GRATIS!' : '$' + shippingQuote.price.toLocaleString('es-AR')}\n`;
      text += `📍 *CP Destino:* ${postalCode || 'A coordinar'}\n`;
      text += `💰 *TOTAL FINAL:* $${(cartSubtotal + (shippingQuote.price || 0)).toLocaleString('es-AR')}\n`;
    } else {
      text += `🚚 *Envío:* A coordinar entrega a domicilio (CP: ${postalCode || 'A confirmar'})\n`;
      text += `💰 *TOTAL ESTIMADO:* $${cartSubtotal.toLocaleString('es-AR')}\n`;
    }

    text += `\n¿Tienen disponibilidad para coordinar? ¡Muchas gracias!`;
    window.open(`https://wa.me/${phone}?text=${encodeURIComponent(text)}`, '_blank');
  };

  const modalImages = (activeProductModal?.images && activeProductModal.images.length > 0)
    ? activeProductModal.images
    : (activeProductModal?.image ? [activeProductModal.image] : []);
  const currentDisplayImage = modalActiveImage || modalImages[0] || activeProductModal?.image || '';

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 font-sans flex flex-col antialiased selection:bg-cyan-500 selection:text-white pb-20 md:pb-10">
      {/* Web Store View (Hidden during window.print()) */}
      <div className="print:hidden flex flex-col flex-1">
        {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed bottom-20 md:bottom-6 right-4 z-50 animate-bounce transition-all">
          <div
            className={`px-4 py-3 rounded-2xl shadow-xl flex items-center gap-3 text-sm font-semibold border ${
              toastMessage.type === 'success'
                ? 'bg-slate-900 text-emerald-400 border-emerald-500/40'
                : 'bg-slate-900 text-cyan-300 border-cyan-500/40'
            }`}
          >
            <Sparkles className="w-4 h-4 shrink-0" />
            <span>{toastMessage.text}</span>
            <button onClick={() => setToastMessage(null)} className="p-1 hover:text-white rounded-lg ml-1">
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* Top Notification Bar */}
      <div className="bg-gradient-to-r from-[#6B66C8] via-[#5752B3] to-[#6B66C8] text-white text-[11px] sm:text-xs py-2 px-4 text-center font-bold tracking-wide flex items-center justify-center gap-2 border-b border-[#5752B3]">
        <span className="w-2.5 h-2.5 rounded-full bg-[#F7C731] animate-pulse"></span>
        <span>🚚 <strong>Envío Gratis</strong> en La Costa desde $30.000 | Envíos por Andreani a todo el país</span>
      </div>

      {/* Main Header */}
      <header className="sticky top-0 z-40 bg-white/95 backdrop-blur-md border-b border-slate-200 shadow-xs">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16 gap-3">
            {/* Logo 3LD Estándar */}
            <div
              onClick={() => {
                setSelectedCategory('all');
                setSelectedSubcategory('all');
                setSearchQuery('');
                window.scrollTo({ top: 0, behavior: 'smooth' });
              }}
              className="flex items-center gap-2 cursor-pointer group select-none"
              title="3LD - Inicio"
            >
              <img src="/logo.png" alt="3LD Logo" className="h-10 sm:h-12 w-auto object-contain transition group-hover:scale-105" />
            </div>

            {/* Desktop Search Bar */}
            <div className="hidden md:flex flex-1 max-w-md mx-6 relative">
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Buscar entre +1.000 modelos (ej: Nerf, Sello, Cortantes)..."
                className="w-full pl-10 pr-10 py-2 bg-slate-100/90 border border-slate-200 rounded-full text-xs focus:outline-none focus:ring-2 focus:ring-[#6B66C8] focus:bg-white transition"
              />
              <Search className="w-4 h-4 absolute left-3.5 top-2.5 text-slate-400" />
              {searchQuery && (
                <button onClick={() => setSearchQuery('')} className="absolute right-3 top-2.5 text-slate-400 hover:text-slate-600">
                  <X className="w-4 h-4" />
                </button>
              )}
            </div>

            {/* Quick Actions */}
            <div className="flex items-center gap-2">
              {/* Botón Único de Historias con Estrella Azul */}
              <button
                onClick={() => setIsStoriesOpen(true)}
                className="flex items-center gap-1.5 px-3 py-2 text-xs font-black bg-blue-50 hover:bg-blue-100 text-blue-700 border border-blue-200 rounded-2xl transition shadow-xs active:scale-95"
                title="Ver historias interactivas de productos"
              >
                <Sparkles className="w-4 h-4 text-blue-600 fill-blue-500 animate-pulse" />
                <span className="font-extrabold text-[11px] sm:text-xs text-blue-700">Historias</span>
              </button>

              <button
                onClick={() => {
                  trackQuoteClick();
                  setIsQuoteModalOpen(true);
                }}
                className="hidden sm:flex items-center gap-1.5 px-3.5 py-2 text-xs font-bold bg-[#EFEBFC] text-[#6B66C8] border border-[#D5D0F7] rounded-full hover:bg-[#E2DCFA] transition active:scale-95"
              >
                <Layers className="w-4 h-4 text-[#6B66C8]" />
                <span>Cotizar STL</span>
              </button>

              {/* Cart Button */}
              <button
                onClick={() => setIsCartOpen(true)}
                className="relative p-2.5 bg-[#6B66C8] text-white rounded-2xl hover:bg-[#5752B3] transition shadow-sm active:scale-95 flex items-center justify-center"
              >
                <ShoppingCart className="w-5 h-5" />
                {cartItemsCount > 0 && (
                  <span className="absolute -top-1 -right-1 bg-[#F88D86] text-white text-[11px] font-black w-5 h-5 rounded-full flex items-center justify-center shadow">
                    {cartItemsCount}
                  </span>
                )}
              </button>
            </div>
          </div>

          {/* Mobile Search Bar */}
          <div className="pb-3 md:hidden">
            <div className="relative">
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="¿Qué estás buscando? (ej: cortantes, dummy...)"
                className="w-full pl-10 pr-8 py-2.5 bg-slate-100 border border-slate-200 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-cyan-500 focus:bg-white transition"
              />
              <Search className="w-4 h-4 absolute left-3.5 top-3 text-slate-400" />
              {searchQuery && (
                <button onClick={() => setSearchQuery('')} className="absolute right-3 top-3 text-slate-400">
                  <X className="w-4 h-4" />
                </button>
              )}
            </div>
          </div>
        </div>
      </header>

      {/* Category Navigation Bar (Multi-line on PC, Top 3 + Menu on Mobile) */}
      <section className="bg-white border-b border-slate-200 sticky top-16 z-30 shadow-2xs">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          
          {/* PC / Desktop: En una o más líneas con wrap */}
          <div className="hidden md:flex md:flex-wrap items-center gap-2 py-3">
            {categories.map((cat) => {
              const active = selectedCategory === cat.id || (selectedCategory === 'all' && cat.id === 'all');
              const count = cat.id === 'all' ? products.length : (categoryProductCounts[cat.name] ?? cat.productos_count ?? 0);
              return (
                <button
                  key={cat.id}
                  onClick={() => {
                    setSelectedCategory(cat.id);
                    setSelectedSubcategory('all');
                  }}
                  className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-xs font-bold transition active:scale-95 ${
                    active
                      ? 'bg-[#6B66C8] text-white shadow-sm ring-2 ring-[#6B66C8] ring-offset-1'
                      : 'bg-slate-100 text-slate-700 hover:bg-[#EFEBFC] hover:text-[#6B66C8]'
                  }`}
                >
                  <span className="text-sm">{cat.icon}</span>
                  <span>{cat.name}</span>
                  {cat.id !== 'all' && (
                    <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-bold ml-0.5 ${
                      active ? 'bg-white/25 text-white' : 'bg-slate-200/80 text-slate-600'
                    }`}>
                      {isLoadingProducts && products.length === 0 ? '·' : count}
                    </span>
                  )}
                </button>
              );
            })}
          </div>

          {/* Mobile / Celular: Menú Categorías al inicio + Destacadas */}
          <div className="flex md:hidden items-center gap-2 py-2.5 overflow-x-auto no-scrollbar scroll-smooth">
            {/* Botón Menú de Categorías al Inicio */}
            <button
              type="button"
              onClick={() => setIsMobileCatMenuOpen(true)}
              className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-xs font-black whitespace-nowrap transition shrink-0 bg-[#6B66C8] text-white shadow-sm ring-2 ring-[#6B66C8] ring-offset-1 active:scale-95"
            >
              <Menu className="w-4 h-4 text-white" />
              <span>Categorías</span>
              <span className="bg-white/25 text-white text-[10px] font-black px-1.5 py-0.5 rounded-full">
                {categories.length > 1 ? categories.length - 1 : ''}
              </span>
            </button>

            {/* Las 3 más utilizadas */}
            {mobileFeaturedCategories.map((cat) => {
              const active = selectedCategory === cat.id;
              const count = categoryProductCounts[cat.name] ?? cat.productos_count ?? 0;
              return (
                <button
                  key={cat.id}
                  onClick={() => {
                    setSelectedCategory(cat.id);
                    setSelectedSubcategory('all');
                  }}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold whitespace-nowrap transition shrink-0 ${
                    active
                      ? 'bg-[#6B66C8] text-white shadow-sm ring-2 ring-[#6B66C8] ring-offset-1'
                      : 'bg-slate-100 text-slate-700'
                  }`}
                >
                  {cat.image ? (
                    <img
                      src={cat.image}
                      alt=""
                      className="w-4 h-4 rounded-full object-cover shrink-0"
                      onError={(e) => {
                        e.currentTarget.style.display = 'none';
                        const fallback = e.currentTarget.nextElementSibling as HTMLElement;
                        if (fallback) fallback.style.display = 'inline';
                      }}
                    />
                  ) : null}
                  <span className={cat.image ? 'hidden' : 'inline'}>{cat.icon}</span>
                  <span className="truncate max-w-[120px]">{cat.name}</span>
                  <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-bold ml-0.5 ${
                    active ? 'bg-white/25 text-white' : 'bg-slate-200/80 text-slate-600'
                  }`}>
                    {isLoadingProducts && products.length === 0 ? '·' : count}
                  </span>
                </button>
              );
            })}

            {/* Si la activa no es 'all' y no está en las destacadas */}
            {selectedCategory !== 'all' && !mobileFeaturedCategories.some((c) => c.id === selectedCategory) && (
              <button
                onClick={() => setSelectedSubcategory('all')}
                className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-xs font-bold whitespace-nowrap transition shrink-0 bg-[#6B66C8] text-white shadow-sm ring-2 ring-[#6B66C8] ring-offset-1"
              >
                <span>{currentCategoryData.icon}</span>
                <span className="truncate max-w-[120px]">{currentCategoryData.name}</span>
              </button>
            )}
          </div>

        </div>
      </section>

      {/* Subcategory Pills */}
      {currentCategoryData.subcategories.length > 0 && (
        <div className="bg-[#F8F7FD] border-b border-slate-200 py-2 px-4">
          <div className="max-w-7xl mx-auto flex items-center gap-2 overflow-x-auto no-scrollbar">
            {currentCategoryData.subcategories.map((sub) => {
              const active = selectedSubcategory === sub || (selectedSubcategory === 'all' && sub === 'Todos');
              return (
                <button
                  key={sub}
                  onClick={() => setSelectedSubcategory(sub === 'Todos' ? 'all' : sub)}
                  className={`px-3 py-1 rounded-lg text-xs font-semibold whitespace-nowrap transition active:scale-95 ${
                    active
                      ? 'bg-[#6B66C8] text-white shadow-xs'
                      : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-50'
                  }`}
                >
                  {sub}
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* Catalog Grid Section */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 flex-1 w-full">
        {/* Controls Bar (Optimizada para espacio en Celular) */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-6 pb-2 border-b border-slate-200">
          <div className="flex items-center gap-2.5">
            <h1 className="text-xl font-black text-slate-900 tracking-tight">{currentCategoryData.name}</h1>
            {isLoadingProducts && products.length === 0 ? (
              <span className="inline-flex items-center gap-1.5 bg-slate-100 text-slate-500 text-xs font-semibold px-2.5 py-0.5 rounded-full animate-pulse">
                <Loader2 className="w-3 h-3 animate-spin text-[#6B66C8]" /> Cargando catálogo...
              </span>
            ) : (
              <span className="bg-slate-200 text-slate-700 text-xs font-bold px-2.5 py-0.5 rounded-full">
                {filteredProducts.length} artículo{filteredProducts.length === 1 ? '' : 's'}
              </span>
            )}
          </div>

          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 text-xs w-full sm:w-auto">
            <div className="flex items-center bg-white border border-slate-200 rounded-xl p-1 shadow-2xs w-full sm:w-auto justify-between">
              <button
                onClick={() => setStockFilter('all')}
                className={`flex-1 sm:flex-none px-2.5 py-1 rounded-lg font-bold transition text-center ${
                  stockFilter === 'all' ? 'bg-slate-900 text-white' : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Todos
              </button>
              <button
                onClick={() => setStockFilter('ready')}
                className={`flex-1 sm:flex-none px-2.5 py-1 rounded-lg font-bold transition text-center ${
                  stockFilter === 'ready' ? 'bg-slate-900 text-white' : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                ⚡ En Stock
              </button>
              <button
                onClick={() => setStockFilter('custom')}
                className={`flex-1 sm:flex-none px-2.5 py-1 rounded-lg font-bold transition text-center ${
                  stockFilter === 'custom' ? 'bg-slate-900 text-white' : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                🛠️ A Pedido
              </button>
            </div>

            <div className="flex items-center gap-2 w-full sm:w-auto">
              <select
                value={sortOption}
                onChange={(e) => setSortOption(e.target.value)}
                className="flex-1 sm:flex-none bg-white border border-slate-200 text-slate-700 text-xs font-semibold rounded-xl px-2.5 py-2 focus:ring-2 focus:ring-cyan-500 focus:outline-none"
              >
                <option value="featured">Destacados</option>
                <option value="price-asc">Precio: Menor a Mayor</option>
                <option value="price-desc">Precio: Mayor a Menor</option>
                <option value="name-asc">Nombre: A - Z</option>
              </select>

              <button
                onClick={handleShareCatalog}
                className="flex items-center justify-center p-2.5 sm:px-3 sm:py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-xl transition shrink-0 active:scale-95"
                title="Compartir catálogo con los filtros actuales"
              >
                <Share2 className="w-4 h-4 text-cyan-600" />
                <span className="hidden sm:inline">Compartir</span>
              </button>

              <button
                onClick={handlePrintCatalog}
                disabled={isPreparingCatalog}
                className="flex items-center justify-center gap-1.5 p-2.5 sm:px-3.5 sm:py-2 bg-gradient-to-r from-cyan-600 to-cyan-500 hover:from-cyan-500 hover:to-cyan-400 text-white text-xs font-black rounded-xl shadow-xs transition shrink-0 active:scale-95 disabled:opacity-75"
                title="Descargar o imprimir catálogo formal en PDF liviano"
              >
                <Printer className={`w-4 h-4 ${isPreparingCatalog ? 'animate-spin' : ''}`} />
                <span className="hidden sm:inline">
                  {isPreparingCatalog ? 'Optimizando PDF...' : 'Descargar Catálogo PDF'}
                </span>
              </button>
            </div>
          </div>
        </div>

        {/* Product Cards Grid */}
        {isLoadingProducts && products.length === 0 ? (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
            {Array.from({ length: 8 }).map((_, i) => (
              <div
                key={i}
                className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden flex flex-col animate-pulse"
              >
                <div className="relative aspect-square bg-slate-200" />
                <div className="p-3 sm:p-4 flex flex-col flex-1 justify-between gap-3">
                  <div className="space-y-2">
                    <div className="h-4 bg-slate-200 rounded-md w-3/4" />
                    <div className="h-3 bg-slate-100 rounded-md w-1/2" />
                  </div>
                  <div className="pt-2 border-t border-slate-100 flex items-center justify-between">
                    <div className="h-5 bg-slate-200 rounded-md w-16" />
                    <div className="h-8 bg-slate-200 rounded-xl w-14" />
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : filteredProducts.length === 0 ? (
          <div className="text-center py-16 px-4 bg-white rounded-3xl border border-slate-200">
            <Package className="w-12 h-12 text-slate-300 mx-auto mb-3" />
            <h3 className="text-base font-bold text-slate-800">No encontramos productos con este criterio</h3>
            <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
              Podemos fabricar cualquier pieza o cortante a pedido en nuestro taller 3D.
            </p>
            <button
              onClick={() => setIsQuoteModalOpen(true)}
              className="mt-4 px-4 py-2 bg-slate-900 text-white text-xs font-bold rounded-xl hover:bg-slate-800 transition"
            >
              Pedir Cotización de Modelo 3D
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
            {filteredProducts.map((product) => (
              <div
                key={product.id}
                className="bg-white rounded-2xl border border-slate-200 shadow-xs hover:shadow-md transition overflow-hidden flex flex-col group cursor-pointer"
                onClick={() => {
                  openProductModal(product);
                }}
              >
                {/* Product Image */}
                <div className="relative aspect-square overflow-hidden bg-slate-100">
                  <img
                    src={product.image}
                    alt={product.title}
                    className="w-full h-full object-cover group-hover:scale-105 transition duration-300"
                    loading="lazy"
                  />
                  {/* Stock status badge */}
                  <div className="absolute top-2 left-2 flex flex-col gap-1">
                    {isProductInStock(product) ? (
                      <span className="bg-emerald-500/90 text-white text-[10px] font-black px-2 py-0.5 rounded-md backdrop-blur-xs flex items-center gap-1 shadow-xs">
                        <Zap className="w-3 h-3" /> En Stock
                      </span>
                    ) : (
                      <span className="bg-cyan-600/90 text-white text-[10px] font-black px-2 py-0.5 rounded-md backdrop-blur-xs flex items-center gap-1 shadow-xs">
                        ⚡ Listo en 24-48 hs
                      </span>
                    )}
                  </div>

                  {product.images && product.images.length > 1 && (
                    <span className="absolute bottom-2 right-2 bg-slate-900/75 backdrop-blur-xs text-white text-[10px] font-black px-2 py-0.5 rounded-md shadow-xs flex items-center gap-1">
                      📷 {product.images.length}
                    </span>
                  )}
                </div>

                {/* Product Info */}
                <div className="p-3 flex-1 flex flex-col justify-between">
                  <div>
                    <span className="text-[10px] font-bold text-cyan-700 uppercase tracking-wide">
                      {product.subcategory || product.category}
                    </span>
                    <h3 className="text-xs font-bold text-slate-800 line-clamp-2 mt-0.5 leading-snug group-hover:text-cyan-600 transition">
                      {product.title}
                    </h3>
                    {hasValidSize(product.size) && (
                      <p className="text-[11px] font-medium text-slate-500 mt-1 flex items-center gap-1">
                        <span>📏</span>
                        <span className="truncate">{product.size}</span>
                      </p>
                    )}
                  </div>

                    <div className="mt-3 pt-2 border-t border-slate-100 flex items-center justify-between">
                      <div>
                        {product.oldPrice && (
                          <span className="text-[10px] text-slate-400 line-through mr-1 font-semibold">
                            ${product.oldPrice.toLocaleString('es-AR')}
                          </span>
                        )}
                        <div className="flex flex-col">
                          <div className="flex items-baseline gap-1">
                            {product.piezas && product.piezas.length > 0 && (
                              <span className="text-[10px] font-bold text-slate-400 uppercase">
                                Desde
                              </span>
                            )}
                            <span className="text-sm font-black text-slate-900">
                              ${((product.piezas && product.piezas.length > 0)
                                ? (Math.min(...product.piezas.map(pz => Number(pz.precio) || 0).filter(pr => pr > 0)) || product.price)
                                : product.price).toLocaleString('es-AR')}
                            </span>
                          </div>
                          {product.piezas && product.piezas.length > 0 && (
                            <span className="text-[10px] font-extrabold text-cyan-700 bg-cyan-50 px-1.5 py-0.5 rounded w-fit mt-0.5 tracking-tight border border-cyan-200/50">
                              +VER PIEZAS
                            </span>
                          )}
                        </div>
                      </div>

                    <div className="flex items-center gap-1">
                      <button
                        onClick={(e) => handleShareProduct(e, product)}
                        className="p-2 text-slate-400 hover:text-cyan-600 hover:bg-slate-100 rounded-xl transition active:scale-90"
                        title="Compartir producto"
                      >
                        <Share2 className="w-4 h-4" />
                      </button>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          if (product.piezas && product.piezas.length > 0) {
                            openProductModal(product);
                          } else {
                            addToCart(product);
                          }
                        }}
                        className="p-2 bg-slate-900 hover:bg-cyan-600 text-white rounded-xl transition active:scale-90"
                        title={product.piezas && product.piezas.length > 0 ? "Ver opciones y piezas" : "Agregar al Carrito"}
                      >
                        <Plus className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* ======================================================== */}
        {/* SECCIÓN DE RESEÑAS Y PRUEBA SOCIAL (SOCIAL PROOF) */}
        {/* ======================================================== */}
        <section className="mt-16 pt-10 border-t border-slate-200/80 print:hidden">
          <div className="text-center max-w-2xl mx-auto mb-8">
            <div className="inline-flex items-center gap-1.5 px-3.5 py-1 rounded-full bg-amber-50 border border-amber-200/80 text-amber-800 text-xs font-bold mb-3 shadow-2xs">
              <div className="flex text-amber-400">
                {[...Array(5)].map((_, i) => (
                  <Star key={i} className="w-3.5 h-3.5 fill-amber-400 text-amber-400" />
                ))}
              </div>
              <span>4.9 / 5.0 — Más de 1.200 clientes satisfechos</span>
            </div>
            <h2 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">
              Elegido por pasteleras, ceramistas y talleres en todo el país
            </h2>
            <p className="text-xs sm:text-sm text-slate-600 mt-2">
              Diseñamos cortantes con filo nítido y herramientas 3D pensadas para el uso real y diario en tu taller o cocina.
            </p>
          </div>

          {/* Grid de Reseñas Reales */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {[
              {
                name: 'Florencia R.',
                role: 'Pastelería & Cookies',
                city: 'La Plata, Bs. As.',
                initials: 'FR',
                bgColor: 'bg-emerald-100 text-emerald-800',
                product: 'Kit Cortantes Navideños + Personalizado',
                comment: 'Los cortantes tienen el filo biselado justo. La masa no se deforma al cortar y los detalles del marcador salen nítidos en la primera pasada. ¡Recomendadísimos!',
              },
              {
                name: 'Matías G.',
                role: 'Taller de Cerámica Barro Vivo',
                city: 'Córdoba Capital',
                initials: 'MG',
                bgColor: 'bg-amber-100 text-amber-800',
                product: 'Sellos con Mango Ergonómico',
                comment: 'El relieve es súper profundo y la ergonomía del mango te ahorra mucho cansancio en tiradas de 50 o 100 tazas. No se pega a la arcilla húmeda.',
              },
              {
                name: 'Valeria M.',
                role: 'Cotillón & Ambientaciones',
                city: 'Rosario, Santa Fe',
                initials: 'VM',
                bgColor: 'bg-cyan-100 text-cyan-800',
                product: 'Pedido por Mayor (50 Cortantes)',
                comment: 'Necesitaba un pedido urgente con personajes infantiles y lo despacharon en 48 hs exactas. Llegó embalado perfecto por Correo Argentino.',
              },
              {
                name: 'Sofía & Lucas',
                role: 'Emprendimiento Didáctico',
                city: 'Mendoza',
                initials: 'SL',
                bgColor: 'bg-purple-100 text-purple-800',
                product: 'Piezas Didácticas Montessori',
                comment: 'La terminación de las piezas es excelente, sin rebabas ni hilos plásticos. La atención por WhatsApp para consultar colores fue de diez.',
              },
            ].map((review, idx) => (
              <div
                key={idx}
                className="bg-white rounded-2xl p-5 border border-slate-200/90 shadow-2xs hover:shadow-md transition flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-center justify-between gap-2 mb-3">
                    <div className="flex text-amber-400">
                      {[...Array(5)].map((_, i) => (
                        <Star key={i} className="w-3.5 h-3.5 fill-amber-400 text-amber-400" />
                      ))}
                    </div>
                    <span className="inline-flex items-center gap-1 text-[10px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200/60">
                      <ShieldCheck className="w-3 h-3" /> Verificada
                    </span>
                  </div>

                  <p className="text-xs text-slate-700 leading-relaxed font-medium italic">
                    "{review.comment}"
                  </p>
                </div>

                <div className="mt-4 pt-3 border-t border-slate-100 flex items-center gap-3">
                  <div className={`w-9 h-9 rounded-xl flex items-center justify-center font-black text-xs shrink-0 ${review.bgColor}`}>
                    {review.initials}
                  </div>
                  <div className="min-w-0">
                    <p className="text-xs font-black text-slate-900 truncate">{review.name}</p>
                    <p className="text-[11px] text-slate-500 truncate">{review.role} • {review.city}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Franja de Garantías y Beneficios */}
          <div className="mt-10 grid grid-cols-2 md:grid-cols-4 gap-3">
            <div className="bg-slate-50 rounded-2xl p-4 border border-slate-200/70 text-center flex flex-col items-center">
              <div className="w-10 h-10 rounded-xl bg-cyan-100 text-cyan-800 flex items-center justify-center mb-2">
                <Zap className="w-5 h-5" />
              </div>
              <h4 className="text-xs font-black text-slate-900">Despacho en 24-48 hs</h4>
              <p className="text-[11px] text-slate-500 mt-1">Impresión en taller propio con tiempos récord.</p>
            </div>

            <div className="bg-slate-50 rounded-2xl p-4 border border-slate-200/70 text-center flex flex-col items-center">
              <div className="w-10 h-10 rounded-xl bg-emerald-100 text-emerald-800 flex items-center justify-center mb-2">
                <ShieldCheck className="w-5 h-5" />
              </div>
              <h4 className="text-xs font-black text-slate-900">PLA Atóxico y Seguro</h4>
              <p className="text-[11px] text-slate-500 mt-1">Material biodegradable de primera calidad.</p>
            </div>

            <div className="bg-slate-50 rounded-2xl p-4 border border-slate-200/70 text-center flex flex-col items-center">
              <div className="w-10 h-10 rounded-xl bg-indigo-100 text-indigo-800 flex items-center justify-center mb-2">
                <Truck className="w-5 h-5" />
              </div>
              <h4 className="text-xs font-black text-slate-900">Envíos a Todo el País</h4>
              <p className="text-[11px] text-slate-500 mt-1">A domicilio o sucursal por Correo Argentino.</p>
            </div>

            <div className="bg-slate-50 rounded-2xl p-4 border border-slate-200/70 text-center flex flex-col items-center">
              <div className="w-10 h-10 rounded-xl bg-purple-100 text-purple-800 flex items-center justify-center mb-2">
                <MessageCircle className="w-5 h-5" />
              </div>
              <h4 className="text-xs font-black text-slate-900">Atención Personalizada</h4>
              <p className="text-[11px] text-slate-500 mt-1">Respondemos tus dudas directo por WhatsApp.</p>
            </div>
          </div>
        </section>

        {/* Footer Comercial Público */}
        <footer className="mt-16 pt-8 pb-12 border-t border-slate-200 text-slate-600 text-xs print:hidden">
          <div className="flex flex-col md:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-2">
              <span className="text-xl">✨</span>
              <div>
                <p className="font-black text-slate-900 text-sm">3LD Impresión 3D</p>
                <p className="text-[11px] text-slate-500">Diseño y Fabricación Digital para Emprendedores y Hogar</p>
              </div>
            </div>
            <div className="flex flex-wrap items-center justify-center gap-4 text-[11px] font-bold text-slate-600">
              <button onClick={() => setIsQuoteModalOpen(true)} className="hover:text-cyan-600 transition">Cotizar Modelo STL</button>
              <span>•</span>
              <a href={getAdvisorWhatsAppUrl()} target="_blank" rel="noopener noreferrer" className="hover:text-cyan-600 transition">WhatsApp Oficial</a>
              <span>•</span>
              <span>Envíos por Correo Argentino</span>
            </div>
            <p className="text-[10px] text-slate-400">© {new Date().getFullYear()} 3LD. Todos los derechos reservados.</p>
          </div>
        </footer>
      </main>

      {/* Cart Drawer */}
      {isCartOpen && (
        <div className="fixed inset-0 z-50 flex justify-end bg-slate-950/60 backdrop-blur-xs">
          <div className="w-full max-w-md bg-white h-full shadow-2xl flex flex-col justify-between animate-in slide-in-from-right duration-200">
            {/* Header */}
            <div className="p-4 border-b border-slate-200 flex items-center justify-between bg-slate-900 text-white">
              <div className="flex items-center gap-2">
                <ShoppingCart className="w-5 h-5 text-cyan-400" />
                <h2 className="font-extrabold text-base tracking-tight">Tu Carrito de Compras</h2>
                <span className="bg-cyan-500 text-white text-xs font-black px-2 py-0.5 rounded-full">
                  {cartItemsCount}
                </span>
              </div>
              <button onClick={() => setIsCartOpen(false)} className="p-1 hover:bg-slate-800 rounded-lg text-slate-300">
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Free Shipping Progress Bar */}
            {cart.length > 0 && (
              <div className="px-4 py-2.5 bg-slate-50 border-b border-slate-200">
                {cartSubtotal >= freeShippingThreshold ? (
                  <div className="flex items-center gap-1.5 text-xs font-black text-emerald-700">
                    <span className="text-base">🎉</span>
                    <span>¡Felicitaciones! Tenés <strong>Envío Gratis</strong> en tu compra.</span>
                  </div>
                ) : (
                  <div className="space-y-1.5">
                    <div className="flex justify-between text-[11px] font-bold text-slate-700">
                      <span>Agregá <strong>${(freeShippingThreshold - cartSubtotal).toLocaleString('es-AR')}</strong> más para <strong>Envío Gratis</strong></span>
                      <span className="text-cyan-700 font-extrabold">{Math.round((cartSubtotal / freeShippingThreshold) * 100)}%</span>
                    </div>
                    <div className="w-full h-2 bg-slate-200 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-linear-to-r from-cyan-500 to-emerald-500 rounded-full transition-all duration-300"
                        style={{ width: `${Math.min(100, (cartSubtotal / freeShippingThreshold) * 100)}%` }}
                      />
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Cart Items List */}
            <div className="flex-1 overflow-y-auto p-4 space-y-3">
              {cart.length === 0 ? (
                <div className="text-center py-16">
                  <ShoppingCart className="w-12 h-12 text-slate-300 mx-auto mb-3" />
                  <p className="text-sm font-bold text-slate-700">Tu carrito está vacío</p>
                  <p className="text-xs text-slate-400 mt-1">Explorá el catálogo para agregar artículos.</p>
                </div>
              ) : (
                cart.map((item) => (
                  <div
                    key={`${item.id}-${item.color}`}
                    className="flex items-center gap-3 p-3 bg-slate-50 rounded-2xl border border-slate-200 shadow-2xs"
                  >
                    <img src={item.image} alt={item.title} className="w-14 h-14 object-cover rounded-xl border border-slate-200 shrink-0" />
                    <div className="flex-1 min-w-0">
                      <h4 className="text-xs font-bold text-slate-900 truncate">{item.title}</h4>
                      <p className="text-[11px] text-slate-500 font-medium">Color: {item.color}</p>
                      <p className="text-xs font-black text-slate-900 mt-0.5">
                        ${(item.price * item.qty).toLocaleString('es-AR')}
                      </p>
                    </div>

                    <div className="flex items-center gap-1 bg-white border border-slate-200 rounded-xl p-1">
                      <button
                        onClick={() => updateCartQty(item.id, item.color, -1)}
                        className="px-2 py-0.5 text-xs font-bold text-slate-600 hover:text-slate-900"
                      >
                        -
                      </button>
                      <span className="text-xs font-black px-1.5">{item.qty}</span>
                      <button
                        onClick={() => updateCartQty(item.id, item.color, 1)}
                        className="px-2 py-0.5 text-xs font-bold text-slate-600 hover:text-slate-900"
                      >
                        +
                      </button>
                    </div>

                    <button
                      onClick={() => removeCartItem(item.id, item.color)}
                      className="p-1.5 text-slate-400 hover:text-red-500 transition rounded-lg"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                ))
              )}
            </div>

            {/* Shipping & Delivery Method + Total Footer */}
            {cart.length > 0 && (
              <div className="p-4 border-t border-slate-200 bg-slate-50 space-y-3">
                {/* Selector Forma de Entrega */}
                <div className="space-y-2">
                  <label className="text-[11px] font-black uppercase tracking-wider text-slate-500 block">
                    Forma de Entrega:
                  </label>
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={() => setDeliveryMethod('pickup')}
                      className={`p-2.5 rounded-xl border text-left transition flex flex-col justify-between cursor-pointer ${
                        deliveryMethod === 'pickup'
                          ? 'bg-cyan-50 border-cyan-500 text-cyan-950 font-bold shadow-xs'
                          : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-100'
                      }`}
                    >
                      <div className="flex items-center gap-1.5 mb-1">
                        <Store className="w-4 h-4 text-cyan-600" />
                        <span className="text-xs font-black">Retiro en Taller</span>
                      </div>
                      <span className="text-[10px] text-emerald-600 font-extrabold">¡GRATIS!</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => setDeliveryMethod('shipping')}
                      className={`p-2.5 rounded-xl border text-left transition flex flex-col justify-between cursor-pointer ${
                        deliveryMethod === 'shipping'
                          ? 'bg-cyan-50 border-cyan-500 text-cyan-950 font-bold shadow-xs'
                          : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-100'
                      }`}
                    >
                      <div className="flex items-center gap-1.5 mb-1">
                        <Truck className="w-4 h-4 text-cyan-600" />
                        <span className="text-xs font-black">Envío Domicilio</span>
                      </div>
                      <span className="text-[10px] text-slate-500 font-medium">Andreani / Correo</span>
                    </button>
                  </div>

                  {deliveryMethod === 'pickup' ? (
                    <div className="p-2.5 bg-emerald-50 border border-emerald-200 rounded-xl text-xs text-emerald-900 flex items-start gap-2">
                      <MapPin className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                      <div>
                        <p className="font-extrabold text-[11px]">Retiro en Nuestro Taller:</p>
                        <p className="text-[11px] font-semibold text-emerald-800">Salta 3169, San Bernardo del Tuyú</p>
                        <p className="text-[10px] text-emerald-700 mt-0.5">Te avisaremos por WhatsApp o Email cuando tu pieza esté lista para retirar.</p>
                      </div>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      <form onSubmit={handleCalculateShipping} className="flex gap-2">
                        <input
                          type="text"
                          value={postalCode}
                          onChange={(e) => setPostalCode(e.target.value)}
                          placeholder="Código Postal (ej: 7111)"
                          className="flex-1 px-3 py-2 text-xs border border-slate-200 rounded-xl focus:ring-2 focus:ring-cyan-500 bg-white"
                        />
                        <button
                          type="submit"
                          disabled={isCalculatingShipping}
                          className="px-3 py-2 bg-slate-900 text-white text-xs font-bold rounded-xl hover:bg-slate-800 transition disabled:opacity-50 cursor-pointer"
                        >
                          {isCalculatingShipping ? 'Cotizando...' : 'Calcular'}
                        </button>
                      </form>

                      {shippingQuote && (
                        <div className="p-2.5 bg-cyan-50 border border-cyan-200 rounded-xl text-xs flex justify-between items-center text-cyan-950 font-semibold">
                          <div>
                            <p className="font-bold">{shippingQuote.serviceName}</p>
                            <p className="text-[10px] text-cyan-700">
                              Demora: {shippingQuote.estimatedDays}
                              {shippingQuote.weightKg ? ` • ${shippingQuote.weightKg} kg facturables` : ''}
                            </p>
                          </div>
                          <span className="font-black text-sm shrink-0 ml-2">
                            {shippingQuote.isFree || shippingQuote.price === 0 ? '¡GRATIS!' : `$${shippingQuote.price.toLocaleString('es-AR')}`}
                          </span>
                        </div>
                      )}
                    </div>
                  )}
                </div>

                {/* Subtotal & Total */}
                <div className="space-y-1 text-xs pt-1">
                  <div className="flex justify-between text-slate-600">
                    <span>Subtotal productos:</span>
                    <span className="font-bold">${cartSubtotal.toLocaleString('es-AR')}</span>
                  </div>
                  <div className="flex justify-between text-slate-600">
                    <span>Entrega ({deliveryMethod === 'pickup' ? 'Retiro en Taller' : 'Envío a Domicilio'}):</span>
                    <span className="font-bold">
                      {deliveryMethod === 'pickup' || (deliveryMethod === 'shipping' && shippingQuote?.price === 0)
                        ? '¡GRATIS!'
                        : deliveryMethod === 'shipping' && shippingQuote
                          ? `$${shippingQuote.price.toLocaleString('es-AR')}`
                          : deliveryMethod === 'shipping'
                            ? 'A cotizar'
                            : '$0'}
                    </span>
                  </div>
                  <div className="flex justify-between text-sm font-black text-slate-900 pt-2 border-t border-slate-200">
                    <span>TOTAL FINAL:</span>
                    <span className="text-cyan-600">
                      ${(cartSubtotal + (deliveryMethod === 'shipping' ? (shippingQuote?.price || 0) : 0)).toLocaleString('es-AR')}
                    </span>
                  </div>
                </div>

                {/* Checkout Buttons */}
                <div className="space-y-2 pt-1">
                  {isMpEnabled ? (
                    <>
                      <button
                        onClick={() => {
                          if (!buyerInfo.nombre.trim() || !buyerInfo.telefono.trim()) {
                            setIsBuyerModalOpen(true);
                          } else {
                            handleMercadoPagoCheckout();
                          }
                        }}
                        disabled={isProcessingMp}
                        className="w-full py-3.5 bg-[#009EE3] hover:bg-[#0089c7] text-white font-black text-sm rounded-2xl shadow-lg shadow-sky-500/20 flex items-center justify-center gap-2 transition active:scale-95 disabled:opacity-50 cursor-pointer"
                      >
                        {isProcessingMp ? (
                          <>
                            <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                            <span>Conectando con Mercado Pago...</span>
                          </>
                        ) : (
                          <>
                            <CreditCard className="w-5 h-5" />
                            <span>Pagar con Mercado Pago (Inmediato)</span>
                          </>
                        )}
                      </button>

                      <button
                        onClick={handleWhatsAppCheckout}
                        className="w-full py-2.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 font-bold text-xs rounded-xl border border-emerald-300/80 flex items-center justify-center gap-2 transition active:scale-95 cursor-pointer"
                      >
                        <MessageCircle className="w-4 h-4 text-emerald-600" />
                        <span>O coordinar pedido por WhatsApp</span>
                      </button>
                    </>
                  ) : (
                    <button
                      onClick={handleWhatsAppCheckout}
                      className="w-full py-3.5 bg-emerald-600 hover:bg-emerald-500 text-white font-extrabold text-sm rounded-2xl shadow-md flex items-center justify-center gap-2 transition active:scale-95 cursor-pointer"
                    >
                      <MessageCircle className="w-5 h-5" />
                      <span>Enviar Pedido por WhatsApp</span>
                    </button>
                  )}
                </div>

                {/* Trust Badges */}
                <div className="grid grid-cols-3 gap-1 pt-2 border-t border-slate-200 text-center text-[10px] text-slate-500 font-semibold">
                  <div className="flex flex-col items-center">
                    <ShieldCheck className="w-3.5 h-3.5 text-emerald-600 mb-0.5" />
                    <span>Compra Segura</span>
                  </div>
                  <div className="flex flex-col items-center">
                    <Truck className="w-3.5 h-3.5 text-cyan-600 mb-0.5" />
                    <span>Todo el País</span>
                  </div>
                  <div className="flex flex-col items-center">
                    <Sparkles className="w-3.5 h-3.5 text-amber-500 mb-0.5" />
                    <span>Calidad 3LD</span>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Product Detail Modal */}
      {activeProductModal && (
        <div
          onClick={closeProductModal}
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-xs"
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="bg-white rounded-3xl max-w-md w-full shadow-2xl animate-in zoom-in-95 duration-150 border border-slate-200 max-h-[90vh] flex flex-col overflow-y-auto"
          >
            <div className="relative aspect-square max-h-[380px] bg-slate-100 shrink-0 overflow-hidden">
              <img src={currentDisplayImage} alt={activeProductModal.title} className="w-full h-full object-cover transition-all duration-300" />
              <button
                onClick={closeProductModal}
                className="absolute top-3 right-3 z-10 p-2 bg-slate-900/80 text-white rounded-full hover:bg-slate-900 transition shadow-md"
              >
                <X className="w-4 h-4" />
              </button>

              {/* Discrete Left / Right Arrow Buttons */}
              {modalImages.length > 1 && (
                <>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      const currentIndex = modalImages.indexOf(currentDisplayImage);
                      const prevIndex = (currentIndex - 1 + modalImages.length) % modalImages.length;
                      setModalActiveImage(modalImages[prevIndex]);
                    }}
                    className="absolute left-3 top-1/2 -translate-y-1/2 z-10 p-2 bg-slate-900/40 hover:bg-slate-900/80 text-white rounded-full backdrop-blur-xs transition shadow-md"
                    aria-label="Foto anterior"
                  >
                    <ChevronLeft className="w-5 h-5" />
                  </button>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      const currentIndex = modalImages.indexOf(currentDisplayImage);
                      const nextIndex = (currentIndex + 1) % modalImages.length;
                      setModalActiveImage(modalImages[nextIndex]);
                    }}
                    className="absolute right-3 top-1/2 -translate-y-1/2 z-10 p-2 bg-slate-900/40 hover:bg-slate-900/80 text-white rounded-full backdrop-blur-xs transition shadow-md"
                    aria-label="Foto siguiente"
                  >
                    <ChevronRight className="w-5 h-5" />
                  </button>
                </>
              )}
            </div>

            {/* Gallery Thumbnails */}
            {modalImages.length > 1 && (
              <div className="flex items-center gap-2 px-5 py-2.5 bg-slate-50 border-b border-slate-100 overflow-x-auto shrink-0">
                {modalImages.map((imgUrl, idx) => (
                  <button
                    key={idx}
                    onClick={() => setModalActiveImage(imgUrl)}
                    className={`h-12 w-12 rounded-xl border-2 overflow-hidden shrink-0 transition-all ${
                      currentDisplayImage === imgUrl ? 'border-cyan-500 ring-2 ring-cyan-500/30' : 'border-slate-200 opacity-60 hover:opacity-100'
                    }`}
                  >
                    <img src={imgUrl} alt={`Foto ${idx + 1}`} className="h-full w-full object-cover" />
                  </button>
                ))}
              </div>
            )}

            <div className="p-5">
              <div className="flex items-center justify-between gap-2">
                <span className="text-xs font-bold text-cyan-600 uppercase tracking-wide">
                  {activeProductModal.subcategory || activeProductModal.category}
                </span>
                {isProductInStock(activeProductModal) ? (
                  <span className="bg-emerald-100 text-emerald-800 text-[10px] font-black px-2 py-0.5 rounded-md flex items-center gap-1 border border-emerald-200">
                    <Zap className="w-3 h-3 text-emerald-600" /> En Stock
                  </span>
                ) : (
                  <span className="bg-amber-100 text-amber-900 text-[10px] font-black px-2 py-0.5 rounded-md flex items-center gap-1 border border-amber-300">
                    ⚡ Impresión 3D: Listo en 24-48 hs
                  </span>
                )}
              </div>
              <h2 className="text-lg font-black text-slate-900 mt-1 leading-snug">{activeProductModal.title}</h2>

              <p className="text-xs text-slate-600 mt-2 leading-relaxed">{activeProductModal.description}</p>

              {/* Color options */}
              {activeProductModal.colors && activeProductModal.colors.length > 0 && (
                <div className="mt-4">
                  <label className="text-xs font-bold text-slate-800 block mb-1.5">
                    Color de Impresión (PLA): {modalSelectedColor ? <span className="text-cyan-600 font-extrabold">{modalSelectedColor}</span> : <span className="text-slate-400 font-normal">(Opcional)</span>}
                  </label>
                  <div className="flex items-center gap-2 flex-wrap">
                    {activeProductModal.colors.map((colorItem, idx) => {
                      const colorName = typeof colorItem === 'string' ? colorItem : colorItem.name;
                      const hexColor = typeof colorItem === 'object' && colorItem.hex ? colorItem.hex : (AVAILABLE_COLORS.find(c => c.name === colorName)?.hex || '#06b6d4');
                      const isSelected = modalSelectedColor === colorName;
                      return (
                        <button
                          key={colorName || idx}
                          onClick={() => setModalSelectedColor(isSelected ? '' : colorName)}
                          className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold border transition cursor-pointer ${
                            isSelected
                              ? 'border-cyan-600 bg-cyan-50 text-cyan-900 ring-2 ring-cyan-500/30 font-bold'
                              : 'border-slate-200 text-slate-700 bg-white hover:bg-slate-50'
                          }`}
                        >
                          <span className="w-3 h-3 rounded-full border border-slate-300 shrink-0" style={{ backgroundColor: hexColor }} />
                          <span>{colorName}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Piezas / Components Selection */}
              {activeProductModal.piezas && activeProductModal.piezas.length > 0 && (
                <div className="mt-4 bg-indigo-50/70 p-3.5 rounded-2xl border border-indigo-100/90 space-y-2.5">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-black text-indigo-950 flex items-center gap-1.5 uppercase tracking-wide">
                      🧩 Seleccionar Piezas del Set
                    </label>
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => {
                          const allOn: Record<string, boolean> = {};
                          activeProductModal.piezas?.forEach(p => { allOn[p.id || p.nombre] = true; });
                          setModalSelectedPiezas(allOn);
                        }}
                        className="text-[10px] font-extrabold text-indigo-600 hover:text-indigo-800 underline"
                      >
                        Marcar todas
                      </button>
                      <span className="text-indigo-300">|</span>
                      <button
                        type="button"
                        onClick={() => setModalSelectedPiezas({})}
                        className="text-[10px] font-extrabold text-slate-500 hover:text-slate-700 underline"
                      >
                        Desmarcar
                      </button>
                    </div>
                  </div>
                  <p className="text-[11px] text-slate-600">
                    Elegí las piezas que querés incluir en tu pedido:
                  </p>
                  <div className="space-y-1.5 max-h-72 sm:max-h-80 overflow-y-auto pr-1">
                    {activeProductModal.piezas.map((pieza) => {
                      const key = pieza.id || pieza.nombre;
                      const isChecked = !!modalSelectedPiezas[key];
                      return (
                        <label
                          key={key}
                          className={`flex items-center justify-between p-2 rounded-xl border transition cursor-pointer ${
                            isChecked
                              ? 'border-indigo-500 bg-white shadow-2xs text-indigo-950 font-bold'
                              : 'border-slate-200/80 bg-slate-50/70 text-slate-500 hover:bg-white'
                          }`}
                        >
                          <div className="flex items-center gap-2.5 min-w-0">
                            <input
                              type="checkbox"
                              checked={isChecked}
                              onChange={(e) => {
                                setModalSelectedPiezas(prev => ({
                                  ...prev,
                                  [key]: e.target.checked
                                }));
                              }}
                              className="w-4 h-4 rounded accent-indigo-600 cursor-pointer shrink-0"
                            />
                            {pieza.imagen_url && (
                              <img src={pieza.imagen_url} alt={pieza.nombre} className="w-8 h-8 object-cover rounded-lg border border-slate-200 shrink-0" />
                            )}
                            <div className="flex flex-col min-w-0">
                              <span className="text-xs truncate">{pieza.nombre}</span>
                              {pieza.medidas && (
                                <span className="text-[10px] text-slate-400 font-semibold">📏 Medidas: {pieza.medidas}</span>
                              )}
                            </div>
                          </div>
                          <span className="text-xs font-black text-indigo-700 shrink-0 ml-2">
                            ${Number(pieza.precio).toLocaleString('es-AR')}
                          </span>
                        </label>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Specs */}
              {hasValidSize(activeProductModal.size) && (
                <div className="mt-3 text-xs text-slate-600 font-medium bg-slate-50 p-2.5 rounded-xl border border-slate-200/80 flex items-center gap-1.5">
                  <span>📏</span>
                  <span>Medidas: <strong className="text-slate-900">{activeProductModal.size}</strong></span>
                </div>
              )}

              {/* Price & Action */}
              <div className="mt-5 pt-4 border-t border-slate-100 flex items-center justify-between">
                <div>
                  <span className="text-xs text-slate-400 block">Precio Total</span>
                  <span className="text-xl font-black text-slate-900">
                    ${calculatedModalPrice.toLocaleString('es-AR')}
                  </span>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={(e) => handleShareProduct(e, activeProductModal)}
                    className="px-3.5 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs rounded-2xl transition active:scale-95 flex items-center gap-1.5"
                    title="Compartir enlace de este producto"
                  >
                    <Share2 className="w-4 h-4 text-cyan-600" />
                    <span>Compartir</span>
                  </button>

                  <button
                    onClick={() => {
                      const finalColor = modalSelectedColor || 'Estándar';
                      if (activeProductModal.piezas && activeProductModal.piezas.length > 0) {
                        const selectedList = activeProductModal.piezas.filter(p => modalSelectedPiezas[p.id || p.nombre]);
                        if (selectedList.length === 0) {
                          showToast('Seleccioná al menos 1 pieza para agregar al carrito', 'error');
                          return;
                        }
                        const piezaNames = selectedList.map(p => p.nombre).join(', ');
                        const customProduct: StoreProduct = {
                          ...activeProductModal,
                          title: `${activeProductModal.title} (${selectedList.length} pieza${selectedList.length > 1 ? 's' : ''}: ${piezaNames})`,
                          price: calculatedModalPrice
                        };
                        addToCart(customProduct, 1, finalColor);
                      } else {
                        addToCart(activeProductModal, 1, finalColor);
                      }
                      closeProductModal();
                    }}
                    className="px-5 py-2.5 bg-slate-900 hover:bg-cyan-600 text-white font-bold text-xs rounded-2xl shadow-md transition active:scale-95 flex items-center gap-2"
                  >
                    <ShoppingCart className="w-4 h-4" />
                    <span>Agregar al Carrito</span>
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* STL Quote Modal */}
      {isQuoteModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-xs">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl border border-slate-200 animate-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2 text-slate-900 font-black text-base">
                <Layers className="w-5 h-5 text-cyan-600" />
                <span>Cotizar Archivo 3D (STL)</span>
              </div>
              <button onClick={() => setIsQuoteModalOpen(null as any)} className="p-1 text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <p className="text-xs text-slate-500 mt-3 leading-relaxed">
              Enviamos el enlace o archivo de tu modelo 3D por WhatsApp y te enviamos la cotización en minutos.
            </p>

            <button
              onClick={() => {
                const text = encodeURIComponent('¡Hola 3LD! 👋 Quisiera solicitar la cotización de una pieza 3D personalizada.');
                window.open(`https://wa.me/5492257559540?text=${text}`, '_blank');
              }}
              className="w-full mt-4 py-3 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs rounded-2xl shadow-md flex items-center justify-center gap-2 transition"
            >
              <MessageCircle className="w-4 h-4" />
              <span>Cotizar por WhatsApp</span>
            </button>
          </div>
        </div>
      )}

      {/* MODAL DATOS DEL COMPRADOR (MERCADO PAGO) */}
      {isBuyerModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl border border-slate-200">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <div className="p-2 bg-[#009EE3]/10 text-[#009EE3] rounded-xl">
                  <CreditCard className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-extrabold text-base text-slate-900 leading-tight">Datos para el Cobro y Entrega</h3>
                  <p className="text-[11px] text-slate-500">Completá tus datos para redirigirte a Mercado Pago</p>
                </div>
              </div>
              <button onClick={() => setIsBuyerModalOpen(false)} className="p-1.5 text-slate-400 hover:text-slate-700 rounded-full">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form
              onSubmit={(e) => {
                e.preventDefault();
                setIsBuyerModalOpen(false);
                handleMercadoPagoCheckout();
              }}
              className="space-y-3.5 mt-4 text-xs"
            >
              <div>
                <label className="font-bold text-slate-700 block mb-1">Nombre y Apellido *</label>
                <input
                  type="text"
                  required
                  placeholder="Ej: Florencia Rodríguez"
                  value={buyerInfo.nombre}
                  onChange={(e) => setBuyerInfo({ ...buyerInfo, nombre: e.target.value })}
                  className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl font-bold text-slate-900 focus:ring-2 focus:ring-sky-500 outline-none"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="font-bold text-slate-700 block mb-1">Teléfono / WhatsApp *</label>
                  <input
                    type="tel"
                    required
                    placeholder="Ej: 11 2345-6789"
                    value={buyerInfo.telefono}
                    onChange={(e) => setBuyerInfo({ ...buyerInfo, telefono: e.target.value })}
                    className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl font-bold text-slate-900 focus:ring-2 focus:ring-sky-500 outline-none"
                  />
                </div>
                <div>
                  <label className="font-bold text-slate-700 block mb-1">Email (Comprobante)</label>
                  <input
                    type="email"
                    placeholder="tu@email.com"
                    value={buyerInfo.email}
                    onChange={(e) => setBuyerInfo({ ...buyerInfo, email: e.target.value })}
                    className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl font-bold text-slate-900 focus:ring-2 focus:ring-sky-500 outline-none"
                  />
                </div>
              </div>

              {deliveryMethod === 'pickup' ? (
                <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-xs text-emerald-900 flex items-start gap-2.5">
                  <Store className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
                  <div>
                    <span className="font-extrabold text-[12px] block">Retiro en Taller (Sin costo):</span>
                    <p className="font-semibold text-emerald-800 text-[11px]">Salta 3169, San Bernardo del Tuyú</p>
                    <p className="text-[10px] text-emerald-700 mt-0.5">Te notificaremos por WhatsApp y Email cuando tu pedido esté fabricado.</p>
                  </div>
                </div>
              ) : (
                <div>
                  <label className="font-bold text-slate-700 block mb-1">
                    Dirección de Entrega a Domicilio * {shippingQuote ? `(${shippingQuote.serviceName})` : ''}
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="Calle, número, piso/depto, localidad..."
                    value={buyerInfo.direccion}
                    onChange={(e) => setBuyerInfo({ ...buyerInfo, direccion: e.target.value })}
                    className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl font-bold text-slate-900 focus:ring-2 focus:ring-sky-500 outline-none"
                  />
                </div>
              )}

              <div>
                <label className="font-bold text-slate-700 block mb-1">Notas o aclaraciones para el taller (Opcional)</label>
                <textarea
                  rows={2}
                  placeholder="Ej: Dejar en portería, color preferido..."
                  value={buyerInfo.notas}
                  onChange={(e) => setBuyerInfo({ ...buyerInfo, notas: e.target.value })}
                  className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl font-medium text-slate-900 focus:ring-2 focus:ring-sky-500 outline-none resize-none"
                />
              </div>

              <div className="p-3 bg-sky-50 rounded-2xl border border-sky-100 flex items-center justify-between text-xs">
                <span className="font-bold text-sky-900">Total a Pagar en Mercado Pago:</span>
                <span className="font-black text-base text-sky-600">
                  ${(cartSubtotal + (deliveryMethod === 'shipping' ? (shippingQuote?.price || 0) : 0)).toLocaleString('es-AR')}
                </span>
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsBuyerModalOpen(false)}
                  className="px-4 py-2 bg-slate-100 text-slate-700 font-bold rounded-xl hover:bg-slate-200 transition"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={isProcessingMp}
                  className="px-5 py-2.5 bg-[#009EE3] hover:bg-[#0089c7] text-white font-black rounded-xl shadow-md transition flex items-center gap-1.5"
                >
                  {isProcessingMp ? (
                    <>
                      <span className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      <span>Cargando...</span>
                    </>
                  ) : (
                    <>
                      <span>Ir a Pagar 🔒</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL PAGO EXITOSO MERCADO PAGO */}
      {paymentSuccessModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-xs animate-in zoom-in-95 duration-200">
          <div className="bg-white rounded-3xl max-w-sm w-full p-6 shadow-2xl border border-slate-200 text-center">
            <div className="w-16 h-16 rounded-3xl bg-emerald-100 text-emerald-600 mx-auto flex items-center justify-center mb-4 shadow-lg shadow-emerald-500/20">
              <ShieldCheck className="w-9 h-9" />
            </div>

            <span className="inline-block bg-emerald-100 text-emerald-800 text-[10px] font-black px-3 py-1 rounded-full border border-emerald-200 uppercase tracking-wider mb-2">
              ¡Pago Acreditado!
            </span>

            <h3 className="text-xl font-black text-slate-900 tracking-tight">¡Gracias por tu compra!</h3>
            <p className="text-xs text-slate-600 mt-2 leading-relaxed">
              Tu pedido <strong>{paymentSuccessModal !== 'OK' ? `#${paymentSuccessModal}` : ''}</strong> fue recibido y ya se encuentra registrado en nuestro taller para su impresión y despacho.
            </p>

            <div className="mt-5 space-y-2">
              <button
                onClick={() => {
                  if (receiptOrder) {
                    handleDownloadReceiptTxt(receiptOrder);
                  } else if (paymentSuccessModal && paymentSuccessModal !== 'OK') {
                    handleOpenReceipt(paymentSuccessModal);
                  }
                }}
                className="w-full py-3 bg-emerald-600 hover:bg-emerald-500 text-white font-extrabold text-xs rounded-xl shadow-md flex items-center justify-center gap-2 transition cursor-pointer"
              >
                <Download className="w-4 h-4" />
                <span>Descargar Comprobante al Celular</span>
              </button>

              {paymentSuccessModal && paymentSuccessModal !== 'OK' && (
                <button
                  onClick={() => handleOpenReceipt(paymentSuccessModal)}
                  disabled={isLoadingReceipt}
                  className="w-full py-2.5 bg-cyan-600 hover:bg-cyan-500 text-white font-extrabold text-xs rounded-xl shadow-md flex items-center justify-center gap-2 transition cursor-pointer"
                >
                  {isLoadingReceipt ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <Printer className="w-4 h-4" />
                  )}
                  <span>Ver / Imprimir Ticket Completo</span>
                </button>
              )}

              <a
                href={`https://wa.me/5492257559540?text=${encodeURIComponent(`¡Hola 3LD! 👋 Acabo de abonar mi pedido ${paymentSuccessModal !== 'OK' ? `#${paymentSuccessModal}` : ''} por la tienda web.`)}`}
                target="_blank"
                rel="noopener noreferrer"
                className="w-full py-2.5 bg-[#25D366] hover:bg-[#20ba5a] text-white font-extrabold text-xs rounded-xl shadow-sm flex items-center justify-center gap-2 transition"
              >
                <MessageCircle className="w-4 h-4" />
                <span>Avisar por WhatsApp</span>
              </a>

              <button
                onClick={() => setPaymentSuccessModal(null)}
                className="w-full py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs rounded-xl transition"
              >
                Continuar Navegando
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL COMPROBANTE DE COMPRA / TICKET IMPRIMIBLE */}
      {receiptOrder && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white rounded-3xl max-w-xl w-full p-6 shadow-2xl border border-slate-200 max-h-[95vh] flex flex-col">
            <div className="flex items-center justify-between pb-3 border-b border-slate-200 print:hidden">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-cyan-500/10 text-cyan-600 flex items-center justify-center">
                  <Printer className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="font-black text-sm text-slate-900 leading-tight">Comprobante de Pedido</h3>
                  <p className="text-[11px] text-slate-500">Orden #{receiptOrder.numero}</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => handleDownloadReceiptTxt(receiptOrder)}
                  className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 transition cursor-pointer shadow-xs active:scale-95"
                  title="Descargar comprobante en tu dispositivo"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>Descargar</span>
                </button>
                <button
                  onClick={() => window.print()}
                  className="px-3 py-1.5 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 transition cursor-pointer shadow-xs"
                >
                  <Printer className="w-3.5 h-3.5" />
                  <span>Imprimir / PDF</span>
                </button>
                <button
                  onClick={() => setReceiptOrder(null)}
                  className="p-1.5 text-slate-400 hover:text-slate-700 rounded-full"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Printable Content Area */}
            <div className="p-2 sm:p-4 overflow-y-auto flex-1 text-slate-800 space-y-4 text-xs font-sans">
              {/* Header */}
              <div className="flex justify-between items-start border-b border-slate-200 pb-3">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-xl font-black tracking-tight text-slate-900">3LD</span>
                    <span className="text-xs bg-cyan-100 text-cyan-800 font-extrabold px-2 py-0.5 rounded-md">Impresión 3D</span>
                  </div>
                  <p className="text-[11px] text-slate-500 mt-1">Fabricación Aditiva & Prototipado</p>
                  <p className="text-[11px] text-slate-500">Salta 3169, San Bernardo del Tuyú</p>
                  <p className="text-[11px] text-slate-500">WhatsApp: +54 9 2257 55-9540</p>
                </div>
                <div className="text-right">
                  <span className="inline-block px-2.5 py-1 bg-emerald-100 text-emerald-800 rounded-lg text-[10px] font-black uppercase mb-1">
                    {receiptOrder.estado === 'aprobado' || receiptOrder.estado === 'cobrado' ? 'Pago Acreditado' : 'Pedido Registrado'}
                  </span>
                  <p className="text-xs font-bold text-slate-900">Orden: #{receiptOrder.numero}</p>
                  <p className="text-[11px] text-slate-500">
                    Fecha: {receiptOrder.fecha ? new Date(receiptOrder.fecha).toLocaleDateString('es-AR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' }) : '-'}
                  </p>
                </div>
              </div>

              {/* Customer & Delivery Details */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 bg-slate-50 p-3 rounded-2xl border border-slate-200">
                <div>
                  <h4 className="font-black text-[11px] text-slate-500 uppercase tracking-wider mb-1">Datos del Cliente:</h4>
                  <p className="font-extrabold text-slate-900">{receiptOrder.cliente?.nombre || 'Consumidor Final'}</p>
                  {receiptOrder.cliente?.telefono && <p className="text-[11px] text-slate-600">Tel: {receiptOrder.cliente.telefono}</p>}
                  {receiptOrder.cliente?.email && <p className="text-[11px] text-slate-600">Email: {receiptOrder.cliente.email}</p>}
                </div>
                <div>
                  <h4 className="font-black text-[11px] text-slate-500 uppercase tracking-wider mb-1">Forma de Entrega:</h4>
                  <p className="font-extrabold text-slate-900">{receiptOrder.entrega_tipo || 'A coordinar'}</p>
                  <p className="text-[11px] text-slate-600">{receiptOrder.entrega_direccion || 'Salta 3169, San Bernardo'}</p>
                  {receiptOrder.notas && (
                    <p className="text-[10px] text-slate-500 italic mt-1 bg-white p-1 rounded border border-slate-100">
                      Nota: {receiptOrder.notas}
                    </p>
                  )}
                </div>
              </div>

              {/* Items Table */}
              <div>
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="border-b border-slate-200 text-[10px] font-black uppercase text-slate-400">
                      <th className="py-1.5">Cant.</th>
                      <th className="py-1.5">Descripción / Producto</th>
                      <th className="py-1.5 text-right">Precio Unit.</th>
                      <th className="py-1.5 text-right">Subtotal</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {receiptOrder.items?.map((item: any, idx: number) => (
                      <tr key={idx} className="text-xs">
                        <td className="py-2 font-black">{item.cantidad}x</td>
                        <td className="py-2">
                          <p className="font-bold text-slate-900">{item.descripcion}</p>
                          {item.notas && <p className="text-[10px] text-slate-500">{item.notas}</p>}
                        </td>
                        <td className="py-2 text-right font-medium">${Number(item.precio_unit).toLocaleString('es-AR')}</td>
                        <td className="py-2 text-right font-bold">${Number(item.subtotal).toLocaleString('es-AR')}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Totals */}
              <div className="border-t border-slate-200 pt-3 space-y-1 text-xs">
                <div className="flex justify-between text-slate-600">
                  <span>Subtotal Productos:</span>
                  <span className="font-bold">${Number(receiptOrder.subtotal || 0).toLocaleString('es-AR')}</span>
                </div>
                <div className="flex justify-between text-slate-600">
                  <span>Costo de Entrega:</span>
                  <span className="font-bold">
                    {Number(receiptOrder.costo_envio || 0) === 0 ? '¡GRATIS!' : `$${Number(receiptOrder.costo_envio).toLocaleString('es-AR')}`}
                  </span>
                </div>
                <div className="flex justify-between text-base font-black text-slate-900 pt-2 border-t border-slate-200">
                  <span>TOTAL ABONADO:</span>
                  <span className="text-cyan-600">${Number(receiptOrder.total || 0).toLocaleString('es-AR')}</span>
                </div>
              </div>

              {/* Footer Note */}
              <div className="bg-cyan-50 p-2.5 rounded-xl border border-cyan-100 text-[10px] text-cyan-900 text-center leading-relaxed">
                ¡Gracias por confiar en <strong>3LD Impresión 3D</strong>! Conservá este comprobante. Te enviaremos actualizaciones del estado de producción a tu contacto.
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Mobile Categories Bottom Sheet Modal */}
      {isMobileCatMenuOpen && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-slate-950/60 backdrop-blur-xs animate-in fade-in duration-150 p-0 sm:p-4">
          <div className="w-full max-w-md bg-white rounded-t-3xl sm:rounded-3xl max-h-[85vh] flex flex-col shadow-2xl overflow-hidden border border-slate-200 animate-in slide-in-from-bottom duration-200">
            {/* Drawer Header */}
            <div className="p-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/80">
              <div className="flex items-center gap-2.5">
                <span className="flex h-9 w-9 items-center justify-center rounded-2xl bg-[#6B66C8]/10 text-[#6B66C8]">
                  <Layers className="w-4 h-4" />
                </span>
                <div>
                  <h3 className="text-sm font-black text-slate-900">Categorías de la Tienda</h3>
                  <p className="text-[11px] text-slate-500 font-medium">{categories.length - 1} categorías disponibles</p>
                </div>
              </div>
              <button
                onClick={() => setIsMobileCatMenuOpen(false)}
                className="p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-200/60 rounded-full transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Categories Grid (2 Columnas con Foto en Celular) */}
            <div className="p-3 overflow-y-auto max-h-[75vh] flex-1">
              <div className="grid grid-cols-2 gap-2.5">
                {categories.map((cat) => {
                  const active = selectedCategory === cat.id || (selectedCategory === 'all' && cat.id === 'all');
                  return (
                    <button
                      key={cat.id}
                      onClick={() => {
                        setSelectedCategory(cat.id);
                        setSelectedSubcategory('all');
                        setIsMobileCatMenuOpen(false);
                      }}
                      className={`group relative flex flex-col overflow-hidden rounded-2xl border transition-all text-left ${
                        active
                          ? 'border-[#6B66C8] ring-2 ring-[#6B66C8]/40 bg-[#EFEBFC] shadow-sm'
                          : 'border-slate-200 bg-white hover:border-slate-300'
                      }`}
                    >
                      {/* Imagen o Ícono destacado */}
                      <div className="relative aspect-4/3 w-full overflow-hidden bg-slate-100 flex items-center justify-center">
                        {cat.image ? (
                          <img
                            src={cat.image}
                            alt={cat.name}
                            className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
                            onError={(e) => {
                              e.currentTarget.style.display = 'none';
                              const fallback = e.currentTarget.parentElement?.querySelector('.cat-emoji-fallback') as HTMLElement;
                              if (fallback) fallback.style.display = 'flex';
                            }}
                          />
                        ) : null}
                        <div
                          className={`cat-emoji-fallback flex h-full w-full items-center justify-center bg-gradient-to-br from-[#6B66C8]/10 to-[#6B66C8]/25 text-3xl ${
                            cat.image ? 'hidden' : ''
                          }`}
                        >
                          {cat.icon || '✨'}
                        </div>

                        {/* Cantidad de productos */}
                        {cat.productos_count !== undefined && cat.id !== 'all' && (
                          <span className="absolute top-1.5 right-1.5 rounded-full bg-slate-900/75 backdrop-blur-xs px-2 py-0.5 text-[10px] font-extrabold text-white shadow-2xs">
                            {cat.productos_count}
                          </span>
                        )}

                        {/* Tag Top / Destacada */}
                        {cat.es_destacada && (
                          <span className="absolute top-1.5 left-1.5 rounded-full bg-amber-500 text-white text-[9px] font-bold px-1.5 py-0.2 shadow-2xs flex items-center gap-0.5">
                            <Star className="w-2.5 h-2.5 fill-white text-white" /> Top
                          </span>
                        )}
                      </div>

                      {/* Info Nombre e Ícono */}
                      <div className="p-2.5 flex items-center justify-between gap-1">
                        <div className="min-w-0 flex-1">
                          <p className={`text-xs font-black truncate leading-tight ${active ? 'text-[#6B66C8]' : 'text-slate-900'}`}>
                            {cat.name}
                          </p>
                        </div>
                        <span className="text-xs shrink-0">{cat.icon}</span>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Mobile Bottom Navigation Bar */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-white/95 backdrop-blur-md border-t border-slate-200 px-6 py-2 flex items-center justify-between shadow-lg">
        <button
          onClick={() => {
            setSelectedCategory('all');
            setSelectedSubcategory('all');
            setSearchQuery('');
            window.scrollTo({ top: 0, behavior: 'smooth' });
          }}
          className="flex flex-col items-center text-slate-700 hover:text-cyan-600 active:scale-95"
        >
          <Sparkles className="w-5 h-5" />
          <span className="text-[10px] font-semibold mt-0.5">Inicio</span>
        </button>

        <button
          onClick={() => {
            setIsQuoteModalOpen(true);
          }}
          className="flex flex-col items-center text-slate-700 hover:text-cyan-600 active:scale-95"
        >
          <Layers className="w-5 h-5" />
          <span className="text-[10px] font-semibold mt-0.5">Cotizar STL</span>
        </button>

        <button
          onClick={() => setIsCartOpen(true)}
          className="relative flex flex-col items-center text-slate-700 hover:text-cyan-600 active:scale-95"
        >
          <ShoppingCart className="w-5 h-5" />
          {cartItemsCount > 0 && (
            <span className="absolute -top-1 right-2 bg-cyan-500 text-white text-[9px] font-black w-4 h-4 rounded-full flex items-center justify-center">
              {cartItemsCount}
            </span>
          )}
          <span className="text-[10px] font-semibold mt-0.5">Carrito</span>
        </button>
      </nav>

      {/* Floating Advisor WhatsApp Button */}
      {!isCartOpen && (
        <div className="fixed bottom-20 right-4 md:bottom-6 md:right-6 z-30 flex items-center group print:hidden">
          {/* Tooltip visible on hover */}
          <div className="pointer-events-none absolute right-full mr-3 whitespace-nowrap rounded-xl bg-slate-900/90 backdrop-blur-md px-3.5 py-2 text-xs font-semibold text-white shadow-xl opacity-0 translate-x-2 transition-all duration-200 group-hover:opacity-100 group-hover:translate-x-0 flex items-center gap-1.5 border border-slate-700/50">
            <Headset className="w-3.5 h-3.5 text-emerald-400" />
            <span>Contactar a un asesor</span>
            <div className="absolute left-full top-1/2 -translate-y-1/2 border-4 border-transparent border-l-slate-900/90" />
          </div>

          <a
            href={getAdvisorWhatsAppUrl()}
            target="_blank"
            rel="noopener noreferrer"
            onClick={() => trackWhatsAppClick('asesor_flotante', activeProductModal || undefined)}
            aria-label="Contactar a un asesor por WhatsApp"
            className="relative flex h-14 w-14 items-center justify-center rounded-full bg-[#25D366] hover:bg-[#20ba5a] text-white shadow-lg shadow-emerald-600/30 hover:shadow-xl hover:shadow-emerald-600/50 transition-all duration-300 hover:scale-110 active:scale-95 border-2 border-white/40"
          >
            {/* Status indicator badge */}
            <span className="absolute -top-0.5 -right-0.5 flex h-3.5 w-3.5">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-200 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-3.5 w-3.5 bg-emerald-400 border-2 border-white"></span>
            </span>
            <Headset className="w-7 h-7" />
          </a>
        </div>
      )}
      </div>

      {/* Styles for Window Print / PDF Export */}
      <style>{`
        @media print {
          @page {
            size: A4 portrait;
            margin: 8mm;
          }
          html, body {
            background: white !important;
            color: black !important;
            margin: 0 !important;
            padding: 0 !important;
          }
          .print\\:hidden,
          header,
          footer,
          nav,
          section,
          main,
          aside {
            display: none !important;
          }
          .print\\:block {
            display: block !important;
          }
        }
      `}</style>

      {/* Printable 2-Column Catalog Container (visible ONLY during window.print()) */}
      <div className="hidden print:block p-4 bg-white text-slate-900 font-sans">
        {/* Catalog Formal Header */}
        <div className="border-b-2 border-slate-900 pb-3 mb-4 flex items-start justify-between">
          <div>
            <h1 className="text-2xl font-black text-slate-900 tracking-tight">3LD IMPRESIÓN 3D</h1>
            <p className="text-xs font-bold text-slate-700">Catálogo de Productos & Soluciones 3D</p>
            <p className="text-[10px] text-slate-500 mt-0.5">
              🌐 sistema.3ld.com.ar | 📱 WhatsApp: +54 9 2257 55-9540 | ✉️ ventas@3ld.com.ar
            </p>
          </div>
          <div className="text-right">
            <span className="inline-block bg-slate-100 text-slate-900 font-black text-xs px-3 py-1 rounded-full border border-slate-300 uppercase">
              {selectedCategory !== 'all' ? (currentCategoryData?.name || selectedCategory) : 'Catálogo Completo'}
            </span>
            {selectedSubcategory !== 'all' && (
              <p className="text-xs font-bold text-cyan-800 mt-0.5">Subcategoría: {selectedSubcategory}</p>
            )}
            <p className="text-[10px] text-slate-400 mt-1">
              Fecha: {new Date().toLocaleDateString('es-AR')} | {filteredProducts.length} artículos
            </p>
          </div>
        </div>

        {/* Product Cards Grid: Ordered by category when multiple categories exist */}
        {printCategoriesGrouped.groups.map((group, gIdx) => (
          <div key={group.categoryKey || gIdx} className="mb-6 last:mb-0">
            {printCategoriesGrouped.hasMultiple && (
              <div className="mb-3 pb-1 border-b-2 border-slate-900 flex items-center justify-between break-after-avoid">
                <h2 className="text-xs font-black uppercase tracking-wider text-slate-900 flex items-center gap-1.5">
                  <span>📂 {group.categoryName}</span>
                </h2>
                <span className="text-[9px] font-bold bg-slate-100 text-slate-700 px-2 py-0.5 rounded-full border border-slate-300">
                  {group.products.length} {group.products.length === 1 ? 'artículo' : 'artículos'}
                </span>
              </div>
            )}

            <div className="grid grid-cols-2 gap-3 mb-3">
              {group.products.map((p) => (
                <div
                  key={p.id}
                  className="border border-slate-300 rounded-xl p-3 flex flex-col justify-between break-inside-avoid bg-white shadow-none text-slate-900"
                >
                  <div>
                    <div className="aspect-[4/3] w-full bg-slate-50 rounded-lg overflow-hidden mb-2 border border-slate-200 flex items-center justify-center p-1">
                      <img src={catalogThumbnails[p.image] || p.image} alt={p.title} className="w-full h-full object-contain" />
                    </div>
                    <div className="flex items-center justify-between gap-1 mb-1">
                      <span className="text-[9px] font-extrabold text-cyan-800 uppercase tracking-wide">
                        {p.subcategory || p.category}
                      </span>
                      <span className={`text-[9px] font-bold px-1.5 py-0.2 rounded ${isProductInStock(p) ? 'bg-emerald-100 text-emerald-900 border border-emerald-200' : 'bg-slate-100 text-slate-700 border border-slate-200'}`}>
                        {isProductInStock(p) ? 'En Stock' : 'A Pedido'}
                      </span>
                    </div>
                    <h3 className="text-xs font-bold text-slate-900 leading-tight">{p.title}</h3>
                    <p className="text-[10px] text-slate-600 mt-1 leading-snug line-clamp-2">
                      {p.description}
                    </p>
                    {hasValidSize(p.size) && (
                      <p className="text-[9px] font-semibold text-slate-500 mt-1.5">
                        📏 Medidas: {p.size}
                      </p>
                    )}
                    {p.piezas && p.piezas.length > 0 && (
                      <div className="mt-2 pt-1.5 border-t border-slate-100 text-[9px] text-slate-700 space-y-0.5">
                        <p className="font-extrabold text-indigo-900 uppercase">🧩 Piezas incluidas / opcionales:</p>
                        {p.piezas.map((pieza, pIdx) => (
                          <div key={pIdx} className="flex items-center justify-between">
                            <span>• {pieza.nombre}{pieza.medidas ? ` (${pieza.medidas})` : ''}</span>
                            <span className="font-bold">${Number(pieza.precio).toLocaleString('es-AR')}</span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  <div className="mt-3 pt-2 border-t border-slate-200 flex items-center justify-between">
                    <div>
                      {p.oldPrice && (
                        <span className="text-[9px] text-slate-400 line-through mr-1 font-semibold">
                          ${p.oldPrice.toLocaleString('es-AR')}
                        </span>
                      )}
                      <span className="text-xs font-black text-slate-900">
                        {p.piezas && p.piezas.length > 0 && <span className="text-[10px] text-slate-400 font-bold mr-1">Desde</span>}
                        ${((p.piezas && p.piezas.length > 0)
                          ? (Math.min(...p.piezas.map(pz => Number(pz.precio) || 0).filter(pr => pr > 0)) || p.price)
                          : p.price).toLocaleString('es-AR')}
                      </span>
                    </div>
                    <span className="text-[9px] font-bold text-slate-400">3LD Taller 3D</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))}

        {/* Footer */}
        <div className="mt-6 pt-3 border-t border-slate-300 flex items-center justify-between text-[9px] text-slate-500">
          <p>3LD Impresión 3D - Fabricación Digital & Piezas a Pedido</p>
          <p>Pedidos y cotizaciones vía WhatsApp (+54 9 2257 55-9540)</p>
        </div>
      </div>

      <SocialShareModal
        isOpen={!!socialShareProduct}
        onClose={() => setSocialShareProduct(null)}
        product={socialShareProduct}
      />

      {isStoriesOpen && (
        <React.Suspense fallback={null}>
          <TiendaStoriesModal
            isOpen={isStoriesOpen}
            onClose={() => setIsStoriesOpen(false)}
            products={products}
            onOpenProduct={(prod) => {
              setIsStoriesOpen(false);
              openProductModal(prod);
            }}
            onAddToCart={(prod) => {
              addToCart(prod);
            }}
            favorites={favorites}
            onToggleFavorite={toggleFavorite}
          />
        </React.Suspense>
      )}
    </div>
  );
}
