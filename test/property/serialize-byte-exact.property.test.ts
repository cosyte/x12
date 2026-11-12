/**
 * Properties of `serializeX12(ix, { byteExact: true })`: an unedited parse returns its input byte
 * for byte, over messy interchange text (line breaks of every kind, doubled terminators, a missing
 * final terminator, bytes after the IEA, a TA1 in a group, segments outside any transaction set)
 * and over any hostile input the parser accepts, as text or as bytes; and an interchange that was
 * edited or copied emits as it does without the option.
 */

import { strict as assert } from "node:assert";
import { Buffer } from "node:buffer";

import fc from "fast-check";
import { describe, it } from "vitest";

import { parseX12, serializeX12, X12ParseError, type X12Interchange } from "../../src/index.js";
import { hostileInput, interchangeText } from "../../src/arbitraries/index.js";

import { assertProperty, propertyTimeout } from "./_runner.js";

/** Each test's budget, scaled to the depth `COSYTE_PROPERTY_RUNS` sets. */
const TIMEOUT = propertyTimeout();

/** The parse of `raw`, or `undefined` where the parser refuses it. */
function parsed(raw: string | Buffer): X12Interchange | undefined {
  try {
    return parseX12(raw);
  } catch (error) {
    if (error instanceof X12ParseError) return undefined;
    throw error;
  }
}

/** The input as the text `parseX12` reads it as, one character per octet for bytes. */
function asRead(raw: string | Buffer): string {
  return typeof raw === "string" ? raw : raw.toString("latin1");
}

describe("serializeX12 byteExact: an unedited parse returns its input", () => {
  it(
    "for messy interchange text",
    () => {
      assertProperty(
        "byte-exact emit (interchange text)",
        fc.property(interchangeText(), (raw) => {
          assert.equal(serializeX12(parseX12(raw), { byteExact: true }), raw);
        }),
      );
    },
    TIMEOUT,
  );

  it(
    "for messy interchange text read as bytes",
    () => {
      assertProperty(
        "byte-exact emit (interchange bytes)",
        fc.property(interchangeText(), (raw) => {
          const bytes = Buffer.from(raw, "utf8");
          const out = serializeX12(parseX12(bytes), { byteExact: true });
          assert.ok(Buffer.from(out, "latin1").equals(bytes));
        }),
      );
    },
    TIMEOUT,
  );

  it(
    "for any hostile input the parser accepts",
    () => {
      assertProperty(
        "byte-exact emit (hostile input)",
        fc.property(hostileInput(), (raw) => {
          const ix = parsed(raw);
          if (ix === undefined) return;
          assert.equal(serializeX12(ix, { byteExact: true }), asRead(raw));
        }),
      );
    },
    TIMEOUT,
  );
});

describe("serializeX12 byteExact: an edited interchange emits from the model", () => {
  it(
    "a copy with every group's GS changed emits as without the option",
    () => {
      assertProperty(
        "byte-exact emit falls back on an edit",
        fc.property(interchangeText(), (raw) => {
          const ix = parseX12(raw);
          const edited: X12Interchange = {
            ...ix,
            groups: ix.groups.map((g) => ({ ...g, gs: { ...g.gs, raw: `${g.gs.raw}*EDITED` } })),
          };
          assert.equal(serializeX12(edited, { byteExact: true }), serializeX12(edited));
        }),
      );
    },
    TIMEOUT,
  );
});
