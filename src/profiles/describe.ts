/**
 * Build the structured {@link "./types.js".X12ProfileDescription} returned
 * by `profile.describe()`. Unlike hl7 (which returns a formatted multi-line
 * string), x12 returns DATA - the "relaxes / adds / requires" buckets plus
 * the union of expected warnings - so downstream tooling can consume it
 * programmatically. This record is published with the package.
 *
 * @internal
 */

import { collectExpectedWarnings } from "./validate.js";
import type { X12ProfileDescription, X12ProfileQuirk } from "./types.js";

/**
 * Local mutable-during-assembly helper - honours `exactOptionalPropertyTypes`
 * by conditionally assigning the optional `description` rather than writing
 * `description: undefined`.
 *
 * @internal
 */
type Mutable<T> = { -readonly [K in keyof T]?: T[K] };

/**
 * Assemble the structured description from a fully-merged profile. Buckets
 * quirks by `effect` in their merged order; `expectedWarnings` is the
 * sorted, de-duplicated union across all quirks.
 *
 * @internal
 */
export function buildDescribe(profile: {
  readonly name: string;
  readonly description?: string;
  readonly lineage: readonly string[];
  readonly quirks: readonly X12ProfileQuirk[];
}): X12ProfileDescription {
  const relaxes: X12ProfileQuirk[] = [];
  const adds: X12ProfileQuirk[] = [];
  const requires: X12ProfileQuirk[] = [];
  for (const q of profile.quirks) {
    if (q.effect === "relaxes") relaxes.push(q);
    else if (q.effect === "adds") adds.push(q);
    else requires.push(q);
  }
  const out: Mutable<X12ProfileDescription> = {
    name: profile.name,
    lineage: profile.lineage,
    relaxes: Object.freeze(relaxes),
    adds: Object.freeze(adds),
    requires: Object.freeze(requires),
    expectedWarnings: collectExpectedWarnings(profile.quirks),
  };
  if (profile.description !== undefined) out.description = profile.description;
  return Object.freeze(out) as X12ProfileDescription;
}
