-- NEXUS PC schema for Neon Postgres
CREATE TABLE IF NOT EXISTS settings (
  id INT PRIMARY KEY DEFAULT 1 CHECK (id = 1),
  data JSONB NOT NULL DEFAULT '{}'::jsonb,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

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
);

CREATE INDEX IF NOT EXISTS orders_created_at_idx ON orders (created_at DESC);
