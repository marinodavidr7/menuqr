import { cookies } from 'next/headers';
import crypto from 'node:crypto';
import { getDb } from './db';
import { User, UserRole } from './types';
import { hashPassword } from './seed';

const COOKIE_NAME = 'menuqr_session';
const SECRET_KEY = process.env.SESSION_SECRET || 'menuqr_super_secure_secret_porteño_2026';

interface SessionData {
  userId: string;
  email: string;
  name: string;
  exp: number;
}

export function signToken(data: SessionData): string {
  const payload = Buffer.from(JSON.stringify(data)).toString('base64url');
  const signature = crypto.createHmac('sha256', SECRET_KEY).update(payload).digest('base64url');
  return `${payload}.${signature}`;
}

export function verifyToken(token: string): SessionData | null {
  try {
    const [payload, signature] = token.split('.');
    if (!payload || !signature) return null;

    const expectedSignature = crypto.createHmac('sha256', SECRET_KEY).update(payload).digest('base64url');
    if (signature !== expectedSignature) return null;

    const data = JSON.parse(Buffer.from(payload, 'base64url').toString('utf8')) as SessionData;
    if (data.exp && Date.now() > data.exp) return null;

    return data;
  } catch {
    return null;
  }
}

export async function getCurrentUser(): Promise<User | null> {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get(COOKIE_NAME)?.value;
    if (!token) return null;

    const session = verifyToken(token);
    if (!session) return null;

    const db = getDb();
    const user = db.prepare('SELECT id, email, name, avatar_url, auth_provider, created_at FROM users WHERE id = ?').get(session.userId) as User | undefined;
    return user || null;
  } catch {
    return null;
  }
}

export async function getUserRoleForMerchant(merchantIdOrSlug: string, userId: string): Promise<UserRole | null> {
  const db = getDb();
  
  // Buscar si merchantIdOrSlug es un id o un slug
  const merchant = db.prepare('SELECT id FROM merchants WHERE id = ? OR slug = ?').get(merchantIdOrSlug, merchantIdOrSlug) as { id: string } | undefined;
  if (!merchant) return null;

  const row = db.prepare('SELECT role FROM merchant_users WHERE merchant_id = ? AND user_id = ?').get(merchant.id, userId) as { role: UserRole } | undefined;
  return row ? row.role : null;
}
