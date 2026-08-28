#!/usr/bin/env tsx
/**
 * `pnpm check:release-caller-permissions` - assert this repo's `Release` caller still grants
 * every `GITHUB_TOKEN` permission scope the shared release pipeline requires, at the strength
 * it requires.
 *
 * WHY THIS EXISTS, AND WHY IT IS A REPO-OWNED CHECK RATHER THAN A COMMENT.
 *
 * `.github/workflows/release.yml` here is a thin caller of
 * `cosyte/.github/.github/workflows/release.yml@main`. A called workflow's token can only be
 * EQUAL TO OR MORE RESTRICTIVE THAN its caller's, never wider. So a calling job that pins a
 * `permissions:` block granting three of the four scopes the shared pipeline declares is
 * granting the fourth as `none`, the callee's request for it is an ELEVATION, and GitHub
 * refuses the WHOLE workflow at startup: no jobs, no steps, no logs, and no refusal printed
 * anywhere. The run just reads `startup_failure` after about a second.
 *
 * That is the failure this file reds on, and the point is that it reds HERE, on a pull
 * request, in a check that says which scope is missing, instead of silently on the next push
 * to the default branch in a run that cannot explain itself. The grant went missing exactly
 * once already, when the shared pipeline added `actions: read` to its own `permissions:` and
 * this caller had not yet been given it.
 *
 * WHAT IT DOES NOT DO. It compares the caller against a FIXED list transcribed from the
 * shared pipeline (`REQUIRED_CALLER_PERMISSIONS` below), because this suite is offline and
 * deriving the list live would mean a network read from a unit test. If the shared pipeline
 * ever requires a FIFTH scope, this check still passes and the next push still produces the
 * same logless `startup_failure`. Adopting a new version of that file means re-reading its
 * `permissions:` block and updating the list below FIRST, which is the ordering its own
 * header ("THE CALLER-SIDE PRECONDITION") already asks callers to follow.
 *
 * Exported so `test/scripts/release-caller-permissions.test.ts` runs it on every `pnpm test`,
 * and so its failure shapes can be driven with workflow text this repo does not ship: a gate
 * that can only be run on the real file cannot be shown to fail.
 *
 * Exit codes: 0 (the caller grants everything required), 1 (it does not, or the caller could
 * not be read).
 */

import { readFileSync } from "node:fs";
import { join } from "node:path";

/** Repo-relative path of the `Release` caller this check reads. */
export const RELEASE_CALLER_PATH = ".github/workflows/release.yml";

/**
 * The shared reusable workflow, WITHOUT its git ref.
 *
 * Matched ref-blind on purpose. Every caller in the org pins `@main`, that is the org's
 * chosen distribution model, and hard-coding the ref here would turn a deliberate ref change
 * into "no job calls the shared pipeline" rather than into a permissions answer.
 */
export const SHARED_RELEASE_WORKFLOW = "cosyte/.github/.github/workflows/release.yml";

/** One scope the shared pipeline declares, and the strength the caller has to grant. */
export interface RequiredPermission {
  /** The `permissions:` key, spelled as GitHub spells it. */
  readonly scope: string;
  /** The weakest value that satisfies the shared pipeline. */
  readonly level: "read" | "write";
  /** What the shared pipeline uses it for, quoted into the failure so a red explains itself. */
  readonly purpose: string;
}

/**
 * The four scopes the shared release pipeline declares, transcribed from its own
 * `permissions:` block at `cosyte/.github` sha `966b1cc2`.
 *
 * THIS LIST IS THE CONTRACT AND IT IS MAINTAINED BY HAND. See "WHAT IT DOES NOT DO" above:
 * a fifth scope added upstream is invisible to this check until someone adds it here.
 */
