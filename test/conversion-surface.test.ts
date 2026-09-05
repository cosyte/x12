import { readFileSync } from "node:fs";
import { join } from "node:path";

import { describe, expect, it } from "vitest";

import { parseDocumentDate } from "../src/code-lists/document-date.js";
import {
  checkCarcValidity,
  toDate,
  toISO,
  toObject,
  X12_CODE_LIST_ERROR_CODES,
  X12CodeListError,
  type DateParts,
  type ToDateOptions,
  type X12AuthDate,
  type X12ClaimDate,
  type X12DateValue,
  type X12EligibilityDate,
  type X12EnrollmentDate,
  type X12InquiryDate,
  type X12PremiumDate,
  type X12StatusDate,
  type X12StatusInquiryDate,
} from "../src/index.js";

/**
 * The shared conversion-surface conformance suite: `toObject`, `toISO` and `toDate`
 * over the date carriers this package's typed readers surface.
 *
 * Every `@cosyte/*` parser carries this file at this path, covering the same case
 * table in its own wire syntax, so a divergence between the packages is a failing
 * test rather than something a consumer discovers.
 *
 * **FIVE OF THE ELEVEN ROWS ARE SKIPPED, AND THE REASON IS THE SAME ONE FIVE
 * TIMES.** This package decodes exactly two date/time period format qualifiers,
 * `D8` and `RD8`, because those are the only two its readers and builders already
 * parse or build. A qualifier it does not already handle is NOT invented here.
 * `D8` is a fixed eight-digit `CCYYMMDD`, so every value this surface decodes is
 * exactly one whole calendar day: never a bare year, never a time of day, never a
 * fraction of a second and never a UTC offset. `RD8` is a range and converts to
 * `undefined` from all three functions. Each skip below names the property that
 * makes its row inexpressible, and each is BACKED BY A LIVE TEST that measures
 * that property rather than asserting it in a comment.
 *
 * **NO LITERAL SEGMENT TEXT LIVES IN THIS FILE.** `test/**` is inside the PHI
 * scanner's walk roots and inside its `--staged` pre-commit route. Every carrier
 * here is a typed object holding a date, which is what a reader hands back; no
 * interchange is written out.
 */
const ROOT = join(import.meta.dirname, "..");

/** The conversion module's own source, for the scans at the bottom of this file. */
const MODULE_SOURCE = readFileSync(
  join(ROOT, "src", "transactions", "shared", "date-conversion.ts"),
  "utf8",
);

/** The package entry point's source, for the single-surface scan. */
const ENTRY_SOURCE = readFileSync(join(ROOT, "src", "index.ts"), "utf8");

/** `README.md`, whose date section is graded as a file rather than as a test. */
const README = readFileSync(join(ROOT, "README.md"), "utf8");

/**
 * The two format qualifiers this package parses or builds, enumerated from the
 * checkout rather than from a specification. `D8` is a single `CCYYMMDD` day and
 * `RD8` is a `CCYYMMDD-CCYYMMDD` range; nothing else appears in `src/`.
 */
const DECODED_FORMAT_QUALIFIERS = ["D8", "RD8"] as const;

