import { NextResponse } from 'next/server';
import { getDb } from '@/lib/db';
import { seedDatabase } from '@/lib/seed';
import { getCurrentUser, getUserRoleForMerchant } from '@/lib/auth';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const merchantSlug = searchParams.get('merchantSlug');
    const range = parseInt(searchParams.get('days') || '30', 10);

    if (!merchantSlug) {
      return NextResponse.json({ error: 'Falta merchantSlug' }, { status: 400 });
    }

    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    const role = await getUserRoleForMerchant(merchantSlug, user.id);
    if (!role || role === 'kitchen') {
      return NextResponse.json({ error: 'Permisos insuficientes para ver métricas' }, { status: 403 });
    }

    const db = getDb();
    const merchant = db.prepare('SELECT id FROM merchants WHERE slug = ?').get(merchantSlug) as any;
    if (!merchant) {
      return NextResponse.json({ error: 'Comercio no encontrado' }, { status: 404 });
    }

    // Fecha límite según rango
    const cutoffDate = new Date(Date.now() - range * 86400000).toISOString();

    // 1. Ranking de platos más vistos y vistas de video
    const productsRanking = db.prepare(`
      SELECT id, name, price_cents, image_url, video_url, views_count, video_views_count
      FROM products
      WHERE merchant_id = ?
      ORDER BY views_count DESC
      LIMIT 10
    `).all(merchant.id) as any[];

    // 2. Pedidos en el período
    const orders = db.prepare(`
      SELECT id, channel, total_cents, created_at, status
      FROM orders
      WHERE merchant_id = ? AND created_at >= ? AND status NOT IN ('cancelled')
    `).all(merchant.id, cutoffDate) as any[];

    const totalOrdersCount = orders.length;
    const totalRevenueCents = orders.reduce((sum, o) => sum + (o.total_cents || 0), 0);
    const averageTicketCents = totalOrdersCount > 0 ? Math.round(totalRevenueCents / totalOrdersCount) : 0;

    // 3. Distribución por canal
    const channelCounts = {
      salon: orders.filter((o) => o.channel === 'salon').length,
      delivery: orders.filter((o) => o.channel === 'delivery').length,
      takeaway: orders.filter((o) => o.channel === 'takeaway').length,
    };

    // 4. Horas pico (0 a 23 hs)
    const peakHours = Array.from({ length: 24 }, (_, i) => ({
      hour: i,
      label: `${i.toString().padStart(2, '0')}:00`,
      orders: 0,
    }));

    for (const o of orders) {
      try {
        const h = new Date(o.created_at).getHours();
        if (peakHours[h]) peakHours[h].orders += 1;
      } catch {}
    }

    // Filtrar a las horas gastronómicas principales (ej. 11 a 24)
    const relevantHours = peakHours.slice(11, 24);

    return NextResponse.json({
      range,
      totalOrdersCount,
      totalRevenueCents,
      averageTicketCents,
      channelCounts,
      productsRanking,
      peakHours: relevantHours,
    });
  } catch (error) {
    return NextResponse.json({ error: (error as Error).message }, { status: 500 });
  }
}
