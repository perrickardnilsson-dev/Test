import { defineConfig } from "drizzle-kit";

export default defineConfig({
  schema: ["./core/db/schema.ts", "./modules/inventory/schema.ts"],
  out: "./core/db/migrations",
  dialect: "postgresql",
  dbCredentials: {
    url: process.env.DATABASE_URL ?? "postgresql://erp:erp@localhost:5432/erp",
  },
  strict: true,
  verbose: true,
});
