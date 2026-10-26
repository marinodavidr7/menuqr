'use client';

import { useState } from 'react';
import { BellRing, ReceiptText, X, CheckCircle2 } from 'lucide-react';
import { Table } from '@/lib/types';

interface QuickCallModalProps {
  isOpen: boolean;
  type: 'waiter' | 'bill';
  merchantSlug: string;
  tables: Table[];
  currentTableId?: string | null;
  onClose: () => void;
  onSuccess: (message: string) => void;
}

export function QuickCallModal({
  isOpen,
  type,
  merchantSlug,
  tables,
  currentTableId,
  onClose,
  onSuccess,
}: QuickCallModalProps) {
  const [selectedTableId, setSelectedTableId] = useState<string>(currentTableId || (tables[0]?.id || ''));
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const isWaiter = type === 'waiter';
  const title = isWaiter ? 'Llamar al mozo' : 'Pedir la cuenta';
  const desc = isWaiter
    ? 'El mozo de tu sector se acercará de inmediato a tu mesa.'
    : 'Te traeremos la cuenta detallada a tu mesa para abonar.';

  const handleCall = async () => {
    if (!selectedTableId) {
      setError('Por favor seleccioná tu mesa');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const res = await fetch('/api/calls', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          merchantSlug,
          tableId: selectedTableId,
          type,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Error al enviar llamado');

      onSuccess(data.message || '¡Solicitud enviada al salón!');
      onClose();
    } catch (err: any) {
      setError(err.message || 'Error de conexión');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200"
      onClick={onClose}
    >
      <div
        className="relative w-full max-w-sm bg-surface border border-surface-border rounded-2xl p-5 shadow-2xl modal-sheet flex flex-col gap-4 text-text-primary"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          onClick={onClose}
          aria-label="Cerrar modal"
          className="absolute top-2 right-2 min-w-[44px] min-h-[44px] rounded-full bg-surface-hover hover:bg-surface text-text-secondary hover:text-white flex items-center justify-center active:scale-95 transition-all"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="flex items-center gap-3">
          <div className={`w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0 ${
            isWaiter ? 'bg-brand-amber/20 text-brand-amber' : 'bg-brand-blue/20 text-brand-blue'
          }`}>
            {isWaiter ? <BellRing className="w-6 h-6" /> : <ReceiptText className="w-6 h-6" />}
          </div>
          <div>
            <h3 className="font-extrabold text-lg text-white">{title}</h3>
            <p className="text-xs text-text-secondary">{desc}</p>
          </div>
        </div>

        {error && (
          <p className="text-xs text-brand-danger bg-brand-danger/10 p-2.5 rounded-lg border border-brand-danger/20 font-medium">
            {error}
          </p>
        )}

        <div>
          <label className="block text-xs font-semibold text-text-secondary uppercase mb-2">
            Indicá tu mesa:
          </label>
          <select
            value={selectedTableId}
            onChange={(e) => setSelectedTableId(e.target.value)}
            className="w-full min-h-[44px] px-3.5 py-2.5 rounded-xl bg-surface-subtle border border-surface-border text-white text-[16px] focus:border-brand-blue outline-none"
          >
            {tables.map((t) => (
              <option key={t.id} value={t.id} className="bg-surface text-white">
                {t.label} ({t.zone})
              </option>
            ))}
          </select>
        </div>

        <button
          onClick={handleCall}
          disabled={loading}
          className={`w-full min-h-[48px] py-3.5 rounded-xl font-extrabold text-sm text-white flex items-center justify-center gap-2 shadow-lg transition-all active:scale-98 ${
            isWaiter ? 'bg-brand-amber hover:bg-brand-amber-hover text-black' : 'bg-brand-blue hover:bg-brand-blue-hover'
          }`}
        >
          {loading ? (
            <span>Enviando al salón...</span>
          ) : (
            <>
              <CheckCircle2 className="w-4 h-4" />
              <span>Confirmar solicitud</span>
            </>
          )}
        </button>
      </div>
    </div>
  );
}
