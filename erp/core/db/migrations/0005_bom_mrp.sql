-- Fas 5: Artikelstruktur (BOM) + nettobehovskörning (MRP)

ALTER TABLE part
  ADD COLUMN IF NOT EXISTS low_level_code integer NOT NULL DEFAULT 0;

DO $$ BEGIN
  CREATE TYPE bom_status AS ENUM ('draft', 'active', 'obsolete');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE demand_source_type AS ENUM (
    'customer_order', 'forecast', 'dependent', 'manual'
  );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE supply_source_type AS ENUM (
    'purchase_order', 'manufacturing_order', 'stock', 'manual'
  );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE planning_line_status AS ENUM ('open', 'closed', 'cancelled');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE net_requirement_run_status AS ENUM (
    'running', 'completed', 'failed'
  );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE suggestion_type AS ENUM ('purchase', 'manufacture');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE suggestion_status AS ENUM ('open', 'accepted', 'rejected');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

CREATE TABLE IF NOT EXISTS bom (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id text NOT NULL,
  parent_part_id uuid NOT NULL REFERENCES part(id) ON DELETE RESTRICT,
  revision text NOT NULL DEFAULT 'A',
  valid_from timestamptz NOT NULL DEFAULT now(),
  status bom_status NOT NULL DEFAULT 'draft',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  created_by text
);

CREATE UNIQUE INDEX IF NOT EXISTS bom_org_parent_revision_uidx
  ON bom (organization_id, parent_part_id, revision);
CREATE INDEX IF NOT EXISTS bom_parent_idx ON bom (parent_part_id);

