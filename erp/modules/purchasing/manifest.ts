import { ShoppingCart } from "lucide-react";
import type { ModuleManifest } from "@/core/module-registry";

export const purchasingManifest: ModuleManifest = {
  id: "purchasing",
  name: "Inköp",
  icon: ShoppingCart,
  enabledByDefault: false,
  nav: [{ id: "purchasing.home", label: "Inköp", href: "inkop" }],
  permissions: [],
  schema: {},
};

export default purchasingManifest;
