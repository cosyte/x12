/**
 * `defineProfile()` — public factory for building {@link
 * "./types.js".X12Profile} objects with validation + a structured
 * `describe()` attached. Mirrors hl7's `defineProfile` flow: validate name →
 * validate keys → validate self quirks → merge `extends` → re-validate the
 * merged set → assemble + freeze.
 *
 * Zero runtime deps. Boundary freeze is top-level only (the nested
 * `quirks` / `lineage` arrays are `readonly` at the type level; frozen at
 * runtime by the merge helpers).
 */

import { buildDescribe } from "./describe.js";
import { mergeDescription, mergeLineage, mergeQuirks, normaliseParents } from "./merge.js";
import type { X12Profile, X12ProfileSpec } from "./types.js";
import { validateOptionKeys, validateProfileName, validateQuirks } from "./validate.js";

/**
 * Build a readonly {@link X12Profile} from a validated spec. Invalid input
 * throws {@link "./errors.js".X12ProfileError} with an actionable message:
 * missing/empty name, unknown option key (with a typo hint), or a quirk that
 * violates the locked hard rule (missing `fixture`, bad `effect`, unknown
 * `expectedWarnings` code).
 *
 * `extends` composes parent profiles: lineage flattens + dedupes, quirks
 * merge by id (child wins on collision, non-colliding parent quirks survive),
 * and `description` is last-wins.
 *
 * @example
 * ```ts
 * import { defineProfile } from "@cosyte/x12";
 * const availity = defineProfile({
 *   name: "availity",
 *   description: "Availity clearinghouse 835 ERA conventions",
 *   quirks: [
 *     {
 *       id: "payer-loop-ref-2u",
 *       effect: "adds",
 *       summary: "Payer Loop 1000A carries a REF*2U additional payer identifier.",
 *       fixture: "remit/835-availity-quirk.edi",
 *       sourceCategory: "Availity 835 ERA companion guide — payer-loop REF",
 *     },
 *   ],
 * });
 * availity.name;               // "availity"
 * availity.lineage;            // ["availity"]
 * availity.describe().adds;    // [{ id: "payer-loop-ref-2u", ... }]
 * ```
 */
export function defineProfile(opts: X12ProfileSpec): X12Profile {
  // Fail-fast: name first so downstream throws can name the offending profile.
  validateProfileName(opts);
  validateOptionKeys(opts);

  // Pre-merge: validate self quirks in isolation so a hard-rule violation
  // surfaces with the offending profile's own name (not the composed lineage).
  const selfQuirks = opts.quirks ?? [];
  validateQuirks(selfQuirks, opts.name);

  // Compose `extends`.
  const parents = normaliseParents(opts.extends);
  const lineage = mergeLineage(parents, opts.name);
  const quirks = mergeQuirks(parents, selfQuirks);
  const description = mergeDescription(parents, opts.description);

  // Post-merge re-validation — catches a rogue parent (a hand-crafted
  // X12Profile bypassing defineProfile whose quirks violate the rules) and
  // id collisions introduced by the merge.
  validateQuirks(quirks, opts.name);

  // exactOptionalPropertyTypes: conditionally assign optional `description`.
  type Mutable<T> = { -readonly [K in keyof T]?: T[K] };
  const profile: Mutable<X12Profile> = {
    name: opts.name,
    lineage,
    quirks,
  };
  if (description !== undefined) profile.description = description;

  // `describe()` closes over the assembled profile so it always reflects the
  // fully-merged state.
  const finalised = profile as X12Profile;
  profile.describe = () => buildDescribe(finalised);

  return Object.freeze(profile) as X12Profile;
}
