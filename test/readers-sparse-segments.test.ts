/**
 * A transaction set a caller builds or edits by hand, rather than one
 * `parseX12` returned, can have a hole in its `segments` list, and can leave
 * `se` unset while its last segment is still the SE. Every typed reader takes
 * an `X12TransactionSet` straight from its caller, so each one is driven here
 * with both: a hole is skipped and the rest of the set reads exactly as the
 * dense set does, and a warning's position still indexes the caller's own
 * `segments`. Every byte here is synthetic.
 */

import { readFileSync } from "node:fs";
import { join } from "node:path";

import { describe, expect, it } from "vitest";

import {
  WARNING_CODES,
  get270Inquiry,
  get271Eligibility,
  get276StatusInquiry,
  get277CADisposition,
  get277Status,
  get278Request,
  get278Response,
  get820Payments,
  get834Enrollments,
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

/** Body positions to open a hole at: right after the ST, the middle, right before the SE. */
function holePositions(tx: X12TransactionSet): readonly number[] {
  return [1, Math.floor(tx.segments.length / 2), tx.segments.length - 1];
}

type Reader = (delimiters: Delimiters, tx: X12TransactionSet) => unknown;

const READERS: readonly (readonly [string, string, Reader])[] = [
  ["get278Request", "auth/278-request.edi", get278Request],
  ["get278Response", "auth/278-response.edi", get278Response],
  ["get837Claims", "claim/837p-canonical.edi", (d, tx) => get837Claims(d, tx)],
  ["get270Inquiry", "eligibility/270-canonical.edi", get270Inquiry],
  ["get271Eligibility", "eligibility/271-canonical.edi", get271Eligibility],
  ["get820Payments", "premium/820-canonical.edi", get820Payments],
  ["get835", "remit/835-medicare-canonical.edi", get835],
  ["get276StatusInquiry", "status/276-canonical.edi", get276StatusInquiry],
  ["get277Status", "status/277-canonical.edi", get277Status],
  ["get277CADisposition", "status/277ca-canonical.edi", get277CADisposition],
];

describe("typed readers: a hole in a caller-built segments list is skipped", () => {
  for (const [name, fixture, read] of READERS) {
    it(`${name} reads the rest of the set exactly as it reads the dense set`, () => {
      const { delimiters, tx } = readFixture(fixture);
      const dense = read(delimiters, tx);
      expect(dense).toBeDefined();
      for (const index of holePositions(tx)) {
        expect(read(delimiters, withHoleAt(tx, index))).toEqual(dense);
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
