'use client';

import { useState, useEffect } from 'react';
import Image from 'next/image';
import {
  X, Plus, Minus, Video, Camera, ShoppingBag, Sparkles,
  Clock, ChefHat, Check, Heart, Share2, Flame
} from 'lucide-react';
import { Product } from '@/lib/types';
import { formatPrice } from '@/lib/formatters';
import { useCartStore } from '@/lib/cart-store';

interface ProductDetailModalProps {
  product: Product | null;
  onClose: () => void;
  onShowToast: (message: string) => void;
  onOpenCart: () => void;
}

const QUICK_NOTES = [
  'Sin cebolla',
  'Salsa aparte',
  'Bien caliente',
  'Queso rallado extra',
  'Para compartir',
  'Sin sal agregada',
];

export function ProductDetailModal({
  product,
  onClose,
  onShowToast,
  onOpenCart,
}: ProductDetailModalProps) {
  const [activeMedia, setActiveMedia] = useState<'photo' | 'video'>('photo');
  const [quantity, setQuantity] = useState(1);
  const [notes, setNotes] = useState('');
  const [isFavorite, setIsFavorite] = useState(false);
  const addItem = useCartStore((s) => s.addItem);

  useEffect(() => {
    if (product) {
      setQuantity(1);
      setNotes('');
      setActiveMedia('photo');

      // Registrar vista en métricas del comercio
      fetch('/api/products', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'record_view', productId: product.id, viewType: 'photo' }),
      }).catch(() => {});
    }
  }, [product]);

  if (!product) return null;

  const handleMediaChange = (type: 'photo' | 'video') => {
    setActiveMedia(type);
    if (type === 'video') {
      fetch('/api/products', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'record_view', productId: product.id, viewType: 'video' }),
      }).catch(() => {});
    }
  };

  const handleAddNoteChip = (chip: string) => {
    if (!notes) {
      setNotes(chip);
    } else if (!notes.includes(chip)) {
      setNotes(`${notes}, ${chip}`);
    }
  };

  const handleAdd = () => {
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
    onShowToast(`¡Agregaste ${quantity}x "${product.name}" al pedido!`);
    onClose();
  };

  const totalPrice = product.price_cents * quantity;

  return (
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/85 backdrop-blur-md animate-in fade-in duration-200"
      onClick={onClose}
    >
      <div
        className="relative w-full sm:max-w-lg max-h-[92dvh] sm:max-h-[88dvh] bg-surface border border-surface-border rounded-t-[32px] sm:rounded-3xl shadow-2xl modal-sheet flex flex-col text-text-primary overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Visor de Foto o Video Corto (Sin 3D ni WebXR) - Altura fija con flex-shrink-0 */}
        <div className="relative w-full h-64 sm:h-72 flex-shrink-0 bg-[#0B1220] overflow-hidden">
          {/* Cabecera con Botones Flotantes (Cerrar y Favorito) */}
          <div className="absolute top-3 right-3 z-30 flex items-center gap-2">
            <button
              onClick={() => setIsFavorite(!isFavorite)}
              aria-label="Guardar en favoritos"
              className="w-10 h-10 rounded-full bg-black/60 hover:bg-black/90 text-white flex items-center justify-center backdrop-blur-md border border-white/15 active:scale-95 transition-all shadow-lg"
            >
              <Heart className={`w-4 h-4 ${isFavorite ? 'fill-brand-danger text-brand-danger' : 'text-white'}`} />
            </button>

            <button
              onClick={onClose}
              aria-label="Cerrar detalle del plato"
              className="w-10 h-10 rounded-full bg-black/60 hover:bg-black/90 text-white flex items-center justify-center backdrop-blur-md border border-white/15 active:scale-95 transition-all shadow-lg"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

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
              className="object-cover object-center"
              sizes="(max-width: 640px) 100vw, 540px"
              priority
            />
          ) : (
            <div className="w-full h-full flex flex-col items-center justify-center text-text-muted text-sm gap-2 bg-[#0B1220]">
              <ChefHat className="w-10 h-10 text-brand-blue/40" />
              <span>Foto en preparación</span>
            </div>
          )}

          {/* Viñeta sutil superior para contraste de botones y degradé inferior suave */}
          <div className="absolute inset-x-0 top-0 h-16 bg-gradient-to-b from-black/70 via-black/20 to-transparent pointer-events-none" />
          <div className="absolute inset-x-0 bottom-0 h-12 bg-gradient-to-t from-surface to-transparent pointer-events-none" />

          {/* Selector de Pestañas Foto / Video Corto con áreas táctiles ≥ 44px */}
          {product.video_url && (
            <div className="absolute bottom-3 left-4 z-20 flex items-center gap-1.5 p-1 bg-black/75 backdrop-blur-md rounded-full border border-white/15 shadow-xl">
              <button
                type="button"
                onClick={() => handleMediaChange('photo')}
                className={`min-h-[38px] px-3.5 py-1.5 rounded-full text-xs font-bold flex items-center gap-1.5 transition-all active:scale-95 ${
                  activeMedia === 'photo'
                    ? 'bg-brand-blue text-white shadow-md'
                    : 'text-text-secondary hover:text-white'
                }`}
              >
                <Camera className="w-3.5 h-3.5" />
                <span>Foto</span>
              </button>
              <button
                type="button"
                onClick={() => handleMediaChange('video')}
                className={`min-h-[38px] px-3.5 py-1.5 rounded-full text-xs font-bold flex items-center gap-1.5 transition-all active:scale-95 ${
                  activeMedia === 'video'
                    ? 'bg-brand-blue text-white shadow-md'
                    : 'text-text-secondary hover:text-white'
                }`}
              >
                <Video className="w-3.5 h-3.5" />
                <span>Video corto</span>
              </button>
            </div>
          )}
        </div>

        {/* Cuerpo Desplazable: Título, Descripción, Badges y Notas */}
        <div className="flex-1 overflow-y-auto overscroll-contain no-scrollbar p-5 sm:p-6 flex flex-col gap-4">
          {/* Título y Precio Principal */}
          <div>
            <div className="flex items-start justify-between gap-3">
              <div className="flex flex-col gap-1">
                <div className="flex items-center gap-2">
                  <span className="px-2 py-0.5 rounded-md bg-brand-amber/15 border border-brand-amber/30 text-brand-amber text-[10px] font-black uppercase tracking-wider flex items-center gap-1">
                    <Sparkles className="w-3 h-3" />
                    Especialidad de la casa
                  </span>
                </div>
                <h2 className="text-xl sm:text-2xl font-black text-white leading-tight">
                  {product.name}
                </h2>
              </div>

              {/* Precio Destacado */}
              <div className="flex flex-col items-end flex-shrink-0">
                <span className="tabular-nums font-black text-2xl text-brand-blue">
                  {formatPrice(product.price_cents)}
                </span>
                <span className="text-[10px] text-text-muted">precio unitario</span>
              </div>
            </div>

            <p className="mt-2.5 text-xs sm:text-sm text-text-secondary leading-relaxed">
              {product.description || 'Elaborado artesanalmente en el momento con los mejores ingredientes de plaza y cuidando cada detalle para ofrecerte la auténtica experiencia bodegonera.'}
            </p>

            {/* Badges Gastronómicos */}
            <div className="flex flex-wrap items-center gap-2 mt-3 text-[11px] text-text-secondary">
              <span className="flex items-center gap-1 px-2.5 py-1 bg-surface-subtle border border-surface-border rounded-lg">
                <Clock className="w-3.5 h-3.5 text-brand-amber" />
                15 - 20 min elaboración
              </span>
              <span className="flex items-center gap-1 px-2.5 py-1 bg-surface-subtle border border-surface-border rounded-lg">
                <Flame className="w-3.5 h-3.5 text-brand-danger" />
                Sale bien caliente
              </span>
            </div>
          </div>

          {/* Campo de Notas para la Cocina con Chips Rápidos */}
          <div className="flex flex-col gap-1.5 pt-3 border-t border-surface-border">
            <label className="block text-xs font-semibold text-text-secondary">
              Aclaración para la cocina (opcional)
            </label>

            {/* Chips de Sugerencia Rápida */}
            <div className="flex flex-wrap gap-1.5 pb-1">
              {QUICK_NOTES.map((chip) => {
                const isSelected = notes.includes(chip);
                return (
                  <button
                    key={chip}
                    type="button"
                    onClick={() => handleAddNoteChip(chip)}
                    className={`px-2.5 py-1 rounded-lg text-[11px] font-bold border transition-all active:scale-95 ${
                      isSelected
                        ? 'bg-brand-blue/20 border-brand-blue text-brand-blue'
                        : 'bg-surface-subtle border-surface-border text-text-muted hover:text-white hover:border-surface-hover'
                    }`}
                  >
                    + {chip}
                  </button>
                );
              })}
            </div>

            <input
              type="text"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Ej: sin cebolla, salsa aparte, bife a punto..."
              className="w-full min-h-[44px] px-3.5 py-2.5 rounded-xl bg-surface-subtle border border-surface-border text-white text-[16px] placeholder:text-text-muted focus:outline-none focus:border-brand-blue transition-colors"
            />
          </div>
        </div>

        {/* Barra Fija Inferior: Selector de Cantidad y Botón de Pedido */}
        <div className="p-4 sm:p-5 border-t border-surface-border bg-surface/95 backdrop-blur-md safe-bottom flex flex-col gap-3 flex-shrink-0">
          <div className="flex items-center justify-between">
            <div>
              <span className="text-xs font-black text-white uppercase tracking-wider block">
                Cantidad
              </span>
              <span className="text-[11px] text-text-muted tabular-nums">
                {quantity} × {formatPrice(product.price_cents)}
              </span>
            </div>

            <div className="flex items-center gap-2 bg-surface-subtle rounded-2xl p-1 border border-surface-border shadow-inner">
              <button
                type="button"
                onClick={() => setQuantity(Math.max(1, quantity - 1))}
                aria-label="Disminuir cantidad"
                className="w-11 h-11 rounded-xl bg-surface hover:bg-surface-hover text-text-primary flex items-center justify-center transition-colors disabled:opacity-30 active:scale-95 border border-surface-border/50"
                disabled={quantity <= 1}
              >
                <Minus className="w-4 h-4" />
              </button>
              <span className="w-8 text-center font-black text-lg text-white tabular-nums">
                {quantity}
              </span>
              <button
                type="button"
                onClick={() => setQuantity(quantity + 1)}
                aria-label="Aumentar cantidad"
                className="w-11 h-11 rounded-xl bg-surface hover:bg-surface-hover text-text-primary flex items-center justify-center transition-colors active:scale-95 border border-surface-border/50"
              >
                <Plus className="w-4 h-4" />
              </button>
            </div>
          </div>

          <button
            type="button"
            onClick={handleAdd}
            disabled={!product.available}
            className="w-full min-h-[52px] py-3.5 px-5 rounded-2xl bg-brand-blue hover:bg-brand-blue-hover text-white font-black text-base flex items-center justify-between shadow-2xl shadow-brand-blue/30 border border-white/10 transition-all disabled:opacity-50 active:scale-98"
          >
            <div className="flex items-center gap-2.5">
              <ShoppingBag className="w-5 h-5" />
              <span>Agregar al pedido</span>
            </div>
            <span className="tabular-nums font-black text-white text-xl">
              {formatPrice(totalPrice)}
            </span>
          </button>
        </div>
      </div>
    </div>
  );
}
