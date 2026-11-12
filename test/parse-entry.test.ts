/**
 * The `@cosyte/x12/parse` entry point: the parser, the stream and their types, without the code
 * lists, loop specifications, readers, builders or serializer, and the same bindings the main entry
 * point exports, in the source and in the build.
 */

import { execFileSync } from "node:child_process";
import { readFileSync, rmSync } from "node:fs";
import { dirname, join, relative, resolve, sep } from "node:path";
import { pathToFileURL } from "node:url";

import { resolveToolBin } from "@cosyte/process";
import { beforeAll, describe, expect, it } from "vitest";

import * as main from "../src/index.js";
import * as parse from "../src/parse.js";

const root = join(import.meta.dirname, "..");
const src = join(root, "src");

/** Where this suite's build lands: never `dist/`, which other suites read. Git-ignored. */
const OUT_DIR = join(root, ".vitest-cache", "parse-entry-dist");

/** The `src/` folders the parse entry point must never load. */
const HEAVY_DIRS = [
  "arbitraries",
  "builder",
  "code-lists",
  "conformance",
  "loops",
  "serialize",
  "transactions",
];

/** The only `src/profiles/` modules it may load: the default profile's state and the types. */
const PROFILE_MODULES = new Set(["profiles/default.ts", "profiles/types.ts"]);

/** A `src/`-relative path with forward slashes. */
function srcPath(file: string): string {
  return relative(src, file).split(sep).join("/");
}

/** Whether the parse entry point may load `rel`, a `src/`-relative path. */
function allowed(rel: string): boolean {
  if (rel.startsWith("profiles/")) return PROFILE_MODULES.has(rel);
  return !HEAVY_DIRS.some((dir) => rel.startsWith(`${dir}/`));
}

