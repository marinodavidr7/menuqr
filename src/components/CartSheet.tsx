'use client';

import { useState, useRef } from 'react';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { X, Trash2, Plus, Minus, ShoppingBag, CreditCard, Banknote, ShieldCheck, MapPin, Sparkles } from 'lucide-react';
import { useCartStore } from '@/lib/cart-store';
import { formatPrice } from '@/lib/formatters';
import { OrderChannel, PaymentMethod } from '@/lib/types';

interface CartSheetProps {
  isOpen: boolean;
  onClose: () => void;
  merchantSlug: string;
  merchantName: string;
  tableId?: string | null;
  tableLabel?: string | null;
  onShowToast: (message: string) => void;
}

export function CartSheet({
  isOpen,
  onClose,
  merchantSlug,
  merchantName,
  tableId,
  tableLabel,
  onShowToast,
}: CartSheetProps) {
  const router = useRouter();
  const {
    items,
    channel,
    deliveryFeeCents,
    customerInfo,
    paymentMethod,
    updateQuantity,
    removeItem,
    clearCart,
    setChannel,
    setCustomerInfo,
    setPaymentMethod,
    getSubtotalCents,
    getTotalCents,
  } = useCartStore();

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Estados para arrastre táctil (drag to dismiss & snap)
  const [translateY, setTranslateY] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  const touchStartY = useRef(0);

  if (!isOpen) return null;

  const subtotal = getSubtotalCents();
  const total = getTotalCents();
  const isDelivery = channel === 'delivery';

  // Handlers para arrastrar y soltar el bottom sheet
  const handleTouchStart = (e: React.TouchEvent) => {
    touchStartY.current = e.touches[0].clientY;
    setIsDragging(true);
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (!isDragging) return;
    const currentY = e.touches[0].clientY;
    const deltaY = currentY - touchStartY.current;
    if (deltaY > 0) {
      setTranslateY(deltaY);
    }
  };

  const handleTouchEnd = () => {
    setIsDragging(false);
    if (translateY > 110) {
      // Snap para cerrar si superó el umbral
      onClose();
      setTranslateY(0);
    } else {
      // Snap de rebote hacia arriba
      setTranslateY(0);
    }
  };

  const handleConfirmOrder = async () => {
    setError(null);
    if (items.length === 0) {
      setError('Tu carrito está vacío');
      return;
    }

    if (isDelivery && !customerInfo.deliveryAddress) {
      setError('Por favor ingresá tu dirección para el envío a domicilio');
      return;
    }

    if (!customerInfo.name) {
      setError('Por favor indicanos tu nombre');
      return;
    }

    setLoading(true);
    try {
      const res = await fetch('/api/orders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          merchantSlug,
          channel,
          tableId: channel === 'salon' ? tableId : null,
          customerName: customerInfo.name,
          customerPhone: customerInfo.phone,
          deliveryAddress: isDelivery ? customerInfo.deliveryAddress : null,
          notes: customerInfo.notes,
          paymentMethod,
          items: items.map((i) => ({
            productId: i.productId,
            name: i.name,
            quantity: i.quantity,
            notes: i.notes,
          })),
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Ocurrió un error al procesar tu pedido');
      }

      // Si pagó con Mercado Pago, simular preferencia de pago sandbox
      if (paymentMethod === 'mercadopago') {
        const mpRes = await fetch('/api/mercadopago', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ action: 'create_preference', orderId: data.orderId }),
        });
        const mpData = await mpRes.json();
        if (mpData.paymentId) {
          await fetch('/api/mercadopago', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ action: 'webhook_confirm', paymentId: mpData.paymentId, status: 'approved' }),
          });
        }
      }

      clearCart();
      onClose();
      onShowToast('¡Tu pedido fue recibido y ya está marchando!');
      router.push(`/${merchantSlug}/pedido/${data.orderId}`);
    } catch (err: any) {
      setError(err.message || 'Error de conexión');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/80 backdrop-blur-sm animate-in fade-in duration-200"
      onClick={onClose}
    >
      <div
        className="w-full sm:max-w-xl max-h-[92dvh] bg-surface border border-surface-border rounded-t-[28px] sm:rounded-2xl shadow-2xl bottom-sheet flex flex-col text-text-primary overflow-hidden transition-transform duration-150 ease-out"
        style={{
          transform: `translateY(${translateY}px)`,
          transition: isDragging ? 'none' : 'transform 0.2s cubic-bezier(0.16, 1, 0.3, 1)',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Barra de agarre táctil (Drag handle) con snap */}
        <div
          className="w-full pt-3 pb-2 flex flex-col items-center justify-center cursor-grab active:cursor-grabbing touch-none select-none sm:hidden"
          onTouchStart={handleTouchStart}
          onTouchMove={handleTouchMove}
          onTouchEnd={handleTouchEnd}
        >
          <div className="w-12 h-1.5 rounded-full bg-white/25 active:bg-white/40 transition-colors" />
        </div>

        {/* Cabecera del Carrito */}
        <div className="px-5 py-3 border-b border-surface-border flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <ShoppingBag className="w-5 h-5 text-brand-blue" />
            <h2 className="font-extrabold text-base sm:text-lg text-white">
              Tu pedido en {merchantName}
            </h2>
          </div>
          <button
            onClick={onClose}
            aria-label="Cerrar carrito"
            className="w-11 h-11 rounded-full bg-surface-hover hover:bg-surface text-text-secondary hover:text-white flex items-center justify-center transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Contenido scrolleable */}
        <div className="p-4 sm:p-5 overflow-y-auto flex-1 flex flex-col gap-5 overscroll-contain">
          {error && (
            <div className="p-3 bg-brand-danger/10 border border-brand-danger/30 rounded-xl text-xs text-brand-danger font-semibold flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-brand-danger" />
              {error}
            </div>
          )}

          {/* Selector de Canal */}
          <div>
            <label className="block text-xs font-semibold text-text-secondary uppercase mb-2">
              ¿Cómo querés tu pedido?
            </label>
            <div className="grid grid-cols-3 gap-2">
              <button
                type="button"
                onClick={() => setChannel('salon')}
                className={`min-h-[44px] py-2 px-3 rounded-xl text-xs font-bold border transition-all ${
                  channel === 'salon'
                    ? 'bg-brand-blue/20 border-brand-blue text-white'
                    : 'bg-surface-subtle border-surface-border text-text-secondary hover:text-white'
                }`}
              >
                Salón {tableLabel ? `(${tableLabel})` : ''}
              </button>
              <button
                type="button"
                onClick={() => setChannel('delivery')}
                className={`min-h-[44px] py-2 px-3 rounded-xl text-xs font-bold border transition-all ${
                  channel === 'delivery'
                    ? 'bg-brand-blue/20 border-brand-blue text-white'
                    : 'bg-surface-subtle border-surface-border text-text-secondary hover:text-white'
                }`}
              >
                Envío a domicilio
              </button>
              <button
                type="button"
                onClick={() => setChannel('takeaway')}
                className={`min-h-[44px] py-2 px-3 rounded-xl text-xs font-bold border transition-all ${
                  channel === 'takeaway'
                    ? 'bg-brand-blue/20 border-brand-blue text-white'
                    : 'bg-surface-subtle border-surface-border text-text-secondary hover:text-white'
                }`}
              >
                Take Away (Retiro)
              </button>
            </div>
          </div>

          {/* Lista de Platos */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-semibold text-text-secondary uppercase">
                Platos seleccionados ({items.length})
              </span>
              {items.length > 0 && (
                <button
                  type="button"
                  onClick={clearCart}
                  className="min-h-[44px] text-xs text-brand-danger hover:underline px-2"
                >
                  Vaciar pedido
                </button>
              )}
            </div>

            {items.length === 0 ? (
              <div className="py-8 text-center bg-surface-subtle rounded-xl border border-dashed border-surface-border text-text-secondary text-sm">
                No agregaste ningún plato todavía.
              </div>
            ) : (
              <div className="flex flex-col gap-2.5">
                {items.map((item) => (
                  <div
                    key={item.productId}
                    className="p-3 bg-surface-subtle border border-surface-border rounded-xl flex items-center justify-between gap-3"
                  >
                    {item.imageUrl && (
                      <div className="relative w-12 h-12 rounded-lg overflow-hidden flex-shrink-0 bg-surface">
                        <Image
                          src={item.imageUrl}
                          alt={item.name}
                          fill
                          className="object-cover"
                        />
                      </div>
                    )}
                    <div className="flex-1 min-w-0">
                      <h4 className="text-sm font-bold text-white truncate">{item.name}</h4>
                      {item.notes && (
                        <p className="text-[11px] text-brand-amber truncate">
                          Nota: {item.notes}
                        </p>
                      )}
                      <p className="text-xs font-semibold text-brand-blue tabular-nums">
                        {formatPrice(item.unitPriceCents)}
                      </p>
                    </div>

                    {/* Controles de Cantidad con área táctil mínima de 44px */}
                    <div className="flex items-center gap-1.5 bg-surface rounded-xl p-0.5 border border-surface-border">
                      <button
                        type="button"
                        onClick={() => updateQuantity(item.productId, item.quantity - 1)}
                        aria-label={`Disminuir o quitar ${item.name}`}
                        className="w-11 h-11 rounded-lg flex items-center justify-center text-text-secondary hover:text-white active:scale-95 transition-transform"
                      >
                        {item.quantity === 1 ? <Trash2 className="w-4 h-4 text-brand-danger" /> : <Minus className="w-4 h-4" />}
                      </button>
                      <span className="w-5 text-center text-xs font-black text-white tabular-nums">
                        {item.quantity}
                      </span>
                      <button
                        type="button"
                        onClick={() => updateQuantity(item.productId, item.quantity + 1)}
                        aria-label={`Aumentar ${item.name}`}
                        className="w-11 h-11 rounded-lg flex items-center justify-center text-text-secondary hover:text-white active:scale-95 transition-transform"
                      >
                        <Plus className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Datos del Cliente y Envío (Inputs con font-size: 16px para evitar auto-zoom en iOS) */}
          <div className="p-3.5 bg-surface-subtle border border-surface-border rounded-xl flex flex-col gap-2.5">
            <span className="text-xs font-bold text-white">Tus datos para el local</span>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              <input
                type="text"
                placeholder="Tu nombre completo *"
                value={customerInfo.name}
                onChange={(e) => setCustomerInfo({ name: e.target.value })}
                className="w-full min-h-[44px] px-3.5 py-2.5 rounded-xl bg-surface border border-surface-border text-white text-[16px] placeholder:text-text-muted focus:border-brand-blue outline-none"
              />
              <input
                type="tel"
                placeholder="Teléfono / WhatsApp"
                value={customerInfo.phone}
                onChange={(e) => setCustomerInfo({ phone: e.target.value })}
                className="w-full min-h-[44px] px-3.5 py-2.5 rounded-xl bg-surface border border-surface-border text-white text-[16px] placeholder:text-text-muted focus:border-brand-blue outline-none"
              />
            </div>

            {isDelivery && (
              <div className="relative">
                <MapPin className="absolute left-3.5 top-3.5 w-4 h-4 text-brand-blue" />
                <input
                  type="text"
                  placeholder="Dirección exacta de entrega (Calle, número, piso/depto) *"
                  value={customerInfo.deliveryAddress}
                  onChange={(e) => setCustomerInfo({ deliveryAddress: e.target.value })}
                  className="w-full min-h-[44px] pl-10 pr-3.5 py-2.5 rounded-xl bg-surface border border-surface-border text-white text-[16px] placeholder:text-text-muted focus:border-brand-blue outline-none"
                />
              </div>
            )}
          </div>

          {/* Medio de Pago */}
          <div>
            <label className="block text-xs font-semibold text-text-secondary uppercase mb-2">
              Medio de pago
            </label>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              <button
                type="button"
                onClick={() => setPaymentMethod('mercadopago')}
                className={`min-h-[60px] p-2.5 rounded-xl border flex flex-col items-center justify-center gap-1 transition-all text-center ${
                  paymentMethod === 'mercadopago'
                    ? 'bg-brand-blue/20 border-brand-blue text-white'
                    : 'bg-surface-subtle border-surface-border text-text-secondary hover:text-white'
                }`}
              >
                <Sparkles className="w-4 h-4 text-brand-blue" />
                <span className="text-xs font-bold">Mercado Pago</span>
                <span className="text-[10px] text-brand-success font-medium">Sin comisión</span>
              </button>

              <button
                type="button"
                onClick={() => setPaymentMethod('cash')}
                className={`min-h-[60px] p-2.5 rounded-xl border flex flex-col items-center justify-center gap-1 transition-all text-center ${
                  paymentMethod === 'cash'
                    ? 'bg-brand-blue/20 border-brand-blue text-white'
                    : 'bg-surface-subtle border-surface-border text-text-secondary hover:text-white'
                }`}
              >
                <Banknote className="w-4 h-4 text-brand-amber" />
                <span className="text-xs font-bold">Efectivo</span>
                <span className="text-[10px] text-text-secondary">Al recibir</span>
              </button>

              <button
                type="button"
                onClick={() => setPaymentMethod('debit')}
                className={`min-h-[60px] p-2.5 rounded-xl border flex flex-col items-center justify-center gap-1 transition-all text-center ${
                  paymentMethod === 'debit'
                    ? 'bg-brand-blue/20 border-brand-blue text-white'
                    : 'bg-surface-subtle border-surface-border text-text-secondary hover:text-white'
                }`}
              >
                <CreditCard className="w-4 h-4 text-brand-blue" />
                <span className="text-xs font-bold">Débito</span>
                <span className="text-[10px] text-text-secondary">Posnet</span>
              </button>

              <button
                type="button"
                onClick={() => setPaymentMethod('credit')}
                className={`min-h-[60px] p-2.5 rounded-xl border flex flex-col items-center justify-center gap-1 transition-all text-center ${
                  paymentMethod === 'credit'
                    ? 'bg-brand-blue/20 border-brand-blue text-white'
                    : 'bg-surface-subtle border-surface-border text-text-secondary hover:text-white'
                }`}
              >
                <CreditCard className="w-4 h-4 text-purple-400" />
                <span className="text-xs font-bold">Crédito</span>
                <span className="text-[10px] text-text-secondary">Posnet</span>
              </button>
            </div>
          </div>
        </div>

        {/* Fila Fija Inferior con Safe Area */}
        <div className="p-4 bg-[#0B1220] border-t border-surface-border flex flex-col gap-2.5 safe-bottom">
          <div className="flex flex-col gap-1 text-xs text-text-secondary">
            <div className="flex justify-between">
              <span>Subtotal:</span>
              <span className="tabular-nums font-semibold text-white">{formatPrice(subtotal)}</span>
            </div>
            {isDelivery && (
              <div className="flex justify-between">
                <span>Costo de envío:</span>
                <span className="tabular-nums font-semibold text-brand-blue">{formatPrice(deliveryFeeCents)}</span>
              </div>
            )}
            <div className="flex justify-between text-base font-black text-white pt-1 border-t border-surface-border">
              <span>Total a pagar:</span>
              <span className="tabular-nums text-brand-blue">{formatPrice(total)}</span>
            </div>
          </div>

          <button
            type="button"
            onClick={handleConfirmOrder}
            disabled={loading || items.length === 0}
            className="w-full min-h-[48px] py-3.5 px-4 rounded-xl bg-brand-blue hover:bg-brand-blue-hover text-white font-extrabold text-base flex items-center justify-center gap-2 shadow-lg shadow-brand-blue/25 transition-all disabled:opacity-50 active:scale-98"
          >
            {loading ? (
              <span>Marchando tu pedido...</span>
            ) : (
              <>
                <ShieldCheck className="w-5 h-5 text-brand-success" />
                <span>Confirmar pedido ({formatPrice(total)})</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
