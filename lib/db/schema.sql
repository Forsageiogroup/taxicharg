-- TaxiCharg database schema
-- -------------------------------------------------------------------
-- Only the data that actually changes over time lives here: driver
-- accounts, vehicle/terminal assignments, and withdrawal records.
--
-- Trip/payment history (lib/data/payments.js) stays as deterministic
-- generated demo data for now — it isn't written to by the app, so
-- there's nothing to persist yet. Once real Clover/Stripe transaction
-- sync is built, that's the natural next table to add here.
-- -------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS drivers (
  id               TEXT PRIMARY KEY,
  driver_id        TEXT NOT NULL,
  name             TEXT NOT NULL,
  email            TEXT NOT NULL UNIQUE,
  password         TEXT NOT NULL, -- NOTE: plaintext for demo only — hash with bcrypt/argon2 in production
  phone            TEXT DEFAULT '',
  plate            TEXT DEFAULT '',
  abn              TEXT DEFAULT '',
  terminal_number  TEXT DEFAULT '',
  payment_method   TEXT DEFAULT 'Cash',
  fleet            TEXT DEFAULT '',
  status           TEXT NOT NULL DEFAULT 'active',
  balance          NUMERIC(10, 2) NOT NULL DEFAULT 0,
  joined_at        DATE NOT NULL DEFAULT CURRENT_DATE,
  -- Set to a fresh random value on every successful login. A session's
  -- JWT carries the value it was issued with, so if a later login
  -- changes this, that earlier session stops matching and is signed out
  -- next time it loads a page — enforces "one device at a time" without
  -- needing a separate sessions table.
  session_id       TEXT,
  -- { clover: { connected, merchantId, connectedAt },
  --   stripe: { connected, accountId, payoutsEnabled, connectedAt } }
  connections      JSONB NOT NULL DEFAULT '{
    "clover": { "connected": false, "merchantId": null, "connectedAt": null },
    "stripe": { "connected": false, "accountId": null, "payoutsEnabled": false, "connectedAt": null }
  }'::jsonb,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS vehicles (
  id            TEXT PRIMARY KEY,
  vehicle       TEXT NOT NULL,
  rego          TEXT NOT NULL,
  terminal_id   TEXT DEFAULT '',
  driver_id     TEXT REFERENCES drivers(id) ON DELETE SET NULL,
  -- Which company's physical terminal is in this cab, and that company's
  -- own merchant/account reference for it — admin-entered, for cross-
  -- checking against that provider's own dashboard. Not a live API
  -- connection (see lib/data/vehicles.js PROVIDERS) — Clover and Stripe
  -- each also have their own real per-driver OAuth connection separately.
  provider      TEXT NOT NULL DEFAULT 'Clover',
  merchant_ref  TEXT DEFAULT '',
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS withdrawals (
  id          TEXT PRIMARY KEY,
  driver_id   TEXT NOT NULL REFERENCES drivers(id) ON DELETE CASCADE,
  date        TIMESTAMPTZ NOT NULL DEFAULT now(),
  amount      NUMERIC(10, 2) NOT NULL,
  status      TEXT NOT NULL DEFAULT 'processing',
  method      TEXT NOT NULL DEFAULT 'Bank transfer'
);

CREATE INDEX IF NOT EXISTS idx_vehicles_driver_id ON vehicles(driver_id);
CREATE INDEX IF NOT EXISTS idx_withdrawals_driver_id ON withdrawals(driver_id);

-- Added after the initial migration — safe to re-run against a database
-- that was created before this column existed.
ALTER TABLE drivers ADD COLUMN IF NOT EXISTS session_id TEXT;

-- Added after the initial migration — safe to re-run against a database
-- that was created before these columns existed.
ALTER TABLE vehicles ADD COLUMN IF NOT EXISTS provider TEXT NOT NULL DEFAULT 'Clover';
ALTER TABLE vehicles ADD COLUMN IF NOT EXISTS merchant_ref TEXT DEFAULT '';
