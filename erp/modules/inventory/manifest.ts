import { Package } from "lucide-react";
import type { ModuleManifest } from "@/core/module-registry";
import { inventorySchema } from "./schema";

/**
 * Lager & Artiklar — byggs på djupet från Fas 2.
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
      id: "inventory.partGroups",
      label: "Varugrupper",
      href: "varugrupper",
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
  schema: inventorySchema,
};

export default inventoryManifest;
