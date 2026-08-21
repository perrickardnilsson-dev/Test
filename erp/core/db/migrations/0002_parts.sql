-- Fas 2: Artikelregister + varugrupper + sparade vyer

DO $$ BEGIN
  CREATE TYPE part_type AS ENUM ('purchased', 'manufactured', 'phantom', 'service');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE part_status AS ENUM ('active', 'blocked', 'phased_out');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE lot_sizing_rule AS ENUM ('lot_for_lot', 'fixed_qty', 'min_qty', 'economic_order_qty');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE planning_method AS ENUM ('mrp', 'reorder_point', 'manual');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE traceability_mode AS ENUM ('none', 'batch', 'serial');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE part_unit AS ENUM ('st', 'kg', 'm', 'liter', 'timme');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

CREATE TABLE IF NOT EXISTS part_group (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id text NOT NULL,
  parent_id uuid REFERENCES part_group(id) ON DELETE SET NULL,
  code text NOT NULL,
  name text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  created_by text
);

CREATE UNIQUE INDEX IF NOT EXISTS part_group_org_code_uidx
  ON part_group (organization_id, code);

CREATE TABLE IF NOT EXISTS part (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id text NOT NULL,
  part_number text NOT NULL,
  description text NOT NULL,
  unit part_unit NOT NULL DEFAULT 'st',
  type part_type NOT NULL DEFAULT 'purchased',
  part_group_id uuid REFERENCES part_group(id) ON DELETE SET NULL,
  status part_status NOT NULL DEFAULT 'active',
  standard_cost numeric(18,4) NOT NULL DEFAULT 0,
  sales_price numeric(18,4) NOT NULL DEFAULT 0,
  lead_time_days integer NOT NULL DEFAULT 0,
  safety_stock numeric(18,4) NOT NULL DEFAULT 0,
  reorder_point numeric(18,4) NOT NULL DEFAULT 0,
  lot_sizing_rule lot_sizing_rule NOT NULL DEFAULT 'lot_for_lot',
  lot_size numeric(18,4),
  planning_method planning_method NOT NULL DEFAULT 'mrp',
  traceability_mode traceability_mode NOT NULL DEFAULT 'none',
  default_location_id uuid,
  weight_kg numeric(18,4),
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  created_by text
);

CREATE UNIQUE INDEX IF NOT EXISTS part_org_number_uidx
  ON part (organization_id, part_number);

CREATE TABLE IF NOT EXISTS saved_part_view (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id text NOT NULL,
  user_id text NOT NULL,
  name text NOT NULL,
  config jsonb NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE part ENABLE ROW LEVEL SECURITY;
ALTER TABLE part FORCE ROW LEVEL SECURITY;
ALTER TABLE part_group ENABLE ROW LEVEL SECURITY;
ALTER TABLE part_group FORCE ROW LEVEL SECURITY;
ALTER TABLE saved_part_view ENABLE ROW LEVEL SECURITY;
ALTER TABLE saved_part_view FORCE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS part_isolation ON part;
CREATE POLICY part_isolation ON part
  FOR ALL
  USING (organization_id = current_setting('app.current_org', true))
  WITH CHECK (organization_id = current_setting('app.current_org', true));

DROP POLICY IF EXISTS part_group_isolation ON part_group;
CREATE POLICY part_group_isolation ON part_group
  FOR ALL
  USING (organization_id = current_setting('app.current_org', true))
  WITH CHECK (organization_id = current_setting('app.current_org', true));

DROP POLICY IF EXISTS saved_part_view_isolation ON saved_part_view;
CREATE POLICY saved_part_view_isolation ON saved_part_view
  FOR ALL
  USING (organization_id = current_setting('app.current_org', true))
  WITH CHECK (organization_id = current_setting('app.current_org', true));
