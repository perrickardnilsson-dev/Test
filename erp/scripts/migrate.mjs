import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import postgres from "postgres";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const migrationsDir = path.join(__dirname, "../core/db/migrations");

const databaseUrl = process.env.DATABASE_URL;
if (!databaseUrl) {
  console.error("DATABASE_URL is required to run migrations.");
  process.exit(1);
}

const sql = postgres(databaseUrl, { max: 1 });

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
