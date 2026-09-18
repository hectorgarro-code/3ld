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
  Check,
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
  Store
} from 'lucide-react';
import api from '@/lib/api';

export interface Category {
  id: string;
  name: string;
  icon: string;
  subcategories: string[];
}

export interface StoreProduct {
  id: string | number;
  title: string;
  category: string;
  subcategory?: string;
  price: number;
  oldPrice?: number | null;
  stockStatus: 'ready' | 'custom' | string;
  image: string;
  description: string;
  weightGrams?: number;
  size?: string;
  es_destacado?: boolean | number;
}

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

export interface CartItem {
  id: string | number;
  title: string;
  price: number;
  image: string;
  color: string;
  weightGrams: number;
  qty: number;
}

export default function TiendaPage() {
  const [products, setProducts] = useState<StoreProduct[]>(() => {
    try {
      const saved = localStorage.getItem('3ld_react_products');
      return saved ? JSON.parse(saved) : INITIAL_PRODUCTS;
    } catch {
      return INITIAL_PRODUCTS;
    }
  });

  const [cart, setCart] = useState<CartItem[]>(() => {
    try {
      const saved = localStorage.getItem('3ld_react_cart');
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  // Navigation & Filtering
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [selectedSubcategory, setSelectedSubcategory] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [stockFilter, setStockFilter] = useState('all'); // all, ready, custom
  const [sortOption, setSortOption] = useState('featured');

  // Modals & Notifications
  const [isCartOpen, setIsCartOpen] = useState(false);
  const [activeProductModal, setActiveProductModal] = useState<StoreProduct | null>(null);
  const [isQuoteModalOpen, setIsQuoteModalOpen] = useState(false);
  const [modalSelectedColor, setModalSelectedColor] = useState('Negro Mate');
  const [toastMessage, setToastMessage] = useState<{ text: string; type: string } | null>(null);

  // Shipping
  const [postalCode, setPostalCode] = useState('');
  const [shippingQuote, setShippingQuote] = useState<{ serviceName: string; price: number; estimatedDays: string; isFree: boolean } | null>(null);
  const [isCalculatingShipping, setIsCalculatingShipping] = useState(false);

  // Fetch API products on load
  useEffect(() => {
    const fetchStoreProducts = async () => {
      try {
        const res = await api.get('/tienda/productos');
        if (res.data?.data && Array.isArray(res.data.data) && res.data.data.length > 0) {
          setProducts(res.data.data);
        }
      } catch (err) {
        // Fallback to local items if endpoint is offline
      }
    };
    fetchStoreProducts();
  }, []);

  useEffect(() => {
    try {
      localStorage.setItem('3ld_react_cart', JSON.stringify(cart));
    } catch (e) {
      console.error(e);
    }
  }, [cart]);

  const showToast = (msg: string, type = 'info') => {
    setToastMessage({ text: msg, type });
    setTimeout(() => setToastMessage(null), 3500);
  };

  const addToCart = (product: StoreProduct, qty = 1, color = 'Negro Mate') => {
    setCart((prev) => {
      const existing = prev.find((item) => item.id === product.id && item.color === color);
      if (existing) {
        return prev.map((item) =>
          item.id === product.id && item.color === color
            ? { ...item, qty: item.qty + qty }
            : item
        );
      }
      return [
        ...prev,
        {
          id: product.id,
          title: product.title,
          price: product.price,
          image: product.image,
          color: color,
          weightGrams: product.weightGrams || 50,
          qty: qty
        }
      ];
    });
    showToast(`¡"${product.title}" agregado al carrito!`, 'success');
  };

  const updateCartQty = (id: string | number, color: string, delta: number) => {
    setCart((prev) =>
      prev
        .map((item) => {
          if (item.id === id && item.color === color) {
            const newQty = item.qty + delta;
            return newQty > 0 ? { ...item, qty: newQty } : null;
          }
          return item;
        })
        .filter(Boolean) as CartItem[]
    );
  };

  const removeCartItem = (id: string | number, color: string) => {
    setCart((prev) => prev.filter((item) => !(item.id === id && item.color === color)));
  };

  const cartSubtotal = useMemo(() => {
    return cart.reduce((sum, item) => sum + item.price * item.qty, 0);
  }, [cart]);

  const cartItemsCount = useMemo(() => {
    return cart.reduce((sum, item) => sum + item.qty, 0);
  }, [cart]);

  const freeShippingThreshold = 30000;
  const isFreeLocalShipping = cartSubtotal >= freeShippingThreshold;

  const currentCategoryData = useMemo(() => {
    return INITIAL_CATEGORIES.find((c) => c.id === selectedCategory) || INITIAL_CATEGORIES[0];
  }, [selectedCategory]);

  const filteredProducts = useMemo(() => {
    return products
      .filter((p) => {
        if (selectedCategory !== 'all' && p.category !== selectedCategory) return false;
        if (selectedSubcategory !== 'all' && p.subcategory !== selectedSubcategory) return false;
        if (stockFilter !== 'all' && p.stockStatus !== stockFilter) return false;
        if (searchQuery.trim()) {
          const query = searchQuery.toLowerCase();
          const inTitle = p.title.toLowerCase().includes(query);
          const inDesc = p.description.toLowerCase().includes(query);
          const inSub = (p.subcategory || '').toLowerCase().includes(query);
          if (!inTitle && !inDesc && !inSub) return false;
        }
        return true;
      })
      .sort((a, b) => {
        if (sortOption === 'price-asc') return a.price - b.price;
        if (sortOption === 'price-desc') return b.price - a.price;
        if (sortOption === 'name-asc') return a.title.localeCompare(b.title);
        return 0;
      });
  }, [products, selectedCategory, selectedSubcategory, stockFilter, searchQuery, sortOption]);

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
      const isLocalCost = cp.startsWith('71');
      if (isLocalCost) {
        setShippingQuote({
          serviceName: 'Envío Local La Costa / San Bernardo',
          price: isFreeLocalShipping ? 0 : 2500,
          estimatedDays: '24 a 48 hs',
          isFree: isFreeLocalShipping
        });
      } else {
        setShippingQuote({
          serviceName: 'Andreani Estándar a Domicilio',
          price: 4850,
          estimatedDays: '3 a 5 días hábiles',
          isFree: false
        });
      }
    }, 600);
  };

  const handleWhatsAppCheckout = () => {
    if (cart.length === 0) return;
    const phone = '5492257559540';
    let text = `¡Hola 3LD! 👋 Quiero encargar el siguiente pedido desde la tienda:\n\n`;

    cart.forEach((item) => {
      text += `• *${item.qty}x* ${item.title}\n  - Color PLA: ${item.color}\n  - Subtotal: $${(item.price * item.qty).toLocaleString('es-AR')}\n`;
    });

    text += `\n📦 *Subtotal:* $${cartSubtotal.toLocaleString('es-AR')}\n`;
    if (shippingQuote) {
      text += `🚚 *Envío (${shippingQuote.serviceName}):* ${shippingQuote.price === 0 ? '¡GRATIS!' : '$' + shippingQuote.price.toLocaleString('es-AR')}\n`;
      text += `📍 *CP Destino:* ${postalCode}\n`;
      text += `💰 *TOTAL FINAL:* $${(cartSubtotal + (shippingQuote.price || 0)).toLocaleString('es-AR')}\n`;
    } else {
      text += `🚚 *Envío:* A coordinar dirección\n`;
      text += `💰 *TOTAL ESTIMADO:* $${cartSubtotal.toLocaleString('es-AR')}\n`;
    }

    text += `\n¿Tienen disponibilidad para coordinar? ¡Muchas gracias!`;
    window.open(`https://wa.me/${phone}?text=${encodeURIComponent(text)}`, '_blank');
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 font-sans flex flex-col antialiased selection:bg-cyan-500 selection:text-white pb-20 md:pb-10">
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
            {/* Logo 3LD */}
            <div
              onClick={() => {
                setSelectedCategory('all');
                setSelectedSubcategory('all');
                setSearchQuery('');
              }}
              className="flex items-center gap-2.5 cursor-pointer group"
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
              <button
                onClick={() => setIsQuoteModalOpen(true)}
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

      {/* Category Pills Bar */}
      <section className="bg-white border-b border-slate-200 sticky top-16 z-30 shadow-2xs">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center gap-2 py-2.5 overflow-x-auto no-scrollbar scroll-smooth">
            {INITIAL_CATEGORIES.map((cat) => {
              const active = selectedCategory === cat.id;
              return (
                <button
                  key={cat.id}
                  onClick={() => {
                    setSelectedCategory(cat.id);
                    setSelectedSubcategory('all');
                  }}
                  className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-xs font-bold whitespace-nowrap transition active:scale-95 ${
                    active
                      ? 'bg-[#6B66C8] text-white shadow-sm ring-2 ring-[#6B66C8] ring-offset-1'
                      : 'bg-slate-100 text-slate-700 hover:bg-[#EFEBFC] hover:text-[#6B66C8]'
                  }`}
                >
                  <span>{cat.icon}</span>
                  <span>{cat.name}</span>
                </button>
              );
            })}
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
        {/* Controls Bar */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-6 pb-2 border-b border-slate-200">
          <div className="flex items-center gap-2.5">
            <h1 className="text-xl font-black text-slate-900 tracking-tight">{currentCategoryData.name}</h1>
            <span className="bg-slate-200 text-slate-700 text-xs font-bold px-2.5 py-0.5 rounded-full">
              {filteredProducts.length} artículo{filteredProducts.length === 1 ? '' : 's'}
            </span>
          </div>

          <div className="flex items-center gap-2 flex-wrap text-xs">
            <div className="flex items-center bg-white border border-slate-200 rounded-xl p-1 shadow-2xs">
              <button
                onClick={() => setStockFilter('all')}
                className={`px-2.5 py-1 rounded-lg font-bold transition ${
                  stockFilter === 'all' ? 'bg-slate-900 text-white' : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Todos
              </button>
              <button
                onClick={() => setStockFilter('ready')}
                className={`px-2.5 py-1 rounded-lg font-bold transition ${
                  stockFilter === 'ready' ? 'bg-slate-900 text-white' : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                ⚡ En Stock
              </button>
              <button
                onClick={() => setStockFilter('custom')}
                className={`px-2.5 py-1 rounded-lg font-bold transition ${
                  stockFilter === 'custom' ? 'bg-slate-900 text-white' : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                🛠️ A Pedido
              </button>
            </div>

            <select
              value={sortOption}
              onChange={(e) => setSortOption(e.target.value)}
              className="bg-white border border-slate-200 text-slate-700 text-xs font-semibold rounded-xl px-2.5 py-2 focus:ring-2 focus:ring-cyan-500 focus:outline-none"
            >
              <option value="featured">Destacados</option>
              <option value="price-asc">Precio: Menor a Mayor</option>
              <option value="price-desc">Precio: Mayor a Menor</option>
              <option value="name-asc">Nombre: A - Z</option>
            </select>
          </div>
        </div>

        {/* Product Cards Grid */}
        {filteredProducts.length === 0 ? (
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
                onClick={() => setActiveProductModal(product)}
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
                    {product.stockStatus === 'ready' ? (
                      <span className="bg-emerald-500/90 text-white text-[10px] font-black px-2 py-0.5 rounded-md backdrop-blur-xs flex items-center gap-1 shadow-xs">
                        <Zap className="w-3 h-3" /> En Stock
                      </span>
                    ) : (
                      <span className="bg-cyan-600/90 text-white text-[10px] font-black px-2 py-0.5 rounded-md backdrop-blur-xs flex items-center gap-1 shadow-xs">
                        🛠️ A Pedido
                      </span>
                    )}
                  </div>
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
                  </div>

                  <div className="mt-3 pt-2 border-t border-slate-100 flex items-center justify-between">
                    <div>
                      {product.oldPrice && (
                        <span className="text-[10px] text-slate-400 line-through mr-1 font-semibold">
                          ${product.oldPrice.toLocaleString('es-AR')}
                        </span>
                      )}
                      <span className="text-sm font-black text-slate-900">
                        ${product.price.toLocaleString('es-AR')}
                      </span>
                    </div>

                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        addToCart(product);
                      }}
                      className="p-2 bg-slate-900 hover:bg-cyan-600 text-white rounded-xl transition active:scale-90"
                      title="Agregar al Carrito"
                    >
                      <Plus className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
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

            {/* Shipping & Total Footer */}
            {cart.length > 0 && (
              <div className="p-4 border-t border-slate-200 bg-slate-50 space-y-3">
                {/* Calculate Shipping */}
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
                    className="px-3 py-2 bg-slate-900 text-white text-xs font-bold rounded-xl hover:bg-slate-800 transition disabled:opacity-50"
                  >
                    {isCalculatingShipping ? 'Cotizando...' : 'Calcular Envío'}
                  </button>
                </form>

                {shippingQuote && (
                  <div className="p-2.5 bg-cyan-50 border border-cyan-200 rounded-xl text-xs flex justify-between items-center text-cyan-950 font-semibold">
                    <div>
                      <p className="font-bold">{shippingQuote.serviceName}</p>
                      <p className="text-[10px] text-cyan-700">Demora: {shippingQuote.estimatedDays}</p>
                    </div>
                    <span className="font-black text-sm">
                      {shippingQuote.isFree || shippingQuote.price === 0 ? '¡GRATIS!' : `$${shippingQuote.price.toLocaleString('es-AR')}`}
                    </span>
                  </div>
                )}

                {/* Subtotal & Total */}
                <div className="space-y-1 text-xs">
                  <div className="flex justify-between text-slate-600">
                    <span>Subtotal:</span>
                    <span className="font-bold">${cartSubtotal.toLocaleString('es-AR')}</span>
                  </div>
                  {shippingQuote && (
                    <div className="flex justify-between text-slate-600">
                      <span>Envío:</span>
                      <span className="font-bold">
                        {shippingQuote.price === 0 ? '¡GRATIS!' : `$${shippingQuote.price.toLocaleString('es-AR')}`}
                      </span>
                    </div>
                  )}
                  <div className="flex justify-between text-sm font-black text-slate-900 pt-2 border-t border-slate-200">
                    <span>TOTAL FINAL:</span>
                    <span className="text-cyan-600">
                      ${(cartSubtotal + (shippingQuote?.price || 0)).toLocaleString('es-AR')}
                    </span>
                  </div>
                </div>

                {/* WhatsApp Checkout Button */}
                <button
                  onClick={handleWhatsAppCheckout}
                  className="w-full py-3 bg-emerald-600 hover:bg-emerald-500 text-white font-extrabold text-sm rounded-2xl shadow-md flex items-center justify-center gap-2 transition active:scale-95"
                >
                  <MessageCircle className="w-5 h-5" />
                  <span>Enviar Pedido por WhatsApp</span>
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Product Detail Modal */}
      {activeProductModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-xs">
          <div className="bg-white rounded-3xl max-w-md w-full overflow-hidden shadow-2xl animate-in zoom-in-95 duration-150 border border-slate-200">
            <div className="relative aspect-square bg-slate-100">
              <img src={activeProductModal.image} alt={activeProductModal.title} className="w-full h-full object-cover" />
              <button
                onClick={() => setActiveProductModal(null)}
                className="absolute top-3 right-3 p-2 bg-slate-900/80 text-white rounded-full hover:bg-slate-900 transition"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-5">
              <span className="text-xs font-bold text-cyan-600 uppercase tracking-wide">
                {activeProductModal.subcategory || activeProductModal.category}
              </span>
              <h2 className="text-lg font-black text-slate-900 mt-1 leading-snug">{activeProductModal.title}</h2>

              <p className="text-xs text-slate-600 mt-2 leading-relaxed">{activeProductModal.description}</p>

              {/* Color options */}
              <div className="mt-4">
                <label className="text-xs font-bold text-slate-800 block mb-1.5">Color de Impresión (PLA):</label>
                <div className="flex items-center gap-2 flex-wrap">
                  {AVAILABLE_COLORS.map((c) => (
                    <button
                      key={c.name}
                      onClick={() => setModalSelectedColor(c.name)}
                      className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold border transition ${
                        modalSelectedColor === c.name
                          ? 'border-cyan-600 bg-cyan-50 text-cyan-900 ring-2 ring-cyan-500/30'
                          : 'border-slate-200 text-slate-700 bg-white hover:bg-slate-50'
                      }`}
                    >
                      <span className="w-3 h-3 rounded-full border border-slate-300" style={{ backgroundColor: c.hex }} />
                      <span>{c.name}</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Specs */}
              {activeProductModal.size && (
                <div className="mt-3 text-xs text-slate-500 font-medium">
                  📏 Medidas: <span className="text-slate-800 font-bold">{activeProductModal.size}</span>
                </div>
              )}

              {/* Price & Action */}
              <div className="mt-5 pt-4 border-t border-slate-100 flex items-center justify-between">
                <div>
                  <span className="text-xs text-slate-400 block">Precio Total</span>
                  <span className="text-xl font-black text-slate-900">
                    ${activeProductModal.price.toLocaleString('es-AR')}
                  </span>
                </div>

                <button
                  onClick={() => {
                    addToCart(activeProductModal, 1, modalSelectedColor);
                    setActiveProductModal(null);
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
    </div>
  );
}
