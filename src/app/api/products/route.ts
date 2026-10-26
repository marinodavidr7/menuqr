import { NextResponse } from 'next/server';
import { getDb } from '@/lib/db';
import { seedDatabase } from '@/lib/seed';
import { getCurrentUser, getUserRoleForMerchant } from '@/lib/auth';
import crypto from 'node:crypto';

export const dynamic = 'force-dynamic';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { action, productId, merchantSlug, viewType } = body;

    const db = getDb();

    // 1. Registrar vista de plato por el comensal (no requiere auth)
    if (action === 'record_view' && productId) {
      if (viewType === 'video') {
        db.prepare('UPDATE products SET video_views_count = video_views_count + 1 WHERE id = ?').run(productId);
      } else {
        db.prepare('UPDATE products SET views_count = views_count + 1 WHERE id = ?').run(productId);
      }
      return NextResponse.json({ ok: true });
    }

    // 2. Operaciones de gestión de carta (requieren auth)
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    const role = await getUserRoleForMerchant(merchantSlug, user.id);
    if (!role || (role !== 'owner' && role !== 'manager')) {
      return NextResponse.json({ error: 'Permisos insuficientes para editar la carta' }, { status: 403 });
    }

    const merchant = db.prepare('SELECT id FROM merchants WHERE slug = ?').get(merchantSlug) as any;
    if (!merchant) {
      return NextResponse.json({ error: 'Comercio no encontrado' }, { status: 404 });
    }

    if (action === 'create') {
      const { name, categoryId, description, priceCents, imageUrl, videoUrl } = body;

      if (!name || !categoryId || !priceCents) {
        return NextResponse.json({ error: 'Completá nombre, categoría y precio' }, { status: 400 });
      }

      const id = 'prod-' + crypto.randomUUID().slice(0, 8);
      const now = new Date().toISOString();

      db.prepare(`
        INSERT INTO products (
          id, merchant_id, category_id, name, description, price_cents,
          currency, image_url, video_url, available, sort_order, views_count,
          video_views_count, created_at
        ) VALUES (?, ?, ?, ?, ?, ?, 'ARS', ?, ?, 1, 99, 0, 0, ?)
      `).run(
        id,
        merchant.id,
        categoryId,
        name.trim(),
        description || '',
        parseInt(priceCents, 10),
        imageUrl || 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=800&auto=format&fit=crop&q=80',
        videoUrl || null,
        now
      );

      return NextResponse.json({ ok: true, id, message: '¡Plato creado con éxito!' });
    }

    return NextResponse.json({ error: 'Acción no válida' }, { status: 400 });
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
    const { productId, merchantSlug, available, priceCents, name, description, categoryId, imageUrl, videoUrl } = body;

    const role = await getUserRoleForMerchant(merchantSlug, user.id);
    if (!role || (role !== 'owner' && role !== 'manager')) {
      return NextResponse.json({ error: 'Permisos insuficientes para editar la carta' }, { status: 403 });
    }

    const db = getDb();
    const product = db.prepare(`
      SELECT p.* FROM products p
      JOIN merchants m ON p.merchant_id = m.id
      WHERE p.id = ? AND m.slug = ?
    `).get(productId, merchantSlug) as any;

    if (!product) {
      return NextResponse.json({ error: 'Plato no encontrado' }, { status: 404 });
    }

    const fields: string[] = [];
    const values: any[] = [];

    if (available !== undefined) {
      fields.push('available = ?');
      values.push(available ? 1 : 0);
    }
    if (priceCents !== undefined) {
      fields.push('price_cents = ?');
      values.push(parseInt(priceCents, 10));
    }
    if (name !== undefined) {
      fields.push('name = ?');
      values.push(name.trim());
    }
    if (categoryId !== undefined) {
      fields.push('category_id = ?');
      values.push(categoryId);
    }
    if (description !== undefined) {
      fields.push('description = ?');
      values.push(description.trim());
    }
    if (imageUrl !== undefined) {
      fields.push('image_url = ?');
      values.push(imageUrl);
    }
    if (videoUrl !== undefined) {
      fields.push('video_url = ?');
      values.push(videoUrl || null);
    }

    if (fields.length > 0) {
      values.push(productId);
      db.prepare(`UPDATE products SET ${fields.join(', ')} WHERE id = ?`).run(...values);
    }

    return NextResponse.json({ ok: true, message: 'Plato actualizado correctamente' });
  } catch (error) {
    return NextResponse.json({ error: (error as Error).message }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const productId = searchParams.get('productId');
    const merchantSlug = searchParams.get('merchantSlug');

    if (!productId || !merchantSlug) {
      return NextResponse.json({ error: 'Parámetros incompletos' }, { status: 400 });
    }

    const role = await getUserRoleForMerchant(merchantSlug, user.id);
    if (!role || (role !== 'owner' && role !== 'manager')) {
      return NextResponse.json({ error: 'Permisos insuficientes' }, { status: 403 });
    }

    const db = getDb();
    db.prepare('DELETE FROM products WHERE id = ?').run(productId);

    return NextResponse.json({ ok: true, message: 'Plato eliminado de la carta' });
  } catch (error) {
    return NextResponse.json({ error: (error as Error).message }, { status: 500 });
  }
}
