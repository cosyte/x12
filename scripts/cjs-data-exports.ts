/**
 * Turns the exports of a built CommonJS entry point back into ordinary properties.
 *
 * With `splitting` on, tsup has rollup turn each entry point into CommonJS on its own, with the
 * shared chunk as an external module, and rollup re-exports an external module's binding as a
 * getter that cannot be redefined:
 *
 *   Object.defineProperty(exports, "parseX12", {
 *     enumerable: true,
 *     get: function () { return chunk_cjs.parseX12; }
 *   });
 *
 * A one-file build gives `exports.parseX12 = parseX12;` instead: a writable, configurable data
 * property, which is what `jest.spyOn` and `vi.spyOn` redefine on a CommonJS module and what a
 * strict-mode assignment writes. This rewrites the export block at the end of the file into that
 * form, every name in sorted order as the one-file build has it. The shared chunk is loaded in
 * full by its `require` before the first assignment and reassigns none of its exports, so a copy
 * of each value is the value a getter would return. Anything at the end of the file it does not
 * recognise is an error, so a change in rollup's output fails the build instead of shipping
 * getters.
 */

import { readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";

/** `Object.defineProperty(exports, "name", { enumerable: true, get: ... })`, as rollup writes it. */
const GETTER =
  /^Object\.defineProperty\(exports, "([A-Za-z_$][\w$]*)", \{\n {2}enumerable: true,\n {2}get: function \(\) \{ return ([A-Za-z_$][\w$]*\.[A-Za-z_$][\w$]*); \}\n\}\);\n/u;

/** `exports.name = value;`, as rollup writes a local export. */
const ASSIGNMENT = /^exports\.([A-Za-z_$][\w$]*) = ([A-Za-z_$][\w$]*(?:\.[A-Za-z_$][\w$]*)?);\n/u;

/** The source map comments rollup and esbuild leave at the end of the file. */
const TRAILER = /^(?:\/\/# sourceMappingURL=[^\n]*(?:\n|$)|\n)*$/u;

/**
 * The export statements of `tail` and what follows them, the source map comments, or `undefined`
 * when anything else is in it.
 */
function readExports(tail: string): { exports: Map<string, string>; trailer: string } | undefined {
  const exports = new Map<string, string>();
  let rest = tail;
  while (!TRAILER.test(rest)) {
    const match = GETTER.exec(rest) ?? ASSIGNMENT.exec(rest);
    if (match === null) return undefined;
    const [statement, name = "", value = ""] = match;
    if (exports.has(name)) return undefined;
    exports.set(name, value);
    rest = rest.slice(statement.length);
  }
  return { exports, trailer: rest };
}

/**
 * `code` with its export block as plain assignments in sorted order.
 *
 * @throws {Error} When the file does not end in an export block this recognises, or a getter export
 *   sits before it.
 */
export function dataExports(code: string): string {
  const starts = /^(?:Object\.defineProperty\(exports, "|exports\.[A-Za-z_$][\w$]* = )/gmu;
  for (const start of code.matchAll(starts)) {
    const block = readExports(code.slice(start.index));
    if (block === undefined || block.exports.size === 0) continue;
    const { exports, trailer } = block;
    const body = code.slice(0, start.index);
    if (/^Object\.defineProperty\(exports, /mu.test(body)) {
      throw new Error("an export outside the export block at the end of the file");
    }
    const lines = [...exports.keys()]
      .sort()
      .map((name) => `exports.${name} = ${exports.get(name) ?? ""};\n`);
    return body + lines.join("") + trailer;
  }
  throw new Error("no export block recognised at the end of the file");
}

/**
 * Rewrites each of `files` in `outDir` in place.
 *
 * @throws {Error} Naming the file whose export block is not recognised.
 */
export function rewriteDataExports(outDir: string, files: readonly string[]): void {
  for (const file of files) {
    const path = join(outDir, file);
    try {
      writeFileSync(path, dataExports(readFileSync(path, "utf8")));
    } catch (error) {
      throw new Error(`${file}: ${(error as Error).message}`, { cause: error });
    }
  }
}
