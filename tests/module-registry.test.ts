import { describe, expect, it } from "vitest";
import {
  getModule,
  listModules,
  registerModule,
} from "@/core/module-registry";
import { inventoryManifest } from "@/modules/inventory/manifest";

describe("modulregister", () => {
  it("registrerar och listar en modul", () => {
    // Isolerad körning — registret är process-globalt, rensa via om-registrering
    const existing = listModules().find((m) => m.id === "inventory");
    if (!existing) {
      registerModule(inventoryManifest);
    }

    expect(getModule("inventory")?.name).toBe("Lager");
    expect(listModules().some((m) => m.id === "inventory")).toBe(true);
  });

  it("vägrar dubbelregistrering", () => {
    if (!getModule("inventory")) {
      registerModule(inventoryManifest);
    }
    expect(() => registerModule(inventoryManifest)).toThrow(/redan registrerad/);
  });
});
