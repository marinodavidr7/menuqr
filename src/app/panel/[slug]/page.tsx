'use client';

import { use, useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function MerchantPanelRootPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = use(params);
  const router = useRouter();

  useEffect(() => {
    router.replace(`/panel/${slug}/salon`);
  }, [slug, router]);

  return (
    <div className="flex items-center justify-center p-12 text-sm text-text-secondary font-semibold">
      Redirigiendo a Salón...
    </div>
  );
}
