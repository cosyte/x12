/**
 * Unit tests for the Phase 7 834 enrollment surface (`get834Header` +
 * `get834Enrollments`). Covers:
 *
 * - Tier-1 canonical 834 (X220A1): the BGN header + sponsor (N1*P5) +
 *   payer (N1*IN); two member-level INS loops streamed one at a time, each
 *   with its maintenance type resolved against the bundled X12 0875
 *   snapshot, member NM1 + DMG + address, REF ids, DTP dates, an HD health
 *   coverage with its own DTP/AMT, and a COB coordination-of-benefits.
 * - X12Decimal: the HD AMT premium decodes as decimal, not float.
 * - Safety-critical maintenance type: an unknown INS-03 raises
 *   `X12_834_UNKNOWN_MAINTENANCE_TYPE` on that member only and NEVER infers
 *   an action - the verbatim code is preserved.
 * - **Streaming property**: a programmatically generated 10MB+ synthetic
 *   834 yields one `X12Enrollment` per INS without materializing the whole
 *   roster; early-break stops the walk.
 * - Mis-route guards: `get834Header` returns `undefined` and
 *   `get834Enrollments` yields nothing for a non-834 transaction set.
 * - The dogfooded loop specs are public `defineLoopSpec` artifacts.
 */

import { readFileSync } from "node:fs";
import { join } from "node:path";

import { describe, expect, it } from "vitest";

import {
  ENROLLMENT_834_LOOP_2000,
  ENROLLMENT_834_LOOP_2300,
  ENROLLMENT_834_LOOP_2320,
  WARNING_CODES,
  X12Decimal,
  get834Enrollments,
  get834Header,
  parseX12,
} from "../src/index.js";
import type { Delimiters, X12Enrollment, X12TransactionSet } from "../src/index.js";

const FIXTURE_DIR = join(__dirname, "fixtures", "enrollment");

function load834(raw: string): { delimiters: Delimiters; tx: X12TransactionSet } {
  const ix = parseX12(raw.trimEnd());
  const tx = ix.groups[0]?.transactions.find((t) => t.st.elements[1] === "834");
  if (tx === undefined) throw new Error("fixture has no 834 transaction set");
  return { delimiters: ix.delimiters, tx };
}

async function collect834(raw: string): Promise<X12Enrollment[]> {
  const { delimiters, tx } = load834(raw);
  const out: X12Enrollment[] = [];
  for await (const member of get834Enrollments(delimiters, tx)) out.push(member);
  return out;
}

describe("get834Header - Tier-1 canonical (X220A1)", () => {
  it("decodes the BGN header and the sponsor + payer parties", () => {
    const raw = readFileSync(join(FIXTURE_DIR, "834-canonical.edi"), "utf8");
    const { delimiters, tx } = load834(raw);
    const header = get834Header(delimiters, tx);
    expect(header?.transactionSetPurposeCode).toBe("00");
    expect(header?.referenceId).toBe("ENR-202606");
    expect(header?.actionCode).toBe("2");
    expect(header?.sponsor?.entityIdentifierCode).toBe("P5");
    expect(header?.sponsor?.name).toBe("EMPLOYER CO");
    expect(header?.payer?.entityIdentifierCode).toBe("IN");
    expect(header?.payer?.name).toBe("MEDPAY INSURANCE");
  });
});

