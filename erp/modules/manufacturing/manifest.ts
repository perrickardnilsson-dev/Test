import { Factory } from "lucide-react";
import type { ModuleManifest } from "@/core/module-registry";

export const manufacturingManifest: ModuleManifest = {
  id: "manufacturing",
  name: "Tillverkning",
  icon: Factory,
  enabledByDefault: false,
  nav: [
    { id: "manufacturing.home", label: "Tillverkning", href: "tillverkning" },
  ],
  permissions: [],
  schema: {},
};

export default manufacturingManifest;