export const REQUIRED_CALLER_PERMISSIONS: readonly RequiredPermission[] = [
  {
    scope: "actions",
    level: "read",
    purpose: "the shared pipeline reads this caller's `release` environment protection with it",
  },
  { scope: "contents", level: "write", purpose: "create tags and the GitHub release" },
  { scope: "id-token", level: "write", purpose: "npm provenance" },
  { scope: "pull-requests", level: "write", purpose: 'open the "Version Packages" PR' },
];

/** GitHub's permission values, ordered weakest first, so "at least as strong as" is a compare. */
const PERMISSION_STRENGTH: ReadonlyMap<string, number> = new Map([
  ["none", 0],
  ["read", 1],
  ["write", 2],
]);

/**
 * The blanket forms a `permissions:` SCALAR can take, and what each grants every scope.
 *
 * `permissions: write-all` really does satisfy this pipeline, so refusing it would be a false
 * red. It is not recommended (it is the opposite of least privilege), but this check answers
 * "is the grant sufficient", not "is the grant minimal".
 */
const BLANKET_PERMISSIONS: ReadonlyMap<string, string> = new Map([
  ["write-all", "write"],
  ["read-all", "read"],
  ["{}", "none"],
]);

// ---------------------------------------------------------------------------------------
// A deliberately small YAML reader.
//
// This package has ZERO runtime dependencies and adding a YAML parser to devDependencies for
// one check is a bigger change than the check. So the reader below models only the subset a
// workflow caller is written in: block mappings of scalars, block and flow sequences read
// OPAQUELY (nothing this check needs lives inside one), and block scalars skipped whole.
//
// IT REFUSES WHAT IT CANNOT RESOLVE, AND THAT DIRECTION IS THE POINT. A workflow written in
// a YAML shape this subset does not model reds and names the line, rather than parsing to
// something partial and reporting a permissions answer computed from it. A false refusal is
// visible and one edit away; a false pass is the logless startup failure this file exists to
// prevent.
// ---------------------------------------------------------------------------------------

/** A block mapping: what a workflow file, a job, and a `permissions:` block each read as. */
type YamlMapping = ReadonlyMap<string, YamlValue>;

/** Anything the reader can produce. Sequences are opaque: each item is its raw text. */
type YamlValue = string | YamlMapping | readonly string[];

/** Raised when the reader cannot resolve the text into the subset above. */
class UnreadableWorkflow extends Error {
  public constructor(message: string) {
    super(message);
    this.name = "UnreadableWorkflow";
  }
}

/** One significant line: comments, blanks and the document marker are already gone. */
interface SourceLine {
  /** Count of leading spaces. */
  readonly indent: number;
  /** The line with surrounding whitespace removed. */
  readonly text: string;
  /** 1-based line number in the original file, for the refusal message. */
  readonly number: number;
}

/** A position in the line list, threaded through the recursive descent below. */
interface Cursor {
  index: number;
}

const KEY_LINE = /^(?<key>"[^"]*"|'[^']*'|[^\s#"'][^:#]*?)\s*:(?:[ \t]+(?<value>.*))?$/u;
const BLOCK_SCALAR = /^[|>][+-]?\d*$/u;

/** True for a block-sequence item line (`- x` or a bare `-`). */
function isSequenceItem(text: string): boolean {
  return text === "-" || text.startsWith("- ");
}

/** Drop the surrounding quotes from a scalar, if it has a matching pair. */
function unquote(value: string): string {
  if (value.length < 2) return value;
  const first = value[0];
  const last = value[value.length - 1];
  if ((first === '"' && last === '"') || (first === "'" && last === "'")) {
    return value.slice(1, -1);
  }
  return value;
}

