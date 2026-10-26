import { getDb } from './db';
import crypto from 'node:crypto';

export function hashPassword(password: string): string {
  return crypto.createHash('sha256').update(password + '_menuqr_salt').digest('hex');
}

export function seedDatabase() {
  const db = getDb();

  // Verificar si ya hay comercios cargados
  const check = db.prepare('SELECT COUNT(*) as count FROM merchants').get() as { count: number };
  if (check && check.count > 0) {
    return; // Ya fue inicializada
  }

  const now = new Date().toISOString();
  const pwd = hashPassword('password123');

  // 1. Usuarios demo
  const users = [
    { id: 'usr-owner-1', email: 'dueno@menuqr.com', name: 'Martín Palermo (Dueño)', role: 'owner' },
    { id: 'usr-mgr-1', email: 'encargado@menuqr.com', name: 'Valeria Rossi (Encargada)', role: 'manager' },
    { id: 'usr-waiter-1', email: 'mozo@menuqr.com', name: 'Lucas Benítez (Mozo)', role: 'waiter' },
    { id: 'usr-kitchen-1', email: 'cocina@menuqr.com', name: 'Gonzalo Chef (Cocina)', role: 'kitchen' },
    { id: 'usr-customer-1', email: 'comensal@gmail.com', name: 'Facundo Gómez', role: 'customer' },
  ];

  const insertUser = db.prepare(`
    INSERT INTO users (id, email, password_hash, name, avatar_url, auth_provider, created_at)
    VALUES (?, ?, ?, ?, ?, 'password', ?)
  `);

  for (const u of users) {
    insertUser.run(
      u.id,
      u.email,
      pwd,
      u.name,
      `https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=120&auto=format&fit=crop&q=80`,
      now
    );
  }

  // 2. Comercio Principal: Bodegón Los Amigos
  const merchant1 = {
    id: 'mer-los-amigos',
    slug: 'los-amigos',
    name: 'Bodegón Los Amigos',
    category: 'Bodegón Porteño',
    description: 'Comida casera, porciones abundantes y el sabor de nuestra historia en pleno Palermo. Platos para compartir y cocina con amor.',
    logo_url: 'https://images.unsplash.com/photo-1555396273-367ea4eb4db5?w=160&auto=format&fit=crop&q=80',
    cover_url: 'https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?w=1200&auto=format&fit=crop&q=80',
    phone: '+54 11 4771-9988',
    whatsapp: '5491147719988',
    address_line: 'Av. Dorrego 1420, Palermo, CABA',
    lat: -34.585,
    lng: -58.435,
    delivery_fee_cents: 250000, // $ 2.500
    delivery_min_minutes: 35,
    status: 'active',
    plan: 'pro',
    mp_account_id: 'MP-CLIENT-ARG-001',
    rating_avg: 4.8,
    rating_count: 524,
    created_at: now,
  };

  // Otros 3 comercios para el directorio
  const merchant2 = {
    id: 'mer-fuego-burger',
    slug: 'fuego-burger',
    name: 'Fuego Burger & Craft',
    category: 'Hamburguesería & Bar',
    description: 'Smashed burgers con carne 100% de novillo argentino, pan brioche artesanal y papas crocantes triple cocción.',
    logo_url: 'https://images.unsplash.com/photo-1586190848861-99aa4a171e90?w=160&auto=format&fit=crop&q=80',
    cover_url: 'https://images.unsplash.com/photo-1550547660-d9450f859349?w=1200&auto=format&fit=crop&q=80',
    phone: '+54 11 5122-3344',
    whatsapp: '5491151223344',
    address_line: 'Gorriti 4890, Palermo Soho, CABA',
    lat: -34.588,
    lng: -58.428,
    delivery_fee_cents: 280000, // $ 2.800
    delivery_min_minutes: 25,
    status: 'active',
    plan: 'pro',
    mp_account_id: 'MP-CLIENT-ARG-002',
    rating_avg: 4.9,
    rating_count: 812,
    created_at: now,
  };

  const merchant3 = {
    id: 'mer-trattoria-napoli',
    slug: 'trattoria-napoli',
    name: 'Trattoria & Pizza Napoli',
    category: 'Pizzería & Pastas',
    description: 'Pizza napolitana contemporánea con harina orgánica, fermentación de 48 horas y horno a leña a 450°C.',
    logo_url: 'https://images.unsplash.com/photo-1579751626657-72bc17010498?w=160&auto=format&fit=crop&q=80',
    cover_url: 'https://images.unsplash.com/photo-1513104890138-7c749659a591?w=1200&auto=format&fit=crop&q=80',
    phone: '+54 11 4801-7766',
    whatsapp: '5491148017766',
    address_line: 'Honduras 5210, Villa Crespo, CABA',
    lat: -34.593,
    lng: -58.432,
    delivery_fee_cents: 220000,
    delivery_min_minutes: 30,
    status: 'active',
    plan: 'standard',
    mp_account_id: 'MP-CLIENT-ARG-003',
    rating_avg: 4.7,
    rating_count: 340,
    created_at: now,
  };

  const merchant4 = {
    id: 'mer-cafe-dorrego',
    slug: 'cafe-dorrego',
    name: 'Café Dorrego Especialidad',
    category: 'Cafetería & Brunch',
    description: 'Granos de origen único tostados en casa, pastelería artesanal y opciones de brunch para todo el día.',
    logo_url: 'https://images.unsplash.com/photo-1501339847302-ac426a4a7cbb?w=160&auto=format&fit=crop&q=80',
    cover_url: 'https://images.unsplash.com/photo-1495474472287-4d71bcdd2085?w=1200&auto=format&fit=crop&q=80',
    phone: '+54 11 4300-1122',
    whatsapp: '5491143001122',
    address_line: 'Defensa 1098, San Telmo, CABA',
    lat: -34.62,
    lng: -58.371,
    delivery_fee_cents: 180000,
    delivery_min_minutes: 20,
    status: 'active',
    plan: 'standard',
    mp_account_id: 'MP-CLIENT-ARG-004',
    rating_avg: 4.6,
    rating_count: 195,
    created_at: now,
  };

  const insertMerchant = db.prepare(`
    INSERT INTO merchants (
      id, slug, name, category, description, logo_url, cover_url,
      phone, whatsapp, address_line, lat, lng, delivery_fee_cents,
      delivery_min_minutes, status, plan, mp_account_id, rating_avg,
      rating_count, created_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  for (const m of [merchant1, merchant2, merchant3, merchant4]) {
    insertMerchant.run(
      m.id, m.slug, m.name, m.category, m.description, m.logo_url, m.cover_url,
      m.phone, m.whatsapp, m.address_line, m.lat, m.lng, m.delivery_fee_cents,
      m.delivery_min_minutes, m.status, m.plan, m.mp_account_id, m.rating_avg,
      m.rating_count, m.created_at
    );
  }

  // 3. Asignar roles a los usuarios en Los Amigos
  const insertRole = db.prepare(`
    INSERT INTO merchant_users (merchant_id, user_id, role) VALUES (?, ?, ?)
  `);
  insertRole.run('mer-los-amigos', 'usr-owner-1', 'owner');
  insertRole.run('mer-los-amigos', 'usr-mgr-1', 'manager');
  insertRole.run('mer-los-amigos', 'usr-waiter-1', 'waiter');
  insertRole.run('mer-los-amigos', 'usr-kitchen-1', 'kitchen');

  // Dueño también maneja fuego-burger
  insertRole.run('mer-fuego-burger', 'usr-owner-1', 'owner');

  // 4. Horarios para Los Amigos
  const insertHours = db.prepare(`
    INSERT INTO merchant_hours (id, merchant_id, weekday, open_time, close_time, is_closed)
    VALUES (?, ?, ?, ?, ?, ?)
  `);
  for (let d = 0; d < 7; d++) {
    insertHours.run(`hrs-${d}`, 'mer-los-amigos', d, '12:00', '00:30', 0);
  }

  // 5. Mesas de Los Amigos con sus QR tokens
  const insertTable = db.prepare(`
    INSERT INTO tables (id, merchant_id, number, label, qr_token, zone)
    VALUES (?, ?, ?, ?, ?, ?)
  `);
  const tables = [
    { id: 'tbl-1', number: 1, label: 'Mesa 01', qr_token: 'qr-mesa-01-la', zone: 'Salón Principal' },
    { id: 'tbl-2', number: 2, label: 'Mesa 02', qr_token: 'qr-mesa-02-la', zone: 'Salón Principal' },
    { id: 'tbl-3', number: 3, label: 'Mesa 03', qr_token: 'qr-mesa-03-la', zone: 'Salón Principal' },
    { id: 'tbl-4', number: 4, label: 'Mesa 04', qr_token: 'qr-mesa-04-la', zone: 'Salón Principal' },
    { id: 'tbl-5', number: 5, label: 'Mesa 05', qr_token: 'qr-mesa-05-la', zone: 'Salón Principal' },
    { id: 'tbl-6', number: 6, label: 'Mesa 06', qr_token: 'qr-mesa-06-la', zone: 'Patio Español' },
    { id: 'tbl-7', number: 7, label: 'Mesa 07', qr_token: 'qr-mesa-07-la', zone: 'Patio Español' },
    { id: 'tbl-8', number: 8, label: 'Mesa 08', qr_token: 'qr-mesa-08-la', zone: 'Patio Español' },
    { id: 'tbl-9', number: 9, label: 'Mesa 09', qr_token: 'qr-mesa-09-la', zone: 'Vereda' },
    { id: 'tbl-10', number: 10, label: 'Mesa 10', qr_token: 'qr-mesa-10-la', zone: 'Vereda' },
  ];
  for (const t of tables) {
    insertTable.run(t.id, 'mer-los-amigos', t.number, t.label, t.qr_token, t.zone);
  }

  // 6. Categorías de Los Amigos
  const insertCategory = db.prepare(`
    INSERT INTO categories (id, merchant_id, name, sort_order, icon)
    VALUES (?, ?, ?, ?, ?)
  `);
  const categories = [
    { id: 'cat-entradas', name: 'Entradas & Picadas', sort_order: 1, icon: 'Utensils' },
    { id: 'cat-milanesas', name: 'Milanesas de Bodegón', sort_order: 2, icon: 'Flame' },
    { id: 'cat-carnes', name: 'Carnes & Parrilla', sort_order: 3, icon: 'Beef' },
    { id: 'cat-pastas', name: 'Pastas Caseras', sort_order: 4, icon: 'Wheat' },
    { id: 'cat-postres', name: 'Postres Tradicionales', sort_order: 5, icon: 'Cake' },
    { id: 'cat-bebidas', name: 'Bebidas & Vinos', sort_order: 6, icon: 'GlassWater' },
  ];
  for (const c of categories) {
    insertCategory.run(c.id, 'mer-los-amigos', c.name, c.sort_order, c.icon);
  }

  // 7. Platos de Los Amigos (fotos en alta definición y videos cortos opcionales sin 3D)
  // Video corto de muestra en MP4 libre de Cloudflare / Wikimedia Commons de alta velocidad
  const sampleVideo = 'https://assets.mixkit.co/videos/preview/mixkit-hands-cutting-a-crispy-slice-of-pizza-42971-large.mp4';
  const meatVideo = 'https://assets.mixkit.co/videos/preview/mixkit-juicy-steak-on-a-cutting-board-42969-large.mp4';
  const dessertVideo = 'https://assets.mixkit.co/videos/preview/mixkit-caramel-being-poured-over-a-creamy-flan-42973-large.mp4';

  const insertProduct = db.prepare(`
    INSERT INTO products (
      id, merchant_id, category_id, name, description, price_cents,
      currency, image_url, video_url, available, sort_order, views_count,
      video_views_count, created_at
    ) VALUES (?, ?, ?, ?, ?, ?, 'ARS', ?, ?, ?, ?, ?, ?, ?)
  `);

  const products = [
    // Entradas
    {
      id: 'prod-revuelto-gramajo',
      catId: 'cat-entradas',
      name: 'Revuelto Gramajo Porteño',
      desc: 'Papas pay crocantes caseras, jamón cocido seleccionado feteado fino, arvejas frescas y huevos de campo babé.',
      price: 1450000, // $ 14.500
      image: 'https://images.unsplash.com/photo-1544025162-d76694265947?w=800&auto=format&fit=crop&q=80',
      video: sampleVideo,
      available: 1,
      sort: 1,
      views: 240,
      vviews: 92,
    },
    {
      id: 'prod-empanadas-carne',
      catId: 'cat-entradas',
      name: 'Empanadas de Carne Cortada a Cuchillo (x2)',
      desc: 'Masa casera criolla dorada al horno, relleno jugoso de lomo cortado a mano, cebolla de verdeo, huevo duro y comino norteño.',
      price: 780000, // $ 7.800
      image: 'https://images.unsplash.com/photo-1626700051175-6818013e1d4f?w=800&auto=format&fit=crop&q=80',
      video: null,
      available: 1,
      sort: 2,
      views: 310,
      vviews: 0,
    },
    {
      id: 'prod-provoleta-amigos',
      catId: 'cat-entradas',
      name: 'Provoleta Los Amigos al Fierrito',
      desc: 'Queso provolone hilado fundido con costra dorada, rodajas de tomate confitado, orégano fresco y oliva extra virgen.',
      price: 1290000, // $ 12.900
      image: 'https://images.unsplash.com/photo-1541544741938-0af808871cc0?w=800&auto=format&fit=crop&q=80',
      video: sampleVideo,
      available: 1,
      sort: 3,
      views: 185,
      vviews: 64,
    },

    // Milanesas
    {
      id: 'prod-mila-napolitana',
      catId: 'cat-milanesas',
      name: 'Milanesa Napolitana Gigante (Para 2)',
      desc: 'Ternera de primera tiernizada con doble rebozado crujiente, salsa pomodoro italiana de la casa, abundante jamón cocido y mozzarella gratinada con papas bastón.',
      price: 2480000, // $ 24.800
      image: 'https://images.unsplash.com/photo-1598515214211-89d3c73ae83b?w=800&auto=format&fit=crop&q=80',
      video: sampleVideo,
      available: 1,
      sort: 1,
      views: 540,
      vviews: 210,
    },
    {
      id: 'prod-mila-fugazzeta',
      catId: 'cat-milanesas',
      name: 'Milanesa Fugazzeta con Jamón y Panceta',
      desc: 'Milanesa de lomo cubierta de mozzarella dorada, cebolla caramelizada crujiente, panceta ahumada crocante y orégano.',
      price: 2650000, // $ 26.500
      image: 'https://images.unsplash.com/photo-1600891964599-f61ba0e24092?w=800&auto=format&fit=crop&q=80',
      video: null,
      available: 1,
      sort: 2,
      views: 420,
      vviews: 0,
    },
    {
      id: 'prod-mila-suiza',
      catId: 'cat-milanesas',
      name: 'Suprema a la Suiza Gratinada',
      desc: 'Pechuga de campo rebozada al limón, coronada con salsa bechamel cremosa, pimienta negra recién molida y queso gruyere gratinado.',
      price: 2190000, // $ 21.900
      image: 'https://images.unsplash.com/photo-1532550907401-a500c9a57435?w=800&auto=format&fit=crop&q=80',
      video: null,
      available: 1,
      sort: 3,
      views: 195,
      vviews: 0,
    },

    // Carnes & Parrilla
    {
      id: 'prod-bife-chorizo',
      catId: 'cat-carnes',
      name: 'Ojo de Bife con Papas Rústicas y Chimichurri',
      desc: 'Corte premium de 500g a punto con manteca de hierbas, acompañado de papas rústicas al romero y cazuela de chimichurri casero.',
      price: 2950000, // $ 29.500
      image: 'https://images.unsplash.com/photo-1544025162-d76694265947?w=800&auto=format&fit=crop&q=80',
      video: meatVideo,
      available: 1,
      sort: 1,
      views: 620,
      vviews: 280,
    },
    {
      id: 'prod-matambre-pizza',
      catId: 'cat-carnes',
      name: 'Matambre a la Pizza al Horno de Barro',
      desc: 'Matambre tierno hervido en leche y especias, terminado al horno con salsa de tomate perita, mozzarella y aceitunas negras.',
      price: 2790000, // $ 27.900
      image: 'https://images.unsplash.com/photo-1555939594-58d7cb561ad1?w=800&auto=format&fit=crop&q=80',
      video: null,
      available: 1,
      sort: 2,
      views: 310,
      vviews: 0,
    },

    // Pastas
    {
      id: 'prod-sorrentinos-jamon',
      catId: 'cat-pastas',
      name: 'Sorrentinos Caseros de Jamón y Muzzarella',
      desc: 'Masa al huevo estirada a mano, rellenos de jamón natural y muzzarella cremosa, servidos con salsa scarparo o mixta.',
      price: 1850000, // $ 18.500
      image: 'https://images.unsplash.com/photo-1551183053-bf91a1d81141?w=800&auto=format&fit=crop&q=80',
      video: sampleVideo,
      available: 1,
      sort: 1,
      views: 290,
      vviews: 110,
    },
    {
      id: 'prod-ravioles-espinaca',
      catId: 'cat-pastas',
      name: 'Ravioles de Espinaca y Ricota con Tuco Casero',
      desc: 'Clásicos ravioles con espinaca salteada al ajo y ricota fresca, acompañados de tuco con estofado de carne cocido por 4 horas.',
      price: 1720000, // $ 17.200
      image: 'https://images.unsplash.com/photo-1587740908075-9e245070dfaa?w=800&auto=format&fit=crop&q=80',
      video: null,
      available: 1,
      sort: 2,
      views: 215,
      vviews: 0,
    },

    // Postres
    {
      id: 'prod-flan-mixto',
      catId: 'cat-postres',
      name: 'Flan Casero Mixto con Caramelo Quemado',
      desc: 'El clásico de los clásicos de bodegón, con agujeritos perfectos, acompañado con bocha generosa de dulce de leche colonial y crema chantilly.',
      price: 650000, // $ 6.500
      image: 'https://images.unsplash.com/photo-1653988354010-39637252a2db?w=800&auto=format&fit=crop&q=80',
      video: dessertVideo,
      available: 1,
      sort: 1,
      views: 480,
      vviews: 190,
    },
    {
      id: 'prod-panqueque-ddl',
      catId: 'cat-postres',
      name: 'Panqueque con Dulce de Leche Quemado al Rhum',
      desc: 'Masa fina dorada en manteca, relleno rebosante de dulce de leche y caramelizado con azúcar frente a tus ojos.',
      price: 720000, // $ 7.200
      image: 'https://images.unsplash.com/photo-1519869325930-281384150729?w=800&auto=format&fit=crop&q=80',
      video: null,
      available: 1,
      sort: 2,
      views: 320,
      vviews: 0,
    },

    // Bebidas
    {
      id: 'prod-vino-malbec',
      catId: 'cat-bebidas',
      name: 'Vino Malbec Gran Reserva 750ml',
      desc: 'Notas a ciruela madura, vainilla y roble. Crianza de 12 meses en barricas de roble francés. Ideal para acompañar carnes rojas.',
      price: 1800000, // $ 18.000
      image: 'https://images.unsplash.com/photo-1510812431401-41d2bd2722f3?w=800&auto=format&fit=crop&q=80',
      video: null,
      available: 1,
      sort: 1,
      views: 150,
      vviews: 0,
    },
    {
      id: 'prod-soda-sifon',
      catId: 'cat-bebidas',
      name: 'Sifón de Soda de Vidrio Clásico (1 Litro)',
      desc: 'El verdadero sifón de vidrio vintage bien gasificado y helado para cortar el vino o disfrutar solo con limón.',
      price: 320000, // $ 3.200
      image: 'https://images.unsplash.com/photo-1551024709-8f23befc6f87?w=800&auto=format&fit=crop&q=80',
      video: null,
      available: 1,
      sort: 2,
      views: 90,
      vviews: 0,
    },
  ];

  for (const p of products) {
    insertProduct.run(
      p.id,
      'mer-los-amigos',
      p.catId,
      p.name,
      p.desc,
      p.price,
      p.image,
      p.video,
      p.available,
      p.sort,
      p.views,
      p.vviews,
      now
    );
  }

  // 8. Crear pedidos iniciales para el panel de Salón y Cocina en vivo
  const insertOrder = db.prepare(`
    INSERT INTO orders (
      id, merchant_id, channel, table_id, customer_id, customer_name,
      customer_phone, delivery_address, status, subtotal_cents, delivery_fee_cents,
      total_cents, payment_method, payment_status, notes, created_at, closed_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  const insertOrderItem = db.prepare(`
    INSERT INTO order_items (id, order_id, product_id, name_snapshot, unit_price_cents, quantity, notes)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `);

  // Pedido 1: En cocina (Mesa 04)
  const order1Id = 'ord-101';
  insertOrder.run(
    order1Id, 'mer-los-amigos', 'salon', 'tbl-4', 'usr-customer-1', 'Facundo Gómez',
    '+54 11 9882-1122', null, 'in_kitchen', 3930000, 0, 3930000, 'mercadopago', 'approved',
    'La milanesa bien dorada por favor', new Date(Date.now() - 9 * 60000).toISOString(), null
  );
  insertOrderItem.run('item-1', order1Id, 'prod-mila-napolitana', 'Milanesa Napolitana Gigante (Para 2)', 2480000, 1, 'Papas bien crocantes');
  insertOrderItem.run('item-2', order1Id, 'prod-revuelto-gramajo', 'Revuelto Gramajo Porteño', 1450000, 1, 'Sin cebolla');

  // Pedido 2: Confirmado / Entrante (Mesa 07)
  const order2Id = 'ord-102';
  insertOrder.run(
    order2Id, 'mer-los-amigos', 'salon', 'tbl-7', null, 'Mariana López',
    null, null, 'confirmed', 2950000, 0, 2950000, 'cash', 'pending',
    'Bife a punto jugoso', new Date(Date.now() - 3 * 60000).toISOString(), null
  );
  insertOrderItem.run('item-3', order2Id, 'prod-bife-chorizo', 'Ojo de Bife con Papas Rústicas y Chimichurri', 2950000, 1, 'A punto');

  // Pedido 3: Listo en cocina para llevar a mesa (Mesa 02)
  const order3Id = 'ord-103';
  insertOrder.run(
    order3Id, 'mer-los-amigos', 'salon', 'tbl-2', null, 'Tomás Méndez',
    null, null, 'ready', 2500000, 0, 2500000, 'debit', 'approved',
    null, new Date(Date.now() - 15 * 60000).toISOString(), null
  );
  insertOrderItem.run('item-4', order3Id, 'prod-sorrentinos-jamon', 'Sorrentinos Caseros de Jamón y Muzzarella', 1850000, 1, 'Salsa mixta');
  insertOrderItem.run('item-5', order3Id, 'prod-flan-mixto', 'Flan Casero Mixto con Caramelo Quemado', 650000, 1, 'Con mucho dulce de leche');

  // Pedido 4: Delivery en camino
  const order4Id = 'ord-104';
  insertOrder.run(
    order4Id, 'mer-los-amigos', 'delivery', null, null, 'Agustín Pereyra',
    '+54 11 5544-2211', 'Av. Santa Fe 3420, Piso 4B, CABA', 'confirmed', 3430000, 250000, 3680000, 'mercadopago', 'approved',
    'Tocar timbre 4B, no anda el portero visor', new Date(Date.now() - 18 * 60000).toISOString(), null
  );
  insertOrderItem.run('item-6', order4Id, 'prod-mila-fugazzeta', 'Milanesa Fugazzeta con Jamón y Panceta', 2650000, 1, null);
  insertOrderItem.run('item-7', order4Id, 'prod-empanadas-carne', 'Empanadas de Carne Cortada a Cuchillo (x2)', 780000, 1, null);

  // 9. Llamadas al mozo y pedidos de cuenta activos
  const insertCall = db.prepare(`
    INSERT INTO calls (id, merchant_id, table_id, type, status, created_at)
    VALUES (?, ?, ?, ?, ?, ?)
  `);
  insertCall.run('call-1', 'mer-los-amigos', 'tbl-4', 'bill', 'open', new Date(Date.now() - 2 * 60000).toISOString());
  insertCall.run('call-2', 'mer-los-amigos', 'tbl-1', 'waiter', 'open', new Date(Date.now() - 4 * 60000).toISOString());

  // 10. Turno de Caja Abierto
  const insertShift = db.prepare(`
    INSERT INTO shifts (
      id, merchant_id, opened_by, closed_by, opened_at, closed_at,
      initial_cash_cents, total_cents, cash_cents, debit_cents, credit_cents,
      mp_cents, expected_cents, difference_cents, status, notes
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);
  insertShift.run(
    'shift-current', 'mer-los-amigos', 'usr-mgr-1', null,
    new Date(Date.now() - 4 * 3600000).toISOString(), null,
    5000000, // $ 50.000 fondo inicial
    12810000, // $ 128.100 cobrados
    3500000,  // $ 35.000 efectivo
    2500000,  // $ 25.000 débito
    0,        // crédito
    6810000,  // $ 68.100 Mercado Pago
    17810000, // esperado: inicial + total
    0, 'open', 'Turno mediodía iniciado normalmente'
  );

  // 11. Reservas de muestra
  const insertReservation = db.prepare(`
    INSERT INTO reservations (
      id, merchant_id, customer_name, customer_phone, customer_email,
      date, time, party_size, status, table_id, notes, notified_at, created_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);
  const today = new Date().toISOString().split('T')[0];
  insertReservation.run('res-1', 'mer-los-amigos', 'Lucas Scarpino', '+54 11 6788-9900', 'lucas@gmail.com', today, '21:30', 4, 'confirmed', 'tbl-6', 'Cumpleaños familiar, si es posible en el patio', now, now);
  insertReservation.run('res-2', 'mer-los-amigos', 'Florencia Kirchner', '+54 11 4455-8899', 'flor@yahoo.com.ar', today, '22:00', 2, 'pending', null, 'Cena aniversario', null, now);
  insertReservation.run('res-3', 'mer-los-amigos', 'Esteban Bullrich', '+54 11 3322-1144', 'esteban@hotmail.com', today, '13:30', 6, 'confirmed', 'tbl-1', 'Almuerzo de trabajo', now, now);

  // 12. Reseñas
  const insertReview = db.prepare(`
    INSERT INTO reviews (id, merchant_id, customer_id, customer_name, rating, comment, created_at)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `);
  insertReview.run('rev-1', 'mer-los-amigos', null, 'Germán Martitegui', 5, 'Las milanesas son fuera de serie y el flan casero tiene gusto a la infancia. Volvemos siempre.', now);
  insertReview.run('rev-2', 'mer-los-amigos', null, 'Carla Conte', 5, 'Excelente la atención de los mozos y la velocidad del pedido por QR desde la mesa. Un 10.', now);
  insertReview.run('rev-3', 'mer-los-amigos', null, 'Nicolás Vázquez', 4, 'La carne en su punto justo y porciones gigantes para compartir.', now);
}
