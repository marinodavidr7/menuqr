import type { Metadata, Viewport } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'MENUQR · Carta QR con foto y video para gastronomía',
  description: 'Carta pública por QR con foto y video corto de tus platos, pedido directo desde la mesa, panel operativo de salón, cocina y caja, y cobro directo con Mercado Pago sin comisión.',
  icons: {
    icon: '/favicon.ico',
  },
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  viewportFit: 'cover',
  themeColor: '#0B1220',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="es-AR" className="dark">
      <body className="bg-background text-text-primary min-h-[100dvh] flex flex-col selection:bg-brand-blue/30 selection:text-white">
        {children}
      </body>
    </html>
  );
}
