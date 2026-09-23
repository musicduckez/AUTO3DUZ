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
  telegramUser: 'nexus_pc_uz',
  botToken: '',
  chatId: '',
  card: '8600 **** **** 3141',
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
  placeOrder: (payload: Omit<Order, 'id' | 'code' | 'createdAt' | 'status' | 'items' | 'total'> & { total: number; items?: CartItem[] }) => Order;
  setOrderStatus: (id: string, status: OrderStatus) => void;
  tryLogin: (password: string) => Promise<'ok' | 'bad' | 'lock'>;
  changePassword: (password: string) => Promise<void>;
  logoutAdmin: () => void;
}

export const useShopStore = create<ShopState>((set, get) => ({
  products: mergeProducts(),
  games: mergeGames(),
  orders: loadJson<Order[]>(K.orders, []),
  settings: { ...defaultSettings, ...loadJson<Partial<StoreSettings>>(K.settings, {}) },
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
  },
  placeOrder: (payload) => {
    const items = payload.items ?? get().cart;
    const order: Order = {
      id: toastId() + Date.now().toString(36),
      code: orderCode(),
      createdAt: Date.now(),
      status: 'new',
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
    const orders = [order, ...get().orders];
    saveJson(K.orders, orders);
    set({ orders });
    return order;
  },
  setOrderStatus: (id, status) => {
    const orders = get().orders.map((o) => (o.id === id ? { ...o, status } : o));
    saveJson(K.orders, orders);
    set({ orders });
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
