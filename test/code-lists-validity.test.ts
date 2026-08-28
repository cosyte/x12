/**
 * Date-aware validity for the bundled CARC and RARC snapshots.
 *
 * A remittance carries codes that explain why money moved, and until now this
 * package answered only "is this code in the subset I bundled". A code the
 * maintainer retired years before the remittance was produced came back with a
 * confident description and no signal at all. 45 CFR 162.1011 scopes a code
 * set's validity to the dates its maintaining organisation publishes, so these
 * tests pin three things:
 *
 * - The per-code dates on the shipped snapshots, transcribed from the
 *   maintainer pages and expressed as ISO calendar days.
 * - The three-state answer: `valid`, `not-valid`, and `indeterminate` with a
 *   named reason. Never `valid` for want of evidence, and never `not-valid`
 *   for want of a published date.
 * - The refusals: a document date that is not a calendar day, and a code that
 *   resolves off `Object.prototype` rather than out of the snapshot.
 *
 * The dateless-entry case is graded through a CONSTRUCTED snapshot rather than
 * shipped data: every code on both maintainer pages carries at least a Start
 * date at the capture these snapshots were transcribed from, so no shipped
 * code is in that state. It is taken through the same factory the shipped
 * queries are built from, so the path under test is the real one.
 */

import { describe, expect, it } from "vitest";

import {
  CARC,
  CODE_VALIDITY,
  CODE_VALIDITY_REASONS,
  RARC,
  X12_CODE_LIST_ERROR_CODES,
  X12CodeListError,
  checkCarcValidity,
  checkRarcValidity,
  lookupCarc,
  lookupRarc,
} from "../src/index.js";
import { makeValidityCheck } from "../src/code-lists/meta.js";

const ISO_DATE_RE = /^\d{4}-\d{2}-\d{2}$/u;

/**
 * The dates the maintainer publishes for every bundled CARC, transcribed from
 * `x12.org/codes/claim-adjustment-reason-codes` and converted from that page's
 * `MM/DD/YYYY` rendering to ISO. Written out here rather than derived from the
 * snapshot: a test that reads the value it is asserting proves nothing.
 */
const EXPECTED_CARC_DATES: Readonly<
  Record<string, { start: string; lastModified?: string; stop?: string }>
> = {
  "1": { start: "1995-01-01" },
  "2": { start: "1995-01-01" },
  "3": { start: "1995-01-01" },
  "4": { start: "1995-01-01", lastModified: "2020-03-01" },
  "5": { start: "1995-01-01", lastModified: "2018-03-01" },
  "6": { start: "1995-01-01", lastModified: "2017-07-01" },
  "7": { start: "1995-01-01", lastModified: "2017-07-01" },
  "8": { start: "1995-01-01", lastModified: "2017-07-01" },
  "9": { start: "1995-01-01", lastModified: "2017-07-01" },
  "10": { start: "1995-01-01", lastModified: "2017-07-01" },
  "11": { start: "1995-01-01", lastModified: "2017-07-01" },
  "15": { start: "1995-01-01", lastModified: "2017-11-01", stop: "2018-05-01" },
  "16": { start: "1995-01-01", lastModified: "2018-03-01" },
  "18": { start: "1995-01-01", lastModified: "2013-06-02" },
  "22": { start: "1995-01-01", lastModified: "2007-09-30" },
  "23": { start: "1995-01-01", lastModified: "2012-09-30" },
  "24": { start: "1995-01-01", lastModified: "2007-09-30" },
  "26": { start: "1995-01-01" },
  "27": { start: "1995-01-01" },
  "29": { start: "1995-01-01" },
  "31": { start: "1995-01-01", lastModified: "2007-09-30" },
  "45": { start: "1995-01-01", lastModified: "2017-07-01" },
  "50": { start: "1995-01-01", lastModified: "2017-07-01" },
  "96": { start: "1995-01-01", lastModified: "2017-07-01" },
  "97": { start: "1995-01-01", lastModified: "2017-07-01" },
  "109": { start: "1995-01-01", lastModified: "2012-01-29" },
  "119": { start: "1995-01-01", lastModified: "2004-02-29" },
  "197": { start: "2006-10-31", lastModified: "2018-05-01" },
  "204": { start: "2007-02-28" },
};

/**
 * The same, transcribed from `x12.org/codes/remittance-advice-remark-codes`.
 * Every bundled RARC is current at that capture, so none carries a Stop date.
 */
