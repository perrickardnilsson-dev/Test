import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import { platformSchema } from "./schema";

/**
 * Rå db-klient. Får endast användas från /core.
 * Modulkod ska använda getTenantDb — ESLint förbjuder denna import i /modules.
 */
const connectionString =
  process.env.DATABASE_URL ?? "postgresql://erp:erp@localhost:5432/erp";

const queryClient = postgres(connectionString, {
  max: 10,
  idle_timeout: 20,
  connect_timeout: 5,
});

export const db = drizzle(queryClient, { schema: platformSchema });

export type Db = typeof db;
