import { neon, type NeonQueryFunction } from '@neondatabase/serverless';

let sql: NeonQueryFunction<false, false> | null = null;
let ready: Promise<void> | null = null;

export function getSql() {
  const url = process.env.DATABASE_URL;
  if (!url) throw new Error('DATABASE_URL is not set');
  if (!sql) sql = neon(url);
  return sql;
}

export async function ensureSchema() {
  if (!ready) {
    ready = (async () => {
      const db = getSql();
      await db`
        CREATE TABLE IF NOT EXISTS settings (
          id INT PRIMARY KEY DEFAULT 1 CHECK (id = 1),
          data JSONB NOT NULL DEFAULT '{}'::jsonb,
          updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
        )
      `;
      await db`
        CREATE TABLE IF NOT EXISTS orders (
          id TEXT PRIMARY KEY,
          code TEXT UNIQUE NOT NULL,
          created_at BIGINT NOT NULL,
          status TEXT NOT NULL,
          name TEXT NOT NULL,
          phone TEXT NOT NULL,
          telegram TEXT NOT NULL,
          city TEXT NOT NULL,
          address TEXT NOT NULL,
          comment TEXT NOT NULL DEFAULT '',
          items JSONB NOT NULL DEFAULT '[]'::jsonb,
          total BIGINT NOT NULL,
          delivery BIGINT NOT NULL DEFAULT 0,
          receipt_data_url TEXT,
          receipt_file_name TEXT,
          receipt_uploaded_at BIGINT,
          receipt_note TEXT
        )
      `;
      await db`CREATE INDEX IF NOT EXISTS orders_created_at_idx ON orders (created_at DESC)`;
      await db`
        INSERT INTO settings (id, data)
        VALUES (1, ${JSON.stringify(defaultSettings())}::jsonb)
        ON CONFLICT (id) DO NOTHING
      `;
    })();
  }
  await ready;
}

export function defaultSettings() {
  return {
    telegramUser: process.env.TELEGRAM_USER || 'nnexuspcbot',
    botToken: process.env.TELEGRAM_BOT_TOKEN || '',
    chatId: process.env.TELEGRAM_CHAT_ID || '',
    card: process.env.CARD_NUMBER || '8600 0317 2941 5820',
    cardHolder: process.env.CARD_HOLDER || 'NEXUS PC / Amirbek Yunusov',
    cardBank: process.env.CARD_BANK || 'Uzcard / Humo',
    click: process.env.CLICK || '99890 123 45 67',
    payme: process.env.PAYME || 'NEXUS PC · 99890 123 45 67',
    promoRu: "Весенний дроп: бесплатная сборка при заказе от 15 000 000 so'm",
    promoUz: "Bahorgi drop: 15 000 000 so‘mdan buyurtmada bepul yig‘ish",
    passwordHash: '',
  };
}

export type DbOrder = {
  id: string;
  code: string;
  created_at: string | number;
  status: string;
  name: string;
  phone: string;
  telegram: string;
  city: string;
  address: string;
  comment: string;
  items: unknown;
  total: string | number;
  delivery: string | number;
  receipt_data_url: string | null;
  receipt_file_name: string | null;
  receipt_uploaded_at: string | number | null;
  receipt_note: string | null;
};

export function mapOrder(row: DbOrder) {
  return {
    id: row.id,
    code: row.code,
    createdAt: Number(row.created_at),
    status: row.status,
    name: row.name,
    phone: row.phone,
    telegram: row.telegram,
    city: row.city,
    address: row.address,
    comment: row.comment || '',
    items: Array.isArray(row.items) ? row.items : typeof row.items === 'string' ? JSON.parse(row.items) : [],
    total: Number(row.total),
    delivery: Number(row.delivery),
    receiptDataUrl: row.receipt_data_url || undefined,
    receiptFileName: row.receipt_file_name || undefined,
    receiptUploadedAt: row.receipt_uploaded_at != null ? Number(row.receipt_uploaded_at) : undefined,
    receiptNote: row.receipt_note || undefined,
  };
}
