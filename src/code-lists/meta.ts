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
 */

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
 * One entry returned from a code-list `lookup(code)`. The inbound code
 * value is echoed verbatim (so a caller that branches on `entry.code` is
 * comparing exactly the bytes that came in, never a normalized form);
 * `description` is the bundled human-readable text from the snapshot.
 * Future fields (`isObsolete`, `replacedBy`) are tracked by the roadmap;
 * v0.0.x snapshots ship code + description only.
 *
 * @example
 * ```ts
 * import { lookupCarc } from "@cosyte/x12";
 * const entry = lookupCarc("45");
 * entry?.code;        // "45"
 * entry?.description; // "Charge exceeds fee schedule/maximum allowable..."
 * ```
 */
export interface CodeListEntry {
  readonly code: string;
  readonly description: string;
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
 * @internal - exported only for the per-snapshot modules.
 */
export function makeLookup(
  snapshot: Pick<CodeListSnapshot, "codes">,
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
    return Object.freeze({ code, description });
  };
}
