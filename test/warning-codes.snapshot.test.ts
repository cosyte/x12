/**
 * Public-API stability snapshot for `WARNING_CODES` (and the Tier-3
 * `FATAL_CODES`). The set of codes the parser can emit is part of the
 * package's PUBLIC contract: consumers narrow on `warning.code` / `err.code`,
 * so renaming or removing a code is a BREAKING change.
 *
 * Snapshotting the full sorted code set turns any such change into a failing
 * test with a readable diff - a deliberate tripwire. Updating the snapshot
 * (`vitest -u`) is the explicit acknowledgement that the public surface
 * changed and a changeset / breaking-change-tag is owed.
 *
 * Inline snapshots (not external `.snap` files) keep the expected surface
 * reviewable directly in the diff.
 */

import { describe, expect, it } from "vitest";

import { FATAL_CODES, REQUIRED_LOOPS, WARNING_CODES } from "../src/index.js";

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
        "X12_270_DUPLICATE_HIERARCHY_ID",
        "X12_270_HIERARCHY_CYCLE",
        "X12_270_INTER_SEGMENT_WHITESPACE",
        "X12_270_LEVEL_DETACHED",
        "X12_270_NON_CONVENTIONAL_DELIMITER",
        "X12_834_UNKNOWN_MAINTENANCE_TYPE",
        "X12_835_BALANCE_NOT_EVALUABLE",
        "X12_835_REMIT_BALANCE_MISMATCH",
        "X12_837_AMBIGUOUS_VARIANT",
        "X12_837_ENTITY_SEGMENT_DISCARDED_AFTER_LX",
        "X12_837_PAY_TO_ADDRESS_REPEATED",
        "X12_837_SERVICE_LINE_DROPPED",
        "X12_837_SERVICE_LINE_NOT_DECODED",
        "X12_837_SERVICE_SEGMENT_REPEATED",
        "X12_837_SERVICE_SEGMENT_WITHOUT_LX",
        "X12_837_UNKNOWN_VARIANT",
        "X12_AMOUNT_ROW_DROPPED",
        "X12_CONTROL_NUMBER_MISMATCH",
        "X12_DANGLING_RELEASE_CHAR",
        "X12_GROUP_COUNT_MISMATCH",
        "X12_HL_PARENT_LEVEL_INVALID",
        "X12_HL_PARENT_MISMATCH",
        "X12_ISA_EXTRA_ELEMENT_SEPARATOR",
        "X12_MISSING_GE",
        "X12_MISSING_IEA",
        "X12_MISSING_REQUIRED_LOOP",
        "X12_MISSING_SE",
        "X12_PRE_005010",
        "X12_SEGMENT_COUNT_MISMATCH",
        "X12_STATED_AMOUNT_DISCARDED",
        "X12_TRAILING_GARBAGE",
        "X12_TRANSACTION_COUNT_MISMATCH",
        "X12_UNEXPECTED_SEGMENT",
        "X12_UNKNOWN_CARC",
        "X12_UNKNOWN_CLAIM_STATUS",
        "X12_UNKNOWN_CLAIM_STATUS_CATEGORY",
        "X12_UNKNOWN_HI_QUALIFIER",
        "X12_UNKNOWN_RARC",
        "X12_UNPARSEABLE_DECIMAL",
      ]
    `);
  });

  it("WARNING_CODES keys equal their values (registry self-consistency)", () => {
    for (const [k, v] of Object.entries(WARNING_CODES)) expect(k).toBe(v);
  });

  it("the registry is additions-only: 21 -> 22 (Phase 8) -> 23 (X12-QUANTITY-SILENT-DEFAULTS) -> 24 (X12-837-SV-SILENT-ZERO) -> 25 (X12-VARIANT-LOOKUP-PROTOTYPE) -> 26 (X12-837-LOOP-RESIDUALS) -> 27 (X12-DISCARD-AFTER-STRAY-LX) -> 28 (X12-PAY-TO-FUSION) -> 29 (X12-837-SV-UNDEFINED-DECIMAL) -> 30 (X12-AMT-ADX-ABSENT-AMOUNT) -> 31 (X12-STATED-AMOUNT-DISCARDED) -> 32 (X12-837-AMBIGUOUS-VARIANT) -> 33 (X12-837-SV1-OVERWRITE) -> 34 (X12-ISA-ELEMENT-ARITY) -> 39 (the 270 typed model)", () => {
    // FIVE added by the 270 typed read path, and nothing renamed, removed or
    // renumbered: the two tolerances that path reports (a declared
    // non-conventional delimiter, whitespace between segments), the two
    // hierarchy hazards it detects (a duplicated HL-01, a parent chain that
    // returns to itself), and the loss it reports when a level's declared
    // parent does not resolve. Every one is raised on the 270 path alone, which
    // is what keeps a fixture of any other transaction set on the warning
    // stream it had before.
    expect(Object.keys(WARNING_CODES)).toHaveLength(39);
  });

  it("keeps the four REQUIRED_LOOPS the 837 owns and adds the 270's three", () => {
    // `X12_MISSING_REQUIRED_LOOP` is one code over a library-owned
    // discriminant, so the 270's structural regions are reported through the
    // EXISTING code rather than three more. The discriminant values are
    // prefixed, because the 837's Loop 2000A and the 270's are different loops
    // that share a number and a message may not say the wrong one.
    expect(Object.values(REQUIRED_LOOPS).sort((a, b) => a.localeCompare(b))).toEqual([
      "2000A",
      "2000B",
      "2010BA",
      "2010BB",
      "270-2000A",
      "270-2100",
      "270-2110",
    ]);
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
