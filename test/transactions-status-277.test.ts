/**
 * Unit tests for the Phase 6 277 / 277CA claim-status surface
 * (`get277Status` + `get277CADisposition`). Covers:
 *
 * - Tier-1 canonical 277 (X212): full HL spine (Source → Receiver →
 *   Service Provider → Subscriber), claim-level TRN trace, STC status
 *   decode (CSCC / CSC resolved against the bundled snapshot), supplemental
 *   REF / DTP, and a service-line status (Loop 2220) opened on SVC.
 * - **Status-code fidelity** — the safety property: STC category + status
 *   codes surface verbatim; unknown codes (Tier-2 fixture) preserve their
 *   value and emit `X12_UNKNOWN_CLAIM_STATUS_CATEGORY` /
 *   `X12_UNKNOWN_CLAIM_STATUS`.
 * - Tier-1 277CA (X214): a provider-level batch acknowledgment where a
 *   claim opens on a standalone STC (no TRN) plus claim-level TRN traces;
 *   `transactionType` resolves to `"claim-acknowledgment"` from ST-03.
 * - `get277CADisposition` admits ONLY the X214 convention reference;
 *   `get277Status` admits either. Both reject a non-277 transaction set.
 * - Tier-2 277CA HL-orphan quirk: a dangling HL parent pointer emits
 *   `X12_HL_PARENT_MISMATCH` and the verbatim parent id is preserved —
 *   the walker NEVER silently re-numbers.
 * - X12Decimal: STC + SVC monetary fields decode as decimal, not float.
 */

import { readFileSync } from "node:fs";
import { join } from "node:path";

import { describe, expect, it } from "vitest";

import {
  STATUS_277_LOOP_2000C,
  STATUS_277_LOOP_2200,
  STATUS_277_LOOP_2220,
  WARNING_CODES,
  X12Decimal,
  get277CADisposition,
  get277Status,
  parseX12,
} from "../src/index.js";
import type { X12ClaimStatusResponse } from "../src/index.js";

const FIXTURE_DIR = join(__dirname, "fixtures", "status");

function readStatus(
  name: string,
  fn: typeof get277Status | typeof get277CADisposition = get277Status,
): X12ClaimStatusResponse {
  const raw = readFileSync(join(FIXTURE_DIR, name), "utf8").trimEnd();
  const ix = parseX12(raw);
  const tx = ix.groups[0]?.transactions.find((t) => t.st.elements[1] === "277");
  if (tx === undefined) throw new Error(`Fixture ${name} has no 277 transaction set`);
  const result = fn(ix.delimiters, tx);
  if (result === undefined) throw new Error(`walker returned undefined for ${name}`);
  return result;
}

describe("get277Status — Tier-1 canonical (X212)", () => {
  it("decodes the canonical 277 fixture end-to-end with no warnings", () => {
    const r = readStatus("277-canonical.edi");
    expect(r.transactionType).toBe("claim-status");
    expect(r.implementationConventionReference).toBe("005010X212");
    expect(r.warnings).toHaveLength(0);
    expect(r.claims).toHaveLength(1);

    const claim = r.claims[0];
    expect(claim?.informationSource?.name).toBe("MEDPAY INSURANCE");
    expect(claim?.serviceProvider?.name).toBe("ANYTOWN CLINIC");
    expect(claim?.serviceProvider?.idCode).toBe("1234567890");
    expect(claim?.subscriber?.lastName).toBe("DOE");
    expect(claim?.subscriber?.firstName).toBe("JANE");
  });

  it("echoes the requesting 276 TRN verbatim", () => {
    const r = readStatus("277-canonical.edi");
    expect(r.claims[0]?.traces[0]?.referenceId).toBe("ECHO-276-TRACE-001");
  });

  it("decodes the STC status with resolved CSCC / CSC descriptions", () => {
    const r = readStatus("277-canonical.edi");
    const info = r.claims[0]?.statuses[0];
    expect(info?.statusEffectiveDate).toBe("20260601");
    expect(info?.actionCode).toBe("WQ");
    expect(info?.totalChargeAmount).toBeInstanceOf(X12Decimal);
    expect(info?.totalChargeAmount?.toString()).toBe("150");

    const code = info?.statuses[0];
    expect(code?.categoryCode).toBe("A2");
    expect(code?.categoryDescription).toContain("Acceptance into adjudication system");
    expect(code?.statusCode).toBe("20");
    expect(code?.statusDescription).toBe("Accepted for processing.");
    expect(code?.entityCode).toBe("PR");
  });

  it("captures claim-level REF / DTP and a service-line status (Loop 2220)", () => {
    const r = readStatus("277-canonical.edi");
    const claim = r.claims[0];
    expect(claim?.references[0]).toMatchObject({ qualifier: "1K", value: "PCN0001" });
    expect(claim?.dates[0]).toMatchObject({ qualifier: "472", value: "20260520" });

    expect(claim?.serviceLines).toHaveLength(1);
    const line = claim?.serviceLines[0];
    expect(line?.serviceIdQualifier).toBe("HC");
    expect(line?.procedureCode).toBe("99213");
    expect(line?.lineChargeAmount?.toString()).toBe("150");
    expect(line?.statuses[0]?.statuses[0]?.statusCode).toBe("20");
    expect(line?.references[0]?.value).toBe("LINE001");
  });
});

