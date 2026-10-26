'use client';

import { useState, useEffect, use, useMemo } from 'react';
import Image from 'next/image';
import {
  BookOpen, Plus, Trash2, Edit2, Check, Video, Eye, EyeOff,
  X, Sparkles, Search, Filter, Camera, Clapperboard, CheckCircle2,
  DollarSign
} from 'lucide-react';
import { Product, Category } from '@/lib/types';
import { formatPrice } from '@/lib/formatters';

interface PageProps {
  params: Promise<{ slug: string }>;
}

export default function MenuEditorPanelPage({ params }: PageProps) {
  const { slug } = use(params);

  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [statusMsg, setStatusMsg] = useState<string | null>(null);

  // Formulario nuevo plato
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [name, setName] = useState('');
  const [categoryId, setCategoryId] = useState('');
  const [description, setDescription] = useState('');
  const [price, setPrice] = useState('');
  const [imageUrl, setImageUrl] = useState('');
  const [videoUrl, setVideoUrl] = useState('');
  const [saving, setSaving] = useState(false);

  // Modal Edición Completa de Plato Existente
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [editName, setEditName] = useState('');
  const [editCategoryId, setEditCategoryId] = useState('');
  const [editDescription, setEditDescription] = useState('');
  const [editPrice, setEditPrice] = useState('');
  const [editImageUrl, setEditImageUrl] = useState('');
  const [editVideoUrl, setEditVideoUrl] = useState('');
  const [editAvailable, setEditAvailable] = useState(true);
  const [savingEdit, setSavingEdit] = useState(false);

  // Edición rápida inline de precio
  const [editingPriceId, setEditingPriceId] = useState<string | null>(null);
  const [tempPrice, setTempPrice] = useState('');

  const fetchMenu = async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/merchants/${slug}`);
      if (res.ok) {
        const data = await res.json();
        setProducts(data.products || []);
        setCategories(data.categories || []);
        if (data.categories?.length > 0 && !categoryId) {
          setCategoryId(data.categories[0].id);
        }
      }
    } catch {} finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMenu();
  }, [slug]);

  // Mostrar mensaje de éxito temporal
  const showSuccess = (msg: string) => {
    setStatusMsg(msg);
    setTimeout(() => setStatusMsg(null), 3000);
  };

  // Toggle rápido de disponibilidad
  const handleToggleAvailable = async (productId: string, current: boolean) => {
    try {
      await fetch('/api/products', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          productId,
          merchantSlug: slug,
          available: !current,
        }),
      });
      setProducts(products.map((p) => (p.id === productId ? { ...p, available: !current } : p)));
      showSuccess(!current ? 'Plato marcado como disponible' : 'Plato pausado temporalmente');
    } catch {}
  };

  // Guardar nuevo precio inline
  const handleSavePrice = async (productId: string) => {
    const newPriceCents = Math.round(parseFloat(tempPrice) * 100);
    if (isNaN(newPriceCents) || newPriceCents <= 0) {
      setEditingPriceId(null);
      return;
    }

    try {
      await fetch('/api/products', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          productId,
          merchantSlug: slug,
          priceCents: newPriceCents,
        }),
      });
      setProducts(products.map((p) => (p.id === productId ? { ...p, price_cents: newPriceCents } : p)));
      showSuccess('Precio actualizado');
    } catch {} finally {
      setEditingPriceId(null);
    }
  };

  // Abrir modal de edición completa
  const handleOpenEditModal = (product: Product) => {
    setEditingProduct(product);
    setEditName(product.name);
    setEditCategoryId(product.category_id);
    setEditDescription(product.description || '');
    setEditPrice((product.price_cents / 100).toString());
    setEditImageUrl(product.image_url || '');
    setEditVideoUrl(product.video_url || '');
    setEditAvailable(Boolean(product.available));
  };

  // Guardar edición completa de plato
  const handleSaveEditProduct = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingProduct) return;

    setSavingEdit(true);
    const newPriceCents = Math.round(parseFloat(editPrice) * 100);

    try {
      const res = await fetch('/api/products', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          productId: editingProduct.id,
          merchantSlug: slug,
          name: editName,
          categoryId: editCategoryId,
          description: editDescription,
          priceCents: newPriceCents,
          imageUrl: editImageUrl,
          videoUrl: editVideoUrl || null,
          available: editAvailable,
        }),
      });

      if (!res.ok) throw new Error('Error al actualizar plato');

      setProducts(
        products.map((p) =>
          p.id === editingProduct.id
            ? {
                ...p,
                name: editName,
                category_id: editCategoryId,
                description: editDescription,
                price_cents: newPriceCents,
                image_url: editImageUrl,
                video_url: editVideoUrl || null,
                available: editAvailable,
              }
            : p
        )
      );

      setEditingProduct(null);
      showSuccess(`¡Plato "${editName}" actualizado con éxito!`);
    } catch (err: any) {
      alert(err.message || 'Error al guardar cambios');
    } finally {
      setSavingEdit(false);
    }
  };

  // Crear nuevo plato
  const handleCreateProduct = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      const res = await fetch('/api/products', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          merchantSlug: slug,
          categoryId,
          name,
          description,
          priceCents: Math.round(parseFloat(price) * 100),
          imageUrl,
          videoUrl: videoUrl || null,
        }),
      });

      if (res.ok) {
        setIsCreateModalOpen(false);
        setName('');
        setDescription('');
        setPrice('');
        setImageUrl('');
        setVideoUrl('');
        await fetchMenu();
        showSuccess('¡Plato agregado a la carta!');
      }
    } catch {} finally {
      setSaving(false);
    }
  };

  // Eliminar plato
  const handleDeleteProduct = async (productId: string) => {
    if (!confirm('¿Seguro que querés eliminar este plato de la carta?')) return;
    try {
      await fetch(`/api/products?productId=${productId}&merchantSlug=${slug}`, {
        method: 'DELETE',
      });
      setProducts(products.filter((p) => p.id !== productId));
      showSuccess('Plato eliminado');
    } catch {}
  };

  // Filtrado de platos por búsqueda y categoría
  const filteredProducts = useMemo(() => {
    return products.filter((p) => {
      const matchCategory = selectedCategory === 'all' || p.category_id === selectedCategory;
      const matchSearch =
        !searchQuery ||
        p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (p.description && p.description.toLowerCase().includes(searchQuery.toLowerCase()));
      return matchCategory && matchSearch;
    });
  }, [products, selectedCategory, searchQuery]);

  return (
    <div className="flex flex-col gap-6">
      {/* Cabecera del Editor */}
      <div className="bg-surface border border-surface-border rounded-2xl p-4 flex flex-col md:flex-row md:items-center justify-between gap-4 shadow-sm">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-2xl bg-brand-blue/15 text-brand-blue flex items-center justify-center flex-shrink-0">
            <BookOpen className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl sm:text-2xl font-black text-white">Editor de Carta</h1>
              <span className="text-xs px-2.5 py-0.5 rounded-full bg-surface-subtle border border-surface-border font-bold text-text-secondary">
                {products.length} platos
              </span>
            </div>
            <p className="text-xs text-text-secondary">
              Editá nombres, categorías, descripciones, fotos, videos cortos y precios al instante
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          {statusMsg && (
            <div className="px-3 py-1.5 bg-brand-success/15 border border-brand-success/30 rounded-xl text-xs font-bold text-brand-success flex items-center gap-1.5 animate-in fade-in">
              <CheckCircle2 className="w-4 h-4" />
              <span>{statusMsg}</span>
            </div>
          )}

          <button
            onClick={() => setIsCreateModalOpen(true)}
            className="px-4 py-2 bg-brand-blue hover:bg-brand-blue-hover text-white text-xs font-extrabold rounded-xl shadow-md transition-all flex items-center gap-2 active:scale-95"
          >
            <Plus className="w-4 h-4" />
            <span>Nuevo Plato</span>
          </button>
        </div>
      </div>

      {/* Barra de Filtros y Búsqueda */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        {/* Filtro por categorías */}
        <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar py-1">
          <button
            onClick={() => setSelectedCategory('all')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all whitespace-nowrap ${
              selectedCategory === 'all'
                ? 'bg-brand-blue text-white shadow-sm'
                : 'bg-surface hover:bg-surface-hover text-text-secondary border border-surface-border'
            }`}
          >
            Todas ({products.length})
          </button>
          {categories.map((cat) => {
            const count = products.filter((p) => p.category_id === cat.id).length;
            return (
              <button
                key={cat.id}
                onClick={() => setSelectedCategory(cat.id)}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all whitespace-nowrap ${
                  selectedCategory === cat.id
                    ? 'bg-brand-blue text-white shadow-sm'
                    : 'bg-surface hover:bg-surface-hover text-text-secondary border border-surface-border'
                }`}
              >
                {cat.name} ({count})
              </button>
            );
          })}
        </div>

        {/* Buscador */}
        <div className="relative w-full sm:w-64">
          <Search className="absolute left-3 top-2.5 w-4 h-4 text-text-muted" />
          <input
            type="text"
            placeholder="Buscar plato o ingrediente..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-3 py-1.5 bg-surface border border-surface-border rounded-xl text-xs text-white placeholder:text-text-muted outline-none focus:border-brand-blue"
          />
        </div>
      </div>

      {/* Tabla de Platos de la Carta */}
      <div className="bg-surface border border-surface-border rounded-2xl overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-surface-subtle text-text-secondary border-b border-surface-border uppercase font-semibold">
              <tr>
                <th className="py-3 px-4">Plato (Click para editar)</th>
                <th className="py-3 px-4">Categoría</th>
                <th className="py-3 px-4">Precio (ARS)</th>
                <th className="py-3 px-4">Disponibilidad</th>
                <th className="py-3 px-4">Popularidad</th>
                <th className="py-3 px-4 text-right">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-surface-border">
              {filteredProducts.map((p) => {
                const catName = categories.find((c) => c.id === p.category_id)?.name || 'General';

                return (
                  <tr key={p.id} className="hover:bg-surface-subtle/50 transition-colors group">
                    {/* Foto, Nombre y Descripción (Click abre editor completo) */}
                    <td className="py-3 px-4">
                      <div
                        onClick={() => handleOpenEditModal(p)}
                        className="flex items-center gap-3 cursor-pointer"
                        title="Click para editar nombre, foto, video o descripción"
                      >
                        <div className="relative w-12 h-12 rounded-xl overflow-hidden bg-surface-subtle flex-shrink-0 border border-surface-border group-hover:border-brand-blue transition-colors">
                          {p.image_url ? (
                            <Image src={p.image_url} alt={p.name} fill className="object-cover" />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center text-text-muted text-[10px]">
                              Sin foto
                            </div>
                          )}
                        </div>
                        <div className="flex flex-col">
                          <span className="font-extrabold text-white text-sm group-hover:text-brand-blue transition-colors flex items-center gap-1.5">
                            <span>{p.name}</span>
                            <Edit2 className="w-3 h-3 text-text-muted opacity-0 group-hover:opacity-100 transition-opacity" />
                          </span>
                          <span className="text-[11px] text-text-secondary line-clamp-1 max-w-xs">
                            {p.description || 'Sin descripción'}
                          </span>
                          <div className="flex items-center gap-2 mt-0.5">
                            {p.video_url && (
                              <span className="px-1.5 py-0.5 bg-brand-blue/20 text-brand-blue rounded text-[10px] font-bold flex items-center gap-1">
                                <Video className="w-3 h-3" />
                                Video corto
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                    </td>

                    {/* Categoría */}
                    <td className="py-3 px-4 text-text-secondary font-medium">
                      {catName}
                    </td>

                    {/* Precio Editable Inline */}
                    <td className="py-3 px-4 tabular-nums">
                      {editingPriceId === p.id ? (
                        <div className="flex items-center gap-1">
                          <span className="text-text-muted">$</span>
                          <input
                            type="number"
                            autoFocus
                            value={tempPrice}
                            onChange={(e) => setTempPrice(e.target.value)}
                            onKeyDown={(e) => e.key === 'Enter' && handleSavePrice(p.id)}
                            className="w-24 px-2 py-1 bg-surface-subtle border border-brand-blue rounded text-white text-xs font-bold outline-none"
                          />
                          <button
                            onClick={() => handleSavePrice(p.id)}
                            className="w-6 h-6 rounded bg-brand-success text-white flex items-center justify-center"
                          >
                            <Check className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      ) : (
                        <div
                          onClick={() => {
                            setEditingPriceId(p.id);
                            setTempPrice((p.price_cents / 100).toString());
                          }}
                          className="group inline-flex items-center gap-1.5 cursor-pointer font-bold text-white hover:text-brand-blue"
                          title="Click para editar precio rápido"
                        >
                          <span>{formatPrice(p.price_cents)}</span>
                          <Edit2 className="w-3 h-3 text-text-muted group-hover:text-brand-blue transition-colors" />
                        </div>
                      )}
                    </td>

                    {/* Toggle Switch Disponibilidad */}
                    <td className="py-3 px-4">
                      <button
                        onClick={() => handleToggleAvailable(p.id, Boolean(p.available))}
                        className={`px-3 py-1 rounded-full text-[11px] font-bold flex items-center gap-1.5 transition-colors ${
                          p.available
                            ? 'bg-brand-success/15 text-brand-success hover:bg-brand-success/25'
                            : 'bg-brand-danger/15 text-brand-danger hover:bg-brand-danger/25'
                        }`}
                      >
                        {p.available ? (
                          <>
                            <Eye className="w-3 h-3" />
                            <span>Disponible</span>
                          </>
                        ) : (
                          <>
                            <EyeOff className="w-3 h-3" />
                            <span>Pausado</span>
                          </>
                        )}
                      </button>
                    </td>

                    {/* Popularidad / Vistas */}
                    <td className="py-3 px-4 tabular-nums text-text-muted">
                      {p.views_count} vistas
                    </td>

                    {/* Acciones: Editar Completo & Eliminar */}
                    <td className="py-3 px-4 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        <button
                          onClick={() => handleOpenEditModal(p)}
                          className="w-8 h-8 rounded-lg bg-surface-subtle hover:bg-brand-blue/20 text-text-secondary hover:text-brand-blue inline-flex items-center justify-center transition-colors border border-surface-border"
                          title="Editar plato completo (nombre, foto, video, descripción, precio)"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => handleDeleteProduct(p.id)}
                          className="w-8 h-8 rounded-lg bg-surface-subtle hover:bg-brand-danger/20 text-text-muted hover:text-brand-danger inline-flex items-center justify-center transition-colors border border-surface-border"
                          title="Eliminar plato"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* MODAL 1: EDICIÓN COMPLETA DE PLATO */}
      {editingProduct && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200"
          onClick={() => setEditingProduct(null)}
        >
          <div
            className="relative w-full max-w-xl bg-surface border border-surface-border rounded-2xl p-6 shadow-2xl modal-sheet flex flex-col gap-4 text-text-primary max-h-[90vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b border-surface-border pb-3">
              <div className="flex items-center gap-2">
                <Edit2 className="w-5 h-5 text-brand-blue" />
                <h3 className="text-lg font-black text-white">Editar Plato de la Carta</h3>
              </div>
              <button
                onClick={() => setEditingProduct(null)}
                className="w-8 h-8 rounded-full bg-surface-hover text-text-secondary hover:text-white flex items-center justify-center"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSaveEditProduct} className="flex flex-col gap-3.5">
              {/* Nombre */}
              <div>
                <label className="block text-xs font-semibold text-text-secondary mb-1">Nombre del plato *</label>
                <input
                  type="text"
                  required
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-surface-subtle border border-surface-border rounded-xl text-white text-sm outline-none focus:border-brand-blue"
                />
              </div>

              {/* Categoría y Precio */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-text-secondary mb-1">Categoría *</label>
                  <select
                    value={editCategoryId}
                    onChange={(e) => setEditCategoryId(e.target.value)}
                    className="w-full px-3.5 py-2.5 bg-surface-subtle border border-surface-border rounded-xl text-white text-xs outline-none focus:border-brand-blue"
                  >
                    {categories.map((c) => (
                      <option key={c.id} value={c.id} className="bg-surface text-white">
                        {c.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-text-secondary mb-1">Precio en ARS ($) *</label>
                  <input
                    type="number"
                    required
                    value={editPrice}
                    onChange={(e) => setEditPrice(e.target.value)}
                    className="w-full px-3.5 py-2.5 bg-surface-subtle border border-surface-border rounded-xl text-white text-sm outline-none focus:border-brand-blue"
                  />
                </div>
              </div>

              {/* Descripción */}
              <div>
                <label className="block text-xs font-semibold text-text-secondary mb-1">Descripción e Ingredientes</label>
                <textarea
                  rows={2}
                  value={editDescription}
                  onChange={(e) => setEditDescription(e.target.value)}
                  className="w-full px-3.5 py-2 bg-surface-subtle border border-surface-border rounded-xl text-white text-xs outline-none focus:border-brand-blue"
                />
              </div>

              {/* URL Foto con Preview */}
              <div>
                <label className="block text-xs font-semibold text-text-secondary mb-1 flex items-center gap-1.5">
                  <Camera className="w-3.5 h-3.5 text-brand-amber" />
                  <span>Foto del plato (URL de imagen)</span>
                </label>
                <div className="flex gap-2">
                  <input
                    type="url"
                    value={editImageUrl}
                    onChange={(e) => setEditImageUrl(e.target.value)}
                    className="flex-1 px-3.5 py-2 bg-surface-subtle border border-surface-border rounded-xl text-white text-xs outline-none focus:border-brand-blue"
                    placeholder="https://images.unsplash.com/..."
                  />
                  {editImageUrl && (
                    <div className="relative w-10 h-10 rounded-lg overflow-hidden bg-surface-subtle border border-surface-border flex-shrink-0">
                      <Image src={editImageUrl} alt="Preview" fill className="object-cover" />
                    </div>
                  )}
                </div>
              </div>

              {/* URL Video Corto Opcional con Preview */}
              <div>
                <label className="block text-xs font-semibold text-text-secondary mb-1 flex items-center gap-1.5">
                  <Clapperboard className="w-3.5 h-3.5 text-brand-blue" />
                  <span>Video corto opcional (URL de MP4)</span>
                </label>
                <input
                  type="url"
                  value={editVideoUrl}
                  onChange={(e) => setEditVideoUrl(e.target.value)}
                  className="w-full px-3.5 py-2 bg-surface-subtle border border-surface-border rounded-xl text-white text-xs outline-none focus:border-brand-blue"
                  placeholder="https://assets.mixkit.co/...mp4"
                />
                {editVideoUrl && (
                  <div className="mt-2 rounded-xl overflow-hidden border border-surface-border max-w-[200px]">
                    <video src={editVideoUrl} autoPlay loop muted playsInline className="w-full h-24 object-cover" />
                  </div>
                )}
              </div>

              {/* Switch de disponibilidad */}
              <div className="p-3 bg-surface-subtle border border-surface-border rounded-xl flex items-center justify-between">
                <div>
                  <span className="text-xs font-bold text-white block">Estado en la carta</span>
                  <span className="text-[11px] text-text-secondary">
                    {editAvailable ? 'Visible y habilitado para pedir' : 'Pausado (no se puede pedir)'}
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => setEditAvailable(!editAvailable)}
                  className={`px-3 py-1 rounded-full text-xs font-bold transition-colors ${
                    editAvailable ? 'bg-brand-success text-white' : 'bg-brand-danger text-white'
                  }`}
                >
                  {editAvailable ? 'Disponible' : 'Pausado'}
                </button>
              </div>

              {/* Botones */}
              <div className="flex items-center gap-2 pt-2 border-t border-surface-border">
                <button
                  type="button"
                  onClick={() => setEditingProduct(null)}
                  className="flex-1 py-2.5 bg-surface hover:bg-surface-hover text-text-secondary hover:text-white rounded-xl text-xs font-bold border border-surface-border transition-colors"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={savingEdit}
                  className="flex-1 py-2.5 bg-brand-blue hover:bg-brand-blue-hover text-white rounded-xl text-xs font-extrabold shadow-md transition-all disabled:opacity-50"
                >
                  {savingEdit ? 'Guardando cambios...' : 'Guardar Cambios'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 2: NUEVO PLATO */}
      {isCreateModalOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200"
          onClick={() => setIsCreateModalOpen(false)}
        >
          <div
            className="relative w-full max-w-lg bg-surface border border-surface-border rounded-2xl p-6 shadow-2xl modal-sheet flex flex-col gap-4 text-text-primary max-h-[90vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b border-surface-border pb-3">
              <h3 className="text-lg font-black text-white">Agregar nuevo plato a la carta</h3>
              <button
                onClick={() => setIsCreateModalOpen(false)}
                className="w-8 h-8 rounded-full bg-surface-hover text-text-secondary hover:text-white flex items-center justify-center"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleCreateProduct} className="flex flex-col gap-3">
              <div>
                <label className="block text-xs font-semibold text-text-secondary mb-1">Nombre del plato *</label>
                <input
                  type="text"
                  required
                  placeholder="Ej: Provoleta Rellena con Jamón Crudo"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-surface-subtle border border-surface-border rounded-xl text-white text-sm outline-none focus:border-brand-blue"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-text-secondary mb-1">Categoría *</label>
                  <select
                    value={categoryId}
                    onChange={(e) => setCategoryId(e.target.value)}
                    className="w-full px-3.5 py-2.5 bg-surface-subtle border border-surface-border rounded-xl text-white text-xs outline-none focus:border-brand-blue"
                  >
                    {categories.map((c) => (
                      <option key={c.id} value={c.id} className="bg-surface text-white">
                        {c.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-text-secondary mb-1">Precio en ARS ($) *</label>
                  <input
                    type="number"
                    required
                    placeholder="14500"
                    value={price}
                    onChange={(e) => setPrice(e.target.value)}
                    className="w-full px-3.5 py-2.5 bg-surface-subtle border border-surface-border rounded-xl text-white text-sm outline-none focus:border-brand-blue"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-text-secondary mb-1">Foto del plato (URL de imagen)</label>
                <input
                  type="url"
                  placeholder="https://..."
                  value={imageUrl}
                  onChange={(e) => setImageUrl(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-surface-subtle border border-surface-border rounded-xl text-white text-xs outline-none focus:border-brand-blue"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-text-secondary mb-1">Video corto opcional (URL de MP4)</label>
                <input
                  type="url"
                  placeholder="https://assets.mixkit.co/...mp4"
                  value={videoUrl}
                  onChange={(e) => setVideoUrl(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-surface-subtle border border-surface-border rounded-xl text-white text-xs outline-none focus:border-brand-blue"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-text-secondary mb-1">Descripción</label>
                <textarea
                  rows={2}
                  placeholder="Detalle de ingredientes y preparación..."
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-surface-subtle border border-surface-border rounded-xl text-white text-xs outline-none focus:border-brand-blue"
                />
              </div>

              <button
                type="submit"
                disabled={saving}
                className="w-full py-3 bg-brand-blue hover:bg-brand-blue-hover text-white font-extrabold text-sm rounded-xl shadow-md transition-all mt-2"
              >
                {saving ? 'Guardando...' : 'Publicar plato en la carta'}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
