/**
 * The lazy parse: `parseX12` splits a transaction set's segments into elements the first time
 * `segments` is read, and `{ lazy: false }` splits them all during the parse. Both find every
 * warning during the parse, and both answer the same thing from every read. Every interchange is
 * synthetic, assembled in code.
 */

import { describe, expect, it } from "vitest";

import { parseX12, type X12Interchange, type X12TransactionSet } from "../src/index.js";

import { corpusInputs, record } from "./_helpers/output-corpus.js";
import { buildInterchange } from "./_helpers/envelope.js";

/** A compact 835-shaped interchange whose transaction body is `body`. */
function interchange(body: readonly string[]): string {
  return buildInterchange({
    functionalIdCode: "HP",
    transactionSetId: "835",
    versionRelease: "005010X221A1",
    transactionBody: body,
  });
}

function firstTransaction(ix: X12Interchange): X12TransactionSet {
  const tx = ix.groups[0]?.transactions[0];
  if (tx === undefined) throw new Error("no transaction set");
  return tx;
}

/** Whether `segments` is still the accessor a lazy parse leaves, not yet a plain value. */
function pending(tx: X12TransactionSet): boolean {
  const d = Object.getOwnPropertyDescriptor(tx, "segments");
  return d?.get !== undefined;
}

const PLAIN = interchange(["BPR*I*10*C*ACH", "TRN*1*EFT1*9999999999", "REF*TJ*999000111"]);

