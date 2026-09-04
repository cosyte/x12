/**
 * The release-prep gate for `0.1.0`.
 *
 * It reads `docs/releases/0.1.0-readiness.md` and the repository beside it, and
 * fails when the two disagree: an unaudited changeset, an audit row whose
 * classification is not the bump the changeset file declares, a resolved next
 * version that is not `0.1.0`, an export the inventory does not list, a break
 * candidate with no disposition, a premature version bump, or X12 message
 * content pasted into the document as evidence.
 *
 * TWO DISCIPLINES THIS FILE IS WRITTEN UNDER, both load-bearing.
 *
 *   1. THE UNHAPPY PATHS ARE DRIVEN FROM FIXTURES THIS FILE BUILDS, never by
 *      mutating `.changeset/`, `package.json` or the document. Every check is a
 *      pure function over a `RepoState`, so a failure case is a constructed
 *      state and the repository is only ever read.
 *
 *   2. NO LITERAL SEGMENT TEXT LIVES IN THIS FILE. `test/**` is inside the PHI
 *      scanner's walk roots and inside its `--staged` pre-commit route, so a
 *      literal interchange here would either red that gate or be "fixed" with a
 *      global, route-blind allow-list entry. The one fixture that must LOOK
 *      like a segment, so the AC8 control proves the detector rather than
 *      assuming it, is assembled at runtime by {@link seg} - the same shape
 *      `test/scripts/phi-scan.test.ts` uses, and for the same reason.
 */

import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import ts from "typescript";
import { describe, expect, it } from "vitest";

const ROOT = join(import.meta.dirname, "..", "..");

/** Path the check expects the readiness document at, relative to the repo root. */
const DOCUMENT_PATH = "docs/releases/0.1.0-readiness.md";

/** Directory holding the pending changesets. */
const CHANGESET_DIR = ".changeset";

/** The package every pending changeset declares a bump for. */
const PACKAGE_NAME = "@cosyte/x12";

/** The version this document prepares. */
const PREPARED_VERSION = "0.1.0";

/** The band the manifest must still be in: this spec prepares, it never bumps. */
const MANIFEST_BAND = /^0\.0\.\d+$/;

/** The two bump keywords a `0.1.0` release admits. Anything else is a failure. */
const BUMPS = ["minor", "patch"] as const;

type Bump = (typeof BUMPS)[number];

/** The dispositions a break-candidate row may carry. */
const DISPOSITIONS = ["accepted-for-0.1.0", "deferred"] as const;

/** The kinds of change a break-candidate row may record. */
const CHANGE_KINDS = ["removal", "rename", "signature", "behavior"] as const;

type ChangeKind = (typeof CHANGE_KINDS)[number];

/** The four sections the document must carry, in the order a reader meets them. */
const REQUIRED_SECTIONS = [
  "Changeset audit",
  "Public API inventory",
  "Break candidates",
  "Release notes",
] as const;

/** Column headers the changeset-audit table must carry, in order. */
const AUDIT_COLUMNS = ["Changeset", "Bump", "Breaks", "Justification"] as const;

/** Column headers the break-candidate table must carry, in order. */
const BREAK_COLUMNS = ["Name", "Change", "Changeset", "Disposition", "Detail"] as const;

/** The sentinel a section uses to state, completely, that it has no rows. */
const NONE_SENTINEL = "None.";

// ---------------------------------------------------------------------------
// Inputs
// ---------------------------------------------------------------------------

/** One pending changeset file: its name without the `.md`, and its whole text. */
interface PendingChangeset {
  readonly name: string;
  readonly text: string;
}

/**
 * Everything the check reads. The real repository produces one of these and so
 * does every fixture, which is what keeps the unhappy paths off the real tree.
 */
interface RepoState {
  readonly documentPath: string;
  /** `undefined` means absent or unreadable, which AC11 turns into a failure. */
  readonly document: string | undefined;
  readonly changesets: readonly PendingChangeset[];
  readonly manifestVersion: string;
  readonly exportedNames: readonly string[];
}

// ---------------------------------------------------------------------------
// Small parsers
// ---------------------------------------------------------------------------

function compareText(a: string, b: string): number {
  return a < b ? -1 : a > b ? 1 : 0;
}

function isBump(value: string): value is Bump {
  return BUMPS.some((bump) => bump === value);
}

function isChangeKind(value: string): value is ChangeKind {
  return CHANGE_KINDS.some((kind) => kind === value);
}

