/**
 * Unit tests for the Phase 7 278 Health Care Services Review surface
 * (`get278Request` + `get278Response`). Covers:
 *
 * - Tier-1 canonical 278 request (X217): the BHT header; the four named HL
 *   parties (UMO N1*X3, requester, subscriber NM1*IL + DMG, dependent
 *   absent); a patient-event (`HL*..*EV`) review with its UM
 *   request-category / certification-type / service-type, an HI diagnosis
 *   resolved against the bundled HI_QUALIFIERS snapshot, an attached
 *   service-provider NM1, a DTP date, and an echoed TRN trace.
 * - Tier-1 canonical 278 response (X216): the same HL spine plus the
 *   safety-critical HCR decision - action code preserved verbatim, never
 *   inferred - and the TRN echoed from the request for reassociation.
 * - HL parent-pointer integrity: the `20 → 21 → 22 → 23` spine validates
 *   clean (no warnings); the `EV` event level is tolerated (no false
 *   `X12_HL_PARENT_MISMATCH`).
 * - Mis-route guard: both entry points return `undefined` for a non-278
 *   transaction set.
 * - The dogfooded loop specs are public `defineLoopSpec` artifacts.
 */

import { readFileSync } from "node:fs";
import { join } from "node:path";

import { describe, expect, it } from "vitest";

import {
  AUTH_278_LOOP_2000A,
  AUTH_278_LOOP_2000E,
  AUTH_278_LOOP_2000F,
  WARNING_CODES,
  get278Request,
  get278Response,
  parseX12,
} from "../src/index.js";
import type { Delimiters, X12TransactionSet } from "../src/index.js";

const FIXTURE_DIR = join(__dirname, "fixtures", "auth");

function load278(raw: string): { delimiters: Delimiters; tx: X12TransactionSet } {
  const ix = parseX12(raw.trimEnd());
  const tx = ix.groups[0]?.transactions.find((t) => t.st.elements[1] === "278");
  if (tx === undefined) throw new Error("fixture has no 278 transaction set");
  return { delimiters: ix.delimiters, tx };
}

describe("get278Request - Tier-1 canonical (X217)", () => {
  it("decodes the BHT header, HL parties, and the patient-event review", () => {
    const raw = readFileSync(join(FIXTURE_DIR, "278-request.edi"), "utf8");
    const { delimiters, tx } = load278(raw);
    const req = get278Request(delimiters, tx);

    expect(req?.direction).toBe("request");
    expect(req?.implementationConventionReference).toBe("005010X217");
    expect(req?.header.referenceId).toBe("AUTHREQ-202606");
    expect(req?.header.date).toBe("20260601");

    expect(req?.utilizationManagementOrganization?.entityIdentifierCode).toBe("X3");
    expect(req?.utilizationManagementOrganization?.name).toBe("UTILIZATION REVIEW CO");
    expect(req?.requester?.entityIdentifierCode).toBe("1P");
    expect(req?.subscriber?.lastName).toBe("DOE");
    expect(req?.subscriber?.firstName).toBe("JANE");
    expect(req?.subscriber?.idCode).toBe("MBR0001");
    expect(req?.subscriber?.dateOfBirth).toBe("19850515");
    expect(req?.subscriber?.genderCode).toBe("F");
    expect(req?.dependent).toBeUndefined();

    // The HL spine validates clean and the EV level is tolerated.
    expect(req?.warnings).toHaveLength(0);
    expect(req?.hierarchies.map((h) => h.levelCode)).toEqual(["20", "21", "22", "EV"]);

    expect(req?.reviews).toHaveLength(1);
    const review = req?.reviews[0];
    expect(review?.requestCategoryCode).toBe("HS");
    expect(review?.certificationTypeCode).toBe("I");
    expect(review?.serviceTypeCode).toBe("1");
    expect(review?.decision).toBeUndefined();
    expect(review?.traces[0]?.referenceId).toBe("AUTHREQ-202606-0001");
    expect(review?.diagnoses[0]?.qualifier).toBe("ABK");
    expect(review?.diagnoses[0]?.code).toBe("E1165");
    expect(review?.diagnoses[0]?.codeSystem).toBe("ICD-10-CM");
    expect(review?.providers.map((p) => p.entityIdentifierCode)).toEqual(["71"]);
    expect(review?.dates[0]?.qualifier).toBe("472");
  });
});

