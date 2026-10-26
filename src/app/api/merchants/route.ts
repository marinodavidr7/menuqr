import { NextResponse } from 'next/server';
import { getDb } from '@/lib/db';
import { seedDatabase } from '@/lib/seed';
import { getCurrentUser } from '@/lib/auth';
import crypto from 'node:crypto';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const q = searchParams.get('q')?.toLowerCase().trim() || '';
    const sort = searchParams.get('sort') || 'rating'; // rating | name_asc | name_desc | recent
    const page = Math.max(1, parseInt(searchParams.get('page') || '1', 10));
    const pageSize = Math.max(1, parseInt(searchParams.get('pageSize') || '12', 10));

    const db = getDb();

    let query = "SELECT * FROM merchants WHERE status != 'closed'";
    const params: any[] = [];

    if (q) {
      query += ' AND (LOWER(name) LIKE ? OR LOWER(category) LIKE ? OR LOWER(description) LIKE ?)';
      params.push(`%${q}%`, `%${q}%`, `%${q}%`);
    }

    // Contar total
    const countSql = query.replace('SELECT *', 'SELECT COUNT(*) as total');
    const countResult = db.prepare(countSql).get(...params) as { total: number };
    const total = countResult ? countResult.total : 0;

    // Ordenar
    if (sort === 'rating') {
      query += ' ORDER BY rating_avg DESC, rating_count DESC';
    } else if (sort === 'name_asc') {
      query += ' ORDER BY name ASC';
    } else if (sort === 'name_desc') {
      query += ' ORDER BY name DESC';
    } else if (sort === 'recent') {
      query += ' ORDER BY created_at DESC';
    }

    // Paginación
    const offset = (page - 1) * pageSize;
    query += ` LIMIT ${pageSize} OFFSET ${offset}`;

    const merchants = db.prepare(query).all(...params);

    return NextResponse.json({
      merchants,
      total,
      page,
      pageSize,
      totalPages: Math.ceil(total / pageSize),
    });
  } catch (error) {
    return NextResponse.json({ error: (error as Error).message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: 'Debés iniciar sesión para dar de alta un comercio' }, { status: 401 });
    }

    const body = await request.json();
    const { name, category, description, phone, whatsapp, address_line, delivery_fee_cents, delivery_min_minutes } = body;

    if (!name || !category) {
      return NextResponse.json({ error: 'El nombre y la categoría son obligatorios' }, { status: 400 });
    }

    const db = getDb();
    const slugBase = name
      .toLowerCase()
      .trim()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/(^-|-$)/g, '');

    let slug = slugBase;
    let counter = 1;
    while (db.prepare('SELECT id FROM merchants WHERE slug = ?').get(slug)) {
      slug = `${slugBase}-${counter}`;
      counter++;
    }

    const merchantId = 'mer-' + crypto.randomUUID().slice(0, 8);
    const now = new Date().toISOString();

    db.prepare(`
      INSERT INTO merchants (
        id, slug, name, category, description, logo_url, cover_url,
        phone, whatsapp, address_line, delivery_fee_cents, delivery_min_minutes,
        status, plan, rating_avg, rating_count, created_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'active', 'pro', 5.0, 1, ?)
    `).run(
      merchantId,
      slug,
      name.trim(),
      category.trim(),
      description || 'Gastronomía de calidad',
      'https://images.unsplash.com/photo-1555396273-367ea4eb4db5?w=160&auto=format&fit=crop&q=80',
      'https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?w=1200&auto=format&fit=crop&q=80',
      phone || '',
      whatsapp || '',
      address_line || 'Buenos Aires, Argentina',
      delivery_fee_cents || 250000,
      delivery_min_minutes || 30,
      now
    );

    // Asignar al creador como dueño (owner)
    db.prepare(`
      INSERT INTO merchant_users (merchant_id, user_id, role) VALUES (?, ?, 'owner')
    `).run(merchantId, user.id);

    // Crear categorías iniciales por defecto
    const catId = 'cat-' + crypto.randomUUID().slice(0, 8);
    db.prepare(`
      INSERT INTO categories (id, merchant_id, name, sort_order) VALUES (?, ?, 'Especialidades', 1)
    `).run(catId, merchantId);

    // Crear 5 mesas por defecto con sus QR tokens
    const insertTable = db.prepare(`
      INSERT INTO tables (id, merchant_id, number, label, qr_token, zone)
      VALUES (?, ?, ?, ?, ?, 'Salón')
    `);
    for (let i = 1; i <= 5; i++) {
      const qrToken = `qr-${slug}-m${i}-${crypto.randomBytes(3).toString('hex')}`;
      insertTable.run('tbl-' + crypto.randomUUID().slice(0, 8), merchantId, i, `Mesa 0${i}`, qrToken);
    }

    return NextResponse.json({
      merchantId,
      slug,
      message: 'Comercio creado con éxito',
    });
  } catch (error) {
    return NextResponse.json({ error: (error as Error).message }, { status: 500 });
  }
}