describe("get834Enrollments - Tier-1 canonical (X220A1)", () => {
  it("streams one member per INS loop with resolved maintenance types", async () => {
    const raw = readFileSync(join(FIXTURE_DIR, "834-canonical.edi"), "utf8");
    const members = await collect834(raw);
    expect(members).toHaveLength(2);

    const add = members[0];
    expect(add?.warnings).toHaveLength(0);
    expect(add?.subscriberIndicator).toBe("Y");
    expect(add?.relationshipCode).toBe("18");
    expect(add?.maintenanceTypeCode).toBe("021");
    expect(add?.maintenanceTypeDescription).toBe("Addition");
    expect(add?.member?.lastName).toBe("DOE");
    expect(add?.member?.firstName).toBe("JANE");
    expect(add?.member?.idCode).toBe("MBR0001");
    expect(add?.member?.dateOfBirth).toBe("19850515");
    expect(add?.member?.genderCode).toBe("F");
    expect(add?.member?.address?.lines).toEqual(["100 MAIN ST"]);
    expect(add?.member?.address?.city).toBe("COLUMBUS");
    expect(add?.references.map((r) => r.qualifier)).toEqual(["0F", "1L"]);
    expect(add?.dates[0]?.qualifier).toBe("356");

    expect(add?.healthCoverages).toHaveLength(1);
    const cov = add?.healthCoverages[0];
    expect(cov?.insuranceLineCode).toBe("HLT");
    expect(cov?.planCoverageDescription).toBe("GOLD PPO");
    expect(cov?.dates[0]?.qualifier).toBe("348");
    expect(cov?.amounts[0]?.qualifier).toBe("P3");
    expect(cov?.amounts[0]?.amount).toBeInstanceOf(X12Decimal);
    expect(cov?.amounts[0]?.amount.toString()).toBe("125.00");

    expect(add?.coordinationOfBenefits[0]?.payerResponsibility).toBe("P");
    expect(add?.coordinationOfBenefits[0]?.referenceId).toBe("OTHERGRP-1");
  });

  it("decodes the second member as a termination (024)", async () => {
    const raw = readFileSync(join(FIXTURE_DIR, "834-canonical.edi"), "utf8");
    const members = await collect834(raw);
    const term = members[1];
    expect(term?.maintenanceTypeCode).toBe("024");
    expect(term?.maintenanceTypeDescription).toBe("Cancellation or Termination");
    expect(term?.member?.lastName).toBe("ROE");
    expect(term?.healthCoverages[0]?.insuranceLineCode).toBe("DEN");
  });
});

describe("get834Enrollments - safety-critical maintenance type", () => {
  it("warns on an unknown INS-03 and never infers the action", async () => {
    const raw = [
      "ISA*00*          *00*          *ZZ*EMPLOYERCO     *ZZ*MEDPAY         *260601*1200*^*00501*000000001*0*P*:~",
      "GS*BE*EMPLOYERCO*MEDPAY*20260601*1200*1*X*005010X220A1~",
      "ST*834*0001~",
      "BGN*00*ENR-X*20260601*1200****2~",
      "INS*Y*18*999*EC*A***FT~",
      "NM1*IL*1*DOE*JANE****MI*MEMBER-1~",
      "SE*5*0001~",
      "GE*1*1~",
      "IEA*1*000000001~",
    ].join("\n");
    const members = await collect834(raw);
    expect(members).toHaveLength(1);
    expect(members[0]?.maintenanceTypeCode).toBe("999");
    expect(members[0]?.maintenanceTypeDescription).toBeUndefined();
    expect(members[0]?.warnings).toHaveLength(1);
    expect(members[0]?.warnings[0]?.code).toBe(WARNING_CODES.X12_834_UNKNOWN_MAINTENANCE_TYPE);
    // The H-PHI invariant: the message echoes the shape-valid code, never PHI.
    expect(members[0]?.warnings[0]?.message).not.toContain("MEMBER-1");
  });
});

describe("get834Header - edge cases", () => {
  it("ignores a non-P5/IN header party and skips a valueless header DTP", () => {
    const raw = readFileSync(join(FIXTURE_DIR, "834-edge.edi"), "utf8");
    const { delimiters, tx } = load834(raw);
    const header = get834Header(delimiters, tx);
    // N1*BO is neither sponsor (P5) nor payer (IN) - both stay undefined.
    expect(header?.sponsor).toBeUndefined();
    expect(header?.payer).toBeUndefined();
    // DTP*007*D8 has no DTP-03 value - it produces no date.
    expect(header?.dates).toHaveLength(0);
    expect(header?.references.map((r) => r.qualifier)).toEqual(["38"]);
  });
});

