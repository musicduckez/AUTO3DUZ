#!/usr/bin/env node
import { readFileSync } from 'node:fs';
import { neon } from '@neondatabase/serverless';

function loadEnv() {
  try {
    const raw = readFileSync(new URL('../.env', import.meta.url), 'utf8');
    for (const line of raw.split('\n')) {
      if (!line || line.startsWith('#')) continue;
      const i = line.indexOf('=');
      if (i < 0) continue;
      const k = line.slice(0, i);
      const v = line.slice(i + 1);
      if (!process.env[k]) process.env[k] = v;
    }
  } catch {
    // ignore
  }
}

loadEnv();
const url = process.env.DATABASE_URL;
if (!url) {
  console.error('DATABASE_URL missing');
  process.exit(1);
}

const sql = neon(url);

await sql`CREATE TABLE IF NOT EXISTS settings (
  id INT PRIMARY KEY DEFAULT 1 CHECK (id = 1),
  data JSONB NOT NULL DEFAULT '{}'::jsonb,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
)`;
await sql`CREATE TABLE IF NOT EXISTS orders (
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
  receipt_note TEXT,
  payment_method TEXT,
  stripe_session_id TEXT,
  stripe_payment_intent TEXT,
  paid_at BIGINT
)`;
await sql`ALTER TABLE orders ADD COLUMN IF NOT EXISTS payment_method TEXT`;
await sql`ALTER TABLE orders ADD COLUMN IF NOT EXISTS stripe_session_id TEXT`;
await sql`ALTER TABLE orders ADD COLUMN IF NOT EXISTS stripe_payment_intent TEXT`;
await sql`ALTER TABLE orders ADD COLUMN IF NOT EXISTS paid_at BIGINT`;
await sql`CREATE INDEX IF NOT EXISTS orders_created_at_idx ON orders (created_at DESC)`;
await sql`CREATE INDEX IF NOT EXISTS orders_stripe_session_idx ON orders (stripe_session_id)`;

const defaults = {
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

await sql`
  INSERT INTO settings (id, data)
  VALUES (1, ${JSON.stringify(defaults)}::jsonb)
  ON CONFLICT (id) DO UPDATE SET
    data = settings.data || EXCLUDED.data,
    updated_at = NOW()
`;

console.log('schema + settings applied');