/** The text inside a cell that is exactly one inline-code span, else `undefined`. */
function codeSpan(cell: string): string | undefined {
  const match = /^`([^`]+)`$/.exec(cell.trim());
  return match?.[1];
}

interface ParsedChangeset {
  readonly name: string;
  readonly bump: Bump;
}

/**
 * Read one changeset's declared bump, or return the failure message naming the
 * file. Nothing here silently skips: a file in the changeset directory that is
 * not a parseable changeset is a named failure, and that includes a `major`
 * declaration, which is not a valid bump for this release.
 */
function parseChangeset(changeset: PendingChangeset): ParsedChangeset | string {
  const file = `${CHANGESET_DIR}/${changeset.name}.md`;
  const lines = changeset.text.split(/\r?\n/);
  if (lines[0] !== "---") {
    return `${file}: not a changeset - frontmatter is missing, the first line must be "---".`;
  }
  const close = lines.indexOf("---", 1);
  if (close === -1) {
    return `${file}: malformed changeset - the frontmatter is never closed with "---".`;
  }
  const declarations = lines.slice(1, close).filter((line) => line.trim() !== "");
  const own = declarations.filter((line) => line.trim().startsWith(`"${PACKAGE_NAME}"`));
  if (own.length !== 1) {
    return `${file}: expected exactly one "${PACKAGE_NAME}" bump declaration, found ${own.length}.`;
  }
  const declaration = own[0] ?? "";
  const match = /^\s*"([^"]+)"\s*:\s*([A-Za-z-]+)\s*$/.exec(declaration);
  if (match === undefined || match === null) {
    return `${file}: malformed bump declaration ${JSON.stringify(declaration.trim())}.`;
  }
  const bump = match[2] ?? "";
  if (!isBump(bump)) {
    return (
      `${file}: declares bump "${bump}", which is neither "minor" nor "patch". ` +
      `${PREPARED_VERSION} admits no other bump, so this is a named failure and not a downgrade.`
    );
  }
  return { name: changeset.name, bump };
}

/**
 * The version the pending bumps resolve the manifest version to, matching the
 * rule this repository's own Changesets applies: the highest bump wins, and a
 * `minor` on any `0.0.x` lands on `0.1.0`.
 */
function resolveNextVersion(current: string, bumps: readonly Bump[]): string | undefined {
  const match = /^(\d+)\.(\d+)\.(\d+)$/.exec(current);
  if (match === undefined || match === null) return undefined;
  const [, majorText = "", minorText = "", patchText = ""] = match;
  const major = Number(majorText);
  const minor = Number(minorText);
  const patch = Number(patchText);
  if (bumps.includes("minor")) return `${major}.${minor + 1}.0`;
  if (bumps.includes("patch")) return `${major}.${minor}.${patch + 1}`;
  return undefined;
}

interface TableRow {
  readonly cells: readonly string[];
  readonly ordinal: number;
}

interface ParsedTable {
  readonly header: readonly string[];
  readonly rows: readonly TableRow[];
}

function splitCells(line: string): readonly string[] | undefined {
  const trimmed = line.trim();
  if (!trimmed.startsWith("|") || !trimmed.endsWith("|") || trimmed.length < 2) return undefined;
  return trimmed
    .slice(1, -1)
    .split("|")
    .map((cell) => cell.trim());
}

/** The first pipe table in a section, or `undefined` when it carries none. */
function parseTable(lines: readonly string[]): ParsedTable | undefined {
  const start = lines.findIndex((line) => line.trim().startsWith("|"));
  if (start === -1) return undefined;
  const block: string[] = [];
  for (let i = start; i < lines.length; i += 1) {
    const line = lines[i] ?? "";
    if (!line.trim().startsWith("|")) break;
    block.push(line);
  }
  const header = splitCells(block[0] ?? "");
  const divider = splitCells(block[1] ?? "");
  if (header === undefined || divider === undefined) return undefined;
  if (!divider.every((cell) => /^:?-{3,}:?$/.test(cell))) return undefined;
  const rows = block.slice(2).map((line, index) => ({
    cells: splitCells(line) ?? [],
    ordinal: index + 1,
  }));
  return { header, rows };
}

interface DocumentShape {
  readonly preamble: readonly string[];
  readonly sections: ReadonlyMap<string, readonly string[]>;
  readonly duplicated: readonly string[];
}

function splitSections(document: string): DocumentShape {
  const lines = document.split(/\r?\n/);
  const sections = new Map<string, string[]>();
  const duplicated: string[] = [];
  const preamble: string[] = [];
  let current: string[] | undefined;
  for (const line of lines) {
    const heading = /^##\s+(.+?)\s*$/.exec(line);
    if (heading !== null && !line.startsWith("###")) {
      const name = heading[1] ?? "";
      if (sections.has(name)) duplicated.push(name);
      current = [];
      sections.set(name, current);
      continue;
    }
    if (current === undefined) preamble.push(line);
    else current.push(line);
  }
  return { preamble, sections, duplicated };
}

/** Bullet lines of the form `` - `name` ``, in document order. */
function codeBullets(lines: readonly string[]): readonly string[] {
  const names: string[] = [];
  for (const line of lines) {
    const match = /^-\s+`([^`]+)`\s*$/.exec(line);
    if (match !== null) names.push(match[1] ?? "");
  }
  return names;
}

/** Bullet lines of the form `` - `name`: text ``, in document order. */
function codeNotes(lines: readonly string[]): readonly { name: string; text: string }[] {
  const notes: { name: string; text: string }[] = [];
  for (const line of lines) {
    const match = /^-\s+`([^`]+)`:\s*(.*)$/.exec(line);
    if (match !== null) notes.push({ name: match[1] ?? "", text: (match[2] ?? "").trim() });
  }
  return notes;
}

/** The lines under a `###` sub-heading within a section, up to the next one. */
function subSection(lines: readonly string[], heading: string): readonly string[] | undefined {
  const start = lines.findIndex((line) => line.trim() === `### ${heading}`);
  if (start === -1) return undefined;
  const body: string[] = [];
  for (let i = start + 1; i < lines.length; i += 1) {
    const line = lines[i] ?? "";
    if (line.trim().startsWith("### ")) break;
    body.push(line);
  }
  return body;
}

function statesNone(lines: readonly string[]): boolean {
  return lines.some((line) => line.trim() === NONE_SENTINEL);
}

// ---------------------------------------------------------------------------
// AC8: X12 message content in a delimited-segment position
// ---------------------------------------------------------------------------

/**
 * Envelope, transaction-set and body segment identifiers a pasted transaction
 * would open with. Held as a list rather than spelled into a regex literal so
 * this file never carries a segment shape of its own.
 */
const SEGMENT_IDS = [
  "ISA",
  "GS",
  "GE",
  "ST",
  "SE",
  "IEA",
  "TA1",
  "NM1",
  "HL",
  "CLP",
  "SVC",
  "AMT",
  "DTP",
  "REF",
  "EQ",
  "AAA",
] as const;

/**
 * The conventional element separator plus the component and repetition
 * characters this library treats as delimiters. A segment identifier only
 * counts when one of these follows it IMMEDIATELY.
 */
const ELEMENT_SEPARATORS = "*|^:+";

/**
 * A segment identifier counts only in a DELIMITED-SEGMENT POSITION: at the
 * start of a line, after a segment terminator, or after a markdown cell
 * boundary, and followed by an element separator with nothing in between.
 *
 * A bare search for the identifiers would be useless in the document it
 * guards, which has to be free to name `X12_TR3_CONFORMANCE`, to quote a TR3
 * identifier, and to write the letters of a segment id inside ordinary words.
 * AC8 grants exactly that: the document may name export identifiers, version
 * strings and changeset summaries. The discriminator is the POSITION, and an
 * identifier written inside backticks or followed by a space is never in one.
 */
function segmentHits(document: string): readonly string[] {
  const pattern = new RegExp(
    `(?:^|[\\r\\n~|])[ \\t]*(${SEGMENT_IDS.join("|")})([${ELEMENT_SEPARATORS}])`,
    "g",
  );
  const hits: string[] = [];
  for (const match of document.matchAll(pattern)) {
    const line = document.slice(0, match.index).split(/\r?\n/).length;
    hits.push(`line ${line}: segment ${match[1] ?? ""} followed by ${match[2] ?? ""}`);
  }
  return hits;
}