describe("get834Enrollments - edge cases", () => {
  it("skips member-detail segments that precede the member NM1", async () => {
    const raw = readFileSync(join(FIXTURE_DIR, "834-edge.edi"), "utf8");
    const members = await collect834(raw);
    expect(members).toHaveLength(2);

    // Member A: DMG/N3/N4 arrive before any IL NM1, and the only NM1 is a
    // non-IL custodial party (31) - so no member is ever attached.
    const a = members[0];
    expect(a?.member).toBeUndefined();
    // The AMT here has no open coverage (no HD) - it is dropped, not attached.
    expect(a?.healthCoverages).toHaveLength(0);
  });

  it("keeps the first IL member when a second IL NM1 follows, and tolerates an empty INS-03", async () => {
    const raw = readFileSync(join(FIXTURE_DIR, "834-edge.edi"), "utf8");
    const members = await collect834(raw);
    const b = members[1];
    // INS-03 is empty - no maintenance type, no description, no warning.
    expect(b?.maintenanceTypeCode).toBe("");
    expect(b?.maintenanceTypeDescription).toBeUndefined();
    expect(b?.warnings).toHaveLength(1); // the unknown HD maintenance code, below.
    // The first IL NM1 wins; the second IL NM1 does not overwrite it.
    expect(b?.member?.idCode).toBe("MBR0011");
    expect(b?.member?.firstName).toBe("JOHN");
    // N4 with empty city/state merges onto the N3-seeded address (postal only).
    expect(b?.member?.address?.lines).toEqual(["2 EDGE AVE"]);
    expect(b?.member?.address?.city).toBeUndefined();
    expect(b?.member?.address?.postalCode).toBe("43215");
  });

  it("warns on an unknown HD maintenance code and drops valueless coverage DTP/AMT", async () => {
    const raw = readFileSync(join(FIXTURE_DIR, "834-edge.edi"), "utf8");
    const members = await collect834(raw);
    const b = members[1];
    expect(b?.healthCoverages).toHaveLength(1);
    const cov = b?.healthCoverages[0];
    // HD-01 "ZZ" is not in the X12 0875 snapshot - verbatim, with a warning.
    expect(cov?.maintenanceTypeCode).toBe("ZZ");
    expect(cov?.maintenanceTypeDescription).toBeUndefined();
    expect(b?.warnings[0]?.code).toBe(WARNING_CODES.X12_834_UNKNOWN_MAINTENANCE_TYPE);
    // DTP*348*D8 (no value) and AMT*P3 (no amount) produce nothing.
    expect(cov?.dates).toHaveLength(0);
    expect(cov?.amounts).toHaveLength(0);
  });

  it("yields nothing extra and tolerates a transaction set with no SE trailer", async () => {
    const raw = [
      "ISA*00*          *00*          *ZZ*EMPLOYERCO     *ZZ*MEDPAY         *260601*1200*^*00501*000000004*0*P*:~",
      "GS*BE*EMPLOYERCO*MEDPAY*20260601*1200*4*X*005010X220A1~",
      "ST*834*0004~",
      "BGN*00*ENR-NOSE*20260601*1200****2~",
      "INS*Y*18*021*EC*A***FT~",
      "NM1*IL*1*DOE*JANE****MI*MEMBER-1~",
      "GE*1*1~",
      "IEA*1*000000004~",
    ].join("\n");
    const { delimiters, tx } = load834(raw);
    expect(tx.se).toBeUndefined();
    const out: X12Enrollment[] = [];
    for await (const member of get834Enrollments(delimiters, tx)) out.push(member);
    expect(out).toHaveLength(1);
    expect(out[0]?.member?.idCode).toBe("MEMBER-1");
  });
});

