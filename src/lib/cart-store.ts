'use client';

import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { OrderChannel, PaymentMethod, OrderStatus } from './types';

export interface CartItem {
  productId: string;
  name: string;
  unitPriceCents: number;
  quantity: number;
  notes?: string;
  imageUrl?: string;
}

export interface CustomerInfo {
  name: string;
  phone: string;
  deliveryAddress: string;
  notes?: string;
}

export interface ActiveOrderSummary {
  id: string;
  orderNumber?: string;
  status: OrderStatus;
  totalCents: number;
  itemCount: number;
  createdAt: string;
  itemsSummary?: string;
}

interface CartState {
  merchantSlug: string | null;
  items: CartItem[];
  channel: OrderChannel;
  tableId: string | null;
  tableNumber: number | null;
  tableLabel: string | null;
  tableToken: string | null;
  deliveryFeeCents: number;
  customerInfo: CustomerInfo;
  paymentMethod: PaymentMethod;
  activeOrders: ActiveOrderSummary[];
  lastOrderId: string | null;
  
  // Acciones
  setMerchant: (slug: string, deliveryFeeCents: number) => void;
  setTable: (id: string | null, number: number | null, label: string | null, token?: string | null) => void;
  clearTable: () => void;
  setChannel: (channel: OrderChannel) => void;
  addItem: (item: Omit<CartItem, 'quantity'>, quantity?: number, notes?: string) => void;
  updateQuantity: (productId: string, quantity: number) => void;
  updateNotes: (productId: string, notes: string) => void;
  removeItem: (productId: string) => void;
  clearCart: () => void;
  setCustomerInfo: (info: Partial<CustomerInfo>) => void;
  setPaymentMethod: (method: PaymentMethod) => void;
  addActiveOrder: (order: ActiveOrderSummary) => void;
  updateActiveOrderStatus: (orderId: string, status: OrderStatus) => void;
  clearActiveOrders: () => void;

  // Calculados
  getSubtotalCents: () => number;
  getTotalCents: () => number;
  getItemCount: () => number;
}

export const useCartStore = create<CartState>()(
  persist(
    (set, get) => ({
      merchantSlug: null,
      items: [],
      channel: 'salon',
      tableId: null,
      tableNumber: null,
      tableLabel: null,
      tableToken: null,
      deliveryFeeCents: 0,
      customerInfo: {
        name: '',
        phone: '',
        deliveryAddress: '',
        notes: '',
      },
      paymentMethod: 'mercadopago',
      activeOrders: [],
      lastOrderId: null,

      setMerchant: (slug, deliveryFeeCents) => {
        const current = get().merchantSlug;
        if (current && current !== slug) {
          // Cambió de local: vaciar carrito y reiniciar mesa y pedidos
          set({
            merchantSlug: slug,
            deliveryFeeCents,
            items: [],
            tableId: null,
            tableNumber: null,
            tableLabel: null,
            tableToken: null,
            activeOrders: [],
            lastOrderId: null,
          });
        } else {
          set({ merchantSlug: slug, deliveryFeeCents });
        }
      },

      setTable: (id, number, label, token = null) => {
        set({
          tableId: id,
          tableNumber: number,
          tableLabel: label,
          tableToken: token || get().tableToken,
          channel: id ? 'salon' : get().channel,
        });
      },

      clearTable: () => {
        set({
          tableId: null,
          tableNumber: null,
          tableLabel: null,
          tableToken: null,
        });
      },

      setChannel: (channel) => {
        set({ channel });
      },

      addItem: (item, quantity = 1, notes = '') => {
        const { items } = get();
        const existingIndex = items.findIndex((i) => i.productId === item.productId && (i.notes || '') === (notes || ''));

        if (existingIndex > -1) {
          const updated = [...items];
          updated[existingIndex].quantity += quantity;
          set({ items: updated });
        } else {
          set({
            items: [...items, { ...item, quantity, notes }],
          });
        }
      },

      updateQuantity: (productId, quantity) => {
        const { items } = get();
        if (quantity <= 0) {
          set({ items: items.filter((i) => i.productId !== productId) });
        } else {
          set({
            items: items.map((i) => (i.productId === productId ? { ...i, quantity } : i)),
          });
        }
      },

      updateNotes: (productId, notes) => {
        const { items } = get();
        set({
          items: items.map((i) => (i.productId === productId ? { ...i, notes } : i)),
        });
      },

      removeItem: (productId) => {
        const { items } = get();
        set({ items: items.filter((i) => i.productId !== productId) });
      },

      clearCart: () => {
        set({ items: [] });
      },

      setCustomerInfo: (info) => {
        set((state) => ({
          customerInfo: { ...state.customerInfo, ...info },
        }));
      },

      setPaymentMethod: (method) => {
        set({ paymentMethod: method });
      },

      addActiveOrder: (order) => {
        const existing = get().activeOrders.filter((o) => o.id !== order.id);
        set({
          activeOrders: [order, ...existing],
          lastOrderId: order.id,
        });
      },

      updateActiveOrderStatus: (orderId, status) => {
        set({
          activeOrders: get().activeOrders.map((o) =>
            o.id === orderId ? { ...o, status } : o
          ),
        });
      },

      clearActiveOrders: () => {
        set({ activeOrders: [], lastOrderId: null });
      },

      getSubtotalCents: () => {
        return get().items.reduce((acc, item) => acc + item.unitPriceCents * item.quantity, 0);
      },

      getTotalCents: () => {
        const subtotal = get().getSubtotalCents();
        const fee = get().channel === 'delivery' ? get().deliveryFeeCents : 0;
        return subtotal + fee;
      },

      getItemCount: () => {
        return get().items.reduce((acc, item) => acc + item.quantity, 0);
      },
    }),
    {
      name: 'menuqr_cart_storage',
    }
  )
);
