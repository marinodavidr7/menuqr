import { NextResponse } from 'next/server';
import { getDb } from '@/lib/db';
import { seedDatabase } from '@/lib/seed';
import { getCurrentUser, getUserRoleForMerchant } from '@/lib/auth';
import crypto from 'node:crypto';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const merchantSlug = searchParams.get('merchantSlug');
    if (!merchantSlug) {
      return NextResponse.json({ error: 'Falta merchantSlug' }, { status: 400 });
    }

    const db = getDb();
    const calls = db.prepare(`
      SELECT c.*, t.number as table_number, t.label as table_label, t.zone as table_zone
      FROM calls c
      JOIN tables t ON c.table_id = t.id
      JOIN merchants m ON c.merchant_id = m.id
      WHERE m.slug = ? AND c.status = 'open'
      ORDER BY c.created_at ASC
    `).all(merchantSlug);

    return NextResponse.json({ calls });
  } catch (error) {
    return NextResponse.json({ error: (error as Error).message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { merchantSlug, tableId, qrToken, type } = body;

    if (!merchantSlug || (!tableId && !qrToken) || !type) {
      return NextResponse.json({ error: 'Datos incompletos para llamar' }, { status: 400 });
    }

    const db = getDb();
    const merchant = db.prepare('SELECT id FROM merchants WHERE slug = ?').get(merchantSlug) as any;
    if (!merchant) {
      return NextResponse.json({ error: 'Comercio no encontrado' }, { status: 404 });
    }

    let actualTableId = tableId;
    if (!actualTableId && qrToken) {
      const tbl = db.prepare('SELECT id FROM tables WHERE qr_token = ? AND merchant_id = ?').get(qrToken, merchant.id) as any;
      if (tbl) actualTableId = tbl.id;
    }

    if (!actualTableId) {
      return NextResponse.json({ error: 'Mesa no identificada' }, { status: 400 });
    }

    // Verificar si ya hay una llamada abierta del mismo tipo para evitar spam
    const existing = db.prepare(`
      SELECT id FROM calls WHERE merchant_id = ? AND table_id = ? AND type = ? AND status = 'open'
    `).get(merchant.id, actualTableId, type);

    if (existing) {
      return NextResponse.json({ ok: true, message: 'La solicitud ya fue enviada y está siendo atendida.' });
    }

    const id = 'call-' + crypto.randomUUID().slice(0, 8);
    const now = new Date().toISOString();

    db.prepare(`
      INSERT INTO calls (id, merchant_id, table_id, type, status, created_at)
      VALUES (?, ?, ?, ?, 'open', ?)
    `).run(id, merchant.id, actualTableId, type, now);

    const message = type === 'bill' ? '¡La cuenta fue solicitada al salón!' : '¡El mozo ya está en camino a tu mesa!';
    return NextResponse.json({ ok: true, id, message });
  } catch (error) {
    return NextResponse.json({ error: (error as Error).message }, { status: 500 });
  }
}

export async function PATCH(request: Request) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    const body = await request.json();
    const { callId, merchantSlug } = body;

    const role = await getUserRoleForMerchant(merchantSlug, user.id);
    if (!role) {
      return NextResponse.json({ error: 'Permisos insuficientes' }, { status: 403 });
    }

    const db = getDb();
    const now = new Date().toISOString();

    db.prepare(`
      UPDATE calls SET status = 'resolved', resolved_at = ? WHERE id = ?
    `).run(now, callId);

    return NextResponse.json({ ok: true, message: 'Llamado resuelto con éxito' });
  } catch (error) {
    return NextResponse.json({ error: (error as Error).message }, { status: 500 });
  }
}
