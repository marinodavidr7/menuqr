import { NextResponse } from 'next/server';
import { getDb } from '@/lib/db';
import { seedDatabase } from '@/lib/seed';
import crypto from 'node:crypto';

export const dynamic = 'force-dynamic';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { action, orderId, merchantSlug } = body;

    const db = getDb();

    // 1. Crear Checkout Preference
    if (action === 'create_preference') {
      const order = db.prepare(`
        SELECT o.*, m.name as merchant_name, m.mp_account_id
        FROM orders o
        JOIN merchants m ON o.merchant_id = m.id
        WHERE o.id = ?
      `).get(orderId) as any;

      if (!order) {
        return NextResponse.json({ error: 'Pedido no encontrado' }, { status: 404 });
      }

      const preferenceId = 'pref_' + crypto.randomBytes(8).toString('hex');
      const paymentId = 'pay_' + crypto.randomBytes(8).toString('hex');

      // Guardar registro de pago pendiente
      db.prepare(`
        INSERT INTO payments (id, order_id, provider, provider_payment_id, amount_cents, status)
        VALUES (?, ?, 'mercadopago', ?, ?, 'pending')
        ON CONFLICT(provider_payment_id) DO NOTHING
      `).run('pmt-' + crypto.randomUUID().slice(0, 8), order.id, paymentId, order.total_cents);

      return NextResponse.json({
        preferenceId,
        paymentId,
        amountCents: order.total_cents,
        merchantName: order.merchant_name,
        mpAccountId: order.mp_account_id,
        sandboxInitPoint: `https://sandbox.mercadopago.com.ar/checkout/v1/redirect?pref_id=${preferenceId}`,
      });
    }

    // 2. Webhook idempotente de confirmación de pago (Sandbox o Producción)
    if (action === 'webhook_confirm') {
      const { paymentId, status = 'approved' } = body;

      const payment = db.prepare('SELECT * FROM payments WHERE provider_payment_id = ?').get(paymentId) as any;
      if (!payment) {
        return NextResponse.json({ error: 'Pago no encontrado' }, { status: 404 });
      }

      if (payment.status === 'approved') {
        // Idempotencia: ya procesado
        return NextResponse.json({ ok: true, message: 'Pago ya procesado previamente' });
      }

      const now = new Date().toISOString();
      db.prepare(`
        UPDATE payments SET status = ?, paid_at = ? WHERE id = ?
      `).run(status, now, payment.id);

      db.prepare(`
        UPDATE orders SET payment_status = ? WHERE id = ?
      `).run(status, payment.order_id);

      return NextResponse.json({ ok: true, message: '¡Pago confirmado exitosamente!' });
    }

    // 3. Conectar Mercado Pago en Ajustes
    if (action === 'connect_mp') {
      const { mpAccountId } = body;
      if (!merchantSlug || !mpAccountId) {
        return NextResponse.json({ error: 'Faltan datos de cuenta Mercado Pago' }, { status: 400 });
      }

      db.prepare('UPDATE merchants SET mp_account_id = ? WHERE slug = ?').run(mpAccountId, merchantSlug);
      return NextResponse.json({ ok: true, message: '¡Cuenta de Mercado Pago vinculada correctamente!' });
    }

    return NextResponse.json({ error: 'Acción no válida' }, { status: 400 });
  } catch (error) {
    return NextResponse.json({ error: (error as Error).message }, { status: 500 });
  }
}
