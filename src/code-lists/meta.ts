/**
 * Shared types for bundled X12 code-list snapshots. Every snapshot is a
 * **versioned data artifact** (not a runtime fetch) - `meta.snapshotDate`
 * is the date this package captured the list; `meta.publishedDate` is the
 * WPC / X12 / CMS publication date the snapshot reflects.
 *
 * Snapshots are deliberately tiny in v0.0.x - pre-launch initial subsets
 * covering only the codes already exercised by the parser's Tier-1 + Tier-2
 * fixtures. The `pnpm refresh:code-lists` script will regenerate
 * the full WPC-published lists from canonical sources for the first real
 * release; until then `lookup(code)` returns `undefined` for codes outside
 * the subset and consumers receive the **verbatim** inbound code (the
 * value is never lost - only the human-readable description is absent).
 *
 * Update / freshness policy: WPC updates CARC + RARC monthly; CSCC + CSC
 * monthly; X12 internal code lists (Claim Adjustment Group, etc.) follow
 * the standard release cadence (rare). Snapshots are refreshed on a
 * release cadence, not at runtime - a stale description never produces a
 * wrong code, only a missing description.
 *
 * Per-code validity is a SEPARATE question from freshness, and the snapshots
 * that carry the maintainer's per-code dates answer it through
 * {@link makeValidityCheck}: 45 CFR 162.1011 scopes a code set's validity to
 * the dates its maintaining organisation publishes, so "the code is in this
 * snapshot" was never the same statement as "the code was valid on the day
 * that document was produced".
 */

import { parseDocumentDate } from "./document-date.js";
import type { CodeListCompleteness, CodeListRedistribution } from "./redistribution.js";

/**
 * Metadata header attached to every bundled code-list snapshot. Surfaces
 * the snapshot's identity + provenance + freshness so consumers can
 * decide whether a stale description matters for their use case, and its
 * maintaining organisation + redistribution record so they can decide
 * whether displaying, caching or re-publishing a description is theirs to
 * do. Those last two are SEPARATE readings: who keeps the list and what
 * may be done with its text are different questions with different
 * answers, and the bundled lists really do disagree on both.
 *
 * @example
 * ```ts
 * import { CARC } from "@cosyte/x12";
 * CARC.meta.id;                        // "CARC"
 * CARC.meta.snapshotDate;              // ISO date string this snapshot was captured
 * CARC.meta.publishedDate;             // ISO date string of the underlying publication
 * CARC.meta.maintainingOrganization;   // "ASC X12"
 * CARC.meta.redistribution?.status;    // "licence-required"
 * CARC.meta.completeness;              // "cited-subset"
 * ```
 */
export interface CodeListMeta {
  readonly id: string;
  readonly description: string;
  readonly source: string;
  readonly publishedDate: string;
  readonly snapshotDate: string;
  readonly note?: string;
  /**
   * Who maintains the published list, read off a source carried for this
   * package. `undefined` means the list carries NO maintainer at all, which
   * snapshot validation refuses rather than tolerates: a list nobody is
   * recorded as maintaining is a list nobody can be asked about.
   */
  readonly maintainingOrganization: string | undefined;
  /**
   * What may be done with this list's descriptions, and whom to approach
   * where the answer is not "anything". `undefined` means the list carries no
   * record at all, which snapshot validation refuses. An unsettled question
   * is recorded as `status: "not-established"` instead, which IS a record.
   */
  readonly redistribution: CodeListRedistribution | undefined;
  /**
   * Whether `codes` is the complete published list or a cited part of it, so a
   * code this package does not know can be told from a code the publisher
   * never issued.
   */
  readonly completeness: CodeListCompleteness;
}

/**
 * Whether this list's descriptions may be regenerated and redistributed, read
 * off its own record and nothing else. Only a recorded `"permitted"` answers
 * `true`: a licence requirement, an unsettled status and a missing record all
 * answer `false`, so a permission is never inferred from an absence.
 *
 * Exported so a consumer applies the same bar this package applies to itself,
 * rather than re-deriving one from the status string.
 *
 * @example
 * ```ts
 * import { CARC, RARC, codeListRedistributionIsPermitted } from "@cosyte/x12";
 * codeListRedistributionIsPermitted(RARC.meta); // true  (CMS, no licence)
 * codeListRedistributionIsPermitted(CARC.meta); // false (X12, licence required)
 * ```
 */
export function codeListRedistributionIsPermitted(meta: CodeListMeta): boolean {
  return meta.redistribution?.status === "permitted";
}

