#!/usr/bin/env tsx
/**
 * `pnpm refresh:code-lists` — the release-event tool for the bundled X12
 * code-list snapshots (CARC / RARC / CSCC / CSC / CLP-status / maintenance
 * type / service type).
 *
 * Two modes:
 *
 *   (default)  VALIDATE + FRESHNESS AUDIT — offline, deterministic, CI-safe.
 *              Loads every bundled `CodeListSnapshot` and asserts it is
 *              well-formed (meta present + ISO dates, non-empty unique codes,
 *              non-empty descriptions), then prints a freshness table (each
 *              list's snapshot date, the WPC/CMS/X12 publication date it
 *              reflects, its update cadence, and its bundled-code count). A
 *              malformed snapshot exits non-zero — this is a lint gate for the
 *              hand-maintained snapshots, and is exercised by
 *              `test/scripts/refresh-code-lists.test.ts` on every `pnpm test`.
 *
 *   --fetch    REGENERATE from canonical sources. **Not run in autopilot / CI.**
 *              Pulling the full WPC-published CARC/RARC/CSCC/CSC lists and
 *              redistributing their descriptions is gated on a
 *              redistribution-terms review (roadmap Phase 10 "O3") that has not
 *              cleared, and requires outbound network. This mode prints the
 *              per-list canonical source manifest a release engineer needs and
 *              exits 2 — it deliberately does NOT fabricate descriptions the
 *              maintainers have not reviewed. See `KNOWN-LIMITATIONS.md`.
 *
 * Pure Node, zero runtime deps — mirrors `scripts/phi-scan.ts`. The library
 * itself NEVER fetches a code list at runtime: snapshots are versioned data
 * artifacts refreshed on a release cadence, and an inbound code absent from a
 * snapshot still parses verbatim (only its human-readable description is
 * missing) — a stale snapshot never yields a wrong code.
 *
 * Exit codes: 0 (snapshots valid), 1 (a snapshot failed validation), 2
 * (--fetch requested, which is not available here).
 */

import {
  CARC,
  RARC,
  CLP_STATUS,
  CLAIM_STATUS_CATEGORY_CODES,
  CLAIM_STATUS_CODES,
  MAINTENANCE_TYPE_CODES,
  SERVICE_TYPE_CODES,
} from "../src/code-lists/index.js";
import type { CodeListSnapshot } from "../src/code-lists/index.js";

/** A bundled snapshot plus the release metadata `refresh` needs to audit it. */
interface RefreshTarget {
  readonly snapshot: CodeListSnapshot;
  /** Human update cadence of the upstream source (for the freshness report). */
  readonly cadence: string;
  /** Canonical source to regenerate from under `--fetch` (release-gated). */
  readonly canonicalSource: string;
}

/**
 * The seven {@link CodeListSnapshot}-shaped bundled lists. (The Claim
 * Adjustment Group codes and the HI-qualifier registry are frozen literal
 * unions / a spec-fixed registry — not WPC-refreshable snapshots — so they are
 * out of this tool's scope by design.)
 */
const TARGETS: readonly RefreshTarget[] = [
  {
    snapshot: CARC,
    cadence: "WPC — monthly",
    canonicalSource: "https://x12.org/codes/claim-adjustment-reason-codes",
  },
  {
    snapshot: RARC,
    cadence: "WPC — monthly",
    canonicalSource: "https://x12.org/codes/remittance-advice-remark-codes",
  },
  {
    snapshot: CLAIM_STATUS_CATEGORY_CODES,
    cadence: "WPC — monthly",
    canonicalSource: "https://x12.org/codes/claim-status-category-codes",
  },
  {
    snapshot: CLAIM_STATUS_CODES,
    cadence: "WPC — monthly",
    canonicalSource: "https://x12.org/codes/claim-status-codes",
  },
  {
    snapshot: SERVICE_TYPE_CODES,
    cadence: "X12 005010X279A1 — standard release cadence (rare)",
    canonicalSource:
      "ASC X12 005010X279A1 TR3 §EB Eligibility or Benefit Information (Code Source 411)",
  },
  {
    snapshot: CLP_STATUS,
    cadence: "X12 005010X221A1 — standard release cadence (rare)",
    canonicalSource: "ASC X12 005010X221A1 TR3 §CLP Claim Payment Information (Code Source 65)",
  },
  {
    snapshot: MAINTENANCE_TYPE_CODES,
    cadence: "X12 005010X220A1 — standard release cadence (rare)",
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
 * (empty === all valid). Exported so the test suite asserts snapshot integrity
 * on every `pnpm test`, not only when a release engineer runs the CLI.
 */
export function validateCodeLists(): string[] {
  const errors: string[] = [];
  for (const { snapshot } of TARGETS) {
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

/** Render the freshness audit table (stdout side of the default mode). */
function printFreshnessReport(): void {
  process.stdout.write("\nBundled X12 code-list snapshots — freshness audit\n");
  process.stdout.write("(snapshots are versioned data artifacts; a stale one yields a missing\n");
  process.stdout.write(
    " description, never a wrong code — refresh is a release event, not runtime)\n\n",
  );
  for (const { snapshot, cadence } of TARGETS) {
    const { meta, codes } = snapshot;
    const count = Object.keys(codes).length;
    process.stdout.write(
      `  ${meta.id.padEnd(24)} snapshot ${meta.snapshotDate}  reflects ${meta.publishedDate}\n`,
    );
    process.stdout.write(`  ${" ".repeat(24)} ${String(count).padStart(4)} codes · ${cadence}\n`);
    process.stdout.write(`  ${" ".repeat(24)} source: ${meta.source}\n\n`);
  }
}

/** Print the release-engineer manifest for the redistribution-gated `--fetch`. */
function printFetchManifest(): void {
  process.stderr.write(
    "\n--fetch (regenerate from canonical sources) is not available in this environment.\n" +
      "Regenerating the full WPC-published lists + redistributing their descriptions is gated\n" +
      "on a redistribution-terms review (roadmap Phase 10 O3) and requires outbound network.\n" +
      "This tool will not fabricate descriptions the maintainers have not reviewed.\n\n" +
      "Canonical sources for a manual release-time refresh:\n\n",
  );
  for (const { snapshot, canonicalSource } of TARGETS) {
    process.stderr.write(`  ${snapshot.meta.id.padEnd(24)} ${canonicalSource}\n`);
  }
  process.stderr.write(
    "\nSee KNOWN-LIMITATIONS.md and RELEASING (docs-content) for the refresh runbook.\n",
  );
}

function main(): void {
  const args = process.argv.slice(2);
  if (args.includes("--fetch")) {
    printFetchManifest();
    process.exit(2);
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
