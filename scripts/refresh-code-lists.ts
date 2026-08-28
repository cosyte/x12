#!/usr/bin/env tsx
/**
 * `pnpm refresh:code-lists` - the release-event tool for the bundled X12
 * code-list snapshots (CARC / RARC / CSCC / CSC / CLP-status / maintenance
 * type / service type).
 *
 * Two modes:
 *
 *   (default)  VALIDATE + FRESHNESS AUDIT - offline, deterministic, CI-safe.
 *              Loads every bundled `CodeListSnapshot` and asserts it is
 *              well-formed (meta present + ISO dates, non-empty unique codes,
 *              non-empty descriptions) AND that it carries a maintaining
 *              organisation and a redistribution record naming a licensor
 *              wherever the descriptions are not free to redistribute. Then it
 *              prints a freshness table (each list's snapshot date, the
 *              publication date it reflects, its update cadence, its
 *              bundled-code count, its maintainer and its redistribution
 *              status). A malformed or unlabelled snapshot exits non-zero -
 *              this is a lint gate for the hand-maintained snapshots, and is
 *              exercised by `test/scripts/refresh-code-lists.test.ts` on every
 *              `pnpm test`.
 *
 *   --fetch    REGENERATE from canonical sources. **Not run in autopilot / CI.**
 *              Reports each list's regeneration permission INDEPENDENTLY, off
 *              that list's own recorded terms. A list whose descriptions the
 *              record says are free to redistribute is reported as permitted;
 *              a list whose descriptions are licence-restricted, or whose
 *              status the sources never settled, is refused BY NAME with the
 *              licensor to approach printed beside it. One list's restriction
 *              never refuses another list, and an unsettled status is never
 *              read as a permission. Regeneration itself needs outbound
 *              network and is a human release step: this tool prints the
 *              per-list permission report and the canonical source manifest
 *              and fetches nothing, so it never fabricates descriptions the
 *              maintainers have not reviewed. See `KNOWN-LIMITATIONS.md`.
 *
 * Pure Node, zero runtime deps - mirrors `scripts/phi-scan.ts`. The library
 * itself NEVER fetches a code list at runtime: snapshots are versioned data
 * artifacts refreshed on a release cadence, and an inbound code absent from a
 * snapshot still parses verbatim (only its human-readable description is
 * missing) - a stale snapshot never yields a wrong code.
 *
 * Exit codes: 0 (snapshots valid, or --fetch with every list permitted), 1 (a
 * snapshot failed validation), 2 (--fetch requested and at least one list may
 * not be regenerated here).
 */

import {
  CARC,
  RARC,
  CLP_STATUS,
  CLAIM_STATUS_CATEGORY_CODES,
  CLAIM_STATUS_CODES,
  MAINTENANCE_TYPE_CODES,
  SERVICE_TYPE_CODES,
  codeListRedistributionIsPermitted,
} from "../src/code-lists/index.js";
import type { CodeListSnapshot } from "../src/code-lists/index.js";

/** A bundled snapshot plus the release metadata `refresh` needs to audit it. */
export interface RefreshTarget {
  readonly snapshot: CodeListSnapshot;
  /** Human update cadence of the upstream source (for the freshness report). */
  readonly cadence: string;
  /** Canonical source to regenerate from under `--fetch` (release-gated). */
  readonly canonicalSource: string;
}

/**
 * The seven {@link CodeListSnapshot}-shaped bundled lists. (The Claim
 * Adjustment Group codes and the HI-qualifier registry are frozen literal
 * unions / a spec-fixed registry - not WPC-refreshable snapshots - so they are
 * out of this tool's scope by design.)
 */
export const TARGETS: readonly RefreshTarget[] = [
  {
    snapshot: CARC,
    cadence: "WPC - monthly",
    canonicalSource: "https://x12.org/codes/claim-adjustment-reason-codes",
  },
  {
    snapshot: RARC,
    cadence: "WPC - monthly",
    canonicalSource: "https://x12.org/codes/remittance-advice-remark-codes",
  },
  {
    snapshot: CLAIM_STATUS_CATEGORY_CODES,
    cadence: "WPC - monthly",
    canonicalSource: "https://x12.org/codes/claim-status-category-codes",
  },
  {
    snapshot: CLAIM_STATUS_CODES,
    cadence: "WPC - monthly",
    canonicalSource: "https://x12.org/codes/claim-status-codes",
  },
  {
    snapshot: SERVICE_TYPE_CODES,
    cadence: "X12 005010X279A1 - standard release cadence (rare)",
    canonicalSource:
      "ASC X12 005010X279A1 TR3 §EB Eligibility or Benefit Information (Code Source 411)",
  },
  {
    snapshot: CLP_STATUS,
    cadence: "X12 005010X221A1 - standard release cadence (rare)",
    canonicalSource: "ASC X12 005010X221A1 TR3 §CLP Claim Payment Information (Code Source 65)",
  },
  {
    snapshot: MAINTENANCE_TYPE_CODES,
    cadence: "X12 005010X220A1 - standard release cadence (rare)",
    canonicalSource: "ASC X12 005010X220A1 TR3 §INS Member Level Detail (Code Source 875)",
  },
] as const;

