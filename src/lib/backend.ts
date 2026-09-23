import type { Order, OrderStatus, StoreSettings } from '../types';
import {
  apiCreateOrder,
  apiGetOrder,
  apiGetSettings,
  apiHealth,
  apiListOrders,
  apiPatchOrder,
  apiSaveSettings,
} from './api';
import { loadJson, saveJson } from './storage';

const ORDERS_KEY = 'nexus_orders';
const SETTINGS_KEY = 'nexus_settings';

export type BackendMode = 'api' | 'local' | 'unknown';

let backend: BackendMode = 'unknown';

export function getBackendMode() {
  return backend;
}

export async function detectBackend(): Promise<BackendMode> {
  const health = await apiHealth();
  backend = health.ok && health.data.ok && health.data.db ? 'api' : 'local';
  return backend;
}

export async function syncSettingsFromApi(fallback: StoreSettings): Promise<StoreSettings> {
  const res = await apiGetSettings();
  if (!res.ok) return fallback;
  const remote = res.data.settings;
  const merged: StoreSettings = {
    ...fallback,
    ...remote,
    // Keep local bot token fallback if API hides it
    botToken: remote.botToken || fallback.botToken,
    chatId: remote.chatId || fallback.chatId,
  };
  saveJson(SETTINGS_KEY, merged);
  return merged;
}

export async function syncOrdersFromApi(): Promise<Order[] | null> {
  const res = await apiListOrders();
  if (!res.ok) return null;
  saveJson(ORDERS_KEY, res.data.orders);
  return res.data.orders;
}

export async function fetchOrderByCode(code: string, localOrders: Order[]): Promise<Order | null> {
  const local = localOrders.find((o) => o.code.toUpperCase() === code.toUpperCase());
  if (backend === 'local') return local ?? null;
  const res = await apiGetOrder(code);
  if (res.ok) {
    const order = res.data.order;
    const next = [order, ...localOrders.filter((o) => o.code.toUpperCase() !== order.code.toUpperCase())];
    saveJson(ORDERS_KEY, next);
    return order;
  }
  return local ?? null;
}

export async function createOrderRemote(
  order: Order,
  itemMeta: Array<{ productId: string; qty: number; title?: string; price?: number }>,
): Promise<{ order: Order; telegram?: { status: string; detail?: string }; usedApi: boolean }> {
  if (backend === 'local') {
    return { order, usedApi: false };
  }
  const res = await apiCreateOrder({
    id: order.id,
    code: order.code,
    status: order.status,
    name: order.name,
    phone: order.phone,
    telegram: order.telegram,
    city: order.city,
    address: order.address,
    comment: order.comment,
    total: order.total,
    delivery: order.delivery,
    items: itemMeta,
  });
  if (!res.ok) {
    return { order, usedApi: false, telegram: { status: 'error', detail: res.error } };
  }
  const saved = res.data.order;
  const local = loadJson<Order[]>(ORDERS_KEY, []);
  saveJson(ORDERS_KEY, [saved, ...local.filter((o) => o.id !== saved.id)]);
  return { order: saved, telegram: res.data.telegram, usedApi: true };
}

export async function patchOrderRemote(
  code: string,
  patch: {
    status?: OrderStatus;
    receiptDataUrl?: string;
    receiptFileName?: string;
    receiptNote?: string;
    notify?: boolean;
    notifyText?: string;
    sendReceiptToTelegram?: boolean;
  },
): Promise<{ order: Order | null; telegram?: { status: string; detail?: string }; usedApi: boolean }> {
  if (backend === 'local') {
    return { order: null, usedApi: false };
  }
  const res = await apiPatchOrder(code, patch);
  if (!res.ok) return { order: null, usedApi: false, telegram: { status: 'error', detail: res.error } };
  const order = res.data.order;
  const local = loadJson<Order[]>(ORDERS_KEY, []);
  saveJson(
    ORDERS_KEY,
    local.map((o) => (o.code.toUpperCase() === order.code.toUpperCase() ? order : o)),
  );
  return { order, telegram: res.data.telegram, usedApi: true };
}

export async function saveSettingsRemote(patch: Partial<StoreSettings>) {
  if (backend === 'local') return { usedApi: false as const };
  const res = await apiSaveSettings(patch);
  return { usedApi: res.ok, error: res.ok ? undefined : res.error };
}
