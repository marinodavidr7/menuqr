import { NextResponse } from 'next/server';
import { getDb } from '@/lib/db';
import { seedDatabase, hashPassword } from '@/lib/seed';
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
    if (!role || (role !== 'owner' && role !== 'manager')) {
      return NextResponse.json({ error: 'Permisos insuficientes' }, { status: 403 });
    }

    const db = getDb();
    const members = db.prepare(`
      SELECT mu.role, u.id as user_id, u.email, u.name, u.avatar_url, u.created_at
      FROM merchant_users mu
      JOIN users u ON mu.user_id = u.id
      JOIN merchants m ON mu.merchant_id = m.id
      WHERE m.slug = ?
    `).all(merchantSlug);

    return NextResponse.json({ members });
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
    const { merchantSlug, email, name, role } = body;

    const callerRole = await getUserRoleForMerchant(merchantSlug, user.id);
    if (callerRole !== 'owner') {
      return NextResponse.json({ error: 'Solo el dueño puede incorporar miembros al equipo' }, { status: 403 });
    }

    const db = getDb();
    const merchant = db.prepare('SELECT id FROM merchants WHERE slug = ?').get(merchantSlug) as any;
    if (!merchant) {
      return NextResponse.json({ error: 'Comercio no encontrado' }, { status: 404 });
    }

    // Buscar si el usuario ya existe o crearlo
    let targetUser = db.prepare('SELECT id FROM users WHERE email = ?').get(email.toLowerCase().trim()) as any;
    if (!targetUser) {
      const id = 'usr-' + crypto.randomUUID().slice(0, 8);
      const pwdHash = hashPassword('password123');
      const now = new Date().toISOString();
      db.prepare(`
        INSERT INTO users (id, email, password_hash, name, avatar_url, auth_provider, created_at)
        VALUES (?, ?, ?, ?, ?, 'password', ?)
      `).run(id, email.toLowerCase().trim(), pwdHash, name.trim(), null, now);
      targetUser = { id };
    }

    // Insertar o actualizar rol
    db.prepare(`
      INSERT INTO merchant_users (merchant_id, user_id, role)
      VALUES (?, ?, ?)
      ON CONFLICT(merchant_id, user_id) DO UPDATE SET role = excluded.role
    `).run(merchant.id, targetUser.id, role);

    return NextResponse.json({ ok: true, message: `¡Se asignó el rol de ${role} al usuario correctamente!` });
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
    const merchantSlug = searchParams.get('merchantSlug');
    const targetUserId = searchParams.get('userId');

    const callerRole = await getUserRoleForMerchant(merchantSlug!, user.id);
    if (callerRole !== 'owner') {
      return NextResponse.json({ error: 'Solo el dueño puede remover miembros del equipo' }, { status: 403 });
    }

    const db = getDb();
    const merchant = db.prepare('SELECT id FROM merchants WHERE slug = ?').get(merchantSlug!) as any;
    if (!merchant) {
      return NextResponse.json({ error: 'Comercio no encontrado' }, { status: 404 });
    }

    db.prepare('DELETE FROM merchant_users WHERE merchant_id = ? AND user_id = ?').run(merchant.id, targetUserId);

    return NextResponse.json({ ok: true, message: 'Miembro removido del equipo' });
  } catch (error) {
    return NextResponse.json({ error: (error as Error).message }, { status: 500 });
  }
}