describe("parseX12 splits a transaction set's segments on first read", () => {
  it("leaves the segments of a plain transaction set for the first read", () => {
    const tx = firstTransaction(parseX12(PLAIN));
    expect(pending(tx)).toBe(true);
    expect(pending(firstTransaction(parseX12(PLAIN, { lazy: true })))).toBe(true);
  });

  it("splits every segment during the parse with { lazy: false }", () => {
    const tx = firstTransaction(parseX12(PLAIN, { lazy: false }));
    expect(Object.getOwnPropertyDescriptor(tx, "segments")).toMatchObject({
      writable: true,
      enumerable: true,
      configurable: true,
    });
  });

  it("answers on first read what { lazy: false } answers, and becomes a plain property", () => {
    const lazy = firstTransaction(parseX12(PLAIN));
    const eager = firstTransaction(parseX12(PLAIN, { lazy: false }));
    const first = lazy.segments;
    expect(first).toEqual(eager.segments);
    expect(Object.isFrozen(first)).toBe(true);
    expect(first.every((s) => Object.isFrozen(s) && Object.isFrozen(s.elements))).toBe(true);
    expect(first.map((s) => s.id)).toEqual(["ST", "BPR", "TRN", "REF", "SE"]);
    expect(Object.getOwnPropertyDescriptor(lazy, "segments")).toEqual({
      value: first,
      writable: true,
      enumerable: true,
      configurable: true,
    });
    expect(lazy.segments).toBe(first);
  });

  it("keeps keys, spread, JSON and destructuring as they were", () => {
    const lazy = () => firstTransaction(parseX12(PLAIN));
    const eager = firstTransaction(parseX12(PLAIN, { lazy: false }));
    expect(Object.keys(lazy())).toEqual(["st", "se", "segments", "rawSegments", "gs"]);
    expect(Object.keys(lazy())).toEqual(Object.keys(eager));
    expect({ ...lazy() }).toEqual({ ...eager });
    expect(JSON.stringify(lazy())).toBe(JSON.stringify(eager));
    const { segments } = lazy();
    expect(segments).toEqual(eager.segments);
    expect(record(lazy())).toBe(record(eager));
  });

  it("takes a write before the first read as the plain property took it", () => {
    const tx = firstTransaction(parseX12(PLAIN)) as { segments: unknown };
    tx.segments = ["written"];
    expect(Object.getOwnPropertyDescriptor(tx, "segments")).toEqual({
      value: ["written"],
      writable: true,
      enumerable: true,
      configurable: true,
    });
  });

  it("answers the same frozen array on every read of a set frozen before its first read", () => {
    const tx = Object.freeze(firstTransaction(parseX12(PLAIN)));
    const first = tx.segments;
    expect(first).toEqual(firstTransaction(parseX12(PLAIN, { lazy: false })).segments);
    expect(tx.segments).toBe(first);
    expect(() => {
      (tx as { segments: unknown }).segments = [];
    }).toThrow(new TypeError("Cannot assign to read only property 'segments' of object"));
    expect(tx.segments).toBe(first);
  });

  it("keeps a write to a sealed set, before or after its first read, as the plain property did", () => {
    for (const lazy of [true, false]) {
      const tx = Object.seal(firstTransaction(parseX12(PLAIN, { lazy }))) as { segments: unknown };
      const written = ["written"];
      tx.segments = written;
      expect(tx.segments).toBe(written);
      expect(tx.segments).toBe(written);
    }
    const tx = Object.seal(firstTransaction(parseX12(PLAIN)));
    expect(tx.segments.map((s) => s.id)).toEqual(["ST", "BPR", "TRN", "REF", "SE"]);
    const written = ["after a read"];
    (tx as { segments: unknown }).segments = written;
    expect(tx.segments).toBe(written);
    expect(Object.isFrozen(tx)).toBe(false);
  });

  it("splits during the parse every segment a split can warn on", () => {
    // A BIN segment whose length is no number, and an input that ends on a dangling release
    // character inside a transaction set: both warn on their split.
    const whole = interchange(["BIN*X*abc"]);
    const cut = `${interchange(["REF*TJ*A"]).slice(0, interchange(["REF*TJ*A"]).indexOf("REF"))}REF*TJ*A?`;
    for (const raw of [whole, cut]) {
      const ix = parseX12(raw);
      expect(pending(firstTransaction(ix))).toBe(false);
      expect(ix.warnings.length).toBeGreaterThan(0);
      expect(record(ix)).toBe(record(parseX12(raw, { lazy: false })));
    }
    // A segment that opens with `B` and is no binary segment, and a doubled release character at
    // the end of the input: neither warns, and both are split during the parse.
    const doubled = `${cut}?`;
    for (const raw of [interchange(["BPR*I*10*C*ACH"]), doubled]) {
      const ix = parseX12(raw);
      expect(ix.groups[0]?.transactions[0]?.segments.length).toBeGreaterThan(1);
      expect(pending(firstTransaction(parseX12(raw)))).toBe(false);
    }
  });

  it("leaves a trailing release character for the first read where it is the element separator", () => {
    const isa =
      "ISA?00?          ?00?          ?ZZ?SENDER         ?ZZ?RECEIVER       " +
      "?250101?1200?^?00501?000000001?0?P?:~";
    // The framing reads `?~` as a released terminator, so a segment ends in `?` only where the
    // input ends: here, inside the transaction set, with no `SE`.
    const raw = `${isa}GS?HP?S?R?20250101?1200?1?X?005010X221A1~ST?835?0001~REF?TJ?`;
    const ix = parseX12(raw);
    expect(firstTransaction(ix).rawSegments).toEqual(["ST?835?0001", "REF?TJ?"]);
    expect(pending(firstTransaction(ix))).toBe(true);
    expect(record(ix)).toBe(record(parseX12(raw, { lazy: false })));
  });

  it("observes every document of the output corpus the same with { lazy: false }", () => {
    for (const { input } of corpusInputs()) {
      let lazy: string;
      let eager: string;
      try {
        lazy = record(parseX12(input, { profile: null }));
      } catch (error) {
        lazy = `throw:${record(error)}`;
      }
      try {
        eager = record(parseX12(input, { profile: null, lazy: false }));
      } catch (error) {
        eager = `throw:${record(error)}`;
      }
      expect(lazy).toBe(eager);
    }
  }, 120_000);
});