/**
 * The dates a code-list maintainer publishes for ONE code, as ISO-8601
 * calendar days in `YYYY-MM-DD` form. `start` is the first day the code was
 * valid, `stop` the FIRST day it is no longer valid (the interval is
 * half-open, and `KNOWN-LIMITATIONS.md` records why this package reads the
 * published Stop date that way), and `lastModified` the day its description
 * last changed.
 *
 * Each is absent when the maintainer publishes no such date for that code. An
 * absent `start` is the one that matters: validity on a supplied day cannot be
 * decided without it, and the answer is `indeterminate` rather than either
 * verdict.
 *
 * @example
 * ```ts
 * import { CARC } from "@cosyte/x12";
 * CARC.dates["1"]?.start;  // "1995-01-01"
 * CARC.dates["15"]?.stop;  // "2018-05-01" (deactivated code)
 * CARC.dates["1"]?.stop;   // undefined (still current)
 * ```
 */
export interface CodeListEntryDates {
  readonly start?: string;
  readonly lastModified?: string;
  readonly stop?: string;
}

/**
 * One entry returned from a code-list `lookup(code)`. The inbound code
 * value is echoed verbatim (so a caller that branches on `entry.code` is
 * comparing exactly the bytes that came in, never a normalized form);
 * `description` is the bundled human-readable text from the snapshot.
 * Future fields (`isObsolete`, `replacedBy`) are tracked by the roadmap;
 * v0.0.x snapshots ship code + description only.
 *
 * `dates` is present only on the snapshots that carry per-code dates (CARC and
 * RARC today) and only for a code that HAS one there, so an entry from a
 * snapshot without them keeps exactly the two properties it has always had.
 * Reading a description has never meant the code was valid on any particular
 * day; {@link CodeValidityResult} is where that question is answered.
 *
 * @example
 * ```ts
 * import { lookupCarc } from "@cosyte/x12";
 * const entry = lookupCarc("45");
 * entry?.code;          // "45"
 * entry?.description;   // "Charge exceeds fee schedule/maximum allowable..."
 * entry?.dates?.start;  // "1995-01-01"
 * ```
 */
export interface CodeListEntry {
  readonly code: string;
  readonly description: string;
  readonly dates?: CodeListEntryDates;
}

/**
 * A complete bundled code-list snapshot. `meta` carries provenance;
 * `codes` is a frozen plain object so consumers can iterate or build their
 * own lookups without going through the helper. Internal use prefers the
 * per-snapshot `lookup*` helpers - they return a frozen {@link
 * CodeListEntry} ergonomic for the helper APIs.
 *
 * @example
 * ```ts
 * import { CARC } from "@cosyte/x12";
 * Object.keys(CARC.codes).length;        // count of bundled CARC codes
 * CARC.codes["45"];                      // raw description string (or undefined)
 * ```
 */
export interface CodeListSnapshot {
  readonly meta: CodeListMeta;
  readonly codes: Readonly<Record<string, string>>;
}

/**
 * Provenance for a snapshot that ALSO carries per-code validity dates. The two
 * new fields are deliberately separate from `publishedDate` and
 * `snapshotDate`: those describe the DESCRIPTIONS this package bundled, and a
 * consumer has to be able to tell how fresh the validity data is without
 * inferring it from how fresh the descriptions are. The two are captured from
 * different pages on different days and neither implies the other.
 *
 * @example
 * ```ts
 * import { CARC } from "@cosyte/x12";
 * CARC.meta.snapshotDate;      // when the descriptions were captured
 * CARC.meta.datesCapturedAt;   // when the per-code validity dates were captured
 * CARC.meta.datesSource;       // the maintainer page they were read from
 * ```
 */
export interface DatedCodeListMeta extends CodeListMeta {
  /** The day the per-code dates below were read off the maintainer page. */
  readonly datesCapturedAt: string;
  /** The maintainer page URL those dates were read from. */
  readonly datesSource: string;
}

/**
 * A bundled snapshot that carries the maintainer's per-code validity dates
 * beside the descriptions. `dates` is keyed by the same code strings as
 * `codes`, and a code may be present in `codes` while absent from `dates`:
 * that means no date was published for it, never that it has none.
 *
 * @example
 * ```ts
 * import { RARC } from "@cosyte/x12";
 * RARC.codes["N4"];          // the bundled description
 * RARC.dates["N4"]?.start;   // "2000-01-01"
 * ```
 */
export interface DatedCodeListSnapshot extends CodeListSnapshot {
  readonly meta: DatedCodeListMeta;
  readonly dates: Readonly<Record<string, CodeListEntryDates>>;
}

/**
 * Deep-freeze a per-code date table: the outer map AND every record in it.
 * `Object.freeze` is shallow, so freezing only the map would leave every
 * published date writable on a shipped artifact.
 *
 * @internal - exported only for the per-snapshot modules.
 */
