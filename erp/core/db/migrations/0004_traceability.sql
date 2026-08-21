-- Fas 4: Batch, individ, genealogi — spårbarhet båda håll

DO $$ BEGIN
  CREATE TYPE batch_status AS ENUM ('available', 'quarantine', 'blocked');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE serial_unit_status AS ENUM (
    'available', 'quarantine', 'blocked', 'consumed', 'shipped'
  );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

CREATE TABLE IF NOT EXISTS batch (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id text NOT NULL,
  part_id uuid NOT NULL REFERENCES part(id) ON DELETE RESTRICT,
  batch_number text NOT NULL,
  supplier_batch_number text,
  production_date timestamptz,
  expiry_date timestamptz,
  certificate_ref text,
  status batch_status NOT NULL DEFAULT 'available',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  created_by text
);

CREATE UNIQUE INDEX IF NOT EXISTS batch_org_part_number_uidx
  ON batch (organization_id, part_id, batch_number);

CREATE INDEX IF NOT EXISTS batch_part_idx ON batch (part_id);

CREATE TABLE IF NOT EXISTS serial_unit (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id text NOT NULL,
  part_id uuid NOT NULL REFERENCES part(id) ON DELETE RESTRICT,
  serial_number text NOT NULL,
  batch_id uuid REFERENCES batch(id) ON DELETE SET NULL,
  status serial_unit_status NOT NULL DEFAULT 'available',
  current_location_id uuid REFERENCES stock_location(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  created_by text
);

CREATE UNIQUE INDEX IF NOT EXISTS serial_unit_org_part_number_uidx
  ON serial_unit (organization_id, part_id, serial_number);

CREATE INDEX IF NOT EXISTS serial_unit_part_idx ON serial_unit (part_id);
CREATE INDEX IF NOT EXISTS serial_unit_batch_idx ON serial_unit (batch_id);

CREATE TABLE IF NOT EXISTS genealogy_edge (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id text NOT NULL,
  consumed_batch_id uuid REFERENCES batch(id) ON DELETE RESTRICT,
  consumed_serial_id uuid REFERENCES serial_unit(id) ON DELETE RESTRICT,
  produced_batch_id uuid REFERENCES batch(id) ON DELETE RESTRICT,
  produced_serial_id uuid REFERENCES serial_unit(id) ON DELETE RESTRICT,
  quantity numeric(18,4) NOT NULL DEFAULT 0,
  manufacturing_order_ref text,
  occurred_at timestamptz NOT NULL DEFAULT now(),
  created_by text
);

CREATE INDEX IF NOT EXISTS genealogy_edge_consumed_batch_idx
  ON genealogy_edge (consumed_batch_id);
CREATE INDEX IF NOT EXISTS genealogy_edge_produced_batch_idx
  ON genealogy_edge (produced_batch_id);
CREATE INDEX IF NOT EXISTS genealogy_edge_org_idx
  ON genealogy_edge (organization_id);

-- Saldo unik per artikel+plats+batch (null-batch via coalesce)
DROP INDEX IF EXISTS stock_balance_org_part_loc_uidx;
CREATE UNIQUE INDEX IF NOT EXISTS stock_balance_org_part_loc_batch_uidx
  ON stock_balance (
    organization_id,
    part_id,
    location_id,
    COALESCE(batch_id, '00000000-0000-0000-0000-000000000000'::uuid)
  );

CREATE INDEX IF NOT EXISTS stock_balance_batch_idx ON stock_balance (batch_id);

ALTER TABLE batch ENABLE ROW LEVEL SECURITY;
ALTER TABLE batch FORCE ROW LEVEL SECURITY;
ALTER TABLE serial_unit ENABLE ROW LEVEL SECURITY;
ALTER TABLE serial_unit FORCE ROW LEVEL SECURITY;
ALTER TABLE genealogy_edge ENABLE ROW LEVEL SECURITY;
ALTER TABLE genealogy_edge FORCE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS batch_isolation ON batch;
CREATE POLICY batch_isolation ON batch
  FOR ALL
  USING (organization_id = current_setting('app.current_org', true))
  WITH CHECK (organization_id = current_setting('app.current_org', true));

DROP POLICY IF EXISTS serial_unit_isolation ON serial_unit;
CREATE POLICY serial_unit_isolation ON serial_unit
  FOR ALL
  USING (organization_id = current_setting('app.current_org', true))
  WITH CHECK (organization_id = current_setting('app.current_org', true));

DROP POLICY IF EXISTS genealogy_edge_isolation ON genealogy_edge;
CREATE POLICY genealogy_edge_isolation ON genealogy_edge
  FOR ALL
  USING (organization_id = current_setting('app.current_org', true))
  WITH CHECK (organization_id = current_setting('app.current_org', true));
