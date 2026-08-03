#!/usr/bin/env node
/**
 * scripts/attw.mjs - the `attw` publish gate, made able to report its own failure.
 *
 * WHY THIS WRAPPER EXISTS. `attw` PRINTS "This package does not contain types."
 * AND EXITS 0. That is not a bug in `attw`: an untyped package is a legitimate
 * npm package, so the CLI treats "no types at all" as a description rather than
 * a problem. From `@arethetypeswrong/cli@0.18.4`, which is the version pinned in
 * this repo's `package.json`, `node_modules/@arethetypeswrong/cli/dist/getExitCode.js`
 * opens with:
 *
 *     export function getExitCode(analysis, opts) {
 *         if (!analysis.types) {
 *             return 0;
 *         }
 *
 * The problem list is read only after that early return, so no `--profile`,
 * `--ignore-rules` or config setting can reach it. For a package that ships
 * types, "does not contain types" does not mean "fine, untyped": it means the
 * declarations were NOT IN THE TARBALL, which is a broken publish. The old
 * `"attw": "attw --pack ."` script reported that as a pass, and its caller read
 * the 0. A false red costs an hour. A FALSE GREEN MERGES.
 *
 * MEASURED IN THIS REPO, WITH NO CONCURRENCY INVOLVED. Both states below print
 * the untyped sentence and exit 0 against `@cosyte/x12` itself, on a quiet box:
 *
 *     rm -rf dist && ./node_modules/.bin/attw --pack .        -> exit 0
 *     rm -f dist/index.d.ts dist/index.d.cts && attw --pack . -> exit 0
 *
 * The second is the state a real build passes through. `tsup` emits the JS in
 * one pass and the declarations in a later one, so every build of this package
 * has an interval where `dist/` holds `.mjs`/`.cjs` and no `.d.ts`. Measured on
 * one clean `pnpm build` of this repo: 1.92 seconds from the first JS entry
 * point appearing to the first declaration file appearing. A concurrent build or
 * a `pnpm clean` in the same working tree lands `attw` inside that interval.
 *
 * SO THE CONDITION IS SUPPLIED BY TIMING, BUT THE DEFECT IS THE EXIT CODE, and
 * that is why the answer here is not a lock, a lease or a build queue. A gate
 * has to be able to say that its own inputs were missing, whatever removed them.
 *
 * TWO NETS. They catch different things, so keep both:
 *
 *   1. PREFLIGHT (structural, no string matching). Every relative artifact path
 *      `package.json` promises (`main`, `module`, `types`, `typings`, and every
 *      string leaf of `exports`) must exist and be non-empty before `attw` runs.
 *      This is the net that catches the build window measured above, and it
 *      names the missing file instead of leaving the reader to work it out.
 *
 *   2. POST-CHECK. If `attw` still reports an untyped package, fail. The
 *      preflight structurally cannot see this case: the declarations can be
 *      present on disk and still be absent from the tarball, because `files` or
 *      `.npmignore` left them out. No instance of that has occurred in this
 *      repo. It is the case `attw --pack` exists to catch, and the point of this
 *      file is that `attw` catches it silently.
 *
 * The post-check matches `attw`'s untyped sentence, an un-styled plain string in
 * `dist/render/untyped.js`. Matching a string is blindable, so the arguments and
 * config that would blind it are REFUSED rather than tolerated (see below).
 * `test/scripts/attw-gate.test.ts` pins both nets against the real binary, so an
 * `attw` upgrade that rewords the sentence or fixes the exit code reds the suite
 * rather than letting the net go quietly slack.
 *
 * BLINDING. FOUR routes were measured against this repo's own `attw` binary,
 * each restoring the exact false green by making the untyped sentence absent
 * from what this script can read: `--quiet`, `--format json`, a `.attw.json`
 * setting either of those (which `readConfig()` applies after argv), and
 * `--config-path` pointed at a file that sets one of them. All are refused
 * below. Bare `attw` exits 0 in all four cases, so refusing them is not a
 * regression against the old script.
 *
 * `--config-path` is worth stating precisely, because the reference this was
 * ported from refused it by inference and said so. Measured here: pointed at a
 * real config setting `quiet`, it blinds the post-check exactly like `.attw.json`
 * does. Pointed at a path that does not exist, it blinds nothing, because
 * `readConfig()` swallows the ENOENT and carries on. The real-file form is the
 * one that blinds, so the test uses it; the test's `refused wholesale` assertion
 * pins the argv path independently of which form is passed.
 *
 * The refusal is BY OPTION NAME, WHOLESALE, NOT BY VALUE. `--format table-flipped`
 * still prints the sentence and blinds nothing, and is refused anyway. That is a
 * deliberate trade: value-parsing these options would be a third moving part in
 * the guard, and being over-strict about a flag nobody passes to a repo's own
 * publish gate costs less than leaving a route back to a false green.
 *
 * Every other argument is forwarded, so `--profile node16` and friends still work.
 */

import { spawnSync } from "node:child_process";
import { readFileSync, statSync } from "node:fs";
import { fileURLToPath } from "node:url";

