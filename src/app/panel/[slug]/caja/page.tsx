'use client';

import { useState, useEffect, use } from 'react';
import { Wallet, DollarSign, CreditCard, Banknote, Sparkles, CheckCircle2, AlertTriangle, History, ArrowDownRight, ArrowUpRight } from 'lucide-react';
import { Shift } from '@/lib/types';
import { formatPrice, formatDateTime } from '@/lib/formatters';

interface PageProps {
  params: Promise<{ slug: string }>;
}

export default function CashPanelPage({ params }: PageProps) {
  const { slug } = use(params);

  const [currentShift, setCurrentShift] = useState<Shift | null>(null);
  const [history, setHistory] = useState<Shift[]>([]);
  const [loading, setLoading] = useState(true);

  // Modal / Form Apertura
  const [initialCash, setInitialCash] = useState('50000'); // $ 50.000
  const [openNotes, setOpenNotes] = useState('');

  // Modal / Form Cierre
  const [countedCash, setCountedCash] = useState('');
  const [closeNotes, setCloseNotes] = useState('');
  const [actionError, setActionError] = useState<string | null>(null);
  const [actionSuccess, setActionSuccess] = useState<string | null>(null);

  const fetchShifts = async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/shifts?merchantSlug=${slug}`);
      if (res.ok) {
        const data = await res.json();
        setCurrentShift(data.currentShift || null);
        setHistory(data.history || []);
      }
    } catch {} finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchShifts();
  }, [slug]);

  // Abrir turno
  const handleOpenShift = async (e: React.FormEvent) => {
    e.preventDefault();
    setActionError(null);
    setActionSuccess(null);

    try {
      const res = await fetch('/api/shifts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'open',
          merchantSlug: slug,
          initialCashCents: parseInt(initialCash, 10) * 100,
          notes: openNotes,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error);

      setActionSuccess('¡Turno de caja abierto correctamente!');
      await fetchShifts();
    } catch (err: any) {
      setActionError(err.message);
    }
  };

  // Cerrar turno con Arqueo
  const handleCloseShift = async (e: React.FormEvent) => {
    e.preventDefault();
    setActionError(null);
    setActionSuccess(null);

    if (!countedCash) {
      setActionError('Ingresá el monto total contado en el arqueo');
      return;
    }

    try {
      const res = await fetch('/api/shifts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'close',
          merchantSlug: slug,
          actualCountedCents: parseInt(countedCash, 10) * 100,
          notes: closeNotes,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error);

      setActionSuccess(data.message || 'Turno cerrado con éxito');
      setCountedCash('');
      await fetchShifts();
    } catch (err: any) {
      setActionError(err.message);
    }
  };

  return (
    <div className="flex flex-col gap-6">
      {/* Cabecera */}
      <div className="flex items-center justify-between pb-4 border-b border-surface-border">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-2xl bg-brand-blue/15 text-brand-blue flex items-center justify-center">
            <Wallet className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-xl sm:text-2xl font-black text-white">Caja & Arqueo de Turno</h1>
            <p className="text-xs text-text-secondary">
              Gestión de ingresos por medio de pago y control de cierres
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {currentShift ? (
            <span className="px-3 py-1 rounded-full bg-brand-success/15 border border-brand-success/30 text-brand-success text-xs font-bold flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-brand-success animate-pulse" />
              Turno Abierto
            </span>
          ) : (
            <span className="px-3 py-1 rounded-full bg-surface-hover text-text-secondary text-xs font-bold">
              Turno Cerrado
            </span>
          )}
        </div>
      </div>

      {actionSuccess && (
        <div className="p-3 bg-brand-success/15 border border-brand-success/30 rounded-xl text-xs font-bold text-brand-success flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4" />
          <span>{actionSuccess}</span>
        </div>
      )}

      {actionError && (
        <div className="p-3 bg-brand-danger/15 border border-brand-danger/30 rounded-xl text-xs font-bold text-brand-danger flex items-center gap-2">
          <AlertTriangle className="w-4 h-4" />
          <span>{actionError}</span>
        </div>
      )}

      {/* Si no hay turno abierto: Formulario de Apertura */}
      {!currentShift ? (
        <div className="bg-surface border border-surface-border rounded-2xl p-6 shadow-xl flex flex-col gap-4 max-w-lg mx-auto w-full text-center">
          <div className="w-14 h-14 rounded-2xl bg-brand-blue/15 text-brand-blue flex items-center justify-center mx-auto mb-1">
            <Wallet className="w-7 h-7" />
          </div>
          <h2 className="text-xl font-black text-white">Abrir nuevo turno de caja</h2>
          <p className="text-xs text-text-secondary">
            Ingresá el fondo inicial en efectivo disponible en el cajón para comenzar a cobrar pedidos.
          </p>

          <form onSubmit={handleOpenShift} className="flex flex-col gap-4 text-left mt-2">
            <div>
              <label className="block text-xs font-semibold text-text-secondary mb-1">
                Fondo inicial en efectivo ($) *
              </label>
              <input
                type="number"
                required
                value={initialCash}
                onChange={(e) => setInitialCash(e.target.value)}
                className="w-full px-3.5 py-2.5 bg-surface-subtle border border-surface-border rounded-xl text-white text-base font-bold outline-none focus:border-brand-blue"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-text-secondary mb-1">
                Observaciones de apertura
              </label>
              <input
                type="text"
                placeholder="Ej: Turno mediodía iniciado por Encargado"
                value={openNotes}
                onChange={(e) => setOpenNotes(e.target.value)}
                className="w-full px-3.5 py-2.5 bg-surface-subtle border border-surface-border rounded-xl text-white text-xs outline-none focus:border-brand-blue"
              />
            </div>

            <button
              type="submit"
              className="w-full py-3 bg-brand-blue hover:bg-brand-blue-hover text-white font-extrabold text-sm rounded-xl shadow-md transition-all mt-1"
            >
              Confirmar apertura de turno
            </button>
          </form>
        </div>
      ) : (
        /* Turno Abierto Actual */
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Tarjeta Principal de Turno y Desglose por Medio de Pago */}
          <div className="lg:col-span-2 bg-surface border border-surface-border rounded-2xl p-6 shadow-xl flex flex-col gap-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-surface-border">
              <div>
                <span className="text-xs font-bold text-text-secondary uppercase">
                  Turno actual · Responsable: {currentShift.opened_by_name || 'Operador'}
                </span>
                <p className="text-xs text-text-muted mt-0.5">
                  Abierto el {formatDateTime(currentShift.opened_at)}
                </p>
              </div>

              <div className="text-left sm:text-right">
                <span className="text-xs text-text-secondary block">Total Cobrado:</span>
                <span className="tabular-nums font-black text-3xl text-brand-blue">
                  {formatPrice(currentShift.total_cents)}
                </span>
              </div>
            </div>

            {/* Grilla de Desglose por Medio de Pago */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <div className="p-4 bg-surface-subtle rounded-xl border border-surface-border flex flex-col justify-between gap-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-brand-amber">Efectivo</span>
                  <Banknote className="w-4 h-4 text-brand-amber" />
                </div>
                <div>
                  <span className="tabular-nums font-black text-lg text-white block">
                    {formatPrice(currentShift.cash_cents)}
                  </span>
                  <span className="text-[10px] text-text-muted">
                    + {formatPrice(currentShift.initial_cash_cents)} fondo
                  </span>
                </div>
              </div>

              <div className="p-4 bg-surface-subtle rounded-xl border border-surface-border flex flex-col justify-between gap-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-brand-blue">Mercado Pago</span>
                  <Sparkles className="w-4 h-4 text-brand-blue" />
                </div>
                <div>
                  <span className="tabular-nums font-black text-lg text-white block">
                    {formatPrice(currentShift.mp_cents)}
                  </span>
                  <span className="text-[10px] text-brand-success font-medium">0% comisión</span>
                </div>
              </div>

              <div className="p-4 bg-surface-subtle rounded-xl border border-surface-border flex flex-col justify-between gap-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-white">Débito</span>
                  <CreditCard className="w-4 h-4 text-brand-blue" />
                </div>
                <div>
                  <span className="tabular-nums font-black text-lg text-white block">
                    {formatPrice(currentShift.debit_cents)}
                  </span>
                  <span className="text-[10px] text-text-muted">Terminal POS</span>
                </div>
              </div>

              <div className="p-4 bg-surface-subtle rounded-xl border border-surface-border flex flex-col justify-between gap-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-purple-400">Crédito</span>
                  <CreditCard className="w-4 h-4 text-purple-400" />
                </div>
                <div>
                  <span className="tabular-nums font-black text-lg text-white block">
                    {formatPrice(currentShift.credit_cents)}
                  </span>
                  <span className="text-[10px] text-text-muted">Terminal POS</span>
                </div>
              </div>
            </div>

            {/* Total Esperado en Caja */}
            <div className="p-4 bg-brand-blue/10 border border-brand-blue/30 rounded-xl flex items-center justify-between">
              <div>
                <span className="text-xs font-bold text-white block">Monto esperado total en caja:</span>
                <span className="text-[11px] text-text-secondary">
                  Fondo inicial ({formatPrice(currentShift.initial_cash_cents)}) + Cobros ({formatPrice(currentShift.total_cents)})
                </span>
              </div>
              <span className="tabular-nums font-black text-xl text-white">
                {formatPrice(currentShift.expected_cents || (currentShift.initial_cash_cents + currentShift.total_cents))}
              </span>
            </div>
          </div>

          {/* Formulario de Cierre y Arqueo */}
          <div className="bg-surface border border-surface-border rounded-2xl p-6 shadow-xl flex flex-col gap-4">
            <div>
              <h3 className="text-lg font-black text-white">Cerrar turno & Arqueo</h3>
              <p className="text-xs text-text-secondary mt-1">
                Ingresá el total de dinero contado físicamente al momento del cierre.
              </p>
            </div>

            <form onSubmit={handleCloseShift} className="flex flex-col gap-3">
              <div>
                <label className="block text-xs font-semibold text-text-secondary mb-1">
                  Monto contado real en caja ($) *
                </label>
                <input
                  type="number"
                  required
                  placeholder="Ej: 178100"
                  value={countedCash}
                  onChange={(e) => setCountedCash(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-surface-subtle border border-surface-border rounded-xl text-white text-base font-bold outline-none focus:border-brand-blue"
                />
              </div>

              {countedCash && (
                <div className="p-3 bg-surface-subtle rounded-xl border border-surface-border flex items-center justify-between text-xs">
                  <span>Diferencia calculada:</span>
                  {(() => {
                    const counted = parseInt(countedCash, 10) * 100;
                    const expected = currentShift.expected_cents || (currentShift.initial_cash_cents + currentShift.total_cents);
                    const diff = counted - expected;
                    if (diff === 0) {
                      return <span className="font-bold text-brand-success">Arqueo sin diferencias</span>;
                    }
                    if (diff < 0) {
                      return <span className="font-bold text-brand-danger">Faltante: {formatPrice(Math.abs(diff))}</span>;
                    }
                    return <span className="font-bold text-brand-blue">Sobrante: {formatPrice(diff)}</span>;
                  })()}
                </div>
              )}

              <div>
                <label className="block text-xs font-semibold text-text-secondary mb-1">
                  Observaciones de cierre
                </label>
                <input
                  type="text"
                  placeholder="Comentarios adicionales"
                  value={closeNotes}
                  onChange={(e) => setCloseNotes(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-surface-subtle border border-surface-border rounded-xl text-white text-xs outline-none focus:border-brand-blue"
                />
              </div>

              <button
                type="submit"
                className="w-full py-3 bg-brand-danger hover:bg-red-600 text-white font-black text-sm rounded-xl shadow-md transition-all mt-2"
              >
                Cerrar turno de caja
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Historial de Cierres Anteriores */}
      <div className="bg-surface border border-surface-border rounded-2xl p-6 shadow-sm flex flex-col gap-4">
        <div className="flex items-center gap-2">
          <History className="w-5 h-5 text-brand-blue" />
          <h3 className="text-base font-bold text-white">Historial de cierres de caja</h3>
        </div>

        {history.length === 0 ? (
          <p className="text-xs text-text-secondary py-4 text-center">
            Aún no hay cierres registrados en el historial.
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-surface-subtle text-text-secondary border-b border-surface-border uppercase font-semibold">
                <tr>
                  <th className="py-2.5 px-3">Fecha Cierre</th>
                  <th className="py-2.5 px-3">Responsable</th>
                  <th className="py-2.5 px-3">Fondo Inicial</th>
                  <th className="py-2.5 px-3">Cobrado</th>
                  <th className="py-2.5 px-3">Esperado</th>
                  <th className="py-2.5 px-3">Arqueo / Diferencia</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-surface-border">
                {history.map((h) => {
                  const isZeroDiff = h.difference_cents === 0;
                  const isNegative = h.difference_cents < 0;

                  return (
                    <tr key={h.id} className="hover:bg-surface-subtle/50 transition-colors">
                      <td className="py-3 px-3 text-white font-medium">
                        {h.closed_at ? formatDateTime(h.closed_at) : 'N/A'}
                      </td>
                      <td className="py-3 px-3 text-text-secondary">
                        {h.closed_by_name || h.opened_by_name || 'Operador'}
                      </td>
                      <td className="py-3 px-3 tabular-nums text-text-muted">
                        {formatPrice(h.initial_cash_cents)}
                      </td>
                      <td className="py-3 px-3 tabular-nums font-bold text-white">
                        {formatPrice(h.total_cents)}
                      </td>
                      <td className="py-3 px-3 tabular-nums font-bold text-text-secondary">
                        {formatPrice(h.expected_cents)}
                      </td>
                      <td className="py-3 px-3">
                        {isZeroDiff ? (
                          <span className="px-2 py-0.5 rounded-full bg-brand-success/15 text-brand-success font-bold text-[11px]">
                            Arqueo sin diferencias
                          </span>
                        ) : isNegative ? (
                          <span className="px-2 py-0.5 rounded-full bg-brand-danger/15 text-brand-danger font-bold text-[11px] tabular-nums">
                            {formatPrice(h.difference_cents)}
                          </span>
                        ) : (
                          <span className="px-2 py-0.5 rounded-full bg-brand-blue/15 text-brand-blue font-bold text-[11px] tabular-nums">
                            +{formatPrice(h.difference_cents)}
                          </span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
