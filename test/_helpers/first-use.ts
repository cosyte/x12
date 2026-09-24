import { readFileSync, readdirSync } from "node:fs";
import { join, relative } from "node:path";

import ts from "typescript";

/**
 * Readers for the package's first-use path: the first fenced block of
 * `docs-content/quickstart.md`, the first fenced block under `## Usage` in `README.md`, and the
 * install command both documents print. Every reader works on the text of the document as it is
 * on disk at test time, never on a copy held here.
 */

/**
 * The compiler options of a new project, as `tsc --init` of the TypeScript this repository pins
 * writes them: `strict` plus `noUncheckedIndexedAccess`, `exactOptionalPropertyTypes` and
 * `verbatimModuleSyntax`, NodeNext modules. The emit-only settings it also writes (`sourceMap`,
 * `declaration`, `declarationMap`, `jsx`) are left out because nothing is emitted, and Node's
 * types are loaded where `tsc --init` writes `types: []`, because every first-use example is a
 * Node program.
 */
const READER_OPTIONS: ts.CompilerOptions = {
  module: ts.ModuleKind.NodeNext,
  moduleResolution: ts.ModuleResolutionKind.NodeNext,
  target: ts.ScriptTarget.ESNext,
  strict: true,
  noUncheckedIndexedAccess: true,
  exactOptionalPropertyTypes: true,
  verbatimModuleSyntax: true,
  isolatedModules: true,
  noUncheckedSideEffectImports: true,
  moduleDetection: ts.ModuleDetectionKind.Force,
  skipLibCheck: true,
  noEmit: true,
  types: ["node"],
};

/**
 * Every TypeScript error a reader's new project reports for one example, as `line N: TSxxxx
 * message`; empty when the example compiles. The example is compiled as an ES module sitting in
 * the repository root, with `pkg` resolved to `entry`, the single source file the bundler compiles
 * into the published entry point and its types. Only the example's own errors are returned.
 */
export function compileErrors(root: string, pkg: string, entry: string, code: string): string[] {
  const file = join(root, "first-use-example.mts");
  const options: ts.CompilerOptions = {
    ...READER_OPTIONS,
    typeRoots: [join(root, "node_modules", "@types")],
    paths: { [pkg]: [entry] },
  };
  const host = ts.createCompilerHost(options, true);
  const getSourceFile = host.getSourceFile.bind(host);
  host.getSourceFile = (name, language, onError, create) =>
    name === file
      ? ts.createSourceFile(name, code, language, true)
      : getSourceFile(name, language, onError, create);
  const fileExists = host.fileExists.bind(host);
  host.fileExists = (name) => name === file || fileExists(name);
  const readFile = host.readFile.bind(host);
  host.readFile = (name) => (name === file ? code : readFile(name));
  const program = ts.createProgram([file], options, host);
  return ts
    .getPreEmitDiagnostics(program, program.getSourceFile(file))
    .filter((d) => d.file?.fileName === file)
    .map((d) => {
      const line = d.file?.getLineAndCharacterOfPosition(d.start ?? 0).line ?? 0;
      const text = ts.flattenDiagnosticMessageText(d.messageText, " ");
      return `line ${String(line + 1)}: TS${String(d.code)} ${text}`;
    });
}

/** One fenced code block: its info string split into language and tags, and its body. */
export interface Fence {
  readonly lang: string;
  readonly tags: readonly string[];
  readonly body: string;
}

/** Every fenced block in a chunk of markdown, in document order. */
export function fences(markdown: string): Fence[] {
  const out: Fence[] = [];
  let open: { marker: string; lang: string; tags: string[] } | undefined;
  let buf: string[] = [];
  for (const line of markdown.split("\n")) {
    if (open === undefined) {
      const opened = /^(`{3,}|~{3,})\s*(.*)$/.exec(line);
      if (opened !== null) {
        const tokens = (opened[2] ?? "").trim().split(/\s+/).filter(Boolean);
        open = { marker: opened[1] ?? "```", lang: tokens[0] ?? "", tags: tokens.slice(1) };
        buf = [];
      }
      continue;
    }
    if (line.trimEnd() === open.marker) {
      out.push({ lang: open.lang, tags: open.tags, body: buf.join("\n") });
      open = undefined;
      continue;
    }
    buf.push(line);
  }
  if (open !== undefined) throw new Error("unterminated code fence");
  return out;
}

/** The lines of one `##` section, from its heading to the next `##` heading. */
export function section(markdown: string, heading: string): string {
  const lines = markdown.split("\n");
  const start = lines.indexOf(heading);
  if (start === -1) throw new Error(`no ${heading} section`);
  let end = lines.length;
  for (let i = start + 1; i < lines.length; i += 1) {
    if (lines[i]?.startsWith("## ") === true) {
      end = i;
      break;
    }
  }
  return lines.slice(start + 1, end).join("\n");
}

/** Every backtick-quoted literal in a snippet that holds interchange text. */
export function interchangeLiterals(code: string): string[] {
  const literals: string[] = [];
  for (const match of code.matchAll(/`([^`]*\bISA\*[^`]*)`/g)) {
    const literal = match[1];
    if (literal !== undefined) literals.push(literal);
  }
  return literals;
}

/**
 * The trimmed contents of every fixture committed under `dir`, mapped to its path from `root`.
 * Trailing whitespace is the only normalisation, the same one the README gate applies: a fixture
 * file ends with a newline and a template literal in a markdown block does not.
 */
export function committedFixtureTexts(root: string, dir: string): Map<string, string> {
  const byText = new Map<string, string>();
  const walk = (current: string): void => {
    for (const entry of readdirSync(current, { withFileTypes: true })) {
      const full = join(current, entry.name);
      if (entry.isDirectory()) walk(full);
      else byText.set(readFileSync(full, "utf8").trimEnd(), relative(root, full));
    }
  };
  walk(dir);
  return byText;
}

/**
 * The package names a document tells a reader to install: the first non-flag argument of every
 * `npm install`, `npm i`, `npm add`, `pnpm add`, `pnpm install`, `pnpm i`, `yarn add`, `bun add`
 * or `deno add npm:`, read as a package name, so any `@version` suffix, closing quote or backtick,
 * or sentence-ending full stop is left off. A local path or a protocol specifier (`file:../pkg`,
 * `link:`, `git+https:`) installs whatever that path or URL holds rather than resolving a package
 * name, so it is not a registry specifier and is not read.
 */
export function installSpecifiers(markdown: string): string[] {
  const out: string[] = [];
  const command =
    /\b(?:npm (?:install|add|i)|pnpm (?:add|install|i)|yarn add|bun add|deno add)((?:[ \t]+-{1,2}[\w-]+)*)[ \t]+(?:npm:)?(@?\w[\w.-]*(?:\/[\w.-]+)?)(?![\w.:/+-])/g;
  for (const match of markdown.matchAll(command)) {
    const spec = match[2];
    if (spec !== undefined) out.push(spec.replace(/\.+$/, ""));
  }
  return out;
}
