'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { UtensilsCrossed } from 'lucide-react';

export default function PanelRootPage() {
  const router = useRouter();

  useEffect(() => {
    fetch('/api/auth')
      .then((res) => res.json())
      .then((data) => {
        if (!data.user) {
          router.replace('/entrar?redirect=/panel/los-amigos/salon');
        } else if (data.defaultPanelUrl) {
          router.replace(data.defaultPanelUrl);
        } else {
          router.replace('/alta-comercio');
        }
      })
      .catch(() => {
        router.replace('/entrar?redirect=/panel/los-amigos/salon');
      });
  }, [router]);

  return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-center text-text-secondary gap-3">
      <div className="w-12 h-12 rounded-2xl bg-surface border border-surface-border flex items-center justify-center animate-pulse shadow-xl">
        <UtensilsCrossed className="w-6 h-6 text-brand-blue" />
      </div>
      <p className="text-sm font-semibold">Abriendo panel operativo...</p>
    </div>
  );
}