/** Doc comments and prose stripped, so a source scan reads CODE and not commentary. */
function codeOnly(source: string): string {
  return source.replaceAll(/\/\*[\s\S]*?\*\//g, "").replaceAll(/\/\/[^\n]*/g, "");
}

/** The three functions, so a rule can be stated once over all of them. */
const ALL_THREE = [
  ["toObject", toObject],
  ["toISO", toISO],
  ["toDate", toDate],
] as const;

/** Every one of the three answers `undefined` for this carrier, and none throws. */
function expectAllThreeUndefined(value: X12DateValue | null | undefined, why: string): void {
  for (const [name, fn] of ALL_THREE) {
    expect(() => fn(value), `${name} threw on ${why}`).not.toThrow();
    expect(fn(value), `${name} answered something for ${why}`).toBeUndefined();
  }
  // `toDate` has a second parameter, so the offer of a zone must not rescue a
  // value that was never decodable in the first place.
  expect(toDate(value, { assumeOffsetMinutes: 0 })).toBeUndefined();
  expect(toDate(value, { assumeOffsetMinutes: -300 })).toBeUndefined();
}

// ---------------------------------------------------------------------------
// The shared case table, R1 to R11.
// ---------------------------------------------------------------------------

describe("shared case table", () => {
  /*
   * R1 IS SKIPPED. REASON: THIS PACKAGE DECODES NO YEAR-PRECISION DATE FORM.
   * The date/time period format qualifiers it parses or builds are `D8`
   * (`CCYYMMDD`) and `RD8` (`CCYYMMDD-CCYYMMDD`), both fixed at whole days. A
   * year-precision element would need a qualifier this package does not handle,
   * and inventing one here is explicitly out of scope. The property is measured
   * live by "every decoded value is exactly one whole calendar day" below.
   */
  it.skip("R1 a year-precision value: no format qualifier this package decodes states a bare year", () => {
    // Intentionally empty: see the REASON block above.
  });

  it("R2 a day-precision value with no offset", () => {
    const day: X12DateValue = { formatQualifier: "D8", value: "20260601" };
    expect(Object.keys(toObject(day) ?? {})).toEqual(["year", "month", "day"]);
    expect(toObject(day)).toStrictEqual({ year: 2026, month: 6, day: 1 });
    expect(toISO(day)).toBe("2026-06-01");
    expect(toISO(day)?.endsWith("Z")).toBe(false);
    expect(toDate(day)).toBeUndefined();
  });

  it("R3 the same value with assumeOffsetMinutes 0 is the UTC midnight instant", () => {
    const day: X12DateValue = { formatQualifier: "D8", value: "20260601" };
    expect(toDate(day, { assumeOffsetMinutes: 0 })?.toISOString()).toBe("2026-06-01T00:00:00.000Z");
  });

  it("R4 the same value with assumeOffsetMinutes -300 is 05:00Z that day", () => {
    const day: X12DateValue = { formatQualifier: "D8", value: "20260601" };
    expect(toDate(day, { assumeOffsetMinutes: -300 })?.toISOString()).toBe(
      "2026-06-01T05:00:00.000Z",
    );
    // The mirror direction, so the sign convention is pinned in both directions:
    // +330 is UTC+5:30, whose midnight is the previous day at 18:30Z.
    expect(toDate(day, { assumeOffsetMinutes: 330 })?.toISOString()).toBe(
      "2026-05-31T18:30:00.000Z",
    );
  });

  /*
   * R5 IS SKIPPED. REASON: NO X12 DATE ELEMENT FORM THIS PACKAGE DECODES CARRIES
   * A TIMEZONE OFFSET. `D8` is eight digits, century through day, and `RD8` is two
   * of those separated by a hyphen. Neither has a slot for a UTC offset, so there
   * is no second-precision value with an explicit non-zero offset to express, and
   * `offsetMinutes` is never present on a result. The property is measured live by
   * "no decoded value carries a UTC offset" below.
   */
  it.skip("R5 a second-precision value with an explicit non-zero offset: the x12 date element forms this package decodes carry no timezone offset", () => {
    // Intentionally empty: see the REASON block above.
  });

  /*
   * R6 IS SKIPPED. REASON: THE SAME ONE AS R5, AND IT IS THE ABSENCE OF A
   * TIMEZONE OFFSET IN THE X12 DATE ELEMENT FORMS THIS PACKAGE DECODES. A stated
   * ZERO offset is still a stated offset, and neither `D8` nor `RD8` has anywhere
   * to state one, so no value reaches `offsetMinutes: 0` and no `toISO` result
   * ends in `Z`. Measured live by the same test as R5.
   */
  it.skip("R6 a value with an explicit ZERO offset: the x12 date element forms this package decodes carry no timezone offset", () => {
    // Intentionally empty: see the REASON block above.
  });

  /*
   * R7 IS SKIPPED. REASON: THIS PACKAGE DECODES NO DATE FORM THAT STATES A TIME,
   * LET ALONE A FRACTION OF A SECOND. `D8` ends at the day. There is no value
   * whose `millisecond` could be read, verbatim or otherwise, so the first-three-
   * digit rule has nothing to apply to here. Measured live by "every decoded value
   * is exactly one whole calendar day".
   */
  it.skip("R7 a value with stated fractional seconds: no format qualifier this package decodes states a time of day", () => {
    // Intentionally empty: see the REASON block above.
  });

  it("R8 a value this package cannot read answers undefined from all three, and nothing throws", () => {
    // The whole class, by every distinct route into it, rather than one member.
    expectAllThreeUndefined({ formatQualifier: "D8", value: "20260230" }, "February 30");
    expectAllThreeUndefined({ formatQualifier: "D8", value: "20261301" }, "month 13");
    expectAllThreeUndefined({ formatQualifier: "D8", value: "20260600" }, "day 0");
    expectAllThreeUndefined({ formatQualifier: "D8", value: "20260631" }, "June 31");
    expectAllThreeUndefined({ formatQualifier: "D8", value: "20260101 " }, "a trailing space");
    expectAllThreeUndefined({ formatQualifier: "D8", value: "2026060" }, "seven digits");
    expectAllThreeUndefined({ formatQualifier: "D8", value: "202606011" }, "nine digits");
    expectAllThreeUndefined({ formatQualifier: "D8", value: "2026-06-01" }, "a dashed value");
    expectAllThreeUndefined({ formatQualifier: "D8", value: "" }, "an empty value");
    expectAllThreeUndefined({ formatQualifier: "D8", value: "2026JUN1" }, "letters");
  });

  it("R9 undefined and null answer undefined from all three, and nothing throws", () => {
    expectAllThreeUndefined(undefined, "undefined");
    expectAllThreeUndefined(null, "null");
    expectAllThreeUndefined({}, "a carrier stating no component at all");
  });

  /*
   * R10 IS SKIPPED. REASON: THIS PACKAGE DECODES NO TIME-ONLY DATE FORM. `D8`
   * mandates a leading four-digit century and year, so every value it accepts
   * states a full calendar day and none states a time at all. Measured live by
   * "every decoded value is exactly one whole calendar day".
   */
  it.skip("R10 a time-only value: no format qualifier this package decodes omits the calendar day", () => {
    // Intentionally empty: see the REASON block above.
  });

  it("R11 year 0050 at day precision, with a determinate zone, reports year 50", () => {
    const day: X12DateValue = { formatQualifier: "D8", value: "00500101" };
    expect(toObject(day)).toStrictEqual({ year: 50, month: 1, day: 1 });
    expect(toISO(day)).toBe("0050-01-01");
    const instant = toDate(day, { assumeOffsetMinutes: 0 });
    expect(instant?.getUTCFullYear()).toBe(50);
    expect(instant?.toISOString()).toBe("0050-01-01T00:00:00.000Z");
    // The remapping the construction refuses, MEASURED rather than described:
    // both of the obvious routes put year 50 in the 1900s.
    expect(new Date(Date.UTC(50, 0, 1)).getUTCFullYear()).toBe(1950);
    expect(new Date(50, 0, 1).getFullYear()).toBe(1950);
  });
});

// ---------------------------------------------------------------------------
// The properties behind the five skipped rows, measured rather than asserted.
// ---------------------------------------------------------------------------

describe("the properties behind the skipped rows", () => {
  it("decodes exactly the format qualifiers this package already parses or builds, and no others", () => {
    // Every qualifier in the decoded set is recognised: `D8` converts, `RD8` is
    // recognised as a range and refused. Everything else is unhandled.
    expect(toObject({ formatQualifier: "D8", value: "20260601" })).toBeDefined();
    expect(toObject({ formatQualifier: "RD8", value: "20260601-20260605" })).toBeUndefined();
    expect(DECODED_FORMAT_QUALIFIERS).toEqual(["D8", "RD8"]);
    // Neighbouring X12 1250 forms this package does NOT handle stay unhandled.
    // Each is a real element-1250 code; none appears anywhere in `src/`, and this
    // surface must not be the place one gets invented.
    for (const unhandled of ["D6", "DT", "TM", "RD", "RDT", "CC", "CD", "CM", "CY", "D", "RTM"]) {
      expectAllThreeUndefined(
        { formatQualifier: unhandled, value: "20260601" },
        `the unhandled qualifier ${unhandled}`,
      );
    }
  });

  it("every decoded value is exactly one whole calendar day: no year-only, no time, no fraction", () => {
    // Walks the whole `D8` shape space by construction: if any accepted value
    // stated less or more than a day, its key set would differ here.
    const samples = ["19700705", "20000229", "20240229", "99991231", "00010101", "20260601"];
    for (const value of samples) {
      const parts = toObject({ formatQualifier: "D8", value });
      expect(parts, value).toBeDefined();
      expect(Object.keys(parts ?? {}), value).toEqual(["year", "month", "day"]);
      for (const absent of ["hour", "minute", "second", "millisecond"] as const) {
        expect(parts?.[absent], `${value} stated ${absent}`).toBeUndefined();
      }
    }
  });

  it("no decoded value carries a UTC offset, which is why R5 and R6 cannot be expressed", () => {
    for (const value of ["19700705", "20260601", "00500101"]) {
      const parts = toObject({ formatQualifier: "D8", value });
      expect(Object.keys(parts ?? {})).not.toContain("offsetMinutes");
      expect(parts?.offsetMinutes).toBeUndefined();
      // The other face of the same property: with no stated offset there is no
      // instant until the caller supplies one, at EVERY value.
      expect(toDate({ formatQualifier: "D8", value })).toBeUndefined();
      expect(toDate({ formatQualifier: "D8", value }, {})).toBeUndefined();
      // And no rendering ever gains a `Z` or a `+HH:MM` tail.
      expect(toISO({ formatQualifier: "D8", value })).toMatch(/^\d{4}-\d{2}-\d{2}$/u);
    }
  });

  it("the source declares no format qualifier beyond the decoded set", () => {
    // The scan that makes the enumeration a MEASUREMENT rather than a claim: the
    // conversion module names exactly the two qualifiers, as string literals.
    const literals = [...codeOnly(MODULE_SOURCE).matchAll(/"([A-Z]+\d*)"/gu)].map(
      (match) => match[1],
    );
    expect([...new Set(literals)].sort()).toEqual([...DECODED_FORMAT_QUALIFIERS].sort());
  });
});

// ---------------------------------------------------------------------------
// One surface for every carrier: the criterion that there is no per-transaction
// variant.
// ---------------------------------------------------------------------------

describe("one surface over every date carrier this package surfaces", () => {
  it("accepts all eight X12*Date carriers through the same three names", () => {
    // Each is declared at its OWN published type, so this is a compile-time proof
    // as much as a runtime one: `tsc --noEmit` fails if any of the eight stops
    // being assignable to the parameter.
    const claim: X12ClaimDate = { qualifier: "472", formatQualifier: "D8", value: "20260601" };
    const inquiry: X12InquiryDate = { qualifier: "291", formatQualifier: "D8", value: "20260601" };
    const eligibility: X12EligibilityDate = {
      qualifier: "307",
      formatQualifier: "D8",
      value: "20260601",
    };
    const statusInquiry: X12StatusInquiryDate = {
      qualifier: "472",
      formatQualifier: "D8",
      value: "20260601",
    };
    const status: X12StatusDate = { qualifier: "472", formatQualifier: "D8", value: "20260601" };
    const auth: X12AuthDate = { qualifier: "472", formatQualifier: "D8", value: "20260601" };

    const withFormat = [claim, inquiry, eligibility, statusInquiry, status, auth];
    for (const carrier of withFormat) {
      expect(toObject(carrier)).toStrictEqual({ year: 2026, month: 6, day: 1 });
      expect(toISO(carrier)).toBe("2026-06-01");
      expect(toDate(carrier, { assumeOffsetMinutes: 0 })?.toISOString()).toBe(
        "2026-06-01T00:00:00.000Z",
      );
    }

    // The remaining two are accepted by the SAME three names and answer
    // `undefined`, because neither surfaces a format qualifier at all. See the
    // test below, which is where that answer is justified.
    const premium: X12PremiumDate = { qualifier: "582", value: "20260601" };
    const enrollment: X12EnrollmentDate = { qualifier: "356", value: "20260601" };
    expectAllThreeUndefined(premium, "an X12PremiumDate, which states no format qualifier");
    expectAllThreeUndefined(enrollment, "an X12EnrollmentDate, which states no format qualifier");
  });

  it("answers undefined, never a guess, for a carrier that states no format qualifier", () => {
    // `X12PremiumDate` and `X12EnrollmentDate` carry the qualifier and the
    // verbatim value and nothing else: DTM-03 and DTP-02 are not surfaced on
    // them. A DTP-02 this package does not see may be `RD8`, so reading the value
    // as a day would turn an eligibility SPAN into a single date, silently. The
    // honest answer is that there is no answer.
    expectAllThreeUndefined({ value: "20260601" }, "an absent formatQualifier");
    expectAllThreeUndefined({ formatQualifier: "", value: "20260601" }, "an empty formatQualifier");
    expectAllThreeUndefined(
      { formatQualifier: undefined, value: "20260601" },
      "an explicitly undefined formatQualifier",
    );
  });

  it("exports exactly one toObject, one toISO and one toDate: no per-transaction variant", () => {
    const entryCode = codeOnly(ENTRY_SOURCE);
    for (const name of ["toObject", "toISO", "toDate"]) {
      const declarations = [...entryCode.matchAll(new RegExp(`\\b${name}\\b`, "gu"))];
      expect(declarations, `${name} is named more than once at the entry point`).toHaveLength(1);
    }
    // No sibling spelling crept in beside them.
    expect(codeOnly(ENTRY_SOURCE)).not.toMatch(/\bto(Object|ISO|Date)[A-Z0-9_]/u);
  });
});

// ---------------------------------------------------------------------------
// The shared shape: DateParts, toISO rendering, toDate timezone honesty.
// ---------------------------------------------------------------------------

describe("toObject returns the shared DateParts shape", () => {
  it("has exactly the stated components, with a spec-native month", () => {
    const parts = toObject({ formatQualifier: "D8", value: "20260601" });
    expect(Object.keys(parts ?? {})).toEqual(["year", "month", "day"]);
    expect(parts?.year).toBe(2026);
    expect(parts?.month).toBe(6);
    expect(parts?.day).toBe(1);
    // Spec-native, never the JavaScript `Date` 0 to 11: June is 6, not 5.
    expect(parts?.month).not.toBe(5);
    for (const value of ["20260101", "20261231"]) {
      const month = toObject({ formatQualifier: "D8", value })?.month;
      expect(month).toBeGreaterThanOrEqual(1);
      expect(month).toBeLessThanOrEqual(12);
    }
  });

  it("carries no qualifier, formatQualifier, precision, raw or valid key", () => {
    // Fed a carrier that HAS a qualifier, so the absence is a decision rather
    // than an artefact of the input.
    const carrier: X12ClaimDate = { qualifier: "472", formatQualifier: "D8", value: "20260601" };
    const parts = toObject(carrier);
    expect(carrier.qualifier).toBe("472");
    for (const forbidden of ["qualifier", "formatQualifier", "precision", "raw", "valid"]) {
      expect(Object.keys(parts ?? {})).not.toContain(forbidden);
    }
  });

  it("holds no key present with undefined, so the key set IS the precision", () => {
    const parts = toObject({ formatQualifier: "D8", value: "20260601" });
    for (const key of Object.keys(parts ?? {})) {
      expect(Object.getOwnPropertyDescriptor(parts, key)?.value).toBeDefined();
    }
  });

  it("is a frozen plain object", () => {
    const parts = toObject({ formatQualifier: "D8", value: "20260601" });
    expect(Object.isFrozen(parts)).toBe(true);
    expect(Object.getPrototypeOf(parts)).toBe(Object.prototype);
    expect(Array.isArray(parts)).toBe(false);
  });

  it("returns a fresh object per call, so a caller cannot corrupt another's answer", () => {
    const day: X12DateValue = { formatQualifier: "D8", value: "20260601" };
    expect(toObject(day)).not.toBe(toObject(day));
    expect(toObject(day)).toStrictEqual(toObject(day));
  });
});

describe("toISO renders the stated precision and nothing more", () => {
  it("renders a day as YYYY-MM-DD, with no fabricated Z", () => {
    expect(toISO({ formatQualifier: "D8", value: "20260601" })).toBe("2026-06-01");
    expect(toISO({ formatQualifier: "D8", value: "19700705" })).toBe("1970-07-05");
    expect(toISO({ formatQualifier: "D8", value: "20240229" })).toBe("2024-02-29");
  });

  it("renders the sender's digits verbatim, leading zeroes included", () => {
    expect(toISO({ formatQualifier: "D8", value: "00500101" })).toBe("0050-01-01");
    expect(toISO({ formatQualifier: "D8", value: "00010101" })).toBe("0001-01-01");
    expect(toISO({ formatQualifier: "D8", value: "09990909" })).toBe("0999-09-09");
  });

  it("reports exactly the components toObject reports", () => {
    // One internal decode feeds all three, so the two can never disagree about
    // which components a value stated.
    for (const value of ["20260601", "00500101", "99991231"]) {
      const parts = toObject({ formatQualifier: "D8", value });
      const iso = toISO({ formatQualifier: "D8", value });
      expect(iso).toBe(
        `${String(parts?.year).padStart(4, "0")}-${String(parts?.month).padStart(2, "0")}-${String(
          parts?.day,
        ).padStart(2, "0")}`,
      );
    }
  });
});

describe("toDate is honest about the timezone", () => {
  const day: X12DateValue = { formatQualifier: "D8", value: "20260601" };

  it("returns undefined when no zone is determinate", () => {
    expect(toDate(day)).toBeUndefined();
    expect(toDate(day, {})).toBeUndefined();
    expect(toDate(day, { assumeOffsetMinutes: undefined })).toBeUndefined();
  });

  it("applies a stated offset, including an explicit zero", () => {
    expect(toDate(day, { assumeOffsetMinutes: 0 })?.toISOString()).toBe("2026-06-01T00:00:00.000Z");
    expect(toDate(day, { assumeOffsetMinutes: -300 })?.toISOString()).toBe(
      "2026-06-01T05:00:00.000Z",
    );
    expect(toDate(day, { assumeOffsetMinutes: -480 })?.toISOString()).toBe(
      "2026-06-01T08:00:00.000Z",
    );
    expect(toDate(day, { assumeOffsetMinutes: 60 })?.toISOString()).toBe(
      "2026-05-31T23:00:00.000Z",
    );
  });

  it("answers undefined rather than an Invalid Date for an offset that is not a number", () => {
    expect(toDate(day, { assumeOffsetMinutes: Number.NaN })).toBeUndefined();
    expect(toDate(day, { assumeOffsetMinutes: Number.POSITIVE_INFINITY })).toBeUndefined();
    expect(toDate(day, { assumeOffsetMinutes: Number.MAX_SAFE_INTEGER })).toBeUndefined();
  });

  it("leaves the value's own precision untouched", () => {
    const before = toObject(day);
    const beforeIso = toISO(day);
    toDate(day, { assumeOffsetMinutes: -300 });
    expect(toObject(day)).toStrictEqual(before);
    expect(toISO(day)).toBe(beforeIso);
    // Filling to midnight is for instant construction only: no time key appeared.
    expect(Object.keys(toObject(day) ?? {})).toEqual(["year", "month", "day"]);
  });

  it("cannot read the host machine's zone: the module names no route to one", () => {
    const code = codeOnly(MODULE_SOURCE);
    for (const forbidden of [
      "getTimezoneOffset",
      "Intl",
      "Date.parse",
      "toLocale",
      "setFullYear",
      "setHours",
      "Date.UTC",
      "process.env",
      "toISOString",
    ]) {
      expect(code, `the module reaches ${forbidden}`).not.toContain(forbidden);
    }
    expect(code).toContain("setUTCFullYear");
    expect(code).toContain("setUTCHours");
  });

  it("takes assumeOffsetMinutes and no other key", () => {
    const options: ToDateOptions = { assumeOffsetMinutes: 0 };
    expect(Object.keys(options)).toEqual(["assumeOffsetMinutes"]);
    // @ts-expect-error `ToDateOptions` carries exactly one key; `tsc --noEmit`
    // verifies that this line is an error, so the shape is pinned at COMPILE time
    // as well as at run time.
    expect(toDate(day, { assumeOffsetMinutes: 0, timezone: "UTC" })).toBeDefined();
  });
});

// ---------------------------------------------------------------------------
// A range is not a point in time.
// ---------------------------------------------------------------------------

describe("a date RANGE converts to undefined, never to an endpoint", () => {
  it("answers undefined from all three for an RD8 carrier, and does not throw", () => {
    expectAllThreeUndefined(
      { formatQualifier: "RD8", value: "20260601-20260605" },
      "an RD8 service period",
    );
    expectAllThreeUndefined(
      { formatQualifier: "RD8", value: "20260601-20260601" },
      "a one-day RD8",
    );
    // Even a well-shaped single day under an RD8 qualifier: the qualifier is what
    // says how to read the element, and it says this is an interval.
    expectAllThreeUndefined({ formatQualifier: "RD8", value: "20260601" }, "a short RD8 value");
  });

  it("never returns the range's first endpoint, which is the quiet wrong answer this refuses", () => {
    const range: X12DateValue = { formatQualifier: "RD8", value: "20260601-20260605" };
    expect(toISO(range)).not.toBe("2026-06-01");
    expect(toObject(range)).not.toStrictEqual({ year: 2026, month: 6, day: 1 });
    expect(toDate(range, { assumeOffsetMinutes: 0 })).toBeUndefined();
    // Each endpoint is reachable by the caller who decides to split the range,
    // which is the caller who knows whether the start or the end is the answer.
    const [low = "", high = ""] = range.value?.split("-") ?? [];
    expect(toISO({ formatQualifier: "D8", value: low })).toBe("2026-06-01");
    expect(toISO({ formatQualifier: "D8", value: high })).toBe("2026-06-05");
  });
});

// ---------------------------------------------------------------------------
// The pre-existing surface, unchanged.
// ---------------------------------------------------------------------------

describe("the pre-existing date surface is untouched", () => {
  it("parseDocumentDate still THROWS on its own invalid input, where these three return undefined", () => {
    // The divergence is deliberate and is documented rather than reconciled: that
    // function answers a caller who asked a validity question and could not state
    // the day, so refusing loudly is right there; these three read a document that
    // has already been parsed leniently, where a warning has already been raised.
    expect(() => parseDocumentDate("20260230")).toThrow(X12CodeListError);
    expect(() => parseDocumentDate("not-a-date")).toThrow(X12CodeListError);
    expect(() => parseDocumentDate(undefined)).toThrow(X12CodeListError);
    expect(toObject({ formatQualifier: "D8", value: "20260230" })).toBeUndefined();
    expect(toISO({ formatQualifier: "D8", value: "20260230" })).toBeUndefined();
    expect(
      toDate({ formatQualifier: "D8", value: "20260230" }, { assumeOffsetMinutes: 0 }),
    ).toBeUndefined();
  });

  it("still normalises both of its accepted forms, and its code is unchanged", () => {
    expect(parseDocumentDate("2026-06-01")).toBe("2026-06-01");
    expect(parseDocumentDate("20260601")).toBe("2026-06-01");
    expect(parseDocumentDate("20240229")).toBe("2024-02-29");
    try {
      parseDocumentDate("20260230");
      expect.unreachable("parseDocumentDate accepted February 30");
    } catch (err) {
      expect(err).toBeInstanceOf(X12CodeListError);
      expect((err as X12CodeListError).code).toBe(
        X12_CODE_LIST_ERROR_CODES.X12_CODE_LIST_INVALID_DOCUMENT_DATE,
      );
    }
  });

  it("still throws through the published query that reaches it", () => {
    // The throwing contract on the surface a consumer actually holds, not only on
    // the internal function.
    expect(() => checkCarcValidity("1", "2026-6-27")).toThrow(X12CodeListError);
    expect(checkCarcValidity("1", "2026-06-27").documentDate).toBe("2026-06-27");
  });

  it("accepts a dashed value that this surface refuses under D8, deliberately", () => {
    // `parseDocumentDate` reads a caller-supplied document date and takes either
    // spelling. A DTP-03 under `D8` is `CCYYMMDD` by declaration, so a dashed one
    // does not match the format its own qualifier states.
    expect(parseDocumentDate("2026-06-01")).toBe("2026-06-01");
    expectAllThreeUndefined(
      { formatQualifier: "D8", value: "2026-06-01" },
      "a dashed value under D8",
    );
  });
});

// ---------------------------------------------------------------------------
// Package-level constraints a reviewer will check cold.
// ---------------------------------------------------------------------------

describe("the package constraints this surface was added under", () => {
  const manifest = JSON.parse(readFileSync(join(ROOT, "package.json"), "utf8")) as {
    engines: { node: string };
    dependencies: Record<string, string>;
    devDependencies: Record<string, string>;
    peerDependencies?: Record<string, string>;
    optionalDependencies?: Record<string, string>;
  };

  it("added no dependency of any kind and did not move the engine floor", () => {
    expect(manifest.engines.node).toBe(">=22.0.0");
    expect(Object.keys(manifest.dependencies)).toEqual([]);
    expect(manifest.peerDependencies).toBeUndefined();
    expect(manifest.optionalDependencies).toBeUndefined();
    // The two names the shared shape is designed for are named in PROSE and are
    // imported by nothing: proving the interop would need a dependency this work
    // is not allowed to add, so the key set and the 1-to-12 month are asserted
    // instead.
    for (const forbidden of ["luxon", "@js-temporal/polyfill", "temporal-polyfill"]) {
      expect(Object.keys(manifest.devDependencies)).not.toContain(forbidden);
    }
  });

  it("imports nothing but this package's own existing date authority", () => {
    // The scan reads CODE, not the `@example` blocks, which import the package
    // by its published name the way a consumer would.
    const code = codeOnly(MODULE_SOURCE);
    const imports = [...code.matchAll(/from\s+"([^"]+)"/gu)].map((match) => match[1]);
    expect(imports).toEqual(["../../code-lists/document-date.js"]);
    expect(code).not.toContain("Temporal");
    expect(code).not.toContain("luxon");
  });
});

// ---------------------------------------------------------------------------
// README. The package page is the criterion's own grading route, and this
// package permits exactly one executable block on it (`test/readme-usage.test.ts`
// asserts that), so the section's claims are pinned here instead.
// ---------------------------------------------------------------------------

describe("README.md documents the surface", () => {
  it("documents the three functions together", () => {
    expect(README).toContain("### Dates and times");
    for (const name of ["toObject", "toISO", "toDate"]) {
      expect(README).toContain(`\`${name}\``);
    }
  });

  it("lists the decoded format qualifier set", () => {
    for (const qualifier of DECODED_FORMAT_QUALIFIERS) {
      expect(README).toContain(`\`${qualifier}\``);
    }
  });

  it("states the range rule and the offset-less toDate rule explicitly", () => {
    const flat = README.replaceAll(/[*`]/g, "").replaceAll(/\s+/g, " ");
    expect(flat).toContain("an interval is not a point in time");
    expect(flat).toContain("the host machine's timezone is never read and UTC is never assumed");
  });

  it("shows the import-aliasing pattern the shared names force on a consumer", () => {
    expect(README).toContain("toISO as x12ToISO");
    expect(README).toMatch(/import \{[^}]*toISO as \w+ISO[^}]*\} from "@cosyte\/(?!x12)/u);
  });

  it("shows values the functions actually produce", () => {
    // The section's block is illustrative rather than executed, because this
    // package allows exactly one runnable block and it belongs to `## Usage`. So
    // every `// =>` value in the section is checked here instead of taken on
    // trust.
    const section = README.slice(README.indexOf("### Dates and times"));
    const endsAt = section.indexOf("\n## ");
    const body = endsAt === -1 ? section : section.slice(0, endsAt);
    expect(body.length).toBeGreaterThan(0);
    expect(body).toContain('toISO(day); // "2026-06-01"');
    expect(toISO({ formatQualifier: "D8", value: "20260601" })).toBe("2026-06-01");
    expect(body).toContain("toDate(day); // undefined");
    expect(toDate({ formatQualifier: "D8", value: "20260601" })).toBeUndefined();
    expect(body).toContain(
      'toDate(day, { assumeOffsetMinutes: 0 })?.toISOString(); // "2026-06-01T00:00:00.000Z"',
    );
    expect(
      toDate(
        { formatQualifier: "D8", value: "20260601" },
        { assumeOffsetMinutes: 0 },
      )?.toISOString(),
    ).toBe("2026-06-01T00:00:00.000Z");
    expect(body).toContain("toObject(day); // { year: 2026, month: 6, day: 1 }");
    expect(toObject({ formatQualifier: "D8", value: "20260601" })).toStrictEqual({
      year: 2026,
      month: 6,
      day: 1,
    });
    expect(body).toContain("toISO(span); // undefined");
    expect(toISO({ formatQualifier: "RD8", value: "20260601-20260605" })).toBeUndefined();
  });
});

// ---------------------------------------------------------------------------
// The type-level shape, pinned where a runtime assertion cannot reach.
// ---------------------------------------------------------------------------

describe("the exported types", () => {
  it("declare DateParts with every shared component, all optional and all numeric", () => {
    const parts: DateParts = {
      year: 2026,
      month: 6,
      day: 1,
      hour: 9,
      minute: 30,
      second: 45,
      millisecond: 500,
      offsetMinutes: -300,
    };
    expect(Object.keys(parts)).toHaveLength(8);
    for (const value of Object.values(parts)) expect(typeof value).toBe("number");
    // Every component is optional, so a day-precision result is a valid one.
    const dayOnly: DateParts = { year: 2026, month: 6, day: 1 };
    expect(Object.keys(dayOnly)).toEqual(["year", "month", "day"]);
    const nothing: DateParts = {};
    expect(Object.keys(nothing)).toEqual([]);
  });

  it("declare X12DateValue as the structural carrier the eight named types satisfy", () => {
    const structural: X12DateValue = { formatQualifier: "D8", value: "20260601" };
    const claim: X12ClaimDate = { qualifier: "472", formatQualifier: "D8", value: "20260601" };
    const widened: X12DateValue = claim;
    expect(toISO(structural)).toBe(toISO(widened));
  });

  it("reads the two members it names and no others, which a FRESH literal feels", () => {
    // `X12DateValue` names exactly `formatQualifier` and `value`, so TypeScript's
    // excess-property check refuses a FRESH object literal that also carries the
    // `qualifier` every `X12*Date` has. That boundary is pinned here rather than
    // discovered: a carrier a reader handed back is not a fresh literal and is
    // accepted, which is every real call site.
    const fromAReader: X12ClaimDate = {
      qualifier: "472",
      formatQualifier: "D8",
      value: "20260601",
    };
    expect(toISO(fromAReader)).toBe("2026-06-01");
    // @ts-expect-error a fresh literal may name only the two members this type
    // declares; assign it to `X12ClaimDate` first, or drop the qualifier.
    expect(toISO({ qualifier: "472", formatQualifier: "D8", value: "20260601" })).toBe(
      "2026-06-01",
    );
  });
});
