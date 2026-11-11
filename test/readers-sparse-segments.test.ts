/**
 * A transaction set a caller builds or edits by hand, rather than one
 * `parseX12` returned, can have a hole in its `segments` list, and can leave
 * `se` unset while its last segment is still the SE. Every typed reader takes
 * an `X12TransactionSet` straight from its caller, so each one is driven here
 * with both: a hole is skipped and the rest of the set reads exactly as the
 * dense set does, and a warning's position still indexes the caller's own
 * `segments`. A `null` in the list, the shape a JSON round trip gives a hole,
 * is skipped the same way. Every byte here is synthetic.
 */

import { readFileSync } from "node:fs";
import { join } from "node:path";

import { describe, expect, it } from "vitest";

import {
  WARNING_CODES,
  build275,
  build277RequestForAdditionalInformation,
  get270Inquiry,
  get271Eligibility,
  get276StatusInquiry,
  get275Attachments,
  get277CADisposition,
  get277RequestForAdditionalInformation,
  get277Status,
  get278Request,
  get278Response,
  get820Payments,
  get834Enrollments,
  get834Header,
  get835,
  get837Claims,
  parseX12,
} from "../src/index.js";
import type { Delimiters, X12Enrollment, X12TransactionSet } from "../src/index.js";

function readFixture(path: string): { delimiters: Delimiters; tx: X12TransactionSet } {
  const ix = parseX12(readFileSync(join(__dirname, "fixtures", path), "utf8").trimEnd());
  const tx = ix.groups[0]?.transactions[0];
  if (tx === undefined) throw new Error(`${path} has no transaction set`);
  return { delimiters: ix.delimiters, tx };
}

/** The same set with an empty slot opened at `index` of its `segments`. */
function withHoleAt(tx: X12TransactionSet, index: number): X12TransactionSet {
  const segments = tx.segments.slice(0, index);
  segments.length = index + 1;
  segments.push(...tx.segments.slice(index));
  expect(index in segments).toBe(false);
  return { ...tx, segments };
}

/** The same set with a `null` at `index` of its `segments`, as a JSON round trip leaves a hole. */
function withNullAt(tx: X12TransactionSet, index: number): X12TransactionSet {
  const segments: unknown[] = [...tx.segments.slice(0, index), null, ...tx.segments.slice(index)];
  return { ...tx, segments: segments as X12TransactionSet["segments"] };
}

/**
 * What the dense reading becomes once a slot opens at `index`: every
 * `segmentIndex` at or past it moves one along, because a position indexes
 * the caller's own `segments`. A reading that carries no position is
 * returned as it is.
 */
function shifted(value: unknown, index: number): unknown {
  if (Array.isArray(value)) return value.map((entry: unknown) => shifted(entry, index));
  if (typeof value !== "object" || value === null) return value;
  return Object.fromEntries(
    Object.entries(value).map(([key, entry]) => [
      key,
      key === "segmentIndex" && typeof entry === "number" && entry >= index
        ? entry + 1
        : shifted(entry, index),
    ]),
  );
}

/** A set read off an interchange a builder wrote, for the readers with no fixture file. */
function readBuilt(ix: ReturnType<typeof parseX12>): {
  delimiters: Delimiters;
  tx: X12TransactionSet;
} {
  const tx = ix.groups[0]?.transactions[0];
  if (tx === undefined) throw new Error("the built interchange has no transaction set");
  return { delimiters: ix.delimiters, tx };
}

const ENVELOPE = {
  senderId: "SENDER",
  receiverId: "RECEIVER",
  interchangeDate: "260601",
  interchangeTime: "1200",
  interchangeControlNumber: "000000001",
  groupControlNumber: "1",
  transactionSetControlNumber: "0001",
} as const;

const BUILT_275 = () =>
  readBuilt(
    build275({
      envelope: ENVELOPE,
      beginning: { transactionSetPurposeCode: "02", referenceId: "ATTACH-0001" },
      entities: [
        { entityIdentifierCode: "PR", entityTypeQualifier: "2", lastOrOrganizationName: "P" },
      ],
      lines: [
        {
          trace: { traceTypeCode: "2", referenceId: "TRACE-0001" },
          references: [{ qualifier: "1K", value: "PCN0001" }],
          attachments: [{ filterCode: "B64", data: "U1lOVEhFVElD" }],
        },
      ],
    }),
  );

