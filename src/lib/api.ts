import type { Order, OrderStatus, StoreSettings } from '../types';

export type ApiResult<T> = { ok: true; data: T } | { ok: false; error: string; status: number };

async function request<T>(path: string, init?: RequestInit): Promise<ApiResult<T>> {
  try {
    const res = await fetch(path, {
      ...init,
      headers: {
        Accept: 'application/json',
        ...(init?.body ? { 'Content-Type': 'application/json' } : {}),
        ...(init?.headers || {}),
      },
    });
    const raw = await res.text();
    let data: unknown = {};
    try {
      data = raw ? JSON.parse(raw) : {};
    } catch {
      return { ok: false, error: `Non-JSON (${res.status})`, status: res.status };
    }
    if (!res.ok) {
      const err = (data as { error?: string; description?: string }).error
        || (data as { description?: string }).description
        || `HTTP ${res.status}`;
      return { ok: false, error: err, status: res.status };
    }
    return { ok: true, data: data as T };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : String(err), status: 0 };
  }
}

export async function apiHealth() {
  return request<{ ok: boolean; db?: boolean; neon?: boolean; telegram?: boolean }>('/api/health');
}

export async function apiGetSettings() {
  return request<{ ok: boolean; settings: StoreSettings & { hasBotToken?: boolean; hasPassword?: boolean } }>(
    '/api/settings',
  );
}

export async function apiSaveSettings(patch: Partial<StoreSettings>) {
  return request<{ ok: boolean; settings: StoreSettings }>('/api/settings', {
    method: 'PUT',
    body: JSON.stringify(patch),
  });
}

export async function apiListOrders() {
  return request<{ ok: boolean; orders: Order[] }>('/api/orders');
}

export async function apiGetOrder(code: string) {
  return request<{ ok: boolean; order: Order }>(`/api/orders/${encodeURIComponent(code)}`);
}

export async function apiCreateOrder(payload: {
  name: string;
  phone: string;
  telegram: string;
  city: string;
  address: string;
  comment: string;
  total: number;
  delivery: number;
  items: Array<{ productId: string; qty: number; title?: string; price?: number }>;
  id?: string;
  code?: string;
  status?: OrderStatus;
}) {
  return request<{
    ok: boolean;
    order: Order;
    telegram?: { status: string; detail?: string };
  }>('/api/orders', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

export async function apiPatchOrder(
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
) {
  return request<{
    ok: boolean;
    order: Order;
    telegram?: { status: string; detail?: string };
  }>(`/api/orders/${encodeURIComponent(code)}`, {
    method: 'PATCH',
    body: JSON.stringify(patch),
  });
}

export async function apiStripeConfig() {
  return request<{
    ok: boolean;
    configured: boolean;
    publishableKey?: string;
    currency?: string;
    uzsPerUsd?: number;
    sample?: { uzs: number; usd: number; cents: number };
  }>('/api/stripe/config');
}

export async function apiStripeCheckout(code: string) {
  return request<{
    ok: boolean;
    url?: string;
    sessionId?: string;
    amountUsd?: number;
    amountUzs?: number;
    rate?: number;
    error?: string;
  }>('/api/stripe/checkout', {
    method: 'POST',
    body: JSON.stringify({ code }),
  });
}

export async function apiStripeConfirm(sessionId: string) {
  return request<{
    ok: boolean;
    paid?: boolean;
    order?: Order;
    paymentStatus?: string;
    error?: string;
  }>(`/api/stripe/confirm?session_id=${encodeURIComponent(sessionId)}`);
}

export async function apiPaymeConfig() {
  return request<{
    ok: boolean;
    configured: boolean;
    host?: string;
    test?: boolean;
  }>('/api/payme/config');
}

export async function apiPaymeCheckout(code: string, lang?: 'ru' | 'uz' | 'en') {
  return request<{
    ok: boolean;
    url?: string;
    amountUzs?: number;
    amountTiyin?: number;
    host?: string;
    error?: string;
  }>('/api/payme/checkout', {
    method: 'POST',
    body: JSON.stringify({ code, lang }),
  });
}
