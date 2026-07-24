/**
 * Shared types for bundled X12 code-list snapshots. Every snapshot is a
 * **versioned data artifact** (not a runtime fetch) - `meta.snapshotDate`
 * is the date this package captured the list; `meta.publishedDate` is the
 * WPC / X12 / CMS publication date the snapshot reflects.
 *
 * Snapshots are deliberately tiny in v0.0.x - pre-launch initial subsets
 * covering only the codes already exercised by the parser's Tier-1 + Tier-2
 * fixtures. The Phase 10 `pnpm refresh:code-lists` script will regenerate
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

/**
 * Metadata header attached to every bundled code-list snapshot. Surfaces
 * the snapshot's identity + provenance + freshness so consumers can
 * decide whether a stale description matters for their use case.
 *
 * @example
 * ```ts
 * import { CARC } from "@cosyte/x12";
 * CARC.meta.id;             // "CARC"
 * CARC.meta.snapshotDate;   // ISO date string this snapshot was captured
 * CARC.meta.publishedDate;  // ISO date string of the underlying WPC publication
 * ```
 */
export interface CodeListMeta {
  readonly id: string;
  readonly description: string;
  readonly source: string;
  readonly publishedDate: string;
  readonly snapshotDate: string;
  readonly note?: string;
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
 * @internal - exported only for the per-snapshot modules.
 */
export function makeLookup(
  snapshot: CodeListSnapshot,
): (code: string) => CodeListEntry | undefined {
  return (code: string): CodeListEntry | undefined => {
    const description = snapshot.codes[code];
    if (description === undefined) return undefined;
    return Object.freeze({ code, description });
  };
}