const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;

/** True iff `s` is a `YYYY-MM-DD` string that names a real calendar date. */
function isIsoDate(s: string): boolean {
  if (!ISO_DATE.test(s)) return false;
  const parsed = new Date(s + "T00:00:00Z");
  return !Number.isNaN(parsed.getTime()) && parsed.toISOString().slice(0, 10) === s;
}

/**
 * Validate every bundled snapshot. Returns the list of human-readable defects
 * (empty === all valid), each naming the offending list first so a failure
 * points at one list rather than at the set. Exported so the test suite asserts
 * snapshot integrity on every `pnpm test`, not only when a release engineer
 * runs the CLI; `targets` is a parameter so a test can drive a deliberately
 * degraded list through the same code path the release runs.
 */
export function validateCodeLists(targets: readonly RefreshTarget[] = TARGETS): string[] {
  const errors: string[] = [];
  for (const { snapshot } of targets) {
    const { meta, codes } = snapshot;
    const id = meta.id || "(missing id)";
    if (!meta.id) errors.push(`${id}: meta.id is empty`);
    if (!meta.source) errors.push(`${id}: meta.source is empty`);
    if (!isIsoDate(meta.publishedDate)) {
      errors.push(`${id}: meta.publishedDate "${meta.publishedDate}" is not a YYYY-MM-DD date`);
    }
    if (!isIsoDate(meta.snapshotDate)) {
      errors.push(`${id}: meta.snapshotDate "${meta.snapshotDate}" is not a YYYY-MM-DD date`);
    }

    // An unlabelled list must not reach a release. A consumer decides whether a
    // description is theirs to display, cache or re-publish off these two
    // fields, and a list carrying neither answers that question with silence,
    // which reads as a permission. "Not established" is a recorded status and
    // passes here; NO record does not.
    if (meta.maintainingOrganization === undefined || meta.maintainingOrganization.length === 0) {
      errors.push(`${id}: meta.maintainingOrganization is not recorded`);
    }
    const redistribution = meta.redistribution;
    if (redistribution === undefined) {
      errors.push(`${id}: meta.redistribution is not recorded (no redistribution status)`);
    } else {
      if (redistribution.terms.trim().length === 0) {
        errors.push(`${id}: meta.redistribution.terms is empty`);
      }
      // A list that is not free to redistribute owes the reader the party who
      // could change that. Without it the refusal is a dead end.
      if (!codeListRedistributionIsPermitted(meta)) {
        const approach = redistribution.approach;
        if (approach === undefined || approach.trim().length === 0) {
          errors.push(
            `${id}: redistribution status "${redistribution.status}" names no licensor to approach`,
          );
        }
      }
    }

    const entries = Object.entries(codes);
    if (entries.length === 0) errors.push(`${id}: snapshot has zero codes`);

    const seen = new Set<string>();
    for (const [code, description] of entries) {
      if (code.trim() !== code || code.length === 0) {
        errors.push(
          `${id}: code key ${JSON.stringify(code)} has leading/trailing whitespace or is empty`,
        );
      }
      const normalized = code.trim();
      if (seen.has(normalized)) {
        errors.push(`${id}: duplicate code key ${JSON.stringify(code)} (whitespace variant)`);
      }
      seen.add(normalized);
      if (typeof description !== "string" || description.trim().length === 0) {
        errors.push(`${id}: code ${JSON.stringify(code)} has an empty description`);
      }
    }
  }
  return errors;
}

/** One list's answer to "may this list be regenerated and redistributed?". */
export interface RegenerationPermission {
  readonly id: string;
  readonly maintainingOrganization: string;
  /** The recorded status, or `"unrecorded"` where the list carries no record. */
  readonly status: string;
  /** True ONLY on a recorded permission. Every other answer is `false`. */
  readonly permitted: boolean;
  /** The licensor to approach, present on every refusal. */
  readonly approach: string | undefined;
  readonly canonicalSource: string;
}

/**
 * Answer the regeneration question ONCE PER LIST, off that list's own record.
 * No list's answer depends on any other list's: this maps over the targets and
 * consults nothing shared, which is what stops one restricted list refusing the
 * whole set. Exported so the report and the test read the same answers.
 */