CREATE TABLE IF NOT EXISTS bom_line (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id text NOT NULL,
  bom_id uuid NOT NULL REFERENCES bom(id) ON DELETE CASCADE,
  component_part_id uuid NOT NULL REFERENCES part(id) ON DELETE RESTRICT,
  quantity_per numeric(18,4) NOT NULL DEFAULT 1,
  scrap_percent numeric(8,4) NOT NULL DEFAULT 0,
  position integer NOT NULL DEFAULT 10,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS bom_line_bom_component_uidx
  ON bom_line (bom_id, component_part_id);
CREATE INDEX IF NOT EXISTS bom_line_component_idx ON bom_line (component_part_id);

CREATE TABLE IF NOT EXISTS demand_line (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id text NOT NULL,
  part_id uuid NOT NULL REFERENCES part(id) ON DELETE RESTRICT,
  quantity numeric(18,4) NOT NULL,
  due_date timestamptz NOT NULL,
  source_type demand_source_type NOT NULL DEFAULT 'manual',
  source_id text,
  status planning_line_status NOT NULL DEFAULT 'open',
  note text,
  created_at timestamptz NOT NULL DEFAULT now(),
  created_by text
);

CREATE INDEX IF NOT EXISTS demand_line_part_idx ON demand_line (part_id);
CREATE INDEX IF NOT EXISTS demand_line_due_idx ON demand_line (due_date);
CREATE INDEX IF NOT EXISTS demand_line_org_idx ON demand_line (organization_id);

CREATE TABLE IF NOT EXISTS supply_line (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id text NOT NULL,
  part_id uuid NOT NULL REFERENCES part(id) ON DELETE RESTRICT,
  quantity numeric(18,4) NOT NULL,
  due_date timestamptz NOT NULL,
  source_type supply_source_type NOT NULL DEFAULT 'manual',
  source_id text,
  status planning_line_status NOT NULL DEFAULT 'open',
  note text,
  created_at timestamptz NOT NULL DEFAULT now(),
  created_by text
);

CREATE INDEX IF NOT EXISTS supply_line_part_idx ON supply_line (part_id);
CREATE INDEX IF NOT EXISTS supply_line_due_idx ON supply_line (due_date);
CREATE INDEX IF NOT EXISTS supply_line_org_idx ON supply_line (organization_id);

CREATE TABLE IF NOT EXISTS net_requirement_run (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id text NOT NULL,
  run_at timestamptz NOT NULL DEFAULT now(),
  as_of_date timestamptz NOT NULL,
  status net_requirement_run_status NOT NULL DEFAULT 'running',
  message text,
  suggestion_count integer NOT NULL DEFAULT 0,
  created_by text
);

CREATE INDEX IF NOT EXISTS net_requirement_run_org_idx
  ON net_requirement_run (organization_id);

CREATE TABLE IF NOT EXISTS planning_suggestion (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id text NOT NULL,
  run_id uuid NOT NULL REFERENCES net_requirement_run(id) ON DELETE CASCADE,
  part_id uuid NOT NULL REFERENCES part(id) ON DELETE RESTRICT,
  suggestion_type suggestion_type NOT NULL,
  quantity numeric(18,4) NOT NULL,
  due_date timestamptz NOT NULL,
  order_date timestamptz NOT NULL,
  is_late boolean NOT NULL DEFAULT false,
  status suggestion_status NOT NULL DEFAULT 'open',
  pegging jsonb NOT NULL DEFAULT '[]'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS planning_suggestion_run_idx
  ON planning_suggestion (run_id);
CREATE INDEX IF NOT EXISTS planning_suggestion_part_idx
  ON planning_suggestion (part_id);
CREATE INDEX IF NOT EXISTS planning_suggestion_org_idx
  ON planning_suggestion (organization_id);

ALTER TABLE bom ENABLE ROW LEVEL SECURITY;
ALTER TABLE bom FORCE ROW LEVEL SECURITY;
ALTER TABLE bom_line ENABLE ROW LEVEL SECURITY;
ALTER TABLE bom_line FORCE ROW LEVEL SECURITY;
ALTER TABLE demand_line ENABLE ROW LEVEL SECURITY;
ALTER TABLE demand_line FORCE ROW LEVEL SECURITY;
ALTER TABLE supply_line ENABLE ROW LEVEL SECURITY;
ALTER TABLE supply_line FORCE ROW LEVEL SECURITY;
ALTER TABLE net_requirement_run ENABLE ROW LEVEL SECURITY;
ALTER TABLE net_requirement_run FORCE ROW LEVEL SECURITY;
ALTER TABLE planning_suggestion ENABLE ROW LEVEL SECURITY;
ALTER TABLE planning_suggestion FORCE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS bom_isolation ON bom;
CREATE POLICY bom_isolation ON bom
  FOR ALL
  USING (organization_id = current_setting('app.current_org', true))
  WITH CHECK (organization_id = current_setting('app.current_org', true));

DROP POLICY IF EXISTS bom_line_isolation ON bom_line;
CREATE POLICY bom_line_isolation ON bom_line
  FOR ALL
  USING (organization_id = current_setting('app.current_org', true))
  WITH CHECK (organization_id = current_setting('app.current_org', true));

DROP POLICY IF EXISTS demand_line_isolation ON demand_line;
CREATE POLICY demand_line_isolation ON demand_line
  FOR ALL
  USING (organization_id = current_setting('app.current_org', true))
  WITH CHECK (organization_id = current_setting('app.current_org', true));

DROP POLICY IF EXISTS supply_line_isolation ON supply_line;
CREATE POLICY supply_line_isolation ON supply_line
  FOR ALL
  USING (organization_id = current_setting('app.current_org', true))
  WITH CHECK (organization_id = current_setting('app.current_org', true));

DROP POLICY IF EXISTS net_requirement_run_isolation ON net_requirement_run;
CREATE POLICY net_requirement_run_isolation ON net_requirement_run
  FOR ALL
  USING (organization_id = current_setting('app.current_org', true))
  WITH CHECK (organization_id = current_setting('app.current_org', true));

DROP POLICY IF EXISTS planning_suggestion_isolation ON planning_suggestion;
CREATE POLICY planning_suggestion_isolation ON planning_suggestion
  FOR ALL
  USING (organization_id = current_setting('app.current_org', true))
  WITH CHECK (organization_id = current_setting('app.current_org', true));
