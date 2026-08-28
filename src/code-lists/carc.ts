/**
 * **CARC - Claim Adjustment Reason Codes.** Lives on every CAS adjustment
 * in an 835 (and on 837 COB CAS adjustments). The numeric code identifies
 * *why* the adjustment was made (e.g. "deductible", "non-covered",
 * "exceeds fee schedule"); paired with the Claim Adjustment Group Code on
 * `CAS-01` it tells a cash-poster who owes the unpaid balance and what
 * the next action is (appeal, write-off, patient bill).
 *
 * Source: **WPC (Washington Publishing Company)** - `x12.org/codes/claim-
 * adjustment-reason-codes`. WPC updates the list **monthly**. Misreading a
 * code drives wrong patient billing or a wrong appeal - the parser surfaces
 * the verbatim code AND the bundled-snapshot description; unknown codes
 * carry the verbatim value with `description: undefined` AND emit a
 * `X12_UNKNOWN_CARC` warning.
 *
 * **Pre-launch initial subset.** This snapshot covers the ~30 most
 * commonly observed CARC codes - every value exercised by the Tier-1 /
 * Tier-2 fixtures plus the long-tail codes most cash-posting workflows
 * branch on. The `pnpm refresh:code-lists` script regenerates
 * the full WPC-published list from the canonical source for the first
 * real publish; until then a CARC absent from the snapshot still parses
 * fine (verbatim) - only its description is unavailable.
 *
 * **Per-code dates.** Every bundled code carries the Start, and where the
 * maintainer publishes them the Last Modified and Stop dates, that
 * `x12.org/codes/claim-adjustment-reason-codes` states for it. They were
 * transcribed from a capture of that page taken on 2026-08-28 (226207 bytes,
 * sha256 359dd89a75deda92416b0ed78f2ed2f0c90c4d40c4a84a73fe4b15a406df2e66),
 * converting the page's `MM/DD/YYYY` rendering to ISO `YYYY-MM-DD`. No code was
 * added or removed and no description changed with them:
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
  type CodeValidityResult,
  type DatedCodeListSnapshot,
} from "./meta.js";

/**
 * Bundled CARC snapshot. `meta.publishedDate` is the WPC publication
 * date this subset reflects; `meta.snapshotDate` is when cosyte captured
 * it, and `meta.datesCapturedAt` / `meta.datesSource` say separately when the
 * per-code validity dates were read and from which maintainer page. The
 * `codes` and `dates` maps are frozen - use the {@link lookupCarc} helper for
 * the ergonomic `{ code, description }` shape consumed by the 835
 * helper.
 *
 * @example
 * ```ts
 * import { CARC } from "@cosyte/x12";
 * CARC.meta.snapshotDate;          // "2026-06-27"
 * CARC.meta.datesCapturedAt;       // "2026-08-28"
 * CARC.codes["45"];                // "Charge exceeds fee schedule..."
 * CARC.dates["45"]?.start;         // "1995-01-01"
 * Object.keys(CARC.codes).length;  // count of bundled codes
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
    note: "Pre-launch initial subset (~30 most commonly observed codes). Phase 10 ships a full-regen script.",
  }),
  codes: Object.freeze({
    "1": "Deductible Amount",
    "2": "Coinsurance Amount",
    "3": "Co-payment Amount",
    "4": "The procedure code is inconsistent with the modifier used.",
    "5": "The procedure code/type of bill is inconsistent with the place of service.",
    "6": "The procedure/revenue code is inconsistent with the patient's age.",
    "7": "The procedure/revenue code is inconsistent with the patient's gender.",
    "8": "The procedure code is inconsistent with the provider type/specialty (taxonomy).",
    "9": "The diagnosis is inconsistent with the patient's age.",
    "10": "The diagnosis is inconsistent with the patient's gender.",
    "11": "The diagnosis is inconsistent with the procedure.",
    "15": "The authorization number is missing, invalid, or does not apply to the billed services or provider.",
    "16": "Claim/service lacks information or has submission/billing error(s).",
    "18": "Exact duplicate claim/service.",
    "22": "This care may be covered by another payer per coordination of benefits.",
    "23": "The impact of prior payer(s) adjudication including payments and/or adjustments.",
    "24": "Charges are covered under a capitation agreement/managed care plan.",
    "26": "Expenses incurred prior to coverage.",
    "27": "Expenses incurred after coverage terminated.",
    "29": "The time limit for filing has expired.",
    "31": "Patient cannot be identified as our insured.",
    "45": "Charge exceeds fee schedule/maximum allowable or contracted/legislated fee arrangement.",
    "50": "These are non-covered services because this is not deemed a 'medical necessity' by the payer.",
    "96": "Non-covered charge(s).",
    "97": "The benefit for this service is included in the payment/allowance for another service/procedure that has already been adjudicated.",
    "109": "Claim/service not covered by this payer/contractor.",
    "119": "Benefit maximum for this time period or occurrence has been reached.",
    "197": "Precertification/authorization/notification/pre-treatment absent.",
    "204": "This service/equipment/drug is not covered under the patient's current benefit plan.",
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
 * Look up a CARC code's bundled description. Returns `undefined` when
 * the code is not in the initial subset - the verbatim code is still
 * preserved on the parsed model and the 835 walker emits
 * `X12_UNKNOWN_CARC` so consumers know the description gap exists.
 *
 * @example
 * ```ts
 * import { lookupCarc } from "@cosyte/x12";
 * lookupCarc("45")?.description; // "Charge exceeds fee schedule..."
 * lookupCarc("9999");            // undefined (outside the bundled subset)
 * ```
 */
export const lookupCarc: (code: string) => CodeListEntry | undefined = makeLookup(CARC);

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
