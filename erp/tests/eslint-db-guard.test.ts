/**
 * Placeholder: verifierar att ESLint-regeln för rå db-import finns dokumenterad.
 * Den faktiska regeln körs via `npm run lint` mot modules/**.
 */
import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

describe("eslint: no raw db in modules", () => {
  it("har no-restricted-imports för modules", () => {
    const config = readFileSync(resolve(process.cwd(), ".eslintrc.json"), "utf8");
    expect(config).toContain("modules/**");
    expect(config).toContain("@/core/db/client");
    expect(config).toContain("no-restricted-imports");
  });
});