describe("get277Status — Tier-2 unknown status codes (fidelity)", () => {
  it("preserves verbatim unknown CSCC / CSC and emits both warnings", () => {
    const r = readStatus("277-unknown-status.edi");
    const code = r.claims[0]?.statuses[0]?.statuses[0];
    expect(code?.categoryCode).toBe("ZZ");
    expect(code?.categoryDescription).toBeUndefined();
    expect(code?.statusCode).toBe("999");
    expect(code?.statusDescription).toBeUndefined();

    const codes = r.warnings.map((w) => w.code);
    expect(codes).toContain(WARNING_CODES.X12_UNKNOWN_CLAIM_STATUS_CATEGORY);
    expect(codes).toContain(WARNING_CODES.X12_UNKNOWN_CLAIM_STATUS);
  });
});

describe("get277CADisposition — Tier-1 batch acknowledgment (X214)", () => {
  it("decodes a provider-level batch ack into per-claim dispositions", () => {
    const r = readStatus("277ca-canonical.edi", get277CADisposition);
    expect(r.transactionType).toBe("claim-acknowledgment");
    expect(r.implementationConventionReference).toBe("005010X214");
    expect(r.warnings).toHaveLength(0);
    expect(r.claims).toHaveLength(3);

    // Batch-level receipt (opened on TRN at the receiver level).
    expect(r.claims[0]?.traces[0]?.referenceId).toBe("BATCH-2026-06-01-001");
    expect(r.claims[0]?.statuses[0]?.statuses[0]?.categoryCode).toBe("A1");

    // Provider-level accepted claim.
    expect(r.claims[1]?.serviceProvider?.name).toBe("ANYTOWN CLINIC");
    expect(r.claims[1]?.statuses[0]?.statuses[0]?.categoryCode).toBe("A2");
    expect(r.claims[1]?.references[0]).toMatchObject({ qualifier: "1K" });

    // Subscriber-level rejected claim.
    expect(r.claims[2]?.subscriber?.lastName).toBe("DOE");
    const rejected = r.claims[2]?.statuses[0]?.statuses[0];
    expect(rejected?.categoryCode).toBe("A7");
    expect(rejected?.statusCode).toBe("21");
    expect(rejected?.statusDescription).toBe("Missing or invalid information.");
  });

  it("admits the X214 convention only; get277Status admits either", () => {
    const raw = readFileSync(join(FIXTURE_DIR, "277ca-canonical.edi"), "utf8").trimEnd();
    const ix = parseX12(raw);
    const tx = ix.groups[0]?.transactions.find((t) => t.st.elements[1] === "277");
    expect(tx).toBeDefined();
    if (tx === undefined) return;
    expect(get277CADisposition(ix.delimiters, tx)).toBeDefined();
    expect(get277Status(ix.delimiters, tx)).toBeDefined();
  });

  it("rejects a plain X212 277 from get277CADisposition", () => {
    const raw = readFileSync(join(FIXTURE_DIR, "277-canonical.edi"), "utf8").trimEnd();
    const ix = parseX12(raw);
    const tx = ix.groups[0]?.transactions.find((t) => t.st.elements[1] === "277");
    expect(tx).toBeDefined();
    if (tx === undefined) return;
    expect(get277CADisposition(ix.delimiters, tx)).toBeUndefined();
  });
});

describe("get277CADisposition — Tier-2 HL-orphan quirk", () => {
  it("emits X12_HL_PARENT_MISMATCH and preserves the verbatim parent id", () => {
    const r = readStatus("277ca-hl-orphan.edi", get277CADisposition);
    const codes = r.warnings.map((w) => w.code);
    expect(codes).toContain(WARNING_CODES.X12_HL_PARENT_MISMATCH);
    expect(r.hierarchies.find((h) => h.hlId === "4")?.parentHlId).toBe("9");
  });
});

describe("get277Status — guards + dogfooded specs", () => {
  it("returns undefined for a non-277 transaction set", () => {
    const raw = readFileSync(join(FIXTURE_DIR, "277-canonical.edi"), "utf8").trimEnd();
    const ix = parseX12(raw);
    const tx = ix.groups[0]?.transactions[0];
    expect(tx).toBeDefined();
    if (tx === undefined) return;
    const spoofed = { ...tx, st: { ...tx.st, elements: ["ST", "835", "0001"] } };
    expect(get277Status(ix.delimiters, spoofed)).toBeUndefined();
    expect(get277CADisposition(ix.delimiters, spoofed)).toBeUndefined();
  });

  it("exposes the HL hierarchy + dogfooded loop specs as public artifacts", () => {
    const r = readStatus("277-canonical.edi");
    expect(r.hierarchies.map((h) => h.levelCode)).toEqual(["20", "21", "19", "22"]);
    expect(STATUS_277_LOOP_2000C.children[0]?.id).toBe("2200");
    expect(STATUS_277_LOOP_2200.trigger).toBe("TRN");
    expect(STATUS_277_LOOP_2220.trigger).toBe("SVC");
  });
});
