/**
 * Publik yta för databasåtkomst.
 * Exportera endast tenant-API och schema-typer — inte den råa klienten.
 */
export { getTenantDb } from "./tenant";
export type { Db } from "./tenant";
export { platformSchema, healthProbe, tenantSecret } from "./schema";
export { checkDatabaseHealth } from "./health";
