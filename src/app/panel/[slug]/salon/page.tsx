'use client';

import { useState, useEffect, use, useMemo, useRef } from 'react';
import {
  BellRing, ReceiptText, CheckCircle2, Clock, ChefHat, Bike,
  Utensils, Check, AlertCircle, RefreshCw, XCircle, ArrowRight,
  Volume2, VolumeX, Printer, Search, LayoutGrid, ListOrdered,
  X, Sparkles, Filter, ChevronRight, User
} from 'lucide-react';
import { Order, OrderStatus, OrderChannel, Call, Table } from '@/lib/types';
import { formatPrice, formatTime, minutesElapsed } from '@/lib/formatters';
import { playWaiterChime, playSuccessChime } from '@/lib/sound';

interface PageProps {
  params: Promise<{ slug: string }>;
}

export default function SalonPanelPage({ params }: PageProps) {
  const { slug } = use(params);

  const [orders, setOrders] = useState<Order[]>([]);
  const [calls, setCalls] = useState<Call[]>([]);
  const [tables, setTables] = useState<Table[]>([]);
  const [viewMode, setViewMode] = useState<'orders' | 'tables'>('orders');
  const [channelFilter, setChannelFilter] = useState<'all' | OrderChannel>('all');
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'ready' | 'delivered'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [updatingId, setUpdatingId] = useState<string | null>(null);
  const [soundEnabled, setSoundEnabled] = useState(true);

  // Modales
  const [ticketOrder, setTicketOrder] = useState<Order | null>(null);
  const [selectedTable, setSelectedTable] = useState<{ table: Table; order?: Order; orders?: Order[]; call?: Call } | null>(null);
  const [cancelModalOrder, setCancelModalOrder] = useState<Order | null>(null);

  // Registro de alertas para sonido
  const prevCallsCount = useRef(0);
  const prevReadyCount = useRef(0);

  const fetchData = async () => {
    try {
      // 1. Pedidos activos
      const ordRes = await fetch(`/api/orders?merchantSlug=${slug}`);
      if (ordRes.ok) {
        const ordData = await ordRes.json();
        const newOrders: Order[] = ordData.orders || [];
        setOrders(newOrders);

        // Detectar si hay nuevos platos listos para servir
        const readyCount = newOrders.filter((o) => o.status === 'ready').length;
        if (readyCount > prevReadyCount.current && soundEnabled) {
          playSuccessChime();
        }
        prevReadyCount.current = readyCount;
      }

      // 2. Llamados abiertos
      const callRes = await fetch(`/api/calls?merchantSlug=${slug}`);
      if (callRes.ok) {
        const callData = await callRes.json();
        const newCalls: Call[] = callData.calls || [];
        setCalls(newCalls);

        // Si entró una nueva alerta de mozo o cuenta, sonar campana
        if (newCalls.length > prevCallsCount.current && soundEnabled) {
          playWaiterChime();
        }
        prevCallsCount.current = newCalls.length;
      }

      // 3. Mesas del local
      const tableRes = await fetch(`/api/tables?merchantSlug=${slug}`);
      if (tableRes.ok) {
        const tableData = await tableRes.json();
        setTables(tableData.tables || []);
      }
    } catch {} finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, 3000);
    return () => clearInterval(interval);
  }, [slug, soundEnabled]);

  // Actualizar estado de pedido
  const handleUpdateStatus = async (orderId: string, status: OrderStatus) => {
    setUpdatingId(orderId);
    try {
      await fetch('/api/orders', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ orderId, status, merchantSlug: slug }),
      });
      if (status === 'ready' && soundEnabled) {
        playSuccessChime();
      }
      await fetchData();
      if (selectedTable?.order?.id === orderId) {
        setSelectedTable(null);
      }
    } catch {} finally {
      setUpdatingId(null);
    }
  };

  // Resolver llamado de mozo o cuenta
  const handleResolveCall = async (callId: string) => {
    try {
      await fetch('/api/calls', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ callId, merchantSlug: slug }),
      });
      await fetchData();
      if (selectedTable?.call?.id === callId) {
        setSelectedTable(null);
      }
    } catch {}
  };

  // Cancelar comanda
  const handleCancelOrder = async (orderId: string) => {
    try {
      await handleUpdateStatus(orderId, 'cancelled');
      setCancelModalOrder(null);
    } catch {}
  };

  // Imprimir ticket consolidado de la mesa (todas las tandas)
  const handlePrintTableTicket = (tableOrders: Order[], table: Table) => {
    if (tableOrders.length === 0) return;
    const combinedItems = tableOrders.flatMap((o) => o.items || []);
    const totalCents = tableOrders.reduce((sum, o) => sum + o.total_cents, 0);
    const subtotalCents = tableOrders.reduce((sum, o) => sum + o.subtotal_cents, 0);
    const consolidatedOrder: Order = {
      ...tableOrders[0],
      id: `MESA-${table.label || table.number || 'SALON'}`,
      items: combinedItems,
      total_cents: totalCents,
      subtotal_cents: subtotalCents,
    };
    setTicketOrder(consolidatedOrder);
    setSelectedTable(null);
  };

  // Cerrar todas las comandas de una mesa
  const handleCloseAllTableOrders = async (tableOrders: Order[]) => {
    for (const o of tableOrders) {
      await handleUpdateStatus(o.id, 'closed');
    }
    setSelectedTable(null);
  };

  // Filtrado de pedidos
  const filteredOrders = useMemo(() => {
    return orders.filter((o) => {
      const matchChannel = channelFilter === 'all' || o.channel === channelFilter;
      const matchStatus =
        statusFilter === 'all'
          ? true
          : statusFilter === 'active'
          ? o.status === 'confirmed' || o.status === 'in_kitchen'
          : statusFilter === 'ready'
          ? o.status === 'ready'
          : o.status === 'delivered';

      const matchSearch =
        !searchQuery ||
        (o.table_label && o.table_label.toLowerCase().includes(searchQuery.toLowerCase())) ||
        (o.customer_name && o.customer_name.toLowerCase().includes(searchQuery.toLowerCase())) ||
        o.id.toLowerCase().includes(searchQuery.toLowerCase());

      return matchChannel && matchStatus && matchSearch;
    });
  }, [orders, channelFilter, statusFilter, searchQuery]);

  // Agrupamiento de mesas por zona
  const tablesByZone = useMemo(() => {
    const map = new Map<string, Table[]>();
    tables.forEach((t) => {
      const zone = t.zone || 'Salón Principal';
      if (!map.has(zone)) map.set(zone, []);
      map.get(zone)!.push(t);
    });
    return Array.from(map.entries());
  }, [tables]);

  // Contadores clave
  const readyOrdersCount = orders.filter((o) => o.status === 'ready').length;
  const kitchenOrdersCount = orders.filter((o) => o.status === 'in_kitchen' || o.status === 'confirmed').length;

  return (
    <div className="flex flex-col gap-5">
      {/* Barra de Control Principal de Salón */}
      <div className="bg-surface border border-surface-border rounded-2xl p-4 flex flex-col md:flex-row md:items-center justify-between gap-4 shadow-sm">
        <div className="flex items-center gap-3">
          <div className="w-11 h-11 rounded-2xl bg-brand-blue/15 text-brand-blue flex items-center justify-center flex-shrink-0">
            <Utensils className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl font-black text-white">Gestión de Salón</h1>
              <span className="w-2 h-2 rounded-full bg-brand-success animate-pulse" />
            </div>
            <p className="text-xs text-text-secondary">
              Mesas activas, pedidos en cocina y alertas de mozo en tiempo real
            </p>
          </div>
        </div>

        {/* KPIs y Switches Rápidos */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Badge Listos para Servir (Urgente) */}
          {readyOrdersCount > 0 && (
            <button
              onClick={() => {
                setViewMode('orders');
                setStatusFilter('ready');
              }}
              className="px-3 py-1.5 rounded-xl bg-brand-success/20 border border-brand-success text-brand-success text-xs font-black flex items-center gap-1.5 animate-bounce"
            >
              <CheckCircle2 className="w-4 h-4" />
              <span>{readyOrdersCount} {readyOrdersCount === 1 ? 'listo para servir' : 'listos para servir'}</span>
            </button>
          )}

          {/* Selector de Vista: Comandas vs Plano de Mesas */}
          <div className="flex p-1 bg-surface-subtle border border-surface-border rounded-xl">
            <button
              onClick={() => setViewMode('orders')}
              className={`px-3 py-1.5 rounded-lg text-xs font-extrabold flex items-center gap-1.5 transition-all ${
                viewMode === 'orders'
                  ? 'bg-brand-blue text-white shadow-sm'
                  : 'text-text-secondary hover:text-white'
              }`}
            >
              <ListOrdered className="w-4 h-4" />
              <span>Comandas ({orders.length})</span>
            </button>
            <button
              onClick={() => setViewMode('tables')}
              className={`px-3 py-1.5 rounded-lg text-xs font-extrabold flex items-center gap-1.5 transition-all ${
                viewMode === 'tables'
                  ? 'bg-brand-blue text-white shadow-sm'
                  : 'text-text-secondary hover:text-white'
              }`}
            >
              <LayoutGrid className="w-4 h-4" />
              <span>Plano de Mesas ({tables.length})</span>
            </button>
          </div>

          {/* Toggle de Sonido */}
          <button
            onClick={() => {
              setSoundEnabled(!soundEnabled);
              if (!soundEnabled) playWaiterChime();
            }}
            title={soundEnabled ? 'Silenciar avisos sonoros' : 'Activar avisos sonoros'}
            className={`w-9 h-9 rounded-xl border flex items-center justify-center transition-colors ${
              soundEnabled
                ? 'bg-brand-blue/15 border-brand-blue text-brand-blue'
                : 'bg-surface border-surface-border text-text-muted hover:text-white'
            }`}
          >
            {soundEnabled ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4" />}
          </button>

          {/* Refrescar */}
          <button
            onClick={fetchData}
            title="Refrescar en vivo"
            className="w-9 h-9 rounded-xl bg-surface hover:bg-surface-hover text-text-secondary hover:text-white flex items-center justify-center border border-surface-border transition-colors"
          >
            <RefreshCw className={`w-4 h-4 text-brand-blue ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {/* Alertas Superiores: Llamados al Mozo y Cuentas Solicitadas */}
      {calls.length > 0 && (
        <div className="flex flex-col gap-2">
          <span className="text-xs font-black uppercase tracking-wider text-brand-amber flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-brand-amber animate-ping" />
            Alertas de mesas en vivo ({calls.length})
          </span>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {calls.map((call) => {
              const isBill = call.type === 'bill';
              const mins = minutesElapsed(call.created_at);
              return (
                <div
                  key={call.id}
                  className={`p-3.5 rounded-2xl border flex items-center justify-between gap-3 shadow-lg animate-in slide-in-from-top-2 duration-200 ${
                    isBill
                      ? 'bg-brand-blue/15 border-brand-blue text-white'
                      : 'bg-brand-amber/15 border-brand-amber text-white'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 ${
                      isBill ? 'bg-brand-blue text-white' : 'bg-brand-amber text-black'
                    }`}>
                      {isBill ? <ReceiptText className="w-5 h-5" /> : <BellRing className="w-5 h-5" />}
                    </div>
                    <div>
                      <h4 className="font-extrabold text-sm">
                        {call.table_label || 'Mesa'} · {isBill ? 'Pidió la cuenta' : 'Llamó al mozo'}
                      </h4>
                      <p className="text-[11px] text-text-secondary">
                        Hace {mins} min ({formatTime(call.created_at)})
                      </p>
                    </div>
                  </div>

                  <button
                    onClick={() => handleResolveCall(call.id)}
                    className="px-3.5 py-2 bg-surface hover:bg-surface-hover text-white text-xs font-bold rounded-xl border border-surface-border transition-colors flex items-center gap-1.5 active:scale-95"
                  >
                    <Check className="w-4 h-4 text-brand-success" />
                    <span>Atendido</span>
                  </button>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* VISTA 1: COMANDAS / TARJETAS */}
      {viewMode === 'orders' && (
        <div className="flex flex-col gap-4">
          {/* Barra de Filtros y Buscador */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-surface-border">
            {/* Canales */}
            <div className="flex flex-wrap items-center gap-1.5">
              <button
                onClick={() => setChannelFilter('all')}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
                  channelFilter === 'all'
                    ? 'bg-brand-blue text-white shadow-sm'
                    : 'bg-surface hover:bg-surface-hover text-text-secondary border border-surface-border'
                }`}
              >
                Todos ({orders.length})
              </button>
              <button
                onClick={() => setChannelFilter('salon')}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
                  channelFilter === 'salon'
                    ? 'bg-brand-blue text-white shadow-sm'
                    : 'bg-surface hover:bg-surface-hover text-text-secondary border border-surface-border'
                }`}
              >
                Salón ({orders.filter((o) => o.channel === 'salon').length})
              </button>
              <button
                onClick={() => setChannelFilter('delivery')}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
                  channelFilter === 'delivery'
                    ? 'bg-brand-blue text-white shadow-sm'
                    : 'bg-surface hover:bg-surface-hover text-text-secondary border border-surface-border'
                }`}
              >
                Delivery ({orders.filter((o) => o.channel === 'delivery').length})
              </button>
              <button
                onClick={() => setChannelFilter('takeaway')}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
                  channelFilter === 'takeaway'
                    ? 'bg-brand-blue text-white shadow-sm'
                    : 'bg-surface hover:bg-surface-hover text-text-secondary border border-surface-border'
                }`}
              >
                Take Away ({orders.filter((o) => o.channel === 'takeaway').length})
              </button>
            </div>

            {/* Buscador */}
            <div className="relative w-full sm:w-64">
              <Search className="absolute left-3 top-2.5 w-4 h-4 text-text-muted" />
              <input
                type="text"
                placeholder="Buscar mesa o comensal..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-3 py-1.5 bg-surface border border-surface-border rounded-xl text-xs text-white placeholder:text-text-muted outline-none focus:border-brand-blue"
              />
            </div>
          </div>

          {/* Grilla de Comandas */}
          {filteredOrders.length === 0 ? (
            <div className="py-20 text-center bg-surface border border-dashed border-surface-border rounded-2xl flex flex-col items-center">
              <CheckCircle2 className="w-12 h-12 text-brand-success mb-3" />
              <h3 className="text-lg font-bold text-white">¡Todo al día en el salón!</h3>
              <p className="text-xs text-text-secondary mt-1">
                No hay pedidos con los filtros seleccionados. Los nuevos pedidos ingresarán automáticamente aquí.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredOrders.map((order) => {
                const mins = minutesElapsed(order.created_at);
                const isLate = mins > 20;
                const isReady = order.status === 'ready';

                return (
                  <div
                    key={order.id}
                    className={`bg-surface border rounded-2xl p-4 shadow-sm flex flex-col justify-between gap-4 transition-all ${
                      isReady
                        ? 'border-brand-success ring-1 ring-brand-success/50 bg-brand-success/5'
                        : isLate
                        ? 'border-brand-danger/60'
                        : 'border-surface-border hover:border-surface-hover'
                    }`}
                  >
                    {/* Cabecera del pedido */}
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-extrabold text-base text-white">
                            {order.channel === 'salon' ? order.table_label || 'Mesa' : order.channel === 'delivery' ? '🛵 Delivery' : '🛍️ Retiro'}
                          </span>
                          <span className="text-[11px] font-mono text-text-muted">
                            #{order.id.slice(-4).toUpperCase()}
                          </span>
                        </div>
                        <p className="text-xs text-text-secondary mt-0.5">
                          {order.customer_name || 'Comensal'} {order.customer_phone ? `· ${order.customer_phone}` : ''}
                        </p>
                      </div>

                      {/* Timer y Estado */}
                      <div className="flex flex-col items-end gap-1">
                        <div className={`px-2 py-0.5 rounded-full text-[11px] font-black flex items-center gap-1 ${
                          isReady
                            ? 'bg-brand-success text-white animate-pulse'
                            : isLate
                            ? 'bg-brand-danger/20 text-brand-danger animate-pulse'
                            : 'bg-surface-hover text-text-secondary'
                        }`}>
                          <Clock className="w-3 h-3" />
                          <span>{mins} min</span>
                        </div>

                        <span className={`px-2 py-0.5 rounded-md text-[10px] font-bold uppercase tracking-wider ${
                          order.status === 'confirmed'
                            ? 'bg-blue-500/20 text-blue-400'
                            : order.status === 'in_kitchen'
                            ? 'bg-amber-500/20 text-amber-400'
                            : order.status === 'ready'
                            ? 'bg-emerald-500/20 text-emerald-400'
                            : 'bg-purple-500/20 text-purple-400'
                        }`}>
                          {order.status === 'confirmed' && 'Confirmado'}
                          {order.status === 'in_kitchen' && 'En cocina'}
                          {order.status === 'ready' && 'Listo para servir'}
                          {order.status === 'delivered' && 'Entregado'}
                        </span>
                      </div>
                    </div>

                    {/* Ítems del Pedido */}
                    <div className="p-3 bg-surface-subtle rounded-xl border border-surface-border/50 flex flex-col gap-1.5 text-xs">
                      {(order.items || []).map((it) => (
                        <div key={it.id} className="flex justify-between items-start gap-2">
                          <div>
                            <span className="font-bold text-white">{it.quantity}x</span>{' '}
                            <span className="text-text-primary">{it.name_snapshot}</span>
                            {it.notes && (
                              <p className="text-[10px] text-brand-amber pl-4">↳ {it.notes}</p>
                            )}
                          </div>
                          <span className="tabular-nums text-text-muted font-medium">
                            {formatPrice(it.unit_price_cents * it.quantity)}
                          </span>
                        </div>
                      ))}

                      {order.notes && (
                        <div className="mt-1 pt-1.5 border-t border-surface-border text-[11px] text-brand-amber font-semibold">
                          Nota pedido: {order.notes}
                        </div>
                      )}

                      {order.delivery_address && (
                        <div className="mt-1 text-[11px] text-brand-blue truncate">
                          📍 {order.delivery_address}
                        </div>
                      )}
                    </div>

                    {/* Fila Inferior: Total y Acciones */}
                    <div className="pt-2 border-t border-surface-border flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <div>
                          <span className="text-[10px] text-text-muted uppercase block">Total</span>
                          <span className="tabular-nums font-black text-sm text-white">
                            {formatPrice(order.total_cents)}
                          </span>
                        </div>
                        {/* Botón Imprimir Comanda */}
                        <button
                          onClick={() => setTicketOrder(order)}
                          title="Imprimir comanda / pre-ticket"
                          className="w-8 h-8 rounded-lg bg-surface-subtle hover:bg-surface-hover text-text-secondary hover:text-white flex items-center justify-center border border-surface-border"
                        >
                          <Printer className="w-3.5 h-3.5" />
                        </button>
                      </div>

                      {/* Botones de Acción de Estado */}
                      <div className="flex items-center gap-1.5">
                        {order.status === 'confirmed' && (
                          <button
                            onClick={() => handleUpdateStatus(order.id, 'in_kitchen')}
                            disabled={updatingId === order.id}
                            className="px-3 py-1.5 bg-brand-amber hover:bg-brand-amber-hover text-black font-extrabold text-xs rounded-xl shadow-sm transition-all flex items-center gap-1"
                          >
                            <ChefHat className="w-3.5 h-3.5" />
                            <span>Mandar a Cocina</span>
                          </button>
                        )}

                        {order.status === 'in_kitchen' && (
                          <button
                            onClick={() => handleUpdateStatus(order.id, 'ready')}
                            disabled={updatingId === order.id}
                            className="px-3 py-1.5 bg-brand-blue hover:bg-brand-blue-hover text-white font-bold text-xs rounded-xl shadow-sm transition-all flex items-center gap-1"
                          >
                            <Check className="w-3.5 h-3.5" />
                            <span>Marcar Listo</span>
                          </button>
                        )}

                        {order.status === 'ready' && (
                          <button
                            onClick={() => handleUpdateStatus(order.id, 'delivered')}
                            disabled={updatingId === order.id}
                            className="px-3 py-1.5 bg-brand-success hover:bg-emerald-600 text-white font-black text-xs rounded-xl shadow-sm transition-all flex items-center gap-1.5 animate-pulse"
                          >
                            <CheckCircle2 className="w-4 h-4" />
                            <span>Servido a la Mesa</span>
                          </button>
                        )}

                        {order.status === 'delivered' && (
                          <button
                            onClick={() => handleUpdateStatus(order.id, 'closed')}
                            disabled={updatingId === order.id}
                            className="px-3 py-1.5 bg-surface-hover hover:bg-surface text-text-primary font-bold text-xs rounded-xl border border-surface-border transition-all flex items-center gap-1"
                          >
                            <span>Cerrar Cuenta</span>
                          </button>
                        )}

                        {/* Botón Cancelar Comanda */}
                        <button
                          onClick={() => setCancelModalOrder(order)}
                          title="Cancelar comanda"
                          className="w-8 h-8 rounded-lg bg-surface-subtle hover:bg-brand-danger/20 text-text-muted hover:text-brand-danger flex items-center justify-center border border-surface-border transition-colors"
                        >
                          <XCircle className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* VISTA 2: PLANO DE MESAS EN VIVO */}
      {viewMode === 'tables' && (
        <div className="flex flex-col gap-6">
          {tablesByZone.map(([zoneName, zoneTables]) => (
            <div key={zoneName} className="flex flex-col gap-3">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-extrabold uppercase tracking-wider text-text-secondary flex items-center gap-2">
                  <span>{zoneName}</span>
                  <span className="text-[11px] font-normal text-text-muted">({zoneTables.length} mesas)</span>
                </h3>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
                {zoneTables.map((table) => {
                  // Buscar TODOS los pedidos activos en esta mesa
                  const tableOrders = orders.filter(
                    (o) => o.table_id === table.id && o.status !== 'closed' && o.status !== 'cancelled'
                  );
                  const tableOrder = tableOrders[0];
                  const totalTableCents = tableOrders.reduce((sum, o) => sum + o.total_cents, 0);
                  const totalTableItems = tableOrders.reduce((sum, o) => sum + (o.items?.length || 0), 0);
                  const isAnyReady = tableOrders.some((o) => o.status === 'ready');
                  // Buscar llamado activo en esta mesa
                  const tableCall = calls.find((c) => c.table_id === table.id);

                  const isOccupied = tableOrders.length > 0;
                  const isReady = isAnyReady;
                  const hasCall = Boolean(tableCall);
                  const isBill = tableCall?.type === 'bill';

                  return (
                    <div
                      key={table.id}
                      onClick={() => setSelectedTable({ table, order: tableOrder, orders: tableOrders, call: tableCall })}
                      className={`p-4 rounded-2xl border cursor-pointer transition-all flex flex-col justify-between min-h-[130px] shadow-sm select-none active:scale-98 ${
                        hasCall
                          ? isBill
                            ? 'bg-brand-blue/20 border-brand-blue ring-2 ring-brand-blue animate-pulse'
                            : 'bg-brand-amber/20 border-brand-amber ring-2 ring-brand-amber animate-pulse'
                          : isReady
                          ? 'bg-brand-success/15 border-brand-success ring-2 ring-brand-success'
                          : isOccupied
                          ? 'bg-surface border-brand-blue/40 hover:border-brand-blue'
                          : 'bg-surface/50 border-surface-border hover:border-surface-hover opacity-80'
                      }`}
                    >
                      {/* Top mesa */}
                      <div className="flex items-center justify-between">
                        <span className="font-black text-base text-white">
                          {table.label}
                        </span>
                        {hasCall ? (
                          <span className={`p-1 rounded-lg text-xs font-black ${
                            isBill ? 'bg-brand-blue text-white' : 'bg-brand-amber text-black'
                          }`}>
                            {isBill ? <ReceiptText className="w-3.5 h-3.5" /> : <BellRing className="w-3.5 h-3.5" />}
                          </span>
                        ) : isReady ? (
                          <span className="px-1.5 py-0.5 rounded-full bg-brand-success text-white text-[10px] font-black">
                            ¡Listo!
                          </span>
                        ) : (
                          <span className={`w-2.5 h-2.5 rounded-full ${isOccupied ? 'bg-brand-blue animate-pulse' : 'bg-surface-border'}`} />
                        )}
                      </div>

                      {/* Info Centro */}
                      <div className="py-2">
                        {isOccupied && tableOrder ? (
                          <div className="flex flex-col gap-0.5">
                            <div className="flex items-center justify-between gap-1">
                              <span className="text-xs font-bold text-text-primary truncate">
                                {tableOrder.customer_name || 'Comensal'}
                              </span>
                              {tableOrders.length > 1 && (
                                <span className="px-1.5 py-0.2 bg-brand-amber/20 text-brand-amber font-extrabold text-[10px] rounded whitespace-nowrap">
                                  {tableOrders.length} comandas
                                </span>
                              )}
                            </div>
                            <span className="tabular-nums text-xs font-black text-brand-blue">
                              {formatPrice(totalTableCents)}
                            </span>
                            <span className="text-[10px] text-text-muted">
                              {totalTableItems} platos totales · {minutesElapsed(tableOrder.created_at)} min
                            </span>
                          </div>
                        ) : (
                          <span className="text-xs font-semibold text-text-muted">
                            Mesa libre
                          </span>
                        )}
                      </div>

                      {/* Footer mesa */}
                      <div className="pt-2 border-t border-surface-border/50 flex items-center justify-between text-[11px]">
                        <span className="text-text-muted">Cap. {table.number || 4}p</span>
                        <ChevronRight className="w-3.5 h-3.5 text-text-muted" />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* DRAWER / MODAL DE DETALLE DE MESA SELECCIONADA */}
      {selectedTable && (
        <div
          className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/80 backdrop-blur-sm p-0 sm:p-4 animate-in fade-in duration-150"
          onClick={() => setSelectedTable(null)}
        >
          <div
            className="w-full sm:max-w-md bg-surface border border-surface-border rounded-t-3xl sm:rounded-2xl p-5 shadow-2xl flex flex-col gap-4 text-white overflow-hidden max-h-[85vh] animate-in slide-in-from-bottom-4 duration-200"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header Modal Mesa */}
            <div className="flex items-center justify-between border-b border-surface-border pb-3">
              <div className="flex items-center gap-2.5">
                <div className="w-10 h-10 rounded-xl bg-brand-blue/20 text-brand-blue flex items-center justify-center font-black">
                  {selectedTable.table.number || 'M'}
                </div>
                <div>
                  <h3 className="font-extrabold text-base">{selectedTable.table.label}</h3>
                  <p className="text-xs text-text-secondary">{selectedTable.table.zone || 'Salón'}</p>
                </div>
              </div>
              <button
                onClick={() => setSelectedTable(null)}
                className="w-9 h-9 rounded-full bg-surface-subtle text-text-secondary hover:text-white flex items-center justify-center"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Alerta de Mozo/Cuenta si existe */}
            {selectedTable.call && (
              <div className="p-3 bg-brand-amber/15 border border-brand-amber/40 rounded-xl flex items-center justify-between text-xs">
                <div className="flex items-center gap-2">
                  <BellRing className="w-4 h-4 text-brand-amber" />
                  <span className="font-bold text-brand-amber">
                    {selectedTable.call.type === 'bill' ? 'Pidió la cuenta' : 'Llamó al mozo'}
                  </span>
                </div>
                <button
                  onClick={() => handleResolveCall(selectedTable.call!.id)}
                  className="px-2.5 py-1 bg-brand-amber text-black font-extrabold rounded-lg text-xs"
                >
                  Atendido
                </button>
              </div>
            )}

            {/* Pedidos Activos de la Mesa (Soporta múltiples comandas/tandas) */}
            {(() => {
              const tableOrders = selectedTable.orders && selectedTable.orders.length > 0
                ? selectedTable.orders
                : selectedTable.order
                ? [selectedTable.order]
                : [];

              if (tableOrders.length === 0) {
                return (
                  <div className="py-8 text-center text-xs text-text-muted">
                    La mesa está libre actualmente. Cuando el comensal escanee el QR y pida, aparecerá aquí.
                  </div>
                );
              }

              const totalConsolidado = tableOrders.reduce((sum, o) => sum + o.total_cents, 0);
              const allDelivered = tableOrders.every((o) => o.status === 'delivered' || o.status === 'closed');

              return (
                <div className="flex flex-col gap-3 overflow-y-auto pr-1">
                  {/* Banner Consolidado si hay más de 1 pedido */}
                  {tableOrders.length > 1 && (
                    <div className="p-3 bg-brand-blue/15 border border-brand-blue/40 rounded-xl flex items-center justify-between text-xs">
                      <div>
                        <span className="font-extrabold text-white block">
                          Consumo Total ({tableOrders.length} comandas/tandas)
                        </span>
                        <span className="text-[11px] text-text-muted">
                          Mesa {selectedTable.table.label}
                        </span>
                      </div>
                      <span className="tabular-nums font-black text-brand-blue text-base">
                        {formatPrice(totalConsolidado)}
                      </span>
                    </div>
                  )}

                  {/* Listado de Comandas */}
                  {tableOrders.map((ord, idx) => (
                    <div key={ord.id} className="p-3 bg-surface-subtle rounded-xl border border-surface-border flex flex-col gap-2 text-xs">
                      <div className="flex justify-between items-center pb-1 border-b border-surface-border/50">
                        <div className="flex items-center gap-1.5">
                          <span className="font-black text-white">
                            Tanda #{idx + 1}
                          </span>
                          <span className="text-[11px] font-mono text-text-muted">
                            #{ord.id.slice(-4).toUpperCase()}
                          </span>
                          <span className="text-[10px] text-text-muted">
                            · {formatTime(ord.created_at)}
                          </span>
                        </div>

                        <span className={`px-2 py-0.5 rounded-md text-[10px] font-bold uppercase tracking-wider ${
                          ord.status === 'confirmed' ? 'bg-blue-500/20 text-blue-400' :
                          ord.status === 'in_kitchen' ? 'bg-amber-500/20 text-amber-400' :
                          ord.status === 'ready' ? 'bg-emerald-500/20 text-emerald-400 animate-pulse' :
                          'bg-purple-500/20 text-purple-400'
                        }`}>
                          {ord.status === 'confirmed' && 'Confirmado'}
                          {ord.status === 'in_kitchen' && 'En cocina'}
                          {ord.status === 'ready' && '¡Listo!'}
                          {ord.status === 'delivered' && 'Servido'}
                        </span>
                      </div>

                      <div className="flex flex-col gap-1">
                        {(ord.items || []).map((it) => (
                          <div key={it.id} className="flex justify-between items-center text-text-secondary">
                            <span><strong className="text-white">{it.quantity}x</strong> {it.name_snapshot}</span>
                            <span className="tabular-nums font-semibold">{formatPrice(it.unit_price_cents * it.quantity)}</span>
                          </div>
                        ))}
                      </div>

                      <div className="pt-2 border-t border-surface-border flex justify-between font-extrabold text-xs text-brand-blue">
                        <span>Subtotal comanda:</span>
                        <span className="tabular-nums">{formatPrice(ord.total_cents)}</span>
                      </div>

                      {/* Botón rápido por comanda */}
                      <div className="flex items-center gap-1.5 pt-1">
                        {ord.status === 'confirmed' && (
                          <button
                            onClick={() => handleUpdateStatus(ord.id, 'in_kitchen')}
                            className="flex-1 py-1.5 bg-brand-amber text-black font-extrabold rounded-lg text-xs"
                          >
                            Mandar a cocina
                          </button>
                        )}
                        {ord.status === 'ready' && (
                          <button
                            onClick={() => handleUpdateStatus(ord.id, 'delivered')}
                            className="flex-1 py-1.5 bg-brand-success text-white font-extrabold rounded-lg text-xs"
                          >
                            Servido a mesa
                          </button>
                        )}
                        {ord.status === 'delivered' && (
                          <button
                            onClick={() => handleUpdateStatus(ord.id, 'closed')}
                            className="flex-1 py-1.5 bg-surface-hover text-white font-bold rounded-lg text-xs border border-surface-border"
                          >
                            Cerrar comanda
                          </button>
                        )}
                      </div>
                    </div>
                  ))}

                  {/* Acciones Globales de la Mesa */}
                  <div className="grid grid-cols-2 gap-2 pt-2 border-t border-surface-border">
                    <button
                      onClick={() => handlePrintTableTicket(tableOrders, selectedTable.table)}
                      className="py-2.5 px-3 bg-surface hover:bg-surface-hover text-white rounded-xl border border-surface-border font-bold text-xs flex items-center justify-center gap-1.5"
                    >
                      <Printer className="w-4 h-4" />
                      <span>Ticket mesa</span>
                    </button>

                    {allDelivered ? (
                      <button
                        onClick={() => handleCloseAllTableOrders(tableOrders)}
                        className="py-2.5 px-3 bg-brand-blue hover:bg-brand-blue-hover text-white rounded-xl font-bold text-xs flex items-center justify-center gap-1.5 shadow-md"
                      >
                        <ReceiptText className="w-4 h-4" />
                        <span>Cerrar cuenta mesa</span>
                      </button>
                    ) : (
                      <button
                        onClick={() => handlePrintTableTicket(tableOrders, selectedTable.table)}
                        className="py-2.5 px-3 bg-surface-subtle text-text-secondary hover:text-white rounded-xl font-bold text-xs flex items-center justify-center gap-1.5 border border-surface-border"
                      >
                        <span>Pre-cuenta</span>
                      </button>
                    )}
                  </div>
                </div>
              );
            })()}
          </div>
        </div>
      )}

      {/* MODAL PRE-TICKET / COMANDA TÉRMICA */}
      {ticketOrder && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-in fade-in"
          onClick={() => setTicketOrder(null)}
        >
          <div
            className="w-full max-w-sm bg-white text-black p-6 rounded-2xl shadow-2xl flex flex-col gap-4 font-mono text-xs"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header Ticket */}
            <div className="text-center border-b border-black pb-3">
              <h2 className="font-black text-base uppercase">Comanda de Salón</h2>
              <p className="text-[11px] font-bold mt-1">MESA: {ticketOrder.table_label || 'SALÓN'}</p>
              <p className="text-[10px] text-neutral-600">
                Pedido #{ticketOrder.id.slice(-4).toUpperCase()} · {formatTime(ticketOrder.created_at)}
              </p>
              {ticketOrder.customer_name && (
                <p className="text-[10px] text-neutral-800">Comensal: {ticketOrder.customer_name}</p>
              )}
            </div>

            {/* Ítems */}
            <div className="flex flex-col gap-2 py-2 border-b border-black">
              {(ticketOrder.items || []).map((it) => (
                <div key={it.id} className="flex justify-between items-start">
                  <div>
                    <span className="font-bold">{it.quantity}x</span> {it.name_snapshot}
                    {it.notes && <p className="text-[10px] italic pl-3">↳ {it.notes}</p>}
                  </div>
                  <span className="tabular-nums font-bold">
                    {formatPrice(it.unit_price_cents * it.quantity)}
                  </span>
                </div>
              ))}
            </div>

            {/* Total */}
            <div className="flex justify-between items-center text-sm font-black pt-1">
              <span>TOTAL A COBRAR:</span>
              <span className="tabular-nums">{formatPrice(ticketOrder.total_cents)}</span>
            </div>

            {ticketOrder.notes && (
              <div className="p-2 bg-neutral-100 rounded text-[10px] border border-neutral-300">
                Aclaración: {ticketOrder.notes}
              </div>
            )}

            {/* Botones Imprimir / Cerrar */}
            <div className="flex items-center gap-2 pt-2 no-print">
              <button
                onClick={() => window.print()}
                className="flex-1 py-2.5 bg-black text-white rounded-xl font-bold text-xs flex items-center justify-center gap-1.5"
              >
                <Printer className="w-4 h-4" />
                <span>Imprimir Ticket</span>
              </button>
              <button
                onClick={() => setTicketOrder(null)}
                className="py-2.5 px-4 bg-neutral-200 text-black rounded-xl font-bold text-xs"
              >
                Cerrar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL DE CONFIRMACIÓN DE CANCELACIÓN */}
      {cancelModalOrder && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-in fade-in"
          onClick={() => setCancelModalOrder(null)}
        >
          <div
            className="w-full max-w-sm bg-surface border border-surface-border p-5 rounded-2xl shadow-2xl flex flex-col gap-4 text-white"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center gap-3 text-brand-danger">
              <XCircle className="w-6 h-6" />
              <h3 className="font-extrabold text-base">¿Anular esta comanda?</h3>
            </div>
            <p className="text-xs text-text-secondary">
              Estás por anular el pedido #{cancelModalOrder.id.slice(-4).toUpperCase()} de {cancelModalOrder.table_label || 'Salón'}. Esta acción no se puede deshacer.
            </p>
            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                onClick={() => setCancelModalOrder(null)}
                className="px-4 py-2 bg-surface hover:bg-surface-hover text-text-secondary hover:text-white rounded-xl text-xs font-bold"
              >
                Volver
              </button>
              <button
                onClick={() => handleCancelOrder(cancelModalOrder.id)}
                className="px-4 py-2 bg-brand-danger hover:bg-red-600 text-white rounded-xl text-xs font-extrabold shadow-md"
              >
                Sí, anular comanda
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
