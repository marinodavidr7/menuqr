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
    const date = searchParams.get('date');

    if (!merchantSlug) {
      return NextResponse.json({ error: 'Falta merchantSlug' }, { status: 400 });
    }

    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    const role = await getUserRoleForMerchant(merchantSlug, user.id);
    if (!role) {
      return NextResponse.json({ error: 'Permisos insuficientes' }, { status: 403 });
    }

    const db = getDb();
    let query = `
      SELECT r.*, t.number as table_number, t.label as table_label
      FROM reservations r
      JOIN merchants m ON r.merchant_id = m.id
      LEFT JOIN tables t ON r.table_id = t.id
      WHERE m.slug = ?
    `;
    const params: any[] = [merchantSlug];

    if (date) {
      query += ' AND r.date = ?';
      params.push(date);
    }

    query += ' ORDER BY r.date ASC, r.time ASC';

    const reservations = db.prepare(query).all(...params);
    return NextResponse.json({ reservations });
  } catch (error) {
    return NextResponse.json({ error: (error as Error).message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { merchantSlug, customerName, customerPhone, customerEmail, date, time, partySize, notes } = body;

    if (!merchantSlug || !customerName || !customerPhone || !date || !time || !partySize) {
      return NextResponse.json({ error: 'Completá todos los datos obligatorios de la reserva' }, { status: 400 });
    }

    const db = getDb();
    const merchant = db.prepare('SELECT id FROM merchants WHERE slug = ?').get(merchantSlug) as any;
    if (!merchant) {
      return NextResponse.json({ error: 'Comercio no encontrado' }, { status: 404 });
    }

    const id = 'res-' + crypto.randomUUID().slice(0, 8);
    const now = new Date().toISOString();

    db.prepare(`
      INSERT INTO reservations (
        id, merchant_id, customer_name, customer_phone, customer_email,
        date, time, party_size, status, notes, created_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'pending', ?, ?)
    `).run(
      id,
      merchant.id,
      customerName.trim(),
      customerPhone.trim(),
      customerEmail?.trim() || null,
      date,
      time,
      parseInt(partySize, 10),
      notes || null,
      now
    );

    return NextResponse.json({
      ok: true,
      id,
      message: '¡Tu solicitud de reserva fue recibida! Te confirmaremos a la brevedad.',
    });
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
    const { reservationId, status, merchantSlug, tableId } = body;

    const role = await getUserRoleForMerchant(merchantSlug, user.id);
    if (!role || (role !== 'owner' && role !== 'manager')) {
      return NextResponse.json({ error: 'Permisos insuficientes' }, { status: 403 });
    }

    const db = getDb();
    const now = new Date().toISOString();

    db.prepare(`
      UPDATE reservations
      SET status = ?,
          table_id = COALESCE(?, table_id),
          notified_at = CASE WHEN ? = 'confirmed' THEN ? ELSE notified_at END
      WHERE id = ?
    `).run(status, tableId || null, status, now, reservationId);

    const message = status === 'confirmed'
      ? '¡Reserva confirmada! Se envió el aviso automático al cliente.'
      : `Reserva marcada como ${status}.`;

    return NextResponse.json({ ok: true, status, message });
  } catch (error) {
    return NextResponse.json({ error: (error as Error).message }, { status: 500 });
  }
}
