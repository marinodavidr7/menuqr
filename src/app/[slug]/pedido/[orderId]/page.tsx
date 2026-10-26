'use client';

import { useState, useEffect, use } from 'react';
import Link from 'next/link';
import {
  CheckCircle2, Clock, ChefHat, Bike, Utensils, BellRing,
  ReceiptText, AlertCircle, ChevronLeft, RefreshCw, ShieldCheck,
  ShoppingBag, Plus, UtensilsCrossed
} from 'lucide-react';
import { Navbar } from '@/components/Navbar';
import { QuickCallModal } from '@/components/QuickCallModal';
import { Toast } from '@/components/Toast';
import { Order, OrderStatus, Table } from '@/lib/types';
import { formatPrice, formatTime, minutesElapsed } from '@/lib/formatters';
import { useCartStore } from '@/lib/cart-store';

interface PageProps {
  params: Promise<{ slug: string; orderId: string }>;
}

export default function OrderStatusPage({ params }: PageProps) {
  const { slug, orderId } = use(params);

  const [order, setOrder] = useState<Order | null>(null);
  const [tables, setTables] = useState<Table[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [callModal, setCallModal] = useState<'waiter' | 'bill' | null>(null);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const setTableCart = useCartStore((s) => s.setTable);
  const updateActiveOrderStatus = useCartStore((s) => s.updateActiveOrderStatus);
  const activeOrders = useCartStore((s) => s.activeOrders);

  const fetchOrder = async () => {
    try {
      const res = await fetch(`/api/orders?orderId=${orderId}`);
      if (!res.ok) throw new Error('Pedido no encontrado');
      const data = await res.json();
      const o = data.order;
      setOrder(o);

      // Si es de salón y tiene mesa, persistirla en el carrito para que nunca se pierda
      if (o.table_id && o.table_label) {
        setTableCart(o.table_id, o.table_number, o.table_label);
      }
      if (o.status) {
        updateActiveOrderStatus(o.id, o.status);
      }
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  // Cargar tablas para el modal de mozo
  useEffect(() => {
    fetch(`/api/merchants/${slug}`)
      .then((res) => res.json())
      .then((data) => setTables(data.tables || []))
      .catch(() => {});
  }, [slug]);

  // Polling en vivo cada 3 segundos
  useEffect(() => {
    fetchOrder();
    const interval = setInterval(fetchOrder, 3000);
    return () => clearInterval(interval);
  }, [orderId]);

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center text-text-secondary">
        <RefreshCw className="w-8 h-8 text-brand-blue animate-spin mb-3" />
        <p className="text-sm font-semibold">Cargando estado del pedido...</p>
      </div>
    );
  }

  if (error || !order) {
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center p-4 text-center">
        <AlertCircle className="w-10 h-10 text-brand-danger mb-2" />
        <h2 className="text-xl font-bold text-white">No pudimos cargar el pedido</h2>
        <p className="text-xs text-text-secondary mt-1">{error}</p>
        <Link href={`/${slug}`} className="mt-4 px-4 py-2 bg-brand-blue rounded-xl text-white text-xs font-bold">
          Volver a la carta
        </Link>
      </div>
    );
  }

  const steps: { key: OrderStatus; label: string; icon: any }[] = [
    { key: 'confirmed', label: 'Confirmado', icon: CheckCircle2 },
    { key: 'in_kitchen', label: 'En cocina', icon: ChefHat },
    { key: 'ready', label: order.channel === 'delivery' ? 'En camino' : 'Listo', icon: order.channel === 'delivery' ? Bike : Utensils },
    { key: 'delivered', label: 'Entregado', icon: ShieldCheck },
  ];

  const getStepIndex = (status: OrderStatus) => {
    if (status === 'confirmed') return 0;
    if (status === 'in_kitchen') return 1;
    if (status === 'ready') return 2;
    if (status === 'delivered' || status === 'closed') return 3;
    return 0;
  };

  const currentStep = getStepIndex(order.status);
  const isCancelled = order.status === 'cancelled';
  const elapsed = minutesElapsed(order.created_at);

  return (
    <div className="min-h-screen flex flex-col bg-background text-text-primary">
      <Navbar
        merchantSlug={slug}
        tableLabel={order.table_label || undefined}
        onCallWaiter={() => setCallModal('waiter')}
        onRequestBill={() => setCallModal('bill')}
      />

      <main className="flex-1 max-w-2xl w-full mx-auto px-4 py-6 flex flex-col gap-6">
        {/* Link Volver */}
        <div className="flex items-center justify-between">
          <Link
            href={`/${slug}`}
            className="inline-flex items-center gap-1.5 text-xs font-bold text-text-secondary hover:text-white transition-colors"
          >
            <ChevronLeft className="w-4 h-4" />
            <span>Volver a la carta</span>
          </Link>

          <span className="text-xs font-semibold text-text-muted flex items-center gap-1">
            <span className="w-2 h-2 rounded-full bg-brand-success animate-pulse" />
            Actualización en vivo
          </span>
        </div>

        {/* Tarjeta de Estado del Pedido */}
        <div className="bg-surface border border-surface-border rounded-2xl p-5 sm:p-6 shadow-xl flex flex-col gap-6">
          <div className="flex items-start justify-between gap-3">
            <div>
              <span className="text-xs font-bold text-brand-blue uppercase">
                {order.channel === 'salon' ? `Mesa: ${order.table_label || 'Salón'}` : order.channel === 'delivery' ? 'Envío a domicilio' : 'Take Away (Retiro)'}
              </span>
              <h1 className="text-2xl font-black text-white mt-0.5">
                Pedido #{order.id.slice(-6).toUpperCase()}
              </h1>
              <p className="text-xs text-text-secondary mt-1">
                Marchado a las {formatTime(order.created_at)} ({elapsed} min transcurridos)
              </p>
            </div>

            <div className="text-right">
              <span className="text-xs text-text-secondary block">Total a pagar:</span>
              <span className="tabular-nums font-black text-xl text-brand-blue">
                {formatPrice(order.total_cents)}
              </span>
            </div>
          </div>

          {/* Timeline Horizontal de Estados */}
          {isCancelled ? (
            <div className="p-4 bg-brand-danger/10 border border-brand-danger/30 rounded-xl text-center">
              <p className="text-sm font-bold text-brand-danger">Este pedido fue cancelado por el local.</p>
            </div>
          ) : (
            <div className="relative pt-4 pb-2">
              <div className="flex items-center justify-between relative z-10">
                {steps.map((st, idx) => {
                  const Icon = st.icon;
                  const isCompleted = idx <= currentStep;
                  const isCurrent = idx === currentStep;

                  return (
                    <div key={st.key} className="flex flex-col items-center flex-1 text-center">
                      <div
                        className={`w-10 h-10 rounded-full flex items-center justify-center transition-all ${
                          isCompleted
                            ? 'bg-brand-blue text-white shadow-lg shadow-brand-blue/30 scale-105'
                            : 'bg-surface-subtle border border-surface-border text-text-muted'
                        }`}
                      >
                        <Icon className="w-5 h-5" />
                      </div>
                      <span
                        className={`text-[11px] sm:text-xs font-bold mt-2 ${
                          isCurrent ? 'text-brand-blue' : isCompleted ? 'text-white' : 'text-text-muted'
                        }`}
                      >
                        {st.label}
                      </span>
                    </div>
                  );
                })}
              </div>

              {/* Barra de progreso de fondo */}
              <div className="absolute top-9 left-1/8 right-1/8 h-1 bg-surface-subtle -z-0">
                <div
                  className="h-full bg-brand-blue transition-all duration-500"
                  style={{ width: `${(currentStep / (steps.length - 1)) * 100}%` }}
                />
              </div>
            </div>
          )}

          {/* Acciones Rápidas para Salón: Llamar al Mozo / Pedir la Cuenta */}
          {order.channel === 'salon' && (
            <div className="grid grid-cols-2 gap-3 pt-3 border-t border-surface-border">
              <button
                type="button"
                onClick={() => setCallModal('waiter')}
                className="py-3 px-3 rounded-xl bg-surface-hover hover:bg-surface-subtle border border-surface-border text-white text-xs font-bold flex items-center justify-center gap-2 transition-colors"
              >
                <BellRing className="w-4 h-4 text-brand-amber" />
                <span>Llamar al mozo</span>
              </button>
              <button
                type="button"
                onClick={() => setCallModal('bill')}
                className="py-3 px-3 rounded-xl bg-surface-hover hover:bg-surface-subtle border border-surface-border text-white text-xs font-bold flex items-center justify-center gap-2 transition-colors"
              >
                <ReceiptText className="w-4 h-4 text-brand-blue" />
                <span>Pedir la cuenta</span>
              </button>
            </div>
          )}
        </div>

        {/* Tarjeta Destacada: ¿Querés pedir algo más para la mesa? */}
        <div className="bg-gradient-to-r from-brand-blue/20 via-surface to-brand-amber/10 border border-brand-blue/40 rounded-2xl p-5 flex flex-col sm:flex-row items-center justify-between gap-4 shadow-xl">
          <div className="flex items-center gap-3.5">
            <div className="w-12 h-12 rounded-2xl bg-brand-blue text-white flex items-center justify-center flex-shrink-0 shadow-lg shadow-brand-blue/25">
              <UtensilsCrossed className="w-6 h-6" />
            </div>
            <div>
              <h3 className="font-extrabold text-base text-white">
                {order.channel === 'salon'
                  ? `¿Querés pedir algo más para ${order.table_label || 'tu mesa'}?`
                  : '¿Deseás sumar algo más a tu pedido?'}
              </h3>
              <p className="text-xs text-text-secondary mt-0.5">
                {order.channel === 'salon'
                  ? 'Tu mesa sigue abierta. Podés pedir postres, bebidas o nuevos platos a la cuenta en cualquier momento.'
                  : 'Podés pedir más platos que se marcharán inmediatamente a la cocina.'}
              </p>
            </div>
          </div>

          <Link
            href={`/${slug}${tables.find((t) => t.id === order.table_id)?.qr_token ? `?mesa=${tables.find((t) => t.id === order.table_id)?.qr_token}` : ''}`}
            className="w-full sm:w-auto min-h-[48px] px-5 py-3 rounded-xl bg-brand-blue hover:bg-brand-blue-hover text-white text-sm font-black flex items-center justify-center gap-2 transition-all shadow-lg shadow-brand-blue/30 active:scale-95 whitespace-nowrap"
          >
            <Plus className="w-4 h-4" />
            <span>+ Agregar más platos a la mesa</span>
          </Link>
        </div>

        {/* Historial de Comandas en la misma mesa si hay más de una */}
        {activeOrders.filter((o) => o.id !== order.id).length > 0 && (
          <div className="bg-surface border border-surface-border rounded-2xl p-5 shadow-sm flex flex-col gap-3">
            <h3 className="text-xs font-black uppercase tracking-wider text-text-secondary flex items-center gap-1.5">
              <span>Otras comandas activas en tu mesa</span>
            </h3>
            <div className="flex flex-col divide-y divide-surface-border">
              {activeOrders
                .filter((o) => o.id !== order.id)
                .map((ao) => (
                  <Link
                    key={ao.id}
                    href={`/${slug}/pedido/${ao.id}`}
                    className="py-2.5 flex items-center justify-between hover:bg-surface-subtle transition-colors rounded-lg px-2 -mx-2"
                  >
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-bold text-white">
                        Comanda #{ao.orderNumber || ao.id.slice(-6).toUpperCase()}
                      </span>
                      <span className="text-[11px] text-text-muted">
                        ({ao.itemCount} platos)
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="tabular-nums text-xs font-black text-brand-blue">
                        {formatPrice(ao.totalCents)}
                      </span>
                      <span className="text-[10px] text-brand-blue font-bold">Ver estado →</span>
                    </div>
                  </Link>
                ))}
            </div>
          </div>
        )}

        {/* Detalle de los Platos */}
        <div className="bg-surface border border-surface-border rounded-2xl p-5 shadow-sm flex flex-col gap-3">
          <h2 className="text-sm font-bold text-white uppercase tracking-wider">
            Detalle del pedido
          </h2>

          <div className="flex flex-col divide-y divide-surface-border">
            {(order.items || []).map((item) => (
              <div key={item.id} className="py-3 flex items-center justify-between gap-3 text-xs">
                <div>
                  <p className="font-bold text-white text-sm">
                    {item.quantity}x {item.name_snapshot}
                  </p>
                  {item.notes && (
                    <p className="text-brand-amber text-[11px] mt-0.5">Nota: {item.notes}</p>
                  )}
                </div>
                <span className="tabular-nums font-semibold text-white">
                  {formatPrice(item.unit_price_cents * item.quantity)}
                </span>
              </div>
            ))}
          </div>

          {/* Subtotal, Envío y Total */}
          <div className="pt-3 border-t border-surface-border flex flex-col gap-1.5 text-xs text-text-secondary">
            <div className="flex justify-between">
              <span>Subtotal:</span>
              <span className="tabular-nums font-semibold text-white">{formatPrice(order.subtotal_cents)}</span>
            </div>
            {order.delivery_fee_cents > 0 && (
              <div className="flex justify-between">
                <span>Costo de envío:</span>
                <span className="tabular-nums font-semibold text-brand-blue">{formatPrice(order.delivery_fee_cents)}</span>
              </div>
            )}
            <div className="flex justify-between text-sm font-black text-white pt-1 border-t border-surface-border">
              <span>Total abonado:</span>
              <span className="tabular-nums text-brand-blue">{formatPrice(order.total_cents)}</span>
            </div>
            <div className="text-[11px] text-text-muted flex items-center justify-between pt-1">
              <span>Medio de pago:</span>
              <span className="uppercase font-bold text-brand-success">{order.payment_method || 'Mercado Pago'}</span>
            </div>
          </div>
        </div>
      </main>

      {/* Modal de Mozo / Cuenta */}
      {callModal && (
        <QuickCallModal
          isOpen={Boolean(callModal)}
          type={callModal}
          merchantSlug={slug}
          tables={tables}
          currentTableId={order.table_id}
          onClose={() => setCallModal(null)}
          onSuccess={(msg) => setToastMessage(msg)}
        />
      )}

      <Toast message={toastMessage} onClose={() => setToastMessage(null)} />
    </div>
  );
}