const EXPECTED_RARC_DATES: Readonly<Record<string, { start: string; lastModified?: string }>> = {
  M1: { start: "1997-01-01" },
  M86: { start: "1997-01-01", lastModified: "2003-06-30" },
  M127: { start: "1997-01-01", lastModified: "2003-02-28" },
  MA01: { start: "1997-01-01", lastModified: "2007-04-01" },
  MA15: { start: "1997-01-01", lastModified: "2007-04-01" },
  N4: { start: "2000-01-01", lastModified: "2012-03-06" },
  N30: { start: "2000-01-01", lastModified: "2003-06-30" },
  N122: { start: "2002-09-12", lastModified: "2005-08-01" },
  N130: { start: "2002-10-31", lastModified: "2009-11-01" },
  N179: { start: "2003-02-28" },
  N522: { start: "2009-11-01", lastModified: "2010-03-01" },
  N657: { start: "2013-07-15" },
};

/** The five inherited keys a plain object literal answers for. */
const PROTOTYPE_KEYS = ["constructor", "__proto__", "toString", "valueOf", "hasOwnProperty"];

describe("per-code dates on the bundled snapshots", () => {
  it("CARC: every bundled code carries exactly the dates the maintainer publishes", () => {
    expect(Object.keys(CARC.dates).sort()).toEqual(Object.keys(EXPECTED_CARC_DATES).sort());
    for (const [code, expected] of Object.entries(EXPECTED_CARC_DATES)) {
      expect({ ...CARC.dates[code] }).toEqual(expected);
    }
  });

  it("RARC: every bundled code carries exactly the dates the maintainer publishes", () => {
    expect(Object.keys(RARC.dates).sort()).toEqual(Object.keys(EXPECTED_RARC_DATES).sort());
    for (const [code, expected] of Object.entries(EXPECTED_RARC_DATES)) {
      expect({ ...RARC.dates[code] }).toEqual(expected);
    }
  });

  it("every bundled code has a date record, and every date is an ISO calendar day", () => {
    for (const snapshot of [CARC, RARC]) {
      expect(Object.keys(snapshot.dates).sort()).toEqual(Object.keys(snapshot.codes).sort());
      for (const dates of Object.values(snapshot.dates)) {
        expect(dates.start).toMatch(ISO_DATE_RE);
        for (const value of [dates.lastModified, dates.stop]) {
          if (value !== undefined) expect(value).toMatch(ISO_DATE_RE);
        }
      }
    }
  });

  it("CARC 15 reads start / last modified / stop in ISO form", () => {
    expect(CARC.dates["15"]?.start).toBe("1995-01-01");
    expect(CARC.dates["15"]?.lastModified).toBe("2017-11-01");
    expect(CARC.dates["15"]?.stop).toBe("2018-05-01");
  });

  it("a code the maintainer publishes no stop date for exposes none", () => {
    expect(CARC.dates["1"]?.stop).toBeUndefined();
    expect(CARC.dates["1"]?.lastModified).toBeUndefined();
    expect(RARC.dates["M1"]?.stop).toBeUndefined();
  });

  it("the date table and every record in it are frozen", () => {
    for (const snapshot of [CARC, RARC]) {
      expect(Object.isFrozen(snapshot.dates)).toBe(true);
      for (const dates of Object.values(snapshot.dates)) {
        expect(Object.isFrozen(dates)).toBe(true);
      }
    }
  });

  it("the lookup helpers carry the same dates onto the entry they return", () => {
    expect(lookupCarc("15")?.dates?.stop).toBe("2018-05-01");
    expect(lookupCarc("1")?.dates).toEqual({ start: "1995-01-01" });
    expect(lookupRarc("N4")?.dates).toEqual({ start: "2000-01-01", lastModified: "2012-03-06" });
  });
});

describe("validity-date provenance", () => {
  it.each([
    ["CARC", CARC, "https://x12.org/codes/claim-adjustment-reason-codes"],
    ["RARC", RARC, "https://x12.org/codes/remittance-advice-remark-codes"],
  ] as const)("%s: names when the dates were captured and from which page", (name, snap, page) => {
    expect(snap.meta.datesCapturedAt).toMatch(ISO_DATE_RE);
    expect(snap.meta.datesSource).toBe(page);
    void name;
  });

  it("the dates' provenance is separate from the descriptions' own dates", () => {
    for (const snapshot of [CARC, RARC]) {
      // Distinct FIELDS, and distinct VALUES: the dates were captured on a
      // different day from the descriptions, so a consumer can tell how fresh
      // the validity data is without inferring it from the snapshot date.
      expect(snapshot.meta.datesCapturedAt).not.toBe(snapshot.meta.snapshotDate);
      expect(snapshot.meta.datesCapturedAt).not.toBe(snapshot.meta.publishedDate);
      expect(snapshot.meta.datesSource).not.toBe(snapshot.meta.source);
    }
  });

  it("the whole meta record is still frozen", () => {
    expect(Object.isFrozen(CARC.meta)).toBe(true);
    expect(Object.isFrozen(RARC.meta)).toBe(true);
  });
});

