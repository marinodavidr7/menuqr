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
    const orderId = searchParams.get('orderId');
    const status = searchParams.get('status');
    const channel = searchParams.get('channel');
    const db = getDb();

    // Si busca un pedido individual (ej comensal viendo su pedido en vivo)
    if (orderId) {
      const order = db.prepare(`
        SELECT o.*, t.number as table_number, t.label as table_label, m.name as merchant_name, m.slug as merchant_slug, m.phone as merchant_phone
        FROM orders o
        JOIN merchants m ON o.merchant_id = m.id
        LEFT JOIN tables t ON o.table_id = t.id
        WHERE o.id = ?
      `).get(orderId) as any;

      if (!order) {
        return NextResponse.json({ error: 'Pedido no encontrado' }, { status: 404 });
      }

      const items = db.prepare('SELECT * FROM order_items WHERE order_id = ?').all(orderId);
      return NextResponse.json({ order: { ...order, items } });
    }

    if (!merchantSlug) {
      return NextResponse.json({ error: 'Falta el parámetro merchantSlug' }, { status: 400 });
    }

    const merchant = db.prepare('SELECT id FROM merchants WHERE slug = ?').get(merchantSlug) as { id: string } | undefined;
    if (!merchant) {
      return NextResponse.json({ error: 'Comercio no encontrado' }, { status: 404 });
    }

    // Para ver los pedidos del panel, verificar rol del usuario
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    const role = await getUserRoleForMerchant(merchantSlug, user.id);
    if (!role) {
      return NextResponse.json({ error: 'No tenés permisos para ver los pedidos de este local' }, { status: 403 });
    }

    let query = `
      SELECT o.*, t.number as table_number, t.label as table_label
      FROM orders o
      LEFT JOIN tables t ON o.table_id = t.id
      WHERE o.merchant_id = ?
    `;
    const params: any[] = [merchant.id];

    if (status) {
      query += ' AND o.status = ?';
      params.push(status);
    } else {
      // Por defecto para Salón/Cocina no traer pedidos cerrados ni cancelados viejos a menos que se pida
      query += " AND o.status NOT IN ('closed', 'cancelled')";
    }

    if (channel) {
      query += ' AND o.channel = ?';
      params.push(channel);
    }

    query += ' ORDER BY o.created_at DESC';

    const orders = db.prepare(query).all(...params) as any[];

    // Adjuntar items a cada orden
    const getItems = db.prepare('SELECT * FROM order_items WHERE order_id = ?');
    const ordersWithItems = orders.map((o) => ({
      ...o,
      items: getItems.all(o.id),
    }));

    return NextResponse.json({ orders: ordersWithItems });
  } catch (error) {
    return NextResponse.json({ error: (error as Error).message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const {
      merchantSlug,
      channel,
      tableId,
      customerName,
      customerPhone,
      deliveryAddress,
      notes,
      paymentMethod,
      items,
    } = body;

    if (!merchantSlug || !channel || !items || !Array.isArray(items) || items.length === 0) {
      return NextResponse.json({ error: 'Datos de pedido incompletos' }, { status: 400 });
    }

    const db = getDb();
    const merchant = db.prepare('SELECT * FROM merchants WHERE slug = ?').get(merchantSlug) as any;
    if (!merchant) {
      return NextResponse.json({ error: 'Comercio no encontrado' }, { status: 404 });
    }

    // Calcular montos de ítems verificando precios reales de BD para evitar manipulaciones
    let subtotalCents = 0;
    const validatedItems: any[] = [];
    const getProduct = db.prepare('SELECT id, name, price_cents, available FROM products WHERE id = ? AND merchant_id = ?');

    for (const item of items) {
      const prod = getProduct.get(item.productId, merchant.id) as any;
      if (!prod) {
        return NextResponse.json({ error: `El producto ${item.name || item.productId} no pertenece a este comercio` }, { status: 400 });
      }
      if (!prod.available) {
        return NextResponse.json({ error: `El plato "${prod.name}" no está disponible en este momento` }, { status: 400 });
      }

      const qty = Math.max(1, parseInt(item.quantity, 10) || 1);
      const itemSubtotal = prod.price_cents * qty;
      subtotalCents += itemSubtotal;

      validatedItems.push({
        id: 'item-' + crypto.randomUUID().slice(0, 8),
        productId: prod.id,
        name: prod.name,
        unitPriceCents: prod.price_cents,
        quantity: qty,
        notes: item.notes || null,
      });
    }

    const deliveryFeeCents = channel === 'delivery' ? merchant.delivery_fee_cents : 0;
    const totalCents = subtotalCents + deliveryFeeCents;
    const orderId = 'ord-' + Date.now().toString().slice(-6) + '-' + crypto.randomBytes(2).toString('hex');
    const now = new Date().toISOString();

    const currentUser = await getCurrentUser();

    // Si paga con Mercado Pago, status inicial 'confirmed', de lo contrario según el método
    const orderStatus = 'confirmed';
    const paymentStatus = paymentMethod === 'mercadopago' ? 'approved' : 'pending';

    db.prepare(`
      INSERT INTO orders (
        id, merchant_id, channel, table_id, customer_id, customer_name,
        customer_phone, delivery_address, status, subtotal_cents, delivery_fee_cents,
        total_cents, payment_method, payment_status, notes, created_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      orderId,
      merchant.id,
      channel,
      tableId || null,
      currentUser ? currentUser.id : null,
      customerName || (currentUser ? currentUser.name : 'Comensal'),
      customerPhone || null,
      deliveryAddress || null,
      orderStatus,
      subtotalCents,
      deliveryFeeCents,
      totalCents,
      paymentMethod || 'cash',
      paymentStatus,
      notes || null,
      now
    );

    const insertItem = db.prepare(`
      INSERT INTO order_items (id, order_id, product_id, name_snapshot, unit_price_cents, quantity, notes)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `);

    for (const vi of validatedItems) {
      insertItem.run(vi.id, orderId, vi.productId, vi.name, vi.unitPriceCents, vi.quantity, vi.notes);
    }

    return NextResponse.json({
      orderId,
      status: orderStatus,
      totalCents,
      message: '¡Tu pedido fue recibido con éxito!',
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
    const { orderId, status, merchantSlug } = body;

    if (!orderId || !status || !merchantSlug) {
      return NextResponse.json({ error: 'Parámetros incompletos' }, { status: 400 });
    }

    const role = await getUserRoleForMerchant(merchantSlug, user.id);
    if (!role) {
      return NextResponse.json({ error: 'Permisos insuficientes' }, { status: 403 });
    }

    // Cocina solo puede cambiar estados entre confirmed -> in_kitchen -> ready
    if (role === 'kitchen' && (status === 'closed' || status === 'cancelled')) {
      return NextResponse.json({ error: 'El rol cocina no puede cerrar ni cancelar pedidos' }, { status: 403 });
    }

    const db = getDb();
    const order = db.prepare('SELECT o.*, m.id as m_id FROM orders o JOIN merchants m ON o.merchant_id = m.id WHERE o.id = ? AND m.slug = ?').get(orderId, merchantSlug) as any;

    if (!order) {
      return NextResponse.json({ error: 'Pedido no encontrado' }, { status: 404 });
    }

    const now = new Date().toISOString();
    const closedAt = status === 'closed' || status === 'delivered' ? now : null;

    db.prepare(`
      UPDATE orders SET status = ?, closed_at = COALESCE(?, closed_at) WHERE id = ?
    `).run(status, closedAt, orderId);

    // Si se cierra el pedido, registrar en el turno de caja abierto
    if (status === 'closed' || (status === 'delivered' && order.payment_status === 'approved')) {
      const currentShift = db.prepare("SELECT * FROM shifts WHERE merchant_id = ? AND status = 'open'").get(order.m_id) as any;
      if (currentShift) {
        const method = order.payment_method || 'cash';
        let cashInc = method === 'cash' ? order.total_cents : 0;
        let debitInc = method === 'debit' ? order.total_cents : 0;
        let creditInc = method === 'credit' ? order.total_cents : 0;
        let mpInc = method === 'mercadopago' ? order.total_cents : 0;

        db.prepare(`
          UPDATE shifts
          SET total_cents = total_cents + ?,
              cash_cents = cash_cents + ?,
              debit_cents = debit_cents + ?,
              credit_cents = credit_cents + ?,
              mp_cents = mp_cents + ?,
              expected_cents = initial_cash_cents + total_cents + ?
          WHERE id = ?
        `).run(order.total_cents, cashInc, debitInc, creditInc, mpInc, order.total_cents, currentShift.id);
      }
    }

    return NextResponse.json({ ok: true, status, message: `Pedido actualizado a ${status}` });
  } catch (error) {
    return NextResponse.json({ error: (error as Error).message }, { status: 500 });
  }
}
