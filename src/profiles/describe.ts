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
import type {
  X12ClassifiedQuirk,
  X12ProfileConformance,
  X12ProfileDescription,
  X12ProfileQuirk,
} from "./types.js";

/**
 * Local mutable-during-assembly helper - honours `exactOptionalPropertyTypes`
 * by conditionally assigning the optional `description` rather than writing
 * `description: undefined`.
 *
 * @internal
 */
type Mutable<T> = { -readonly [K in keyof T]?: T[K] };

/**
 * Resolve a quirk's recorded conformance judgement, FAIL-SAFE.
 *
 * Only the two exact literals that make a claim are honoured; everything
 * else - an absent field, `undefined`, or a value from a hand-crafted profile
 * that never went through `defineProfile`'s validation - resolves to
 * `"undetermined"`. The asymmetry is the point: the direction that would be
 * dangerous to get wrong is the one that says a trading partner may lawfully
 * require the deviation, so nothing but the literal `"permitted"` ever
 * produces it. `defineProfile` additionally REFUSES an out-of-enum value, so a
 * caller who fat-fingers one is told rather than silently downgraded; this
 * function is the second line, for profile objects that bypassed it.
 *
 * @internal
 */
function resolveConformance(quirk: X12ProfileQuirk): X12ProfileConformance {
  const recorded: unknown = quirk.conformance;
  if (recorded === "permitted") return "permitted";
  if (recorded === "not-permitted") return "not-permitted";
  return "undetermined";
}

/**
 * Render one authored quirk as the classified quirk `describe()` publishes:
 * the quirk's own fields plus the conformance state it resolved to.
 *
 * @internal
 */
function classify(quirk: X12ProfileQuirk): X12ClassifiedQuirk {
  return Object.freeze({ ...quirk, conformance: resolveConformance(quirk) });
}

/**
 * Assemble the structured description from a fully-merged profile. Buckets
 * quirks by `effect` in their merged order, and independently by conformance
 * state; `expectedWarnings` is the sorted, de-duplicated union across all
 * quirks. Every quirk is rendered through {@link classify}, so every quirk on
 * the record states a conformance state and none is left silent.
 *
 * @internal
 */
export function buildDescribe(profile: {
  readonly name: string;
  readonly description?: string;
  readonly lineage: readonly string[];
  readonly quirks: readonly X12ProfileQuirk[];
}): X12ProfileDescription {
  const relaxes: X12ClassifiedQuirk[] = [];
  const adds: X12ClassifiedQuirk[] = [];
  const requires: X12ClassifiedQuirk[] = [];
  const permitted: X12ClassifiedQuirk[] = [];
  const notPermitted: X12ClassifiedQuirk[] = [];
  const undetermined: X12ClassifiedQuirk[] = [];
  for (const authored of profile.quirks) {
    const q = classify(authored);
    if (q.effect === "relaxes") relaxes.push(q);
    else if (q.effect === "adds") adds.push(q);
    else requires.push(q);
    if (q.conformance === "permitted") permitted.push(q);
    else if (q.conformance === "not-permitted") notPermitted.push(q);
    else undetermined.push(q);
  }
  const out: Mutable<X12ProfileDescription> = {
    name: profile.name,
    lineage: profile.lineage,
    relaxes: Object.freeze(relaxes),
    adds: Object.freeze(adds),
    requires: Object.freeze(requires),
    expectedWarnings: collectExpectedWarnings(profile.quirks),
    conformance: Object.freeze({
      permitted: Object.freeze(permitted),
      notPermitted: Object.freeze(notPermitted),
      undetermined: Object.freeze(undetermined),
    }),
  };
  if (profile.description !== undefined) out.description = profile.description;
  return Object.freeze(out) as X12ProfileDescription;
}
