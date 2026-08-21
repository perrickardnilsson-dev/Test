"use server";

import { revalidatePath } from "next/cache";
import {
  createPartSchema,
  createPartGroupSchema,
  partListFilterSchema,
  savePartViewSchema,
  updatePartSchema,
} from "./domain/part-schemas";
import { csvRowToCreateInput, parsePartsCsv } from "./domain/csv";
import {
  createPart,
  createPartGroup,
  createPartsBulk,
  deleteSavedPartView,
  getPart,
  listPartGroups,
  listParts,
  listSavedPartViews,
  savePartView,
  updatePart,
} from "./services/parts";
import { requireOrgAccess } from "./lib/org-context";

export async function listPartsAction(orgSlug: string, filter: unknown) {
  const ctx = await requireOrgAccess(orgSlug);
  const parsed = partListFilterSchema.parse(filter ?? {});
  return listParts(ctx.organizationId, parsed);
}

export async function getPartAction(orgSlug: string, partId: string) {
  const ctx = await requireOrgAccess(orgSlug);
  return getPart(ctx.organizationId, partId);
}

export async function createPartAction(orgSlug: string, raw: unknown) {
  const ctx = await requireOrgAccess(orgSlug);
  const input = createPartSchema.parse(raw);
  const created = await createPart(ctx.organizationId, ctx.userId, input);
  revalidatePath(`/${orgSlug}/artiklar`);
  return { id: created.id, partNumber: created.partNumber };
}

export async function updatePartAction(orgSlug: string, raw: unknown) {
  const ctx = await requireOrgAccess(orgSlug);
  const input = updatePartSchema.parse(raw);
  const updated = await updatePart(ctx.organizationId, input);
  revalidatePath(`/${orgSlug}/artiklar`);
  revalidatePath(`/${orgSlug}/artiklar/${updated.id}`);
  return { id: updated.id };
}

export async function listPartGroupsAction(orgSlug: string) {
  const ctx = await requireOrgAccess(orgSlug);
  return listPartGroups(ctx.organizationId);
}

export async function createPartGroupAction(orgSlug: string, raw: unknown) {
  const ctx = await requireOrgAccess(orgSlug);
  const input = createPartGroupSchema.parse(raw);
  const created = await createPartGroup(ctx.organizationId, ctx.userId, input);
  revalidatePath(`/${orgSlug}/varugrupper`);
  revalidatePath(`/${orgSlug}/artiklar`);
  return { id: created.id };
}

export async function listSavedViewsAction(orgSlug: string) {
  const ctx = await requireOrgAccess(orgSlug);
  return listSavedPartViews(ctx.organizationId, ctx.userId);
}

export async function savePartViewAction(orgSlug: string, raw: unknown) {
  const ctx = await requireOrgAccess(orgSlug);
  const input = savePartViewSchema.parse(raw);
  const created = await savePartView(
    ctx.organizationId,
    ctx.userId,
    input.name,
    input.config,
  );
  revalidatePath(`/${orgSlug}/artiklar`);
  return { id: created.id };
}

export async function deleteSavedViewAction(orgSlug: string, viewId: string) {
  const ctx = await requireOrgAccess(orgSlug);
  await deleteSavedPartView(ctx.organizationId, ctx.userId, viewId);
  revalidatePath(`/${orgSlug}/artiklar`);
}

export async function importPartsCsvAction(orgSlug: string, csvText: string) {
  const ctx = await requireOrgAccess(orgSlug);
  const parsed = parsePartsCsv(csvText);
  if (parsed.rows.length === 0) {
    return { created: [] as string[], errors: parsed.errors };
  }
  const inputs = parsed.rows.map(csvRowToCreateInput);
  const result = await createPartsBulk(
    ctx.organizationId,
    ctx.userId,
    inputs,
  );
  revalidatePath(`/${orgSlug}/artiklar`);
  return {
    created: result.created,
    errors: [...parsed.errors, ...result.errors],
  };
}
