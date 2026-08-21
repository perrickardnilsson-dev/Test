import type { LucideIcon } from "lucide-react";

export type PermissionDef = {
  id: string;
  label: string;
  description?: string;
};

export type NavItem = {
  id: string;
  label: string;
  href: string;
  icon?: LucideIcon;
  children?: NavItem[];
};

/**
 * Modulkontrakt — varje modul exporterar ett manifest.
 * Registret (Fas 1) läser dessa och bygger navigation, behörigheter och schema.
 */
export type ModuleManifest = {
  id: string;
  name: string;
  icon: LucideIcon;
  enabledByDefault: boolean;
  nav: NavItem[];
  permissions: PermissionDef[];
  /** Drizzle-schemaobjekt för modulens tabeller (typat löst i Fas 0). */
  schema: Record<string, unknown>;
  seed?: (ctx: { organizationId: string }) => Promise<void>;
  onEvent?: Record<string, (payload: unknown) => Promise<void> | void>;
};
