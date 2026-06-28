/**
 * Build-side TRN-echo round-trip property — the safety-critical
 * reassociation invariant for the `build271` / `build277` / `build277CA`
 * emit constructors. A builder MUST place the caller-supplied trace into
 * TRN-02 verbatim and NEVER fabricate, normalize, or mutate it: for any
 * synthetic trace token, building a 271 (or 277 / 277CA) around it and
 * walking the result yields a trace whose `referenceId` is byte-for-byte
 * the original token.
 *
 * This is the emit counterpart to the read-side `trn-echo.property` test:
 * there the raw bytes were hand-authored; here the bytes come out of the
 * real builder, so the property guards the builder's own trace handling.
 */

import fc from "fast-check";
import { describe, it } from "vitest";

import {
  build271,
  build277,
  build277CA,
  get271Eligibility,
  get277CADisposition,
  get277Status,
  type Build271Spec,
  type Build277Spec,
} from "../../src/index.js";

/** Trace tokens drawn from a delimiter-safe grammar (no `*` `:` `^` `~`). */
const traceArb = fc.stringMatching(/^[A-Z0-9-]{1,30}$/).filter((s) => s.length > 0);

const ENVELOPE = {
  senderId: "MEDPAY",
  receiverId: "PROVIDER",
  interchangeDate: "260601",
  interchangeTime: "1200",
  interchangeControlNumber: "000000001",
  groupControlNumber: "1",
  transactionSetControlNumber: "0001",
} as const;

function spec271(trace: string): Build271Spec {
  return {
    envelope: ENVELOPE,
    informationSources: [
      {
        entity: { entityIdentifierCode: "PR", entityTypeQualifier: "2", name: "MEDPAY" },
        receivers: [
          {
            entity: { entityIdentifierCode: "1P", entityTypeQualifier: "2", name: "CLINIC" },
            subscribers: [
              {
                traces: [{ traceTypeCode: "2", referenceId: trace }],
                name: { entityIdentifierCode: "IL", entityTypeQualifier: "1", lastName: "DOE" },
                benefits: [{ eligibilityCode: "1" }],
              },
            ],
          },
        ],
      },
    ],
  };
}

function spec277(trace: string): Build277Spec {
  return {
    envelope: ENVELOPE,
    informationSources: [
      {
        entity: { entityIdentifierCode: "PR", entityTypeQualifier: "2", name: "MEDPAY" },
        receivers: [
          {
            entity: { entityIdentifierCode: "41", entityTypeQualifier: "2", name: "CH" },
            providers: [
              {
                entity: { entityIdentifierCode: "1P", entityTypeQualifier: "2", name: "CLINIC" },
                subscribers: [
                  {
                    member: {
                      entityIdentifierCode: "QC",
                      entityTypeQualifier: "1",
                      lastName: "DOE",
                    },
                    claims: [{ trace: { traceTypeCode: "2", referenceId: trace } }],
                  },
                ],
              },
            ],
          },
        ],
      },
    ],
  };
}

describe("build271 — TRN echo round-trip property", () => {
  it("emits the caller's trace into TRN-02 verbatim", () => {
    fc.assert(
      fc.property(traceArb, (trace) => {
        const ix = build271(spec271(trace));
        const tx = ix.groups[0]?.transactions[0];
        if (tx === undefined) return false;
        const elig = get271Eligibility(ix.delimiters, tx);
        return elig?.subscribers[0]?.traces[0]?.referenceId === trace;
      }),
    );
  });
});

describe("build277 / build277CA — TRN echo round-trip property", () => {
  it("emits the caller's trace into a 277 claim TRN-02 verbatim", () => {
    fc.assert(
      fc.property(traceArb, (trace) => {
        const ix = build277(spec277(trace));
        const tx = ix.groups[0]?.transactions[0];
        if (tx === undefined) return false;
        const status = get277Status(ix.delimiters, tx);
        return status?.claims[0]?.traces[0]?.referenceId === trace;
      }),
    );
  });

  it("emits the caller's trace into a 277CA claim TRN-02 verbatim", () => {
    fc.assert(
      fc.property(traceArb, (trace) => {
        const ix = build277CA(spec277(trace));
        const tx = ix.groups[0]?.transactions[0];
        if (tx === undefined) return false;
        const ca = get277CADisposition(ix.delimiters, tx);
        return ca?.claims[0]?.traces[0]?.referenceId === trace;
      }),
    );
  });
});
