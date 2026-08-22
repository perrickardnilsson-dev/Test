import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import postgres from "postgres";
import { postgresConnectionOptions } from "../core/db/postgres-options.mjs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const migrationsDir = path.join(__dirname, "../core/db/migrations");

const databaseUrl = process.env.DATABASE_URL;
if (!databaseUrl) {
  console.error("DATABASE_URL is required to run migrations.");
  process.exit(1);
}

const maxAttempts = 10;
let sql;

for (let attempt = 1; attempt <= maxAttempts; attempt++) {
  try {
    sql = postgres(databaseUrl, postgresConnectionOptions(databaseUrl));
    await sql`SELECT 1`;
    console.log(`Database connected (attempt ${attempt}).`);
    break;
  } catch (error) {
    console.error(
      `Database connection failed (attempt ${attempt}/${maxAttempts}):`,
      error instanceof Error ? error.message : error,
    );
    if (attempt === maxAttempts) {
      process.exit(1);
    }
    await new Promise((resolve) => setTimeout(resolve, 3000));
  }
}

try {
  await sql`
    CREATE TABLE IF NOT EXISTS schema_migrations (
      filename text PRIMARY KEY,
      applied_at timestamptz NOT NULL DEFAULT now()
    )
  `;

  const files = fs
    .readdirSync(migrationsDir)
    .filter((name) => name.endsWith(".sql"))
    .sort();

  const appliedRows = await sql`SELECT filename FROM schema_migrations`;
  const applied = new Set(appliedRows.map((row) => row.filename));

  for (const file of files) {
    if (applied.has(file)) {
      continue;
    }

    const filePath = path.join(migrationsDir, file);
    const content = fs.readFileSync(filePath, "utf8");
    console.log(`Applying migration ${file}...`);
    await sql.unsafe(content);
    await sql`INSERT INTO schema_migrations (filename) VALUES (${file})`;
    console.log(`Applied ${file}`);
  }

  console.log("Migrations complete.");
} finally {
  await sql.end();
}
