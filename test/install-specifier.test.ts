import { readFileSync } from "node:fs";
import { join } from "node:path";

import { describe, expect, it } from "vitest";

import { installSpecifiers } from "./_helpers/first-use.js";

/**
 * The install command a reader copies has to fetch THIS package. The subject is package identity:
 * each specifier the two first-use documents print is compared with `package.json` `name`, and a
 * mismatch names both strings.
 */
const root = join(import.meta.dirname, "..");
const { name } = JSON.parse(readFileSync(join(root, "package.json"), "utf8")) as { name: string };

describe("the documented install specifier", () => {
  for (const doc of ["docs-content/installation.md", "README.md"]) {
    it(`AC-XT6: every install command in ${doc} names package.json name`, () => {
      const specs = installSpecifiers(readFileSync(join(root, doc), "utf8"));
      expect(specs.length, `${doc} prints no install command`).toBeGreaterThan(0);
      for (const spec of specs) {
        expect(spec, `${doc} installs "${spec}", package.json name is "${name}"`).toBe(name);
      }
    });
  }

  it("AC-XT6: a specifier that is not the package name is read as the name it prints", () => {
    expect(installSpecifiers("npm install @cosyte/x13\n`pnpm add -D @cosyte/x12@0.0.1`")).toEqual([
      "@cosyte/x13",
      "@cosyte/x12",
    ]);
  });
});
