import { Package } from "lucide-react";
import type { ModuleManifest } from "@/core/module-registry";

/**
 * Lager & Artiklar — byggs på djupet från Fas 2.
 * Fas 0: endast manifest-stubbe.
 */
export const inventoryManifest: ModuleManifest = {
  id: "inventory",
  name: "Lager",
  icon: Package,
  enabledByDefault: true,
  nav: [
    {
      id: "inventory.parts",
      label: "Artiklar",
      href: "artiklar",
    },
    {
      id: "inventory.stock",
      label: "Lagersaldo",
      href: "lager",
    },
  ],
  permissions: [
    {
      id: "inventory.part.read",
      label: "Läsa artiklar",
    },
    {
      id: "inventory.part.write",
      label: "Ändra artiklar",
    },
  ],
  schema: {},
};

export default inventoryManifest;
