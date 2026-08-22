/**
 * Shared postgres.js options for app, migrations, and scripts.
 * Railway public Postgres URLs require SSL; internal *.railway.internal does not.
 */
export function postgresConnectionOptions(connectionString) {
  const local =
    /localhost|127\.0\.0\.1/.test(connectionString) ||
    connectionString.includes("railway.internal") ||
    connectionString.includes("sslmode=disable");

  return {
    max: 1,
    idle_timeout: 20,
    connect_timeout: 15,
    ssl: local ? false : "require",
  };
}
