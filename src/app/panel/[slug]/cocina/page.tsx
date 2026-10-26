'use client';

import { useState, useEffect, use, useMemo, useRef } from 'react';
import {
  ChefHat, Clock, Check, RefreshCw, CheckCircle2, Flame,
  Volume2, VolumeX, Maximize2, Minimize2, ListPlus, Undo2,
  UtensilsCrossed, AlertTriangle, ArrowUpDown
} from 'lucide-react';
import { Order, OrderItem } from '@/lib/types';
import { formatTime, minutesElapsed } from '@/lib/formatters';
import { playKitchenChime, playSuccessChime } from '@/lib/sound';

interface PageProps {
  params: Promise<{ slug: string }>;
}

export default function KitchenPanelPage({ params }: PageProps) {
  const { slug } = use(params);

  const [orders, setOrders] = useState<Order[]>([]);
  const [recentReadyOrders, setRecentReadyOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [completingId, setCompletingId] = useState<string | null>(null);
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [cardSize, setCardSize] = useState<'normal' | 'large'>('normal');
  const [showProductionSummary, setShowProductionSummary] = useState(false);
  const [showRecentHistory, setShowRecentHistory] = useState(false);

  // Tachado individual de platos por id de item
  const [checkedItemIds, setCheckedItemIds] = useState<Record<string, boolean>>({});

  // Seguimiento de comanda anterior para sonar campana al llegar nueva
  const prevOrdersCount = useRef(0);

  const fetchKitchenOrders = async () => {
    try {
      const res = await fetch(`/api/orders?merchantSlug=${slug}`);
      if (res.ok) {
        const data = await res.json();
        const allOrders: Order[] = data.orders || [];

        // En cocina mostramos pedidos confirmados o en_cocina
        const activeKitchenOrders = allOrders.filter(
          (o: Order) => o.status === 'confirmed' || o.status === 'in_kitchen'
        );

        // Guardar también los listos recientes (últimos 8) para poder deshacer si hubo error
        const recentReady = allOrders
          .filter((o: Order) => o.status === 'ready')
          .slice(0, 8);

        // Si entró una nueva comanda, sonar campana de cocina
        if (activeKitchenOrders.length > prevOrdersCount.current && soundEnabled) {
          playKitchenChime();
        }
        prevOrdersCount.current = activeKitchenOrders.length;

        setOrders(activeKitchenOrders);
        setRecentReadyOrders(recentReady);
      }
    } catch {} finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchKitchenOrders();
    const interval = setInterval(fetchKitchenOrders, 3000);
    return () => clearInterval(interval);
  }, [slug, soundEnabled]);

  // Marcar orden como lista
  const handleMarkReady = async (orderId: string) => {
    setCompletingId(orderId);
    try {
      await fetch('/api/orders', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ orderId, status: 'ready', merchantSlug: slug }),
      });
      if (soundEnabled) {
        playSuccessChime();
      }
      await fetchKitchenOrders();
    } catch {} finally {
      setCompletingId(null);
    }
  };

  // Deshacer / Devolver comanda lista a cocina
  const handleUndoReady = async (orderId: string) => {
    try {
      await fetch('/api/orders', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ orderId, status: 'in_kitchen', merchantSlug: slug }),
      });
      await fetchKitchenOrders();
    } catch {}
  };

  // Toggle de tachado de ítem individual de plato
  const toggleItemCheck = (itemId: string) => {
    setCheckedItemIds((prev) => {
      const updated = { ...prev, [itemId]: !prev[itemId] };
      if (soundEnabled && updated[itemId]) {
        playSuccessChime();
      }
      return updated;
    });
  };

  // Toggle pantalla completa
  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().then(() => setIsFullscreen(true)).catch(() => {});
    } else {
      document.exitFullscreen().then(() => setIsFullscreen(false)).catch(() => {});
    }
  };

  // Resumen Consolidado de Producción (Batching)
  const productionSummary = useMemo(() => {
    const counts = new Map<string, { name: string; quantity: number; notes: string[] }>();
    orders.forEach((order) => {
      (order.items || []).forEach((item) => {
        const key = item.name_snapshot;
        if (!counts.has(key)) {
          counts.set(key, { name: item.name_snapshot, quantity: 0, notes: [] });
        }
        const record = counts.get(key)!;
        record.quantity += item.quantity;
        if (item.notes && !record.notes.includes(item.notes)) {
          record.notes.push(item.notes);
        }
      });
    });
    return Array.from(counts.values()).sort((a, b) => b.quantity - a.quantity);
  }, [orders]);

  return (
    <div className="flex flex-col gap-5">
      {/* Barra de Control KDS de Cocina */}
      <div className="bg-surface border border-surface-border rounded-2xl p-4 flex flex-col md:flex-row md:items-center justify-between gap-4 shadow-sm">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-2xl bg-brand-amber/15 text-brand-amber flex items-center justify-center flex-shrink-0">
            <ChefHat className="w-7 h-7" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl sm:text-2xl font-black text-white">Comandera KDS Cocina</h1>
              <span className="w-2.5 h-2.5 rounded-full bg-brand-amber animate-ping" />
            </div>
            <p className="text-xs text-text-secondary">
              Pantalla de despacho táctil y marcha de platos en tiempo real
            </p>
          </div>
        </div>

        {/* Acciones y Controles Rápidos */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Botón Resumen de Producción (Batching) */}
          <button
            onClick={() => setShowProductionSummary(!showProductionSummary)}
            className={`px-3 py-1.5 rounded-xl text-xs font-black flex items-center gap-1.5 transition-all ${
              showProductionSummary
                ? 'bg-brand-amber text-black shadow-md'
                : 'bg-surface hover:bg-surface-hover text-white border border-surface-border'
            }`}
          >
            <ListPlus className="w-4 h-4" />
            <span>Resumen Platos ({productionSummary.length})</span>
          </button>

          {/* Selector de tamaño de tarjeta */}
          <button
            onClick={() => setCardSize(cardSize === 'normal' ? 'large' : 'normal')}
            title="Cambiar tamaño de fuente y tarjetas"
            className="px-2.5 py-1.5 rounded-xl bg-surface hover:bg-surface-hover text-text-secondary hover:text-white border border-surface-border text-xs font-bold"
          >
            {cardSize === 'normal' ? 'Vista Grande' : 'Vista Normal'}
          </button>

          {/* Toggle de Alarma Sonora */}
          <button
            onClick={() => {
              setSoundEnabled(!soundEnabled);
              if (!soundEnabled) playKitchenChime();
            }}
            title={soundEnabled ? 'Silenciar alarma de comandera' : 'Activar alarma de comandera'}
            className={`w-9 h-9 rounded-xl border flex items-center justify-center transition-colors ${
              soundEnabled
                ? 'bg-brand-amber/15 border-brand-amber text-brand-amber'
                : 'bg-surface border-surface-border text-text-muted hover:text-white'
            }`}
          >
            {soundEnabled ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4" />}
          </button>

          {/* Pantalla Completa */}
          <button
            onClick={toggleFullscreen}
            title="Modo pantalla completa KDS"
            className="w-9 h-9 rounded-xl bg-surface hover:bg-surface-hover text-text-secondary hover:text-white flex items-center justify-center border border-surface-border"
          >
            {isFullscreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
          </button>

          {/* Refrescar */}
          <button
            onClick={fetchKitchenOrders}
            className="w-9 h-9 rounded-xl bg-surface hover:bg-surface-hover text-text-secondary hover:text-white flex items-center justify-center border border-surface-border"
          >
            <RefreshCw className={`w-4 h-4 text-brand-blue ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {/* PANEL DESPLEGABLE: RESUMEN CONSOLIDADO DE PRODUCCIÓN (BATCHING) */}
      {showProductionSummary && productionSummary.length > 0 && (
        <div className="p-4 bg-surface border border-brand-amber/40 rounded-2xl shadow-xl flex flex-col gap-3 animate-in slide-in-from-top-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-brand-amber font-black text-sm uppercase tracking-wider">
              <Flame className="w-5 h-5" />
              <span>Platos totales marchando ahora en cocina:</span>
            </div>
            <span className="text-xs text-text-secondary">Cocinar en tandas</span>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-2.5">
            {productionSummary.map((item) => (
              <div
                key={item.name}
                className="p-3 bg-surface-subtle border border-surface-border rounded-xl flex flex-col justify-between"
              >
                <div className="flex items-start justify-between gap-1">
                  <span className="font-extrabold text-sm text-white leading-tight">
                    {item.name}
                  </span>
                  <span className="w-7 h-7 rounded-lg bg-brand-amber text-black font-black text-sm flex items-center justify-center flex-shrink-0">
                    {item.quantity}x
                  </span>
                </div>
                {item.notes.length > 0 && (
                  <p className="mt-1 text-[10px] text-brand-amber italic truncate">
                    {item.notes.join(', ')}
                  </p>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Grid de Comandas KDS */}
      {orders.length === 0 ? (
        <div className="py-24 text-center bg-surface border border-dashed border-surface-border rounded-2xl flex flex-col items-center">
          <CheckCircle2 className="w-16 h-16 text-brand-success mb-3 animate-pulse" />
          <h2 className="text-2xl font-black text-white">¡Cocina al día!</h2>
          <p className="text-xs text-text-secondary mt-1">
            No hay platos pendientes de marcha. Cuando ingrese un pedido, sonará la campana automáticamente.
          </p>
        </div>
      ) : (
        <div className={`grid gap-4 ${
          cardSize === 'large'
            ? 'grid-cols-1 md:grid-cols-2 xl:grid-cols-3'
            : 'grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4'
        }`}>
          {orders.map((order) => {
            const mins = minutesElapsed(order.created_at);
            const isCritical = mins >= 18;
            const isWarning = mins >= 10 && mins < 18;

            // Verificar si todos los items de la orden están tachados individualmente
            const allItemsChecked =
              (order.items || []).length > 0 &&
              (order.items || []).every((it) => checkedItemIds[it.id]);

            return (
              <div
                key={order.id}
                className={`bg-surface rounded-2xl border flex flex-col justify-between shadow-xl overflow-hidden transition-all ${
                  isCritical
                    ? 'border-brand-danger shadow-brand-danger/10 ring-2 ring-brand-danger'
                    : isWarning
                    ? 'border-brand-amber shadow-brand-amber/10 ring-1 ring-brand-amber'
                    : 'border-surface-border'
                }`}
              >
                {/* Cabecera de la Comanda con Timer */}
                <div className={`p-4 flex items-center justify-between border-b ${
                  isCritical
                    ? 'bg-brand-danger/20 border-brand-danger/30 text-white'
                    : isWarning
                    ? 'bg-brand-amber/20 border-brand-amber/30 text-white'
                    : 'bg-surface-subtle border-surface-border text-white'
                }`}>
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="font-black text-xl tracking-tight">
                        {order.channel === 'salon' ? order.table_label || 'Mesa' : order.channel === 'delivery' ? '🛵 Delivery' : '🛍️ Take Away'}
                      </h3>
                      {order.channel === 'salon' && orders.some((o) => o.id !== order.id && o.table_id === order.table_id) && (
                        <span className="px-2 py-0.5 rounded-full bg-brand-amber/25 border border-brand-amber/40 text-brand-amber text-[10px] font-black uppercase tracking-wider animate-pulse">
                          Tanda extra
                        </span>
                      )}
                    </div>
                    <span className="text-xs font-mono opacity-80">
                      #{order.id.slice(-4).toUpperCase()} · {formatTime(order.created_at)}
                    </span>
                  </div>

                  <div className={`px-3 py-1 rounded-xl text-xs font-black flex items-center gap-1.5 ${
                    isCritical
                      ? 'bg-brand-danger text-white animate-pulse'
                      : isWarning
                      ? 'bg-brand-amber text-black'
                      : 'bg-surface-hover text-white'
                  }`}>
                    <Clock className="w-4 h-4" />
                    <span>{mins} min</span>
                  </div>
                </div>

                {/* Lista de Ítems interactivos (Tachado al toque) */}
                <div className="p-4 flex-1 flex flex-col gap-2.5 select-none">
                  <span className="text-[10px] uppercase font-bold text-text-muted">
                    Tocá cada plato al sacarlo de la cocina:
                  </span>

                  {(order.items || []).map((item) => {
                    const isChecked = Boolean(checkedItemIds[item.id]);

                    return (
                      <div
                        key={item.id}
                        onClick={() => toggleItemCheck(item.id)}
                        className={`p-3 rounded-xl border cursor-pointer transition-all flex flex-col gap-1 active:scale-98 ${
                          isChecked
                            ? 'bg-brand-success/15 border-brand-success/50 line-through text-text-muted'
                            : 'bg-surface-subtle border-surface-border/70 hover:border-brand-amber text-white'
                        }`}
                      >
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex items-start gap-2.5">
                            <span className={`w-8 h-8 rounded-lg font-black text-sm flex items-center justify-center flex-shrink-0 ${
                              isChecked
                                ? 'bg-brand-success text-white'
                                : 'bg-brand-blue/20 text-brand-blue'
                            }`}>
                              {isChecked ? '✓' : `${item.quantity}x`}
                            </span>
                            <span className={`font-extrabold leading-snug ${
                              cardSize === 'large' ? 'text-lg' : 'text-base'
                            } ${isChecked ? 'text-text-muted' : 'text-white'}`}>
                              {item.name_snapshot}
                            </span>
                          </div>

                          <span className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded ${
                            isChecked ? 'bg-brand-success/20 text-brand-success' : 'text-text-muted'
                          }`}>
                            {isChecked ? 'Hecho' : 'Marchando'}
                          </span>
                        </div>

                        {item.notes && (
                          <div className="mt-1 px-2.5 py-1 bg-brand-amber/15 rounded-lg border border-brand-amber/30 text-brand-amber font-black text-xs">
                            ⚠️ Aclaración: {item.notes}
                          </div>
                        )}
                      </div>
                    );
                  })}

                  {order.notes && (
                    <div className="mt-1 p-2.5 bg-brand-amber/10 border border-brand-amber/30 rounded-xl text-xs text-brand-amber font-bold">
                      Nota comensal: {order.notes}
                    </div>
                  )}
                </div>

                {/* Botón de Un Toque: "LISTO PARA SERVIR" */}
                <div className="p-4 pt-2 border-t border-surface-border bg-surface-subtle">
                  <button
                    onClick={() => handleMarkReady(order.id)}
                    disabled={completingId === order.id}
                    className={`w-full py-4 px-4 text-white font-black text-base rounded-xl shadow-lg flex items-center justify-center gap-2 transition-all active:scale-98 disabled:opacity-50 ${
                      allItemsChecked
                        ? 'bg-brand-success hover:bg-emerald-600 ring-2 ring-brand-success animate-pulse shadow-brand-success/30'
                        : 'bg-brand-success hover:bg-emerald-600 shadow-brand-success/20'
                    }`}
                  >
                    <Check className="w-6 h-6 stroke-[3]" />
                    <span>
                      {allItemsChecked ? '✓ LISTO COMPLETO PARA SERVIR' : 'LISTO PARA SERVIR'}
                    </span>
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* HISTORIAL INFERIOR DE DESPACHOS RECIENTES (CON DESHACER) */}
      {recentReadyOrders.length > 0 && (
        <div className="mt-6 border-t border-surface-border pt-4 flex flex-col gap-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-text-muted uppercase">
              Recién despachados ({recentReadyOrders.length})
            </span>
            <button
              onClick={() => setShowRecentHistory(!showRecentHistory)}
              className="text-xs text-brand-blue font-bold hover:underline"
            >
              {showRecentHistory ? 'Ocultar historial' : 'Ver y recuperar comanda'}
            </button>
          </div>

          {showRecentHistory && (
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-2.5 animate-in slide-in-from-bottom-2">
              {recentReadyOrders.map((ord) => (
                <div
                  key={ord.id}
                  className="p-3 bg-surface border border-surface-border rounded-xl flex items-center justify-between text-xs"
                >
                  <div>
                    <span className="font-bold text-white block">
                      {ord.table_label || 'Salón'} · #{ord.id.slice(-4).toUpperCase()}
                    </span>
                    <span className="text-[11px] text-text-muted">
                      {ord.items?.length || 0} platos despachados
                    </span>
                  </div>

                  <button
                    onClick={() => handleUndoReady(ord.id)}
                    title="Devolver a cocina si se marcó por error"
                    className="px-2.5 py-1.5 bg-surface-hover hover:bg-brand-amber/20 text-text-secondary hover:text-brand-amber rounded-lg border border-surface-border text-xs font-bold flex items-center gap-1 transition-colors"
                  >
                    <Undo2 className="w-3.5 h-3.5" />
                    <span>Deshacer</span>
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