const ATTW_BIN = fileURLToPath(new URL("../node_modules/.bin/attw", import.meta.url));
const UNTYPED = "This package does not contain types.";
const DECLARATION = /\.d\.[cm]?ts$/;
const args = process.argv.slice(2);

const die = (msg) => {
  process.stderr.write(`\nx attw gate: ${msg}\n`);
  process.exit(1);
};

// ---- Refuse what would blind the post-check --------------------------------
const BLINDING = new Set(["-q", "--quiet", "-f", "--format", "--config-path"]);
const blinding = args.filter((a) => BLINDING.has(a.split("=")[0]));
if (blinding.length > 0) {
  die(
    `${blinding.join(", ")} is refused wholesale, by option name and not by value.\n` +
      `  This gate reads attw's printed output, attw exits 0 on an untyped package,\n` +
      `  and some values of these options hide that output. Run it without them.`,
  );
}
try {
  const config = JSON.parse(readFileSync(".attw.json", "utf8"));
  const set = ["quiet", "format"].filter((k) => k in config);
  if (set.length > 0) {
    die(
      `.attw.json sets ${set.join(", ")}. These keys are refused wholesale, by name and\n` +
        `  not by value: readConfig() applies them after argv, this gate reads attw's\n` +
        `  printed output, and attw exits 0 on an untyped package.`,
    );
  }
} catch {
  // No .attw.json, or unreadable/invalid. attw itself reports the latter.
}

/** Every relative path `package.json` promises to ship, deduped. */
function declaredArtifacts(pkg) {
  const found = new Set();
  const add = (v) => {
    if (typeof v !== "string") return;
    // Skip wildcard subpath patterns (they name a set, not a file) and the
    // manifest itself, which is always in the tarball by definition.
    if (!v.startsWith(".") || v.includes("*") || v === "./package.json") return;
    found.add(v);
  };
  for (const key of ["main", "module", "types", "typings"]) add(pkg[key]);
  const walk = (node) => {
    if (typeof node === "string") add(node);
    else if (node && typeof node === "object") for (const v of Object.values(node)) walk(v);
  };
  walk(pkg.exports);
  return [...found];
}

let pkg;
try {
  pkg = JSON.parse(readFileSync("package.json", "utf8"));
} catch (err) {
  die(`cannot read ./package.json from ${process.cwd()}: ${err.message}`);
}

// ---- Net 1: preflight -------------------------------------------------------
const broken = [];
for (const rel of declaredArtifacts(pkg)) {
  let size;
  try {
    size = statSync(rel).size;
  } catch {
    broken.push({ rel, why: "missing" });
    continue;
  }
  if (size === 0) broken.push({ rel, why: "empty" });
}
if (broken.length > 0) {
  // Only claim the exit-0 counterfactual when a DECLARATION file is among the
  // casualties. With the declarations intact and only JS missing, attw reports
  // no problems at all and still exits 0, which is a different silence.
  const declarationsHit = broken.some(({ rel }) => DECLARATION.test(rel));
  die(
    `package.json promises files the build has not produced:\n` +
      broken.map(({ rel, why }) => `    ${rel} (${why})\n`).join("") +
      `\n  Run the build first. If you DID build, something removed or truncated the\n` +
      `  output underneath this run. A concurrent build or \`clean\` in the same working\n` +
      `  tree will do it, and \`tsup\` writes the JS before the declarations, so there is\n` +
      `  an interval in every build where the .d.ts files do not exist yet.\n` +
      (declarationsHit
        ? `  attw would have reported "${UNTYPED}" and EXITED 0 on this tree.\n`
        : `  attw does not gate these: it analyses types, and exits 0 here.\n`),
  );
}

// ---- Run attw ---------------------------------------------------------------
const res = spawnSync(ATTW_BIN, ["--pack", ".", ...args], {
  encoding: "utf8",
  stdio: ["inherit", "pipe", "pipe"],
});
if (res.error) die(`could not run ${ATTW_BIN}: ${res.error.message}`);
const output = `${res.stdout ?? ""}${res.stderr ?? ""}`;
process.stdout.write(res.stdout ?? "");
process.stderr.write(res.stderr ?? "");
if (res.status !== 0) process.exit(res.status ?? 1);

// ---- Net 2: post-check ------------------------------------------------------
// An empty transcript means the post-check read nothing, by some route not listed
// under BLINDING above. Treat that as a failure rather than a pass: this gate is
// only as good as the output it got to see.
if (output.trim() === "") {
  die(`attw exited 0 but printed nothing, so nothing was checked.`);
}
if (output.includes(UNTYPED)) {
  die(
    `attw reported "${UNTYPED}" and exited 0.\n` +
      `  This package ships types, so that means the tarball did not carry them.\n` +
      `  Check the "files" field and .npmignore. Reported as a failure here because\n` +
      `  attw's own exit code cannot: getExitCode() returns 0 whenever the analysis\n` +
      `  found no types at all, before it ever looks at the problem list.`,
  );
}
