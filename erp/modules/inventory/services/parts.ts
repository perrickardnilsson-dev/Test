import { and, asc, eq, ilike, inArray, or, sql } from "drizzle-orm";
import { getTenantDb, type Db } from "@/core/db/tenant";
import { part, partGroup, savedPartView } from "../schema";
import type {
  CreatePartGroupInput,
  CreatePartInput,
  PartListFilter,
  UpdatePartInput,
} from "../domain/part-schemas";

function num(value: number | null | undefined): string | null {
  if (value === null || value === undefined) return null;
  return String(value);
}

export async function listParts(organizationId: string, filter: PartListFilter) {
  return getTenantDb(organizationId, async (tx) => {
    const conditions = [eq(part.organizationId, organizationId)];

    if (filter.search?.trim()) {
      const q = `%${filter.search.trim()}%`;
      conditions.push(
        or(ilike(part.partNumber, q), ilike(part.description, q))!,
      );
    }
    if (filter.status?.length) {
      conditions.push(inArray(part.status, filter.status));
    }
    if (filter.type?.length) {
      conditions.push(inArray(part.type, filter.type));
    }
    if (filter.partGroupId) {
      conditions.push(eq(part.partGroupId, filter.partGroupId));
    }

    return tx
      .select({
        id: part.id,
        partNumber: part.partNumber,
        description: part.description,
        unit: part.unit,
        type: part.type,
        status: part.status,
        partGroupId: part.partGroupId,
        standardCost: part.standardCost,
        salesPrice: part.salesPrice,
        leadTimeDays: part.leadTimeDays,
        updatedAt: part.updatedAt,
      })
      .from(part)
      .where(and(...conditions))
      .orderBy(asc(part.partNumber));
  });
}

export async function getPart(organizationId: string, partId: string) {
  return getTenantDb(organizationId, async (tx) => {
    const rows = await tx
      .select()
      .from(part)
      .where(and(eq(part.organizationId, organizationId), eq(part.id, partId)))
      .limit(1);
    return rows[0] ?? null;
  });
}

export async function createPart(
  organizationId: string,
  userId: string,
  input: CreatePartInput,
) {
  return getTenantDb(organizationId, async (tx) => {
    const existing = await tx
      .select({ id: part.id })
      .from(part)
      .where(
        and(
          eq(part.organizationId, organizationId),
          eq(part.partNumber, input.partNumber),
        ),
      )
      .limit(1);
    if (existing[0]) {
      throw new Error(`Artikelnummer ${input.partNumber} finns redan`);
    }

    const [created] = await tx
      .insert(part)
      .values({
        organizationId,
        partNumber: input.partNumber,
        description: input.description,
        unit: input.unit,
        type: input.type,
        partGroupId: input.partGroupId ?? null,
        status: input.status,
        standardCost: num(input.standardCost) ?? "0",
        salesPrice: num(input.salesPrice) ?? "0",
        leadTimeDays: input.leadTimeDays,
        safetyStock: num(input.safetyStock) ?? "0",
        reorderPoint: num(input.reorderPoint) ?? "0",
        lotSizingRule: input.lotSizingRule,
        lotSize: num(input.lotSize ?? null),
        planningMethod: input.planningMethod,
        traceabilityMode: input.traceabilityMode,
        weightKg: num(input.weightKg ?? null),
        notes: input.notes ?? null,
        createdBy: userId,
      })
      .returning();

    return created!;
  });
}

