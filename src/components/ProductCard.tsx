'use client';

import { useState, useEffect } from 'react';
import Image from 'next/image';
import { Heart, Plus, Video, EyeOff } from 'lucide-react';
import { Product } from '@/lib/types';
import { formatPrice } from '@/lib/formatters';
import { useCartStore } from '@/lib/cart-store';

interface ProductCardProps {
  product: Product;
  onOpenDetail: (product: Product) => void;
  onShowToast: (message: string) => void;
}

export function ProductCard({ product, onOpenDetail, onShowToast }: ProductCardProps) {
  const [isFavorite, setIsFavorite] = useState(false);
  const addItem = useCartStore((s) => s.addItem);

  useEffect(() => {
    try {
      const favs = JSON.parse(localStorage.getItem('menuqr_favorites') || '[]');
      setIsFavorite(favs.includes(product.id));
    } catch {}
  }, [product.id]);

  const toggleFavorite = (e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      const favs: string[] = JSON.parse(localStorage.getItem('menuqr_favorites') || '[]');
      let updated: string[];
      if (favs.includes(product.id)) {
        updated = favs.filter((id) => id !== product.id);
        setIsFavorite(false);
      } else {
        updated = [...favs, product.id];
        setIsFavorite(true);
      }
      localStorage.setItem('menuqr_favorites', JSON.stringify(updated));
    } catch {}
  };

  const handleQuickAdd = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!product.available) return;

    addItem({
      productId: product.id,
      name: product.name,
      unitPriceCents: product.price_cents,
      imageUrl: product.image_url,
    });
    onShowToast(`¡Agregaste "${product.name}" a tu pedido!`);
  };

  const isAvailable = Boolean(product.available);

  return (
    <div
      onClick={() => isAvailable && onOpenDetail(product)}
      className={`group relative flex flex-col justify-between bg-surface border border-surface-border rounded-xl overflow-hidden shadow-sm hover:border-surface-hover hover:shadow-lg transition-all cursor-pointer ${
        !isAvailable ? 'opacity-60 cursor-not-allowed' : ''
      }`}
    >
      {/* Contenedor de Imagen y Badges */}
      <div className="relative w-full aspect-[4/3] bg-surface-subtle overflow-hidden">
        {product.image_url ? (
          <Image
            src={product.image_url}
            alt={product.name}
            fill
            sizes="(max-width: 768px) 50vw, (max-width: 1200px) 33vw, 25vw"
            className="object-cover group-hover:scale-105 transition-transform duration-300"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-text-muted text-xs">
            Sin foto disponible
          </div>
        )}

        {/* Gradiente sutil */}
        <div className="absolute inset-0 bg-gradient-to-t from-[#0B1220]/80 via-transparent to-black/30 pointer-events-none" />

        {/* Badge de Video Corto si tiene video */}
        {product.video_url && (
          <div className="absolute top-2.5 left-2.5 z-10 px-2 py-0.5 rounded-full bg-brand-blue/90 text-white text-[11px] font-bold flex items-center gap-1 backdrop-blur-sm shadow-sm">
            <Video className="w-3 h-3 animate-pulse" />
            <span>Video</span>
          </div>
        )}

        {/* Botón Favorito con área táctil ≥ 44px */}
        <button
          onClick={toggleFavorite}
          aria-label={isFavorite ? 'Quitar de favoritos' : 'Agregar a favoritos'}
          className="absolute top-1 right-1 z-10 min-w-[44px] min-h-[44px] flex items-center justify-center active:scale-90 transition-transform"
        >
          <div className="w-8 h-8 rounded-full bg-[#0B1220]/75 hover:bg-[#0B1220] backdrop-blur-md flex items-center justify-center transition-colors shadow-md">
            <Heart
              className={`w-4 h-4 transition-colors ${
                isFavorite ? 'fill-brand-danger text-brand-danger' : 'text-white/80 hover:text-white'
              }`}
            />
          </div>
        </button>

        {/* Overlay si no está disponible */}
        {!isAvailable && (
          <div className="absolute inset-0 bg-black/60 backdrop-blur-[2px] flex items-center justify-center gap-1.5 text-xs font-semibold text-white">
            <EyeOff className="w-4 h-4 text-brand-danger" />
            <span>Agotado por hoy</span>
          </div>
        )}
      </div>

      {/* Contenido Textual y Precio */}
      <div className="p-3 sm:p-4 flex-1 flex flex-col justify-between">
        <div>
          <h3 className="font-bold text-sm sm:text-base text-text-primary group-hover:text-brand-blue transition-colors line-clamp-1">
            {product.name}
          </h3>
          <p className="mt-1 text-xs text-text-secondary line-clamp-2 leading-relaxed">
            {product.description || 'Delicioso plato preparado con ingredientes frescos del día.'}
          </p>
        </div>

        {/* Fila Inferior: Precio en ARS y Botón Agregar (Área táctil ≥ 44px) */}
        <div className="mt-3 pt-2.5 border-t border-surface-border flex items-center justify-between gap-2">
          <div className="tabular-nums font-extrabold text-sm sm:text-base text-white tracking-tight">
            {formatPrice(product.price_cents)}
          </div>

          {isAvailable && (
            <button
              onClick={handleQuickAdd}
              aria-label={`Agregar ${product.name}`}
              className="min-w-[44px] min-h-[44px] rounded-xl bg-surface-hover hover:bg-brand-blue text-text-primary hover:text-white border border-surface-border hover:border-brand-blue flex items-center justify-center transition-all shadow-sm active:scale-95"
            >
              <Plus className="w-5 h-5" />
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
