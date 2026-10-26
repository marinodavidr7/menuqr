'use client';

import { useState, useEffect, use } from 'react';
import { CalendarDays, CheckCircle2, XCircle, UserX, Clock, Phone, Mail, Check, AlertCircle } from 'lucide-react';
import { Reservation, ReservationStatus } from '@/lib/types';
import { formatTime } from '@/lib/formatters';

interface PageProps {
  params: Promise<{ slug: string }>;
}

export default function ReservationsPanelPage({ params }: PageProps) {
  const { slug } = use(params);

  const [reservations, setReservations] = useState<Reservation[]>([]);
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  const [loading, setLoading] = useState(true);
  const [statusMsg, setStatusMsg] = useState<string | null>(null);

  const fetchReservations = async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/reservations?merchantSlug=${slug}&date=${selectedDate}`);
      if (res.ok) {
        const data = await res.json();
        setReservations(data.reservations || []);
      }
    } catch {} finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchReservations();
  }, [slug, selectedDate]);

  const handleUpdateStatus = async (reservationId: string, status: ReservationStatus) => {
    try {
      const res = await fetch('/api/reservations', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reservationId, status, merchantSlug: slug }),
      });
      const data = await res.json();
      if (res.ok) {
        setStatusMsg(data.message || `Reserva actualizada a ${status}`);
        await fetchReservations();
      }
    } catch {}
  };

  return (
    <div className="flex flex-col gap-6">
      {/* Cabecera y Filtro de Fecha */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-surface-border">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-2xl bg-brand-amber/15 text-brand-amber flex items-center justify-center">
            <CalendarDays className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-xl sm:text-2xl font-black text-white">Gestión de Reservas</h1>
            <p className="text-xs text-text-secondary">
              Control de comensales, turnos de mesas y avisos automáticos
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <label className="text-xs font-semibold text-text-secondary">Fecha:</label>
          <input
            type="date"
            value={selectedDate}
            onChange={(e) => setSelectedDate(e.target.value)}
            className="px-3 py-1.5 bg-surface border border-surface-border rounded-xl text-white text-xs outline-none focus:border-brand-blue"
          />
        </div>
      </div>

      {statusMsg && (
        <div className="p-3 bg-brand-success/15 border border-brand-success/30 rounded-xl text-xs font-bold text-brand-success flex items-center justify-between">
          <span>{statusMsg}</span>
          <button onClick={() => setStatusMsg(null)} className="text-white hover:underline">Cerrar</button>
        </div>
      )}

      {/* Lista de Reservas del Día */}
      {reservations.length === 0 ? (
        <div className="py-20 text-center bg-surface border border-dashed border-surface-border rounded-2xl flex flex-col items-center">
          <CalendarDays className="w-12 h-12 text-text-muted mb-2" />
          <h3 className="text-base font-bold text-white">Sin reservas para esta fecha</h3>
          <p className="text-xs text-text-secondary mt-1">
            No se registraron solicitudes de reservas para el {selectedDate}.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {reservations.map((res) => (
            <div
              key={res.id}
              className="bg-surface border border-surface-border rounded-2xl p-5 shadow-sm flex flex-col justify-between gap-4"
            >
              <div>
                <div className="flex items-center justify-between">
                  <span className="text-lg font-black text-white flex items-center gap-1.5">
                    <Clock className="w-4 h-4 text-brand-blue" />
                    {res.time} hs
                  </span>
                  <span className={`px-2.5 py-0.5 rounded-full text-[11px] font-bold capitalize ${
                    res.status === 'confirmed'
                      ? 'bg-brand-success/15 text-brand-success'
                      : res.status === 'pending'
                      ? 'bg-brand-amber/15 text-brand-amber'
                      : res.status === 'rejected'
                      ? 'bg-brand-danger/15 text-brand-danger'
                      : 'bg-surface-hover text-text-muted'
                  }`}>
                    {res.status === 'confirmed' && 'Confirmada'}
                    {res.status === 'pending' && 'Pendiente'}
                    {res.status === 'rejected' && 'Rechazada'}
                    {res.status === 'no_show' && 'No Show'}
                  </span>
                </div>

                <div className="mt-3">
                  <h4 className="font-bold text-base text-white">{res.customer_name}</h4>
                  <p className="text-xs font-semibold text-brand-blue mt-0.5">
                    👥 {res.party_size} {res.party_size === 1 ? 'persona' : 'personas'}
                  </p>
                </div>

                <div className="mt-3 flex flex-col gap-1 text-xs text-text-secondary">
                  <div className="flex items-center gap-1.5">
                    <Phone className="w-3.5 h-3.5 text-text-muted" />
                    <span>{res.customer_phone}</span>
                  </div>
                  {res.customer_email && (
                    <div className="flex items-center gap-1.5">
                      <Mail className="w-3.5 h-3.5 text-text-muted" />
                      <span className="truncate">{res.customer_email}</span>
                    </div>
                  )}
                  {res.notes && (
                    <p className="mt-1 p-2 bg-surface-subtle rounded-lg text-brand-amber text-[11px]">
                      Nota: {res.notes}
                    </p>
                  )}
                </div>
              </div>

              {/* Botones de Acción */}
              <div className="pt-3 border-t border-surface-border flex items-center justify-between gap-2">
                {res.status === 'pending' && (
                  <>
                    <button
                      onClick={() => handleUpdateStatus(res.id, 'confirmed')}
                      className="flex-1 py-2 px-3 bg-brand-success hover:bg-emerald-600 text-white font-bold text-xs rounded-xl shadow-sm flex items-center justify-center gap-1"
                    >
                      <Check className="w-3.5 h-3.5" />
                      <span>Confirmar</span>
                    </button>
                    <button
                      onClick={() => handleUpdateStatus(res.id, 'rejected')}
                      className="py-2 px-3 bg-surface hover:bg-brand-danger/20 text-brand-danger font-bold text-xs rounded-xl border border-surface-border"
                    >
                      Rechazar
                    </button>
                  </>
                )}

                {res.status === 'confirmed' && (
                  <button
                    onClick={() => handleUpdateStatus(res.id, 'no_show')}
                    className="w-full py-2 px-3 bg-surface hover:bg-surface-subtle text-text-secondary hover:text-white font-bold text-xs rounded-xl border border-surface-border flex items-center justify-center gap-1.5"
                  >
                    <UserX className="w-3.5 h-3.5" />
                    <span>Marcar No-Show</span>
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
