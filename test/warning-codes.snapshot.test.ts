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

import { createHash } from "node:crypto";

import { describe, expect, it } from "vitest";

import {
  ALL_WARNING_MESSAGES,
  FATAL_CODES,
  REQUIRED_LOOPS,
  WARNING_CODES,
  attachmentAbsent,
  rfaiHeaderAbsent,
  rfaiLevelAbsent,
  rfaiRequestAbsent,
} from "../src/index.js";

function sortedWarningCodes(): string[] {
  return Object.values(WARNING_CODES).sort((a, b) => a.localeCompare(b));
}

function sortedFatalCodes(): string[] {
  return Object.values(FATAL_CODES).sort((a, b) => a.localeCompare(b));
}

describe("public API: WARNING_CODES surface is stable", () => {
  it("the sorted set of Tier-2 warning codes matches the locked snapshot", () => {
    // AC-18: the four attachments codes are the only lines this snapshot gained.
    expect(sortedWarningCodes()).toMatchInlineSnapshot(`
      [
        "X12_270_DATE_ROW_DROPPED",
        "X12_270_DUPLICATE_HIERARCHY_ID",
        "X12_270_HIERARCHY_CYCLE",
        "X12_270_INTER_SEGMENT_LINE_BREAK",
        "X12_270_LEVEL_DETACHED",
        "X12_270_NON_CONVENTIONAL_DELIMITER",
        "X12_271_AAA_LOOP_UNIDENTIFIED",
        "X12_271_AAA_REJECT_REASON_ABSENT",
        "X12_271_AAA_SEGMENT_MALFORMED",
        "X12_271_AAA_UNKNOWN_CODE",
        "X12_275_ATTACHMENT_ABSENT",
        "X12_276_DATE_ROW_DROPPED",
        "X12_276_DUPLICATE_HIERARCHY_ID",
        "X12_276_HIERARCHY_CYCLE",
        "X12_276_LEVEL_DETACHED",
        "X12_276_REFERENCE_ROW_DROPPED",
        "X12_277_RFAI_HEADER_ABSENT",
        "X12_277_RFAI_LEVEL_ABSENT",
        "X12_277_RFAI_REQUEST_ABSENT",
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
        "X12_BINARY_DATA_TRUNCATED",
        "X12_BINARY_LENGTH_INVALID",
        "X12_BINARY_LENGTH_MISMATCH",
        "X12_BINARY_LENGTH_UNVERIFIABLE",
        "X12_CONTROL_NUMBER_MISMATCH",
        "X12_DANGLING_RELEASE_CHAR",
        "X12_GROUP_COUNT_MISMATCH",
        "X12_GUIDE_NOT_DECLARED",
        "X12_GUIDE_NOT_IMPLEMENTED",
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

  it("the registry is additions-only: 21 -> 22 (Phase 8) -> 23 (X12-QUANTITY-SILENT-DEFAULTS) -> 24 (X12-837-SV-SILENT-ZERO) -> 25 (X12-VARIANT-LOOKUP-PROTOTYPE) -> 26 (X12-837-LOOP-RESIDUALS) -> 27 (X12-DISCARD-AFTER-STRAY-LX) -> 28 (X12-PAY-TO-FUSION) -> 29 (X12-837-SV-UNDEFINED-DECIMAL) -> 30 (X12-AMT-ADX-ABSENT-AMOUNT) -> 31 (X12-STATED-AMOUNT-DISCARDED) -> 32 (X12-837-AMBIGUOUS-VARIANT) -> 33 (X12-837-SV1-OVERWRITE) -> 34 (X12-ISA-ELEMENT-ARITY) -> 40 (the 270 typed model) -> 44 (the 271 AAA request-validation surface) -> 49 (the 276 typed model) -> 51 (the declared-guide check) -> 55 (BDS / BIN binary framing, AC-9) -> 59 (the attachments readers, AC-18)", () => {
    // SIX added by the 270 typed read path, and nothing renamed, removed or
    // renumbered: the two tolerances that path reports (a declared
    // non-conventional delimiter, whitespace between segments), the two
    // hierarchy hazards it detects (a duplicated HL-01, a parent chain that
    // returns to itself), the loss it reports when a level's declared parent
    // does not resolve, and the loss it reports when a DTP reaches it short of
    // the elements a date row is built from. Every one is raised on the 270
    // path alone, which is what keeps a fixture of any other transaction set on
    // the warning stream it had before.
    //
    // FOUR more added by the 271 AAA request-validation surface, again raised
    // on that path alone: a reject reason code the payer did not state, an AAA
    // code outside the bundled snapshot, a malformed AAA element, and an AAA
    // this reader could not attribute to an identified hierarchical loop.
    // ABSENT and UNKNOWN are deliberately two codes and not one: "no reason
    // given" and "a reason given that this package cannot describe" are
    // different answers and a consumer has to be able to tell them apart.
    //
    // FIVE more added by the 276 typed read path: the two hierarchy hazards it
    // detects (a duplicated HL-01, a parent chain that returns to itself), the
    // loss it reports when a level's declared parent does not resolve, and the
    // two row losses it reports when a DTP or a REF reaches it short of the
    // elements that row is built from. They are SIBLINGS of the 270's codes and
    // not a widening of them: a consumer narrowing on `X12_270_LEVEL_DETACHED`
    // must not start seeing claim-status requests on a predicate written for
    // eligibility inquiries. The 276's AMT loss takes the EXISTING
    // `X12_AMOUNT_ROW_DROPPED`, which already names that loss for every AMT
    // this library reads, so it adds no sixth.
    //
    // TWO more added by the declared-guide check on every typed reader (AC-7):
    // a transaction set declaring a guide its reader does not implement, and
    // one declaring none at all. Two codes and not one, because a caller
    // switches on the difference.
    //
    // FOUR more added by BDS / BIN binary framing (AC-9): input that ends
    // before the declared length, an unusable length element, a declared span
    // not followed by the segment terminator, and a string span holding a
    // character that is not one octet. Four codes and not one, because each
    // leaves the model in a different state and a caller switches on which.
    //
    // FOUR more added by the attachments readers (AC-18), again with nothing
    // renamed, removed or re-worded: three absences the 277 request for
    // additional information reader reports (no BHT, no HL, no claim-level
    // request) and the one the 275 reader reports (no BDS). Each is raised on
    // its own reader's path alone, so no other transaction set's warning stream
    // moves.
    expect(Object.keys(WARNING_CODES)).toHaveLength(59);
  });

  it("AC-18: gives no code that existed before the attachments readers a new message", () => {
    // Every message the registry carried before the four attachments codes
    // were added, sorted and joined, is pinned by digest: re-wording one moves
    // it, and so does dropping one. The four added codes' own messages are set
    // aside through their factories, so an addition cannot move it.
    const at = { segmentIndex: 0, transactionIndex: 0 };
    const added = new Set(
      [attachmentAbsent, rfaiHeaderAbsent, rfaiLevelAbsent, rfaiRequestAbsent].map(
        (factory) => factory(at).message,
      ),
    );
    expect(added.size).toBe(4);
    const kept = [...ALL_WARNING_MESSAGES]
      .filter((message) => !added.has(message))
      .sort((a, b) => (a < b ? -1 : a > b ? 1 : 0));
    expect(kept).toHaveLength(86);
    expect(createHash("sha256").update(kept.join("\n")).digest("hex")).toBe(
      "3ae065bdb0c9d6b0bdfb7f03476e95030484d5c6e577adc81b5e5bd9f517193d",
    );
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
