import { NextResponse } from 'next/server';
import { getDb } from '@/lib/db';
import { seedDatabase } from '@/lib/seed';
import { getCurrentUser, getUserRoleForMerchant } from '@/lib/auth';

seedDatabase();

export async function GET(
  request: Request,
  { params }: { params: Promise<{ slug: string }> }
) {
  try {
    const { slug } = await params;
    const db = getDb();

    const merchant = db.prepare('SELECT * FROM merchants WHERE slug = ?').get(slug) as any;
    if (!merchant) {
      return NextResponse.json({ error: 'Comercio no encontrado' }, { status: 404 });
    }

    const categories = db.prepare('SELECT * FROM categories WHERE merchant_id = ? ORDER BY sort_order ASC').all(merchant.id) as any[];
    const products = db.prepare('SELECT * FROM products WHERE merchant_id = ? ORDER BY sort_order ASC, name ASC').all(merchant.id) as any[];
    const tables = db.prepare('SELECT * FROM tables WHERE merchant_id = ? ORDER BY number ASC').all(merchant.id) as any[];
    const hours = db.prepare('SELECT * FROM merchant_hours WHERE merchant_id = ? ORDER BY weekday ASC').all(merchant.id) as any[];
    const reviews = db.prepare('SELECT * FROM reviews WHERE merchant_id = ? ORDER BY created_at DESC LIMIT 10').all(merchant.id) as any[];

    // Determinar si está abierto hoy
    const now = new Date();
    const currentWeekday = now.getDay();
    const currentHourStr = now.toTimeString().slice(0, 5); // "HH:MM"
    const todayHours = hours.find((h) => h.weekday === currentWeekday);

    let isOpen = true;
    if (merchant.status !== 'active') {
      isOpen = false;
    } else if (todayHours) {
      if (todayHours.is_closed) {
        isOpen = false;
      } else {
        const { open_time, close_time } = todayHours;
        if (close_time < open_time) {
          // Cruza la medianoche (ej 12:00 a 01:00)
          isOpen = currentHourStr >= open_time || currentHourStr <= close_time;
        } else {
          isOpen = currentHourStr >= open_time && currentHourStr <= close_time;
        }
      }
    }

    return NextResponse.json({
      merchant,
      isOpen,
      categories,
      products,
      tables,
      hours,
      reviews,
    });
  } catch (error) {
    return NextResponse.json({ error: (error as Error).message }, { status: 500 });
  }
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ slug: string }> }
) {
  try {
    const { slug } = await params;
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    const role = await getUserRoleForMerchant(slug, user.id);
    if (!role || (role !== 'owner' && role !== 'manager')) {
      return NextResponse.json({ error: 'Permisos insuficientes' }, { status: 403 });
    }

    const body = await request.json();
    const db = getDb();
    const merchant = db.prepare('SELECT id FROM merchants WHERE slug = ?').get(slug) as any;
    if (!merchant) {
      return NextResponse.json({ error: 'Comercio no encontrado' }, { status: 404 });
    }

    const fields: string[] = [];
    const values: any[] = [];

    const allowed = [
      'name', 'category', 'description', 'phone', 'whatsapp',
      'address_line', 'delivery_fee_cents', 'delivery_min_minutes',
      'status', 'mp_account_id', 'logo_url', 'cover_url'
    ];

    for (const key of allowed) {
      if (body[key] !== undefined) {
        fields.push(`${key} = ?`);
        values.push(body[key]);
      }
    }

    if (fields.length > 0) {
      values.push(merchant.id);
      db.prepare(`UPDATE merchants SET ${fields.join(', ')} WHERE id = ?`).run(...values);
    }

    return NextResponse.json({ ok: true, message: 'Datos actualizados correctamente' });
  } catch (error) {
    return NextResponse.json({ error: (error as Error).message }, { status: 500 });
  }
}
