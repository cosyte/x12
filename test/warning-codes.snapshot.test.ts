/**
 * Public-API stability snapshot for `WARNING_CODES` (and the Tier-3
 * `FATAL_CODES`). The set of codes the parser can emit is part of the
 * package's PUBLIC contract: consumers narrow on `warning.code` / `err.code`,
 * so renaming or removing a code is a BREAKING change.
 *
 * Snapshotting the full sorted code set turns any such change into a failing
 * test with a readable diff — a deliberate tripwire. Updating the snapshot
 * (`vitest -u`) is the explicit acknowledgement that the public surface
 * changed and a changeset / breaking-change-tag is owed.
 *
 * Inline snapshots (not external `.snap` files) keep the expected surface
 * reviewable directly in the diff.
 */

import { describe, expect, it } from "vitest";

import { FATAL_CODES, WARNING_CODES } from "../src/index.js";

function sortedWarningCodes(): string[] {
  return Object.values(WARNING_CODES).sort((a, b) => a.localeCompare(b));
}

function sortedFatalCodes(): string[] {
  return Object.values(FATAL_CODES).sort((a, b) => a.localeCompare(b));
}

describe("public API: WARNING_CODES surface is stable", () => {
  it("the sorted set of Tier-2 warning codes matches the locked snapshot", () => {
    expect(sortedWarningCodes()).toMatchInlineSnapshot(`
      [
        "X12_CONTROL_NUMBER_MISMATCH",
        "X12_GROUP_COUNT_MISMATCH",
        "X12_MISSING_GE",
        "X12_MISSING_IEA",
        "X12_MISSING_SE",
        "X12_PRE_005010",
        "X12_TRAILING_GARBAGE",
        "X12_TRANSACTION_COUNT_MISMATCH",
      ]
    `);
  });

  it("WARNING_CODES keys equal their values (registry self-consistency)", () => {
    for (const [k, v] of Object.entries(WARNING_CODES)) expect(k).toBe(v);
  });

  it("there are exactly 8 Tier-2 warning codes at Phase 1", () => {
    expect(Object.keys(WARNING_CODES)).toHaveLength(8);
  });
});

describe("public API: FATAL_CODES surface is stable", () => {
  it("the sorted set of Tier-3 fatal codes matches the locked snapshot", () => {
    expect(sortedFatalCodes()).toMatchInlineSnapshot(`
      [
        "X12_EMPTY_INPUT",
        "X12_INVALID_DELIMITERS",
        "X12_ISA_TOO_SHORT",
        "X12_NO_ISA_HEADER",
      ]
    `);
  });

  it("there are exactly 4 Tier-3 fatal codes (locked by spec)", () => {
    expect(Object.keys(FATAL_CODES)).toHaveLength(4);
  });
});
