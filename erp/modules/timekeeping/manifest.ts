import { Clock } from "lucide-react";
import type { ModuleManifest } from "@/core/module-registry";

export const timekeepingManifest: ModuleManifest = {
  id: "timekeeping",
  name: "Tid",
  icon: Clock,
  enabledByDefault: false,
  nav: [{ id: "timekeeping.home", label: "Tid", href: "tid" }],
  permissions: [],
  schema: {},
};

export default timekeepingManifest;