// ---------------------------------------------------------------------------
// The check
// ---------------------------------------------------------------------------

/**
 * Every criterion in one pass, appending one message per divergence. It is long
 * on purpose: each block is one acceptance criterion, and splitting it would
 * scatter the failure messages the criteria are graded on.
 */
function checkReleasePrep(state: RepoState): readonly string[] {
  const failures: string[] = [];

  // AC11 - an absent or unreadable document is a failure naming the path.
  if (state.document === undefined) {
    return [
      `readiness document not found: expected a readable file at ${state.documentPath}. ` +
        `There is nothing to compare, which is a failure and not a pass.`,
    ];
  }
  const document = state.document;

  // AC7 - the manifest must still be in the band this release prepares from.
  if (!MANIFEST_BAND.test(state.manifestVersion)) {
    failures.push(
      `package manifest version is "${state.manifestVersion}", outside the 0.0.x band. ` +
        `The release run performs the bump; this document only prepares it.`,
    );
  }

  // AC10 - every file in the changeset location must parse, or be named.
  const ordered = [...state.changesets].sort((a, b) => compareText(a.name, b.name));
  const parsed: ParsedChangeset[] = [];
  const parseFailures: string[] = [];
  for (const changeset of ordered) {
    const result = parseChangeset(changeset);
    if (typeof result === "string") parseFailures.push(result);
    else parsed.push(result);
  }
  if (parseFailures.length > 0) return [...failures, ...parseFailures];

  // AC9 - a vacuously complete audit is not a pass.
  if (parsed.length === 0) {
    failures.push(
      `no pending changeset found in ${CHANGESET_DIR}/: ${PREPARED_VERSION} cannot be prepared ` +
        `without at least one "minor" changeset.`,
    );
    return failures;
  }

  // AC3 - the pending changesets must resolve the manifest to exactly 0.1.0.
  const bumps = parsed.map((entry) => entry.bump);
  const resolved = resolveNextVersion(state.manifestVersion, bumps);
  if (resolved !== PREPARED_VERSION) {
    failures.push(
      `the pending changesets resolve ${state.manifestVersion} to ` +
        `${resolved ?? "no version at all"}, not ${PREPARED_VERSION}. ` +
        `A release must not go out under a version number nobody chose.`,
    );
  }

  // AC13 - the four sections the criteria depend on.
  const shape = splitSections(document);
  for (const name of REQUIRED_SECTIONS) {
    if (!shape.sections.has(name)) failures.push(`readiness document has no "## ${name}" section.`);
  }
  for (const name of shape.duplicated) {
    failures.push(`readiness document repeats the "## ${name}" section.`);
  }

  // AC8 - no X12 message content anywhere in the document.
  for (const hit of segmentHits(document)) {
    failures.push(
      `readiness document carries X12 message content at ${hit}. ` +
        `Name identifiers inside backticks; never paste a transaction as evidence.`,
    );
  }

  // T1 - the two versions the document states must be the two that are true.
  const preparedDeclared = /^-\s+Version prepared:\s+`([^`]+)`\s*$/m.exec(document)?.[1];
  if (preparedDeclared !== PREPARED_VERSION) {
    failures.push(
      `readiness document states the prepared version as ` +
        `${preparedDeclared === undefined ? "nothing at all" : `"${preparedDeclared}"`}, ` +
        `not "${PREPARED_VERSION}".`,
    );
  }
  const manifestDeclared =
    /^-\s+Version currently recorded in the package manifest:\s+`([^`]+)`\s*$/m.exec(document)?.[1];
  if (manifestDeclared !== state.manifestVersion) {
    failures.push(
      `readiness document states the manifest version as ` +
        `${manifestDeclared === undefined ? "nothing at all" : `"${manifestDeclared}"`}, ` +
        `but package.json says "${state.manifestVersion}".`,
    );
  }

  const auditLines = shape.sections.get(REQUIRED_SECTIONS[0]) ?? [];
  const inventoryLines = shape.sections.get(REQUIRED_SECTIONS[1]) ?? [];
  const breakLines = shape.sections.get(REQUIRED_SECTIONS[2]) ?? [];
  const notesLines = shape.sections.get(REQUIRED_SECTIONS[3]) ?? [];

  // --- Changeset audit: AC1, AC2, AC7 -------------------------------------
  const audit = parseTable(auditLines);
  const declaredBumps = new Map<string, Bump>();
  const declaredBreaks: { name: string; changeset: string }[] = [];
  if (audit === undefined) {
    failures.push(`the changeset audit carries no table.`);
  } else if (audit.header.join(" | ") !== AUDIT_COLUMNS.join(" | ")) {
    failures.push(
      `the changeset audit's columns are "${audit.header.join(" | ")}", ` +
        `expected "${AUDIT_COLUMNS.join(" | ")}".`,
    );
  } else {
    const seen = new Set<string>();
    for (const row of audit.rows) {
      if (row.cells.length !== AUDIT_COLUMNS.length) {
        failures.push(
          `changeset audit row ${row.ordinal} has ${row.cells.length} cells, ` +
            `expected ${AUDIT_COLUMNS.length}.`,
        );
        continue;
      }
      const [nameCell = "", bumpCell = "", breaksCell = "", justification = ""] = row.cells;
      const name = codeSpan(nameCell);
      if (name === undefined) {
        failures.push(`changeset audit row ${row.ordinal} does not name a changeset in backticks.`);
        continue;
      }
      if (seen.has(name)) {
        failures.push(`the changeset audit lists "${name}" more than once.`);
        continue;
      }
      seen.add(name);

      // AC2 - the classification must be a bump keyword, and the SAME one the
      // file declares. The row cannot say "minor" over a file that says "patch".
      const classification = codeSpan(bumpCell);
      const declared = parsed.find((entry) => entry.name === name);
      if (classification === undefined || !isBump(classification)) {
        failures.push(
          `changeset audit row for "${name}" classifies it as ` +
            `${classification === undefined ? "nothing" : `"${classification}"`}, ` +
            `which is neither "minor" nor "patch".`,
        );
      } else if (declared !== undefined && declared.bump !== classification) {
        failures.push(
          `changeset audit says "${name}" is "${classification}" but ` +
            `${CHANGESET_DIR}/${name}.md declares "${declared.bump}".`,
        );
      } else if (classification !== undefined) {
        declaredBumps.set(name, classification);
      }
      if (justification === "") {
        failures.push(`changeset audit row for "${name}" carries no justification.`);
      }

      // AC5 - each row declares the public names it breaks, or `none`.
      if (breaksCell !== "`none`") {
        const broken = breaksCell
          .split(",")
          .map((cell) => codeSpan(cell))
          .filter((cell): cell is string => cell !== undefined);
        if (broken.length === 0) {
          failures.push(
            `changeset audit row for "${name}" has a Breaks cell of ` +
              `${JSON.stringify(breaksCell)}, expected \`none\` or backticked names.`,
          );
        }
        for (const brokenName of broken) declaredBreaks.push({ name: brokenName, changeset: name });
      }
    }

    // AC1 and AC7 - one row per pending changeset, and every audited changeset
    // still present as a file.
    for (const entry of parsed) {
      if (!seen.has(entry.name)) {
        failures.push(`pending changeset "${entry.name}" has no row in the changeset audit.`);
      }
    }
    const present = new Set(parsed.map((entry) => entry.name));
    for (const name of seen) {
      if (!present.has(name)) {
        failures.push(
          `the changeset audit names "${name}", which is not present as a file in ` +
            `${CHANGESET_DIR}/. A changeset consumed before the release run is a failure.`,
        );
      }
    }
  }

  // --- Public API inventory: AC4 ------------------------------------------
  const inventory = codeBullets(inventoryLines);
  const inventorySet = new Set(inventory);
  if (inventory.length !== inventorySet.size) {
    failures.push(`the public API inventory lists at least one name twice.`);
  }
  const exported = new Set(state.exportedNames);
  for (const name of [...exported].sort(compareText)) {
    if (!inventorySet.has(name)) {
      failures.push(`the package exports "${name}", which the public API inventory does not list.`);
    }
  }
  for (const name of [...inventorySet].sort(compareText)) {
    if (!exported.has(name)) {
      failures.push(`the public API inventory lists "${name}", which the package does not export.`);
    }
  }

  // --- Break candidates: AC5 ----------------------------------------------
  const breakTable = parseTable(breakLines);
  const breakKeys = new Set<string>();
  if (breakTable === undefined) {
    if (!statesNone(breakLines)) {
      failures.push(
        `the break-candidate section carries neither a table nor "${NONE_SENTINEL}". ` +
          `An empty section is not a complete one.`,
      );
    } else if (declaredBreaks.length > 0) {
      failures.push(
        `the break-candidate section states "${NONE_SENTINEL}" while the changeset audit ` +
          `declares ${declaredBreaks.length} break(s).`,
      );
    }
  } else if (statesNone(breakLines)) {
    failures.push(`the break-candidate section states "${NONE_SENTINEL}" and also carries rows.`);
  } else if (breakTable.header.join(" | ") !== BREAK_COLUMNS.join(" | ")) {
    failures.push(
      `the break-candidate table's columns are "${breakTable.header.join(" | ")}", ` +
        `expected "${BREAK_COLUMNS.join(" | ")}".`,
    );
  } else {
    for (const row of breakTable.rows) {
      if (row.cells.length !== BREAK_COLUMNS.length) {
        failures.push(
          `break-candidate row ${row.ordinal} has ${row.cells.length} cells, ` +
            `expected ${BREAK_COLUMNS.length}.`,
        );
        continue;
      }
      const [
        nameCell = "",
        changeCell = "",
        changesetCell = "",
        dispositionCell = "",
        detail = "",
      ] = row.cells;
      const name = codeSpan(nameCell) ?? "";
      const change = codeSpan(changeCell) ?? "";
      const changeset = codeSpan(changesetCell) ?? "";
      const disposition = codeSpan(dispositionCell) ?? "";
      if (name === "") {
        failures.push(`break-candidate row ${row.ordinal} names no public API name.`);
        continue;
      }
      if (!isChangeKind(change)) {
        failures.push(
          `break candidate "${name}" records the change as "${change}", ` +
            `expected one of ${CHANGE_KINDS.join(", ")}.`,
        );
      }
      if (!DISPOSITIONS.some((allowed) => allowed === disposition)) {
        failures.push(
          `break candidate "${name}" carries the disposition ` +
            `${disposition === "" ? "none at all" : `"${disposition}"`}, ` +
            `expected exactly "${DISPOSITIONS[0]}" or "${DISPOSITIONS[1]}".`,
        );
      }
      if (detail === "") {
        failures.push(`break candidate "${name}" carries no detail.`);
      }
      if (!declaredBumps.has(changeset)) {
        failures.push(
          `break candidate "${name}" names the changeset "${changeset}", ` +
            `which has no row in the changeset audit.`,
        );
      }
      // A removal or a rename means the old name is GONE, so it must not still
      // be exported; a signature or behavior change means it is still there.
      if (isChangeKind(change)) {
        const stillExported = exported.has(name);
        if ((change === "removal" || change === "rename") && stillExported) {
          failures.push(
            `break candidate "${name}" records a ${change}, but the package still exports it.`,
          );
        }
        if ((change === "signature" || change === "behavior") && !stillExported) {
          failures.push(
            `break candidate "${name}" records a ${change} of a name the package does not export.`,
          );
        }
      }
      breakKeys.add(`${changeset} ${name}`);
    }
    for (const declaredBreak of declaredBreaks) {
      if (!breakKeys.has(`${declaredBreak.changeset} ${declaredBreak.name}`)) {
        failures.push(
          `the changeset audit says "${declaredBreak.changeset}" breaks ` +
            `"${declaredBreak.name}", which has no break-candidate row.`,
        );
      }
    }
    const declaredKeys = new Set(declaredBreaks.map((entry) => `${entry.changeset} ${entry.name}`));
    for (const key of breakKeys) {
      if (!declaredKeys.has(key)) {
        const [changeset = "", name = ""] = key.split(" ");
        failures.push(
          `break candidate "${name}" is attributed to "${changeset}", whose audit row ` +
            `declares no such break.`,
        );
      }
    }
  }

  // --- Release notes: AC6 -------------------------------------------------
  const groups = [
    { heading: "Features", bump: "minor" as Bump },
    { heading: "Fixes", bump: "patch" as Bump },
  ];
  const noted = new Map<string, string>();
  for (const group of groups) {
    const body = subSection(notesLines, group.heading);
    if (body === undefined) {
      failures.push(`the release notes have no "### ${group.heading}" heading.`);
      continue;
    }
    const expectedNames = [...declaredBumps.entries()]
      .filter(([, bump]) => bump === group.bump)
      .map(([name]) => name)
      .sort(compareText);
    const notes = codeNotes(body);
    if (expectedNames.length === 0) {
      if (notes.length > 0 || !statesNone(body)) {
        failures.push(
          `the release notes' "${group.heading}" group must state "${NONE_SENTINEL}" ` +
            `when no audited changeset is "${group.bump}".`,
        );
      }
      continue;
    }
    for (const note of notes) {
      if (note.text === "") failures.push(`release note for "${note.name}" carries no text.`);
      const already = noted.get(note.name);
      if (already !== undefined) {
        failures.push(
          `release note for "${note.name}" appears under both "${already}" and ` +
            `"${group.heading}"; each audited changeset appears under exactly one heading.`,
        );
        continue;
      }
      noted.set(note.name, group.heading);
      if (!expectedNames.includes(note.name)) {
        const bump = declaredBumps.get(note.name);
        failures.push(
          bump === undefined
            ? `the release notes carry "${note.name}", which no audited changeset produced.`
            : `the release notes group "${note.name}" under "${group.heading}", but the audit ` +
                `classifies it "${bump}".`,
        );
      }
    }
    for (const name of expectedNames) {
      if (!notes.some((note) => note.name === name)) {
        failures.push(
          `audited changeset "${name}" is "${group.bump}" and has no note under ` +
            `"${group.heading}".`,
        );
      }
    }
  }

  return failures;
}

// ---------------------------------------------------------------------------
// The real repository
// ---------------------------------------------------------------------------

function readManifestVersion(root: string): string {
  const manifest = JSON.parse(readFileSync(join(root, "package.json"), "utf8")) as {
    version?: unknown;
  };
  return typeof manifest.version === "string" ? manifest.version : "";
}

/**
 * Every `.md` in the changeset directory except its own `README.md`, which is
 * the directory's documentation and not a changeset. That exclusion is the
 * Changesets convention, and it is the only file the enumeration skips: any
 * OTHER unparseable file is a named failure under AC10.
 */
function readPendingChangesets(root: string): readonly PendingChangeset[] {
  const dir = join(root, CHANGESET_DIR);
  return readdirSync(dir, { withFileTypes: true })
    .filter((entry) => entry.isFile() && entry.name.endsWith(".md") && entry.name !== "README.md")
    .map((entry) => ({
      name: entry.name.slice(0, -".md".length),
      text: readFileSync(join(dir, entry.name), "utf8"),
    }))
    .sort((a, b) => compareText(a.name, b.name));
}

/**
 * The names the package exports from `.`, taken STATICALLY from `src/index.ts`
 * through the TypeScript compiler API.
 *
 * A runtime `import * as x12` plus `Object.keys` was refused: it sees value
 * exports only, and this package exports many types. A removed or renamed
 * exported TYPE is exactly the caller-visible break the inventory exists to
 * catch, so an inventory blind to them would certify a surface narrower than
 * the one consumers depend on. Reading the source rather than `dist/` also
 * keeps `pnpm test` independent of build order.
 */
function enumerateExportedNames(root: string): readonly string[] {
  const entry = join(root, "src", "index.ts");
  const config = ts.readConfigFile(join(root, "tsconfig.json"), (path) => ts.sys.readFile(path));
  const parsed = ts.parseJsonConfigFileContent(config.config, ts.sys, root);
  const program = ts.createProgram({
    rootNames: [entry],
    options: { ...parsed.options, noEmit: true },
  });
  const source = program.getSourceFile(entry);
  if (source === undefined) throw new Error(`cannot load ${entry}`);
  const checker = program.getTypeChecker();
  const symbol = checker.getSymbolAtLocation(source);
  if (symbol === undefined) throw new Error(`${entry} resolves to no module symbol`);
  return checker
    .getExportsOfModule(symbol)
    .map((exported) => exported.getName())
    .sort(compareText);
}

let cachedExports: readonly string[] | undefined;

function exportedNames(): readonly string[] {
  cachedExports ??= enumerateExportedNames(ROOT);
  return cachedExports;
}

function readRepoState(): RepoState {
  let document: string | undefined;
  try {
    document = readFileSync(join(ROOT, DOCUMENT_PATH), "utf8");
  } catch {
    document = undefined;
  }
  return {
    documentPath: DOCUMENT_PATH,
    document,
    changesets: readPendingChangesets(ROOT),
    manifestVersion: readManifestVersion(ROOT),
    exportedNames: exportedNames(),
  };
}

// ---------------------------------------------------------------------------
// Fixtures. Every unhappy path is built here; nothing on disk is ever mutated.
// ---------------------------------------------------------------------------

/**
 * Assemble a segment from its id and elements AT RUNTIME. Never write one as a
 * literal in this file: `test/**` is inside the PHI scanner's walk roots and
 * inside its `--staged` pre-commit route, and declaring a literal here would
 * disarm the detector this control exists to prove.
 */
function seg(id: string, ...elements: string[]): string {
  return `${[id, ...elements].join("*")}~`;
}

const FIXTURE_EXPORTS = ["alpha", "beta", "Gamma"] as const;

const MINOR_CHANGESET: PendingChangeset = {
  name: "adds-a-thing",
  text: `---\n"${PACKAGE_NAME}": minor\n---\n\nAdds a thing.\n`,
};

const PATCH_CHANGESET: PendingChangeset = {
  name: "fixes-a-thing",
  text: `---\n"${PACKAGE_NAME}": patch\n---\n\nFixes a thing.\n`,
};

const FIXTURE_CHANGESETS: readonly PendingChangeset[] = [MINOR_CHANGESET, PATCH_CHANGESET];

interface DocumentParts {
  readonly prepared?: string;
  readonly manifest?: string;
  readonly audit?: readonly string[];
  readonly inventory?: readonly string[];
  readonly breaks?: readonly string[];
  readonly features?: readonly string[];
  readonly fixes?: readonly string[];
  readonly omit?: string;
  readonly trailer?: string;
}

const AUDIT_MINOR_ROW = `| \`adds-a-thing\` | \`minor\` | \`none\` | Adds an exported name. |`;
const AUDIT_PATCH_ROW = `| \`fixes-a-thing\` | \`patch\` | \`none\` | Corrects a decode. |`;
const DEFAULT_AUDIT = [AUDIT_MINOR_ROW, AUDIT_PATCH_ROW];

const DEFAULT_FEATURES = ["- `adds-a-thing`: a thing is added."];
const DEFAULT_FIXES = ["- `fixes-a-thing`: a thing is fixed."];

function renderDocument(parts: DocumentParts = {}): string {
  const blocks: { heading: string; body: readonly string[] }[] = [
    {
      heading: REQUIRED_SECTIONS[0],
      body: [
        `| ${AUDIT_COLUMNS.join(" | ")} |`,
        `| --- | --- | --- | --- |`,
        ...(parts.audit ?? DEFAULT_AUDIT),
      ],
    },
    {
      heading: REQUIRED_SECTIONS[1],
      body: (parts.inventory ?? FIXTURE_EXPORTS).map((name) => `- \`${name}\``),
    },
    { heading: REQUIRED_SECTIONS[2], body: parts.breaks ?? [NONE_SENTINEL] },
    {
      heading: REQUIRED_SECTIONS[3],
      body: [
        "### Features",
        ...(parts.features ?? DEFAULT_FEATURES),
        "",
        "### Fixes",
        ...(parts.fixes ?? DEFAULT_FIXES),
      ],
    },
  ];
  const lines = [
    `# Release readiness: \`${PACKAGE_NAME}\` ${PREPARED_VERSION}`,
    "",
    `- Version prepared: \`${parts.prepared ?? PREPARED_VERSION}\``,
    `- Version currently recorded in the package manifest: \`${parts.manifest ?? "0.0.18"}\``,
    "",
  ];
  for (const block of blocks) {
    if (block.heading === parts.omit) continue;
    lines.push(`## ${block.heading}`, "", ...block.body, "");
  }
  if (parts.trailer !== undefined) lines.push(parts.trailer, "");
  return lines.join("\n");
}

function fixtureState(overrides: Partial<RepoState> = {}, parts: DocumentParts = {}): RepoState {
  return {
    documentPath: DOCUMENT_PATH,
    document: renderDocument(parts),
    changesets: FIXTURE_CHANGESETS,
    manifestVersion: "0.0.18",
    exportedNames: FIXTURE_EXPORTS,
    ...overrides,
  };
}

function failsWith(state: RepoState, pattern: RegExp): void {
  const failures = checkReleasePrep(state);
  expect(failures.some((failure) => pattern.test(failure))).toBe(true);
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe("release prep 0.1.0: the repository", () => {
  it("passes the release-prep check", { timeout: 60_000 }, () => {
    expect(checkReleasePrep(readRepoState())).toEqual([]);
  });

  it("AC7: the package manifest is still in the 0.0.x band", () => {
    expect(readManifestVersion(ROOT)).toMatch(MANIFEST_BAND);
  });

  it("AC3: the pending changesets resolve to exactly 0.1.0", () => {
    const parsed = readPendingChangesets(ROOT).map(parseChangeset);
    expect(parsed.filter((entry) => typeof entry === "string")).toEqual([]);
    const bumps = parsed.filter((entry): entry is ParsedChangeset => typeof entry !== "string");
    expect(
      resolveNextVersion(
        readManifestVersion(ROOT),
        bumps.map((entry) => entry.bump),
      ),
    ).toBe(PREPARED_VERSION);
  });

  it("AC13: the document carries the four required sections", () => {
    const shape = splitSections(readRepoState().document ?? "");
    expect(REQUIRED_SECTIONS.filter((name) => !shape.sections.has(name))).toEqual([]);
  });

  it(
    "AC4: the inventory is enumerated from the entry point, types included",
    { timeout: 60_000 },
    () => {
      const names = exportedNames();
      // A type-only export the runtime `Object.keys` reading would have missed.
      expect(names).toContain("X12Tr3Conformance");
      expect(names).toContain("parseX12");
    },
  );
});

describe("release prep 0.1.0: the fixture happy path", () => {
  it("passes on a well-formed fixture", () => {
    expect(checkReleasePrep(fixtureState())).toEqual([]);
  });

  it("AC5: accepts a break-candidate section that states None.", () => {
    expect(checkReleasePrep(fixtureState({}, { breaks: [NONE_SENTINEL] }))).toEqual([]);
  });

  it("AC5: accepts a declared break candidate with a valid disposition", () => {
    const state = fixtureState(
      {},
      {
        audit: [
          `| \`adds-a-thing\` | \`minor\` | \`Gamma\` | Adds an exported name. |`,
          `| \`fixes-a-thing\` | \`patch\` | \`none\` | Corrects a decode. |`,
        ],
        breaks: [
          `| ${BREAK_COLUMNS.join(" | ")} |`,
          `| --- | --- | --- | --- | --- |`,
          `| \`Gamma\` | \`signature\` | \`adds-a-thing\` | \`accepted-for-0.1.0\` | Gains a required member. |`,
        ],
      },
    );
    expect(checkReleasePrep(state)).toEqual([]);
  });

  it("AC6: accepts a group that states None. when no changeset is that bump", () => {
    const state = fixtureState(
      { changesets: [MINOR_CHANGESET] },
      {
        audit: [`| \`adds-a-thing\` | \`minor\` | \`none\` | Adds an exported name. |`],
        fixes: [NONE_SENTINEL],
      },
    );
    expect(checkReleasePrep(state)).toEqual([]);
  });
});

describe("release prep 0.1.0: AC1, one row per pending changeset", () => {
  it("fails on a pending changeset with no audit row", () => {
    failsWith(
      fixtureState({}, { audit: [DEFAULT_AUDIT[0] ?? ""] }),
      /pending changeset "fixes-a-thing" has no row/,
    );
  });

  it("fails on an audit row naming no existing changeset", () => {
    failsWith(
      fixtureState(
        {},
        { audit: [...DEFAULT_AUDIT, `| \`ghost\` | \`patch\` | \`none\` | Nothing. |`] },
      ),
      /names "ghost", which is not present as a file/,
    );
  });

  it("fails on a changeset audited twice", () => {
    failsWith(
      fixtureState({}, { audit: [...DEFAULT_AUDIT, DEFAULT_AUDIT[0] ?? ""] }),
      /lists "adds-a-thing" more than once/,
    );
  });
});

describe("release prep 0.1.0: AC2, the row equals the file", () => {
  it("fails when the row's classification is not the declared bump", () => {
    failsWith(
      fixtureState(
        {},
        {
          audit: [
            `| \`adds-a-thing\` | \`minor\` | \`none\` | Adds an exported name. |`,
            `| \`fixes-a-thing\` | \`minor\` | \`none\` | Corrects a decode. |`,
          ],
          features: [...DEFAULT_FEATURES, "- `fixes-a-thing`: a thing is fixed."],
          fixes: [NONE_SENTINEL],
        },
      ),
      /audit says "fixes-a-thing" is "minor" but \.changeset\/fixes-a-thing\.md declares "patch"/,
    );
  });

  it("fails on a classification that is neither minor nor patch", () => {
    failsWith(
      fixtureState(
        {},
        { audit: [`| \`adds-a-thing\` | \`major\` | \`none\` | Adds. |`, DEFAULT_AUDIT[1] ?? ""] },
      ),
      /classifies it as "major", which is neither/,
    );
  });

  it("fails on an empty justification", () => {
    failsWith(
      fixtureState(
        {},
        { audit: [`| \`adds-a-thing\` | \`minor\` | \`none\` |  |`, DEFAULT_AUDIT[1] ?? ""] },
      ),
      /carries no justification/,
    );
  });
});

describe("release prep 0.1.0: AC3, the resolved version", () => {
  it("fails when the changesets resolve to anything but 0.1.0", () => {
    failsWith(
      fixtureState(
        {
          changesets: [
            { name: "fixes-a-thing", text: `---\n"${PACKAGE_NAME}": patch\n---\n\nFixes.\n` },
          ],
        },
        {
          audit: [`| \`fixes-a-thing\` | \`patch\` | \`none\` | Corrects a decode. |`],
          features: [NONE_SENTINEL],
        },
      ),
      /resolve 0\.0\.18 to 0\.0\.19, not 0\.1\.0/,
    );
  });

  it("resolves a minor on any 0.0.x to 0.1.0, and a patch to the next patch", () => {
    expect(resolveNextVersion("0.0.18", ["patch", "minor"])).toBe("0.1.0");
    expect(resolveNextVersion("0.0.18", ["patch"])).toBe("0.0.19");
    expect(resolveNextVersion("0.0.18", [])).toBeUndefined();
  });
});

describe("release prep 0.1.0: AC4, the certified public API", () => {
  it("fails on an export the inventory does not list", () => {
    failsWith(
      fixtureState({}, { inventory: ["alpha", "beta"] }),
      /exports "Gamma", which the public API inventory does not list/,
    );
  });

  it("fails on an inventory entry the package does not export", () => {
    failsWith(
      fixtureState({}, { inventory: [...FIXTURE_EXPORTS, "delta"] }),
      /inventory lists "delta", which the package does not export/,
    );
  });

  it("fails on a renamed export", () => {
    failsWith(
      fixtureState({ exportedNames: ["alpha", "beta", "GammaRenamed"] }),
      /exports "GammaRenamed", which the public API inventory does not list/,
    );
  });
});

describe("release prep 0.1.0: AC5, break candidates", () => {
  const auditWithBreak = [
    `| \`adds-a-thing\` | \`minor\` | \`Gamma\` | Adds an exported name. |`,
    `| \`fixes-a-thing\` | \`patch\` | \`none\` | Corrects a decode. |`,
  ];

  function breakTable(row: string): readonly string[] {
    return [`| ${BREAK_COLUMNS.join(" | ")} |`, `| --- | --- | --- | --- | --- |`, row];
  }

  it("fails on a disposition that is not one of the two", () => {
    failsWith(
      fixtureState(
        {},
        {
          audit: auditWithBreak,
          breaks: breakTable(
            `| \`Gamma\` | \`signature\` | \`adds-a-thing\` | \`accepted\` | Gains a member. |`,
          ),
        },
      ),
      /carries the disposition "accepted", expected exactly/,
    );
  });

  it("fails on a row with no disposition at all", () => {
    failsWith(
      fixtureState(
        {},
        {
          audit: auditWithBreak,
          breaks: breakTable(
            `| \`Gamma\` | \`signature\` | \`adds-a-thing\` |  | Gains a member. |`,
          ),
        },
      ),
      /carries the disposition none at all/,
    );
  });

  it("accepts the deferred disposition", () => {
    const state = fixtureState(
      {},
      {
        audit: auditWithBreak,
        breaks: breakTable(
          `| \`Gamma\` | \`behavior\` | \`adds-a-thing\` | \`deferred\` | Answers differently. |`,
        ),
      },
    );
    expect(checkReleasePrep(state)).toEqual([]);
  });

  it("fails on a declared break with no row", () => {
    failsWith(
      fixtureState({}, { audit: auditWithBreak, breaks: [NONE_SENTINEL] }),
      /states "None\." while the changeset audit declares 1 break/,
    );
  });

  it("fails on a row no audit row declares", () => {
    failsWith(
      fixtureState(
        {},
        {
          breaks: breakTable(
            `| \`Gamma\` | \`signature\` | \`adds-a-thing\` | \`deferred\` | Gains a member. |`,
          ),
        },
      ),
      /whose audit row declares no such break/,
    );
  });

  it("fails on a removal of a name the package still exports", () => {
    failsWith(
      fixtureState(
        {},
        {
          audit: auditWithBreak,
          breaks: breakTable(
            `| \`Gamma\` | \`removal\` | \`adds-a-thing\` | \`deferred\` | Gone. |`,
          ),
        },
      ),
      /records a removal, but the package still exports it/,
    );
  });

  it("fails on a behavior change of a name the package does not export", () => {
    failsWith(
      fixtureState(
        {},
        {
          audit: [
            `| \`adds-a-thing\` | \`minor\` | \`Vanished\` | Adds an exported name. |`,
            `| \`fixes-a-thing\` | \`patch\` | \`none\` | Corrects a decode. |`,
          ],
          breaks: breakTable(
            `| \`Vanished\` | \`behavior\` | \`adds-a-thing\` | \`deferred\` | Answers differently. |`,
          ),
        },
      ),
      /records a behavior of a name the package does not export/,
    );
  });

  it("fails on a section that is neither a table nor None.", () => {
    failsWith(
      fixtureState({}, { breaks: ["Nothing much to report."] }),
      /carries neither a table nor "None\."/,
    );
  });
});

describe("release prep 0.1.0: AC6, the release notes", () => {
  it("fails when an audited changeset has no note", () => {
    failsWith(
      fixtureState({}, { fixes: [NONE_SENTINEL] }),
      /"fixes-a-thing" is "patch" and has no note/,
    );
  });

  it("fails on a note no audited changeset produced", () => {
    failsWith(
      fixtureState({}, { features: [...DEFAULT_FEATURES, "- `phantom`: invented."] }),
      /carry "phantom", which no audited changeset produced/,
    );
  });

  it("fails when a changeset is grouped under the wrong heading", () => {
    failsWith(
      fixtureState(
        {},
        { features: [...DEFAULT_FEATURES, ...DEFAULT_FIXES], fixes: [NONE_SENTINEL] },
      ),
      /group "fixes-a-thing" under "Features", but the audit classifies it "patch"/,
    );
  });

  it("fails when a changeset appears under both headings", () => {
    failsWith(
      fixtureState({}, { features: [...DEFAULT_FEATURES, ...DEFAULT_FIXES] }),
      /appears under both "Features" and "Fixes"/,
    );
  });

  it("fails on a note with no text", () => {
    failsWith(fixtureState({}, { features: ["- `adds-a-thing`: "] }), /carries no text/);
  });
});

describe("release prep 0.1.0: AC7, prep only", () => {
  it("fails on a premature version bump", () => {
    failsWith(fixtureState({ manifestVersion: "0.1.0" }), /outside the 0\.0\.x band/);
  });

  it("fails on a consumed changeset the audit still names", () => {
    failsWith(
      fixtureState({ changesets: [MINOR_CHANGESET] }),
      /names "fixes-a-thing", which is not present as a file/,
    );
  });

  it("reads the band and not the one literal version", () => {
    expect(
      checkReleasePrep(fixtureState({ manifestVersion: "0.0.4" }, { manifest: "0.0.4" })),
    ).toEqual([]);
  });
});

describe("release prep 0.1.0: AC8, no X12 message content", () => {
  it("fails on a segment header in a delimited-segment position", () => {
    failsWith(
      fixtureState({}, { trailer: seg("ISA", "00", "", "00", "", "ZZ", "SENDER") }),
      /carries X12 message content at line \d+: segment ISA/,
    );
  });

  it("fails on a functional-group header inside a table cell", () => {
    failsWith(
      fixtureState({}, { trailer: `| ${seg("GS", "HS", "SENDER", "RECEIVER")} |` }),
      /carries X12 message content at line \d+: segment GS/,
    );
  });

  it("fails on a transaction-set header after a segment terminator", () => {
    failsWith(
      fixtureState({}, { trailer: `${seg("GS", "HS")}${seg("ST", "271", "0001")}` }),
      /segment ST/,
    );
  });

  it("does not fire on identifiers the document is permitted to name", () => {
    const trailer = [
      "The `ISA` header, TR3 `005010X212`, and `X12_TR3_CONFORMANCE` are all named here.",
      "So are `AAA_REJECT_REASON_CODES`, `HL_LEVEL_CODES`, `CLP_STATUS` and `TA1_ACK_CODES`.",
      "Prose may say ST-03, GS-08, DTP-02 and SVC-07 without being a transaction.",
    ].join("\n");
    expect(checkReleasePrep(fixtureState({}, { trailer }))).toEqual([]);
  });
});

describe("release prep 0.1.0: AC9, no pending changesets", () => {
  it("fails rather than reporting a vacuously complete audit", () => {
    failsWith(
      fixtureState({ changesets: [] }, { audit: [] }),
      /cannot be prepared without at least one "minor" changeset/,
    );
  });
});

describe("release prep 0.1.0: AC10, an unparseable changeset", () => {
  it("fails naming a file with no frontmatter", () => {
    failsWith(
      fixtureState({ changesets: [{ name: "bare", text: "Just prose.\n" }] }),
      /\.changeset\/bare\.md: not a changeset - frontmatter is missing/,
    );
  });

  it("fails naming a file whose frontmatter never closes", () => {
    failsWith(
      fixtureState({ changesets: [{ name: "open", text: `---\n"${PACKAGE_NAME}": patch\n` }] }),
      /\.changeset\/open\.md: malformed changeset - the frontmatter is never closed/,
    );
  });

  it("fails naming a file that declares major, and never downgrades it", () => {
    const failures = checkReleasePrep(
      fixtureState({
        changesets: [
          ...FIXTURE_CHANGESETS,
          { name: "breaking", text: `---\n"${PACKAGE_NAME}": major\n---\n\nBreaks.\n` },
        ],
      }),
    );
    expect(failures.some((failure) => /breaking\.md: declares bump "major"/.test(failure))).toBe(
      true,
    );
    expect(failures.some((failure) => /resolve 0\.0\.18 to/.test(failure))).toBe(false);
  });

  it("fails naming a file whose bump declaration has no bump", () => {
    failsWith(
      fixtureState({
        changesets: [{ name: "odd", text: `---\n"${PACKAGE_NAME}"\n---\n\nOdd.\n` }],
      }),
      /\.changeset\/odd\.md: malformed bump declaration/,
    );
  });

  it("fails naming a file that declares a bump for no package at all", () => {
    failsWith(
      fixtureState({
        changesets: [{ name: "nameless", text: `---\nminor\n---\n\nNameless.\n` }],
      }),
      /\.changeset\/nameless\.md: expected exactly one "@cosyte\/x12" bump declaration, found 0/,
    );
  });

  it("does not silently skip an unparseable file", () => {
    const failures = checkReleasePrep(
      fixtureState({ changesets: [...FIXTURE_CHANGESETS, { name: "bare", text: "Prose.\n" }] }),
    );
    expect(failures).toHaveLength(1);
    expect(failures[0]).toMatch(/bare\.md/);
  });
});

describe("release prep 0.1.0: AC11, an absent readiness document", () => {
  it("fails naming the path it expected", () => {
    failsWith(
      fixtureState({ document: undefined }),
      /readiness document not found: expected a readable file at docs\/releases\/0\.1\.0-readiness\.md/,
    );
  });

  it("fails on a document missing a required section", () => {
    failsWith(fixtureState({}, { omit: "Break candidates" }), /no "## Break candidates" section/);
  });

  it("fails when the document states a manifest version the manifest does not", () => {
    failsWith(
      fixtureState({}, { manifest: "0.0.17" }),
      /states the manifest version as "0\.0\.17", but package\.json says "0\.0\.18"/,
    );
  });

  it("fails when the document states a prepared version that is not 0.1.0", () => {
    failsWith(
      fixtureState({}, { prepared: "0.2.0" }),
      /states the prepared version as "0\.2\.0", not "0\.1\.0"/,
    );
  });
});
