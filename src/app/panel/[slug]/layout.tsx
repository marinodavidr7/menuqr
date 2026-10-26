'use client';

import { useState, useEffect, use } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import {
  UtensilsCrossed, LayoutDashboard, ChefHat, Wallet, BarChart3,
  CalendarDays, BookOpen, Users, Settings, ExternalLink, ShieldAlert,
  BellRing, LogOut
} from 'lucide-react';
import { UserRole } from '@/lib/types';

interface PanelLayoutProps {
  children: React.ReactNode;
  params: Promise<{ slug: string }>;
}

export default function PanelLayout({ children, params }: PanelLayoutProps) {
  const { slug } = use(params);
  const pathname = usePathname();
  const router = useRouter();

  const [user, setUser] = useState<{ id: string; name: string; email: string } | null>(null);
  const [role, setRole] = useState<UserRole | null>(null);
  const [merchantName, setMerchantName] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [myMerchants, setMyMerchants] = useState<Array<{ slug: string; name: string; role: string }>>([]);
  const [pendingCallsCount, setPendingCallsCount] = useState(0);

  useEffect(() => {
    // 1. Verificar autenticación y rol
    fetch(`/api/auth?merchantSlug=${slug}`)
      .then((res) => res.json())
      .then((data) => {
        if (!data.user) {
          router.push(`/entrar?redirect=/panel/${slug}/salon`);
          return;
        }
        setUser(data.user);
        setRole(data.role);
        if (data.userMerchants) setMyMerchants(data.userMerchants);
      })
      .catch(() => {})
      .finally(() => setLoading(false));

    // 2. Obtener nombre del comercio
    fetch(`/api/merchants/${slug}`)
      .then((res) => res.json())
      .then((data) => {
        if (data.merchant) setMerchantName(data.merchant.name);
      })
      .catch(() => {});

    // 3. Polling de llamados de mozo para badge
    const checkCalls = () => {
      fetch(`/api/calls?merchantSlug=${slug}`)
        .then((res) => res.json())
        .then((data) => {
          setPendingCallsCount(data.calls?.length || 0);
        })
        .catch(() => {});
    };
    checkCalls();
    const interval = setInterval(checkCalls, 5000);
    return () => clearInterval(interval);
  }, [slug, router]);

  const handleLogout = async () => {
    await fetch('/api/auth', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'logout' }),
    });
    router.push('/entrar');
    router.refresh();
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center text-text-secondary font-semibold text-sm">
        Verificando credenciales del panel...
      </div>
    );
  }

  // Lista de tabs y permisos
  const navTabs = [
    { href: `/panel/${slug}/salon`, label: 'Salón', icon: LayoutDashboard, badge: pendingCallsCount, allowedRoles: ['owner', 'manager', 'waiter'] },
    { href: `/panel/${slug}/cocina`, label: 'Cocina', icon: ChefHat, allowedRoles: ['owner', 'manager', 'kitchen'] },
    { href: `/panel/${slug}/caja`, label: 'Caja', icon: Wallet, allowedRoles: ['owner', 'manager', 'waiter'] },
    { href: `/panel/${slug}/metricas`, label: 'Métricas', icon: BarChart3, allowedRoles: ['owner', 'manager'] },
    { href: `/panel/${slug}/reservas`, label: 'Reservas', icon: CalendarDays, allowedRoles: ['owner', 'manager', 'waiter'] },
    { href: `/panel/${slug}/carta`, label: 'Carta', icon: BookOpen, allowedRoles: ['owner', 'manager'] },
    { href: `/panel/${slug}/equipo`, label: 'Equipo', icon: Users, allowedRoles: ['owner', 'manager'] },
    { href: `/panel/${slug}/ajustes`, label: 'Ajustes', icon: Settings, allowedRoles: ['owner', 'manager'] },
  ];

  // Si el usuario no tiene rol en este comercio
  if (!role) {
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center p-4 text-center">
        <ShieldAlert className="w-12 h-12 text-brand-danger mb-3" />
        <h2 className="text-xl font-bold text-white">Acceso no autorizado</h2>
        <p className="text-xs text-text-secondary mt-1 max-w-sm">
          Tu cuenta ({user?.email}) no tiene un rol asignado para operar en el comercio <strong>{slug}</strong>.
        </p>

        {myMerchants.length > 0 && (
          <div className="mt-4 flex flex-col items-center gap-2">
            <span className="text-xs text-text-muted">Tus comercios habilitados:</span>
            {myMerchants.map((m) => (
              <Link
                key={m.slug}
                href={`/panel/${m.slug}/salon`}
                className="px-4 py-2 bg-brand-blue hover:bg-brand-blue-hover text-white rounded-xl text-xs font-bold transition-all"
              >
                Ir al panel de {m.name} ({m.role})
              </Link>
            ))}
          </div>
        )}

        <div className="mt-6 flex items-center gap-3">
          <button
            onClick={handleLogout}
            className="px-4 py-2 bg-surface hover:bg-surface-hover border border-surface-border rounded-xl text-white text-xs font-bold transition-colors"
          >
            Iniciar sesión con otra cuenta
          </button>
          <Link href="/" className="px-4 py-2 bg-surface-subtle hover:bg-surface-hover rounded-xl text-text-secondary hover:text-white text-xs font-bold">
            Ir al inicio
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col bg-background text-text-primary">
      {/* Header del Panel */}
      <header className="sticky top-0 z-40 bg-[#0B1220]/95 backdrop-blur-md border-b border-surface-border">
        <div className="w-full px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <Link href="/" className="flex items-center gap-2">
              <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-brand-blue to-brand-amber p-0.5 shadow-md flex items-center justify-center">
                <div className="w-full h-full bg-[#0B1220] rounded-[9px] flex items-center justify-center">
                  <UtensilsCrossed className="w-4 h-4 text-brand-blue" />
                </div>
              </div>
              <span className="font-extrabold text-base tracking-tight text-white hidden sm:inline">
                MENU<span className="text-brand-blue">QR</span>
              </span>
            </Link>

            <span className="text-surface-border hidden sm:inline">|</span>

            <div className="flex flex-col">
              <span className="text-xs font-black text-white truncate max-w-[150px] sm:max-w-xs">
                {merchantName || slug}
              </span>
              <span className="text-[10px] text-brand-blue font-semibold uppercase">
                Panel Operativo · Rol: {role}
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {/* Link para ver carta pública en vivo */}
            <Link
              href={`/${slug}`}
              target="_blank"
              className="px-2.5 sm:px-3 py-1.5 text-xs font-semibold bg-surface hover:bg-surface-hover text-text-primary border border-surface-border rounded-xl transition-colors flex items-center gap-1.5"
            >
              <ExternalLink className="w-3.5 h-3.5 text-brand-blue" />
              <span className="hidden md:inline">Ver carta pública</span>
            </Link>

            {/* Usuario y logout */}
            <div className="flex items-center gap-2 pl-2 border-l border-surface-border">
              <div className="w-8 h-8 rounded-full bg-surface-hover text-white flex items-center justify-center font-bold text-xs uppercase border border-surface-border">
                {user?.name.slice(0, 2) || 'OP'}
              </div>
              <button
                onClick={handleLogout}
                title="Cerrar sesión"
                className="w-8 h-8 rounded-lg bg-surface hover:bg-brand-danger/20 text-text-secondary hover:text-brand-danger flex items-center justify-center transition-colors"
              >
                <LogOut className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>

        {/* Tabs de Navegación del Panel (Scroll horizontal en mobile) */}
        <div className="border-t border-surface-border bg-surface/50">
          <div className="w-full px-4 sm:px-6 lg:px-8 flex items-center gap-1 overflow-x-auto no-scrollbar py-1">
            {navTabs
              .filter((tab) => tab.allowedRoles.includes(role))
              .map((tab) => {
                const Icon = tab.icon;
                const isActive = pathname.startsWith(tab.href);
                return (
                  <Link
                    key={tab.href}
                    href={tab.href}
                    className={`relative flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold transition-all whitespace-nowrap ${
                      isActive
                        ? 'bg-brand-blue text-white shadow-sm'
                        : 'text-text-secondary hover:text-white hover:bg-surface-hover'
                    }`}
                  >
                    <Icon className="w-4 h-4" />
                    <span>{tab.label}</span>
                    {tab.badge ? (
                      <span className="w-4 h-4 rounded-full bg-brand-danger text-white text-[10px] font-black flex items-center justify-center animate-pulse">
                        {tab.badge}
                      </span>
                    ) : null}
                  </Link>
                );
              })}
          </div>
        </div>
      </header>

      {/* Contenido de la Pantalla del Panel (Full width para aprovechar toda la pantalla) */}
      <main className="flex-1 w-full px-4 sm:px-6 lg:px-8 py-5">
        {children}
      </main>
    </div>
  );
}
