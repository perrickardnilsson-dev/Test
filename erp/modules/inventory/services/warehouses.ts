import { and, asc, eq } from "drizzle-orm";
import { getTenantDb } from "@/core/db/tenant";
import { warehouse, stockLocation } from "../schema";
import type {
  CreateStockLocationInput,
  CreateWarehouseInput,
  UpdateStockLocationInput,
  UpdateWarehouseInput,
} from "../domain/stock-schemas";

export async function listWarehouses(organizationId: string) {
  return getTenantDb(organizationId, async (tx) => {
    return tx
      .select()
      .from(warehouse)
      .where(eq(warehouse.organizationId, organizationId))
      .orderBy(asc(warehouse.code));
  });
}

export async function getWarehouse(organizationId: string, id: string) {
  return getTenantDb(organizationId, async (tx) => {
    const rows = await tx
      .select()
      .from(warehouse)
      .where(
        and(
          eq(warehouse.organizationId, organizationId),
          eq(warehouse.id, id),
        ),
      )
      .limit(1);
    return rows[0] ?? null;
  });
}

export async function createWarehouse(
  organizationId: string,
  userId: string,
  input: CreateWarehouseInput,
) {
  return getTenantDb(organizationId, async (tx) => {
    const existing = await tx
      .select({ id: warehouse.id })
      .from(warehouse)
      .where(
        and(
          eq(warehouse.organizationId, organizationId),
          eq(warehouse.code, input.code),
        ),
      )
      .limit(1);
    if (existing[0]) {
      throw new Error(`Lagerställekod ${input.code} finns redan`);
    }

    const [created] = await tx
      .insert(warehouse)
      .values({
        organizationId,
        code: input.code,
        name: input.name,
        allowNegativeStock: input.allowNegativeStock,
        isActive: input.isActive,
        createdBy: userId,
      })
      .returning();
    return created!;
  });
}

export async function updateWarehouse(
  organizationId: string,
  input: UpdateWarehouseInput,
) {
  return getTenantDb(organizationId, async (tx) => {
    const [updated] = await tx
      .update(warehouse)
      .set({
        ...(input.code !== undefined ? { code: input.code } : {}),
        ...(input.name !== undefined ? { name: input.name } : {}),
        ...(input.allowNegativeStock !== undefined
          ? { allowNegativeStock: input.allowNegativeStock }
          : {}),
        ...(input.isActive !== undefined ? { isActive: input.isActive } : {}),
        updatedAt: new Date(),
      })
      .where(
        and(
          eq(warehouse.organizationId, organizationId),
          eq(warehouse.id, input.id),
        ),
      )
      .returning();
    if (!updated) {
      throw new Error("Lagerställe hittades inte");
    }
    return updated;
  });
}

export async function listStockLocations(
  organizationId: string,
  warehouseId?: string | null,
) {
  return getTenantDb(organizationId, async (tx) => {
    const conditions = [eq(stockLocation.organizationId, organizationId)];
    if (warehouseId) {
      conditions.push(eq(stockLocation.warehouseId, warehouseId));
    }
    return tx
      .select({
        id: stockLocation.id,
        warehouseId: stockLocation.warehouseId,
        code: stockLocation.code,
        name: stockLocation.name,
        zone: stockLocation.zone,
        pickSequence: stockLocation.pickSequence,
        type: stockLocation.type,
        isActive: stockLocation.isActive,
        warehouseCode: warehouse.code,
        warehouseName: warehouse.name,
      })
      .from(stockLocation)
      .innerJoin(warehouse, eq(stockLocation.warehouseId, warehouse.id))
      .where(and(...conditions))
      .orderBy(asc(warehouse.code), asc(stockLocation.pickSequence), asc(stockLocation.code));
  });
}

export async function createStockLocation(
  organizationId: string,
  userId: string,
  input: CreateStockLocationInput,
) {
  return getTenantDb(organizationId, async (tx) => {
    const wh = await tx
      .select({ id: warehouse.id })
      .from(warehouse)
      .where(
        and(
          eq(warehouse.organizationId, organizationId),
          eq(warehouse.id, input.warehouseId),
        ),
      )
      .limit(1);
    if (!wh[0]) {
      throw new Error("Lagerställe hittades inte");
    }

    const existing = await tx
      .select({ id: stockLocation.id })
      .from(stockLocation)
      .where(
        and(
          eq(stockLocation.organizationId, organizationId),
          eq(stockLocation.warehouseId, input.warehouseId),
          eq(stockLocation.code, input.code),
        ),
      )
      .limit(1);
    if (existing[0]) {
      throw new Error(`Lagerplatskod ${input.code} finns redan på lagerstället`);
    }

    const [created] = await tx
      .insert(stockLocation)
      .values({
        organizationId,
        warehouseId: input.warehouseId,
        code: input.code,
        name: input.name ?? null,
        zone: input.zone ?? null,
        pickSequence: input.pickSequence,
        type: input.type,
        isActive: input.isActive,
        createdBy: userId,
      })
      .returning();
    return created!;
  });
}

export async function updateStockLocation(
  organizationId: string,
  input: UpdateStockLocationInput,
) {
  return getTenantDb(organizationId, async (tx) => {
    const [updated] = await tx
      .update(stockLocation)
      .set({
        ...(input.warehouseId !== undefined
          ? { warehouseId: input.warehouseId }
          : {}),
        ...(input.code !== undefined ? { code: input.code } : {}),
        ...(input.name !== undefined ? { name: input.name } : {}),
        ...(input.zone !== undefined ? { zone: input.zone } : {}),
        ...(input.pickSequence !== undefined
          ? { pickSequence: input.pickSequence }
          : {}),
        ...(input.type !== undefined ? { type: input.type } : {}),
        ...(input.isActive !== undefined ? { isActive: input.isActive } : {}),
        updatedAt: new Date(),
      })
      .where(
        and(
          eq(stockLocation.organizationId, organizationId),
          eq(stockLocation.id, input.id),
        ),
      )
      .returning();
    if (!updated) {
      throw new Error("Lagerplats hittades inte");
    }
    return updated;
  });
}
