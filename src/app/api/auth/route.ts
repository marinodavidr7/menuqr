import { NextResponse } from 'next/server';
import { getDb } from '@/lib/db';
import { seedDatabase, hashPassword } from '@/lib/seed';
import { getCurrentUser, signToken } from '@/lib/auth';
import { cookies } from 'next/headers';
import crypto from 'node:crypto';

export const dynamic = 'force-dynamic';

function getIsHttps(request: Request): boolean {
  const proto = request.headers.get('x-forwarded-proto');
  if (proto) return proto === 'https';
  return request.url.startsWith('https://');
}

export async function GET(request: Request) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ user: null });
    }

    const { searchParams } = new URL(request.url);
    const merchantSlug = searchParams.get('merchantSlug');
    const db = getDb();
    let role = null;
    let activeSlug = merchantSlug || null;

    if (merchantSlug) {
      const merchant = db.prepare('SELECT id FROM merchants WHERE slug = ?').get(merchantSlug) as { id: string } | undefined;
      if (merchant) {
        const row = db.prepare('SELECT role FROM merchant_users WHERE merchant_id = ? AND user_id = ?').get(merchant.id, user.id) as { role: string } | undefined;
        role = row?.role || null;
      }
    }

    // Comercios a los que pertenece el usuario
    const userMerchants = db.prepare(`
      SELECT mu.role, m.slug, m.name
      FROM merchant_users mu
      JOIN merchants m ON mu.merchant_id = m.id
      WHERE mu.user_id = ?
    `).all(user.id) as Array<{ role: string; slug: string; name: string }>;

    const defaultMerchant = userMerchants[0] || null;
    let defaultPanelUrl = null;
    if (defaultMerchant) {
      defaultPanelUrl = defaultMerchant.role === 'kitchen'
        ? `/panel/${defaultMerchant.slug}/cocina`
        : `/panel/${defaultMerchant.slug}/salon`;
      if (!role) {
        role = defaultMerchant.role;
        activeSlug = defaultMerchant.slug;
      }
    }

    return NextResponse.json({
      user,
      role,
      merchantSlug: activeSlug,
      defaultPanelUrl,
      userMerchants,
    });
  } catch (error) {
    return NextResponse.json({ error: (error as Error).message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { action, email, password, name } = body;
    const db = getDb();
    const isHttps = getIsHttps(request);

    if (action === 'logout') {
      const cookieStore = await cookies();
      cookieStore.set('menuqr_session', '', {
        httpOnly: true,
        secure: isHttps,
        sameSite: 'lax',
        path: '/',
        maxAge: 0,
      });
      return NextResponse.json({ ok: true });
    }

    if (action === 'login') {
      if (!email || !password) {
        return NextResponse.json({ error: 'Completá todos los campos' }, { status: 400 });
      }

      const pwdHash = hashPassword(password);
      const user = db.prepare('SELECT id, email, name, avatar_url, auth_provider, created_at FROM users WHERE email = ? AND password_hash = ?').get(email.toLowerCase().trim(), pwdHash) as any;

      if (!user) {
        return NextResponse.json({ error: 'Email o contraseña incorrectos. Verificá tus datos.' }, { status: 401 });
      }

      const token = signToken({
        userId: user.id,
        email: user.email,
        name: user.name,
        exp: Date.now() + 1000 * 60 * 60 * 24 * 30, // 30 días
      });

      const cookieStore = await cookies();
      cookieStore.set('menuqr_session', token, {
        httpOnly: true,
        secure: isHttps,
        sameSite: 'lax',
        path: '/',
        maxAge: 60 * 60 * 24 * 30,
      });

      // Obtener comercio asignado para redirección directa
      const firstMerchant = db.prepare(`
        SELECT mu.role, m.slug
        FROM merchant_users mu
        JOIN merchants m ON mu.merchant_id = m.id
        WHERE mu.user_id = ?
        LIMIT 1
      `).get(user.id) as { role: string; slug: string } | undefined;

      const defaultPanelUrl = firstMerchant
        ? (firstMerchant.role === 'kitchen' ? `/panel/${firstMerchant.slug}/cocina` : `/panel/${firstMerchant.slug}/salon`)
        : null;

      return NextResponse.json({
        user,
        defaultPanelUrl,
        role: firstMerchant?.role || null,
        merchantSlug: firstMerchant?.slug || null,
      });
    }

    if (action === 'register') {
      if (!email || !password || !name) {
        return NextResponse.json({ error: 'Completá tu nombre, email y contraseña' }, { status: 400 });
      }

      const existing = db.prepare('SELECT id FROM users WHERE email = ?').get(email.toLowerCase().trim());
      if (existing) {
        return NextResponse.json({ error: 'Ya existe una cuenta con este correo electrónico' }, { status: 400 });
      }

      const id = 'usr-' + crypto.randomUUID().slice(0, 8);
      const pwdHash = hashPassword(password);
      const now = new Date().toISOString();

      db.prepare(`
        INSERT INTO users (id, email, password_hash, name, avatar_url, auth_provider, created_at)
        VALUES (?, ?, ?, ?, ?, 'password', ?)
      `).run(id, email.toLowerCase().trim(), pwdHash, name.trim(), 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=120&auto=format&fit=crop&q=80', now);

      const user = { id, email: email.toLowerCase().trim(), name: name.trim(), avatar_url: null, auth_provider: 'password', created_at: now };

      const token = signToken({
        userId: user.id,
        email: user.email,
        name: user.name,
        exp: Date.now() + 1000 * 60 * 60 * 24 * 30,
      });

      const cookieStore = await cookies();
      cookieStore.set('menuqr_session', token, {
        httpOnly: true,
        secure: isHttps,
        sameSite: 'lax',
        path: '/',
        maxAge: 60 * 60 * 24 * 30,
      });

      return NextResponse.json({ user, defaultPanelUrl: null });
    }

    return NextResponse.json({ error: 'Acción no válida' }, { status: 400 });
  } catch (error) {
    return NextResponse.json({ error: (error as Error).message }, { status: 500 });
  }
}