describe("get834Enrollments - streaming property (10MB+ synthetic file)", () => {
  function buildLarge834(memberCount: number): string {
    const head = [
      "ISA*00*          *00*          *ZZ*EMPLOYERCO     *ZZ*MEDPAY         *260601*1200*^*00501*000000001*0*P*:~",
      "GS*BE*EMPLOYERCO*MEDPAY*20260601*1200*1*X*005010X220A1~",
      "ST*834*0001~",
      "BGN*00*ENR-BIG*20260601*1200****2~",
      "N1*P5*EMPLOYER CO*FI*444556666~",
      "N1*IN*MEDPAY INSURANCE*FI*111223333~",
    ];
    const parts: string[] = [...head];
    for (let n = 1; n <= memberCount; n += 1) {
      const id = String(n).padStart(7, "0");
      parts.push(
        "INS*Y*18*021*EC*A***FT~",
        `REF*0F*MEMBER-${id}~`,
        `NM1*IL*1*DOE*JANE****MI*MEMBER-${id}~`,
        "DTP*356*D8*20260101~",
        "HD*021**HLT*GOLD PPO*FAM~",
      );
    }
    const segCount = head.length + memberCount * 5 + 1; // + SE itself
    parts.push(`SE*${String(segCount)}*0001~`, "GE*1*1~", "IEA*1*000000001~");
    return parts.join("");
  }

  it("yields one enrollment per INS over a 10MB+ file and supports early-break", async () => {
    const memberCount = 90_000;
    const raw = buildLarge834(memberCount);
    expect(raw.length).toBeGreaterThan(10 * 1024 * 1024);

    const { delimiters, tx } = load834(raw);

    // Early-break: pull just the first 3 members without draining the rest.
    const firstThree: X12Enrollment[] = [];
    for await (const member of get834Enrollments(delimiters, tx)) {
      firstThree.push(member);
      if (firstThree.length === 3) break;
    }
    expect(firstThree).toHaveLength(3);
    expect(firstThree[0]?.member?.idCode).toBe("MEMBER-0000001");
    expect(firstThree[2]?.member?.idCode).toBe("MEMBER-0000003");

    // Full drain: every member surfaces exactly once, in order, one at a
    // time (the loop never builds an array of all members internally).
    let count = 0;
    let lastSeen = "";
    for await (const member of get834Enrollments(delimiters, tx)) {
      count += 1;
      lastSeen = member.member?.idCode ?? "";
    }
    expect(count).toBe(memberCount);
    expect(lastSeen).toBe(`MEMBER-${String(memberCount).padStart(7, "0")}`);
  }, 120_000);
});

describe("get834 - guards + dogfooded specs", () => {
  it("returns undefined / yields nothing for a non-834 transaction set", async () => {
    const raw = readFileSync(join(FIXTURE_DIR, "834-canonical.edi"), "utf8");
    const { delimiters, tx } = load834(raw);
    const spoofed = { ...tx, st: { ...tx.st, elements: ["ST", "999", "0001"] } };
    expect(get834Header(delimiters, spoofed)).toBeUndefined();
    const out: X12Enrollment[] = [];
    for await (const member of get834Enrollments(delimiters, spoofed)) out.push(member);
    expect(out).toHaveLength(0);
  });

  it("exposes the 834 loop hierarchy as public defineLoopSpec artifacts", () => {
    expect(ENROLLMENT_834_LOOP_2000.trigger).toBe("INS");
    expect(ENROLLMENT_834_LOOP_2000.children.map((c) => c.trigger)).toEqual(["NM1", "HD"]);
    expect(ENROLLMENT_834_LOOP_2300.trigger).toBe("HD");
    expect(ENROLLMENT_834_LOOP_2300.children[0]?.trigger).toBe("COB");
    expect(ENROLLMENT_834_LOOP_2320.trigger).toBe("COB");
  });
});
