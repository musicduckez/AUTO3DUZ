import { create } from 'zustand';
import { seedProducts } from '../data/products';
import { seedGames } from '../data/games';
import type {
  BuildSlots,
  CartItem,
  Category,
  Game,
  GraphicsPreset,
  Lang,
  Order,
  OrderStatus,
  Product,
  Resolution,
  StoreSettings,
  ToastItem,
  ViewMode,
} from '../types';
import {
  createOrderRemote,
  detectBackend,
  fetchOrderByCode,
  patchOrderRemote,
  saveSettingsRemote,
  syncOrdersFromApi,
  syncSettingsFromApi,
} from '../lib/backend';
import { sha256, DEFAULT_PASSWORD } from '../lib/hash';
import { loadJson, saveJson } from '../lib/storage';
import { partById } from '../lib/compatibility';

const K = {
  products: 'nexus_products',
  games: 'nexus_games',
  orders: 'nexus_orders',
  settings: 'nexus_settings',
  cart: 'nexus_cart',
  build: 'nexus_build',
  wish: 'nexus_wish',
  compare: 'nexus_compare',
  recent: 'nexus_recent',
  color: 'nexus_case_color',
};

const defaultSettings: StoreSettings = {
  telegramUser: 'nnexuspcbot',
  botToken: '8911484992:AAEXEtySUph28YSA0OhdxFXQrbPrRlZGb7Y',
  chatId: '1263687877',
  card: '8600 0317 2941 5820',
  cardHolder: 'NEXUS PC / Amirbek Yunusov',
  cardBank: 'Uzcard / Humo',
  click: '99890 123 45 67',
  payme: 'NEXUS PC · 99890 123 45 67',
  promoRu: 'Весенний дроп: бесплатная сборка при заказе от 15 000 000 so\'m',
  promoUz: 'Bahorgi drop: 15 000 000 so‘mdan buyurtmada bepul yig‘ish',
  passwordHash: '',
};

function mergeProducts(): Product[] {
  const saved = loadJson<Product[]>(K.products, []);
  if (!saved.length) return seedProducts;
  const map = new Map(saved.map((p) => [p.id, p]));
  for (const p of seedProducts) if (!map.has(p.id)) map.set(p.id, p);
  return [...map.values()];
}

function mergeGames(): Game[] {
  const saved = loadJson<Game[]>(K.games, []);
  if (!saved.length) return seedGames;
  const map = new Map(saved.map((g) => [g.id, g]));
  for (const g of seedGames) if (!map.has(g.id)) map.set(g.id, g);
  return [...map.values()];
}

function toastId() {
  return Math.random().toString(36).slice(2, 8);
}

function orderCode() {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let s = 'NX-';
  for (let i = 0; i < 4; i++) s += chars[Math.floor(Math.random() * chars.length)];
  return s;
}

interface ShopState {
  products: Product[];
  games: Game[];
  orders: Order[];
  settings: StoreSettings;
  cart: CartItem[];
  build: BuildSlots;
  wishlist: string[];
  compare: string[];
  recent: string[];
  caseColor: string;
  viewMode: ViewMode;
  fpsPreset: GraphicsPreset;
  fpsRes: Resolution;
  toasts: ToastItem[];
  searchOpen: boolean;
  adminAuthed: boolean;
  loginFails: number;
  lockUntil: number;
  setLang: (lang: Lang) => void;
  toast: (text: string, kind?: ToastItem['kind']) => void;
  dismissToast: (id: string) => void;
  setSearchOpen: (v: boolean) => void;
  setViewMode: (v: ViewMode) => void;
  setFps: (preset: GraphicsPreset, res: Resolution) => void;
  setCaseColor: (c: string) => void;
  addCart: (productId: string, qty?: number) => void;
  setQty: (productId: string, qty: number) => void;
  removeCart: (productId: string) => void;
  clearCart: () => void;
  toggleWish: (id: string) => void;
  toggleCompare: (id: string) => boolean | void;
  viewProduct: (id: string) => void;
  setSlot: (cat: Category, id?: string) => void;
  setBuild: (slots: BuildSlots) => void;
  clearBuild: () => void;
  addBuildToCart: () => void;
  saveProducts: (products: Product[]) => void;
  saveGames: (games: Game[]) => void;
  saveSettings: (s: Partial<StoreSettings>) => void;
  backendReady: boolean;
  backendMode: 'api' | 'local' | 'unknown';
  hydrateBackend: () => Promise<void>;
  refreshOrders: () => Promise<void>;
  loadOrderByCode: (code: string) => Promise<Order | null>;
  placeOrder: (
    payload: Omit<Order, 'id' | 'code' | 'createdAt' | 'status' | 'items' | 'total'> & {
      total: number;
      items?: CartItem[];
      itemMeta?: Array<{ productId: string; qty: number; title?: string; price?: number }>;
    },
  ) => Promise<{ order: Order; telegram?: { status: string; detail?: string }; usedApi: boolean }>;
  setOrderStatus: (
    id: string,
    status: OrderStatus,
    notifyText?: string,
  ) => Promise<{ telegram?: { status: string; detail?: string } }>;
  attachReceipt: (
    code: string,
    payload: { dataUrl: string; fileName: string; note?: string; sendTelegram?: boolean },
  ) => Promise<{ order: Order | null; telegram?: { status: string; detail?: string } }>;
  tryLogin: (password: string) => Promise<'ok' | 'bad' | 'lock'>;
  changePassword: (password: string) => Promise<void>;
  logoutAdmin: () => void;
}

