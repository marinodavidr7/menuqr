import { DatabaseSync } from 'node:sqlite';
import path from 'node:path';
import fs from 'node:fs';

const dataDir = path.join(process.cwd(), 'data');
if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true });
}

const dbPath = path.join(dataDir, 'menuqr.db');

// Singleton para reutilizar la conexión SQLite
let dbInstance: DatabaseSync | null = null;

export function getDb(): DatabaseSync {
  if (!dbInstance) {
    dbInstance = new DatabaseSync(dbPath);
    // Habilitar timeout, modo WAL y foreign keys para concurrencia óptima
    dbInstance.exec('PRAGMA busy_timeout = 10000;');
    dbInstance.exec('PRAGMA journal_mode = WAL;');
    dbInstance.exec('PRAGMA foreign_keys = ON;');
    initSchema(dbInstance);
  }
  return dbInstance;
}

function initSchema(db: DatabaseSync) {
  // Evitar ejecutar DDL masivo si las tablas ya existen en el archivo SQLite
  const check = db.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name='merchants'").get();
  if (check) return;

  db.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY,
      email TEXT UNIQUE NOT NULL,
      password_hash TEXT,
      name TEXT NOT NULL,
      avatar_url TEXT,
      auth_provider TEXT DEFAULT 'password',
      created_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS merchants (
      id TEXT PRIMARY KEY,
      slug TEXT UNIQUE NOT NULL,
      name TEXT NOT NULL,
      category TEXT NOT NULL,
      description TEXT,
      logo_url TEXT,
      cover_url TEXT,
      phone TEXT,
      whatsapp TEXT,
      address_line TEXT,
      lat REAL,
      lng REAL,
      delivery_fee_cents INTEGER DEFAULT 0,
      delivery_min_minutes INTEGER DEFAULT 30,
      status TEXT DEFAULT 'active',
      plan TEXT DEFAULT 'standard',
      mp_account_id TEXT,
      rating_avg REAL DEFAULT 0,
      rating_count INTEGER DEFAULT 0,
      created_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS merchant_users (
      merchant_id TEXT NOT NULL,
      user_id TEXT NOT NULL,
      role TEXT NOT NULL,
      PRIMARY KEY (merchant_id, user_id),
      FOREIGN KEY (merchant_id) REFERENCES merchants(id) ON DELETE CASCADE,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS merchant_hours (
      id TEXT PRIMARY KEY,
      merchant_id TEXT NOT NULL,
      weekday INTEGER NOT NULL,
      open_time TEXT NOT NULL,
      close_time TEXT NOT NULL,
      is_closed INTEGER DEFAULT 0,
      FOREIGN KEY (merchant_id) REFERENCES merchants(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS categories (
      id TEXT PRIMARY KEY,
      merchant_id TEXT NOT NULL,
      name TEXT NOT NULL,
      sort_order INTEGER DEFAULT 0,
      icon TEXT,
      FOREIGN KEY (merchant_id) REFERENCES merchants(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS products (
      id TEXT PRIMARY KEY,
      merchant_id TEXT NOT NULL,
      category_id TEXT NOT NULL,
      name TEXT NOT NULL,
      description TEXT,
      price_cents INTEGER NOT NULL,
      currency TEXT DEFAULT 'ARS',
      image_url TEXT,
      video_url TEXT,
      available INTEGER DEFAULT 1,
      sort_order INTEGER DEFAULT 0,
      views_count INTEGER DEFAULT 0,
      video_views_count INTEGER DEFAULT 0,
      created_at TEXT NOT NULL,
      FOREIGN KEY (merchant_id) REFERENCES merchants(id) ON DELETE CASCADE,
      FOREIGN KEY (category_id) REFERENCES categories(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS tables (
      id TEXT PRIMARY KEY,
      merchant_id TEXT NOT NULL,
      number INTEGER NOT NULL,
      label TEXT NOT NULL,
      qr_token TEXT UNIQUE NOT NULL,
      zone TEXT DEFAULT 'Salón',
      FOREIGN KEY (merchant_id) REFERENCES merchants(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS orders (
      id TEXT PRIMARY KEY,
      merchant_id TEXT NOT NULL,
      channel TEXT NOT NULL,
      table_id TEXT,
      customer_id TEXT,
      customer_name TEXT,
      customer_phone TEXT,
      delivery_address TEXT,
      status TEXT NOT NULL,
      subtotal_cents INTEGER NOT NULL,
      delivery_fee_cents INTEGER DEFAULT 0,
      total_cents INTEGER NOT NULL,
      payment_method TEXT,
      payment_status TEXT DEFAULT 'pending',
      notes TEXT,
      created_at TEXT NOT NULL,
      closed_at TEXT,
      FOREIGN KEY (merchant_id) REFERENCES merchants(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS order_items (
      id TEXT PRIMARY KEY,
      order_id TEXT NOT NULL,
      product_id TEXT NOT NULL,
      name_snapshot TEXT NOT NULL,
      unit_price_cents INTEGER NOT NULL,
      quantity INTEGER NOT NULL,
      notes TEXT,
      FOREIGN KEY (order_id) REFERENCES orders(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS calls (
      id TEXT PRIMARY KEY,
      merchant_id TEXT NOT NULL,
      table_id TEXT NOT NULL,
      type TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'open',
      created_at TEXT NOT NULL,
      resolved_at TEXT,
      FOREIGN KEY (merchant_id) REFERENCES merchants(id) ON DELETE CASCADE,
      FOREIGN KEY (table_id) REFERENCES tables(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS shifts (
      id TEXT PRIMARY KEY,
      merchant_id TEXT NOT NULL,
      opened_by TEXT NOT NULL,
      closed_by TEXT,
      opened_at TEXT NOT NULL,
      closed_at TEXT,
      initial_cash_cents INTEGER DEFAULT 0,
      total_cents INTEGER DEFAULT 0,
      cash_cents INTEGER DEFAULT 0,
      debit_cents INTEGER DEFAULT 0,
      credit_cents INTEGER DEFAULT 0,
      mp_cents INTEGER DEFAULT 0,
      expected_cents INTEGER DEFAULT 0,
      difference_cents INTEGER DEFAULT 0,
      status TEXT DEFAULT 'open',
      notes TEXT,
      FOREIGN KEY (merchant_id) REFERENCES merchants(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS reservations (
      id TEXT PRIMARY KEY,
      merchant_id TEXT NOT NULL,
      customer_name TEXT NOT NULL,
      customer_phone TEXT NOT NULL,
      customer_email TEXT,
      date TEXT NOT NULL,
      time TEXT NOT NULL,
      party_size INTEGER NOT NULL,
      status TEXT DEFAULT 'pending',
      table_id TEXT,
      notes TEXT,
      notified_at TEXT,
      created_at TEXT NOT NULL,
      FOREIGN KEY (merchant_id) REFERENCES merchants(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS menu_views (
      id TEXT PRIMARY KEY,
      merchant_id TEXT NOT NULL,
      product_id TEXT NOT NULL,
      session_id TEXT,
      type TEXT NOT NULL,
      created_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS reviews (
      id TEXT PRIMARY KEY,
      merchant_id TEXT NOT NULL,
      customer_id TEXT,
      customer_name TEXT NOT NULL,
      order_id TEXT,
      rating INTEGER NOT NULL,
      comment TEXT,
      created_at TEXT NOT NULL,
      FOREIGN KEY (merchant_id) REFERENCES merchants(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS payments (
      id TEXT PRIMARY KEY,
      order_id TEXT NOT NULL,
      provider TEXT DEFAULT 'mercadopago',
      provider_payment_id TEXT UNIQUE,
      amount_cents INTEGER NOT NULL,
      status TEXT DEFAULT 'pending',
      paid_at TEXT,
      FOREIGN KEY (order_id) REFERENCES orders(id) ON DELETE CASCADE
    );

    -- Índices para máximo rendimiento
    CREATE INDEX IF NOT EXISTS idx_products_merchant_cat ON products(merchant_id, category_id, sort_order);
    CREATE INDEX IF NOT EXISTS idx_orders_merchant_status ON orders(merchant_id, status, created_at DESC);
    CREATE INDEX IF NOT EXISTS idx_calls_merchant_status ON calls(merchant_id, status);
    CREATE INDEX IF NOT EXISTS idx_reservations_merchant_date ON reservations(merchant_id, date, time);
    CREATE INDEX IF NOT EXISTS idx_tables_qr ON tables(qr_token);
    CREATE INDEX IF NOT EXISTS idx_menu_views ON menu_views(product_id, created_at);
  `);
}