export function regenerationPermissions(
  targets: readonly RefreshTarget[] = TARGETS,
): readonly RegenerationPermission[] {
  return targets.map(({ snapshot, canonicalSource }) => {
    const { meta } = snapshot;
    const redistribution = meta.redistribution;
    return Object.freeze({
      id: meta.id,
      maintainingOrganization: meta.maintainingOrganization ?? "(not recorded)",
      status: redistribution?.status ?? "unrecorded",
      permitted: codeListRedistributionIsPermitted(meta),
      approach: redistribution?.approach,
      canonicalSource,
    });
  });
}

/** Render the freshness audit table (stdout side of the default mode). */
function printFreshnessReport(): void {
  process.stdout.write("\nBundled X12 code-list snapshots - freshness audit\n");
  process.stdout.write("(snapshots are versioned data artifacts; a stale one yields a missing\n");
  process.stdout.write(
    " description, never a wrong code - refresh is a release event, not runtime)\n\n",
  );
  for (const { snapshot, cadence } of TARGETS) {
    const { meta, codes } = snapshot;
    const count = Object.keys(codes).length;
    process.stdout.write(
      `  ${meta.id.padEnd(24)} snapshot ${meta.snapshotDate}  reflects ${meta.publishedDate}\n`,
    );
    process.stdout.write(`  ${" ".repeat(24)} ${String(count).padStart(4)} codes · ${cadence}\n`);
    process.stdout.write(`  ${" ".repeat(24)} source: ${meta.source}\n`);
    process.stdout.write(
      `  ${" ".repeat(24)} maintained by ${meta.maintainingOrganization ?? "(not recorded)"}` +
        ` · redistribution ${meta.redistribution?.status ?? "unrecorded"}` +
        ` · ${meta.completeness}\n\n`,
    );
  }
}

/**
 * Render the per-list regeneration permission report. One block per list,
 * built from that list's own answer, so a reader can see which lists this
 * release engineer may regenerate and which they may not, and why, without
 * reading a shared sentence that is true of neither.
 */
export function renderFetchReport(
  permissions: readonly RegenerationPermission[] = regenerationPermissions(),
): string {
  const refused = permissions.filter((p) => !p.permitted);
  const lines: string[] = [
    "",
    "--fetch (regenerate from canonical sources): per-list permission report.",
    "",
    "Each list is answered from ITS OWN recorded redistribution terms. A list is",
    "refused only on its own restriction, never on another list's, and a status the",
    "sources never settled is refused rather than assumed to be a permission.",
    "This tool fetches nothing and fabricates nothing: regeneration needs outbound",
    "network and is a human release step.",
    "",
  ];
  for (const p of permissions) {
    lines.push(`  ${p.id}`);
    lines.push(`    maintained by       ${p.maintainingOrganization}`);
    lines.push(`    redistribution      ${p.status}`);
    lines.push(
      `    regeneration        ${p.permitted ? "PERMITTED" : "REFUSED"}${
        p.permitted ? "" : ` (${p.status})`
      }`,
    );
    if (!p.permitted) {
      lines.push(`    approach            ${p.approach ?? "(no licensor recorded)"}`);
    }
    lines.push(`    canonical source    ${p.canonicalSource}`);
    lines.push("");
  }
  lines.push(
    refused.length === 0
      ? `Every one of the ${String(permissions.length)} bundled lists may be regenerated on its recorded terms.`
      : `${String(refused.length)} of ${String(permissions.length)} bundled lists may not be regenerated here: ` +
          `${refused.map((p) => p.id).join(", ")}.`,
  );
  lines.push("See KNOWN-LIMITATIONS.md and RELEASING (docs-content) for the refresh runbook.");
  lines.push("");
  return lines.join("\n");
}

function main(): void {
  const args = process.argv.slice(2);
  if (args.includes("--fetch")) {
    const permissions = regenerationPermissions();
    process.stderr.write(renderFetchReport(permissions));
    process.exit(permissions.every((p) => p.permitted) ? 0 : 2);
  }

  const errors = validateCodeLists();
  if (errors.length > 0) {
    process.stderr.write("Code-list snapshot validation FAILED:\n");
    for (const e of errors) process.stderr.write(`  ✗ ${e}\n`);
    process.exit(1);
  }
  printFreshnessReport();
  process.stdout.write(`✓ all ${String(TARGETS.length)} bundled snapshots valid\n`);
}

// Run only as a CLI, never on import (the test imports `validateCodeLists`).
// `import.meta.url` ends with this file's path when invoked directly via tsx.
if (import.meta.url === `file://${process.argv[1]}`) {
  main();
}
