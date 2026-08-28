/**
 * **RARC - Remittance Advice Remark Codes.** Lives on 835 `MIA-05/MIA-20`,
 * `MOA-03..MOA-09`, `LQ-02` (when `LQ-01 = "HE"`), and `NTE` remittance
 * notes. Where CARC says *why* an adjustment was made, RARC adds *which
 * specific rule fired* - diagnostic granularity for appeals + cash-posting
 * triage. Misreading a code drives the wrong remediation path (appeal vs
 * write-off vs patient call).
 *
 * Source: **WPC (Washington Publishing Company)** - `x12.org/codes/
 * remittance-advice-remark-codes`. WPC updates monthly. Two prefix
 * conventions: `M`-prefix (legacy / fee-schedule-related, e.g. `M1`) and
 * `N`-prefix (introduced 2003+, e.g. `N4`). Both shapes co-exist in real
 * traffic; the parser treats them as one alphabetic-prefixed code space.
 *
 * **Pre-launch initial subset.** This snapshot covers ~15 of the most
 * commonly observed RARC codes. Unknown codes still parse fine
 * (verbatim); only the description is unavailable, and the 835 walker
 * emits `X12_UNKNOWN_RARC`.
 *
 * **Per-code dates.** Every bundled code carries the Start, and where the
 * maintainer publishes one the Last Modified date, that
 * `x12.org/codes/remittance-advice-remark-codes` states for it. They were
 * transcribed from a capture of that page taken on 2026-08-28 (505016 bytes,
 * sha256 af769e8821a7a5d80258bbc7a6a7b09491d3b312ecdc8714f9f61ad897320986),
 * converting the page's `MM/DD/YYYY` rendering to ISO `YYYY-MM-DD`. Every
 * bundled RARC is current at that capture, so none carries a Stop date; that is
 * a fact about these twelve codes and not a property of the list.
 * {@link checkRarcValidity} answers validity on a supplied day.
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
 * Bundled RARC snapshot. Companion to {@link "./carc.js".CARC}; same
 * freshness + safety posture, and the same separation between when the
 * descriptions were captured (`meta.snapshotDate`) and when the per-code
 * validity dates were (`meta.datesCapturedAt`). Use {@link lookupRarc} for the
 * ergonomic lookup.
 *
 * @example
 * ```ts
 * import { RARC } from "@cosyte/x12";
 * RARC.codes["N4"];        // "Missing/incomplete/invalid prior insurance carrier(s) EOB."
 * RARC.codes["MA01"];      // (or undefined if outside this subset)
 * RARC.dates["N4"]?.start; // "2000-01-01"
 * ```
 */
export const RARC: DatedCodeListSnapshot = Object.freeze({
  meta: Object.freeze({
    id: "RARC",
    description: "Remittance Advice Remark Codes",
    source: "WPC (Washington Publishing Company) - x12.org/codes/remittance-advice-remark-codes",
    publishedDate: "2026-03-01",
    snapshotDate: "2026-06-27",
    datesSource: "https://x12.org/codes/remittance-advice-remark-codes",
    datesCapturedAt: "2026-08-28",
    note: "Pre-launch initial subset (~15 most commonly observed codes). Phase 10 ships a full-regen script.",
  }),
  codes: Object.freeze({
    M1: "X-ray not taken within the past 12 months or near enough to the start of treatment.",
    M86: "Service denied because payment already made for same/similar procedure within set time frame.",
    M127: "Missing patient medical record for this service.",
    MA01: "Alert: If you do not agree with what we approved for these services, you may appeal our decision.",
    MA15: "Alert: Your claim has been separated to expedite handling. You will receive a separate notice for the other services reported.",
    N4: "Missing/incomplete/invalid prior insurance carrier(s) EOB.",
    N30: "Patient ineligible for this service.",
    N122: "Add-on code cannot be billed by itself.",
    N130: "Consult plan benefit documents/guidelines for information about restrictions for this service.",
    N179: "Additional information has been requested from the member. The charges will be reconsidered upon receipt of that information.",
    N522: "Duplicate of a previously processed claim/line.",
    N657: "This should be billed with the appropriate code for these services.",
  }),
  dates: freezeCodeDates({
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
  }),
});

/**
 * Look up a RARC code's bundled description. Same fail-safe semantics as
 * {@link "./carc.js".lookupCarc}: unknown codes return `undefined`, the
 * verbatim code is preserved on the parsed model, and the 835 walker
 * emits `X12_UNKNOWN_RARC`.
 *
 * @example
 * ```ts
 * import { lookupRarc } from "@cosyte/x12";
 * lookupRarc("N4")?.description; // "Missing/incomplete/invalid prior insurance carrier(s) EOB."
 * ```
 */
export const lookupRarc: (code: string) => CodeListEntry | undefined = makeLookup(RARC);

/**
 * Report whether a RARC code was valid on the day a document was produced.
 * Same three-state answer and the same fail-safe direction as
 * {@link "./carc.js".checkCarcValidity}: never `valid` for want of evidence,
 * and an `indeterminate` answer always names its reason.
 *
 * `documentDate` is a calendar day in `YYYY-MM-DD` or `CCYYMMDD` form; anything
 * else is refused with an {@link "./errors.js".X12CodeListError}.
 *
 * @example
 * ```ts
 * import { checkRarcValidity } from "@cosyte/x12";
 * checkRarcValidity("N4", "2026-06-27").validity;  // "valid"
 * checkRarcValidity("N4", "1999-12-31").validity;  // "not-valid" (before its start)
 * checkRarcValidity("ZZZZ", "2026-06-27").reason;  // "code-not-in-bundled-subset"
 * ```
 */
export const checkRarcValidity: (code: string, documentDate: string) => CodeValidityResult =
  makeValidityCheck(RARC);