/** Every `src/` module `entry` reaches through relative imports, type-only imports left out. */
function sourceGraph(entry: string): string[] {
  const seen = new Set<string>();
  const queue = [entry];
  while (queue.length > 0) {
    const file = queue.pop() ?? entry;
    if (seen.has(file)) continue;
    seen.add(file);
    const text = readFileSync(file, "utf8").replace(/\/\*[\s\S]*?\*\//g, "");
    for (const match of text.matchAll(
      /^(?:import|export)\s+(type\s+)?[^;]*?from\s+["'](\.[^"']+)["']/gm,
    )) {
      if (match[1] !== undefined) continue;
      queue.push(resolve(dirname(file), (match[2] ?? "").replace(/\.js$/u, ".ts")));
    }
  }
  return [...seen].map(srcPath).sort();
}

describe("the parse entry point in the source", () => {
  it("exports the parser, the stream and the error class", () => {
    expect(typeof parse.parseX12).toBe("function");
    expect(typeof parse.readTransactionSets).toBe("function");
    expect(typeof parse.X12ParseError).toBe("function");
    expect(parse.WARNING_CODES.X12_PRE_005010).toBe("X12_PRE_005010");
  });

  it("exports each name as the same binding the main entry point exports", () => {
    const names = Object.keys(parse);
    expect(names.length).toBeGreaterThan(0);
    for (const name of names) {
      expect(main[name as keyof typeof main], name).toBe(parse[name as keyof typeof parse]);
    }
  });

  it("loads no code list, loop specification, reader, builder or serializer", () => {
    const reached = sourceGraph(join(src, "parse.ts"));
    expect(reached).toContain("parser/index.ts");
    expect(reached).toContain("parser/stream.ts");
    expect(reached.filter((rel) => !allowed(rel))).toEqual([]);
  });

  it("finds a heavy module when one is imported, so the check above can fail", () => {
    const reached = sourceGraph(join(src, "index.ts"));
    expect(reached.filter((rel) => !allowed(rel))).toContain("code-lists/carc.ts");
    expect(reached.filter((rel) => !allowed(rel))).toContain("loops/define.ts");
  });
});

describe("the parse entry point in the package", () => {
  const pkg = JSON.parse(readFileSync(join(root, "package.json"), "utf8")) as {
    exports: Record<string, unknown>;
    typesVersions: Record<string, Record<string, string[]>>;
  };

  it("is in the exports map for import and require, each with its own types", () => {
    expect(pkg.exports["./parse"]).toEqual({
      import: { types: "./dist/parse.d.ts", default: "./dist/parse.mjs" },
      require: { types: "./dist/parse.d.cts", default: "./dist/parse.cjs" },
    });
    expect(pkg.typesVersions["*"]?.["parse"]).toEqual(["./dist/parse.d.ts"]);
  });

  it("leaves the main entry point where it was", () => {
    expect(pkg.exports["."]).toEqual({
      import: { types: "./dist/index.d.ts", default: "./dist/index.mjs" },
      require: { types: "./dist/index.d.cts", default: "./dist/index.cjs" },
    });
  });
});

describe("the parse entry point in the build", () => {
  beforeAll(() => {
    rmSync(OUT_DIR, { recursive: true, force: true });
    execFileSync(process.execPath, [resolveToolBin("tsup"), "--out-dir", OUT_DIR], {
      cwd: root,
      stdio: "ignore",
    });
  }, 120_000);

  /** Every built file `entry` loads through relative imports or requires, itself included. */
  function builtGraph(entry: string): string[] {
    const seen = new Set<string>();
    const queue = [entry];
    while (queue.length > 0) {
      const file = queue.pop() ?? entry;
      if (seen.has(file)) continue;
      seen.add(file);
      const text = readFileSync(join(OUT_DIR, file), "utf8");
      for (const match of text.matchAll(/(?:from\s+|require\()["']\.\/([^"']+)["']/g)) {
        queue.push(match[1] ?? "");
      }
    }
    return [...seen].sort();
  }

  /** The `src/` modules a set of built files was compiled from, read from their source maps. */
  function builtSources(files: readonly string[]): string[] {
    const out = new Set<string>();
    for (const file of files) {
      const map = JSON.parse(readFileSync(join(OUT_DIR, `${file}.map`), "utf8")) as {
        sources: string[];
      };
      for (const source of map.sources) out.add(srcPath(resolve(OUT_DIR, source)));
    }
    return [...out].sort();
  }

  it.each(["parse.mjs", "parse.cjs"])(
    "%s is compiled from no code list, loop specification, reader, builder or serializer",
    (entry) => {
      const sources = builtSources(builtGraph(entry));
      expect(sources).toContain("parser/index.ts");
      expect(sources.filter((rel) => !allowed(rel))).toEqual([]);
    },
  );

  it.each(["parse.mjs", "parse.cjs"])(
    "%s loads under a third of the main entry's bytes",
    (entry) => {
      const bytes = (files: readonly string[]): number =>
        files.reduce((sum, file) => sum + readFileSync(join(OUT_DIR, file)).length, 0);
      const mainEntry = entry.replace("parse", "index");
      expect(bytes(builtGraph(entry)) * 3).toBeLessThan(bytes(builtGraph(mainEntry)));
    },
  );

  it("shares one copy of the parser with the main entry point", async () => {
    const built = (file: string): Promise<Record<string, unknown>> =>
      import(pathToFileURL(join(OUT_DIR, file)).href) as Promise<Record<string, unknown>>;
    const [esmMain, esmParse] = await Promise.all([built("index.mjs"), built("parse.mjs")]);
    for (const name of Object.keys(esmParse)) expect(esmParse[name], name).toBe(esmMain[name]);

    const setDefaultProfile = esmMain["setDefaultProfile"] as (p: unknown) => void;
    const parseX12 = esmParse["parseX12"] as (raw: string) => { profile?: unknown };
    const profile = (esmMain["defineProfile"] as (spec: unknown) => unknown)({
      name: "synthetic-partner",
    });
    const raw =
      "ISA*00*          *00*          *ZZ*SENDER         *ZZ*RECEIVER       *250101*1200*^*00501*000000001*0*P*:~" +
      "GS*HC*S*R*20250101*1200*1*X*005010X222A2~ST*837*0001~SE*2*0001~GE*1*1~IEA*1*000000001~";
    setDefaultProfile(profile);
    try {
      expect(parseX12(raw).profile).toBe(profile);
    } finally {
      setDefaultProfile(null);
    }
  });

  it("shares one copy of the parser with the main entry point under require", () => {
    // Plain `require` is not in scope in an ES module test file; this reaches Node's own loader.
    const differing = (file: string): string[] =>
      JSON.parse(
        execFileSync(
          process.execPath,
          [
            "-e",
            `const m = require(${JSON.stringify(join(OUT_DIR, "index.cjs"))});` +
              `const p = require(${JSON.stringify(join(OUT_DIR, file))});` +
              "process.stdout.write(JSON.stringify(Object.keys(p).filter((k) => p[k] !== m[k])));",
          ],
          { encoding: "utf8" },
        ),
      ) as string[];
    expect(differing("parse.cjs")).toEqual([]);
  });

  /**
   * What `require` of a built CommonJS entry point gives: the shape of each export's property, the
   * names in order, and whether a caller can stub `name` the way `jest.spyOn` and `vi.spyOn` do
   * (`Object.defineProperty` with a new value) and by plain assignment in strict mode.
   */
  function requireShape(
    file: string,
    name: string,
  ): {
    shapes: string[];
    names: string[];
    redefined: boolean;
    assigned: boolean;
  } {
    const script = `"use strict";
const m = require(${JSON.stringify(join(OUT_DIR, file))});
const names = Object.keys(m);
const shapes = [...new Set(Reflect.ownKeys(m).map((k) => {
  const d = Object.getOwnPropertyDescriptor(m, k);
  return ("value" in d ? "data" : "accessor") + " writable=" + d.writable + " enumerable=" + d.enumerable + " configurable=" + d.configurable;
}))];
const name = ${JSON.stringify(name)};
const original = m[name];
const stub = () => "stub";
let redefined = false;
try {
  Object.defineProperty(m, name, { value: stub, configurable: true, writable: true });
  redefined = m[name] === stub;
  Object.defineProperty(m, name, { value: original, configurable: true, writable: true });
} catch {}
let assigned = false;
try {
  m[name] = stub;
  assigned = m[name] === stub;
  m[name] = original;
} catch {}
process.stdout.write(JSON.stringify({ shapes, names, redefined, assigned }));`;
    return JSON.parse(
      execFileSync(process.execPath, ["-e", script], { encoding: "utf8" }),
    ) as ReturnType<typeof requireShape>;
  }

  it.each([
    ["index.cjs", "parseX12"],
    ["index.cjs", "X12ParseError"],
    ["index.cjs", "get835"],
    ["parse.cjs", "parseX12"],
  ])("%s keeps every export an ordinary property a caller can stub (%s)", (file, name) => {
    const { shapes, names, redefined, assigned } = requireShape(file, name);
    expect(shapes).toEqual(["data writable=true enumerable=true configurable=true"]);
    expect(names).toEqual([...names].sort());
    expect(names).toContain(name);
    expect(redefined).toBe(true);
    expect(assigned).toBe(true);
  });
});
