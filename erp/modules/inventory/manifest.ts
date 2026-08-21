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
      id: "inventory.warehouses",
      label: "Lagerställen",
      href: "lagerstallen",
    },
    {
      id: "inventory.locations",
      label: "Lagerplatser",
      href: "lagerplatser",
    },
    {
      id: "inventory.stock",
      label: "Lagersaldo",
      href: "lager",
    },
    {
      id: "inventory.movements",
      label: "Lagerrörelse",
      href: "lager/rorelse",
    },
    {
      id: "inventory.history",
      label: "Transaktioner",
      href: "lager/historik",
    },
    {
      id: "inventory.batches",
      label: "Batcher",
      href: "batcher",
    },
    {
      id: "inventory.serials",
      label: "Individer",
      href: "individer",
    },
    {
      id: "inventory.traceability",
      label: "Spårbarhet",
      href: "sparbarhet",
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
    {
      id: "inventory.stock.read",
      label: "Läsa lagersaldo",
    },
    {
      id: "inventory.stock.write",
      label: "Bokföra lagerrörelser",
    },
  ],
  schema: inventorySchema,
};

export default inventoryManifest;
