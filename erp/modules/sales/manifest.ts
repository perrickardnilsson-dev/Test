import { Handshake } from "lucide-react";
import type { ModuleManifest } from "@/core/module-registry";

export const salesManifest: ModuleManifest = {
  id: "sales",
  name: "Försäljning",
  icon: Handshake,
  enabledByDefault: false,
  nav: [{ id: "sales.home", label: "Försäljning", href: "forsaljning" }],
  permissions: [],
  schema: {},
};

export default salesManifest;
