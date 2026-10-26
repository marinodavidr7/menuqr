'use client';

import { useState, useEffect, use } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { ChevronLeft, Plus, Minus, Video, Camera, ShoppingBag, Utensils } from 'lucide-react';
import { Navbar } from '@/components/Navbar';
import { Toast } from '@/components/Toast';
import { Product, Merchant } from '@/lib/types';
import { formatPrice } from '@/lib/formatters';
import { useCartStore } from '@/lib/cart-store';

interface PageProps {
  params: Promise<{ slug: string; productId: string }>;
}

export default function ProductDetailPage({ params }: PageProps) {
  const { slug, productId } = use(params);
  const router = useRouter();

  const [merchant, setMerchant] = useState<Merchant | null>(null);
  const [product, setProduct] = useState<Product | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [activeMedia, setActiveMedia] = useState<'photo' | 'video'>('photo');
  const [quantity, setQuantity] = useState(1);
  const [notes, setNotes] = useState('');
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const addItem = useCartStore((s) => s.addItem);
  const setMerchantCart = useCartStore((s) => s.setMerchant);

  useEffect(() => {
    setLoading(true);
    fetch(`/api/merchants/${slug}`)
      .then((res) => res.json())
      .then((data) => {
        if (!data.merchant) throw new Error('Comercio no encontrado');
        setMerchant(data.merchant);
        setMerchantCart(slug, data.merchant.delivery_fee_cents || 0);

        const found = (data.products || []).find((p: Product) => p.id === productId);
        if (!found) throw new Error('Plato no encontrado');
        setProduct(found);

        // Registrar vista
        fetch('/api/products', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ action: 'record_view', productId, viewType: 'photo' }),
        }).catch(() => {});
      })
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, [slug, productId, setMerchantCart]);

  const handleMediaChange = (type: 'photo' | 'video') => {
    setActiveMedia(type);
    if (type === 'video' && product) {
      fetch('/api/products', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'record_view', productId: product.id, viewType: 'video' }),
      }).catch(() => {});
    }
  };

  const handleAdd = () => {
    if (!product) return;
    addItem(
      {
        productId: product.id,
        name: product.name,
        unitPriceCents: product.price_cents,
        imageUrl: product.image_url,
      },
      quantity,
      notes
    );
    setToastMessage(`¡Agregaste ${quantity}x "${product.name}" al pedido!`);
    setTimeout(() => {
      router.push(`/${slug}`);
    }, 1000);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center text-text-secondary">
        <Utensils className="w-8 h-8 text-brand-blue animate-pulse mb-2" />
        <p className="text-sm">Cargando plato...</p>
      </div>
    );
  }

  if (error || !product || !merchant) {
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center p-4 text-center">
        <h2 className="text-xl font-bold text-white">Plato no encontrado</h2>
        <p className="text-xs text-text-secondary mt-1">{error}</p>
        <Link href={`/${slug}`} className="mt-4 px-4 py-2 bg-brand-blue rounded-xl text-white text-xs font-bold">
          Volver a la carta
        </Link>
      </div>
    );
  }

  const totalPrice = product.price_cents * quantity;

  return (
    <div className="min-h-screen flex flex-col bg-background text-text-primary">
      <Navbar merchantSlug={merchant.slug} merchantName={merchant.name} />

      <main className="flex-1 max-w-3xl w-full mx-auto px-4 py-6 flex flex-col gap-6">
        {/* Botón Volver */}
        <Link
          href={`/${slug}`}
          className="inline-flex items-center gap-1.5 text-xs font-bold text-text-secondary hover:text-white transition-colors"
        >
          <ChevronLeft className="w-4 h-4" />
          <span>Volver a la carta de {merchant.name}</span>
        </Link>

        {/* Visor de Foto o Video Corto (Sin 3D ni WebXR) */}
        <div className="bg-surface border border-surface-border rounded-2xl overflow-hidden shadow-xl flex flex-col">
          <div className="relative w-full aspect-[16/10] bg-black">
            {activeMedia === 'video' && product.video_url ? (
              <video
                src={product.video_url}
                autoPlay
                loop
                muted
                playsInline
                controls
                className="w-full h-full object-cover"
              />
            ) : product.image_url ? (
              <Image
                src={product.image_url}
                alt={product.name}
                fill
                className="object-cover"
                priority
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center text-text-muted">
                Sin foto disponible
              </div>
            )}

            {/* Selector Foto / Video */}
            {product.video_url && (
              <div className="absolute bottom-3 left-1/2 -translate-x-1/2 z-20 flex items-center gap-1.5 p-1 bg-[#0B1220]/80 backdrop-blur-md rounded-full border border-surface-border">
                <button
                  type="button"
                  onClick={() => handleMediaChange('photo')}
                  className={`px-3 py-1 rounded-full text-xs font-semibold flex items-center gap-1.5 transition-colors ${
                    activeMedia === 'photo'
                      ? 'bg-brand-blue text-white shadow-sm'
                      : 'text-text-secondary hover:text-white'
                  }`}
                >
                  <Camera className="w-3.5 h-3.5" />
                  <span>Foto</span>
                </button>
                <button
                  type="button"
                  onClick={() => handleMediaChange('video')}
                  className={`px-3 py-1 rounded-full text-xs font-semibold flex items-center gap-1.5 transition-colors ${
                    activeMedia === 'video'
                      ? 'bg-brand-blue text-white shadow-sm'
                      : 'text-text-secondary hover:text-white'
                  }`}
                >
                  <Video className="w-3.5 h-3.5" />
                  <span>Video corto</span>
                </button>
              </div>
            )}
          </div>

          {/* Información y Pedido */}
          <div className="p-6 flex flex-col gap-5">
            <div>
              <h1 className="text-2xl sm:text-3xl font-black text-white">{product.name}</h1>
              <p className="mt-2 text-sm text-text-secondary leading-relaxed">
                {product.description || 'Elaborado artesanalmente en nuestro local.'}
              </p>
            </div>

            {/* Campo de Notas para la Cocina */}
            <div>
              <label className="block text-xs font-semibold text-text-secondary mb-1.5">
                Aclaración para la cocina (opcional)
              </label>
              <input
                type="text"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Ej: sin cebolla, salsa aparte, bife bien cocido..."
                className="w-full px-4 py-3 rounded-xl bg-surface-subtle border border-surface-border text-white text-sm placeholder:text-text-muted focus:outline-none focus:border-brand-blue transition-colors"
              />
            </div>

            {/* Selector de Cantidad */}
            <div className="flex items-center justify-between pt-2 border-t border-surface-border">
              <span className="text-xs font-semibold text-text-secondary uppercase">Cantidad</span>
              <div className="flex items-center gap-3 bg-surface-hover rounded-xl p-1.5 border border-surface-border">
                <button
                  type="button"
                  onClick={() => setQuantity(Math.max(1, quantity - 1))}
                  className="w-8 h-8 rounded-lg bg-surface flex items-center justify-center text-text-primary disabled:opacity-40"
                  disabled={quantity <= 1}
                >
                  <Minus className="w-4 h-4" />
                </button>
                <span className="w-6 text-center font-bold text-sm text-white tabular-nums">
                  {quantity}
                </span>
                <button
                  type="button"
                  onClick={() => setQuantity(quantity + 1)}
                  className="w-8 h-8 rounded-lg bg-surface flex items-center justify-center text-text-primary"
                >
                  <Plus className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Botón Agregar */}
            <button
              onClick={handleAdd}
              disabled={!product.available}
              className="w-full py-3.5 px-4 rounded-xl bg-brand-blue hover:bg-brand-blue-hover text-white font-extrabold text-base flex items-center justify-between shadow-lg shadow-brand-blue/25 transition-all disabled:opacity-50"
            >
              <span className="flex items-center gap-2">
                <ShoppingBag className="w-5 h-5" />
                <span>Agregar al pedido</span>
              </span>
              <span className="tabular-nums font-black text-white">
                {formatPrice(totalPrice)}
              </span>
            </button>
          </div>
        </div>
      </main>

      <Toast message={toastMessage} onClose={() => setToastMessage(null)} />
    </div>
  );
}
