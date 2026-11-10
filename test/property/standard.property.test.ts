/**
 * The three properties every Cosyte parser proves, run on the generators this package exports at
 * `@cosyte/x12/arbitraries`:
 *
 * 1. **Round trip.** For any generated interchange `ix`, `parseX12(serializeX12(ix))` equals
 *    `ix`, and serializing again writes the same bytes. Equal means `assert.deepStrictEqual` on
 *    the whole model: the delimiters, the ISA and IEA, every TA1, every group's GS and GE, every
 *    transaction set's ST, SE, raw segments and decoded segments, every orphan, and the warnings,
 *    each compared value by value. A spec-clean interchange also serializes to the exact text it
 *    was parsed from, and a built one reads back with every value its spec gave.
 * 2. **Idempotent normalize.** For each normalizer the library has, normalizing twice gives what
 *    normalizing once gave: the interchange normalizer `serializeX12(parseX12(raw))`, the
 *    spec-clean emit that reconciles envelope counts (`specClean` with `recomputeCounts`), and the
 *    release-character codec `escapeRelease(unescapeRelease(x))`.
 * 3. **Never throws in lenient mode.** Any input, random bytes included, comes back as an
 *    interchange whose warnings carry registered codes and positions, or is refused with one of
 *    the four documented fatal errors (`X12_EMPTY_INPUT`, `X12_NO_ISA_HEADER`,
 *    `X12_ISA_TOO_SHORT`, `X12_INVALID_DELIMITERS`), which are what lenient mode may still throw.
 *    Nothing else escapes, and whatever parses serializes.
 *
 * Each runs 100 cases by default; `COSYTE_PROPERTY_RUNS` sets the depth, and a failure prints the
 * seed and path that replay it (see `./_runner.ts`).
 */

import assert from "node:assert/strict";
import type { Buffer } from "node:buffer";

import fc from "fast-check";
import { describe, it } from "vitest";

import {
  FATAL_CODES,
  WARNING_CODES,
  X12ParseError,
  buildInterchange,
  escapeRelease,
  getSegmentValue,
  parseX12,
  serializeX12,
  unescapeRelease,
  type X12Interchange,
  type X12ParseWarning,
} from "../../src/index.js";
import {
  delimiters,
  hostileInput,
  interchange,
  interchangeSpec,
  interchangeText,
} from "../../src/arbitraries/index.js";
import { interchangeParts, writeClean } from "../../src/arbitraries/interchange.js";

import { assertProperty, propertyTimeout } from "./_runner.js";

/** Each test's budget, scaled to the depth `COSYTE_PROPERTY_RUNS` sets. */
const TIMEOUT = propertyTimeout();

const FATAL: ReadonlySet<string> = new Set(Object.values(FATAL_CODES));
const KNOWN: ReadonlySet<string> = new Set(Object.values(WARNING_CODES));

/** Parse leniently: the interchange, or `undefined` when refused with a documented fatal. */
function parseOrFatal(raw: string | Buffer): X12Interchange | undefined {
  try {
    return parseX12(raw);
  } catch (err) {
    assert.ok(err instanceof X12ParseError, `lenient parse threw ${String(err)}`);
    assert.ok(FATAL.has(err.code), `lenient parse threw the non-fatal code ${err.code}`);
    return undefined;
  }
}

/** Every warning carries a registered code and a segment position. */
function assertWarningsRegistered(warnings: readonly X12ParseWarning[]): void {
  for (const w of warnings) {
    assert.ok(KNOWN.has(w.code), `unregistered warning code ${w.code}`);
    assert.ok(Number.isInteger(w.position.segmentIndex), `warning ${w.code} has no position`);
  }
}

/** The element path `getSegmentValue` reads: `"03"`, `"03[1]"` or `"03[1]-2"`. */
function path(element: number, repetition: number, component: number): string {
  return `${String(element).padStart(2, "0")}[${String(repetition)}]-${String(component)}`;
}

