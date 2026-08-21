-- Fas 6: Inventering (låst räkning → godkännande → justering)

DO $$ BEGIN
  CREATE TYPE inventory_count_status AS ENUM (
    'draft', 'counting', 'pending_approval', 'posted', 'cancelled'
  );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

CREATE TABLE IF NOT EXISTS inventory_count (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id text NOT NULL,
  warehouse_id uuid REFERENCES warehouse(id) ON DELETE RESTRICT,
  name text NOT NULL,
  status inventory_count_status NOT NULL DEFAULT 'draft',
  counted_at timestamptz,
  approved_at timestamptz,
  approved_by text,
  posted_at timestamptz,
  posted_by text,
  note text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  created_by text
);

CREATE INDEX IF NOT EXISTS inventory_count_org_idx
  ON inventory_count (organization_id);
CREATE INDEX IF NOT EXISTS inventory_count_status_idx
  ON inventory_count (status);

CREATE TABLE IF NOT EXISTS inventory_count_line (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id text NOT NULL,
  inventory_count_id uuid NOT NULL REFERENCES inventory_count(id) ON DELETE CASCADE,
  part_id uuid NOT NULL REFERENCES part(id) ON DELETE RESTRICT,
  location_id uuid NOT NULL REFERENCES stock_location(id) ON DELETE RESTRICT,
  batch_id uuid REFERENCES batch(id) ON DELETE SET NULL,
  expected_quantity numeric(18,4) NOT NULL DEFAULT 0,
  counted_quantity numeric(18,4),
  unit_cost numeric(18,4) NOT NULL DEFAULT 0,
  variance_value numeric(18,4),
  counted_by text,
  counted_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS inventory_count_line_unique_uidx
  ON inventory_count_line (
    inventory_count_id,
    part_id,
    location_id,
    COALESCE(batch_id, '00000000-0000-0000-0000-000000000000'::uuid)
  );
CREATE INDEX IF NOT EXISTS inventory_count_line_count_idx
  ON inventory_count_line (inventory_count_id);
CREATE INDEX IF NOT EXISTS inventory_count_line_part_idx
  ON inventory_count_line (part_id);

ALTER TABLE inventory_count ENABLE ROW LEVEL SECURITY;
ALTER TABLE inventory_count FORCE ROW LEVEL SECURITY;
ALTER TABLE inventory_count_line ENABLE ROW LEVEL SECURITY;
ALTER TABLE inventory_count_line FORCE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS inventory_count_isolation ON inventory_count;
CREATE POLICY inventory_count_isolation ON inventory_count
  FOR ALL
  USING (organization_id = current_setting('app.current_org', true))
  WITH CHECK (organization_id = current_setting('app.current_org', true));

DROP POLICY IF EXISTS inventory_count_line_isolation ON inventory_count_line;
CREATE POLICY inventory_count_line_isolation ON inventory_count_line
  FOR ALL
  USING (organization_id = current_setting('app.current_org', true))
  WITH CHECK (organization_id = current_setting('app.current_org', true));
