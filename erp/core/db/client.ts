import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import { platformSchema } from "./schema";

function postgresOptions(connectionString: string) {
  const local =
    /localhost|127\.0\.0\.1/.test(connectionString) ||
    connectionString.includes("railway.internal") ||
    connectionString.includes("sslmode=disable");

  return {
    max: 10,
    idle_timeout: 20,
    connect_timeout: 15,
    ssl: local ? (false as const) : ("require" as const),
  };
}

/**
 * Rå db-klient. Får endast användas från /core.
 * Modulkod ska använda getTenantDb — ESLint förbjuder denna import i /modules.
 */
const connectionString =
  process.env.DATABASE_URL ?? "postgresql://erp:erp@localhost:5432/erp";

const queryClient = postgres(connectionString, postgresOptions(connectionString));

export const db = drizzle(queryClient, { schema: platformSchema });

export type Db = typeof db;
