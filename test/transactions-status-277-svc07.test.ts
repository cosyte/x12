/**
 * The 277 Loop 2220 SVC-07 units of service count, pinned against the WIRE
 * rather than against this library's own reader (`X12-277-SVC07-NOT-DECODED`).
 *
 * **What was wrong, and why the pre-existing coverage could not have caught
 * it.** `get277Status` read SVC-01 through SVC-04 and stopped, so SVC-07 was
 * never on the model; `build277` emitted the same four elements, so an X212
 * 277 this library produced with a service line was short a REQUIRED element.
 * Every service-line assertion in the suite was a `build277` -> `get277Status`
 * round trip through that one self-consistent four-element map, so it was
 * green for any subset the two modules agreed on, including a subset missing
 * a required element. A round trip cannot test an element map or an element
 * usage. Every parse assertion below therefore starts from literal EDI bytes,
 * and every emit assertion compares a literal segment string.
 *
 * The usage, from the pyx12 005010 maps (`277.5010.X212.xml` and
 * `277.5010.X214.xml`), which are outside this repository:
 *
 * - **X212** (277 Claim Status Response) - SVC-07, element 380 Quantity,
 *   "Units of Service Count", usage **R**. SVC-05 and SVC-06 are usage **N**.
 * - **X214** (277CA Claim Acknowledgment) - the same SVC-07 element, named
 *   "Original Units of Service Count", usage **S**. SVC-05 and SVC-06 are
 *   usage **N** here too.
 *
 * Corroborated against a second, unrelated publisher (`kputnam/stupidedi`,
 * hand-authored from the TR3s), because several files from one publisher
 * control for picking the wrong map and not for that publisher being wrong.
 *
 * That asymmetry is the whole shape of this slice: `build277` REFUSES a
 * service line with no units, `build277CA` accepts one, and neither of them
 * ever defaults a count. It is also why SVC-05 stays unread here while the
 * 835 reads it as the PAID count: same element number, different TR3, and
 * reading it "for symmetry" would put a quantity on the model that no 277
 * sender ever wrote.
 *
 * Synthetic-only: the committed canonical 277 fixture, fake claim ids, NUBC
 * revenue code `0300` (a published code-list value, not patient data).
 */

import { readFileSync } from "node:fs";
import { join } from "node:path";

import { describe, expect, it } from "vitest";

import {
  ALL_WARNING_MESSAGES,
  build277,
  build277CA,
  CLAIM_STATUS_277_BUILD_ERROR_CODES,
  ClaimStatus277BuildError,
  get277CADisposition,
  get277Status,
  parseX12,
  serializeX12,
  WARNING_CODES,
  X12Decimal,
  type Build277MemberSpec,
  type Build277ServiceLineSpec,
  type Build277Spec,
  type X12ClaimStatusResponse,
  type X12Interchange,
  type X12ServiceLineStatus,
} from "../src/index.js";

const FIXTURE_DIR = join(__dirname, "fixtures", "status");

/** The SVC segment as the committed canonical X212 fixture now carries it. */
const CANONICAL_SVC = "SVC*HC:99213*150*0****1~";

/**
 * The walker's `position.segmentIndex` for the fixture's SVC, derived from
 * the fixture itself so a segment added ahead of it cannot leave a stale
 * literal behind.
 */
const SVC_SEGMENT_INDEX = ((): number => {
  const raw = readFileSync(join(FIXTURE_DIR, "277-canonical.edi"), "utf8").trimEnd();
  const tx = parseX12(raw).groups[0]?.transactions.find((t) => t.st.elements[1] === "277");
  if (tx === undefined) throw new Error("no 277 transaction set");
  const index = tx.segments.findIndex((s) => s.id === "SVC");
  if (index < 0) throw new Error("the canonical 277 fixture has no SVC");
  return index;
})();

function dec(value: string): X12Decimal {
  const d = X12Decimal.fromString(value);
  if (d === undefined) throw new Error(`bad test decimal: ${value}`);
  return d;
}

/**
 * Parse the canonical X212 277 with its SVC segment replaced by the literal
 * bytes under test. Reads committed EDI rather than emitting any, so nothing
 * here can agree with the builder by construction.
 */
function statusFromSvc(svc: string): X12ClaimStatusResponse {
  const raw = readFileSync(join(FIXTURE_DIR, "277-canonical.edi"), "utf8").trimEnd();
  if (!raw.includes(CANONICAL_SVC)) {
    throw new Error("the canonical 277 fixture no longer carries the expected SVC segment");
  }
  const swapped = raw.replace(CANONICAL_SVC, svc);
  const ix = parseX12(swapped);
  const tx = ix.groups[0]?.transactions.find((t) => t.st.elements[1] === "277");
  if (tx === undefined) throw new Error("no 277 transaction set");
  const status = get277Status(ix.delimiters, tx);
  if (status === undefined) throw new Error("get277Status did not admit the fixture");
  return status;
}