describe("a code valid on the supplied day", () => {
  it("CARC 1 is valid on 2026-06-27", () => {
    const answer = checkCarcValidity("1", "2026-06-27");
    expect(answer.validity).toBe(CODE_VALIDITY.VALID);
    expect(answer.reason).toBeUndefined();
    expect(answer.code).toBe("1");
    expect(answer.description).toBe("Deductible Amount");
    expect(answer.documentDate).toBe("2026-06-27");
    expect(answer.dates?.start).toBe("1995-01-01");
  });

  it("CARC 15 is valid on 2018-04-30, the day before its stop date", () => {
    expect(checkCarcValidity("15", "2018-04-30").validity).toBe(CODE_VALIDITY.VALID);
  });

  it("a code is valid ON its start date, not merely after it", () => {
    expect(checkCarcValidity("1", "1995-01-01").validity).toBe(CODE_VALIDITY.VALID);
    expect(checkRarcValidity("N4", "2000-01-01").validity).toBe(CODE_VALIDITY.VALID);
  });

  it("RARC N4 is valid on a present-day date", () => {
    const answer = checkRarcValidity("N4", "2026-06-27");
    expect(answer.validity).toBe(CODE_VALIDITY.VALID);
    expect(answer.description).toBe(RARC.codes["N4"]);
  });

  it("the wire form CCYYMMDD names the same day and normalises to ISO", () => {
    const answer = checkRarcValidity("N4", "20260627");
    expect(answer.validity).toBe(CODE_VALIDITY.VALID);
    expect(answer.documentDate).toBe("2026-06-27");
  });

  it("every bundled code is valid on the day its own start date names", () => {
    for (const [code, dates] of Object.entries(EXPECTED_CARC_DATES)) {
      expect(checkCarcValidity(code, dates.start).validity).toBe(CODE_VALIDITY.VALID);
    }
    for (const [code, dates] of Object.entries(EXPECTED_RARC_DATES)) {
      expect(checkRarcValidity(code, dates.start).validity).toBe(CODE_VALIDITY.VALID);
    }
  });

  it("the answer is frozen", () => {
    expect(Object.isFrozen(checkCarcValidity("1", "2026-06-27"))).toBe(true);
  });
});

describe("a code not valid on the supplied day", () => {
  it("CARC 15 is not valid ON its stop date - the interval is half-open", () => {
    const answer = checkCarcValidity("15", "2018-05-01");
    expect(answer.validity).toBe(CODE_VALIDITY.NOT_VALID);
    expect(answer.reason).toBeUndefined();
    expect(answer.dates?.stop).toBe("2018-05-01");
  });

  it("CARC 15 is not valid on a present-day date, and still carries its description", () => {
    const answer = checkCarcValidity("15", "2026-06-27");
    expect(answer.validity).toBe(CODE_VALIDITY.NOT_VALID);
    expect(answer.description).toBe(CARC.codes["15"]);
  });

  it("RARC N4 is not valid on 1999-12-31, the day before its start", () => {
    const answer = checkRarcValidity("N4", "1999-12-31");
    expect(answer.validity).toBe(CODE_VALIDITY.NOT_VALID);
    expect(answer.reason).toBeUndefined();
  });

  it("a document date before a CARC start date is not valid either", () => {
    expect(checkCarcValidity("197", "2006-10-30").validity).toBe(CODE_VALIDITY.NOT_VALID);
    expect(checkCarcValidity("197", "2006-10-31").validity).toBe(CODE_VALIDITY.VALID);
  });
});

