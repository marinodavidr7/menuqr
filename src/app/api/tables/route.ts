import { NextResponse } from 'next/server';
import { getDb } from '@/lib/db';
import { seedDatabase } from '@/lib/seed';
import { getCurrentUser, getUserRoleForMerchant } from '@/lib/auth';
import QRCode from 'qrcode';
import crypto from 'node:crypto';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const merchantSlug = searchParams.get('merchantSlug');
    const tableId = searchParams.get('tableId');
    const qrToken = searchParams.get('qrToken');

    const db = getDb();

    // Si consulta por qrToken directamente desde el QR de la mesa
    if (qrToken) {
      const table = db.prepare(`
        SELECT t.*, m.name as merchant_name, m.slug as merchant_slug
        FROM tables t
        JOIN merchants m ON t.merchant_id = m.id
        WHERE t.qr_token = ?
      `).get(qrToken) as any;

      if (!table) {
        return NextResponse.json({ error: 'Mesa o QR no encontrado' }, { status: 404 });
      }

      return NextResponse.json({ table });
    }

    if (!merchantSlug) {
      return NextResponse.json({ error: 'Falta merchantSlug' }, { status: 400 });
    }

    const merchant = db.prepare('SELECT id, name, slug FROM merchants WHERE slug = ?').get(merchantSlug) as any;
    if (!merchant) {
      return NextResponse.json({ error: 'Comercio no encontrado' }, { status: 404 });
    }

    const tables = db.prepare('SELECT * FROM tables WHERE merchant_id = ? ORDER BY number ASC').all(merchant.id) as any[];

    // Generar Data URL para cada mesa con URL alcanzable desde celulares
    const queryBaseUrl = searchParams.get('baseUrl');
    let baseOrigin = queryBaseUrl;

    if (!baseOrigin) {
      const host = request.headers.get('host') || 'localhost:3000';
      if (host.includes('localhost') || host.includes('127.0.0.1')) {
        // En desarrollo local, usar la IP de la red Wi-Fi para que el celular pueda acceder
        baseOrigin = 'http://192.168.1.17:3000';
      } else {
        const protocol = host.includes('localhost') ? 'http' : 'https';
        baseOrigin = `${protocol}://${host}`;
      }
    }

    const tablesWithQr = await Promise.all(
      tables.map(async (tbl) => {
        const url = `${baseOrigin}/${merchant.slug}?mesa=${tbl.qr_token}`;
        const qrDataUrl = await QRCode.toDataURL(url, {
          width: 320,
          margin: 2,
          color: {
            dark: '#0B1220',
            light: '#FFFFFF',
          },
        });
        return {
          ...tbl,
          url,
          qrDataUrl,
        };
      })
    );

    return NextResponse.json({ tables: tablesWithQr });
  } catch (error) {
    return NextResponse.json({ error: (error as Error).message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    const body = await request.json();
    const { merchantSlug, number, label, zone } = body;

    const role = await getUserRoleForMerchant(merchantSlug, user.id);
    if (!role || (role !== 'owner' && role !== 'manager')) {
      return NextResponse.json({ error: 'Permisos insuficientes' }, { status: 403 });
    }

    const db = getDb();
    const merchant = db.prepare('SELECT id, slug FROM merchants WHERE slug = ?').get(merchantSlug) as any;
    if (!merchant) {
      return NextResponse.json({ error: 'Comercio no encontrado' }, { status: 404 });
    }

    const id = 'tbl-' + crypto.randomUUID().slice(0, 8);
    const qrToken = `qr-${merchant.slug}-m${number}-${crypto.randomBytes(3).toString('hex')}`;

    db.prepare(`
      INSERT INTO tables (id, merchant_id, number, label, qr_token, zone)
      VALUES (?, ?, ?, ?, ?, ?)
    `).run(id, merchant.id, parseInt(number, 10), label || `Mesa ${number}`, qrToken, zone || 'Salón');

    return NextResponse.json({ ok: true, id, qrToken, message: '¡Mesa creada con éxito!' });
  } catch (error) {
    return NextResponse.json({ error: (error as Error).message }, { status: 500 });
  }
}
