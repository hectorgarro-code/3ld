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
    HelpCircle,
    Trash2,
    ExternalLink,
    ArrowRight,
    ShieldCheck,
    Zap,
    MapPin
} from 'lucide-react';

const INITIAL_CATEGORIES = [
    { id: 'all', name: 'Todo el Catálogo', icon: '✨', subcategories: [] },
    { id: 'cortantes', name: 'Cortantes & Repostería', icon: '🍪', subcategories: ['Todos', 'Navidad', 'Pokémon', 'Cumpleaños', 'Disney', 'Animales'] },
    { id: 'ceramica', name: 'Herramientas Cerámica', icon: '🏺', subcategories: ['Todos', 'Sellos con mango', 'Texturizadores', 'Desbastadores'] },
    { id: 'didacticos', name: 'Didácticos Montessori', icon: '🧩', subcategories: ['Todos', 'STEAM', 'Motricidad Fina', 'Rutinas Visuales'] },
    { id: 'moldes', name: 'Moldes & Macetas', icon: '🪴', subcategories: ['Todos', 'Macetas Geométricas', 'Moldes Yeso/Cemento'] },
    { id: 'figuras', name: 'Figuras & Dummy 13', icon: '🤖', subcategories: ['Todos', 'Universo Dummy 13', 'Articulados'] },
    { id: 'personalizados', name: 'Llaveros & Logos', icon: '🏷️', subcategories: ['Todos', 'Comercios', 'Eventos', 'Vinchas'] }
];

