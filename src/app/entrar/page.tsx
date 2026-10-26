'use client';

import { useState, useMemo, Suspense } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { Eye, EyeOff, Lock, Mail, User, UtensilsCrossed, ShieldAlert, CheckCircle2 } from 'lucide-react';

export default function AuthPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-background flex items-center justify-center text-text-secondary">Cargando...</div>}>
      <AuthContent />
    </Suspense>
  );
}

function AuthContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const redirectUrl = searchParams.get('redirect') || '/';

  const [activeTab, setActiveTab] = useState<'login' | 'register'>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Medidor de fuerza de contraseña rioplatense: "Muy corta" / "Aceptable" / "Fuerte"
  const passwordStrength = useMemo(() => {
    if (!password) return null;
    if (password.length < 6) return { label: 'Muy corta', color: 'bg-brand-danger text-brand-danger', width: '33%' };
    if (password.length < 10) return { label: 'Aceptable', color: 'bg-brand-amber text-brand-amber', width: '66%' };
    return { label: 'Fuerte', color: 'bg-brand-success text-brand-success', width: '100%' };
  }, [password]);

  const executeLogin = async (loginEmail: string, loginPassword: string, destUrl?: string) => {
    setError(null);
    setLoading(true);

    try {
      const res = await fetch('/api/auth', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'login',
          email: loginEmail,
          password: loginPassword,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Ocurrió un error en la autenticación');

      const target = destUrl || (redirectUrl !== '/' ? redirectUrl : (data.defaultPanelUrl || '/'));
      router.push(target);
      router.refresh();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const res = await fetch('/api/auth', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: activeTab,
          email,
          password,
          name: activeTab === 'register' ? name : undefined,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Ocurrió un error en la autenticación');

      const target = redirectUrl !== '/' ? redirectUrl : (data.defaultPanelUrl || '/');
      router.push(target);
      router.refresh();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  // Cuentas demo de 1 click para entrar directo al panel operativo
  const handleQuickLogin = (demoEmail: string, roleDestination?: string) => {
    setEmail(demoEmail);
    setPassword('password123');
    setActiveTab('login');
    executeLogin(demoEmail, 'password123', roleDestination);
  };

  return (
    <div className="min-h-screen bg-background flex flex-col justify-center items-center p-4">
      <div className="w-full max-w-md flex flex-col gap-5">
        {/* Logo */}
        <div className="text-center flex flex-col items-center">
          <Link href="/" className="inline-flex items-center gap-2 group mb-2">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-brand-blue to-brand-amber p-0.5 shadow-lg flex items-center justify-center">
              <div className="w-full h-full bg-[#0B1220] rounded-[14px] flex items-center justify-center">
                <UtensilsCrossed className="w-6 h-6 text-brand-blue group-hover:text-brand-amber transition-colors" />
              </div>
            </div>
            <span className="font-extrabold text-2xl tracking-tight text-white">
              MENU<span className="text-brand-blue">QR</span>
            </span>
          </Link>
          <p className="text-xs text-text-secondary">
            Accedé para gestionar tus pedidos o tu local gastronómico
          </p>
        </div>

        {/* Tarjeta de Auth con Tabs */}
        <div className="bg-surface border border-surface-border rounded-2xl p-6 shadow-2xl flex flex-col gap-5">
          {/* Tabs */}
          <div className="grid grid-cols-2 p-1 bg-surface-subtle rounded-xl border border-surface-border">
            <button
              type="button"
              onClick={() => {
                setActiveTab('login');
                setError(null);
              }}
              className={`py-2 text-xs font-bold rounded-lg transition-all ${
                activeTab === 'login'
                  ? 'bg-brand-blue text-white shadow-sm'
                  : 'text-text-secondary hover:text-white'
              }`}
            >
              Iniciar Sesión
            </button>
            <button
              type="button"
              onClick={() => {
                setActiveTab('register');
                setError(null);
              }}
              className={`py-2 text-xs font-bold rounded-lg transition-all ${
                activeTab === 'register'
                  ? 'bg-brand-blue text-white shadow-sm'
                  : 'text-text-secondary hover:text-white'
              }`}
            >
              Registrarme
            </button>
          </div>

          {error && (
            <div className="p-3 bg-brand-danger/10 border border-brand-danger/30 rounded-xl text-xs text-brand-danger font-semibold flex items-center gap-2">
              <ShieldAlert className="w-4 h-4 flex-shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="flex flex-col gap-4">
            {activeTab === 'register' && (
              <div>
                <label className="block text-xs font-semibold text-text-secondary mb-1">
                  Nombre completo
                </label>
                <div className="relative">
                  <User className="absolute left-3.5 top-3 w-4 h-4 text-text-muted" />
                  <input
                    type="text"
                    required
                    placeholder="Tu nombre y apellido"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="w-full pl-10 pr-4 py-2.5 bg-surface-subtle border border-surface-border rounded-xl text-white text-sm outline-none focus:border-brand-blue"
                  />
                </div>
              </div>
            )}

            <div>
              <label className="block text-xs font-semibold text-text-secondary mb-1">
                Correo electrónico
              </label>
              <div className="relative">
                <Mail className="absolute left-3.5 top-3 w-4 h-4 text-text-muted" />
                <input
                  type="email"
                  required
                  placeholder="ejemplo@menuqr.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full pl-10 pr-4 py-2.5 bg-surface-subtle border border-surface-border rounded-xl text-white text-sm outline-none focus:border-brand-blue"
                />
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="text-xs font-semibold text-text-secondary">
                  Contraseña
                </label>
                {activeTab === 'login' && (
                  <span className="text-[11px] text-brand-blue cursor-pointer hover:underline">
                    ¿Olvidaste tu contraseña?
                  </span>
                )}
              </div>
              <div className="relative">
                <Lock className="absolute left-3.5 top-3 w-4 h-4 text-text-muted" />
                <input
                  type={showPassword ? 'text' : 'password'}
                  required
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full pl-10 pr-10 py-2.5 bg-surface-subtle border border-surface-border rounded-xl text-white text-sm outline-none focus:border-brand-blue"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-3 text-text-muted hover:text-white"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>

              {/* Medidor de fuerza en registro */}
              {activeTab === 'register' && passwordStrength && (
                <div className="mt-2 flex flex-col gap-1">
                  <div className="h-1.5 w-full bg-surface-hover rounded-full overflow-hidden">
                    <div
                      className={`h-full transition-all duration-300 ${passwordStrength.color.split(' ')[0]}`}
                      style={{ width: passwordStrength.width }}
                    />
                  </div>
                  <span className={`text-[10px] font-bold ${passwordStrength.color.split(' ')[1]}`}>
                    Seguridad: {passwordStrength.label}
                  </span>
                </div>
              )}
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 bg-brand-blue hover:bg-brand-blue-hover text-white font-extrabold text-sm rounded-xl shadow-lg shadow-brand-blue/20 transition-all disabled:opacity-50 mt-1"
            >
              {loading ? 'Verificando...' : activeTab === 'login' ? 'Iniciar sesión' : 'Crear mi cuenta'}
            </button>
          </form>

          {/* Botón Continuar con Google */}
          <div className="flex flex-col gap-3">
            <div className="flex items-center gap-3">
              <div className="flex-1 h-px bg-surface-border" />
              <span className="text-[11px] text-text-muted uppercase">o</span>
              <div className="flex-1 h-px bg-surface-border" />
            </div>

            <button
              type="button"
              onClick={() => handleQuickLogin('comensal@gmail.com')}
              className="w-full py-2.5 px-4 bg-surface-subtle hover:bg-surface-hover border border-surface-border rounded-xl text-xs font-bold text-white flex items-center justify-center gap-2 transition-colors"
            >
              <svg className="w-4 h-4" viewBox="0 0 24 24">
                <path fill="#4285F4" d="M23.745 12.27c0-.7-.06-1.4-.19-2.07H12v4.51h6.6c-.29 1.52-1.14 2.82-2.4 3.68v3.05h3.88c2.27-2.09 3.66-5.17 3.66-9.17z"/>
                <path fill="#34A853" d="M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.88-3.05c-1.08.72-2.45 1.16-4.05 1.16-3.12 0-5.77-2.1-6.72-4.93H1.25v3.15C3.26 21.36 7.35 24 12 24z"/>
                <path fill="#FBBC05" d="M5.28 14.27c-.25-.72-.38-1.49-.38-2.27s.13-1.55.38-2.27V6.58H1.25C.45 8.18 0 9.99 0 12s.45 3.82 1.25 5.42l4.03-3.15z"/>
                <path fill="#EA4335" d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.95 1.19 15.24 0 12 0 7.35 0 3.26 2.64 1.25 6.58l4.03 3.15c.95-2.83 3.6-4.98 6.72-4.98z"/>
              </svg>
              <span>Continuar con Google</span>
            </button>
          </div>

          {/* Accesos Rápidos de Prueba (Demo Roles con 1-clic directo al panel) */}
          <div className="pt-2 border-t border-surface-border">
            <div className="flex items-center justify-between mb-2">
              <span className="text-[11px] font-bold text-text-muted uppercase">
                Ingreso rápido (1-clic directo):
              </span>
              <span className="text-[10px] text-brand-blue font-bold">Bodegón Los Amigos</span>
            </div>
            <div className="grid grid-cols-2 gap-1.5 text-[11px]">
              <button
                type="button"
                onClick={() => handleQuickLogin('dueno@menuqr.com', '/panel/los-amigos/salon')}
                className="p-2 bg-surface-subtle hover:bg-brand-blue/15 hover:border-brand-blue rounded-xl text-brand-blue border border-surface-border text-left font-semibold transition-all active:scale-98"
              >
                👔 Dueño (Owner)
              </button>
              <button
                type="button"
                onClick={() => handleQuickLogin('encargado@menuqr.com', '/panel/los-amigos/salon')}
                className="p-2 bg-surface-subtle hover:bg-brand-amber/15 hover:border-brand-amber rounded-xl text-brand-amber border border-surface-border text-left font-semibold transition-all active:scale-98"
              >
                📋 Encargada (Mgr)
              </button>
              <button
                type="button"
                onClick={() => handleQuickLogin('mozo@menuqr.com', '/panel/los-amigos/salon')}
                className="p-2 bg-surface-subtle hover:bg-brand-success/15 hover:border-brand-success rounded-xl text-brand-success border border-surface-border text-left font-semibold transition-all active:scale-98"
              >
                🛎️ Mozo (Salón)
              </button>
              <button
                type="button"
                onClick={() => handleQuickLogin('cocina@menuqr.com', '/panel/los-amigos/cocina')}
                className="p-2 bg-surface-subtle hover:bg-purple-500/15 hover:border-purple-400 rounded-xl text-purple-400 border border-surface-border text-left font-semibold transition-all active:scale-98"
              >
                🍳 Cocina (Chef)
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