/** Drop a trailing ` # comment` from a scalar, leaving a quoted value's own `#` alone. */
function stripComment(raw: string): string {
  const value = raw.trim();
  if (value.startsWith("#")) return "";
  const quote = value[0];
  if (quote === '"' || quote === "'") {
    const close = value.indexOf(quote, 1);
    if (close === -1) return value;
    const after = value.slice(close + 1).trim();
    if (after === "" || after.startsWith("#")) return value.slice(0, close + 1);
    return value;
  }
  const comment = value.search(/\s#/u);
  return comment === -1 ? value : value.slice(0, comment).trim();
}

/** The significant lines of `source`, refusing tab indentation (which YAML forbids). */
function significantLines(source: string): readonly SourceLine[] {
  const lines: SourceLine[] = [];
  const raw = source.split(/\r?\n/u);
  for (let i = 0; i < raw.length; i += 1) {
    const line = raw[i] ?? "";
    const trimmed = line.trim();
    if (trimmed === "" || trimmed.startsWith("#") || trimmed === "---" || trimmed === "...") {
      continue;
    }
    const indent = line.length - line.trimStart().length;
    if (line.slice(0, indent).includes("\t")) {
      throw new UnreadableWorkflow(`line ${String(i + 1)} indents with a tab, which YAML forbids`);
    }
    lines.push({ indent, text: trimmed, number: i + 1 });
  }
  return lines;
}

/** Consume every line indented deeper than `indent` without interpreting any of it. */
function skipDeeperLines(lines: readonly SourceLine[], cursor: Cursor, indent: number): void {
  while (cursor.index < lines.length) {
    const line = lines[cursor.index];
    if (line === undefined || line.indent <= indent) return;
    cursor.index += 1;
  }
}

/** Read a block sequence at `indent`, one opaque string per item. */
function readSequence(
  lines: readonly SourceLine[],
  cursor: Cursor,
  indent: number,
): readonly string[] {
  const items: string[] = [];
  while (cursor.index < lines.length) {
    const line = lines[cursor.index];
    if (line === undefined || line.indent !== indent || !isSequenceItem(line.text)) break;
    cursor.index += 1;
    const head = line.text === "-" ? "" : stripComment(line.text.slice(1).trim());
    const nested: string[] = [];
    while (cursor.index < lines.length) {
      const inner = lines[cursor.index];
      if (inner === undefined || inner.indent <= indent) break;
      nested.push(inner.text);
      cursor.index += 1;
    }
    items.push(nested.length === 0 ? unquote(head) : [head, ...nested].join(" ").trim());
  }
  return items;
}

/** Read the value of a `key:` entry: an inline scalar, or the block underneath it. */
function readValue(
  lines: readonly SourceLine[],
  cursor: Cursor,
  keyIndent: number,
  inline: string | undefined,
): YamlValue {
  const scalar = inline === undefined ? "" : stripComment(inline);
  if (BLOCK_SCALAR.test(scalar)) {
    skipDeeperLines(lines, cursor, keyIndent);
    return "";
  }
  if (scalar !== "") return unquote(scalar);

  const next = lines[cursor.index];
  if (next === undefined) return "";
  // A block sequence may sit at its parent key's own indentation, which is why this is not
  // simply "anything deeper".
  if (next.indent === keyIndent && isSequenceItem(next.text)) {
    return readSequence(lines, cursor, keyIndent);
  }
  if (next.indent <= keyIndent) return "";
  if (isSequenceItem(next.text)) return readSequence(lines, cursor, next.indent);
  return readMapping(lines, cursor, next.indent);
}

/** Read a block mapping at `indent`, stopping at the first line that is not one of its keys. */
function readMapping(lines: readonly SourceLine[], cursor: Cursor, indent: number): YamlMapping {
  const mapping = new Map<string, YamlValue>();
  while (cursor.index < lines.length) {
    const line = lines[cursor.index];
    if (line === undefined || line.indent < indent) break;
    if (line.indent > indent) {
      throw new UnreadableWorkflow(
        `line ${String(line.number)} is indented deeper than the mapping it belongs to`,
      );
    }
    if (isSequenceItem(line.text)) break;
    const match = KEY_LINE.exec(line.text);
    const key = match?.groups?.["key"];
    if (key === undefined) {
      throw new UnreadableWorkflow(
        `line ${String(line.number)} is not a "key: value" mapping entry`,
      );
    }
    cursor.index += 1;
    mapping.set(unquote(key.trim()), readValue(lines, cursor, indent, match?.groups?.["value"]));
  }
  return mapping;
}

/** Read a whole workflow file. Throws {@link UnreadableWorkflow} on anything outside the subset. */
function readWorkflow(source: string): YamlMapping {
  const lines = significantLines(source);
  if (lines.length === 0) throw new UnreadableWorkflow("it holds no YAML, only blanks or comments");
  const first = lines[0];
  if (first === undefined || first.indent !== 0) {
    throw new UnreadableWorkflow("it does not begin with a top-level mapping key");
  }
  const cursor: Cursor = { index: 0 };
  const workflow = readMapping(lines, cursor, 0);
  const leftover = lines[cursor.index];
  if (leftover !== undefined) {
    throw new UnreadableWorkflow(
      `line ${String(leftover.number)} could not be read as part of the top-level mapping`,
    );
  }
  return workflow;
}

/** Narrow a read value to a mapping without a cast. */
function isMapping(value: YamlValue | undefined): value is YamlMapping {
  return value instanceof Map;
}

/** True if `job` delegates to the shared release pipeline, whatever git ref it pins. */
function callsSharedPipeline(job: YamlMapping): boolean {
  const uses = job.get("uses");
  if (typeof uses !== "string") return false;
  return uses.split("@")[0] === SHARED_RELEASE_WORKFLOW;
}

/** Every job in `workflow` that calls the shared release pipeline, by job id. */
function sharedPipelineCallers(workflow: YamlMapping): readonly (readonly [string, YamlMapping])[] {
  const jobs = workflow.get("jobs");
  if (!isMapping(jobs)) return [];
  const callers: (readonly [string, YamlMapping])[] = [];
  for (const [jobId, job] of jobs) {
    if (isMapping(job) && callsSharedPipeline(job)) callers.push([jobId, job]);
  }
  return callers;
}

/** The scopes one calling job fails to grant, each named, at the strength it is short by. */
function jobPermissionFailures(
  jobId: string,
  job: YamlMapping,
  workflowPath: string,
): readonly string[] {
  const where = `${workflowPath}, job "${jobId}"`;
  const granted = job.get("permissions");

  if (granted === undefined || granted === "") {
    return REQUIRED_CALLER_PERMISSIONS.map(
      ({ scope, level }) =>
        `${where} grants no permission scopes at all (it has no \`permissions:\` block, or an ` +
        `empty one), so it does not grant \`${scope}\`; the shared release pipeline requires ` +
        `\`${scope}: ${level}\`.`,
    );
  }

  if (typeof granted === "string") {
    const blanket = BLANKET_PERMISSIONS.get(granted.trim());
    if (blanket === undefined) {
      return [
        `${where} sets \`permissions: ${granted}\`, which is not a permission set this check ` +
          `understands; write the four scopes out.`,
      ];
    }
    const have = PERMISSION_STRENGTH.get(blanket) ?? 0;
    return REQUIRED_CALLER_PERMISSIONS.filter(
      ({ level }) => have < (PERMISSION_STRENGTH.get(level) ?? 0),
    ).map(
      ({ scope, level }) =>
        `${where} sets \`permissions: ${granted}\`, which grants \`${scope}: ${blanket}\`, ` +
        `weaker than the \`${scope}: ${level}\` the shared release pipeline requires.`,
    );
  }

  if (!isMapping(granted)) {
    return [`${where} has a \`permissions:\` value that is not a mapping of scope to level.`];
  }

  const failures: string[] = [];
  for (const { scope, level, purpose } of REQUIRED_CALLER_PERMISSIONS) {
    const required = PERMISSION_STRENGTH.get(level) ?? 0;
    const value = granted.get(scope);
    if (value === undefined) {
      failures.push(
        `${where} does not grant \`${scope}\`; the shared release pipeline requires ` +
          `\`${scope}: ${level}\` (${purpose}). A pinned block that omits a scope grants it as ` +
          `\`none\`, and the callee's request for it is then an elevation GitHub refuses at ` +
          `workflow startup, with no jobs and no logs.`,
      );
      continue;
    }
    if (typeof value !== "string") {
      failures.push(`${where} grants \`${scope}\` a value that is not a permission level.`);
      continue;
    }
    const have = PERMISSION_STRENGTH.get(value.trim());
    if (have === undefined) {
      failures.push(
        `${where} grants \`${scope}: ${value}\`, which is not one of none, read or write.`,
      );
      continue;
    }
    if (have < required) {
      failures.push(
        `${where} grants \`${scope}: ${value.trim()}\`, weaker than the \`${scope}: ${level}\` ` +
          `the shared release pipeline requires (${purpose}). A caller may only narrow the ` +
          `token it hands the callee, never widen it, so this is refused at workflow startup.`,
      );
    }
  }
  return failures;
}

/**
 * Every reason `source` is not an adequate `Release` caller. Empty means it is adequate.
 *
 * Pure over its inputs so the failure shapes can be driven with text this repo does not ship.
 * `workflowPath` is named in every message, including the ones raised because the text could
 * not be read at all: a check that cannot say which file it failed on is a check nobody can
 * act on, and one that passes because it found nothing to inspect is worse than absent.
 */
export function releaseCallerPermissionFailures(
  source: string,
  workflowPath: string = RELEASE_CALLER_PATH,
): readonly string[] {
  let workflow: YamlMapping;
  try {
    workflow = readWorkflow(source);
  } catch (error) {
    const reason = error instanceof Error ? error.message : "the reason was not an Error";
    return [`${workflowPath} could not be read as a workflow: ${reason}.`];
  }

  const callers = sharedPipelineCallers(workflow);
  if (callers.length === 0) {
    return [
      `${workflowPath} could not be read as a caller of the shared release pipeline: no job in ` +
        `it has \`uses: ${SHARED_RELEASE_WORKFLOW}@<ref>\`. Either this repo no longer delegates ` +
        `releases, in which case delete this check with it, or the file moved and nothing is ` +
        `checking the permission grant any more.`,
    ];
  }

  return callers.flatMap(([jobId, job]) => jobPermissionFailures(jobId, job, workflowPath));
}

/**
 * Run the check against a checkout. Empty means the caller in `repoRoot` grants everything.
 *
 * A missing or unreadable file is a FAILURE naming the path, never a pass: the whole point is
 * that nothing is silently unchecked.
 */
export function checkReleaseCallerPermissions(repoRoot: string): readonly string[] {
  let source: string;
  try {
    source = readFileSync(join(repoRoot, RELEASE_CALLER_PATH), "utf8");
  } catch (error) {
    const reason = error instanceof Error ? error.message : "the reason was not an Error";
    return [`${RELEASE_CALLER_PATH} could not be read: ${reason}.`];
  }
  return releaseCallerPermissionFailures(source, RELEASE_CALLER_PATH);
}

/** CLI entry point. */
function main(): void {
  const failures = checkReleaseCallerPermissions(join(import.meta.dirname, ".."));
  if (failures.length > 0) {
    process.stderr.write("Release caller permission check FAILED:\n");
    for (const failure of failures) process.stderr.write(`  x ${failure}\n`);
    process.stderr.write(
      "\nThe shared pipeline states the rule in its own header, under THE CALLER-SIDE\n" +
        "PRECONDITION: grant the scope in the caller FIRST, adopt the pipeline second.\n",
    );
    process.exit(1);
  }
  process.stdout.write(
    `OK ${RELEASE_CALLER_PATH} grants all ` +
      `${String(REQUIRED_CALLER_PERMISSIONS.length)} scopes the shared release pipeline requires\n`,
  );
}

// Run only as a CLI, never on import (the test imports the functions above).
if (import.meta.url === `file://${process.argv[1] ?? ""}`) {
  main();
}