describe("a code whose validity cannot be determined", () => {
  it("a bundled code with no published start date is indeterminate, never either verdict", () => {
    // Constructed: no shipped CARC or RARC is in this state at the committed
    // capture, and the fail-safe still has to hold if one ever is.
    const check = makeValidityCheck({
      codes: { UNDATED: "A code the maintainer published no dates for." },
      dates: {},
    });
    const answer = check("UNDATED", "2026-06-27");
    expect(answer.validity).toBe(CODE_VALIDITY.INDETERMINATE);
    expect(answer.reason).toBe(CODE_VALIDITY_REASONS.NO_PUBLISHED_START_DATE);
    expect(answer.validity).not.toBe(CODE_VALIDITY.VALID);
    expect(answer.validity).not.toBe(CODE_VALIDITY.NOT_VALID);
    expect(answer.code).toBe("UNDATED");
    expect(answer.description).toBe("A code the maintainer published no dates for.");
  });

  it("a date record carrying only a last-modified date is still start-less", () => {
    const check = makeValidityCheck({
      codes: { UNDATED: "Modified once, never given a start date." },
      dates: { UNDATED: { lastModified: "2020-01-01" } },
    });
    const answer = check("UNDATED", "2026-06-27");
    expect(answer.validity).toBe(CODE_VALIDITY.INDETERMINATE);
    expect(answer.reason).toBe(CODE_VALIDITY_REASONS.NO_PUBLISHED_START_DATE);
    expect(answer.dates?.lastModified).toBe("2020-01-01");
  });

  it("a code with a start date is decided rather than indeterminate", () => {
    const check = makeValidityCheck({
      codes: { DATED: "A code with a published start date." },
      dates: { DATED: { start: "2020-01-01" } },
    });
    expect(check("DATED", "2026-06-27").validity).toBe(CODE_VALIDITY.VALID);
    expect(check("DATED", "2019-12-31").validity).toBe(CODE_VALIDITY.NOT_VALID);
  });
});

describe("a code outside the bundled subset", () => {
  it.each(["9999", "", " 1", "1 ", "ZZZZ"])(
    "CARC %j comes back verbatim, undescribed and indeterminate",
    (code) => {
      const answer = checkCarcValidity(code, "2026-06-27");
      expect(answer.code).toBe(code);
      expect(answer.description).toBeUndefined();
      expect(answer.dates).toBeUndefined();
      expect(answer.validity).toBe(CODE_VALIDITY.INDETERMINATE);
      expect(answer.reason).toBe(CODE_VALIDITY_REASONS.CODE_NOT_IN_BUNDLED_SUBSET);
      expect(answer.validity).not.toBe(CODE_VALIDITY.VALID);
      expect(answer.validity).not.toBe(CODE_VALIDITY.NOT_VALID);
    },
  );

  it.each(["n4", " N4", "N4 ", "m1", ""])(
    "RARC %j comes back verbatim, undescribed and indeterminate",
    (code) => {
      const answer = checkRarcValidity(code, "2026-06-27");
      expect(answer.code).toBe(code);
      expect(answer.description).toBeUndefined();
      expect(answer.validity).toBe(CODE_VALIDITY.INDETERMINATE);
      expect(answer.reason).toBe(CODE_VALIDITY_REASONS.CODE_NOT_IN_BUNDLED_SUBSET);
    },
  );
});

describe("an inherited prototype key is an absent code, on every route", () => {
  it.each(PROTOTYPE_KEYS)("%s is indeterminate on the date-aware CARC query", (key) => {
    const answer = checkCarcValidity(key, "2026-06-27");
    expect(answer.validity).toBe(CODE_VALIDITY.INDETERMINATE);
    expect(answer.reason).toBe(CODE_VALIDITY_REASONS.CODE_NOT_IN_BUNDLED_SUBSET);
    expect(answer.code).toBe(key);
    expect(answer.description).toBeUndefined();
    expect(answer.dates).toBeUndefined();
  });

  it.each(PROTOTYPE_KEYS)("%s is indeterminate on the date-aware RARC query", (key) => {
    const answer = checkRarcValidity(key, "2026-06-27");
    expect(answer.validity).toBe(CODE_VALIDITY.INDETERMINATE);
    expect(answer.reason).toBe(CODE_VALIDITY_REASONS.CODE_NOT_IN_BUNDLED_SUBSET);
    expect(answer.description).toBeUndefined();
  });

  it.each(PROTOTYPE_KEYS)("%s returns nothing at all from the existing lookups", (key) => {
    expect(lookupCarc(key)).toBeUndefined();
    expect(lookupRarc(key)).toBeUndefined();
  });

  it("a prototype key on a snapshot's date table resolves to no dates", () => {
    // The description read and the date read are both guarded, so a code the
    // date table does not own cannot pick a function up off the prototype.
    const check = makeValidityCheck({
      codes: { constructor: "A code named like an inherited key." },
      dates: {},
    });
    const answer = check("constructor", "2026-06-27");
    expect(answer.validity).toBe(CODE_VALIDITY.INDETERMINATE);
    expect(answer.reason).toBe(CODE_VALIDITY_REASONS.NO_PUBLISHED_START_DATE);
    expect(answer.dates).toBeUndefined();
  });
});