describe("get278Response - Tier-1 canonical (X216)", () => {
  it("decodes the HCR decision verbatim and echoes the request TRN", () => {
    const raw = readFileSync(join(FIXTURE_DIR, "278-response.edi"), "utf8");
    const { delimiters, tx } = load278(raw);
    const resp = get278Response(delimiters, tx);

    expect(resp?.direction).toBe("response");
    expect(resp?.implementationConventionReference).toBe("005010X216");
    expect(resp?.warnings).toHaveLength(0);

    expect(resp?.reviews).toHaveLength(1);
    const review = resp?.reviews[0];
    // HCR-01 action code is the safety-critical surface - preserved verbatim.
    expect(review?.decision?.actionCode).toBe("A1");
    expect(review?.decision?.reviewIdentificationNumber).toBe("AUTH123456");
    // TRN echoed from the request for reassociation, never mutated.
    expect(review?.traces[0]?.referenceId).toBe("AUTHREQ-202606-0001");
  });
});

describe("get278Response - comprehensive (dependent, event + service, edge segments)", () => {
  it("decodes the dependent HL and both the event and service reviews", () => {
    const raw = readFileSync(join(FIXTURE_DIR, "278-comprehensive.edi"), "utf8");
    const { delimiters, tx } = load278(raw);
    const resp = get278Response(delimiters, tx);

    expect(resp?.direction).toBe("response");
    expect(resp?.dependent?.entityIdentifierCode).toBe("QC");
    expect(resp?.dependent?.lastName).toBe("DOE");
    expect(resp?.dependent?.firstName).toBe("JOHN");
    expect(resp?.dependent?.idCode).toBe("MBR0002");
    expect(resp?.dependent?.dateOfBirth).toBe("19900101");
    expect(resp?.dependent?.genderCode).toBe("M");

    // The full spine plus the tolerated EV / SS / unknown ZZ levels.
    expect(resp?.hierarchies.map((h) => h.levelCode)).toEqual([
      "20",
      "21",
      "22",
      "23",
      "EV",
      "SS",
      "ZZ",
    ]);
    expect(resp?.reviews).toHaveLength(2);
  });

  it("captures the event review's decision, trace, unknown diagnosis, REF, and message", () => {
    const raw = readFileSync(join(FIXTURE_DIR, "278-comprehensive.edi"), "utf8");
    const { delimiters, tx } = load278(raw);
    const resp = get278Response(delimiters, tx);

    const event = resp?.reviews[0];
    expect(event?.requestCategoryCode).toBe("HS");
    expect(event?.decision?.actionCode).toBe("A1");
    expect(event?.decision?.reviewIdentificationNumber).toBe("AUTH777");
    expect(event?.traces[0]?.referenceId).toBe("AUTHRESP-COMP-0001");
    // Unknown HI qualifier preserved verbatim with codeSystem "unknown".
    expect(event?.diagnoses[0]?.qualifier).toBe("ZZZ");
    expect(event?.diagnoses[0]?.code).toBe("XYZ");
    expect(event?.diagnoses[0]?.codeSystem).toBe("unknown");
    expect(event?.references[0]?.qualifier).toBe("9F");
    // The valueless DTP*472*RD8 (no DTP-03) yields no date.
    expect(event?.dates).toHaveLength(0);
    // The text MSG is captured; the bare MSG~ is dropped.
    expect(event?.messages).toEqual(["Outpatient services certified"]);
    expect(event?.providers.map((p) => p.entityIdentifierCode)).toEqual(["71"]);

    // One warning only - the unknown HI qualifier, shape-valid (never PHI).
    expect(resp?.warnings).toHaveLength(1);
    expect(resp?.warnings[0]?.code).toBe(WARNING_CODES.X12_UNKNOWN_HI_QUALIFIER);
  });

  it("opens a distinct service-level (SS) review with its own UM, HCR, and REF", () => {
    const raw = readFileSync(join(FIXTURE_DIR, "278-comprehensive.edi"), "utf8");
    const { delimiters, tx } = load278(raw);
    const resp = get278Response(delimiters, tx);

    const service = resp?.reviews[1];
    expect(service?.requestCategoryCode).toBe("SC");
    expect(service?.decision?.actionCode).toBe("A4");
    expect(service?.decision?.reviewIdentificationNumber).toBe("PEND444");
    expect(service?.references[0]?.qualifier).toBe("BB");
  });

  it("reports the request direction when read through get278Request", () => {
    const raw = readFileSync(join(FIXTURE_DIR, "278-comprehensive.edi"), "utf8");
    const { delimiters, tx } = load278(raw);
    expect(get278Request(delimiters, tx)?.direction).toBe("request");
  });
});

