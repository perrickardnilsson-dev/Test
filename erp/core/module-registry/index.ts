import type { ModuleManifest, NavItem } from "./types";

const manifests: ModuleManifest[] = [];

/**
 * Modulregister.
 * /core känner inte till någon modul vid namn — manifests registreras utifrån.
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

export function getEnabledModules(): ModuleManifest[] {
  return manifests.filter((m) => m.enabledByDefault);
}

export type NavEntry = NavItem & {
  href: string;
  moduleId: string;
  moduleName: string;
  comingSoon: boolean;
};

/** Bygger nav för sidomeny — aktiverade moduler + stubbar som "Kommer snart". */
export function buildNavigation(orgSlug: string): NavEntry[] {
  return manifests.flatMap((mod) =>
    mod.nav.map((item) => ({
      ...item,
      href: `/${orgSlug}/${item.href}`,
      moduleId: mod.id,
      moduleName: mod.name,
      comingSoon: !mod.enabledByDefault,
    })),
  );
}

export function buildCommandItems(orgSlug: string): Array<{
  id: string;
  label: string;
  href: string;
  group: string;
  comingSoon?: boolean;
}> {
  const items: Array<{
    id: string;
    label: string;
    href: string;
    group: string;
    comingSoon?: boolean;
  }> = [];

  for (const mod of manifests) {
    for (const item of mod.nav) {
      items.push({
        id: item.id,
        label: item.label,
        href: `/${orgSlug}/${item.href}`,
        group: mod.name,
        comingSoon: !mod.enabledByDefault,
      });
    }
  }

  items.push(
    {
      id: "nav.home",
      label: "Översikt",
      href: `/${orgSlug}`,
      group: "Navigation",
    },
    {
      id: "nav.health",
      label: "Systemstatus",
      href: "/health",
      group: "Navigation",
    },
  );

  return items;
}

export type { ModuleManifest, NavItem, PermissionDef } from "./types";
