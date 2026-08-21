-- Fas 0: initial plattformstabell (genereras/ersätts av drizzle-kit generate)
-- Körs manuellt tills db:migrate är uppsatt i miljön.

CREATE TABLE IF NOT EXISTS health_probe (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  note text NOT NULL DEFAULT 'ok',
  checked_at timestamptz NOT NULL DEFAULT now()
);
