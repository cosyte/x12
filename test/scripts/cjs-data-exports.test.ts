/**
 * `scripts/cjs-data-exports.ts`: the build step that turns a CommonJS entry point's re-exports from
 * the shared chunk back into ordinary properties.
 */

import { describe, expect, it } from "vitest";

import { dataExports } from "../../scripts/cjs-data-exports.js";

/** A re-export the way rollup writes it for a binding of the shared chunk. */
function getter(name: string): string {
  return (
    `Object.defineProperty(exports, "${name}", {\n` +
    "  enumerable: true,\n" +
    `  get: function () { return chunk_cjs.${name}; }\n` +
    "});\n"
  );
}

const BODY = "'use strict';\n\nvar chunk_cjs = require('./chunk.cjs');\n\nfunction local() {}\n\n";
const TRAILER = "//# sourceMappingURL=index.cjs.map\n//# sourceMappingURL=index.cjs.map";

describe("dataExports", () => {
  it("writes every export as an assignment, in sorted order, and keeps the rest", () => {
    const code = BODY + getter("parseX12") + getter("X12ParseError") + "exports.local = local;\n";
    expect(dataExports(code + TRAILER)).toBe(
      BODY +
        "exports.X12ParseError = chunk_cjs.X12ParseError;\n" +
        "exports.local = local;\n" +
        "exports.parseX12 = chunk_cjs.parseX12;\n" +
        TRAILER,
    );
  });

  it("keeps a file with no source map comment whole", () => {
    expect(dataExports(BODY + getter("b") + "exports.a = a;\n")).toBe(
      BODY + "exports.a = a;\nexports.b = chunk_cjs.b;\n",
    );
  });

  it("skips an assignment in the body that code follows", () => {
    const body = BODY.replace("function local() {}", "exports.early = 1;\nlocal();");
    expect(dataExports(body + getter("b") + TRAILER)).toBe(
      body + "exports.b = chunk_cjs.b;\n" + TRAILER,
    );
  });

  it("refuses a file whose end it does not recognise", () => {
    expect(() => dataExports(BODY + getter("a") + "module.exports.b = 1;\n")).toThrow(
      "no export block recognised",
    );
    expect(() => dataExports(BODY)).toThrow("no export block recognised");
  });

  it("refuses a getter in any other form", () => {
    const live = getter("a").replace("enumerable: true,", "enumerable: true, configurable: false,");
    expect(() => dataExports(BODY + live + TRAILER)).toThrow("no export block recognised");
  });

  it("refuses a name exported twice", () => {
    expect(() => dataExports(BODY + getter("a") + "exports.a = a;\n" + TRAILER)).toThrow(
      "an export outside the export block",
    );
  });
});
