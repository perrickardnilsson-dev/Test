import type { ModuleManifest } from "./types";

const manifests: ModuleManifest[] = [];

/**
 * Modulregister — Fas 0: tomt skelett.
 * Fas 1: registrerar manifests och bygger navigation.
 */
export function registerModule(manifest: ModuleManifest): void {
  if (manifests.some((m) => m.id === manifest.id)) {
    throw new Error(`Modul redan registrerad: ${manifest.id}`);
  }
  manifests.push(manifest);
}

export function listModules(): readonly ModuleManifest[] {
  return manifests;
}

export function getModule(id: string): ModuleManifest | undefined {
  return manifests.find((m) => m.id === id);
}

export type { ModuleManifest, NavItem, PermissionDef } from "./types";
