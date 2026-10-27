'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter, usePathname } from 'next/navigation';
import { UtensilsCrossed, User as UserIcon, LogOut, LayoutDashboard, ShoppingBag, BellRing, ReceiptText } from 'lucide-react';
import { useCartStore } from '@/lib/cart-store';

interface NavbarProps {
  merchantSlug?: string;
  merchantName?: string;
  tableLabel?: string;
  onCallWaiter?: () => void;
  onRequestBill?: () => void;
  onOpenCart?: () => void;
}

export function Navbar({
  merchantSlug,
  merchantName,
  tableLabel,
  onCallWaiter,
  onRequestBill,
  onOpenCart,
}: NavbarProps) {
  const router = useRouter();
  const pathname = usePathname();
  const [user, setUser] = useState<{ id: string; name: string; email: string } | null>(null);
  const [role, setRole] = useState<string | null>(null);
  const [panelUrl, setPanelUrl] = useState<string | null>(null);
  const [menuOpen, setMenuOpen] = useState(false);
  const cartItemCount = useCartStore((s) => s.getItemCount());

  useEffect(() => {
    fetch(`/api/auth${merchantSlug ? `?merchantSlug=${merchantSlug}` : ''}`)
      .then((res) => res.json())
      .then((data) => {
        if (data.user) {
          setUser(data.user);
          setRole(data.role);
          setPanelUrl(data.defaultPanelUrl || (merchantSlug ? `/panel/${merchantSlug}/salon` : null));
        }
      })
      .catch(() => {});
  }, [merchantSlug, pathname]);

  const handleLogout = async () => {
    await fetch('/api/auth', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'logout' }),
    });
    setUser(null);
    setRole(null);
    router.refresh();
  };

  const isPanel = pathname.startsWith('/panel');

  return (
    <header className="sticky top-0 z-40 bg-[#0B1220]/95 backdrop-blur-md border-b border-surface-border safe-top">
      <div className="w-full px-4 sm:px-6 lg:px-8 xl:px-10 2xl:px-12 min-h-[56px] py-1 flex items-center justify-between gap-3">
        {/* Logo y Nombre del local */}
        <div className="flex items-center gap-3">
          <Link href="/" className="min-h-[44px] flex items-center gap-2 group">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-brand-blue to-brand-amber p-0.5 shadow-md flex items-center justify-center">
              <div className="w-full h-full bg-[#0B1220] rounded-[10px] flex items-center justify-center group-hover:bg-[#121A2B] transition-colors">
                <UtensilsCrossed className="w-5 h-5 text-brand-blue group-hover:text-brand-amber transition-colors" />
              </div>
            </div>
            <div className="flex flex-col">
              <span className="font-extrabold text-lg tracking-tight bg-gradient-to-r from-white via-text-primary to-text-secondary bg-clip-text text-transparent">
                MENU<span className="text-brand-blue">QR</span>
              </span>
              {merchantName && !isPanel && (
                <span className="text-xs text-text-secondary truncate max-w-[140px] sm:max-w-[200px]">
                  {merchantName}
                </span>
              )}
            </div>
          </Link>

          {/* Badge de Mesa */}
          {tableLabel && !isPanel && (
            <div className="hidden sm:flex items-center gap-1.5 px-3 py-1 bg-surface-hover border border-surface-border rounded-full text-xs font-semibold text-brand-amber">
              <span className="w-2 h-2 rounded-full bg-brand-amber animate-pulse" />
              {tableLabel}
            </div>
          )}
        </div>

        {/* Acciones de Carta y Comensal */}
        <div className="flex items-center gap-2">
          {merchantSlug && !isPanel && (
            <>
              {onCallWaiter && (
                <button
                  onClick={onCallWaiter}
                  title="Llamar al mozo"
                  className="min-h-[44px] min-w-[44px] px-3 py-2 text-xs font-medium bg-surface hover:bg-surface-hover text-text-primary rounded-xl border border-surface-border transition-all flex items-center gap-1.5 active:scale-95"
                >
                  <BellRing className="w-4 h-4 text-brand-amber" />
                  <span className="hidden md:inline">Llamar al mozo</span>
                </button>
              )}
              {onRequestBill && (
                <button
                  onClick={onRequestBill}
                  title="Pedir la cuenta"
                  className="min-h-[44px] min-w-[44px] px-3 py-2 text-xs font-medium bg-surface hover:bg-surface-hover text-text-primary rounded-xl border border-surface-border transition-all flex items-center gap-1.5 active:scale-95"
                >
                  <ReceiptText className="w-4 h-4 text-brand-blue" />
                  <span className="hidden md:inline">Pedir la cuenta</span>
                </button>
              )}
              {onOpenCart && (
                <button
                  onClick={onOpenCart}
                  className="relative min-h-[44px] min-w-[44px] px-3.5 py-2 bg-brand-blue hover:bg-brand-blue-hover text-white rounded-xl font-bold text-xs sm:text-sm flex items-center gap-2 shadow-sm transition-all active:scale-95"
                >
                  <ShoppingBag className="w-4 h-4" />
                  <span className="hidden sm:inline">Ver pedido</span>
                  {cartItemCount > 0 && (
                    <span className="px-1.5 py-0.5 text-[11px] font-black bg-white text-brand-blue rounded-full">
                      {cartItemCount}
                    </span>
                  )}
                </button>
              )}
            </>
          )}

          {/* Si tiene rol de local o panel disponible, acceso directo al Panel */}
          {panelUrl && !isPanel && (
            <Link
              href={panelUrl}
              className="min-h-[44px] px-3 py-2 text-xs font-bold bg-brand-blue/15 text-brand-blue border border-brand-blue/30 rounded-xl hover:bg-brand-blue hover:text-white transition-all flex items-center gap-1.5 active:scale-95"
            >
              <LayoutDashboard className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Panel Operativo</span>
            </Link>
          )}

          {/* Usuario / Auth */}
          {user ? (
            <div className="relative">
              <button
                onClick={() => setMenuOpen(!menuOpen)}
                className="flex items-center gap-2 p-1.5 rounded-lg hover:bg-surface-hover transition-colors"
              >
                <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-brand-blue to-purple-500 text-white flex items-center justify-center font-bold text-xs uppercase shadow-inner">
                  {user.name.slice(0, 2)}
                </div>
                <span className="text-xs font-medium text-text-primary hidden lg:inline max-w-[120px] truncate">
                  {user.name}
                </span>
              </button>

              {menuOpen && (
                <div
                  className="absolute right-0 mt-2 w-48 bg-surface border border-surface-border rounded-xl shadow-xl py-1 z-50 animate-in fade-in zoom-in-95 duration-100"
                  onClick={() => setMenuOpen(false)}
                >
                  <div className="px-3 py-2 border-b border-surface-border">
                    <p className="text-xs font-semibold text-text-primary truncate">{user.name}</p>
                    <p className="text-[11px] text-text-secondary truncate">{user.email}</p>
                  </div>
                  {panelUrl && (
                    <Link
                      href={panelUrl}
                      className="w-full px-3 py-2 text-xs font-semibold text-brand-blue hover:bg-surface-hover flex items-center gap-2"
                    >
                      <LayoutDashboard className="w-3.5 h-3.5 text-brand-blue" />
                      Ir al Panel Operativo
                    </Link>
                  )}
                  <Link
                    href="/alta-comercio"
                    className="w-full px-3 py-2 text-xs text-text-primary hover:bg-surface-hover flex items-center gap-2"
                  >
                    <UtensilsCrossed className="w-3.5 h-3.5 text-brand-amber" />
                    Registrar nuevo comercio
                  </Link>
                  <button
                    onClick={handleLogout}
                    className="w-full px-3 py-2 text-xs text-brand-danger hover:bg-brand-danger/10 flex items-center gap-2 text-left"
                  >
                    <LogOut className="w-3.5 h-3.5" />
                    Cerrar sesión
                  </button>
                </div>
              )}
            </div>
          ) : (
            <Link
              href={`/entrar${merchantSlug ? `?redirect=/${merchantSlug}` : ''}`}
              className="px-3 py-1.5 text-xs sm:text-sm font-medium bg-surface hover:bg-surface-hover text-text-primary rounded-lg border border-surface-border transition-colors flex items-center gap-1.5"
            >
              <UserIcon className="w-3.5 h-3.5 text-text-secondary" />
              <span>Ingresar</span>
            </Link>
          )}
        </div>
      </div>
    </header>
  );
}