describe("property: round trip", () => {
  it(
    "parseX12(serializeX12(ix)) deep-equals ix for any generated interchange, and serializing again writes the same bytes",
    () => {
      assertProperty(
        "round trip",
        fc.property(interchange(), (ix) => {
          const once = serializeX12(ix);
          const back = parseX12(once);
          assert.deepStrictEqual(back, ix);
          assert.equal(serializeX12(back), once);
        }),
      );
    },
    TIMEOUT,
  );

  it(
    "a generated interchange is the exact text it was parsed from, warns about nothing, and reads back every value",
    () => {
      // This holds the generator to account: if the parser repaired or warned about anything,
      // the round trip above could be passing over a repair rather than proving fidelity.
      assertProperty(
        "generator is spec-clean",
        fc.property(interchangeParts(), (parts) => {
          const text = writeClean(parts);
          const ix = parseX12(text);
          assert.equal(serializeX12(ix), text);
          assert.deepStrictEqual(ix.warnings, []);
          const bodies = parts.groups.flatMap((g) => g.transactions.map((t) => t.body));
          const read = ix.groups.flatMap((g) => g.transactions.map((t) => t.segments));
          bodies.forEach((body, t) => {
            body.forEach((seg, s) => {
              // The ST is the first decoded segment, so body segment s is at s + 1.
              const decoded = read[t]?.[s + 1];
              assert.ok(decoded !== undefined, "a generated segment was not read");
              assert.equal(decoded.id, seg.id);
              seg.elements.forEach((shape, e) => {
                shape.forEach((rep, r) => {
                  rep.forEach((v, c) => {
                    assert.equal(getSegmentValue(decoded, path(e + 1, r, c + 1), ix.delimiters), v);
                  });
                });
              });
            });
          });
        }),
      );
    },
    TIMEOUT,
  );

  it(
    "a built interchange warns about nothing, round-trips, and reads back every value its spec gave",
    () => {
      assertProperty(
        "builder round trip",
        fc.property(interchangeSpec(), (spec) => {
          const built = buildInterchange(spec);
          assert.deepStrictEqual(built.warnings, []);
          assert.deepStrictEqual(parseX12(serializeX12(built)), built);
          const specs = spec.groups.flatMap((g) => g.transactions.map((t) => t.segments));
          const read = built.groups.flatMap((g) => g.transactions.map((t) => t.segments));
          specs.forEach((segments, t) => {
            segments.forEach((segment, s) => {
              const decoded = read[t]?.[s + 1];
              assert.ok(decoded !== undefined, "a built segment was not read");
              segment.slice(1).forEach((v, e) => {
                const got = getSegmentValue(
                  decoded,
                  String(e + 1).padStart(2, "0"),
                  built.delimiters,
                );
                assert.equal(got, v);
              });
            });
          });
        }),
      );
    },
    TIMEOUT,
  );
});

describe("property: idempotent normalize", () => {
  const normalize = (raw: string | Buffer): string | undefined => {
    const ix = parseOrFatal(raw);
    return ix === undefined ? undefined : serializeX12(ix);
  };
  const reconcile = (raw: string | Buffer): string | undefined => {
    const ix = parseOrFatal(raw);
    if (ix === undefined) return undefined;
    const warnings: X12ParseWarning[] = [];
    const out = serializeX12(ix, {
      specClean: true,
      recomputeCounts: true,
      onWarning: (w) => warnings.push(w),
    });
    assertWarningsRegistered(warnings);
    return out;
  };

  it(
    "serializeX12(parseX12(raw)) is a fixed point for messy interchange text",
    () => {
      assertProperty(
        "idempotent normalize (interchange text)",
        fc.property(interchangeText(), (raw) => {
          const once = normalize(raw);
          assert.ok(once !== undefined, "messy interchange text was refused");
          assert.equal(normalize(once), once);
        }),
      );
    },
    TIMEOUT,
  );

  it(
    "serializeX12(parseX12(raw)) is a fixed point for any hostile input the parser accepts",
    () => {
      assertProperty(
        "idempotent normalize (hostile input)",
        fc.property(hostileInput(), (raw) => {
          const once = normalize(raw);
          if (once === undefined) return;
          assert.equal(normalize(once), once);
        }),
      );
    },
    TIMEOUT,
  );

  it(
    "the spec-clean emit with recomputed counts is a fixed point for messy text and hostile input",
    () => {
      assertProperty(
        "idempotent normalize (reconciled counts)",
        fc.property(fc.oneof(interchangeText(), hostileInput()), (raw) => {
          const once = reconcile(raw);
          if (once === undefined) return;
          assert.equal(reconcile(once), once);
        }),
      );
    },
    TIMEOUT,
  );

  it(
    "escapeRelease(unescapeRelease(x)) is a fixed point under any delimiters",
    () => {
      const text = fc.string({
        unit: fc.oneof(fc.constantFrom(..."?*^:~|!#&{}<>A1 "), fc.string({ maxLength: 1 })),
        maxLength: 40,
      });
      const codec = (raw: string, d: Parameters<typeof escapeRelease>[1]): string =>
        escapeRelease(
          unescapeRelease(raw, d, () => undefined, { segmentIndex: 0 }),
          d,
        );
      assertProperty(
        "idempotent normalize (release codec)",
        fc.property(text, delimiters(), (raw, d) => {
          const once = codec(raw, d);
          assert.equal(codec(once, d), once);
        }),
      );
    },
    TIMEOUT,
  );
});

describe("property: never throws in lenient mode", () => {
  it(
    "any hostile input, random bytes included, parses with registered warnings or is refused with a documented fatal",
    () => {
      assertProperty(
        "never throws in lenient mode",
        fc.property(hostileInput(), (raw) => {
          const ix = parseOrFatal(raw);
          if (ix === undefined) return;
          assertWarningsRegistered(ix.warnings);
          serializeX12(ix);
        }),
      );
    },
    TIMEOUT,
  );

  it(
    "messy interchange text always parses, with registered warnings for what it departs from",
    () => {
      assertProperty(
        "never throws in lenient mode (interchange text)",
        fc.property(interchangeText(), (raw) => {
          assertWarningsRegistered(parseX12(raw).warnings);
        }),
      );
    },
    TIMEOUT,
  );
});
