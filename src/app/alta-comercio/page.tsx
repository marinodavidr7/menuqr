'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Store, UtensilsCrossed, CheckCircle2, ChevronRight, ChevronLeft, ArrowRight, QrCode, Sparkles } from 'lucide-react';
import { Navbar } from '@/components/Navbar';
import { formatPrice } from '@/lib/formatters';

export default function OnboardingPage() {
  const router = useRouter();

  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Paso 1: Cuenta / Responsable
  const [ownerName, setOwnerName] = useState('');
  const [ownerEmail, setOwnerEmail] = useState('');
  const [ownerPassword, setOwnerPassword] = useState('password123');

  // Paso 2: Datos del Local
  const [merchantName, setMerchantName] = useState('');
  const [category, setCategory] = useState('Bodegón Porteño');
  const [description, setDescription] = useState('');
  const [address, setAddress] = useState('');
  const [phone, setPhone] = useState('');
  const [deliveryFee, setDeliveryFee] = useState('2500'); // $ 2.500
  const [deliveryMinutes, setDeliveryMinutes] = useState('30');

  // Paso 3: Primer plato
  const [dishName, setDishName] = useState('Milanesa Especial de la Casa');
  const [dishPrice, setDishPrice] = useState('18500'); // $ 18.500
  const [dishDescription, setDishDescription] = useState('Acompañada con papas fritas crocantes.');
  const [dishImage, setDishImage] = useState('https://images.unsplash.com/photo-1598515214211-89d3c73ae83b?w=800&auto=format&fit=crop&q=80');

  // Resultado
  const [createdSlug, setCreatedSlug] = useState<string | null>(null);

  // Verificar si ya tiene sesión
  useEffect(() => {
    fetch('/api/auth')
      .then((res) => res.json())
      .then((data) => {
        if (data.user) {
          setOwnerName(data.user.name);
          setOwnerEmail(data.user.email);
          setStep(2); // Avanzar directo a datos del comercio
        }
      })
      .catch(() => {});
  }, []);

  const handleNextStep1 = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      // Registrar o loguear usuario
      const res = await fetch('/api/auth', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'register',
          name: ownerName,
          email: ownerEmail,
          password: ownerPassword,
        }),
      });

      const data = await res.json();
      if (!res.ok && data.error !== 'Ya existe una cuenta con este correo electrónico') {
        throw new Error(data.error);
      }

      setStep(2);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleCompleteOnboarding = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      // 1. Crear el local
      const res = await fetch('/api/merchants', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: merchantName,
          category,
          description: description || 'Excelente cocina con productos de primera calidad.',
          address_line: address || 'Buenos Aires, Argentina',
          phone,
          delivery_fee_cents: parseInt(deliveryFee, 10) * 100,
          delivery_min_minutes: parseInt(deliveryMinutes, 10),
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error);

      const slug = data.slug;
      setCreatedSlug(slug);

      // 2. Crear primer plato para la carta
      if (dishName && dishPrice) {
        // Obtener categorías del nuevo local
        const mRes = await fetch(`/api/merchants/${slug}`);
        const mData = await mRes.json();
        const catId = mData.categories?.[0]?.id;

        if (catId) {
          await fetch('/api/products', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              action: 'create',
              merchantSlug: slug,
              name: dishName,
              categoryId: catId,
              description: dishDescription,
              priceCents: parseInt(dishPrice, 10) * 100,
              imageUrl: dishImage,
            }),
          });
        }
      }

      setStep(4); // Pantalla final de éxito
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-background text-text-primary">
      <Navbar />

      <main className="flex-1 max-w-2xl w-full mx-auto px-4 py-8 flex flex-col gap-6">
        {/* Barra de Progreso */}
        <div className="flex flex-col gap-2">
          <div className="flex items-center justify-between text-xs font-bold text-text-secondary">
            <span>Paso {Math.min(step, 3)} de 3</span>
            <span>
              {step === 1 && 'Tu cuenta'}
              {step === 2 && 'Datos del local'}
              {step === 3 && 'Primer plato & QR'}
              {step === 4 && '¡Comercio activo!'}
            </span>
          </div>
          <div className="h-2 w-full bg-surface rounded-full overflow-hidden border border-surface-border">
            <div
              className="h-full bg-gradient-to-r from-brand-blue to-brand-amber transition-all duration-300"
              style={{ width: `${(Math.min(step, 3) / 3) * 100}%` }}
            />
          </div>
        </div>

        {error && (
          <div className="p-3 bg-brand-danger/10 border border-brand-danger/30 rounded-xl text-xs text-brand-danger font-semibold">
            {error}
          </div>
        )}

        {/* Paso 1: Cuenta */}
        {step === 1 && (
          <form onSubmit={handleNextStep1} className="bg-surface border border-surface-border rounded-2xl p-6 shadow-xl flex flex-col gap-4">
            <div>
              <h2 className="text-xl font-black text-white">1. Creá tu cuenta de responsable</h2>
              <p className="text-xs text-text-secondary mt-1">Con estos datos vas a administrar el local, las mesas y la caja.</p>
            </div>

            <div>
              <label className="block text-xs font-semibold text-text-secondary mb-1">Nombre completo *</label>
              <input
                type="text"
                required
                placeholder="Ej: Pablo Lescano"
                value={ownerName}
                onChange={(e) => setOwnerName(e.target.value)}
                className="w-full px-3.5 py-2.5 bg-surface-subtle border border-surface-border rounded-xl text-white text-sm outline-none focus:border-brand-blue"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-text-secondary mb-1">Correo electrónico *</label>
              <input
                type="email"
                required
                placeholder="dueno@tunegocio.com"
                value={ownerEmail}
                onChange={(e) => setOwnerEmail(e.target.value)}
                className="w-full px-3.5 py-2.5 bg-surface-subtle border border-surface-border rounded-xl text-white text-sm outline-none focus:border-brand-blue"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-text-secondary mb-1">Contraseña de acceso *</label>
              <input
                type="password"
                required
                placeholder="••••••••"
                value={ownerPassword}
                onChange={(e) => setOwnerPassword(e.target.value)}
                className="w-full px-3.5 py-2.5 bg-surface-subtle border border-surface-border rounded-xl text-white text-sm outline-none focus:border-brand-blue"
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 bg-brand-blue hover:bg-brand-blue-hover text-white font-extrabold text-sm rounded-xl shadow-md transition-all flex items-center justify-center gap-2 mt-2"
            >
              <span>Continuar al paso 2</span>
              <ChevronRight className="w-4 h-4" />
            </button>
          </form>
        )}

        {/* Paso 2: Datos del Local */}
        {step === 2 && (
          <div className="bg-surface border border-surface-border rounded-2xl p-6 shadow-xl flex flex-col gap-4">
            <div>
              <h2 className="text-xl font-black text-white">2. Datos de tu comercio</h2>
              <p className="text-xs text-text-secondary mt-1">Configurá el nombre, rubro y tiempos de entrega.</p>
            </div>

            <div>
              <label className="block text-xs font-semibold text-text-secondary mb-1">Nombre del comercio *</label>
              <input
                type="text"
                required
                placeholder="Ej: Cantina Don Carlos"
                value={merchantName}
                onChange={(e) => setMerchantName(e.target.value)}
                className="w-full px-3.5 py-2.5 bg-surface-subtle border border-surface-border rounded-xl text-white text-sm outline-none focus:border-brand-blue"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-text-secondary mb-1">Categoría / Rubro *</label>
                <select
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-surface-subtle border border-surface-border rounded-xl text-white text-sm outline-none focus:border-brand-blue"
                >
                  <option value="Bodegón Porteño" className="bg-surface">Bodegón Porteño</option>
                  <option value="Hamburguesería & Bar" className="bg-surface">Hamburguesería & Bar</option>
                  <option value="Pizzería & Pastas" className="bg-surface">Pizzería & Pastas</option>
                  <option value="Cafetería & Brunch" className="bg-surface">Cafetería & Brunch</option>
                  <option value="Parrilla & Asador" className="bg-surface">Parrilla & Asador</option>
                  <option value="Cervecería Artesanal" className="bg-surface">Cervecería Artesanal</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-text-secondary mb-1">Teléfono o WhatsApp</label>
                <input
                  type="tel"
                  placeholder="+54 11 4433-2211"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-surface-subtle border border-surface-border rounded-xl text-white text-sm outline-none focus:border-brand-blue"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-text-secondary mb-1">Dirección del local</label>
              <input
                type="text"
                placeholder="Av. Corrientes 1500, San Nicolás, CABA"
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                className="w-full px-3.5 py-2.5 bg-surface-subtle border border-surface-border rounded-xl text-white text-sm outline-none focus:border-brand-blue"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-text-secondary mb-1">Costo de envío ($)</label>
                <input
                  type="number"
                  placeholder="2500"
                  value={deliveryFee}
                  onChange={(e) => setDeliveryFee(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-surface-subtle border border-surface-border rounded-xl text-white text-sm outline-none focus:border-brand-blue"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-text-secondary mb-1">Demora delivery (min)</label>
                <input
                  type="number"
                  placeholder="30"
                  value={deliveryMinutes}
                  onChange={(e) => setDeliveryMinutes(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-surface-subtle border border-surface-border rounded-xl text-white text-sm outline-none focus:border-brand-blue"
                />
              </div>
            </div>

            <div className="flex gap-2 mt-2">
              <button
                type="button"
                onClick={() => setStep(1)}
                className="px-4 py-3 bg-surface-hover hover:bg-surface-subtle text-white font-bold text-xs rounded-xl"
              >
                Volver
              </button>
              <button
                type="button"
                onClick={() => {
                  if (!merchantName) {
                    setError('Por favor ingresá el nombre de tu comercio');
                    return;
                  }
                  setError(null);
                  setStep(3);
                }}
                className="flex-1 py-3 bg-brand-blue hover:bg-brand-blue-hover text-white font-extrabold text-sm rounded-xl shadow-md flex items-center justify-center gap-2"
              >
                <span>Continuar al paso 3</span>
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}

        {/* Paso 3: Primer Plato y Finalización */}
        {step === 3 && (
          <form onSubmit={handleCompleteOnboarding} className="bg-surface border border-surface-border rounded-2xl p-6 shadow-xl flex flex-col gap-4">
            <div>
              <h2 className="text-xl font-black text-white">3. Tu primer plato estrella & QRs</h2>
              <p className="text-xs text-text-secondary mt-1">Cargá tu plato insignia. Crearemos automáticamente tus primeras 5 mesas con QR descargables.</p>
            </div>

            <div>
              <label className="block text-xs font-semibold text-text-secondary mb-1">Nombre del plato *</label>
              <input
                type="text"
                required
                value={dishName}
                onChange={(e) => setDishName(e.target.value)}
                className="w-full px-3.5 py-2.5 bg-surface-subtle border border-surface-border rounded-xl text-white text-sm outline-none focus:border-brand-blue"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-text-secondary mb-1">Precio en ARS ($) *</label>
                <input
                  type="number"
                  required
                  value={dishPrice}
                  onChange={(e) => setDishPrice(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-surface-subtle border border-surface-border rounded-xl text-white text-sm outline-none focus:border-brand-blue"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-text-secondary mb-1">Foto del plato (URL)</label>
                <input
                  type="url"
                  value={dishImage}
                  onChange={(e) => setDishImage(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-surface-subtle border border-surface-border rounded-xl text-white text-xs outline-none focus:border-brand-blue"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-text-secondary mb-1">Descripción del plato</label>
              <textarea
                rows={2}
                value={dishDescription}
                onChange={(e) => setDishDescription(e.target.value)}
                className="w-full px-3.5 py-2.5 bg-surface-subtle border border-surface-border rounded-xl text-white text-xs outline-none focus:border-brand-blue"
              />
            </div>

            <div className="p-3 bg-brand-blue/10 border border-brand-blue/30 rounded-xl flex items-center gap-3 text-xs">
              <QrCode className="w-8 h-8 text-brand-blue flex-shrink-0" />
              <div>
                <span className="font-bold text-white block">Generación automática de códigos QR</span>
                <span className="text-text-secondary">Se generarán 5 mesas numeradas listas para imprimir y pegar en tu salón.</span>
              </div>
            </div>

            <div className="flex gap-2 mt-2">
              <button
                type="button"
                onClick={() => setStep(2)}
                className="px-4 py-3 bg-surface-hover hover:bg-surface-subtle text-white font-bold text-xs rounded-xl"
              >
                Volver
              </button>
              <button
                type="submit"
                disabled={loading}
                className="flex-1 py-3 bg-brand-success hover:bg-emerald-600 text-white font-black text-sm rounded-xl shadow-lg shadow-brand-success/20 flex items-center justify-center gap-2"
              >
                {loading ? 'Creando tu comercio y QRs...' : '¡Publicar mi comercio ahora!'}
              </button>
            </div>
          </form>
        )}

        {/* Paso 4: Finalizado con Éxito */}
        {step === 4 && createdSlug && (
          <div className="bg-surface border border-surface-border rounded-2xl p-8 shadow-2xl flex flex-col items-center text-center gap-5 animate-in zoom-in-95 duration-200">
            <div className="w-16 h-16 rounded-full bg-brand-success/20 text-brand-success flex items-center justify-center">
              <CheckCircle2 className="w-10 h-10" />
            </div>

            <div>
              <h2 className="text-2xl font-black text-white">¡Felicitaciones! Tu comercio ya está activo</h2>
              <p className="text-xs text-text-secondary mt-1 max-w-md">
                Tu carta pública ya está lista para recibir pedidos en vivo por QR y delivery sin comisiones.
              </p>
            </div>

            <div className="w-full p-4 bg-surface-subtle border border-surface-border rounded-xl flex flex-col gap-2 text-xs">
              <span className="text-text-muted">Tu link público para clientes:</span>
              <span className="font-mono text-brand-blue font-bold text-sm select-all">
                /{createdSlug}
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 w-full">
              <Link
                href={`/${createdSlug}`}
                className="py-3 px-4 bg-surface-hover hover:bg-surface border border-surface-border rounded-xl text-white font-bold text-xs flex items-center justify-center gap-2"
              >
                <UtensilsCrossed className="w-4 h-4 text-brand-amber" />
                <span>Ver carta pública</span>
              </Link>

              <Link
                href={`/panel/${createdSlug}/salon`}
                className="py-3 px-4 bg-brand-blue hover:bg-brand-blue-hover text-white font-extrabold text-xs rounded-xl shadow-lg shadow-brand-blue/20 flex items-center justify-center gap-2"
              >
                <Sparkles className="w-4 h-4" />
                <span>Ir al Panel Operativo</span>
              </Link>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