describe("a document date that is not a calendar day is refused", () => {
  const REFUSED = ["", "2026-6-27", "20260631", "2026-02-30", "not-a-date"];

  it.each(REFUSED)("refuses %j with a typed, code-tagged error naming the value", (value) => {
    let thrown: unknown;
    try {
      checkCarcValidity("1", value);
    } catch (err) {
      thrown = err;
    }
    expect(thrown).toBeInstanceOf(X12CodeListError);
    const err = thrown as X12CodeListError;
    expect(err.code).toBe(X12_CODE_LIST_ERROR_CODES.X12_CODE_LIST_INVALID_DOCUMENT_DATE);
    expect(err.name).toBe("X12CodeListError");
    expect(err.rejectedValue).toBe(JSON.stringify(value));
    expect(err.message).toContain(JSON.stringify(value));
  });

  it.each(REFUSED)("refuses %j on the RARC query too", (value) => {
    expect(() => checkRarcValidity("N4", value)).toThrow(X12CodeListError);
  });

  it("refuses a JavaScript Date instance, which names an instant and not a day", () => {
    // The declared parameter is `string`, so only a JavaScript or JSON-driven
    // caller can reach this; the cast is what makes that caller reachable from
    // a typed test, and the refusal is the behaviour being pinned.
    const instant = new Date("2026-06-27T00:00:00Z") as unknown as string;
    let thrown: unknown;
    try {
      checkCarcValidity("1", instant);
    } catch (err) {
      thrown = err;
    }
    expect(thrown).toBeInstanceOf(X12CodeListError);
    expect((thrown as X12CodeListError).code).toBe(
      X12_CODE_LIST_ERROR_CODES.X12_CODE_LIST_INVALID_DOCUMENT_DATE,
    );
  });

  it("refuses a non-string a JavaScript caller could pass, without a bare TypeError", () => {
    // Typed `string` so the call site needs no cast; the VALUES are the
    // non-strings a JavaScript or JSON-driven caller reaches this guard with.
    const values = [null, undefined, 20260627, {}, []] as unknown as readonly string[];
    for (const value of values) {
      expect(() => checkCarcValidity("1", value)).toThrow(X12CodeListError);
    }
  });

  it("refuses the date whatever the code is, so an absent code gets no answer either", () => {
    expect(() => checkCarcValidity("9999", "not-a-date")).toThrow(X12CodeListError);
    expect(() => checkCarcValidity("constructor", "2026-02-30")).toThrow(X12CodeListError);
  });

  it.each(["2026-00-10", "2026-13-01", "2026-01-00", "20260010", "20261301", "20260100"])(
    "refuses %j: the month or the day is outside the calendar",
    (value) => {
      expect(() => checkCarcValidity("1", value)).toThrow(X12CodeListError);
    },
  );

  it("reads the real calendar, leap years included", () => {
    expect(checkCarcValidity("1", "2024-02-29").documentDate).toBe("2024-02-29");
    expect(checkCarcValidity("1", "2000-02-29").documentDate).toBe("2000-02-29");
    expect(() => checkCarcValidity("1", "2023-02-29")).toThrow(X12CodeListError);
    expect(() => checkCarcValidity("1", "1900-02-29")).toThrow(X12CodeListError);
  });

  it("accepts the last day of every month length", () => {
    for (const day of ["2026-01-31", "2026-04-30", "2026-06-30", "2026-09-30", "2026-11-30"]) {
      expect(checkCarcValidity("1", day).documentDate).toBe(day);
    }
    expect(() => checkCarcValidity("1", "2026-04-31")).toThrow(X12CodeListError);
    expect(() => checkCarcValidity("1", "2026-09-31")).toThrow(X12CodeListError);
    expect(() => checkCarcValidity("1", "2026-11-31")).toThrow(X12CodeListError);
    expect(() => checkCarcValidity("1", "2026-01-32")).toThrow(X12CodeListError);
  });

  it("bounds an over-long rejected value rather than echoing it whole", () => {
    let thrown: unknown;
    try {
      checkCarcValidity("1", "9".repeat(120000));
    } catch (err) {
      thrown = err;
    }
    expect(thrown).toBeInstanceOf(X12CodeListError);
    const err = thrown as X12CodeListError;
    expect(err.rejectedValue.length).toBeLessThan(120);
    expect(err.message.length).toBeLessThan(250);
  });
});