export const useShopStore = create<ShopState>((set, get) => ({
  products: mergeProducts(),
  games: mergeGames(),
  orders: loadJson<Order[]>(K.orders, []),
  settings: (() => {
    const saved = loadJson<Partial<StoreSettings>>(K.settings, {});
    const settings: StoreSettings = {
      ...defaultSettings,
      ...saved,
      botToken: saved.botToken || defaultSettings.botToken,
      chatId: saved.chatId || defaultSettings.chatId,
      telegramUser: saved.telegramUser || defaultSettings.telegramUser,
      card: saved.card || defaultSettings.card,
      cardHolder: saved.cardHolder || defaultSettings.cardHolder,
      cardBank: saved.cardBank || defaultSettings.cardBank,
    };
    // Force-persist Telegram credentials so old empty localStorage cannot block delivery.
    saveJson(K.settings, settings);
    return settings;
  })(),
  cart: loadJson<CartItem[]>(K.cart, []),
  build: loadJson<BuildSlots>(K.build, {}),
  wishlist: loadJson<string[]>(K.wish, []),
  compare: loadJson<string[]>(K.compare, []),
  recent: loadJson<string[]>(K.recent, []),
  caseColor: loadJson<string>(K.color, '#7c3aed'),
  viewMode: '2d',
  fpsPreset: 'ultra',
  fpsRes: '1080p',
  toasts: [],
  searchOpen: false,
  adminAuthed: sessionStorage.getItem('nexus_admin') === '1',
  loginFails: 0,
  lockUntil: 0,
  backendReady: false,
  backendMode: 'unknown',

  hydrateBackend: async () => {
    const mode = await detectBackend();
    let settings = get().settings;
    let orders = get().orders;
    if (mode === 'api') {
      settings = await syncSettingsFromApi(settings);
      const remoteOrders = await syncOrdersFromApi();
      if (remoteOrders) orders = remoteOrders;
    }
    set({ backendReady: true, backendMode: mode, settings, orders });
  },
  refreshOrders: async () => {
    const remote = await syncOrdersFromApi();
    if (remote) set({ orders: remote });
  },
  loadOrderByCode: async (code) => {
    const order = await fetchOrderByCode(code, get().orders);
    if (order) {
      const orders = [order, ...get().orders.filter((o) => o.code.toUpperCase() !== order.code.toUpperCase())];
      set({ orders });
    }
    return order;
  },

  setLang: (lang) => {
    localStorage.setItem('nexus_lang', lang);
  },
  toast: (text, kind = 'ok') => {
    const id = toastId();
    set((s) => ({ toasts: [...s.toasts, { id, text, kind }] }));
    setTimeout(() => get().dismissToast(id), 3200);
  },
  dismissToast: (id) => set((s) => ({ toasts: s.toasts.filter((t) => t.id !== id) })),
  setSearchOpen: (v) => set({ searchOpen: v }),
  setViewMode: (v) => set({ viewMode: v }),
  setFps: (preset, res) => set({ fpsPreset: preset, fpsRes: res }),
  setCaseColor: (c) => {
    saveJson(K.color, c);
    set({ caseColor: c });
  },
  addCart: (productId, qty = 1) => {
    const products = get().products;
    const p = partById(products, productId);
    if (!p || p.stock <= 0) return;
    const cart = [...get().cart];
    const i = cart.findIndex((x) => x.productId === productId);
    if (i >= 0) cart[i] = { ...cart[i], qty: Math.min(p.stock, cart[i].qty + qty) };
    else cart.push({ productId, qty });
    saveJson(K.cart, cart);
    set({ cart });
  },
  setQty: (productId, qty) => {
    const p = partById(get().products, productId);
    const next = get()
      .cart.map((x) => (x.productId === productId ? { ...x, qty: Math.max(1, Math.min(p?.stock ?? 1, qty)) } : x))
      .filter((x) => x.qty > 0);
    saveJson(K.cart, next);
    set({ cart: next });
  },
  removeCart: (productId) => {
    const cart = get().cart.filter((x) => x.productId !== productId);
    saveJson(K.cart, cart);
    set({ cart });
  },
  clearCart: () => {
    saveJson(K.cart, []);
    set({ cart: [] });
  },
  toggleWish: (id) => {
    const wishlist = get().wishlist.includes(id) ? get().wishlist.filter((x) => x !== id) : [...get().wishlist, id];
    saveJson(K.wish, wishlist);
    set({ wishlist });
  },
  toggleCompare: (id) => {
    const cur = get().compare;
    if (cur.includes(id)) {
      const compare = cur.filter((x) => x !== id);
      saveJson(K.compare, compare);
      set({ compare });
      return true;
    }
    if (cur.length >= 3) return false;
    const compare = [...cur, id];
    saveJson(K.compare, compare);
    set({ compare });
    return true;
  },
  viewProduct: (id) => {
    const recent = [id, ...get().recent.filter((x) => x !== id)].slice(0, 8);
    saveJson(K.recent, recent);
    set({ recent });
  },
  setSlot: (cat, id) => {
    const build = { ...get().build };
    if (!id) delete build[cat];
    else build[cat] = id;
    saveJson(K.build, build);
    set({ build });
  },
  setBuild: (slots) => {
    saveJson(K.build, slots);
    set({ build: slots });
  },
  clearBuild: () => {
    saveJson(K.build, {});
    set({ build: {} });
  },
  addBuildToCart: () => {
    Object.values(get().build).forEach((id) => {
      if (id) get().addCart(id, 1);
    });
  },
  saveProducts: (products) => {
    saveJson(K.products, products);
    set({ products });
  },
  saveGames: (games) => {
    saveJson(K.games, games);
    set({ games });
  },
  saveSettings: (patch) => {
    const settings = { ...get().settings, ...patch };
    saveJson(K.settings, settings);
    set({ settings });
    void saveSettingsRemote(patch);
  },
  placeOrder: async (payload) => {
    const items = payload.items ?? get().cart;
    const order: Order = {
      id: toastId() + Date.now().toString(36),
      code: orderCode(),
      createdAt: Date.now(),
      status: 'awaiting_payment',
      name: payload.name,
      phone: payload.phone,
      telegram: payload.telegram,
      city: payload.city,
      address: payload.address,
      comment: payload.comment,
      items,
      total: payload.total,
      delivery: payload.delivery,
    };
    const remote = await createOrderRemote(order, payload.itemMeta ?? items);
    const saved = remote.order;
    const orders = [saved, ...get().orders.filter((o) => o.id !== saved.id && o.code !== saved.code)];
    saveJson(K.orders, orders);
    set({ orders });
    return remote;
  },
  setOrderStatus: async (id, status, notifyText) => {
    const current = get().orders.find((o) => o.id === id);
    const orders = get().orders.map((o) => (o.id === id ? { ...o, status } : o));
    saveJson(K.orders, orders);
    set({ orders });
    if (current) {
      const remote = await patchOrderRemote(current.code, {
        status,
        notify: Boolean(notifyText),
        notifyText,
      });
      if (remote.order) {
        set({
          orders: get().orders.map((o) => (o.id === remote.order!.id ? remote.order! : o)),
        });
      }
      return { telegram: remote.telegram };
    }
    return {};
  },
  attachReceipt: async (code, payload) => {
    let updated: Order | null = null;
    const orders = get().orders.map((o) => {
      if (o.code.toUpperCase() !== code.toUpperCase()) return o;
      const next: Order = {
        ...o,
        status:
          o.status === 'paid' || o.status === 'done' || o.status === 'shipped' || o.status === 'assembling'
            ? o.status
            : 'awaiting_payment',
        receiptDataUrl: payload.dataUrl,
        receiptFileName: payload.fileName,
        receiptUploadedAt: Date.now(),
        receiptNote: payload.note || o.receiptNote,
      };
      updated = next;
      return next;
    });
    saveJson(K.orders, orders);
    set({ orders });

    const statusForPatch = updated ? (updated as Order).status : undefined;
    const remote = await patchOrderRemote(code, {
      receiptDataUrl: payload.dataUrl,
      receiptFileName: payload.fileName,
      receiptNote: payload.note,
      sendReceiptToTelegram: payload.sendTelegram !== false,
      status: statusForPatch,
    });
    if (remote.order) {
      set({
        orders: get().orders.map((o) =>
          o.code.toUpperCase() === remote.order!.code.toUpperCase() ? remote.order! : o,
        ),
      });
      return { order: remote.order, telegram: remote.telegram };
    }
    return { order: updated };
  },
  tryLogin: async (password) => {
    if (Date.now() < get().lockUntil) return 'lock';
    const hash = await sha256(password);
    const stored = get().settings.passwordHash;
    const ok = stored ? hash === stored : password === DEFAULT_PASSWORD;
    if (ok) {
      if (!stored) get().saveSettings({ passwordHash: hash });
      sessionStorage.setItem('nexus_admin', '1');
      set({ adminAuthed: true, loginFails: 0 });
      return 'ok';
    }
    const fails = get().loginFails + 1;
    const lockUntil = fails >= 5 ? Date.now() + 30_000 : 0;
    set({ loginFails: lockUntil ? 0 : fails, lockUntil });
    return lockUntil ? 'lock' : 'bad';
  },
  changePassword: async (password) => {
    const passwordHash = await sha256(password);
    get().saveSettings({ passwordHash });
  },
  logoutAdmin: () => {
    sessionStorage.removeItem('nexus_admin');
    set({ adminAuthed: false });
  },
}));
