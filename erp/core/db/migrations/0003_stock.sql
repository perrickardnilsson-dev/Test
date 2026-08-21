-- Fas 3: Lagerställen, lagerplatser, saldon, oföränderliga lagertransaktioner

DO $$ BEGIN
  CREATE TYPE location_type AS ENUM ('picking', 'bulk', 'quarantine', 'wip');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE stock_transaction_type AS ENUM (
    'receipt', 'issue', 'transfer', 'adjustment', 'count', 'scrap'
  );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE stock_reference_type AS ENUM (
    'purchase_order', 'manufacturing_order', 'customer_order', 'manual', 'count'
  );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

CREATE TABLE IF NOT EXISTS warehouse (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id text NOT NULL,
  code text NOT NULL,
  name text NOT NULL,
  allow_negative_stock boolean NOT NULL DEFAULT false,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  created_by text
);

CREATE UNIQUE INDEX IF NOT EXISTS warehouse_org_code_uidx
  ON warehouse (organization_id, code);

CREATE TABLE IF NOT EXISTS stock_location (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id text NOT NULL,
  warehouse_id uuid NOT NULL REFERENCES warehouse(id) ON DELETE RESTRICT,
  code text NOT NULL,
  name text,
  zone text,
  pick_sequence integer NOT NULL DEFAULT 0,
  type location_type NOT NULL DEFAULT 'picking',
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  created_by text
);

CREATE UNIQUE INDEX IF NOT EXISTS stock_location_org_wh_code_uidx
  ON stock_location (organization_id, warehouse_id, code);

CREATE INDEX IF NOT EXISTS stock_location_warehouse_idx
  ON stock_location (warehouse_id);

CREATE TABLE IF NOT EXISTS stock_balance (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id text NOT NULL,
  part_id uuid NOT NULL REFERENCES part(id) ON DELETE RESTRICT,
  location_id uuid NOT NULL REFERENCES stock_location(id) ON DELETE RESTRICT,
  batch_id uuid,
  quantity numeric(18,4) NOT NULL DEFAULT 0,
  reserved_quantity numeric(18,4) NOT NULL DEFAULT 0,
  average_cost numeric(18,4) NOT NULL DEFAULT 0,
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS stock_balance_org_part_loc_uidx
  ON stock_balance (organization_id, part_id, location_id);

CREATE INDEX IF NOT EXISTS stock_balance_part_idx ON stock_balance (part_id);
CREATE INDEX IF NOT EXISTS stock_balance_location_idx ON stock_balance (location_id);

CREATE TABLE IF NOT EXISTS stock_transaction (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id text NOT NULL,
  type stock_transaction_type NOT NULL,
  part_id uuid NOT NULL REFERENCES part(id) ON DELETE RESTRICT,
  quantity numeric(18,4) NOT NULL,
  from_location_id uuid REFERENCES stock_location(id) ON DELETE RESTRICT,
  to_location_id uuid REFERENCES stock_location(id) ON DELETE RESTRICT,
  batch_id uuid,
  serial_unit_id uuid,
  unit_cost numeric(18,4) NOT NULL DEFAULT 0,
  reference_type stock_reference_type NOT NULL DEFAULT 'manual',
  reference_id text,
  posted_at timestamptz NOT NULL DEFAULT now(),
  posted_by text,
  note text
);

CREATE INDEX IF NOT EXISTS stock_transaction_part_idx ON stock_transaction (part_id);
CREATE INDEX IF NOT EXISTS stock_transaction_posted_idx ON stock_transaction (posted_at);
CREATE INDEX IF NOT EXISTS stock_transaction_org_idx ON stock_transaction (organization_id);

ALTER TABLE warehouse ENABLE ROW LEVEL SECURITY;
ALTER TABLE warehouse FORCE ROW LEVEL SECURITY;
ALTER TABLE stock_location ENABLE ROW LEVEL SECURITY;
ALTER TABLE stock_location FORCE ROW LEVEL SECURITY;
ALTER TABLE stock_balance ENABLE ROW LEVEL SECURITY;
ALTER TABLE stock_balance FORCE ROW LEVEL SECURITY;
ALTER TABLE stock_transaction ENABLE ROW LEVEL SECURITY;
ALTER TABLE stock_transaction FORCE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS warehouse_isolation ON warehouse;
CREATE POLICY warehouse_isolation ON warehouse
  FOR ALL
  USING (organization_id = current_setting('app.current_org', true))
  WITH CHECK (organization_id = current_setting('app.current_org', true));

DROP POLICY IF EXISTS stock_location_isolation ON stock_location;
CREATE POLICY stock_location_isolation ON stock_location
  FOR ALL
  USING (organization_id = current_setting('app.current_org', true))
  WITH CHECK (organization_id = current_setting('app.current_org', true));

DROP POLICY IF EXISTS stock_balance_isolation ON stock_balance;
CREATE POLICY stock_balance_isolation ON stock_balance
  FOR ALL
  USING (organization_id = current_setting('app.current_org', true))
  WITH CHECK (organization_id = current_setting('app.current_org', true));

DROP POLICY IF EXISTS stock_transaction_isolation ON stock_transaction;
CREATE POLICY stock_transaction_isolation ON stock_transaction
  FOR ALL
  USING (organization_id = current_setting('app.current_org', true))
  WITH CHECK (organization_id = current_setting('app.current_org', true));
