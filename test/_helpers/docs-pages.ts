import { closeSync, constants, fstatSync, openSync, readFileSync } from "node:fs";
import { dirname, join, sep } from "node:path";

import ts from "typescript";

/**
 * Readers for the docs pages that `test/docs-content.test.ts` holds to the docs-content standard:
 * the anchors a page offers, where a relative link lands, and whether a set of samples compiles
 * against the package's types.
 */

/** A line that opens or closes a fenced code block. */
const FENCE = /^\s*(?:```|~~~)/;

/** An ATX heading: one to six `#`, a space, the text. */
const HEADING = /^#{1,6} (.*)$/;

/**
 * The anchor the docs site gives a heading, as github-slugger computes it: lower-cased, every
 * character that is not a letter, a digit, `_`, a space or a hyphen dropped (code ticks, escapes,
 * parentheses and emoji included), and each space turned into a hyphen.
 */
export function headingSlug(heading: string): string {
  return heading
    .trim()
    .toLowerCase()
    .replace(/[^\p{L}\p{N}_ -]/gu, "")
    .replace(/ /g, "-");
}

/**
 * Every anchor a page offers: one per heading outside fenced code, a repeated slug numbered from
 * `-1` in document order, as the site numbers it.
 */
export function anchorsIn(text: string): Set<string> {
  const anchors = new Set<string>();
  const counts = new Map<string, number>();
  let inFence = false;
  for (const line of text.replace(/\r\n?/g, "\n").split("\n")) {
    if (FENCE.test(line)) {
      inFence = !inFence;
      continue;
    }
    if (inFence) continue;
    const heading = HEADING.exec(line);
    if (heading === null) continue;
    const base = headingSlug(heading[1] ?? "");
    const seen = counts.get(base) ?? 0;
    counts.set(base, seen + 1);
    anchors.add(seen === 0 ? base : `${base}-${String(seen)}`);
  }
  return anchors;
}

/**
 * The text of one regular file, or null when there is none at that path. One descriptor is
 * opened, checked and read, so the file judged regular is the file read, and O_NONBLOCK lets a
 * FIFO named like a page open at once instead of waiting for a writer.
 */
export function readRegularFile(path: string): string | null {
  let fd: number;
  try {
    fd = openSync(path, constants.O_RDONLY | constants.O_NONBLOCK);
  } catch {
    return null;
  }
  try {
    return fstatSync(fd).isFile() ? readFileSync(fd, "utf8") : null;
  } finally {
    closeSync(fd);
  }
}

/** A link from a page into the generated reference: `./api/`, folders, a `.md` page, an anchor. */
const REFERENCE_LINK = /^\.\/api\/((?:(?!\.\.?\/)[^/#]+\/)*[^/#]+\.md)(?:#(.+))?$/;

/** A link to another hand-written page: `./<name>.md`, optionally anchored. */
const PAGE_LINK = /^\.\/([^/#]+\.md)(?:#(.+))?$/;

/**
 * What is wrong with one link target written on a page, or null when nothing is. An absolute URL
 * is not checked here; every other target must name a page that exists, as `./<name>.md` or
 * `./api/<page>.md`, and an anchor must name a heading on that page (or on this one, for `#x`).
 *
 * @param target - The link target as written.
 * @param pages - Each hand-written page's file name mapped to its text.
 * @param self - The file name of the page the link is on.
 * @param docsDir - The docs directory, for reading reference pages.
 */
export function linkFault(
  target: string,
  pages: ReadonlyMap<string, string>,
  self: string,
  docsDir: string,
): string | null {
  if (/^[A-Za-z][A-Za-z0-9+.-]*:/.test(target)) return null;
  if (target.startsWith("#")) {
    const anchors = anchorsIn(pages.get(self) ?? "");
    return anchors.has(target.slice(1)) ? null : "names no heading on this page";
  }
  const reference = REFERENCE_LINK.exec(target);
  if (reference !== null) {
    const text = readRegularFile(join(docsDir, "api", reference[1] ?? ""));
    if (text === null) return "resolves to no page in docs-content/api/";
    const anchor = reference[2];
    if (anchor !== undefined && !anchorsIn(text).has(anchor)) {
      return "names no heading on that reference page";
    }
    return null;
  }
  const page = PAGE_LINK.exec(target);
  if (page === null) return "is not written as ./<name>.md or ./api/<page>.md";
  const text = pages.get(page[1] ?? "");
  if (text === undefined) return "resolves to no page in docs-content/";
  const anchor = page[2];
  if (anchor !== undefined && !anchorsIn(text).has(anchor)) return "names no heading on that page";
  return null;
}

/** The compiler options `first-use.ts` gives a reader's new project. */
const SAMPLE_OPTIONS: ts.CompilerOptions = {
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

/** One sample to compile: a name for the report and its source. */
export interface SampleSource {
  readonly name: string;
  readonly code: string;
}

/**
 * Every TypeScript error the samples raise, as `name line N: TSxxxx message`; empty when all of
 * them compile. Each sample is its own ES module in the repository root, with `pkg` resolved to
 * `entry`, the source file the bundler compiles into the published entry point and its types. One
 * program holds them all, so the package's types are checked once.
 */
export function sampleCompileErrors(
  root: string,
  pkg: string,
  entry: string,
  samples: readonly SampleSource[],
): string[] {
  const options: ts.CompilerOptions = {
    ...SAMPLE_OPTIONS,
    typeRoots: [join(root, "node_modules", "@types")],
    // The package's optional `/arbitraries` subpath sits beside its entry point, as in `src/`.
    paths: {
      [pkg]: [entry],
      [`${pkg}/arbitraries`]: [join(dirname(entry), "arbitraries", "index.ts")],
    },
  };
  const files = new Map<string, SampleSource>();
  // Forward slashes, as the compiler host names every file it asks for: with the backslashes
  // `join` writes on Windows, no name the host asks for would match, and every sample would pass
  // unread.
  samples.forEach((sample, i) =>
    files.set(
      join(root, `docs-sample-${String(i)}.mts`)
        .split(sep)
        .join("/"),
      sample,
    ),
  );
  const host = ts.createCompilerHost(options, true);
  const getSourceFile = host.getSourceFile.bind(host);
  host.getSourceFile = (name, language, onError, create) => {
    const sample = files.get(name);
    return sample !== undefined
      ? ts.createSourceFile(name, sample.code, language, true)
      : getSourceFile(name, language, onError, create);
  };
  const fileExists = host.fileExists.bind(host);
  host.fileExists = (name) => files.has(name) || fileExists(name);
  const readFile = host.readFile.bind(host);
  host.readFile = (name) => files.get(name)?.code ?? readFile(name);
  const program = ts.createProgram([...files.keys()], options, host);
  const errors: string[] = [];
  for (const [file, sample] of files) {
    for (const d of ts.getPreEmitDiagnostics(program, program.getSourceFile(file))) {
      if (d.file?.fileName !== file) continue;
      const line = d.file.getLineAndCharacterOfPosition(d.start ?? 0).line;
      const text = ts.flattenDiagnosticMessageText(d.messageText, " ");
      errors.push(`${sample.name} line ${String(line + 1)}: TS${String(d.code)} ${text}`);
    }
  }
  return errors;
}
