export type Lang = 'ru' | 'uz';
export type Category = 'cpu' | 'gpu' | 'mb' | 'ram' | 'storage' | 'psu' | 'case' | 'cooler' | 'fan';
export type ViewMode = '2d' | '3d' | 'schematic';
export type GraphicsPreset = 'low' | 'medium' | 'high' | 'ultra';
export type Resolution = '720p' | '1080p' | '1440p' | '2k' | '4k';
export type OrderStatus =
  | 'new'
  | 'confirmed'
  | 'awaiting_payment'
  | 'paid'
  | 'assembling'
  | 'shipped'
  | 'done';

export type Localized = { ru: string; uz: string };

export interface Product {
  id: string;
  category: Category;
  brand: string;
  name: Localized;
  price: number;
  stock: number;
  rating: number;
  hue: number;
  featured?: boolean;
  socket?: string;
  ramType?: 'DDR4' | 'DDR5';
  tdp?: number;
  wattDraw?: number;
  wattage?: number;
  score?: number;
  vram?: number;
  ramGb?: number;
  ramSpeed?: number;
  gpuLength?: number;
  caseMaxGpu?: number;
  coolerHeight?: number;
  caseMaxCooler?: number;
  formFactor?: string;
  pcie?: string;
  chips?: string;
  specs: Record<string, string>;
}

export type BuildSlots = Partial<Record<Category, string>>;

export interface ReadyBuild {
  id: string;
  name: Localized;
  tag: Localized;
  budget: number;
  slots: BuildSlots;
}

export interface Game {
  id: string;
  name: Localized;
  year: number;
  gpuWeight: number;
  cpuWeight: number;
  baseFps: number;
  minRam: number;
  minVram: number;
  custom?: boolean;
}

export interface CartItem {
  productId: string;
  qty: number;
}

export interface Order {
  id: string;
  code: string;
  createdAt: number;
  status: OrderStatus;
  name: string;
  phone: string;
  telegram: string;
  city: string;
  address: string;
  comment: string;
  items: CartItem[];
  total: number;
  delivery: number;
  /** Payment receipt image as data URL */
  receiptDataUrl?: string;
  receiptFileName?: string;
  receiptUploadedAt?: number;
  receiptNote?: string;
  paymentMethod?: 'stripe' | 'card_transfer' | string;
  stripeSessionId?: string;
  stripePaymentIntent?: string;
  paidAt?: number;
}

export interface StoreSettings {
  telegramUser: string;
  botToken: string;
  chatId: string;
  card: string;
  cardHolder: string;
  cardBank: string;
  click: string;
  payme: string;
  promoRu: string;
  promoUz: string;
  passwordHash: string;
}

export interface ToastItem {
  id: string;
  text: string;
  kind?: 'ok' | 'err' | 'info';
}
