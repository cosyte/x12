/**
 * **CARC - Claim Adjustment Reason Codes.** Lives on every CAS adjustment
 * in an 835 (and on 837 COB CAS adjustments). The code says *why* the
 * adjustment was made; paired with the Claim Adjustment Group Code on
 * `CAS-01` it tells a cash-poster who owes the unpaid balance and what the
 * next action is (appeal, write-off, patient bill).
 *
 * Maintained by ASC X12 and published at
 * `x12.org/codes/claim-adjustment-reason-codes`, updated monthly. Misreading a
 * code drives wrong patient billing or a wrong appeal - the parser surfaces
 * the verbatim code; a code outside this subset also emits a
 * `X12_UNKNOWN_CARC` warning.
 *
 * **No description text ships.** The list's own redistribution record
 * ({@link "./redistribution.js".CARC_REDISTRIBUTION}) is `"licence-required"`,
 * so the snapshot keeps the codes, their published dates and the metadata,
 * and maps every code to `undefined`. A caller with its own descriptions
 * passes them as `lookupCarc(code, { descriptions })`.
 *
 * **Initial subset.** This snapshot covers about 30 codes: every value the
 * fixtures exercise plus codes cash-posting workflows commonly branch on. A
 * CARC absent from the snapshot still parses fine (verbatim).
 *
 * **Per-code dates.** Every bundled code carries the Start, and where the
 * maintainer publishes them the Last Modified and Stop dates, that
 * `x12.org/codes/claim-adjustment-reason-codes` states for it. They were
 * transcribed from a capture of that page taken on 2026-08-28 (226207 bytes,
 * sha256 359dd89a75deda92416b0ed78f2ed2f0c90c4d40c4a84a73fe4b15a406df2e66),
 * converting the page's `MM/DD/YYYY` rendering to ISO `YYYY-MM-DD`.
 * {@link checkCarcValidity} is the whole of what they buy.
 *
 * **Code 15 is deactivated and reports as such.** The maintainer stopped it on
 * 05/01/2018 and this subset has been shipping it as though it were current
 * ever since, so it now answers `not-valid` for any present-day document date.
 * That is the intended new truth rather than a data defect, and it is exactly
 * the case the date-aware query exists for.
 */

import {
  freezeCodeDates,
  makeLookup,
  makeValidityCheck,
  type CodeListEntry,
  type CodeListLookupOptions,
  type CodeValidityResult,
  type DatedCodeListSnapshot,
} from "./meta.js";
import { CARC_REDISTRIBUTION } from "./redistribution.js";

/**
 * Bundled CARC snapshot. `meta.publishedDate` is the publication date this
 * subset reflects; `meta.snapshotDate` is when we captured it, and
 * `meta.datesCapturedAt` / `meta.datesSource` say separately when the
 * per-code validity dates were read and from which maintainer page. The
 * `codes` and `dates` maps are frozen - use the {@link lookupCarc} helper for
 * the `{ code, description }` shape consumed by the 835 helper.
 *
 * `meta.maintainingOrganization` and `meta.redistribution` record that this
 * list is X12's and that its record is `"licence-required"`, so `codes` maps
 * every bundled code to `undefined`: the codes ship, the descriptions do not,
 * and the record names the licensor to approach.
 *
 * @example
 * ```ts
 * import { CARC } from "@cosyte/x12";
 * CARC.meta.snapshotDate;              // "2026-06-27"
 * CARC.meta.datesCapturedAt;           // "2026-08-28"
 * Object.hasOwn(CARC.codes, "45");     // true (the code is bundled)
 * CARC.codes["45"];                    // undefined (no description ships)
 * CARC.dates["45"]?.start;             // "1995-01-01"
 * Object.keys(CARC.codes).length;      // count of bundled codes
 * CARC.meta.maintainingOrganization;   // "ASC X12"
 * CARC.meta.redistribution?.status;    // "licence-required"
 * ```
 */