describe("get278Request - edge cases (orphan segments, missing ST-03)", () => {
  it("drops UM/HCR/HI/TRN/REF/DMG that arrive with no open review or member", () => {
    const raw = readFileSync(join(FIXTURE_DIR, "278-edge.edi"), "utf8");
    const { delimiters, tx } = load278(raw);
    const req = get278Request(delimiters, tx);

    // ST-03 is absent - the implementation convention reference is undefined.
    expect(req?.implementationConventionReference).toBeUndefined();
    expect(req?.utilizationManagementOrganization?.entityIdentifierCode).toBe("X3");

    // The DMG before the subscriber NM1 finds no member - DOB stays unset.
    expect(req?.subscriber?.lastName).toBe("DOE");
    expect(req?.subscriber?.dateOfBirth).toBeUndefined();

    // Only the EV review opens; the orphan UM/HCR/HI/TRN/REF under the UMO
    // level created no review and left no trace.
    expect(req?.reviews).toHaveLength(1);
    const review = req?.reviews[0];
    expect(review?.requestCategoryCode).toBeUndefined();
    expect(review?.decision).toBeUndefined();
    expect(review?.traces).toHaveLength(0);
    expect(review?.references).toHaveLength(0);
    // The HI*:E1165 has a code but no qualifier - preserved verbatim.
    expect(review?.diagnoses[0]?.qualifier).toBe("");
    expect(review?.diagnoses[0]?.code).toBe("E1165");
    expect(review?.diagnoses[0]?.codeSystem).toBe("unknown");
  });

  it("treats an empty ST-03 the same as an absent one", () => {
    const raw = [
      "ISA*00*          *00*          *ZZ*UMOPAYER       *ZZ*SUBMITTER      *260601*1230*^*00501*000000005*0*P*:~",
      "GS*HI*UMOPAYER*SUBMITTER*20260601*1230*5*X*005010X217~",
      "ST*278*0005*~",
      "BHT*0078*13*AUTHREQ-EMPTY*20260601*1230~",
      "HL*1**20*1~",
      "NM1*X3*2*UTILIZATION REVIEW CO*****PI*UMO001~",
      "GE*1*1~",
      "IEA*1*000000005~",
    ].join("\n");
    const { delimiters, tx } = load278(raw);
    expect(tx.se).toBeUndefined();
    const req = get278Request(delimiters, tx);
    expect(req?.implementationConventionReference).toBeUndefined();
    expect(req?.utilizationManagementOrganization?.name).toBe("UTILIZATION REVIEW CO");
  });
});

describe("get278 - guards + dogfooded specs", () => {
  it("returns undefined for a non-278 transaction set", () => {
    const raw = readFileSync(join(FIXTURE_DIR, "278-request.edi"), "utf8");
    const { delimiters, tx } = load278(raw);
    const spoofed = { ...tx, st: { ...tx.st, elements: ["ST", "999", "0001"] } };
    expect(get278Request(delimiters, spoofed)).toBeUndefined();
    expect(get278Response(delimiters, spoofed)).toBeUndefined();
  });

  it("exposes the 278 HL hierarchy as public defineLoopSpec artifacts", () => {
    expect(AUTH_278_LOOP_2000A.trigger).toBe("HL");
    expect(AUTH_278_LOOP_2000E.trigger).toBe("HL");
    expect(AUTH_278_LOOP_2000E.children[0]?.id).toBe("2000F");
    expect(AUTH_278_LOOP_2000F.id).toBe("2000F");
  });
});
