/**
 * Build-side safety properties for the 005010X218 820 and 005010X220A1 834
 * domain builders. Two invariants, mirroring the read-side fuzz/echo tests:
 *
 * - **820 RMR echo** - `build820` places the caller's open-item reference
 *   (RMR-02) and amount paid (RMR-04) into the segment verbatim and NEVER
 *   normalizes them; building a remittance around a random policy reference
 *   and a random cents-exact amount, then walking the result, yields the
 *   byte-for-byte original.
 * - **834 maintenance-type fidelity** - INS-03 is the 834's safety
 *   primitive. For any KNOWN maintenance code the builder emits it verbatim
 *   (round-trips byte-for-byte); for any code OUTSIDE the validated X12 875
 *   subset the builder REFUSES rather than emit an action a downstream
 *   enrollment system would mis-apply.
 */

import fc from "fast-check";
import { describe, it, expect } from "vitest";

import {
  build820,
  build834,
  Enrollment834BuildError,
  get820Payments,
  get834Enrollments,
  lookupMaintenanceType,
  X12Decimal,
  type Build820Spec,
  type Build834Spec,
} from "../../src/index.js";

const ENVELOPE = {
  senderId: "EMPLOYERCO",
  receiverId: "MEDPAY",
  interchangeDate: "260601",
  interchangeTime: "1200",
  interchangeControlNumber: "000000001",
  groupControlNumber: "1",
  transactionSetControlNumber: "0001",
} as const;

/** Reference tokens drawn from a delimiter-safe grammar (no `*` `:` `^` `~`). */
const refArb = fc.stringMatching(/^[A-Z0-9-]{1,20}$/).filter((s) => s.length > 0);

/** Cents-exact amounts as canonical decimal strings (e.g. "250.00", "12.34"). */
const amountArb = fc
  .tuple(fc.integer({ min: 0, max: 999999 }), fc.integer({ min: 0, max: 99 }))
  .map(([dollars, cents]) => `${String(dollars)}.${cents.toString().padStart(2, "0")}`);

function spec820(reference: string, amount: string): Build820Spec {
  return {
    envelope: ENVELOPE,
    payment: {
      transactionHandlingCode: "I",
      totalPremiumAmount: X12Decimal.fromString(amount) ?? X12Decimal.ZERO,
      creditDebitFlag: "C",
      method: "ACH",
      paymentDate: "20260601",
    },
    traces: [{ traceTypeCode: "1", referenceId: "PREM-1" }],
    remittances: [
      {
        individual: {
          entityIdentifierCode: "IL",
          lastName: "DOE",
          idQualifier: "34",
          idCode: "MBR1",
        },
        openItems: [
          {
            qualifier: "AZ",
            referenceId: reference,
            amountPaid: X12Decimal.fromString(amount) ?? X12Decimal.ZERO,
          },
        ],
      },
    ],
  };
}

function spec834(maintenanceTypeCode: string): Build834Spec {
  return {
    envelope: ENVELOPE,
    header: {
      transactionSetPurposeCode: "00",
      sponsor: { entityIdentifierCode: "P5", name: "EMPLOYER CO" },
      payer: { entityIdentifierCode: "IN", name: "MEDPAY INSURANCE" },
    },
    members: [
      {
        subscriberIndicator: "Y",
        relationshipCode: "18",
        maintenanceTypeCode,
        member: { lastName: "DOE" },
      },
    ],
  };
}

describe("build820 - RMR open-item echo property", () => {
  it("emits the caller's reference and amount verbatim", () => {
    fc.assert(
      fc.property(refArb, amountArb, (reference, amount) => {
        const ix = build820(spec820(reference, amount));
        const tx = ix.groups[0]?.transactions[0];
        if (tx === undefined) return false;
        const prem = get820Payments(ix.delimiters, tx);
        const item = prem?.remittances[0]?.openItems[0];
        return item?.referenceId === reference && item?.amountPaid.toString() === amount;
      }),
    );
  });
});

describe("build834 - maintenance-type fidelity property", () => {
  // Every known code in the validated X12 875 subset.
  const knownCodes = ["001", "002", "003", "004", "021", "024", "025", "026", "030"] as const;

  it("emits any KNOWN INS-03 maintenance code verbatim", async () => {
    for (const code of knownCodes) {
      const ix = build834(spec834(code));
      const tx = ix.groups[0]?.transactions[0];
      if (tx === undefined) throw new Error("no transaction");
      const members: string[] = [];
      for await (const member of get834Enrollments(ix.delimiters, tx)) {
        members.push(member.maintenanceTypeCode);
      }
      expect(members).toEqual([code]);
    }
  });

  it("REFUSES any INS-03 code outside the validated subset", () => {
    fc.assert(
      fc.property(
        fc.stringMatching(/^[0-9]{3}$/).filter((c) => lookupMaintenanceType(c) === undefined),
        (unknownCode) => {
          try {
            build834(spec834(unknownCode));
            return false; // should have thrown
          } catch (err) {
            return err instanceof Enrollment834BuildError;
          }
        },
      ),
    );
  });
});