export function freezeCodeDates(
  dates: Readonly<Record<string, CodeListEntryDates>>,
): Readonly<Record<string, CodeListEntryDates>> {
  const frozen: Record<string, CodeListEntryDates> = {};
  for (const [code, value] of Object.entries(dates)) {
    frozen[code] = Object.freeze({ ...value });
  }
  return Object.freeze(frozen);
}

/**
 * Construct a `lookup` helper for a {@link CodeListSnapshot}. Returns
 * `undefined` for codes outside the bundled subset (which is the
 * fail-safe - the verbatim inbound code is preserved by the helper that
 * called us; only the description is unavailable).
 *
 * The parameter is the `codes` half of a snapshot rather than the whole
 * {@link CodeListSnapshot}, because the guard below reads nothing else and a
 * snapshot carrying EXTRA provenance in its `meta` must reach this same
 * hardened factory rather than growing a second copy of the `Object.hasOwn`
 * check. A `CodeListSnapshot` satisfies it unchanged.
 *
 * A {@link DatedCodeListSnapshot} satisfies it too, and its `dates` ride the
 * SAME guard: a snapshot without them returns exactly the two-property entry it
 * always did, and a code the date table does not carry gets no `dates`
 * property rather than one holding `undefined`.
 *
 * @internal - exported only for the per-snapshot modules.
 */
export function makeLookup(
  snapshot: Pick<CodeListSnapshot, "codes"> & Partial<Pick<DatedCodeListSnapshot, "dates">>,
): (code: string) => CodeListEntry | undefined {
  return (code: string): CodeListEntry | undefined => {
    // `Object.hasOwn` first, ALWAYS. `snapshot.codes` is a plain object
    // literal, `code` comes off the wire, and a literal inherits
    // `Object.prototype` - so a bare `snapshot.codes[code]` answers a
    // FUNCTION for `constructor` / `valueOf` / `toString` /
    // `hasOwnProperty` and `Object.prototype` itself for `__proto__`.
    // Measured at `a33c208`: `lookupCarc("constructor")` returned
    // `{ code: "constructor", description: <function Object> }`, so a
    // `description` typed `string` was a function on the frozen model AND
    // the caller's `entry === undefined` branch - the one that raises
    // `X12_UNKNOWN_CARC` / `X12_UNKNOWN_RARC` / the claim-status codes -
    // never ran. The guard is here, at the single factory every bundled
    // snapshot is read through, rather than at each caller: `snapshot` is
    // supplied by the caller, so this module cannot re-declare the table
    // with a null prototype the way `src/parser/lookup.ts` does.
    if (!Object.hasOwn(snapshot.codes, code)) return undefined;
    const description = snapshot.codes[code];
    if (description === undefined) return undefined;
    const dates = readOwnDates(snapshot.dates, code);
    if (dates === undefined) return Object.freeze({ code, description });
    return Object.freeze({ code, description, dates });
  };
}

/**
 * Read one code's published dates off a date table through the SAME
 * `Object.hasOwn` guard the description read uses. A date table is a plain
 * object literal for the same reason `codes` is, so a bare `dates[code]`
 * answers `Object.prototype` for `__proto__` and a function for `constructor`,
 * and a `CodeListEntryDates` typed by the compiler would then be neither.
 *
 * @internal
 */
function readOwnDates(
  dates: Readonly<Record<string, CodeListEntryDates>> | undefined,
  code: string,
): CodeListEntryDates | undefined {
  if (dates === undefined) return undefined;
  if (!Object.hasOwn(dates, code)) return undefined;
  return dates[code];
}

/**
 * The three answers to "was this code valid on that day". `not-valid` and
 * `indeterminate` are deliberately different answers: the first is a claim
 * this package can support from a published date, the second says the shipped
 * data cannot decide. A code is never reported `valid` for want of evidence.
 *
 * @example
 * ```ts
 * import { CODE_VALIDITY, checkCarcValidity } from "@cosyte/x12";
 * checkCarcValidity("15", "2026-06-27").validity === CODE_VALIDITY.NOT_VALID; // true
 * ```
 */
export const CODE_VALIDITY = {
  VALID: "valid",
  NOT_VALID: "not-valid",
  INDETERMINATE: "indeterminate",
} as const;

/**
 * String-literal union over {@link CODE_VALIDITY}. Used as
 * {@link CodeValidityResult}.`validity`.
 */
export type CodeValidity = (typeof CODE_VALIDITY)[keyof typeof CODE_VALIDITY];