export async function updatePart(
  organizationId: string,
  input: UpdatePartInput,
) {
  return getTenantDb(organizationId, async (tx) => {
    if (input.partNumber) {
      const clash = await tx
        .select({ id: part.id })
        .from(part)
        .where(
          and(
            eq(part.organizationId, organizationId),
            eq(part.partNumber, input.partNumber),
            sql`${part.id} <> ${input.id}`,
          ),
        )
        .limit(1);
      if (clash[0]) {
        throw new Error(`Artikelnummer ${input.partNumber} finns redan`);
      }
    }

    const [updated] = await tx
      .update(part)
      .set({
        ...(input.partNumber !== undefined
          ? { partNumber: input.partNumber }
          : {}),
        ...(input.description !== undefined
          ? { description: input.description }
          : {}),
        ...(input.unit !== undefined ? { unit: input.unit } : {}),
        ...(input.type !== undefined ? { type: input.type } : {}),
        ...(input.partGroupId !== undefined
          ? { partGroupId: input.partGroupId }
          : {}),
        ...(input.status !== undefined ? { status: input.status } : {}),
        ...(input.standardCost !== undefined
          ? { standardCost: num(input.standardCost)! }
          : {}),
        ...(input.salesPrice !== undefined
          ? { salesPrice: num(input.salesPrice)! }
          : {}),
        ...(input.leadTimeDays !== undefined
          ? { leadTimeDays: input.leadTimeDays }
          : {}),
        ...(input.safetyStock !== undefined
          ? { safetyStock: num(input.safetyStock)! }
          : {}),
        ...(input.reorderPoint !== undefined
          ? { reorderPoint: num(input.reorderPoint)! }
          : {}),
        ...(input.lotSizingRule !== undefined
          ? { lotSizingRule: input.lotSizingRule }
          : {}),
        ...(input.lotSize !== undefined ? { lotSize: num(input.lotSize) } : {}),
        ...(input.planningMethod !== undefined
          ? { planningMethod: input.planningMethod }
          : {}),
        ...(input.traceabilityMode !== undefined
          ? { traceabilityMode: input.traceabilityMode }
          : {}),
        ...(input.weightKg !== undefined
          ? { weightKg: num(input.weightKg) }
          : {}),
        ...(input.notes !== undefined ? { notes: input.notes } : {}),
        updatedAt: new Date(),
      })
      .where(and(eq(part.organizationId, organizationId), eq(part.id, input.id)))
      .returning();

    if (!updated) throw new Error("Artikeln hittades inte");
    return updated;
  });
}

export async function listPartGroups(organizationId: string) {
  return getTenantDb(organizationId, async (tx) => {
    return tx
      .select()
      .from(partGroup)
      .where(eq(partGroup.organizationId, organizationId))
      .orderBy(asc(partGroup.code));
  });
}

export async function createPartGroup(
  organizationId: string,
  userId: string,
  input: CreatePartGroupInput,
) {
  return getTenantDb(organizationId, async (tx) => {
    const [created] = await tx
      .insert(partGroup)
      .values({
        organizationId,
        code: input.code,
        name: input.name,
        parentId: input.parentId ?? null,
        createdBy: userId,
      })
      .returning();
    return created!;
  });
}

export async function listSavedPartViews(
  organizationId: string,
  userId: string,
) {
  return getTenantDb(organizationId, async (tx) => {
    return tx
      .select()
      .from(savedPartView)
      .where(
        and(
          eq(savedPartView.organizationId, organizationId),
          eq(savedPartView.userId, userId),
        ),
      )
      .orderBy(asc(savedPartView.name));
  });
}

export async function savePartView(
  organizationId: string,
  userId: string,
  name: string,
  config: {
    search?: string;
    status?: string[];
    type?: string[];
    partGroupId?: string | null;
    columns?: string[];
  },
) {
  return getTenantDb(organizationId, async (tx: Db) => {
    const [created] = await tx
      .insert(savedPartView)
      .values({
        organizationId,
        userId,
        name,
        config,
      })
      .returning();
    return created!;
  });
}

export async function deleteSavedPartView(
  organizationId: string,
  userId: string,
  viewId: string,
) {
  return getTenantDb(organizationId, async (tx) => {
    await tx
      .delete(savedPartView)
      .where(
        and(
          eq(savedPartView.organizationId, organizationId),
          eq(savedPartView.userId, userId),
          eq(savedPartView.id, viewId),
        ),
      );
  });
}

export async function createPartsBulk(
  organizationId: string,
  userId: string,
  inputs: CreatePartInput[],
) {
  const created: string[] = [];
  const errors: string[] = [];
  for (const input of inputs) {
    try {
      const row = await createPart(organizationId, userId, input);
      created.push(row.partNumber);
    } catch (e) {
      errors.push(
        `${input.partNumber}: ${e instanceof Error ? e.message : "okänt fel"}`,
      );
    }
  }
  return { created, errors };
}
