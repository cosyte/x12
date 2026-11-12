/**
 * The built entry points are ASCII, byte for byte.
 *
 * The bundler escapes every string literal it writes, but it keeps some comments as they are (a
 * comment inside an object literal, for one), and a single byte outside ASCII in a kept comment
 * makes Node read the whole entry as a two-byte source: it decodes the file the slow way and the
 * compiler scans twice the bytes, on every cold import of the package. Two such comments (a sum
 * sign and an ellipsis) cost a measurable part of the import. This holds the built entries to
 * ASCII, so a comment that brings one back fails here rather than in a reading.
 */

import { execFileSync } from "node:child_process";
import { readFileSync, readdirSync, rmSync } from "node:fs";
import { join } from "node:path";

import { resolveToolBin } from "@cosyte/process";
import { beforeAll, describe, expect, it } from "vitest";

const root = join(import.meta.dirname, "..");

/** Where this suite's build lands: never `dist/`, which other suites read. Git-ignored. */
const OUT_DIR = join(root, ".vitest-cache", "bundle-ascii-dist");

beforeAll(() => {
  rmSync(OUT_DIR, { recursive: true, force: true });
  execFileSync(process.execPath, [resolveToolBin("tsup"), "--out-dir", OUT_DIR], {
    cwd: root,
    stdio: "ignore",
  });
}, 120_000);

/** Each line of `bytes` that holds a byte above 0x7f, as `line: text`, at most five. */
function nonAsciiLines(bytes: Buffer): string[] {
  const out: string[] = [];
  let line = 1;
  let start = 0;
  for (let i = 0; i < bytes.length && out.length < 5; i += 1) {
    const byte = bytes[i] ?? 0;
    if (byte === 0x0a) {
      line += 1;
      start = i + 1;
    } else if (byte > 0x7f) {
      const end = bytes.indexOf(0x0a, i);
      const text = bytes.toString("utf8", start, end === -1 ? bytes.length : end);
      out.push(`${String(line)}: ${text.trim().slice(0, 80)}`);
      i = end === -1 ? bytes.length : end - 1;
    }
  }
  return out;
}

describe("the built entry points a consumer imports are ASCII", () => {
  it.each(["index.mjs", "index.cjs", "parse.mjs", "parse.cjs"])(
    "%s holds no byte above 0x7f",
    (entry) => {
      expect(nonAsciiLines(readFileSync(join(OUT_DIR, entry)))).toEqual([]);
    },
  );

  // The entry points share the parser through chunks the build splits out, and a chunk is
  // compiled on every cold import as the entry points are.
  it("every built chunk holds no byte above 0x7f", () => {
    const chunks = readdirSync(OUT_DIR).filter((name) => /^chunk-.*\.(?:mjs|cjs)$/u.test(name));
    expect(chunks.length).toBeGreaterThan(0);
    for (const chunk of chunks) {
      expect(nonAsciiLines(readFileSync(join(OUT_DIR, chunk))), chunk).toEqual([]);
    }
  });
});
