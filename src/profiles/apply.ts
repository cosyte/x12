/**
 * `partitionWarnings()` — the one behavioural hook a v1 x12 profile carries.
 *
 * The lenient parser absorbs most corpus deviations with zero warnings, so a
 * profile is primarily descriptive. Where a deviation DOES surface a warning,
 * a profile lets a consumer separate the warnings it expects (because a known
 * partner quirk produces them) from the ones it does not — so an integration
 * can alert only on the genuinely unexpected. The split is driven by the
 * union of each quirk's `expectedWarnings` (see `describe().expectedWarnings`).
 *
 * Pure function, zero deps. NEVER mutates the input warnings.
 */

import type { X12ParseWarning } from "../parser/warnings.js";

import { collectExpectedWarnings } from "./validate.js";
import type { X12Profile } from "./types.js";

/**
 * The result of {@link partitionWarnings}: warnings split into those a
 * profile leads you to EXPECT and those it does not.
 *
 * @example
 * ```ts
 * import type { X12WarningPartition } from "@cosyte/x12";
 * declare const p: X12WarningPartition;
 * p.unexpected.length; // alert only on these
 * ```
 */
export interface X12WarningPartition {
  readonly expected: readonly X12ParseWarning[];
  readonly unexpected: readonly X12ParseWarning[];
}

/**
 * Split a parse's warnings against a profile's expected-warning union. A
 * warning whose `code` is in the profile's `expectedWarnings` lands in
 * `expected`; everything else lands in `unexpected`. Order within each bucket
 * preserves the input order.
 *
 * @example
 * ```ts
 * import { parseX12, partitionWarnings, profiles } from "@cosyte/x12";
 * const ix = parseX12(raw, { profile: profiles.availity });
 * const { expected, unexpected } = partitionWarnings(ix.warnings, profiles.availity);
 * if (unexpected.length > 0) flagForReview(unexpected);
 * ```
 */
export function partitionWarnings(
  warnings: readonly X12ParseWarning[],
  profile: X12Profile,
): X12WarningPartition {
  const expectedCodes = new Set(collectExpectedWarnings(profile.quirks));
  const expected: X12ParseWarning[] = [];
  const unexpected: X12ParseWarning[] = [];
  for (const w of warnings) {
    if (expectedCodes.has(w.code)) expected.push(w);
    else unexpected.push(w);
  }
  return Object.freeze({
    expected: Object.freeze(expected),
    unexpected: Object.freeze(unexpected),
  });
}
