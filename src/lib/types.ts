export type UserRole = 'owner' | 'manager' | 'waiter' | 'kitchen';

export interface User {
  id: string;
  email: string;
  name: string;
  avatar_url?: string | null;
  auth_provider: 'password' | 'google';
  created_at: string;
}

export interface Merchant {
  id: string;
  slug: string;
  name: string;
  category: string;
  description: string;
  logo_url: string;
  cover_url: string;
  phone: string;
  whatsapp: string;
  address_line: string;
  lat?: number | null;
  lng?: number | null;
  delivery_fee_cents: number;
  delivery_min_minutes: number;
  status: 'active' | 'paused' | 'closed';
  plan: string;
  mp_account_id?: string | null;
  mp_connected?: boolean;
  rating_avg: number;
  rating_count: number;
  created_at: string;
}

export interface MerchantUser {
  merchant_id: string;
  user_id: string;
  role: UserRole;
  user_name?: string;
  user_email?: string;
}

export interface MerchantHours {
  id: string;
  merchant_id: string;
  weekday: number; // 0=Domingo, 1=Lunes, ..., 6=Sábado
  open_time: string; // "11:30"
  close_time: string; // "23:30"
  is_closed?: boolean;
}

export interface Category {
  id: string;
  merchant_id: string;
  name: string;
  sort_order: number;
  icon?: string;
}

export interface Product {
  id: string;
  merchant_id: string;
  category_id: string;
  name: string;
  description: string;
  price_cents: number;
  currency: 'ARS';
  image_url: string;
  video_url?: string | null;
  available: boolean;
  sort_order: number;
  views_count: number;
  video_views_count: number;
  created_at: string;
}

export interface Table {
  id: string;
  merchant_id: string;
  number: number;
  label: string;
  qr_token: string;
  zone: string; // "Salón", "Patio", "Terraza", "Vereda"
}

export type OrderChannel = 'salon' | 'delivery' | 'takeaway';
export type OrderStatus = 'pending' | 'confirmed' | 'in_kitchen' | 'ready' | 'delivered' | 'closed' | 'cancelled';
export type PaymentMethod = 'cash' | 'debit' | 'credit' | 'mercadopago';

export interface OrderItem {
  id: string;
  order_id: string;
  product_id: string;
  name_snapshot: string;
  unit_price_cents: number;
  quantity: number;
  notes?: string | null;
}

export interface Order {
  id: string;
  merchant_id: string;
  channel: OrderChannel;
  table_id?: string | null;
  table_number?: number | null;
  table_label?: string | null;
  customer_id?: string | null;
  customer_name?: string | null;
  customer_phone?: string | null;
  delivery_address?: string | null;
  status: OrderStatus;
  subtotal_cents: number;
  delivery_fee_cents: number;
  total_cents: number;
  payment_method?: PaymentMethod | null;
  payment_status?: 'pending' | 'approved' | 'rejected';
  notes?: string | null;
  created_at: string;
  closed_at?: string | null;
  items?: OrderItem[];
}

export type CallType = 'waiter' | 'bill';
export type CallStatus = 'open' | 'resolved';

export interface Call {
  id: string;
  merchant_id: string;
  table_id: string;
  table_number?: number;
  table_label?: string;
  type: CallType;
  status: CallStatus;
  created_at: string;
  resolved_at?: string | null;
}

export interface Shift {
  id: string;
  merchant_id: string;
  opened_by: string;
  opened_by_name?: string;
  closed_by?: string | null;
  closed_by_name?: string | null;
  opened_at: string;
  closed_at?: string | null;
  initial_cash_cents: number;
  total_cents: number;
  cash_cents: number;
  debit_cents: number;
  credit_cents: number;
  mp_cents: number;
  expected_cents: number;
  difference_cents: number;
  status: 'open' | 'closed';
  notes?: string | null;
}

export type ReservationStatus = 'pending' | 'confirmed' | 'rejected' | 'no_show';

export interface Reservation {
  id: string;
  merchant_id: string;
  customer_name: string;
  customer_phone: string;
  customer_email?: string | null;
  date: string; // "YYYY-MM-DD"
  time: string; // "HH:MM"
  party_size: number;
  status: ReservationStatus;
  table_id?: string | null;
  notes?: string | null;
  notified_at?: string | null;
  created_at: string;
}

export interface Review {
  id: string;
  merchant_id: string;
  customer_id?: string | null;
  customer_name: string;
  order_id?: string | null;
  rating: number; // 1-5
  comment: string;
  created_at: string;
}
