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
  -- { clover: { connected, merchantId, connectedAt },
  --   stripe: { connected, accountId, payoutsEnabled, connectedAt } }
  connections      JSONB NOT NULL DEFAULT '{
    "clover": { "connected": false, "merchantId": null, "connectedAt": null },
    "stripe": { "connected": false, "accountId": null, "payoutsEnabled": false, "connectedAt": null }
  }'::jsonb,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS vehicles (
  id           TEXT PRIMARY KEY,
  vehicle      TEXT NOT NULL,
  rego         TEXT NOT NULL,
  terminal_id  TEXT DEFAULT '',
  driver_id    TEXT REFERENCES drivers(id) ON DELETE SET NULL,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now()
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