function lineFromSvc(svc: string): X12ServiceLineStatus {
  const line = statusFromSvc(svc).claims[0]?.serviceLines[0];
  if (line === undefined) throw new Error("the SVC opened no service line");
  return line;
}

const ENVELOPE = {
  senderId: "MEDPAY",
  receiverId: "ANYTOWNCLINIC",
  interchangeDate: "260601",
  interchangeTime: "1200",
  interchangeControlNumber: "10",
  groupControlNumber: "10",
  transactionSetControlNumber: "0001",
} as const;

/** A qualifiers-only subscriber NM1: nothing in it can reach a message. */
const PLAIN_MEMBER = { entityIdentifierCode: "IL", entityTypeQualifier: "1" } as const;

/**
 * The same NM1 with every free-text and identifier slot filled with a
 * synthetic PHI-shaped marker, so a refusal that interpolated any of them
 * would say so out loud.
 */
const PHI_SHAPED_MEMBER = {
  entityIdentifierCode: "IL",
  entityTypeQualifier: "1",
  lastName: "DOE",
  firstName: "JANE",
  idQualifier: "MI",
  idCode: "MBR0001",
} as const;

/** A minimal one-claim spec whose service lines are supplied by the caller. */
function specWithLines(
  lines: readonly Build277ServiceLineSpec[],
  member: Build277MemberSpec = PLAIN_MEMBER,
): Build277Spec {
  return {
    envelope: ENVELOPE,
    informationSources: [
      {
        entity: { entityIdentifierCode: "PR", entityTypeQualifier: "2", name: "MEDPAY" },
        receivers: [
          {
            entity: { entityIdentifierCode: "41", entityTypeQualifier: "2", name: "CLINIC" },
            providers: [
              {
                entity: { entityIdentifierCode: "1P", entityTypeQualifier: "2", name: "CLINIC" },
                subscribers: [
                  {
                    member,
                    claims: [
                      {
                        trace: { traceTypeCode: "2", referenceId: "CLAIM001" },
                        serviceLines: lines,
                      },
                    ],
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

/** A minimal one-claim spec with exactly one service line. */
function specWithLine(line: Build277ServiceLineSpec): Build277Spec {
  return specWithLines([line]);
}

/** The single SVC segment of a built interchange, as bytes. */
function svcOf(ix: X12Interchange): string {
  const segments = serializeX12(ix).split("~");
  const svc = segments.filter((s) => s.startsWith("SVC"));
  if (svc.length !== 1) throw new Error(`expected exactly one SVC, found ${String(svc.length)}`);
  return `${svc[0] ?? ""}~`;
}

// ---------------------------------------------------------------------------
// 1. The read side, from literal bytes.
// ---------------------------------------------------------------------------

describe("get277Status - SVC-07 is decoded, and only SVC-07", () => {
  it("reads the units of service count from element 7", () => {
    const line = lineFromSvc("SVC*HC:99213*150.00*120.00*0300***3~");
    expect(line.unitsOfService?.toString()).toBe("3");
    // Its neighbours are unmoved: the fix adds a read, it does not shift one.
    expect(line.serviceIdQualifier).toBe("HC");
    expect(line.procedureCode).toBe("99213");
    expect(line.lineChargeAmount?.toString()).toBe("150.00");
    expect(line.linePaymentAmount?.toString()).toBe("120.00");
    expect(line.revenueCode).toBe("0300");
  });

  it("does NOT read SVC-05, which is not used in either 277 TR3", () => {
    // Element 5 carries 99 and element 7 is absent. A reader that had taken
    // the 835's map would answer 99 here.
    const line = lineFromSvc("SVC*HC:99213*150.00*120.00*0300*99~");
    expect(line.unitsOfService).toBeUndefined();
  });

  it("prefers element 7 when both 5 and 7 carry a quantity", () => {
    const line = lineFromSvc("SVC*HC:99213*150.00*120.00*0300*99**3~");
    expect(line.unitsOfService?.toString()).toBe("3");
  });

  it("is BigInt-exact, never parseFloat", () => {
    const line = lineFromSvc("SVC*HC:99213*150.00*120.00****0.30000000000000004~");
    expect(line.unitsOfService?.toString()).toBe("0.30000000000000004");
  });
});

describe("get277Status - absent versus undecodable SVC-07", () => {
  it("an ABSENT SVC-07 reads undefined and the whole warning channel stays empty", () => {
    const status = statusFromSvc("SVC*HC:99213*150.00*120.00~");
    expect(status.claims[0]?.serviceLines[0]?.unitsOfService).toBeUndefined();
    expect(status.warnings).toEqual([]);
  });

  it("a PRESENT but undecodable SVC-07 reads undefined and warns at element 7", () => {
    const status = statusFromSvc("SVC*HC:99213*150.00*120.00****1,5~");
    expect(status.claims[0]?.serviceLines[0]?.unitsOfService).toBeUndefined();
    // The WHOLE channel, projected: pinning a code plus the absence of some
    // other code is the assertion shape that let a previous residual pass.
    expect(status.warnings.map((w) => ({ code: w.code, position: w.position }))).toEqual([
      {
        code: WARNING_CODES.X12_UNPARSEABLE_DECIMAL,
        position: { segmentIndex: SVC_SEGMENT_INDEX, transactionIndex: 0, elementIndex: 7 },
      },
    ]);
    const message = status.warnings[0]?.message ?? "";
    expect(ALL_WARNING_MESSAGES.has(message)).toBe(true);
    expect(message).not.toContain("1,5");
  });

  it("the canonical fixture, unmodified, still emits nothing on the channel", () => {
    const status = statusFromSvc(CANONICAL_SVC);
    expect(status.warnings).toEqual([]);
    expect(status.claims[0]?.serviceLines[0]?.unitsOfService?.toString()).toBe("1");
  });
});

// ---------------------------------------------------------------------------
// 2. The emit side, as literal bytes.
// ---------------------------------------------------------------------------

describe("build277 - SVC-07 on the wire", () => {
  it("places the units at element 7 with 5 and 6 empty", () => {
    const ix = build277(
      specWithLine({
        serviceIdQualifier: "HC",
        procedureCode: "99213",
        lineChargeAmount: dec("150.00"),
        linePaymentAmount: dec("120.00"),
        revenueCode: "0300",
        unitsOfService: dec("3"),
        statuses: [{ statuses: [{ categoryCode: "F2", statusCode: "65" }] }],
      }),
    );
    expect(svcOf(ix)).toBe("SVC*HC:99213*150.00*120.00*0300***3~");
  });

  it("holds the SVC-04 place open when there is no revenue code", () => {
    const ix = build277(
      specWithLine({
        serviceIdQualifier: "HC",
        procedureCode: "99213",
        lineChargeAmount: dec("150.00"),
        unitsOfService: dec("1"),
        statuses: [{ statuses: [{ categoryCode: "F2" }] }],
      }),
    );
    expect(svcOf(ix)).toBe("SVC*HC:99213*150.00*****1~");
  });

  it("round-trips the units back off the emitted bytes", () => {
    const ix = build277(
      specWithLine({
        serviceIdQualifier: "HC",
        procedureCode: "99213",
        lineChargeAmount: dec("150.00"),
        unitsOfService: dec("2.5"),
        statuses: [{ statuses: [{ categoryCode: "F2" }] }],
      }),
    );
    const tx = ix.groups[0]?.transactions[0];
    if (tx === undefined) throw new Error("built interchange has no transaction");
    const status = get277Status(ix.delimiters, tx);
    expect(status?.claims[0]?.serviceLines[0]?.unitsOfService?.toString()).toBe("2.5");
    expect(status?.warnings).toEqual([]);
  });
});

describe("build277 - refuses a service line with no units (X212 usage R)", () => {
  const bare: Build277ServiceLineSpec = {
    serviceIdQualifier: "HC",
    procedureCode: "99213",
    lineChargeAmount: dec("150.00"),
    statuses: [{ statuses: [{ categoryCode: "F2" }] }],
  };

  it("throws X12_277_BUILD_INVALID_SPEC naming SVC-07 and the line locator", () => {
    let thrown: unknown;
    try {
      build277(specWithLine(bare));
    } catch (err) {
      thrown = err;
    }
    expect(thrown).toBeInstanceOf(ClaimStatus277BuildError);
    const err = thrown as ClaimStatus277BuildError;
    expect(err.code).toBe(CLAIM_STATUS_277_BUILD_ERROR_CODES.X12_277_BUILD_INVALID_SPEC);
    // Assert the MESSAGE, not the class: this error class covers six other
    // refusals and a class-only assertion passes on any of them.
    expect(err.message).toContain("SVC-07");
    expect(err.message).toContain("005010X212");
    expect(err.message).toContain("line[0]");
    expect(err.message).toContain("subscriber[0].claim[0]");
  });

  it("refuses before emitting anything, and never invents a count", () => {
    expect(() => build277(specWithLine(bare))).toThrow(/never defaulted/);
  });

  it("refuses a line under a DEPENDENT claim too", () => {
    const spec: Build277Spec = {
      envelope: ENVELOPE,
      informationSources: [
        {
          entity: { entityIdentifierCode: "PR", entityTypeQualifier: "2", name: "MEDPAY" },
          receivers: [
            {
              entity: { entityIdentifierCode: "41", entityTypeQualifier: "2", name: "CLINIC" },
              providers: [
                {
                  entity: { entityIdentifierCode: "1P", entityTypeQualifier: "2", name: "CLINIC" },
                  subscribers: [
                    {
                      member: { entityIdentifierCode: "IL", entityTypeQualifier: "1" },
                      dependents: [
                        {
                          claims: [
                            {
                              trace: { traceTypeCode: "2", referenceId: "CLAIM002" },
                              serviceLines: [bare],
                            },
                          ],
                        },
                      ],
                    },
                  ],
                },
              ],
            },
          ],
        },
      ],
    };
    expect(() => build277(spec)).toThrow(/dependent\[0\]\.claim\[0\]\.line\[0\]/);
  });

  it("names the offending line's own index when an earlier line is complete", () => {
    const twoLines = specWithLines([{ ...bare, unitsOfService: dec("1") }, bare]);
    expect(() => build277(twoLines)).toThrow(/line\[1\]/);
  });

  it("carries no member id, member name, or claim id in the refusal message", () => {
    let message = "";
    try {
      build277(specWithLines([bare], PHI_SHAPED_MEMBER));
    } catch (err) {
      message = (err as ClaimStatus277BuildError).message;
    }
    expect(message).toContain("SVC-07");
    expect(message).not.toContain("DOE");
    expect(message).not.toContain("JANE");
    expect(message).not.toContain("MBR0001");
    expect(message).not.toContain("CLAIM001");
  });
});

// ---------------------------------------------------------------------------
// 3. The X214 half of the asymmetry. build277CA is deliberately unaffected.
// ---------------------------------------------------------------------------

describe("build277CA - SVC-07 is situational, so the same line is accepted", () => {
  const bare: Build277ServiceLineSpec = {
    serviceIdQualifier: "HC",
    procedureCode: "99213",
    lineChargeAmount: dec("150.00"),
    statuses: [{ statuses: [{ categoryCode: "F2" }] }],
  };

  it("emits a 277CA service line with no units and no placeholder elements", () => {
    const ix = build277CA(specWithLine(bare));
    expect(svcOf(ix)).toBe("SVC*HC:99213*150.00~");
  });

  it("emits SVC-07 when the caller does supply a count", () => {
    const ix = build277CA(specWithLine({ ...bare, unitsOfService: dec("4") }));
    expect(svcOf(ix)).toBe("SVC*HC:99213*150.00*****4~");
  });

  it("round-trips the 277CA units through get277CADisposition", () => {
    const ix = build277CA(specWithLine({ ...bare, unitsOfService: dec("4") }));
    const tx = ix.groups[0]?.transactions[0];
    if (tx === undefined) throw new Error("built interchange has no transaction");
    const ca = get277CADisposition(ix.delimiters, tx);
    expect(ca?.transactionType).toBe("claim-acknowledgment");
    expect(ca?.claims[0]?.serviceLines[0]?.unitsOfService?.toString()).toBe("4");
    expect(ca?.warnings).toEqual([]);
  });

  it("the SAME spec is refused by build277 and accepted by build277CA", () => {
    const spec = specWithLine(bare);
    expect(() => build277(spec)).toThrow(ClaimStatus277BuildError);
    expect(() => build277CA(spec)).not.toThrow();
  });
});

// ---------------------------------------------------------------------------
// 4. The committed fixtures are themselves conformant.
// ---------------------------------------------------------------------------

describe("the committed X212 fixtures carry SVC-07", () => {
  it("the canonical 277 fixture's SVC segment has a non-empty element 7", () => {
    const raw = readFileSync(join(FIXTURE_DIR, "277-canonical.edi"), "utf8");
    const svc = raw
      .split("~")
      .map((s) => s.trim())
      .find((s) => s.startsWith("SVC"));
    if (svc === undefined) throw new Error("the canonical 277 fixture has no SVC");
    const elements = svc.split("*");
    expect(elements).toHaveLength(8);
    expect(elements[7]).not.toBe("");
  });

  it("the serializer golden for the 277 reproduces it byte for byte", () => {
    const raw = readFileSync(join(FIXTURE_DIR, "277-canonical.edi"), "utf8");
    const golden = readFileSync(join(__dirname, "fixtures", "golden", "277.edi"), "utf8");
    expect(serializeX12(parseX12(raw))).toBe(golden);
    expect(golden).toContain(CANONICAL_SVC);
  });
});
