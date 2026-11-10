/**
 * An input that ends without its final terminator, on a segment no terminator could end.
 *
 * `serializeX12` supplies a missing final terminator. After a dangling release character
 * (`REF*EA*A?`) that terminator is released, so the segment read back holds a literal `~` and
 * runs on; after a BDS or BIN whose declared octet count runs past its end, the terminator is
 * taken as data. Either way the emit read back was a different segment from the one the parser
 * read, and every further parse and emit added another terminator, so normalizing twice changed
 * the text a first pass had written. The same held for bytes after the IEA. Such a segment is now
 * emitted as it was read, unterminated, and nothing else changes.
 */

import { describe, expect, it } from "vitest";

import { parseX12, serializeX12 } from "../src/index.js";
import { endsAtTerminator } from "../src/parser/envelope.js";

const ISA =
  "ISA*00*          *00*          *ZZ*SENDER         *ZZ*RECEIVER       *260101*1200*^*00501*000000001*0*P*:~";
const GS = "GS*HC*SENDER*RECEIVER*20260101*1200*1*X*005010X222A2~";
const D = { element: "*", repetition: "^", component: ":", segment: "~" } as const;

/** Parse and serialize once. */
const normalize = (raw: string, specClean = false): string =>
  serializeX12(parseX12(raw), specClean ? { specClean: true, recomputeCounts: true } : {});

/** The emit is a fixed point, and reading it back gives the model the input gave. */
function expectStable(raw: string, specClean = false): string {
  const once = normalize(raw, specClean);
  expect(normalize(once, specClean)).toBe(once);
  if (!specClean) expect(parseX12(once)).toEqual(parseX12(raw));
  return once;
}

describe("a last segment no terminator can end", () => {
  it("is emitted unterminated after a dangling release character", () => {
    const raw = `${ISA}${GS}ST*837*0001~REF*EA*A?`;
    expect(expectStable(raw)).toBe(raw);
    const segment = parseX12(raw).groups[0]?.transactions[0]?.rawSegments.at(-1);
    expect(segment).toBe("REF*EA*A?");
  });

  it("is emitted unterminated after a binary segment whose count runs past its end", () => {
    const raw = `${ISA}${GS}ST*837*0001~BIN*20*AB`;
    expect(expectStable(raw)).toBe(raw);
  });

  it("is emitted unterminated when it is an orphan after the last group", () => {
    const raw = `${ISA}${GS}GE*0*1~NTE*X?`;
    expect(expectStable(raw)).toBe(raw);
  });

  it("is emitted unterminated when the spec-clean emit rewrites it", () => {
    const raw = `${ISA}${GS}ST*837*0001~SE*9*0001?`;
    const once = expectStable(raw, true);
    expect(once.endsWith("~SE*2*0001?")).toBe(true);
  });

  it("leaves bytes after the IEA unterminated when they end on a dangling release", () => {
    const raw = `${ISA}IEA*0*000000001~NTE*X?`;
    expect(parseX12(raw).trailingBytes).toBe("NTE*X?");
    expect(expectStable(raw)).toBe(raw);
  });

  it("still supplies a final terminator a segment can take, after the IEA or before it", () => {
    expect(expectStable(`${ISA}${GS}ST*837*0001~REF*EA*A??`)).toBe(
      `${ISA}${GS}ST*837*0001~REF*EA*A??~`,
    );
    expect(expectStable(`${ISA}${GS}ST*837*0001~REF*EA*A`)).toBe(
      `${ISA}${GS}ST*837*0001~REF*EA*A~`,
    );
    expect(parseX12(`${ISA}IEA*0*000000001~NTE*X`).trailingBytes).toBe("NTE*X~");
    expect(expectStable(`${ISA}IEA*0*000000001~NTE*X`)).toBe(`${ISA}IEA*0*000000001~NTE*X~`);
  });
});

describe("endsAtTerminator", () => {
  it("answers with the reader's own framing", () => {
    expect(endsAtTerminator("", D)).toBe(true);
    expect(endsAtTerminator("REF*EA*A", D)).toBe(true);
    expect(endsAtTerminator("REF*EA*A?~B", D)).toBe(true);
    expect(endsAtTerminator("REF*EA*A??", D)).toBe(true);
    expect(endsAtTerminator("REF*EA*A?", D)).toBe(false);
    expect(endsAtTerminator("REF*EA*A???", D)).toBe(false);
    expect(endsAtTerminator("BIN*2*AB", D)).toBe(true);
    expect(endsAtTerminator("BIN*3*AB", D)).toBe(false);
    expect(endsAtTerminator("BIN*3*A~B", D)).toBe(true);
  });

  it("reads a release character that is itself the terminator as the terminator", () => {
    expect(endsAtTerminator("REF*EA*A", { ...D, segment: "?" })).toBe(true);
  });
});
