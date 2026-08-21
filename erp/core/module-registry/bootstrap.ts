import { registerModule } from "@/core/module-registry";
import { inventoryManifest } from "@/modules/inventory/manifest";
import { purchasingManifest } from "@/modules/purchasing/manifest";
import { salesManifest } from "@/modules/sales/manifest";
import { manufacturingManifest } from "@/modules/manufacturing/manifest";
import { timekeepingManifest } from "@/modules/timekeeping/manifest";
import { accountingManifest } from "@/modules/accounting/manifest";

let bootstrapped = false;

/**
 * Registrerar alla kända modulmanifest.
 * Anropas från app-lagret — registret i /core importerar inte modulerna själv.
 */
export function bootstrapModules(): void {
  if (bootstrapped) return;
  bootstrapped = true;

  for (const manifest of [
    inventoryManifest,
    purchasingManifest,
    salesManifest,
    manufacturingManifest,
    timekeepingManifest,
    accountingManifest,
  ]) {
    try {
      registerModule(manifest);
    } catch {
      // redan registrerad (hot reload)
    }
  }
}