const BUILT_RFAI = () =>
  readBuilt(
    build277RequestForAdditionalInformation({
      envelope: ENVELOPE,
      header: { hierarchicalStructureCode: "0010", transactionSetPurposeCode: "08" },
      levels: [
        {
          levelCode: "20",
          entities: [{ entityIdentifierCode: "PR", entityTypeQualifier: "2" }],
          children: [
            {
              levelCode: "22",
              requests: [
                {
                  trace: { traceTypeCode: "1", referenceId: "TRACE-0001" },
                  statuses: [{ codes: [{ categoryCode: "R4", statusCode: "18842-5" }] }],
                  references: [{ qualifier: "1K", value: "PCN0001" }],
                },
              ],
            },
          ],
        },
      ],
    }),
  );

/** Body positions to open a hole at: right after the ST, the middle, right before the SE. */
function holePositions(tx: X12TransactionSet): readonly number[] {
  return [1, Math.floor(tx.segments.length / 2), tx.segments.length - 1];
}

type Reader = (delimiters: Delimiters, tx: X12TransactionSet) => unknown;
type Source = () => { delimiters: Delimiters; tx: X12TransactionSet };

const fixture =
  (path: string): Source =>
  () =>
    readFixture(path);

const READERS: readonly (readonly [string, Source, Reader])[] = [
  ["get278Request", fixture("auth/278-request.edi"), get278Request],
  // The response fixture declares 005010X216, the notification guide, which the
  // 278 readers do not implement: re-declared as 005010X217 so there is a
  // reading to compare.
  [
    "get278Response",
    () => {
      const text = readFileSync(join(__dirname, "fixtures", "auth/278-response.edi"), "utf8");
      const ix = parseX12(text.trimEnd().replaceAll("005010X216", "005010X217"));
      const tx = ix.groups[0]?.transactions[0];
      if (tx === undefined) throw new Error("278-response.edi has no transaction set");
      return { delimiters: ix.delimiters, tx };
    },
    get278Response,
  ],
  ["get837Claims", fixture("claim/837p-canonical.edi"), (d, tx) => get837Claims(d, tx)],
  ["get270Inquiry", fixture("eligibility/270-canonical.edi"), get270Inquiry],
  ["get271Eligibility", fixture("eligibility/271-canonical.edi"), get271Eligibility],
  ["get820Payments", fixture("premium/820-canonical.edi"), get820Payments],
  ["get835", fixture("remit/835-medicare-canonical.edi"), get835],
  ["get276StatusInquiry", fixture("status/276-canonical.edi"), get276StatusInquiry],
  ["get277Status", fixture("status/277-canonical.edi"), get277Status],
  ["get277CADisposition", fixture("status/277ca-canonical.edi"), get277CADisposition],
  ["get834Header", fixture("enrollment/834-canonical.edi"), get834Header],
  ["get275Attachments", BUILT_275, get275Attachments],
  ["get277RequestForAdditionalInformation", BUILT_RFAI, get277RequestForAdditionalInformation],
];

