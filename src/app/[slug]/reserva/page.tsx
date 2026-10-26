'use client';

import { useState, use } from 'react';
import Link from 'next/link';
import { CalendarDays, Users, Phone, User, Clock, MessageSquare, ChevronLeft, CheckCircle2 } from 'lucide-react';
import { Navbar } from '@/components/Navbar';
import { Toast } from '@/components/Toast';

interface PageProps {
  params: Promise<{ slug: string }>;
}

export default function GuestReservationPage({ params }: PageProps) {
  const { slug } = use(params);

  const [customerName, setCustomerName] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');
  const [customerEmail, setCustomerEmail] = useState('');
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [time, setTime] = useState('21:00');
  const [partySize, setPartySize] = useState('2');
  const [notes, setNotes] = useState('');

  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const res = await fetch('/api/reservations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          merchantSlug: slug,
          customerName,
          customerPhone,
          customerEmail,
          date,
          time,
          partySize,
          notes,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Error al enviar la reserva');

      setSuccess(true);
      setToastMessage('¡Solicitud de reserva enviada con éxito!');
    } catch (err: any) {
      setError(err.message || 'Error de conexión');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-background text-text-primary">
      <Navbar merchantSlug={slug} />

      <main className="flex-1 max-w-xl w-full mx-auto px-4 py-8 flex flex-col gap-6">
        <Link
          href={`/${slug}`}
          className="inline-flex items-center gap-1.5 text-xs font-bold text-text-secondary hover:text-white transition-colors"
        >
          <ChevronLeft className="w-4 h-4" />
          <span>Volver a la carta</span>
        </Link>

        <div className="bg-surface border border-surface-border rounded-2xl p-6 shadow-xl flex flex-col gap-5">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-xl bg-brand-amber/15 text-brand-amber flex items-center justify-center">
              <CalendarDays className="w-6 h-6" />
            </div>
            <div>
              <h1 className="text-xl sm:text-2xl font-black text-white">Reservar una mesa</h1>
              <p className="text-xs text-text-secondary">Asegurá tu lugar en el salón o patio de {slug}</p>
            </div>
          </div>

          {error && (
            <div className="p-3 bg-brand-danger/10 border border-brand-danger/30 rounded-xl text-xs text-brand-danger font-semibold">
              {error}
            </div>
          )}

          {success ? (
            <div className="py-8 text-center flex flex-col items-center gap-3">
              <CheckCircle2 className="w-12 h-12 text-brand-success" />
              <h3 className="text-lg font-bold text-white">¡Reserva solicitada!</h3>
              <p className="text-xs text-text-secondary max-w-sm">
                Recibimos tu solicitud para el {date} a las {time} para {partySize} personas. El local te contactará para confirmar.
              </p>
              <Link
                href={`/${slug}`}
                className="mt-4 px-6 py-2.5 bg-brand-blue rounded-xl text-white text-xs font-bold"
              >
                Volver a la carta
              </Link>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="flex flex-col gap-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-text-secondary mb-1">
                    Tu nombre completo *
                  </label>
                  <div className="relative">
                    <User className="absolute left-3 top-3 w-4 h-4 text-text-muted" />
                    <input
                      type="text"
                      required
                      placeholder="Ej: Sofía Martínez"
                      value={customerName}
                      onChange={(e) => setCustomerName(e.target.value)}
                      className="w-full pl-9 pr-3 py-2.5 bg-surface-subtle border border-surface-border rounded-xl text-white text-sm outline-none focus:border-brand-blue"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-text-secondary mb-1">
                    Teléfono / WhatsApp *
                  </label>
                  <div className="relative">
                    <Phone className="absolute left-3 top-3 w-4 h-4 text-text-muted" />
                    <input
                      type="tel"
                      required
                      placeholder="+54 11 2345-6789"
                      value={customerPhone}
                      onChange={(e) => setCustomerPhone(e.target.value)}
                      className="w-full pl-9 pr-3 py-2.5 bg-surface-subtle border border-surface-border rounded-xl text-white text-sm outline-none focus:border-brand-blue"
                    />
                  </div>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-text-secondary mb-1">
                  Correo electrónico (para confirmación automática)
                </label>
                <input
                  type="email"
                  placeholder="ejemplo@email.com"
                  value={customerEmail}
                  onChange={(e) => setCustomerEmail(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-surface-subtle border border-surface-border rounded-xl text-white text-sm outline-none focus:border-brand-blue"
                />
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-text-secondary mb-1">
                    Fecha *
                  </label>
                  <input
                    type="date"
                    required
                    value={date}
                    onChange={(e) => setDate(e.target.value)}
                    className="w-full px-3 py-2.5 bg-surface-subtle border border-surface-border rounded-xl text-white text-xs outline-none focus:border-brand-blue"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-text-secondary mb-1">
                    Hora *
                  </label>
                  <input
                    type="time"
                    required
                    value={time}
                    onChange={(e) => setTime(e.target.value)}
                    className="w-full px-3 py-2.5 bg-surface-subtle border border-surface-border rounded-xl text-white text-xs outline-none focus:border-brand-blue"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-text-secondary mb-1">
                    Personas *
                  </label>
                  <select
                    value={partySize}
                    onChange={(e) => setPartySize(e.target.value)}
                    className="w-full px-3 py-2.5 bg-surface-subtle border border-surface-border rounded-xl text-white text-xs outline-none focus:border-brand-blue"
                  >
                    {[1, 2, 3, 4, 5, 6, 8, 10, 12, 15, 20].map((num) => (
                      <option key={num} value={num} className="bg-surface text-white">
                        {num} {num === 1 ? 'persona' : 'personas'}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-text-secondary mb-1">
                  Aclaración o pedido especial (opcional)
                </label>
                <textarea
                  rows={2}
                  placeholder="Ej: cumpleaños, preferimos mesa afuera, llevamos cochecito..."
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-surface-subtle border border-surface-border rounded-xl text-white text-xs outline-none focus:border-brand-blue"
                />
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full py-3.5 px-4 bg-brand-blue hover:bg-brand-blue-hover text-white font-extrabold text-sm rounded-xl shadow-lg shadow-brand-blue/20 transition-all disabled:opacity-50 mt-2"
              >
                {loading ? 'Enviando solicitud...' : 'Solicitar reserva'}
              </button>
            </form>
          )}
        </div>
      </main>

      <Toast message={toastMessage} onClose={() => setToastMessage(null)} />
    </div>
  );
}