/**
 * Why a validity answer came back `indeterminate`. Locked here so a consumer
 * can branch on the reason exhaustively; additions-only thereafter.
 *
 * - `code-not-in-bundled-subset` - the code is not one this package bundles, so
 *   nothing is known about it. The inbound code is still echoed verbatim.
 * - `no-published-start-date` - the code IS bundled but the maintainer publishes
 *   no start date for it, so no interval exists to test the day against.
 *
 * @example
 * ```ts
 * import { CODE_VALIDITY_REASONS, checkCarcValidity } from "@cosyte/x12";
 * checkCarcValidity("9999", "2026-06-27").reason;
 * // CODE_VALIDITY_REASONS.CODE_NOT_IN_BUNDLED_SUBSET
 * ```
 */
export const CODE_VALIDITY_REASONS = {
  CODE_NOT_IN_BUNDLED_SUBSET: "code-not-in-bundled-subset",
  NO_PUBLISHED_START_DATE: "no-published-start-date",
} as const;

/**
 * String-literal union over {@link CODE_VALIDITY_REASONS}. Used as
 * {@link CodeValidityResult}.`reason`.
 */
export type CodeValidityReason = (typeof CODE_VALIDITY_REASONS)[keyof typeof CODE_VALIDITY_REASONS];

/**
 * The answer to "was this code valid on the day this document was produced".
 *
 * `code` is the inbound value byte for byte, exactly as the lookup helpers echo
 * it, so a code outside the bundled subset is never lost on the way through.
 * `description` is `undefined` for such a code: an absent code gets no
 * description and no validity claim, only its own bytes back.
 *
 * @example
 * ```ts
 * import { checkRarcValidity } from "@cosyte/x12";
 * const answer = checkRarcValidity("N4", "20260627");
 * answer.code;         // "N4"
 * answer.documentDate; // "2026-06-27" (normalised from the wire form)
 * answer.validity;     // "valid"
 * answer.reason;       // undefined
 * ```
 */
export interface CodeValidityResult {
  /** The inbound code, byte for byte as it was supplied. */
  readonly code: string;
  /** The bundled description, or `undefined` outside the bundled subset. */
  readonly description: string | undefined;
  /** The supplied document date, normalised to `YYYY-MM-DD`. */
  readonly documentDate: string;
  /** `valid`, `not-valid` or `indeterminate`. */
  readonly validity: CodeValidity;
  /** Why the answer is `indeterminate`; `undefined` for the other two. */
  readonly reason: CodeValidityReason | undefined;
  /** The maintainer's dates for this code, where the snapshot has them. */
  readonly dates: CodeListEntryDates | undefined;
}

/**
 * Construct the date-aware validity query for a {@link DatedCodeListSnapshot}.
 *
 * It reads membership through {@link makeLookup}'s guard rather than a second
 * copy of it, so a prototype key is an absent code on this path exactly as it
 * is on the lookup path. The rules, with `D` the supplied day, `S` the code's
 * start and `T` its stop:
 *
 * - `valid` when `S` is known, `D >= S`, and either no `T` is known or `D < T`.
 * - `not-valid` when `S` is known and `D < S`, or `T` is known and `D >= T`.
 * - `indeterminate` when the code is outside the bundled subset, or is inside
 *   it with no `S` published.
 *
 * Comparison is lexicographic over `YYYY-MM-DD`, which IS calendar order for
 * that form, so no `Date` is constructed and no timezone is ever guessed.
 *
 * @internal - exported only for the per-snapshot modules.
 */
export function makeValidityCheck(
  snapshot: Pick<DatedCodeListSnapshot, "codes" | "dates">,
): (code: string, documentDate: string) => CodeValidityResult {
  const lookup = makeLookup(snapshot);
  return (code: string, documentDate: string): CodeValidityResult => {
    // The date is checked FIRST, so a malformed one is refused whatever the
    // code is. A caller who cannot state the day cannot get an answer about it.
    const day = parseDocumentDate(documentDate);
    const entry = lookup(code);
    if (entry === undefined) {
      return Object.freeze({
        code,
        description: undefined,
        documentDate: day,
        validity: CODE_VALIDITY.INDETERMINATE,
        reason: CODE_VALIDITY_REASONS.CODE_NOT_IN_BUNDLED_SUBSET,
        dates: undefined,
      });
    }
    const dates = entry.dates;
    const start = dates?.start;
    if (start === undefined) {
      return Object.freeze({
        code: entry.code,
        description: entry.description,
        documentDate: day,
        validity: CODE_VALIDITY.INDETERMINATE,
        reason: CODE_VALIDITY_REASONS.NO_PUBLISHED_START_DATE,
        dates,
      });
    }
    const stop = dates?.stop;
    const inInterval = day >= start && (stop === undefined || day < stop);
    return Object.freeze({
      code: entry.code,
      description: entry.description,
      documentDate: day,
      validity: inInterval ? CODE_VALIDITY.VALID : CODE_VALIDITY.NOT_VALID,
      reason: undefined,
      dates,
    });
  };
}