describe("typed readers: a hole in a caller-built segments list is skipped", () => {
  for (const [name, source, read] of READERS) {
    it(`${name} reads the rest of the set exactly as it reads the dense set`, () => {
      const { delimiters, tx } = source();
      const dense = read(delimiters, tx);
      expect(dense).toBeDefined();
      for (const index of holePositions(tx)) {
        expect(read(delimiters, withHoleAt(tx, index))).toEqual(shifted(dense, index));
      }
    });

    it(`${name} skips a null in the list the same way`, () => {
      const { delimiters, tx } = source();
      const dense = read(delimiters, tx);
      for (const index of holePositions(tx)) {
        expect(read(delimiters, withNullAt(tx, index))).toEqual(shifted(dense, index));
      }
    });
  }

  it("get834Enrollments yields the same members around a hole", async () => {
    const { delimiters, tx } = readFixture("enrollment/834-canonical.edi");
    const collect = async (set: X12TransactionSet): Promise<X12Enrollment[]> => {
      const members: X12Enrollment[] = [];
      for await (const member of get834Enrollments(delimiters, set)) members.push(member);
      return members;
    };
    const dense = await collect(tx);
    expect(dense.length).toBeGreaterThan(0);
    for (const index of holePositions(tx)) {
      expect(await collect(withHoleAt(tx, index))).toEqual(dense);
      expect(await collect(withNullAt(tx, index))).toEqual(dense);
    }
  });

  it("get835 anchors a balance warning at the CLP in the caller's own segments", () => {
    const { delimiters, tx } = readFixture("remit/835-imbalance.edi");
    const clpAt = tx.segments.findIndex((s) => s.id === "CLP");
    expect(clpAt).toBeGreaterThan(1);
    const holed = withHoleAt(tx, clpAt);
    const remit = get835(delimiters, holed);
    const claimWarning = remit?.warnings.find(
      (w) => w.code === WARNING_CODES.X12_835_REMIT_BALANCE_MISMATCH,
    );
    expect(claimWarning).toBeDefined();
    // The hole moved the CLP one slot along, and the position follows it.
    expect(holed.segments[claimWarning?.position.segmentIndex ?? -1]?.id).toBe("CLP");
    expect(remit?.claims.length).toBe(get835(delimiters, tx)?.claims.length);
  });
});

describe("get837Claims: a caller-built set with `se` unset that still ends in its SE", () => {
  it("reads the SE as the end of the set, not as a segment of the last claim", () => {
    const { delimiters, tx } = readFixture("claim/837p-canonical.edi");
    expect(tx.se).toBeDefined();
    expect(tx.segments.at(-1)?.id).toBe("SE");
    const dense = get837Claims(delimiters, tx);
    const unset = get837Claims(delimiters, { ...tx, se: undefined });
    expect(unset).toEqual(dense);
    expect(unset?.warnings).toEqual([]);
  });
});

describe("get837Claims: a hole or null where the variant comes from the service segments", () => {
  /**
   * A canonical 837 with its ST-03 and GS-08 taken off, so neither declares a
   * guide and the variant falls back to the scan of the service segments.
   */
  function withoutDeclaredGuide(path: string): { delimiters: Delimiters; tx: X12TransactionSet } {
    const text = readFileSync(join(__dirname, "fixtures", path), "utf8")
      .trimEnd()
      .replace(/^(GS(?:\*[^*~]*){7})\*[^*~]*~/m, "$1*~")
      .replace(/^(ST\*837\*[^*~]*)\*[^*~]*~/m, "$1~");
    const ix = parseX12(text);
    const tx = ix.groups[0]?.transactions[0];
    if (tx === undefined) throw new Error(`${path} has no transaction set`);
    expect(tx.st.elements[3]).toBeUndefined();
    return { delimiters: ix.delimiters, tx };
  }

  const SOURCES: readonly (readonly [string, Source, string])[] = [
    // This fixture declares 005010X999A1, a guide the reader does not
    // implement, so it is read with its declaration taken off.
    [
      "837p-unknown-variant.edi with no ST-03",
      () => withoutDeclaredGuide("claim/837p-unknown-variant.edi"),
      "unknown",
    ],
    ["envelope/medicare-canonical.edi", fixture("envelope/medicare-canonical.edi"), "unknown"],
    [
      "837p-canonical.edi with no ST-03",
      () => withoutDeclaredGuide("claim/837p-canonical.edi"),
      "P",
    ],
    [
      "837i-canonical.edi with no ST-03",
      () => withoutDeclaredGuide("claim/837i-canonical.edi"),
      "I",
    ],
    [
      "837d-canonical.edi with no ST-03",
      () => withoutDeclaredGuide("claim/837d-canonical.edi"),
      "D",
    ],
  ];

  for (const [name, source, variant] of SOURCES) {
    it(`${name}: a hole or a null at any index from 1 on is skipped`, () => {
      const { delimiters, tx } = source();
      const dense = get837Claims(delimiters, tx);
      expect(dense?.variant).toBe(variant);
      for (let index = 1; index < tx.segments.length; index += 1) {
        expect(get837Claims(delimiters, withHoleAt(tx, index))).toEqual(shifted(dense, index));
        expect(get837Claims(delimiters, withNullAt(tx, index))).toEqual(shifted(dense, index));
      }
    });
  }
});