const INITIAL_PRODUCTS = [
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

const Toast = ({ message, type, onClose }) => {
    if (!message) return null;
    return (
        <div className= "fixed bottom-20 md:bottom-6 right-4 z-50 animate-bounce transition-all" >
        <div className={
            `px-4 py-3 rounded-2xl shadow-xl flex items-center gap-3 text-sm font-semibold border ${type === 'success'
                ? 'bg-slate-900 text-emerald-400 border-emerald-500/40'
                : 'bg-slate-900 text-cyan-300 border-cyan-500/40'
            }`
    }>
        <Sparkles className="w-4 h-4 shrink-0" />
            <span>{ message } </span>
            < button onClick = { onClose } className = "p-1 hover:text-white rounded-lg ml-1" >
                <X className="w-4 h-4" />
                    </button>
                    </div>
                    </div>
  );
};

export default function App() {
    const [products, setProducts] = useState(() => {
        try {
            const saved = localStorage.getItem('3ld_react_products');
            return saved ? JSON.parse(saved) : INITIAL_PRODUCTS;
        } catch {
            return INITIAL_PRODUCTS;
        }
    });

    const [cart, setCart] = useState(() => {
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

    // Modals & Drawers
    const [isCartOpen, setIsCartOpen] = useState(false);
    const [activeProductModal, setActiveProductModal] = useState(null);
    const [isQuoteModalOpen, setIsQuoteModalOpen] = useState(false);
    const [isAdminModalOpen, setIsAdminModalOpen] = useState(false);
    const [modalSelectedColor, setModalSelectedColor] = useState('Negro Mate');
    const [toastMessage, setToastMessage] = useState(null);

    // Andreani & Shipping State
    const [postalCode, setPostalCode] = useState('');
    const [shippingQuote, setShippingQuote] = useState(null);
    const [isCalculatingShipping, setIsCalculatingShipping] = useState(false);

    // Checkout Type State
    const [checkoutMode, setCheckoutMode] = useState('whatsapp'); // 'whatsapp' | 'mercadopago'
    const [isProcessingMp, setIsProcessingMp] = useState(false);

    useEffect(() => {
        try {
            localStorage.setItem('3ld_react_cart', JSON.stringify(cart));
        } catch (e) {
            console.error(e);
        }
    }, [cart]);

    useEffect(() => {
        try {
            localStorage.setItem('3ld_react_products', JSON.stringify(products));
        } catch (e) {
            console.error(e);
        }
    }, [products]);

    const showToast = (msg, type = 'info') => {
        setToastMessage({ text: msg, type });
        setTimeout(() => setToastMessage(null), 3500);
    };

    const addToCart = (product, qty = 1, color = 'Negro Mate') => {
        setCart(prev => {
            const existing = prev.find(item => item.id === product.id && item.color === color);
            if (existing) {
                return prev.map(item =>
                    item.id === product.id && item.color === color
                        ? { ...item, qty: item.qty + qty }
                        : item
                );
            }
            return [...prev, {
                id: product.id,
                title: product.title,
                price: product.price,
                image: product.image,
                color: color,
                weightGrams: product.weightGrams || 50,
                qty: qty
            }];
        });
        showToast(`¡"${product.title}" agregado al carrito!`, 'success');
    };

    const updateCartQty = (id, color, delta) => {
        setCart(prev => {
            return prev.map(item => {
                if (item.id === id && item.color === color) {
                    const newQty = item.qty + delta;
                    return newQty > 0 ? { ...item, qty: newQty } : null;
                }
                return item;
            }).filter(Boolean);
        });
    };

    const removeCartItem = (id, color) => {
        setCart(prev => prev.filter(item => !(item.id === id && item.color === color)));
    };

    const cartSubtotal = useMemo(() => {
        return cart.reduce((sum, item) => sum + (item.price * item.qty), 0);
    }, [cart]);

    const cartTotalWeightGrams = useMemo(() => {
        return cart.reduce((sum, item) => sum + ((item.weightGrams || 50) * item.qty), 0);
    }, [cart]);

    const cartItemsCount = useMemo(() => {
        return cart.reduce((sum, item) => sum + item.qty, 0);
    }, [cart]);

    const freeShippingThreshold = 30000;
    const isFreeLocalShipping = cartSubtotal >= freeShippingThreshold;

    const currentCategoryData = useMemo(() => {
        return INITIAL_CATEGORIES.find(c => c.id === selectedCategory) || INITIAL_CATEGORIES[0];
    }, [selectedCategory]);

    const filteredProducts = useMemo(() => {
        return products.filter(p => {
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
        }).sort((a, b) => {
            if (sortOption === 'price-asc') return a.price - b.price;
            if (sortOption === 'price-desc') return b.price - a.price;
            if (sortOption === 'name-asc') return a.title.localeCompare(b.title);
            return 0;
        });
    }, [products, selectedCategory, selectedSubcategory, stockFilter, searchQuery, sortOption]);

    const handleCalculateShipping = (e) => {
        e?.preventDefault();
        const cp = postalCode.trim();
        if (!cp || cp.length < 4) {
            showToast('Ingresá un código postal válido de Argentina (ej: 7111 o 1425)', 'info');
            return;
        }

        setIsCalculatingShipping(true);
        // Simulación de respuesta de cotizador de Andreani
        // En producción: POST a /api/shipping/andreani con { cp, weight: cartTotalWeightGrams }
        setTimeout(() => {
            setIsCalculatingShipping(false);
            const isLocalCost = cp.startsWith('71'); // Códigos postales de Partido de La Costa / Costa Atlántica
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
        let text = `¡Hola 3LD! 👋 Quiero encargar el siguiente pedido desde 3ld.com.ar:\n\n`;

        cart.forEach(item => {
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

    const handleMercadoPagoCheckout = async () => {
        if (cart.length === 0) return;
        setIsProcessingMp(true);

        // Simulación de creación de Preference ID en Backend (Node.js / Express / Next.js)
        // payload: { items: cart, payer: {...}, back_urls: {...} }
        setTimeout(() => {
            setIsProcessingMp(false);
            showToast('Redirigiendo a la pasarela segura de Mercado Pago...', 'success');
            // En producción: window.location.href = preference.init_point;
            // Para demo en vivo, abrimos checkout explicativo o WhatsApp con confirmación
            setTimeout(() => {
                handleWhatsAppCheckout();
            }, 1000);
        }, 1200);
    };

    const handleCreateProduct = (e) => {
        e.preventDefault();
        const form = e.target;
        const newProd = {
            id: 'p-' + Date.now(),
            title: form.title.value.trim(),
            category: form.category.value,
            subcategory: form.subcategory.value.trim() || 'Varios',
            price: parseFloat(form.price.value) || 0,
            oldPrice: form.oldPrice.value ? parseFloat(form.oldPrice.value) : null,
            stockStatus: form.stockStatus.value,
            image: form.image.value.trim() || 'https://images.unsplash.com/photo-1581092160607-ee22621dd758?w=500&auto=format&fit=crop&q=60',
            description: form.description.value.trim() || 'Pieza 3D confeccionada con PLA de alta resistencia.',
            weightGrams: parseInt(form.weightGrams.value) || 60,
            size: form.size.value.trim() || 'Medida estándar'
        };

        setProducts([newProd, ...products]);
        setIsAdminModalOpen(false);
        showToast(`Artículo "${newProd.title}" publicado con éxito`, 'success');
    };

    return (
        <div className= "min-h-screen bg-slate-50 text-slate-900 font-sans flex flex-col antialiased selection:bg-cyan-500 selection:text-white pb-20 md:pb-10" >

        {/* Barra de Notificación Superior */ }
        < div className = "bg-gradient-to-r from-slate-950 via-cyan-950 to-slate-950 text-white text-[11px] sm:text-xs py-2 px-4 text-center font-medium tracking-wide flex items-center justify-center gap-2 border-b border-cyan-900/40" >
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" > </span>
                <span>🚚 <strong>Envío Gratis < /strong> en La Costa desde $30.000 | Envíos por Andreani a todo el país</span >
                    </div>

    {/* Header Principal */ }
    <header className="sticky top-0 z-40 bg-white/95 backdrop-blur-md border-b border-slate-200 shadow-xs" >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8" >
            <div className="flex items-center justify-between h-16 gap-3" >

                {/* Logo 3LD */ }
                < div
    onClick = {() => { setSelectedCategory('all'); setSelectedSubcategory('all'); setSearchQuery(''); }
}
className = "flex items-center gap-2.5 cursor-pointer group"
    >
    <div className="w-10 h-10 rounded-2xl bg-slate-900 flex items-center justify-center text-cyan-400 font-black text-xl shadow-md border border-slate-800 transition group-hover:scale-105" >
        3L < span className = "text-cyan-400" > D </span>
            </div>
            < div className = "flex flex-col" >
                <span className="font-extrabold text-lg tracking-tight leading-tight text-slate-900" > 3LD.COM.AR </span>
                    < span className = "text-[10px] font-semibold text-cyan-700 tracking-wider uppercase" > Taller de Impresión 3D </span>
                        </div>
                        </div>

{/* Buscador Rápido Desktop */ }
<div className="hidden md:flex flex-1 max-w-md mx-6 relative" >
    <input 
                type="text"
value = { searchQuery }
onChange = {(e) => setSearchQuery(e.target.value)}
placeholder = "Buscar entre +1.000 modelos (ej: Nerf, Sello, Galletitas)..."
className = "w-full pl-10 pr-10 py-2 bg-slate-100/90 border border-slate-200 rounded-full text-xs focus:outline-none focus:ring-2 focus:ring-cyan-500 focus:bg-white transition"
    />
    <Search className="w-4 h-4 absolute left-3.5 top-2.5 text-slate-400" />
        { searchQuery && (
            <button onClick={ () => setSearchQuery('') } className = "absolute right-3 top-2.5 text-slate-400 hover:text-slate-600" >
                <X className="w-4 h-4" />
                    </button>
              )}
</div>

{/* Acciones Rápidas */ }
<div className="flex items-center gap-2" >
    <button 
                onClick={ () => setIsQuoteModalOpen(true) }
className = "hidden sm:flex items-center gap-1.5 px-3 py-2 text-xs font-bold bg-cyan-50 text-cyan-800 border border-cyan-200 rounded-full hover:bg-cyan-100 transition active:scale-95"
    >
    <Layers className="w-4 h-4 text-cyan-600" />
        <span>Cotizar STL </span>
            </button>

{/* Botón de Carga Rápida (Admin) */ }
<button 
                onClick={ () => setIsAdminModalOpen(true) }
title = "Carga rápida de artículos"
className = "p-2 text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-full transition active:scale-95 border border-slate-200 sm:border-0"
    >
    <Plus className="w-5 h-5" />
        </button>

{/* Botón Carrito */ }
<button 
                onClick={ () => setIsCartOpen(true) }
className = "relative p-2.5 bg-slate-900 text-white rounded-2xl hover:bg-slate-800 transition shadow-sm active:scale-95 flex items-center justify-center"
    >
    <ShoppingCart className="w-5 h-5" />
        { cartItemsCount > 0 && (
            <span className="absolute -top-1 -right-1 bg-cyan-500 text-white text-[11px] font-black w-5 h-5 rounded-full flex items-center justify-center shadow" >
                { cartItemsCount }
                </span>
                )}
</button>
    </div>
    </div>

{/* Buscador Móvil Visible */ }
<div className="pb-3 md:hidden" >
    <div className="relative" >
        <input 
                type="text"
value = { searchQuery }
onChange = {(e) => setSearchQuery(e.target.value)}
placeholder = "¿Qué estás buscando? (ej: cortantes, dummy...)"
className = "w-full pl-10 pr-8 py-2.5 bg-slate-100 border border-slate-200 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-cyan-500 focus:bg-white transition"
    />
    <Search className="w-4 h-4 absolute left-3.5 top-3 text-slate-400" />
        { searchQuery && (
            <button onClick={ () => setSearchQuery('') } className = "absolute right-3 top-3 text-slate-400" >
                <X className="w-4 h-4" />
                    </button>
              )}
</div>
    </div>
    </div>
    </header>

{ }
<section className="bg-white border-b border-slate-200 sticky top-16 z-30 shadow-2xs" >
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8" >
        <div className="flex items-center gap-2 py-2.5 overflow-x-auto no-scrollbar scroll-smooth" >
        {
            INITIAL_CATEGORIES.map(cat => {
                const active = selectedCategory === cat.id;
                return (
                    <button
                  key= { cat.id }
                onClick = {() => {
                    setSelectedCategory(cat.id);
                    setSelectedSubcategory('all');
                }
            }
                  className = {`flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-xs font-bold whitespace-nowrap transition active:scale-95 ${active
                        ? 'bg-slate-900 text-white shadow-sm ring-2 ring-slate-900 ring-offset-1'
                        : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                    }`}
            >
            <span>{ cat.icon } </span>
            < span > { cat.name } </span>
            </button>
              );
            })}
</div>
    </div>
    </section>

{/* Subcategorías Contextuales */ }
{
    currentCategoryData.subcategories.length > 0 && (
        <div className="bg-slate-100/90 border-b border-slate-200 py-2 px-4" >
            <div className="max-w-7xl mx-auto flex items-center gap-2 overflow-x-auto no-scrollbar" >
            {
                currentCategoryData.subcategories.map(sub => {
                    const active = (selectedSubcategory === sub || (selectedSubcategory === 'all' && sub === 'Todos'));
                    return (
                        <button
                  key= { sub }
                    onClick = {() => setSelectedSubcategory(sub === 'Todos' ? 'all' : sub)
                }
                  className = {`px-3 py-1 rounded-lg text-xs font-semibold whitespace-nowrap transition active:scale-95 ${active
                            ? 'bg-cyan-600 text-white shadow-xs'
                            : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-50'
                        }`}
                >
                { sub }
                </button>
              );
})}
</div>
    </div>
      )}

{ }
<main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 flex-1 w-full" >

    {/* Barra de Filtros, Orden y Cantidad */ }
    < div className = "flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-6 pb-2 border-b border-slate-200" >
        <div className="flex items-center gap-2.5" >
            <h1 className="text-xl font-black text-slate-900 tracking-tight" >
                { currentCategoryData.name }
                </h1>
                < span className = "bg-slate-200 text-slate-700 text-xs font-bold px-2.5 py-0.5 rounded-full" >
                    { filteredProducts.length } artículo{ filteredProducts.length === 1 ? '' : 's' }
</span>
    </div>

    < div className = "flex items-center gap-2 flex-wrap text-xs" >
        <div className="flex items-center bg-white border border-slate-200 rounded-xl p-1 shadow-2xs" >
            <button 
                onClick={ () => setStockFilter('all') }
className = {`px-2.5 py-1 rounded-lg font-bold transition ${stockFilter === 'all' ? 'bg-slate-900 text-white' : 'text-slate-600 hover:text-slate-900'}`}
              >
    Todos
    </button>
    < button
onClick = {() => setStockFilter('ready')}
className = {`px-2.5 py-1 rounded-lg font-bold transition ${stockFilter === 'ready' ? 'bg-slate-900 text-white' : 'text-slate-600 hover:text-slate-900'}`}
              >
                ⚡ En Stock
    </button>
    < button
onClick = {() => setStockFilter('custom')}
className = {`px-2.5 py-1 rounded-lg font-bold transition ${stockFilter === 'custom' ? 'bg-slate-900 text-white' : 'text-slate-600 hover:text-slate-900'}`}
              >
                🛠️ A Pedido
    </button>
    </div>

    < select
value = { sortOption }
onChange = {(e) => setSortOption(e.target.value)}
className = "bg-white border border-slate-200 text-slate-700 text-xs font-semibold rounded-xl px-2.5 py-2 focus:ring-2 focus:ring-cyan-500 focus:outline-none"
    >
    <option value="featured" > Destacados </option>
        < option value = "price-asc" > Precio: Menor a Mayor </option>
            < option value = "price-desc" > Precio: Mayor a Menor </option>
                < option value = "name-asc" > Nombre: A - Z </option>
                    </select>
                    </div>
                    </div>

{/* Cuadrícula de Productos */ }
{
    filteredProducts.length === 0 ? (
        <div className= "text-center py-16 px-4 bg-white rounded-3xl border border-slate-200" >
        <Package className="w-12 h-12 text-slate-300 mx-auto mb-3" />
            <h3 className="text-base font-bold text-slate-800" > No encontramos productos con este criterio </h3>
                < p className = "text-xs text-slate-500 mt-1 max-w-sm mx-auto" >
                    Podemos modelar y fabricar cualquier pieza o cortante a pedido en nuestro taller.
            </p>
                        < button
    onClick = {() => setIsQuoteModalOpen(true)
}
className = "mt-4 px-4 py-2 bg-slate-900 text-white text-xs font-bold rounded-xl hover:bg-slate-800 transition"
    >
    Consultar por pieza personalizada
        </button>
        </div>
        ) : (
    <div className= "grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3 sm:gap-5" >
    {
        filteredProducts.map(p => (
            <div 
                key= { p.id }
                className = "bg-white rounded-2xl border border-slate-200/90 overflow-hidden shadow-2xs hover:shadow-md transition duration-200 flex flex-col group"
            >
            {/* Imagen del producto */ }
            < div 
                  onClick = {() => setActiveProductModal(p)}
className = "relative aspect-square w-full bg-slate-100 overflow-hidden cursor-pointer"
    >
    <img 
                    src={ p.image }
alt = { p.title }
loading = "lazy"
className = "w-full h-full object-cover group-hover:scale-105 transition duration-300"
    />
    <div className="absolute top-2 left-2 flex flex-col gap-1" >
        {
            p.stockStatus === 'ready' ? (
                <span className= "bg-emerald-500/90 backdrop-blur-xs text-white text-[10px] font-bold px-2 py-0.5 rounded-md flex items-center gap-1 shadow-xs" >
                        ⚡ Stock
                </ span >
                    ) : (
    <span className= "bg-amber-500/90 backdrop-blur-xs text-white text-[10px] font-bold px-2 py-0.5 rounded-md flex items-center gap-1 shadow-xs" >
                        🛠️ 48hs
    </span>
                    )}
{
    p.oldPrice && (
        <span className="bg-rose-500 text-white text-[10px] font-bold px-1.5 py-0.5 rounded-md shadow-xs" >
            OFERTA
            </span>
                    )
}
</div>
    </div>

{/* Info Card */ }
<div className="p-3.5 flex flex-col flex-1" >
    <div className="text-[10px] font-semibold text-slate-400 mb-1 flex items-center justify-between" >
        <span className="uppercase" > { p.subcategory || p.category } </span>
            < span > PLA 3D </span>
                </div>

                < h3
onClick = {() => setActiveProductModal(p)}
className = "font-bold text-slate-900 text-xs sm:text-sm leading-snug line-clamp-2 cursor-pointer hover:text-cyan-700 transition mb-2"
    >
    { p.title }
    </h3>

    < div className = "mt-auto pt-2 flex items-baseline justify-between border-t border-slate-100" >
        <div>
        <span className="text-base font-black text-slate-900" >
            ${ p.price.toLocaleString('es-AR') }
</span>
{
    p.oldPrice && (
        <span className="block text-[10px] text-slate-400 line-through" >
            ${ p.oldPrice.toLocaleString('es-AR') }
    </span>
                      )
}
</div>

    < button
onClick = {() => addToCart(p, 1, 'Negro Mate')}
title = "Agregar al carrito"
className = "p-2 bg-slate-900 text-white rounded-xl hover:bg-cyan-600 transition active:scale-90 flex items-center justify-center"
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

{ }
{
    isCartOpen && (
        <div className="fixed inset-0 z-50 bg-slate-950/60 backdrop-blur-xs flex justify-end" >
            <div className="w-full max-w-md bg-white h-full shadow-2xl flex flex-col animate-in slide-in-from-right duration-200" >

                {/* Header Carrito */ }
                < div className = "p-4 border-b border-slate-200 flex items-center justify-between bg-slate-50" >
                    <div className="flex items-center gap-2" >
                        <ShoppingCart className="w-5 h-5 text-slate-900" />
                            <h2 className="font-extrabold text-slate-900" > Tu Pedido 3LD({ cartItemsCount }) </h2>
                                </div>
                                < button onClick = {() => setIsCartOpen(false)
} className = "p-1 text-slate-400 hover:text-slate-700 rounded-lg" >
    <X className="w-5 h-5" />
        </button>
        </div>

{/* Barra de Envío Gratis */ }
<div className="p-3 bg-cyan-50 border-b border-cyan-100 text-xs text-cyan-950" >
    <div className="flex justify-between font-bold mb-1" >
        <span>Envío gratis en La Costa($30.000) </span>
            < span > { Math.min(100, Math.round((cartSubtotal / freeShippingThreshold) * 100)) } % </span>
            </div>
            < div className = "w-full bg-cyan-200 rounded-full h-1.5 overflow-hidden" >
                <div 
                  className="bg-cyan-600 h-1.5 rounded-full transition-all duration-300"
style = {{ width: `${Math.min(100, Math.round((cartSubtotal / freeShippingThreshold) * 100))}%` }}
                />
    </div>
{
    isFreeLocalShipping ? (
        <p className= "text-[11px] text-emerald-700 font-bold mt-1" >🎉 ¡Tenés Envío Gratis en el Partido de La Costa! </p>
              ) : (
        <p className= "text-[11px] text-slate-600 mt-1" >
        Sumá ${ (freeShippingThreshold - cartSubtotal).toLocaleString('es-AR') } más para envío sin cargo.
                </p>
              )
}
</div>

{/* Lista de Productos en Carrito */ }
<div className="flex-1 overflow-y-auto p-4 space-y-3" >
    {
        cart.length === 0 ? (
            <div className= "text-center py-16 text-slate-400" >
            <ShoppingCart className="w-12 h-12 mx-auto mb-2 opacity-40" />
                < p className="font-bold text-slate-700 text-sm" > Tu carrito está vacío</ p >
    <p className="text-xs text-slate-500" > Agregá tus modelos favoritos para pedir.</p>
        </div>
              ) : (
    cart.map(item => (
        <div key= {`${item.id}-${item.color}`} className = "flex items-center gap-3 p-2.5 bg-slate-50 border border-slate-200/80 rounded-2xl" >
        <img src={ item.image } alt = { item.title } className = "w-14 h-14 rounded-xl object-cover bg-white shrink-0" />
        <div className="flex-1 min-w-0" >
    <h4 className="font-bold text-xs text-slate-900 truncate" > { item.title } </h4>
    < span className = "text-[10px] text-cyan-700 font-semibold block" > Color: { item.color } </span>
    < span className = "text-xs font-black text-slate-900" > ${(item.price * item.qty).toLocaleString('es-AR')}</span>
    </div>
    < div className = "flex items-center border border-slate-200 rounded-xl bg-white p-0.5" >
    <button onClick={() => updateCartQty(item.id, item.color, -1)} className = "w-6 h-6 flex items-center justify-center text-slate-600 font-bold hover:bg-slate-100 rounded-lg" > -</button>
    < span className = "w-6 text-center text-xs font-bold text-slate-900" > { item.qty } </span>
    < button onClick = {() => updateCartQty(item.id, item.color, 1)} className = "w-6 h-6 flex items-center justify-center text-slate-600 font-bold hover:bg-slate-100 rounded-lg" > +</button>
    </div>
    < button onClick = {() => removeCartItem(item.id, item.color)} className = "text-slate-300 hover:text-rose-500 p-1" >
    <Trash2 className="w-4 h-4" />
    </button>
    </div>
    ))
              )}

{/* Módulo de Cotización de Envíos Andreani */ }
{
    cart.length > 0 && (
        <div className="p-3.5 bg-slate-100 rounded-2xl border border-slate-200 mt-4 space-y-2" >
            <div className="flex items-center justify-between text-xs font-bold text-slate-800" >
                <span className="flex items-center gap-1.5" >
                    <Truck className="w-4 h-4 text-cyan-600" />
                        Calcular Envío(Andreani / La Costa)
                            </span>
                            < span className = "text-[10px] text-slate-500 font-normal" > {(cartTotalWeightGrams / 1000).toFixed(2)
} kg </span>
    </div>

    < form onSubmit = { handleCalculateShipping } className = "flex gap-2" >
        <input 
                      type="text"
placeholder = "Tu Código Postal (ej: 7111)"
value = { postalCode }
onChange = {(e) => setPostalCode(e.target.value)}
className = "flex-1 px-3 py-1.5 bg-white border border-slate-300 rounded-xl text-xs focus:ring-2 focus:ring-cyan-500 focus:outline-none"
    />
    <button 
                      type="submit"
disabled = { isCalculatingShipping }
className = "px-3 py-1.5 bg-slate-900 text-white rounded-xl text-xs font-bold hover:bg-slate-800 transition disabled:opacity-50"
    >
    { isCalculatingShipping? '...': 'Cotizar' }
    </button>
    </form>

{
    shippingQuote && (
        <div className="bg-white p-2.5 rounded-xl border border-slate-200 text-xs flex items-center justify-between mt-2" >
            <div>
            <div className="font-bold text-slate-800" > { shippingQuote.serviceName } </div>
                < div className = "text-[10px] text-slate-500" > Demora: { shippingQuote.estimatedDays } </div>
                    </div>
                    < div className = "font-black text-cyan-700" >
                        { shippingQuote.price === 0 ? 'GRATIS' : `$${shippingQuote.price.toLocaleString('es-AR')}` }
                        </div>
                        </div>
                  )
}
</div>
              )}
</div>

{/* Footer Carrito con Selector de Pago */ }
{
    cart.length > 0 && (
        <div className="p-4 border-t border-slate-200 bg-slate-50 space-y-3" >
            <div className="space-y-1 text-xs text-slate-600" >
                <div className="flex justify-between" >
                    <span>Subtotal productos: </span>
                        < span className = "font-bold text-slate-900" > ${ cartSubtotal.toLocaleString('es-AR') } </span>
                            </div>
                            < div className = "flex justify-between" >
                                <span>Costo de envío: </span>
                                    < span className = "font-semibold text-slate-800" >
                                    {
                                        shippingQuote
                                            ?(shippingQuote.price === 0 ? '¡Gratis!' : `$${shippingQuote.price.toLocaleString('es-AR')}`) 
                        : 'A calcular'}
                                        </span>
                                        </div>
                                        < div className = "flex justify-between text-base font-black text-slate-900 pt-1 border-t border-slate-200" >
                                            <span>Total final: </span>
                                                < span className = "text-cyan-700" >
                                                    ${ (cartSubtotal + (shippingQuote?.price || 0)).toLocaleString('es-AR') }
    </span>
        </div>
        </div>

    {/* Selector de Método de Pago */ }
    <div className="grid grid-cols-2 gap-2 bg-slate-200/70 p-1 rounded-xl text-xs font-bold" >
        <button
                    onClick={ () => setCheckoutMode('whatsapp') }
    className = {`py-2 rounded-lg flex items-center justify-center gap-1.5 transition ${checkoutMode === 'whatsapp' ? 'bg-emerald-600 text-white shadow-xs' : 'text-slate-700 hover:bg-slate-200'
        }`
}
                  >
    <MessageCircle className="w-4 h-4" />
        <span>WhatsApp </span>
        </button>
        < button
onClick = {() => setCheckoutMode('mercadopago')}
className = {`py-2 rounded-lg flex items-center justify-center gap-1.5 transition ${checkoutMode === 'mercadopago' ? 'bg-[#009ee3] text-white shadow-xs' : 'text-slate-700 hover:bg-slate-200'
    }`}
                  >
    <CreditCard className="w-4 h-4" />
        <span>Mercado Pago </span>
            </button>
            </div>

{/* Botón de Acción Principal */ }
{
    checkoutMode === 'whatsapp' ? (
        <button 
                    onClick= { handleWhatsAppCheckout }
                    className = "w-full py-3.5 bg-emerald-600 hover:bg-emerald-500 text-white font-black text-sm rounded-2xl shadow-lg transition active:scale-95 flex items-center justify-center gap-2"
        >
        <MessageCircle className="w-5 h-5" />
            <span>Confirmar por WhatsApp </span>
                </button>
                ) : (
        <button 
                    onClick= { handleMercadoPagoCheckout }
    disabled = { isProcessingMp }
    className = "w-full py-3.5 bg-[#009ee3] hover:bg-[#0089c7] text-white font-black text-sm rounded-2xl shadow-lg transition active:scale-95 flex items-center justify-center gap-2 disabled:opacity-50"
        >
        <CreditCard className="w-5 h-5" />
            <span>{ isProcessingMp? 'Generando orden segura...': 'Pagar con Mercado Pago' } </span>
            </button>
                )
}

<div className="flex items-center justify-center gap-2 text-[10px] text-slate-400 text-center" >
    <ShieldCheck className="w-3.5 h-3.5 text-emerald-500" />
        <span>Atención directa desde nuestro taller en San Bernardo </span>
            </div>
            </div>
            )}

</div>
    </div>
      )}

{ }
{
    activeProductModal && (
        <div className="fixed inset-0 z-50 bg-slate-950/60 backdrop-blur-xs flex items-end sm:items-center justify-center p-0 sm:p-4" >
            <div className="bg-white w-full sm:max-w-lg max-h-[92vh] sm:rounded-3xl rounded-t-3xl overflow-hidden shadow-2xl flex flex-col animate-in fade-in duration-200" >

                <div className="relative bg-slate-100 h-64 sm:h-72 w-full overflow-hidden shrink-0" >
                    <img src={ activeProductModal.image } alt = { activeProductModal.title } className = "w-full h-full object-cover" />
                        <button 
                onClick={ () => setActiveProductModal(null) }
    className = "absolute top-4 right-4 bg-white/90 hover:bg-white text-slate-800 p-2 rounded-full shadow-md transition"
        >
        <X className="w-5 h-5" />
            </button>
            </div>

            < div className = "p-5 overflow-y-auto space-y-4" >
                <div>
                <span className="text-xs font-bold text-cyan-600 uppercase tracking-wider" >
                    { activeProductModal.category } • { activeProductModal.subcategory }
    </span>
        < h2 className = "text-xl font-black text-slate-900 mt-1" > { activeProductModal.title } </h2>
            < div className = "flex items-baseline gap-2 mt-2" >
                <span className="text-2xl font-black text-slate-900" >
                    ${ activeProductModal.price.toLocaleString('es-AR') }
    </span>
    {
        activeProductModal.oldPrice && (
            <span className="text-sm text-slate-400 line-through" >
                ${ activeProductModal.oldPrice.toLocaleString('es-AR') }
        </span>
                  )
    }
    </div>
        </div>

        < p className = "text-xs text-slate-600 leading-relaxed" >
            { activeProductModal.description }
            </p>

    {/* Selector de Color */ }
    <div>
        <label className="block text-xs font-bold text-slate-800 mb-2" >
            Color del Filamento PLA:
    </label>
        < div className = "flex flex-wrap gap-2" >
        {
            AVAILABLE_COLORS.map(c => (
                <button
                      key= { c.name }
                      onClick = {() => setModalSelectedColor(c.name)}
    className = {`flex items-center gap-1.5 px-3 py-1.5 rounded-xl border text-xs font-semibold transition ${modalSelectedColor === c.name
            ? 'border-cyan-600 bg-cyan-50 font-bold text-cyan-900'
            : 'border-slate-200 text-slate-700 hover:bg-slate-50'
        }`
}
                    >
    <span className="w-3 h-3 rounded-full border border-slate-300" style = {{ backgroundColor: c.hex }} />
        < span > { c.name } </span>
        </button>
                  ))}
</div>
    </div>

{/* Especificaciones Técnicas */ }
<div className="bg-slate-50 border border-slate-200 rounded-xl p-3 grid grid-cols-2 gap-2 text-xs text-slate-600" >
    <div>🌱 <strong>Material: </strong> PLA Grado Alimenticio</div >
        <div>📏 <strong>Medida: </strong> {activeProductModal.size}</div >
            <div>⚖️ <strong>Peso aprox: </strong> {activeProductModal.weightGrams}g</div >
                <div>📍 <strong>Origen: </strong> San Bernardo, La Costa</div >
                    </div>
                    </div>

                    < div className = "p-4 border-t border-slate-200 bg-white" >
                        <button 
                onClick={
    () => {
        addToCart(activeProductModal, 1, modalSelectedColor);
        setActiveProductModal(null);
        setIsCartOpen(true);
    }
}
className = "w-full py-3.5 bg-slate-900 hover:bg-slate-800 text-white font-black text-sm rounded-2xl shadow-lg transition active:scale-95 flex items-center justify-center gap-2"
    >
    <ShoppingCart className="w-5 h-5 text-cyan-400" />
        <span>Agregar al Carrito(${ activeProductModal.price.toLocaleString('es-AR') }) </span>
            </button>
            </div>

            </div>
            </div>
      )}

{ }
{
    isQuoteModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-950/60 backdrop-blur-xs flex items-center justify-center p-4" >
            <div className="bg-white rounded-3xl max-w-lg w-full p-6 shadow-2xl space-y-4 relative animate-in fade-in duration-200" >
                <button onClick={ () => setIsQuoteModalOpen(false) } className = "absolute top-4 right-4 text-slate-400 hover:text-slate-700" >
                    <X className="w-5 h-5" />
                        </button>

                        < div className = "flex items-center gap-3" >
                            <div className="w-10 h-10 rounded-2xl bg-cyan-100 text-cyan-700 flex items-center justify-center font-bold" >
                                <Layers className="w-5 h-5" />
                                    </div>
                                    < div >
                                    <h3 className="font-extrabold text-slate-900 text-base" > Cotizador Rápido de Archivo STL </h3>
                                        < p className = "text-xs text-slate-500" >¿Tenés un diseño o idea en mente ? Te lo cotizamos al instante.</p>
                                            </div>
                                            </div>

                                            < form onSubmit = {(e) => {
        e.preventDefault();
        const form = e.target;
        const text = `¡Hola 3LD! 👋 Quiero cotizar una impresión 3D a medida:\n\n` +
            `• *Proyecto:* ${form.idea.value}\n` +
            `• *Cantidad:* ${form.qty.value}\n` +
            `• *Material / Color:* ${form.color.value}\n` +
            `• *Detalles / Link:* ${form.notes.value}\n\n¿Podrán decirme costo y tiempo estimado? ¡Gracias!`;
        window.open(`https://wa.me/5492257559540?text=${encodeURIComponent(text)}`, '_blank');
        setIsQuoteModalOpen(false);
    }
} className = "space-y-3 text-xs" >
    <div>
    <label className="block font-bold text-slate-700 mb-1" >¿Qué querés fabricar ? </label>
        < input required name = "idea" placeholder = "Ej: Llaveros con logo, repuesto para electrodoméstico..." className = "w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:ring-2 focus:ring-cyan-500 focus:outline-none" />
            </div>

            < div className = "grid grid-cols-2 gap-2" >
                <div>
                <label className="block font-bold text-slate-700 mb-1" > Cantidad estimada </label>
                    < input type = "number" defaultValue = "1" min = "1" name = "qty" className = "w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:outline-none" />
                        </div>
                        < div >
                        <label className="block font-bold text-slate-700 mb-1" > Color preferido </label>
                            < select name = "color" className = "w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:outline-none" >
                                <option>Negro Mate </option>
                                    < option > Blanco Puro </option>
                                        < option > Azul Cyan 3LD </option>
                                            < option > Rojo / Colores Varios </option>
                                                </select>
                                                </div>
                                                </div>

                                                < div >
                                                <label className="block font-bold text-slate-700 mb-1" > Detalles, medidas o enlace de Thingiverse / Printables </label>
                                                    < textarea name = "notes" rows = "2" placeholder = "Medidas aproximadas en cm o si tenés el archivo .stl..." className = "w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:ring-2 focus:ring-cyan-500 focus:outline-none" > </textarea>
                                                        </div>

                                                        < button type = "submit" className = "w-full py-3 bg-cyan-600 hover:bg-cyan-500 text-white font-black rounded-xl shadow-md transition flex items-center justify-center gap-2" >
                                                            <MessageCircle className="w-4 h-4" />
                                                                <span>Enviar Consulta por WhatsApp </span>
                                                                    </button>
                                                                    </form>
                                                                    </div>
                                                                    </div>
      )}

{ }
{
    isAdminModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-950/60 backdrop-blur-xs flex items-center justify-center p-4" >
            <div className="bg-white rounded-3xl max-w-lg w-full p-6 shadow-2xl space-y-4 max-h-[90vh] overflow-y-auto relative animate-in fade-in duration-200" >
                <button onClick={ () => setIsAdminModalOpen(false) } className = "absolute top-4 right-4 text-slate-400 hover:text-slate-700" >
                    <X className="w-5 h-5" />
                        </button>

                        < div className = "flex items-center gap-2.5" >
                            <div className="p-2 bg-cyan-100 text-cyan-800 rounded-xl font-bold" >
                                <Zap className="w-5 h-5" />
                                    </div>
                                    < div >
                                    <h3 className="font-extrabold text-slate-900 text-base" > Carga Rápida de Artículo </h3>
                                        < p className = "text-xs text-slate-500" > Agregá un producto al catálogo en menos de 20 segundos </p>
                                            </div>
                                            </div>

                                            < form onSubmit = { handleCreateProduct } className = "space-y-3 text-xs" >
                                                <div>
                                                <label className="block font-bold text-slate-700 mb-1" > Título del Producto * </label>
                                                    < input required name = "title" placeholder = "Ej: Cortante Harry Potter Reliquias" className = "w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs focus:ring-2 focus:ring-cyan-500 focus:outline-none" />
                                                        </div>

                                                        < div className = "grid grid-cols-2 gap-2" >
                                                            <div>
                                                            <label className="block font-bold text-slate-700 mb-1" > Categoría * </label>
                                                                < select name = "category" className = "w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs" >
                                                                    <option value="cortantes" > Cortantes & Repostería </option>
                                                                        < option value = "ceramica" > Herramientas Cerámica </option>
                                                                            < option value = "didacticos" > Didácticos Montessori </option>
                                                                                < option value = "moldes" > Moldes & Macetas </option>
                                                                                    < option value = "figuras" > Figuras & Dummy 13 </option>
                                                                                        < option value = "personalizados" > Llaveros & Logos </option>
                                                                                            </select>
                                                                                            </div>
                                                                                            < div >
                                                                                            <label className="block font-bold text-slate-700 mb-1" > Subcategoría </label>
                                                                                                < input name = "subcategory" placeholder = "Ej: Galletitas, Pokémon..." className = "w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs" />
                                                                                                    </div>
                                                                                                    </div>

                                                                                                    < div className = "grid grid-cols-2 gap-2" >
                                                                                                        <div>
                                                                                                        <label className="block font-bold text-slate-700 mb-1" > Precio($ ARS) * </label>
                                                                                                            < input required type = "number" step = "100" name = "price" placeholder = "4500" className = "w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs" />
                                                                                                                </div>
                                                                                                                < div >
                                                                                                                <label className="block font-bold text-slate-700 mb-1" > Precio Anterior / Oferta </label>
                                                                                                                    < input type = "number" step = "100" name = "oldPrice" placeholder = "Opcional" className = "w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs" />
                                                                                                                        </div>
                                                                                                                        </div>

                                                                                                                        < div className = "grid grid-cols-2 gap-2" >
                                                                                                                            <div>
                                                                                                                            <label className="block font-bold text-slate-700 mb-1" > Disponibilidad </label>
                                                                                                                                < select name = "stockStatus" className = "w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs" >
                                                                                                                                    <option value="ready" >⚡ En Stock(Despacho 24hs) </option>
                                                                                                                                        < option value = "custom" >🛠️ A Pedido(48 - 72hs) </option>
                                                                                                                                            </select>
                                                                                                                                            </div>
                                                                                                                                            < div >
                                                                                                                                            <label className="block font-bold text-slate-700 mb-1" > Peso en gramos(para Andreani) </label>
                                                                                                                                                < input type = "number" defaultValue = "60" name = "weightGrams" className = "w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs" />
                                                                                                                                                    </div>
                                                                                                                                                    </div>

                                                                                                                                                    < div >
                                                                                                                                                    <label className="block font-bold text-slate-700 mb-1" > Medidas o Tamaño </label>
                                                                                                                                                        < input name = "size" placeholder = "Ej: 8 x 8 cm" className = "w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs" />
                                                                                                                                                            </div>

                                                                                                                                                            < div >
                                                                                                                                                            <label className="block font-bold text-slate-700 mb-1" > URL de Imagen </label>
                                                                                                                                                                < input name = "image" type = "url" placeholder = "https://ejemplo.com/foto.jpg" className = "w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs" />
                                                                                                                                                                    </div>

                                                                                                                                                                    < div >
                                                                                                                                                                    <label className="block font-bold text-slate-700 mb-1" > Descripción Breve </label>
                                                                                                                                                                        < textarea name = "description" rows = "2" placeholder = "Detalles de diseño, filo y recomendaciones..." className = "w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs" > </textarea>
                                                                                                                                                                            </div>

                                                                                                                                                                            < div className = "flex gap-2 pt-2" >
                                                                                                                                                                                <button type="submit" className = "flex-1 py-2.5 bg-slate-900 hover:bg-slate-800 text-white font-bold rounded-xl text-xs transition" >
                                                                                                                                                                                    + Publicar en el Catálogo
                                                                                                                                                                                        </button>
                                                                                                                                                                                        < button
    type = "button"
    onClick = {() => {
        const blob = new Blob([JSON.stringify(products, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'catalogo_3ld.json';
        a.click();
    }
}
className = "px-3 py-2.5 border border-slate-300 text-slate-700 font-semibold rounded-xl text-xs hover:bg-slate-100"
    >
    Exportar JSON
        </button>
        </div>
        </form>
        </div>
        </div>
      )}

{ }
<nav className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-white/95 backdrop-blur-md border-t border-slate-200 px-6 py-2 flex items-center justify-between shadow-lg" >
    <button 
          onClick={ () => { setSelectedCategory('all'); setSelectedSubcategory('all'); setSearchQuery(''); window.scrollTo({ top: 0, behavior: 'smooth' }); } }
className = "flex flex-col items-center text-slate-700 hover:text-cyan-600 active:scale-95"
    >
    <Sparkles className="w-5 h-5" />
        <span className="text-[10px] font-semibold mt-0.5" > Inicio </span>
            </button>
            < button
onClick = {() => {
    const input = document.querySelector('input[type="text"]');
    input?.focus();
    window.scrollTo({ top: 0, behavior: 'smooth' });
}}
className = "flex flex-col items-center text-slate-700 hover:text-cyan-600 active:scale-95"
    >
    <Search className="w-5 h-5" />
        <span className="text-[10px] font-semibold mt-0.5" > Buscar </span>
            </button>
            < button
onClick = {() => setIsQuoteModalOpen(true)}
className = "flex flex-col items-center text-cyan-600 active:scale-95 font-bold"
    >
    <Layers className="w-5 h-5" />
        <span className="text-[10px] font-bold mt-0.5" > A Medida </span>
            </button>
            < button
onClick = {() => setIsCartOpen(true)}
className = "flex flex-col items-center text-slate-700 hover:text-cyan-600 relative active:scale-95"
    >
    <ShoppingCart className="w-5 h-5" />
        { cartItemsCount > 0 && (
            <span className="absolute -top-1 -right-2 bg-cyan-500 text-white text-[10px] font-black w-4 h-4 rounded-full flex items-center justify-center" >
                { cartItemsCount }
                </span>
          )}
<span className="text-[10px] font-semibold mt-0.5" > Carrito </span>
    </button>
    </nav>

{ }
<Toast message={ toastMessage?.text } type = { toastMessage?.type } onClose = {() => setToastMessage(null)} />
    </div>
  );
}