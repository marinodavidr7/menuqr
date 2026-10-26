'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { Search, Star, Clock, Bike, ArrowUpDown, ChevronRight, Utensils, Store, PlusCircle, RefreshCw } from 'lucide-react';
import { Navbar } from '@/components/Navbar';
import { Merchant } from '@/lib/types';
import { formatPrice } from '@/lib/formatters';

export default function DirectoryPage() {
  const [merchants, setMerchants] = useState<Merchant[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [sort, setSort] = useState('rating');
  const [pageSize, setPageSize] = useState(12);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);

  const fetchMerchants = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams({
        q: search,
        sort,
        page: page.toString(),
        pageSize: pageSize.toString(),
      });
      const res = await fetch(`/api/merchants?${params.toString()}`);
      if (!res.ok) throw new Error('Error al cargar comercios');
      const data = await res.json();
      setMerchants(data.merchants || []);
      setTotal(data.total || 0);
    } catch (err: any) {
      setError(err.message || 'Error de conexión');
    } finally {
      setLoading(false);
    }
  }, [search, sort, page, pageSize]);

  useEffect(() => {
    fetchMerchants();
  }, [fetchMerchants]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setPage(1);
    fetchMerchants();
  };

  const startItem = total === 0 ? 0 : (page - 1) * pageSize + 1;
  const endItem = Math.min(page * pageSize, total);

  return (
    <div className="min-h-screen flex flex-col bg-background text-text-primary">
      <Navbar />

      {/* Hero / Banner de Bienvenida */}
      <section className="relative py-12 px-4 sm:px-6 bg-gradient-to-b from-surface/80 to-transparent border-b border-surface-border">
        <div className="max-w-4xl mx-auto text-center flex flex-col items-center">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-brand-blue/10 border border-brand-blue/30 text-brand-blue text-xs font-bold mb-4">
            <Store className="w-3.5 h-3.5" />
            <span>Plataforma gastronómica rioplatense</span>
          </div>

          <h1 className="text-3xl sm:text-5xl font-black tracking-tight text-white leading-tight">
            Descubrí las mejores cartas por <span className="text-brand-blue">código QR</span>
          </h1>
          <p className="mt-3 text-sm sm:text-base text-text-secondary max-w-2xl leading-relaxed">
            Mirá los platos en fotos de alta calidad y videos cortos, pedí directo desde tu mesa sin esperar y aboná con Mercado Pago sin comisión.
          </p>

          {/* Buscador Global del Directorio */}
          <form
            onSubmit={handleSearchSubmit}
            className="w-full max-w-2xl mt-8 flex flex-col sm:flex-row items-center gap-2 bg-surface p-2 rounded-2xl border border-surface-border shadow-2xl"
          >
            <div className="relative flex-1 w-full">
              <Search className="absolute left-3.5 top-3.5 w-5 h-5 text-text-muted" />
              <input
                type="text"
                placeholder="Buscá por nombre de local, especialidad o barrio..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full pl-11 pr-4 py-3 bg-transparent text-white placeholder:text-text-muted text-sm sm:text-base outline-none"
              />
            </div>
            <button
              type="submit"
              className="w-full sm:w-auto px-6 py-3 bg-brand-blue hover:bg-brand-blue-hover text-white font-bold text-sm rounded-xl shadow-md transition-colors"
            >
              Buscar
            </button>
          </form>

          {/* Botón CTA Registrá tu comercio y Acceso al Panel */}
          <div className="mt-4 flex flex-wrap items-center justify-center gap-3 text-xs">
            <span className="text-text-secondary">¿Gestionás un local gastronómico?</span>
            <Link
              href="/panel"
              className="font-bold text-brand-blue hover:underline flex items-center gap-1 bg-brand-blue/10 px-3 py-1.5 rounded-lg border border-brand-blue/30"
            >
              <Store className="w-3.5 h-3.5" />
              Entrar al panel administrativo
            </Link>
            <span className="text-surface-border hidden sm:inline">•</span>
            <Link
              href="/alta-comercio"
              className="font-bold text-brand-amber hover:underline flex items-center gap-1"
            >
              <PlusCircle className="w-3.5 h-3.5" />
              Registrar nuevo comercio
            </Link>
          </div>
        </div>
      </section>

      {/* Contenido Principal: Filtros y Grilla de Locales */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 py-8">
        {/* Barra de Filtros y Orden */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-surface-border">
          <div>
            <h2 className="text-xl font-extrabold text-white">Comercios destacados</h2>
            <p className="text-xs text-text-secondary mt-0.5">
              Mostrando {startItem}-{endItem} de {total} locales
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            {/* Orden */}
            <div className="flex items-center gap-2 bg-surface px-3 py-1.5 rounded-xl border border-surface-border">
              <ArrowUpDown className="w-4 h-4 text-brand-blue" />
              <select
                value={sort}
                onChange={(e) => {
                  setSort(e.target.value);
                  setPage(1);
                }}
                className="bg-transparent text-xs font-semibold text-white outline-none cursor-pointer"
              >
                <option value="rating" className="bg-surface">Mejor calificados</option>
                <option value="name_asc" className="bg-surface">Nombre (A - Z)</option>
                <option value="name_desc" className="bg-surface">Nombre (Z - A)</option>
                <option value="recent" className="bg-surface">Más recientes</option>
              </select>
            </div>

            {/* Selector de Items por Página (12 / 24 / 48) */}
            <div className="flex items-center gap-2 bg-surface px-3 py-1.5 rounded-xl border border-surface-border">
              <span className="text-xs text-text-secondary">Mostrar:</span>
              <select
                value={pageSize}
                onChange={(e) => {
                  setPageSize(Number(e.target.value));
                  setPage(1);
                }}
                className="bg-transparent text-xs font-bold text-white outline-none cursor-pointer"
              >
                <option value={12} className="bg-surface">12 por pág.</option>
                <option value={24} className="bg-surface">24 por pág.</option>
                <option value={48} className="bg-surface">48 por pág.</option>
              </select>
            </div>
          </div>
        </div>

        {/* Estado: Error de red con reintento */}
        {error && (
          <div className="py-12 text-center flex flex-col items-center">
            <p className="text-brand-danger text-sm font-semibold">{error}</p>
            <button
              onClick={fetchMerchants}
              className="mt-3 px-4 py-2 bg-surface border border-surface-border rounded-xl text-xs font-bold text-white hover:bg-surface-hover flex items-center gap-2"
            >
              <RefreshCw className="w-3.5 h-3.5 text-brand-blue" />
              Reintentar
            </button>
          </div>
        )}

        {/* Estado: Cargando (Skeletons) */}
        {loading && !error && (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 pt-6">
            {Array.from({ length: 6 }).map((_, i) => (
              <div
                key={i}
                className="bg-surface border border-surface-border rounded-2xl overflow-hidden animate-pulse flex flex-col"
              >
                <div className="w-full aspect-[16/9] bg-surface-subtle" />
                <div className="p-4 flex flex-col gap-3">
                  <div className="h-5 bg-surface-hover rounded w-3/4" />
                  <div className="h-3 bg-surface-hover rounded w-1/2" />
                  <div className="h-4 bg-surface-hover rounded w-full mt-2" />
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Estado: Vacío */}
        {!loading && !error && merchants.length === 0 && (
          <div className="py-20 text-center flex flex-col items-center">
            <div className="w-16 h-16 rounded-2xl bg-surface flex items-center justify-center text-text-muted mb-4 border border-surface-border">
              <Utensils className="w-8 h-8" />
            </div>
            <h3 className="text-lg font-bold text-white">No encontramos comercios</h3>
            <p className="text-xs text-text-secondary mt-1 max-w-sm">
              Probá ajustando los términos de búsqueda o borrando los filtros.
            </p>
            <button
              onClick={() => {
                setSearch('');
                setSort('rating');
              }}
              className="mt-4 px-4 py-2 bg-brand-blue rounded-xl text-xs font-bold text-white"
            >
              Ver todos los comercios
            </button>
          </div>
        )}

        {/* Grilla de Comercios */}
        {!loading && !error && merchants.length > 0 && (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 pt-6">
            {merchants.map((merchant) => (
              <Link
                key={merchant.id}
                href={`/${merchant.slug}`}
                className="group bg-surface border border-surface-border hover:border-brand-blue/50 rounded-2xl overflow-hidden shadow-sm hover:shadow-xl transition-all flex flex-col"
              >
                {/* Imagen de Portada y Logo */}
                <div className="relative w-full aspect-[16/9] bg-surface-subtle overflow-hidden">
                  <Image
                    src={merchant.cover_url || 'https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?w=1200&auto=format&fit=crop&q=80'}
                    alt={merchant.name}
                    fill
                    sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
                    className="object-cover group-hover:scale-105 transition-transform duration-300"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-black/30" />

                  {/* Chip Abierto/Cerrado */}
                  <div className="absolute top-3 left-3 z-10 px-2.5 py-1 rounded-full bg-black/70 backdrop-blur-md text-[11px] font-bold flex items-center gap-1.5 text-brand-success border border-brand-success/30">
                    <span className="w-1.5 h-1.5 rounded-full bg-brand-success animate-pulse" />
                    <span>Abierto</span>
                  </div>

                  {/* Logo circular */}
                  <div className="absolute -bottom-4 right-4 w-14 h-14 rounded-2xl overflow-hidden border-2 border-surface bg-surface shadow-md">
                    <Image
                      src={merchant.logo_url || 'https://images.unsplash.com/photo-1555396273-367ea4eb4db5?w=160&auto=format&fit=crop&q=80'}
                      alt={`Logo ${merchant.name}`}
                      fill
                      className="object-cover"
                    />
                  </div>
                </div>

                {/* Contenido de la Ficha */}
                <div className="p-4 pt-5 flex-1 flex flex-col justify-between">
                  <div>
                    <span className="text-[11px] font-bold text-brand-blue uppercase tracking-wider">
                      {merchant.category}
                    </span>
                    <h3 className="text-lg font-black text-white group-hover:text-brand-blue transition-colors line-clamp-1 mt-0.5">
                      {merchant.name}
                    </h3>
                    <p className="mt-1 text-xs text-text-secondary line-clamp-2 leading-relaxed">
                      {merchant.description}
                    </p>
                  </div>

                  {/* Datos Clave: Rating, Envío y Demora */}
                  <div className="mt-4 pt-3 border-t border-surface-border flex items-center justify-between text-xs text-text-secondary">
                    {/* Rating con conteo */}
                    <div className="flex items-center gap-1 font-bold text-white">
                      <Star className="w-3.5 h-3.5 fill-brand-amber text-brand-amber" />
                      <span>{merchant.rating_avg.toFixed(1)}</span>
                      <span className="text-text-muted font-normal">
                        ({merchant.rating_count})
                      </span>
                    </div>

                    {/* Envío y Tiempo */}
                    <div className="flex items-center gap-3">
                      <div className="flex items-center gap-1 font-semibold text-text-primary">
                        <Bike className="w-3.5 h-3.5 text-brand-blue" />
                        <span className="tabular-nums">
                          Envío {formatPrice(merchant.delivery_fee_cents)}
                        </span>
                      </div>
                      <div className="flex items-center gap-1">
                        <Clock className="w-3.5 h-3.5 text-text-muted" />
                        <span>{merchant.delivery_min_minutes} min</span>
                      </div>
                    </div>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        )}
      </main>

      {/* Footer */}
      <footer className="mt-auto border-t border-surface-border bg-[#0B1220] py-8 text-center text-xs text-text-secondary">
        <div className="max-w-7xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-4">
          <p>© 2026 MENUQR · Plataforma gastronómica rioplatense sin comisión.</p>
          <div className="flex items-center gap-4">
            <Link href="/alta-comercio" className="hover:text-white">Alta de comercio</Link>
            <Link href="/entrar" className="hover:text-white">Acceso comensal y equipo</Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
