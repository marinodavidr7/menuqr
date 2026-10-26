'use client';

import { useState, useEffect, use } from 'react';
import Image from 'next/image';
import { Settings, QrCode, Download, Printer, Plus, Sparkles, CheckCircle2, ShieldCheck } from 'lucide-react';
import { Merchant, Table } from '@/lib/types';
import { formatPrice } from '@/lib/formatters';

interface TableWithQr extends Table {
  url: string;
  qrDataUrl: string;
}

interface PageProps {
  params: Promise<{ slug: string }>;
}

export default function SettingsPanelPage({ params }: PageProps) {
  const { slug } = use(params);

  const [merchant, setMerchant] = useState<Merchant | null>(null);
  const [tables, setTables] = useState<TableWithQr[]>([]);
  const [loading, setLoading] = useState(true);

  // Formulario de Local
  const [name, setName] = useState('');
  const [category, setCategory] = useState('');
  const [description, setDescription] = useState('');
  const [deliveryFee, setDeliveryFee] = useState('');
  const [deliveryMinutes, setDeliveryMinutes] = useState('');
  const [mpAccountId, setMpAccountId] = useState('');

  // Formulario nueva mesa
  const [tableNumber, setTableNumber] = useState('');
  const [tableLabel, setTableLabel] = useState('');
  const [tableZone, setTableZone] = useState('Salón');

  const [statusMsg, setStatusMsg] = useState<string | null>(null);

  const [qrBaseUrl, setQrBaseUrl] = useState('http://192.168.1.17:3000');

  const fetchSettings = async (customBaseUrl?: string) => {
    setLoading(true);
    try {
      // 1. Datos del comercio
      const mRes = await fetch(`/api/merchants/${slug}`);
      if (mRes.ok) {
        const mData = await mRes.json();
        const m = mData.merchant;
        setMerchant(m);
        setName(m.name);
        setCategory(m.category);
        setDescription(m.description || '');
        setDeliveryFee((m.delivery_fee_cents / 100).toString());
        setDeliveryMinutes(m.delivery_min_minutes.toString());
        setMpAccountId(m.mp_account_id || '');
      }

      // 2. Mesas con QR
      const targetBase = customBaseUrl !== undefined ? customBaseUrl : qrBaseUrl;
      const tRes = await fetch(`/api/tables?merchantSlug=${slug}&baseUrl=${encodeURIComponent(targetBase)}`);
      if (tRes.ok) {
        const tData = await tRes.json();
        setTables(tData.tables || []);
      }
    } catch {} finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSettings();
  }, [slug]);

  // Guardar Ajustes del Comercio
  const handleSaveMerchant = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await fetch(`/api/merchants/${slug}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name,
          category,
          description,
          delivery_fee_cents: Math.round(parseFloat(deliveryFee) * 100),
          delivery_min_minutes: parseInt(deliveryMinutes, 10),
          mp_account_id: mpAccountId,
        }),
      });

      if (res.ok) {
        setStatusMsg('¡Ajustes guardados correctamente!');
        setTimeout(() => setStatusMsg(null), 3000);
      }
    } catch {}
  };

  // Crear Mesa
  const handleCreateTable = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await fetch('/api/tables', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          merchantSlug: slug,
          number: tableNumber,
          label: tableLabel || `Mesa ${tableNumber}`,
          zone: tableZone,
        }),
      });

      if (res.ok) {
        setTableNumber('');
        setTableLabel('');
        await fetchSettings();
      }
    } catch {}
  };

  // Descargar QR individual
  const handleDownloadQr = (qrDataUrl: string, label: string) => {
    const link = document.createElement('a');
    link.href = qrDataUrl;
    link.download = `QR-${slug}-${label}.png`;
    link.click();
  };

  // Imprimir todas las mesas
  const handlePrintAll = () => {
    window.print();
  };

  if (loading || !merchant) {
    return (
      <div className="py-20 text-center text-text-secondary text-sm font-semibold">
        Cargando ajustes...
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-8 pb-12">
      {/* Cabecera */}
      <div className="flex items-center justify-between pb-4 border-b border-surface-border">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-2xl bg-brand-blue/15 text-brand-blue flex items-center justify-center">
            <Settings className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-xl sm:text-2xl font-black text-white">Ajustes & Códigos QR</h1>
            <p className="text-xs text-text-secondary">
              Parámetros del local, cobro con Mercado Pago y descarga de QRs por mesa
            </p>
          </div>
        </div>

        {statusMsg && (
          <div className="px-3 py-1.5 bg-brand-success/15 border border-brand-success/30 rounded-xl text-xs font-bold text-brand-success flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4" />
            <span>{statusMsg}</span>
          </div>
        )}
      </div>

      {/* Sección 1: Códigos QR por Mesa */}
      <div className="bg-surface border border-surface-border rounded-2xl p-6 shadow-sm flex flex-col gap-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h2 className="text-lg font-black text-white flex items-center gap-2">
              <QrCode className="w-5 h-5 text-brand-blue" />
              Códigos QR por Mesa ({tables.length})
            </h2>
            <p className="text-xs text-text-secondary mt-0.5">
              Descargá los códigos QR en alta resolución o imprimí las tarjetas para las mesas.
            </p>
          </div>

          <button
            onClick={handlePrintAll}
            className="px-4 py-2 bg-surface hover:bg-surface-hover text-white text-xs font-bold rounded-xl border border-surface-border transition-colors flex items-center gap-2"
          >
            <Printer className="w-4 h-4 text-brand-amber" />
            <span>Imprimir todas las mesas</span>
          </button>
        </div>

        {/* Selector de URL Base para los QR */}
        <div className="p-4 bg-surface-subtle border border-surface-border rounded-xl flex flex-col gap-3 text-xs">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div>
              <span className="font-extrabold text-white text-sm block">Destino de los Códigos QR de Mesa:</span>
              <span className="text-text-secondary text-[11px]">
                Elegí la dirección que abrirá la cámara del celular al escanear el QR en la mesa.
              </span>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={() => {
                  const url = 'http://192.168.1.17:3000';
                  setQrBaseUrl(url);
                  fetchSettings(url);
                }}
                className={`px-3 py-2 rounded-xl font-black transition-all flex items-center gap-1.5 ${
                  qrBaseUrl.includes('192.168.1.17')
                    ? 'bg-brand-success text-white shadow-md ring-2 ring-brand-success/50'
                    : 'bg-surface hover:bg-surface-hover text-text-secondary border border-surface-border'
                }`}
              >
                <span>📶 Wi-Fi Salón (192.168.1.17)</span>
                <span className="text-[10px] bg-white/20 px-1.5 py-0.5 rounded font-black">RECOMENDADO</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  const url = 'https://cruel-oranges-pump.loca.lt';
                  setQrBaseUrl(url);
                  fetchSettings(url);
                }}
                className={`px-3 py-2 rounded-xl font-bold transition-all flex items-center gap-1.5 ${
                  qrBaseUrl.includes('loca.lt')
                    ? 'bg-brand-blue text-white shadow-md'
                    : 'bg-surface hover:bg-surface-hover text-text-secondary border border-surface-border'
                }`}
              >
                <span>🌐 Túnel 4G/5G (HTTPS)</span>
              </button>
            </div>
          </div>

          {/* Input editable para ingresar cualquier IP o Dominio */}
          <div className="flex flex-col sm:flex-row items-center gap-2 pt-2 border-t border-surface-border/50">
            <span className="text-[11px] font-semibold text-text-muted whitespace-nowrap">
              URL base activa en los QRs:
            </span>
            <input
              type="text"
              value={qrBaseUrl}
              onChange={(e) => setQrBaseUrl(e.target.value)}
              className="flex-1 w-full bg-surface border border-surface-border rounded-xl px-3 py-1.5 text-xs text-white outline-none focus:border-brand-blue font-mono"
              placeholder="http://192.168.1.17:3000"
            />
            <button
              type="button"
              onClick={() => fetchSettings(qrBaseUrl)}
              className="w-full sm:w-auto px-4 py-1.5 bg-brand-blue hover:bg-brand-blue-hover text-white rounded-xl text-xs font-bold transition-colors whitespace-nowrap"
            >
              Actualizar QRs
            </button>
          </div>

          {qrBaseUrl.includes('192.168.1.17') && (
            <p className="text-[11px] text-brand-success font-semibold flex items-center gap-1">
              ✓ Garantizado: Cualquier celular conectado a la red Wi-Fi abre la carta al instante sin caídas ni errores 503.
            </p>
          )}
          {qrBaseUrl.includes('loca.lt') && (
            <p className="text-[11px] text-brand-amber font-semibold">
              ⚠️ Nota Túnel Público: Si la pantalla del celular pide contraseña de túnel, ingresá la IP del host: <code className="bg-black/40 px-1 py-0.5 rounded text-white font-mono">38.57.232.249</code>.
            </p>
          )}
        </div>

        {/* Grilla de QRs */}
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
          {tables.map((tbl) => (
            <div
              key={tbl.id}
              className="bg-surface-subtle border border-surface-border rounded-xl p-3 flex flex-col items-center text-center gap-2"
            >
              <div className="relative w-32 h-32 bg-white rounded-lg p-1.5 shadow-md flex items-center justify-center">
                {tbl.qrDataUrl ? (
                  <Image src={tbl.qrDataUrl} alt={tbl.label} width={120} height={120} className="rounded" />
                ) : (
                  <span className="text-xs text-black">Generando...</span>
                )}
              </div>

              <div>
                <span className="font-extrabold text-sm text-white block">{tbl.label}</span>
                <span className="text-[10px] text-text-muted block">{tbl.zone}</span>
                <a
                  href={tbl.url}
                  target="_blank"
                  rel="noreferrer"
                  className="text-[10px] text-brand-blue hover:underline truncate max-w-[130px] block mt-1"
                  title={tbl.url}
                >
                  {tbl.url}
                </a>
              </div>

              <button
                onClick={() => handleDownloadQr(tbl.qrDataUrl, tbl.label)}
                className="w-full py-1.5 px-2 bg-surface hover:bg-surface-hover text-brand-blue border border-surface-border rounded-lg text-xs font-bold flex items-center justify-center gap-1.5 transition-colors"
              >
                <Download className="w-3.5 h-3.5" />
                <span>PNG</span>
              </button>
            </div>
          ))}
        </div>

        {/* Formulario Agregar Nueva Mesa */}
        <form onSubmit={handleCreateTable} className="p-4 bg-surface-subtle rounded-xl border border-surface-border flex flex-col sm:flex-row items-end gap-3">
          <div className="flex-1 w-full">
            <label className="block text-[11px] font-semibold text-text-secondary mb-1">Número de mesa</label>
            <input
              type="number"
              required
              placeholder="11"
              value={tableNumber}
              onChange={(e) => setTableNumber(e.target.value)}
              className="w-full px-3 py-2 bg-surface border border-surface-border rounded-lg text-white text-xs outline-none focus:border-brand-blue"
            />
          </div>

          <div className="flex-1 w-full">
            <label className="block text-[11px] font-semibold text-text-secondary mb-1">Etiqueta (Opcional)</label>
            <input
              type="text"
              placeholder="Mesa 11"
              value={tableLabel}
              onChange={(e) => setTableLabel(e.target.value)}
              className="w-full px-3 py-2 bg-surface border border-surface-border rounded-lg text-white text-xs outline-none focus:border-brand-blue"
            />
          </div>

          <div className="flex-1 w-full">
            <label className="block text-[11px] font-semibold text-text-secondary mb-1">Sector / Zona</label>
            <select
              value={tableZone}
              onChange={(e) => setTableZone(e.target.value)}
              className="w-full px-3 py-2 bg-surface border border-surface-border rounded-lg text-white text-xs outline-none focus:border-brand-blue"
            >
              <option value="Salón">Salón</option>
              <option value="Patio">Patio</option>
              <option value="Terraza">Terraza</option>
              <option value="Vereda">Vereda</option>
            </select>
          </div>

          <button
            type="submit"
            className="w-full sm:w-auto px-4 py-2 bg-brand-blue hover:bg-brand-blue-hover text-white font-bold text-xs rounded-lg transition-colors flex items-center justify-center gap-1.5 whitespace-nowrap"
          >
            <Plus className="w-4 h-4" />
            <span>Crear mesa & QR</span>
          </button>
        </form>
      </div>

      {/* Sección 2: Integración Mercado Pago */}
      <div className="bg-surface border border-surface-border rounded-2xl p-6 shadow-sm flex flex-col gap-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-xl bg-brand-blue/20 flex items-center justify-center text-brand-blue">
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-white">Mercado Pago Directo</h2>
              <p className="text-xs text-text-secondary">Cobro sin comisión a través de tu cuenta de Mercado Pago</p>
            </div>
          </div>

          <span className="px-2.5 py-1 rounded-full bg-brand-success/15 text-brand-success text-[11px] font-bold flex items-center gap-1">
            <ShieldCheck className="w-3.5 h-3.5" />
            0% Comisión
          </span>
        </div>

        <div className="p-4 bg-surface-subtle border border-surface-border rounded-xl flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="text-xs">
            <span className="font-bold text-white block">ID de Cuenta Mercado Pago:</span>
            <span className="font-mono text-brand-blue font-semibold">{mpAccountId || 'MP-CLIENT-ARG-001'}</span>
            <p className="text-[11px] text-text-muted mt-0.5">
              El dinero de cada comensal se acredita al 100% de manera directa e instantánea en tu cuenta.
            </p>
          </div>

          <button
            onClick={() => {
              const newId = prompt('Ingresá tu MP Account ID / Access Token:', mpAccountId);
              if (newId) setMpAccountId(newId);
            }}
            className="px-4 py-2 bg-brand-blue hover:bg-brand-blue-hover text-white text-xs font-bold rounded-xl transition-colors"
          >
            Vincular cuenta
          </button>
        </div>
      </div>

      {/* Sección 3: Datos Generales y Delivery */}
      <form onSubmit={handleSaveMerchant} className="bg-surface border border-surface-border rounded-2xl p-6 shadow-sm flex flex-col gap-4">
        <h2 className="text-base font-bold text-white">Información del Comercio</h2>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-semibold text-text-secondary mb-1">Nombre</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full px-3.5 py-2.5 bg-surface-subtle border border-surface-border rounded-xl text-white text-sm outline-none focus:border-brand-blue"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-text-secondary mb-1">Categoría</label>
            <input
              type="text"
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              className="w-full px-3.5 py-2.5 bg-surface-subtle border border-surface-border rounded-xl text-white text-sm outline-none focus:border-brand-blue"
            />
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-semibold text-text-secondary mb-1">Costo de envío ($ ARS)</label>
            <input
              type="number"
              value={deliveryFee}
              onChange={(e) => setDeliveryFee(e.target.value)}
              className="w-full px-3.5 py-2.5 bg-surface-subtle border border-surface-border rounded-xl text-white text-sm outline-none focus:border-brand-blue"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-text-secondary mb-1">Tiempo de entrega (minutos)</label>
            <input
              type="number"
              value={deliveryMinutes}
              onChange={(e) => setDeliveryMinutes(e.target.value)}
              className="w-full px-3.5 py-2.5 bg-surface-subtle border border-surface-border rounded-xl text-white text-sm outline-none focus:border-brand-blue"
            />
          </div>
        </div>

        <div>
          <label className="block text-xs font-semibold text-text-secondary mb-1">Descripción</label>
          <textarea
            rows={2}
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            className="w-full px-3.5 py-2.5 bg-surface-subtle border border-surface-border rounded-xl text-white text-sm outline-none focus:border-brand-blue"
          />
        </div>

        <button
          type="submit"
          className="self-end px-6 py-2.5 bg-brand-blue hover:bg-brand-blue-hover text-white text-xs font-extrabold rounded-xl shadow-md transition-all"
        >
          Guardar cambios
        </button>
      </form>
    </div>
  );
}
