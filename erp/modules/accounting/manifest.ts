import { Calculator } from "lucide-react";
import type { ModuleManifest } from "@/core/module-registry";

export const accountingManifest: ModuleManifest = {
  id: "accounting",
  name: "Redovisning",
  icon: Calculator,
  enabledByDefault: false,
  nav: [{ id: "accounting.home", label: "Redovisning", href: "redovisning" }],
  permissions: [],
  schema: {},
};

export default accountingManifest;
