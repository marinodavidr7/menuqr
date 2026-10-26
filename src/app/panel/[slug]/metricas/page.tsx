'use client';

import { useState, useEffect, use } from 'react';
import { BarChart3, TrendingUp, Eye, Video, ShoppingBag, Clock, Utensils } from 'lucide-react';
import { formatPrice } from '@/lib/formatters';

interface PageProps {
  params: Promise<{ slug: string }>;
}

export default function MetricsPanelPage({ params }: PageProps) {
  const { slug } = use(params);

  const [rangeDays, setRangeDays] = useState(30);
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    fetch(`/api/metrics?merchantSlug=${slug}&days=${rangeDays}`)
      .then((res) => res.json())
      .then((json) => setData(json))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [slug, rangeDays]);

  if (loading || !data) {
    return (
      <div className="py-20 text-center text-text-secondary text-sm font-semibold">
        Cargando métricas de {slug}...
      </div>
    );
  }

  const maxViews = Math.max(...(data.productsRanking || []).map((p: any) => p.views_count), 1);
  const maxOrdersHour = Math.max(...(data.peakHours || []).map((h: any) => h.orders), 1);

  return (
    <div className="flex flex-col gap-6">
      {/* Cabecera y Selector de Rango */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-surface-border">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-2xl bg-brand-blue/15 text-brand-blue flex items-center justify-center">
            <BarChart3 className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-xl sm:text-2xl font-black text-white">Métricas & Estadísticas</h1>
            <p className="text-xs text-text-secondary">
              Comportamiento de clientes, platos más visualizados y horas de mayor demanda
            </p>
          </div>
        </div>

        {/* Selector de Rango (7 / 30 / 90 días) */}
        <div className="flex items-center bg-surface p-1 rounded-xl border border-surface-border">
          {[7, 30, 90].map((days) => (
            <button
              key={days}
              onClick={() => setRangeDays(days)}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                rangeDays === days
                  ? 'bg-brand-blue text-white shadow-sm'
                  : 'text-text-secondary hover:text-white'
              }`}
            >
              {days} días
            </button>
          ))}
        </div>
      </div>

      {/* Tarjetas Principales de KPI */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="p-5 bg-surface border border-surface-border rounded-2xl shadow-sm flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-text-secondary uppercase">Facturación Período</span>
            <TrendingUp className="w-4 h-4 text-brand-success" />
          </div>
          <div className="mt-2">
            <span className="tabular-nums font-black text-2xl text-white">
              {formatPrice(data.totalRevenueCents)}
            </span>
            <span className="text-[11px] text-text-muted block mt-0.5">
              {data.totalOrdersCount} pedidos confirmados
            </span>
          </div>
        </div>

        <div className="p-5 bg-surface border border-surface-border rounded-2xl shadow-sm flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-text-secondary uppercase">Ticket Promedio</span>
            <ShoppingBag className="w-4 h-4 text-brand-blue" />
          </div>
          <div className="mt-2">
            <span className="tabular-nums font-black text-2xl text-white">
              {formatPrice(data.averageTicketCents)}
            </span>
            <span className="text-[11px] text-brand-success font-semibold block mt-0.5">
              Gastronomía de alto rendimiento
            </span>
          </div>
        </div>

        <div className="p-5 bg-surface border border-surface-border rounded-2xl shadow-sm flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-text-secondary uppercase">Canal Principal</span>
            <Utensils className="w-4 h-4 text-brand-amber" />
          </div>
          <div className="mt-2">
            <span className="font-black text-2xl text-white">
              Salón ({data.channelCounts?.salon || 0})
            </span>
            <span className="text-[11px] text-text-muted block mt-0.5">
              Delivery: {data.channelCounts?.delivery || 0} · Take Away: {data.channelCounts?.takeaway || 0}
            </span>
          </div>
        </div>
      </div>

      {/* Grilla: Ranking de Platos Más Vistos y Horas Pico */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Ranking de Platos */}
        <div className="bg-surface border border-surface-border rounded-2xl p-6 shadow-sm flex flex-col gap-5">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Eye className="w-5 h-5 text-brand-blue" />
              <h2 className="text-base font-bold text-white">Platos más visualizados</h2>
            </div>
            <span className="text-xs text-text-muted">Vistas carta vs videos</span>
          </div>

          <div className="flex flex-col gap-3.5">
            {(data.productsRanking || []).map((prod: any, idx: number) => {
              const widthPct = Math.round((prod.views_count / maxViews) * 100);

              return (
                <div key={prod.id} className="flex flex-col gap-1.5">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-bold text-white truncate max-w-[200px] sm:max-w-xs">
                      #{idx + 1} {prod.name}
                    </span>
                    <div className="flex items-center gap-3 text-[11px]">
                      <span className="tabular-nums font-semibold text-white flex items-center gap-1">
                        <Eye className="w-3 h-3 text-brand-blue" />
                        {prod.views_count}
                      </span>
                      {prod.video_url && (
                        <span className="tabular-nums font-semibold text-brand-amber flex items-center gap-1">
                          <Video className="w-3 h-3" />
                          {prod.video_views_count}
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Barra visual proporcional */}
                  <div className="h-2 w-full bg-surface-subtle rounded-full overflow-hidden">
                    <div
                      className="h-full bg-gradient-to-r from-brand-blue to-cyan-400 rounded-full transition-all duration-500"
                      style={{ width: `${widthPct}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Horas Pico Gastronómicas */}
        <div className="bg-surface border border-surface-border rounded-2xl p-6 shadow-sm flex flex-col gap-5">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Clock className="w-5 h-5 text-brand-amber" />
              <h2 className="text-base font-bold text-white">Horas pico de pedidos</h2>
            </div>
            <span className="text-xs text-text-muted">Distribución de 11:00 a 24:00</span>
          </div>

          {/* Gráfico de Barras Verticales */}
          <div className="h-56 flex items-end gap-2 pt-6 px-2">
            {(data.peakHours || []).map((h: any) => {
              const heightPct = Math.max(8, Math.round((h.orders / maxOrdersHour) * 100));

              return (
                <div key={h.hour} className="flex-1 flex flex-col items-center gap-2 h-full justify-end">
                  <span className="text-[10px] tabular-nums font-bold text-text-secondary">
                    {h.orders > 0 ? h.orders : ''}
                  </span>
                  <div
                    className="w-full bg-surface-hover hover:bg-brand-blue rounded-t-lg transition-all"
                    style={{ height: `${heightPct}%` }}
                    title={`${h.label}: ${h.orders} pedidos`}
                  />
                  <span className="text-[10px] text-text-muted font-mono truncate w-full text-center">
                    {h.hour}h
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
