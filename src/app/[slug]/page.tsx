'use client';

import { useState, useEffect, useMemo, useRef, use, Suspense } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import {
  Search, Star, Clock, Bike, CalendarDays, ChevronLeft, ChevronRight,
  BellRing, ReceiptText, AlertTriangle, ShoppingBag, Utensils
} from 'lucide-react';
import { Navbar } from '@/components/Navbar';
import { ProductCard } from '@/components/ProductCard';
import { ProductDetailModal } from '@/components/ProductDetailModal';
import { CartSheet } from '@/components/CartSheet';
import { QuickCallModal } from '@/components/QuickCallModal';
import { Toast } from '@/components/Toast';
import { Merchant, Category, Product, Table, Review } from '@/lib/types';
import { formatPrice } from '@/lib/formatters';
import { useCartStore } from '@/lib/cart-store';

interface PageProps {
  params: Promise<{ slug: string }>;
}

export default function MerchantMenuPage({ params }: PageProps) {
  return (
    <Suspense fallback={<div className="min-h-screen bg-background flex items-center justify-center text-text-secondary">Cargando carta...</div>}>
      <MerchantMenuContent params={params} />
    </Suspense>
  );
}

function MerchantMenuContent({ params }: PageProps) {
  const { slug } = use(params);
  const searchParams = useSearchParams();
  const mesaToken = searchParams.get('mesa');

  const [merchant, setMerchant] = useState<Merchant | null>(null);
  const [isOpen, setIsOpen] = useState(true);
  const [categories, setCategories] = useState<Category[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [tables, setTables] = useState<Table[]>([]);
  const [reviews, setReviews] = useState<Review[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [activeCategory, setActiveCategory] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [isCartOpen, setIsCartOpen] = useState(false);
  const [callModal, setCallModal] = useState<'waiter' | 'bill' | null>(null);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const storeTableId = useCartStore((s) => s.tableId);
  const storeTableLabel = useCartStore((s) => s.tableLabel);
  const storeTableToken = useCartStore((s) => s.tableToken);
  const activeOrders = useCartStore((s) => s.activeOrders);
  const clearTable = useCartStore((s) => s.clearTable);
  const setMerchantCart = useCartStore((s) => s.setMerchant);
  const setTableCart = useCartStore((s) => s.setTable);
  const cartItemCount = useCartStore((s) => s.getItemCount());
  const cartTotal = useCartStore((s) => s.getTotalCents());

  // Mesa activa: prioriza el QR escaneado en la URL y, si no está en la URL, restaura la mesa persistente de la sesión
  const activeTable = useMemo(() => {
    if (tables.length === 0) return null;
    if (mesaToken) {
      const match = tables.find((t) => t.qr_token === mesaToken);
      if (match) return match;
    }
    if (storeTableToken) {
      const match = tables.find((t) => t.qr_token === storeTableToken);
      if (match) return match;
    }
    if (storeTableId) {
      const match = tables.find((t) => t.id === storeTableId);
      if (match) return match;
    }
    if (storeTableLabel) {
      const match = tables.find((t) => t.label === storeTableLabel);
      if (match) return match;
    }
    return null;
  }, [mesaToken, tables, storeTableToken, storeTableId, storeTableLabel]);

  const categoryScrollRef = useRef<HTMLDivElement>(null);

  // Cargar datos del comercio
  useEffect(() => {
    setLoading(true);
    fetch(`/api/merchants/${slug}`)
      .then((res) => {
        if (!res.ok) throw new Error('Comercio no encontrado');
        return res.json();
      })
      .then((data) => {
        setMerchant(data.merchant);
        setIsOpen(data.isOpen ?? true);
        setCategories(data.categories || []);
        setProducts(data.products || []);
        setTables(data.tables || []);
        setReviews(data.reviews || []);
        setMerchantCart(slug, data.merchant.delivery_fee_cents || 0);
      })
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, [slug, setMerchantCart]);

  // Si detectó mesa activa, garantizar que esté sincronizada en el storage persistente
  useEffect(() => {
    if (activeTable) {
      setTableCart(activeTable.id, activeTable.number, activeTable.label, activeTable.qr_token);
    }
  }, [activeTable, setTableCart]);

  // Filtrado de productos por categoría y buscador interno
  const filteredProducts = useMemo(() => {
    return products.filter((prod) => {
      const matchesCategory = activeCategory === 'all' || prod.category_id === activeCategory;
      const matchesSearch =
        searchQuery === '' ||
        prod.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        prod.description.toLowerCase().includes(searchQuery.toLowerCase());
      return matchesCategory && matchesSearch;
    });
  }, [products, activeCategory, searchQuery]);

  // Scroll horizontal de tabs
  const scrollCategories = (direction: 'left' | 'right') => {
    if (categoryScrollRef.current) {
      const scrollAmount = direction === 'left' ? -200 : 200;
      categoryScrollRef.current.scrollBy({ left: scrollAmount, behavior: 'smooth' });
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center text-text-secondary">
        <div className="w-12 h-12 rounded-2xl bg-surface border border-surface-border flex items-center justify-center animate-pulse mb-3">
          <Utensils className="w-6 h-6 text-brand-blue" />
        </div>
        <p className="text-sm font-semibold">Cargando carta de {slug}...</p>
      </div>
    );
  }

  if (error || !merchant) {
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center text-center p-4">
        <h2 className="text-xl font-bold text-white">No pudimos encontrar este comercio</h2>
        <p className="text-sm text-text-secondary mt-1">{error || 'El link no es válido.'}</p>
        <Link href="/" className="mt-4 px-4 py-2 bg-brand-blue rounded-xl text-white text-xs font-bold">
          Volver al directorio
        </Link>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col bg-background text-text-primary pb-24 sm:pb-8">
      {/* Navbar con botón de carrito, llamar al mozo y pedir cuenta */}
      <Navbar
        merchantSlug={merchant.slug}
        merchantName={merchant.name}
        tableLabel={activeTable?.label}
        onCallWaiter={() => setCallModal('waiter')}
        onRequestBill={() => setCallModal('bill')}
        onOpenCart={() => setIsCartOpen(true)}
      />

      {/* Banner de Local Cerrado si aplica */}
      {!isOpen && (
        <div className="bg-brand-amber/20 border-b border-brand-amber/30 px-4 py-2.5 text-center text-xs font-semibold text-brand-amber flex items-center justify-center gap-2">
          <AlertTriangle className="w-4 h-4" />
          <span>El local se encuentra cerrado en este momento. Podés recorrer la carta pero los pedidos están pausados.</span>
        </div>
      )}

      {/* Barra Persistente de Mesa Activa y Comandas en Marcha */}
      {activeTable && (
        <div className="bg-[#0e172a] border-b border-brand-blue/30 px-3 sm:px-6 py-2.5">
          <div className="max-w-7xl mx-auto flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 text-xs">
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-brand-success animate-pulse flex-shrink-0" />
              <span className="font-extrabold text-white">
                Mesa actual: <span className="text-brand-amber font-black">{activeTable.label}</span>
              </span>
              <span className="text-text-muted text-[11px] hidden sm:inline">
                · Los pedidos que hagas se enviarán directo a esta mesa
              </span>
              <button
                type="button"
                onClick={() => clearTable()}
                className="text-[11px] text-text-muted hover:text-white underline ml-1"
                title="Cambiar o liberar mesa"
              >
                (Cambiar mesa)
              </button>
            </div>

            {activeOrders.length > 0 && (
              <div className="flex items-center gap-2 bg-surface-subtle px-3 py-1.5 rounded-xl border border-surface-border">
                <span className="text-text-secondary text-[11px]">
                  🛎️ {activeOrders.length} {activeOrders.length === 1 ? 'comanda marchando' : 'comandas marchando'} ({activeOrders[0].orderNumber || activeOrders[0].id.slice(-6).toUpperCase()})
                </span>
                <Link
                  href={`/${merchant.slug}/pedido/${activeOrders[0].id}`}
                  className="px-2.5 py-1 rounded-lg bg-brand-blue hover:bg-brand-blue-hover text-white font-bold text-[11px] flex items-center gap-1 transition-colors shadow-sm ml-1"
                >
                  <span>Ver estado en vivo</span>
                  <span>→</span>
                </Link>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Contenedor Principal (Sidebar Desktop + Carta) */}
      <div className="max-w-7xl w-full mx-auto px-3 sm:px-6 py-4 sm:py-6 flex flex-col lg:flex-row gap-6">
        {/* Sidebar en Desktop / Ficha en Mobile */}
        <aside className="w-full lg:w-80 flex-shrink-0 flex flex-col gap-4">
          <div className="bg-surface border border-surface-border rounded-2xl overflow-hidden shadow-sm">
            {/* Foto de portada */}
            <div className="relative w-full aspect-[16/9] bg-surface-subtle">
              <Image
                src={merchant.cover_url}
                alt={merchant.name}
                fill
                className="object-cover"
                priority
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent" />

              {/* Logo circular */}
              <div className="absolute -bottom-3 left-4 w-16 h-16 rounded-2xl overflow-hidden border-2 border-surface bg-surface shadow-md">
                <Image
                  src={merchant.logo_url}
                  alt={merchant.name}
                  fill
                  className="object-cover"
                />
              </div>
            </div>

            {/* Datos del Comercio */}
            <div className="p-4 pt-6 flex flex-col gap-3">
              <div>
                <span className="text-[11px] font-bold text-brand-blue uppercase">
                  {merchant.category}
                </span>
                <h1 className="text-xl font-black text-white">{merchant.name}</h1>
                <p className="mt-1 text-xs text-text-secondary leading-relaxed">
                  {merchant.description}
                </p>
              </div>

              {/* Calificación y Estado */}
              <div className="flex items-center justify-between pt-2 border-t border-surface-border text-xs">
                <div className="flex items-center gap-1 font-bold text-white">
                  <Star className="w-4 h-4 fill-brand-amber text-brand-amber" />
                  <span>{merchant.rating_avg.toFixed(1)}</span>
                  <span className="text-text-muted font-normal">({merchant.rating_count} opiniones)</span>
                </div>

                <div className={`px-2 py-0.5 rounded-full text-[11px] font-bold flex items-center gap-1 ${
                  isOpen ? 'bg-brand-success/15 text-brand-success' : 'bg-brand-danger/15 text-brand-danger'
                }`}>
                  <span className={`w-1.5 h-1.5 rounded-full ${isOpen ? 'bg-brand-success animate-pulse' : 'bg-brand-danger'}`} />
                  {isOpen ? 'Abierto' : 'Cerrado'}
                </div>
              </div>

              {/* Demora y Envío */}
              <div className="flex items-center justify-between text-xs text-text-secondary pt-1">
                <div className="flex items-center gap-1">
                  <Bike className="w-3.5 h-3.5 text-brand-blue" />
                  <span>Envío {formatPrice(merchant.delivery_fee_cents)}</span>
                </div>
                <div className="flex items-center gap-1">
                  <Clock className="w-3.5 h-3.5 text-text-muted" />
                  <span>{merchant.delivery_min_minutes} min demora</span>
                </div>
              </div>

              {/* Botón Reservar Mesa */}
              <Link
                href={`/${merchant.slug}/reserva`}
                className="mt-2 w-full py-2.5 px-3 bg-surface-hover hover:bg-surface-subtle text-white font-bold text-xs rounded-xl border border-surface-border hover:border-brand-blue transition-colors flex items-center justify-center gap-2"
              >
                <CalendarDays className="w-4 h-4 text-brand-amber" />
                <span>Reservar una mesa</span>
              </Link>
            </div>
          </div>

          {/* Ficha de Mesa activa si aplica */}
          {activeTable && (
            <div className="p-3 bg-brand-blue/10 border border-brand-blue/30 rounded-xl flex items-center justify-between text-xs">
              <div className="flex items-center gap-2 text-white font-bold">
                <span className="w-2 h-2 rounded-full bg-brand-blue animate-ping" />
                <span>Estás en la {activeTable.label} ({activeTable.zone})</span>
              </div>
              <span className="text-[11px] text-brand-blue font-semibold">QR Verificado</span>
            </div>
          )}
        </aside>

        {/* Contenido de la Carta */}
        <main className="flex-1 min-w-0 flex flex-col gap-4">
          {/* Barra de Búsqueda de Productos dentro de la Carta */}
          <div className="relative">
            <Search className="absolute left-3.5 top-3.5 w-5 h-5 text-text-muted" />
            <input
              type="text"
              placeholder={`Buscar en la carta de ${merchant.name}...`}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full min-h-[44px] pl-11 pr-4 py-2.5 bg-surface border border-surface-border rounded-xl text-[16px] text-white placeholder:text-text-muted outline-none focus:border-brand-blue transition-colors"
            />
          </div>

          {/* Carrusel Horizontal de Categorías con chevrons y scroll snap táctil */}
          <div className="relative flex items-center">
            <button
              onClick={() => scrollCategories('left')}
              className="hidden sm:flex z-10 w-9 h-9 rounded-full bg-surface border border-surface-border text-text-secondary hover:text-white items-center justify-center absolute -left-3.5 shadow-md active:scale-95"
              aria-label="Scroll anterior"
            >
              <ChevronLeft className="w-5 h-5" />
            </button>

            <div
              ref={categoryScrollRef}
              className="category-carousel flex items-center gap-2 overflow-x-auto no-scrollbar py-1.5 px-1 w-full"
            >
              <button
                onClick={() => setActiveCategory('all')}
                className={`category-tab flex-shrink-0 min-h-[44px] px-4 py-2.5 rounded-xl text-xs sm:text-sm font-bold transition-all active:scale-98 ${
                  activeCategory === 'all'
                    ? 'bg-brand-blue text-white shadow-md'
                    : 'bg-surface hover:bg-surface-hover text-text-secondary border border-surface-border'
                }`}
              >
                Todos los platos ({products.length})
              </button>

              {categories.map((cat) => {
                const count = products.filter((p) => p.category_id === cat.id).length;
                return (
                  <button
                    key={cat.id}
                    onClick={() => setActiveCategory(cat.id)}
                    className={`category-tab flex-shrink-0 min-h-[44px] px-4 py-2.5 rounded-xl text-xs sm:text-sm font-bold transition-all active:scale-98 ${
                      activeCategory === cat.id
                        ? 'bg-brand-blue text-white shadow-md'
                        : 'bg-surface hover:bg-surface-hover text-text-secondary border border-surface-border'
                    }`}
                  >
                    {cat.name} ({count})
                  </button>
                );
              })}
            </div>

            <button
              onClick={() => scrollCategories('right')}
              className="hidden sm:flex z-10 w-9 h-9 rounded-full bg-surface border border-surface-border text-text-secondary hover:text-white items-center justify-center absolute -right-3.5 shadow-md active:scale-95"
              aria-label="Scroll siguiente"
            >
              <ChevronRight className="w-5 h-5" />
            </button>
          </div>

          {/* Estado: Sin resultados de búsqueda */}
          {filteredProducts.length === 0 && (
            <div className="py-16 text-center bg-surface border border-dashed border-surface-border rounded-2xl flex flex-col items-center">
              <Utensils className="w-8 h-8 text-text-muted mb-2" />
              <h3 className="text-base font-bold text-white">No encontramos platos</h3>
              <p className="text-xs text-text-secondary mt-1 max-w-xs">
                {searchQuery
                  ? `No hay platos que coincidan con "${searchQuery}".`
                  : 'Todavía no hay platos cargados en esta categoría.'}
              </p>
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery('')}
                  className="mt-3 px-3 py-1.5 bg-surface-hover rounded-lg text-xs font-bold text-brand-blue"
                >
                  Limpiar búsqueda
                </button>
              )}
            </div>
          )}

          {/* Grilla de Platos: Mobile 2 col, Desktop 3 col */}
          {filteredProducts.length > 0 && (
            <div className="grid grid-cols-2 md:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
              {filteredProducts.map((product) => (
                <ProductCard
                  key={product.id}
                  product={product}
                  onOpenDetail={(prod) => setSelectedProduct(prod)}
                  onShowToast={(msg) => setToastMessage(msg)}
                />
              ))}
            </div>
          )}
        </main>
      </div>

      {/* Barra Flotante Inferior de Carrito (Mobile-First con Safe Area) */}
      {cartItemCount > 0 && (
        <div className="fixed bottom-[max(env(safe-area-inset-bottom),0.75rem)] left-3 right-3 sm:hidden z-40 animate-in slide-in-from-bottom-4 duration-200">
          <button
            onClick={() => setIsCartOpen(true)}
            className="w-full min-h-[50px] py-3.5 px-4 bg-brand-blue hover:bg-brand-blue-hover text-white rounded-2xl font-black text-sm flex items-center justify-between shadow-2xl shadow-brand-blue/40 border border-white/10 active:scale-98 transition-all"
          >
            <div className="flex items-center gap-2.5">
              <span className="w-7 h-7 rounded-full bg-white text-brand-blue flex items-center justify-center text-xs font-black shadow-inner">
                {cartItemCount}
              </span>
              <span>Ver mi pedido {activeTable ? `(${activeTable.label})` : ''}</span>
            </div>
            <span className="tabular-nums font-black text-white text-base">
              {formatPrice(cartTotal)}
            </span>
          </button>
        </div>
      )}

      {/* Modal Detalle de Plato (Foto y Video corto, sin 3D) */}
      <ProductDetailModal
        product={selectedProduct}
        onClose={() => setSelectedProduct(null)}
        onShowToast={(msg) => setToastMessage(msg)}
        onOpenCart={() => setIsCartOpen(true)}
      />

      {/* Sheet de Carrito y Checkout */}
      <CartSheet
        isOpen={isCartOpen}
        onClose={() => setIsCartOpen(false)}
        merchantSlug={merchant.slug}
        merchantName={merchant.name}
        tableId={activeTable?.id}
        tableLabel={activeTable?.label}
        onShowToast={(msg) => setToastMessage(msg)}
      />

      {/* Modal Rápido de Llamar al Mozo / Pedir la Cuenta */}
      {callModal && (
        <QuickCallModal
          isOpen={Boolean(callModal)}
          type={callModal}
          merchantSlug={merchant.slug}
          tables={tables}
          currentTableId={activeTable?.id}
          onClose={() => setCallModal(null)}
          onSuccess={(msg) => setToastMessage(msg)}
        />
      )}

      {/* Toast Flotante */}
      <Toast
        message={toastMessage}
        onClose={() => setToastMessage(null)}
      />
    </div>
  );
}