export const CARC: DatedCodeListSnapshot = Object.freeze({
  meta: Object.freeze({
    id: "CARC",
    description: "Claim Adjustment Reason Codes",
    source: "WPC (Washington Publishing Company) - x12.org/codes/claim-adjustment-reason-codes",
    publishedDate: "2026-03-01",
    snapshotDate: "2026-06-27",
    datesSource: "https://x12.org/codes/claim-adjustment-reason-codes",
    datesCapturedAt: "2026-08-28",
    note: "Initial subset (~30 most commonly observed codes), not the full list; refreshed with a package release, never at runtime.",
    maintainingOrganization: "ASC X12",
    redistribution: CARC_REDISTRIBUTION,
    completeness: "cited-subset",
  }),
  codes: Object.freeze({
    "1": undefined,
    "2": undefined,
    "3": undefined,
    "4": undefined,
    "5": undefined,
    "6": undefined,
    "7": undefined,
    "8": undefined,
    "9": undefined,
    "10": undefined,
    "11": undefined,
    "15": undefined,
    "16": undefined,
    "18": undefined,
    "22": undefined,
    "23": undefined,
    "24": undefined,
    "26": undefined,
    "27": undefined,
    "29": undefined,
    "31": undefined,
    "45": undefined,
    "50": undefined,
    "96": undefined,
    "97": undefined,
    "109": undefined,
    "119": undefined,
    "197": undefined,
    "204": undefined,
  }),
  dates: freezeCodeDates({
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
  }),
});

/**
 * Look up a CARC code. A bundled code returns `{ code, description, dates }`
 * with `description: undefined`, because this list ships no description text
 * (its record is `"licence-required"`); pass your own table as
 * `options.descriptions` to fill it. Returns `undefined` when the code is not
 * in the bundled subset and your table does not describe it - the verbatim
 * code is still preserved on the parsed model and the 835 walker emits
 * `X12_UNKNOWN_CARC`.
 *
 * @example
 * ```ts
 * import { lookupCarc } from "@cosyte/x12";
 * lookupCarc("45")?.description;   // undefined (bundled code, no description ships)
 * lookupCarc("45")?.dates?.start;  // "1995-01-01"
 * lookupCarc("45", { descriptions: { "45": "Made-up text" } })?.description; // "Made-up text"
 * lookupCarc("9999");              // undefined (outside the bundled subset)
 * ```
 */
export const lookupCarc: (
  code: string,
  options?: CodeListLookupOptions,
) => CodeListEntry | undefined = makeLookup(CARC);

/**
 * Report whether a CARC code was valid on the day a document was produced,
 * rather than only whether this package bundles it.
 *
 * Three answers, never two. `valid` and `not-valid` are both claims backed by a
 * date the maintainer published; `indeterminate` says the shipped data cannot
 * decide, and carries the reason - the code is outside the bundled subset, or
 * it is inside it with no published start date. A code is NEVER reported valid
 * for want of evidence, which is the whole asymmetry here: a retired code read
 * as current is a payer credited with an adjustment reason it was not entitled
 * to use.
 *
 * `documentDate` is a calendar day in `YYYY-MM-DD` or `CCYYMMDD` form. Anything
 * else, a JavaScript `Date` included, is refused with an
 * {@link "./errors.js".X12CodeListError} and yields no answer at all.
 *
 * @example
 * ```ts
 * import { checkCarcValidity } from "@cosyte/x12";
 * checkCarcValidity("1", "2026-06-27").validity;    // "valid"
 * checkCarcValidity("15", "2018-04-30").validity;   // "valid"
 * checkCarcValidity("15", "2018-05-01").validity;   // "not-valid" (stopped that day)
 * checkCarcValidity("9999", "20260627").validity;   // "indeterminate"
 * checkCarcValidity("9999", "20260627").code;       // "9999" (echoed verbatim)
 * ```
 */
export const checkCarcValidity: (code: string, documentDate: string) => CodeValidityResult =
  makeValidityCheck(CARC);
