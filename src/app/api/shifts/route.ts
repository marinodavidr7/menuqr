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

    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    const role = await getUserRoleForMerchant(merchantSlug, user.id);
    if (!role || role === 'kitchen') {
      return NextResponse.json({ error: 'Permisos insuficientes para ver la caja' }, { status: 403 });
    }

    const db = getDb();
    const merchant = db.prepare('SELECT id FROM merchants WHERE slug = ?').get(merchantSlug) as any;
    if (!merchant) {
      return NextResponse.json({ error: 'Comercio no encontrado' }, { status: 404 });
    }

    // Turno actual abierto
    const currentShift = db.prepare(`
      SELECT s.*, u.name as opened_by_name
      FROM shifts s
      LEFT JOIN users u ON s.opened_by = u.id
      WHERE s.merchant_id = ? AND s.status = 'open'
      ORDER BY s.opened_at DESC LIMIT 1
    `).get(merchant.id) as any;

    // Historial de turnos cerrados
    const history = db.prepare(`
      SELECT s.*, u1.name as opened_by_name, u2.name as closed_by_name
      FROM shifts s
      LEFT JOIN users u1 ON s.opened_by = u1.id
      LEFT JOIN users u2 ON s.closed_by = u2.id
      WHERE s.merchant_id = ? AND s.status = 'closed'
      ORDER BY s.closed_at DESC LIMIT 15
    `).all(merchant.id) as any[];

    return NextResponse.json({ currentShift: currentShift || null, history });
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
    const { action, merchantSlug, initialCashCents, notes, actualCountedCents } = body;

    const role = await getUserRoleForMerchant(merchantSlug, user.id);
    if (!role || role === 'kitchen') {
      return NextResponse.json({ error: 'Permisos insuficientes para operar la caja' }, { status: 403 });
    }

    const db = getDb();
    const merchant = db.prepare('SELECT id FROM merchants WHERE slug = ?').get(merchantSlug) as any;
    if (!merchant) {
      return NextResponse.json({ error: 'Comercio no encontrado' }, { status: 404 });
    }

    const now = new Date().toISOString();

    if (action === 'open') {
      // Verificar si ya hay un turno abierto
      const openShift = db.prepare("SELECT id FROM shifts WHERE merchant_id = ? AND status = 'open'").get(merchant.id);
      if (openShift) {
        return NextResponse.json({ error: 'Ya existe un turno abierto actualmente' }, { status: 400 });
      }

      const initial = Math.max(0, parseInt(initialCashCents, 10) || 0);
      const shiftId = 'shift-' + Date.now().toString().slice(-6);

      db.prepare(`
        INSERT INTO shifts (
          id, merchant_id, opened_by, opened_at, initial_cash_cents,
          total_cents, cash_cents, debit_cents, credit_cents, mp_cents,
          expected_cents, difference_cents, status, notes
        ) VALUES (?, ?, ?, ?, ?, 0, 0, 0, 0, 0, ?, 0, 'open', ?)
      `).run(shiftId, merchant.id, user.id, now, initial, initial, notes || 'Apertura de turno');

      return NextResponse.json({ ok: true, shiftId, message: '¡Turno de caja abierto con éxito!' });
    }

    if (action === 'close') {
      const openShift = db.prepare("SELECT * FROM shifts WHERE merchant_id = ? AND status = 'open'").get(merchant.id) as any;
      if (!openShift) {
        return NextResponse.json({ error: 'No hay ningún turno abierto para cerrar' }, { status: 400 });
      }

      const counted = Math.max(0, parseInt(actualCountedCents, 10) || 0);
      const expected = openShift.expected_cents || (openShift.initial_cash_cents + openShift.total_cents);
      const difference = counted - expected;

      db.prepare(`
        UPDATE shifts
        SET status = 'closed',
            closed_by = ?,
            closed_at = ?,
            expected_cents = ?,
            difference_cents = ?,
            notes = COALESCE(?, notes)
        WHERE id = ?
      `).run(user.id, now, expected, difference, notes || null, openShift.id);

      return NextResponse.json({
        ok: true,
        differenceCents: difference,
        message: difference === 0 ? '¡Arqueo sin diferencias!' : `Turno cerrado con diferencia de $ ${Math.abs(difference / 100).toLocaleString('es-AR')}`,
      });
    }

    return NextResponse.json({ error: 'Acción no válida' }, { status: 400 });
  } catch (error) {
    return NextResponse.json({ error: (error as Error).message }, { status: 500 });
  }
}
