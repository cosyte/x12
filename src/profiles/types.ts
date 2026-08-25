/**
 * Type definitions for the `@cosyte/x12` profile subsystem.
 *
 * A profile captures **trading-partner / companion-guide deviations** as
 * typed, documented, fixture-grounded data - never silent leniency. It
 * mirrors the `@cosyte/hl7` `defineProfile` shape, adapted to X12's reality:
 * the deviations X12 senders exhibit are not custom Z-segments + date
 * formats (the HL7 axes) but extra REF segments, alternate delimiters, and
 * payer-specific envelope conventions.
 *
 * **Hard rule (locked, matches hl7 + ccda):** every {@link X12ProfileQuirk}
 * MUST cite a real Tier-2 `fixture` that demonstrates the deviation. There
 * are no invented quirks - the `fixture` field is required at the type level
 * and verified by the accuracy test (`test/profiles-builtins.test.ts`),
 * which parses each cited fixture and asserts it actually exhibits the
 * claimed deviation.
 *
 * **What a profile does (v1).** The lenient parser already absorbs every
 * corpus deviation losslessly (zero warnings). So a v1 profile is
 * **descriptive + expectation-tagging**, not parse-altering: it (a)
 * documents the deviations via {@link X12Profile.describe}, (b) attaches to
 * the parse result for attribution (`ix.profile`), and (c) partitions a
 * parse's warnings into expected-vs-unexpected via the union of each quirk's
 * `expectedWarnings` (see `partitionWarnings`). A profile NEVER silently
 * swallows data - that is the whole point of making the deviation explicit.
 */

import type { X12WarningCode } from "../parser/warnings.js";

/**
 * The bucket a quirk falls into when rendered by {@link X12Profile.describe}.
 * Mirrors the roadmap's "what this profile relaxes / adds / requires"
 * framing.
 *
 * - `relaxes` - the partner tolerates / emits a structural variation the
 *   strict 005010 baseline would flag (e.g. an alternate component
 *   delimiter).
 * - `adds` - the partner emits extra spec-optional content (e.g. additional
 *   REF segments) a generic consumer might not expect.
 * - `requires` - the partner mandates a normally-situational element be
 *   present.
 *
 * @example
 * ```ts
 * import type { X12ProfileEffect } from "@cosyte/x12";
 * const effect: X12ProfileEffect = "adds";
 * ```
 */
export type X12ProfileEffect = "relaxes" | "adds" | "requires";

/**
 * Whether the deviation a quirk describes is one a trading partner may
 * LAWFULLY require. The axis is 45 CFR 162.915, which forbids a covered
 * entity from entering a trading partner agreement that would change the
 * definition, data condition or use of a data element or segment in a
 * standard, add data elements or segments to the maximum defined data set,
 * use any code or data element marked "not used" in (or absent from) the
 * standard's implementation specification, or change the meaning or intent
 * of that implementation specification.
 *
 * The three states, and what each one does and does not claim:
 *
 * - `permitted` - a recorded judgement that none of 162.915(a) to (d) is
 *   engaged, so a partner may lawfully require the deviation. It is a
 *   statement about the RULE, never a promise that your partner's guide is
 *   correct in any other respect.
 * - `not-permitted` - a recorded judgement that the deviation is one 162.915
 *   forbids a partner from requiring. The profile still describes it, because
 *   describing what a partner SENDS is exactly what a profile is for; the
 *   classification says the partner is deviating from the adopted standard
 *   rather than that the standard supports the requirement.
 * - `undetermined` - NO judgement was recorded, or the recorded value was not
 *   one of the two above. This is the fail-safe default, and it is the value
 *   you get for any quirk that says nothing. Read it as "this library makes no
 *   claim", never as "permitted".
 *
 * **Every one of these is a recorded human judgement, not a check this library
 * performed.** In particular, whether an element is marked "not used" in an
 * adopted implementation specification is not machine-checkable here: 45 CFR
 * 162.920(a) states a fee is charged for those specifications, and none is
 * bundled with this package. A classification that rests on such a marking
 * rests on someone having read the guide and written the answer down. Treat it
 * as documentation, and confirm it against your own copy of the guide before
 * you rely on it. `KNOWN-LIMITATIONS.md` carries the same caveat for consumers
 * who never open this type.
 *
 * @example
 * ```ts
 * import type { X12ProfileConformance } from "@cosyte/x12";
 * const c: X12ProfileConformance = "undetermined";
 * ```
 */
export type X12ProfileConformance = "permitted" | "not-permitted" | "undetermined";

/**
 * A single trading-partner deviation captured by a profile. Every quirk is
 * fixture-grounded: `fixture` points at a real Tier-2 corpus file that
 * demonstrates the deviation, and `sourceCategory` records where the quirk
 * was observed. This is the locked hard rule - a quirk without a
 * demonstrating fixture is forbidden, enforced both by this required field
 * and by the accuracy test.
 *
 * @example
 * ```ts
 * import type { X12ProfileQuirk } from "@cosyte/x12";
 * const quirk: X12ProfileQuirk = {
 *   id: "payer-loop-ref-2u",
 *   effect: "adds",
 *   summary: "Payer Loop 1000A carries a REF*2U additional payer identifier.",
 *   fixture: "remit/835-availity-quirk.edi",
 *   sourceCategory: "Availity 835 ERA companion guide - payer-loop REF",
 * };
 * ```
 */
export interface X12ProfileQuirk {
  /** Stable, kebab-case identifier - unique within a profile's quirk set. */
  readonly id: string;
  /** Which `describe()` bucket this quirk renders into. */
  readonly effect: X12ProfileEffect;
  /** One-line human summary. NEVER contains PHI - describes structure only. */
  readonly summary: string;
  /**
   * Path to the Tier-2 fixture demonstrating the deviation, relative to
   * `test/fixtures/` (e.g. `"remit/835-availity-quirk.edi"`). REQUIRED - the
   * locked hard rule. The accuracy test parses this file and asserts the
   * claimed deviation is present.
   */
  readonly fixture: string;
  /** Where the deviation was observed (companion guide / corpus category). */
  readonly sourceCategory: string;
  /**
   * Warning codes this quirk leads a consumer to EXPECT when the deviation
   * is present. Drives `partitionWarnings`. Often empty: the lenient parser
   * absorbs most corpus deviations with zero warnings, and that "lossless,
   * no warning" outcome is itself the documented behavior.
   */
  readonly expectedWarnings?: readonly X12WarningCode[];
  /**
   * OPTIONAL recorded judgement of whether a trading partner may lawfully
   * require this deviation under 45 CFR 162.915. Omit it and the quirk
   * renders as {@link X12ProfileConformance} `"undetermined"` - the fail-safe
   * default - so a profile written before this field existed keeps defining
   * and describing exactly as it did, and never gains a claim nobody made.
   */
  readonly conformance?: X12ProfileConformance;
}

/**
 * A quirk as {@link X12Profile.describe} RENDERS it: the authored quirk plus
 * the conformance state it resolved to. `conformance` is required here and
 * optional on {@link X12ProfileQuirk}, which is the whole difference - an
 * unrecorded judgement is rendered as `"undetermined"` rather than left
 * absent, so a reader never has to distinguish "no field" from "no claim".
 *
 * @example
 * ```ts
 * import { profiles } from "@cosyte/x12";
 * const d = profiles.bcbsCommon.describe();
 * d.relaxes[0]?.conformance; // "permitted" | "not-permitted" | "undetermined"
 * ```
 */
export interface X12ClassifiedQuirk extends X12ProfileQuirk {
  readonly conformance: X12ProfileConformance;
}

/**
 * The rendered quirks of a profile, grouped by their conformance state. Every
 * quirk appears in exactly one of the three, and the three together are the
 * profile's whole quirk set, so a consumer can ask "does this profile record
 * anything a partner may not lawfully require?" without walking the effect
 * buckets. A profile with no quirks makes no conformance claim of any kind:
 * all three are empty.
 *
 * @example
 * ```ts
 * import { profiles } from "@cosyte/x12";
 * const { notPermitted } = profiles.availity.describe().conformance;
 * notPermitted.map((q) => q.id); // quirks 45 CFR 162.915 forbids requiring
 * ```
 */
export interface X12ProfileConformancePartition {
  /** Quirks recorded as ones a partner MAY lawfully require. */
  readonly permitted: readonly X12ClassifiedQuirk[];
  /** Quirks recorded as partner deviations 162.915 forbids requiring. */
  readonly notPermitted: readonly X12ClassifiedQuirk[];
  /** Quirks with no recorded judgement. NOT a claim in either direction. */
  readonly undetermined: readonly X12ClassifiedQuirk[];
}

/**
 * Structured `describe()` output - the "what this profile relaxes / adds /
 * requires" record published with the package. Returned as DATA (not a
 * formatted string, unlike hl7) so downstream tooling - docs generators,
 * the `pathways` engine - can consume it programmatically.
 *
 * Each bucketed quirk carries the conformance state it resolved to, so a
 * consumer reading a described deviation also reads whether a partner could
 * lawfully have required it. `requires` is a record of what a partner MANDATES
 * and never a claim that the standard supports the mandate: that question is
 * answered by `conformance` alone, and its default answer is "undetermined".
 *
 * @example
 * ```ts
 * import { profiles } from "@cosyte/x12";
 * const d = profiles.availity.describe();
 * d.adds.map((q) => q.id);          // ["payer-loop-ref-2u", "service-line-ref-f8"]
 * d.adds.map((q) => q.conformance); // ["undetermined", "undetermined"]
 * d.expectedWarnings;               // readonly X12WarningCode[]
 * ```
 */
export interface X12ProfileDescription {
  readonly name: string;
  readonly description?: string;
  readonly lineage: readonly string[];
  readonly relaxes: readonly X12ClassifiedQuirk[];
  readonly adds: readonly X12ClassifiedQuirk[];
  readonly requires: readonly X12ClassifiedQuirk[];
  /** Sorted, de-duplicated union of every quirk's `expectedWarnings`. */
  readonly expectedWarnings: readonly X12WarningCode[];
  /**
   * The same quirks, grouped by conformance state instead of by effect. See
   * {@link X12ProfileConformancePartition}; the states themselves are
   * documented on {@link X12ProfileConformance}.
   */
  readonly conformance: X12ProfileConformancePartition;
}

/**
 * A readonly, frozen profile produced by `defineProfile()`. Mirrors the
 * locked hl7 `Profile` shape (name / description / lineage) plus X12's
 * `quirks` axis and a structured `describe()`.
 *
 * @example
 * ```ts
 * import { parseX12, profiles } from "@cosyte/x12";
 * const ix = parseX12(raw, { profile: profiles.availity });
 * ix.profile?.name;          // "availity"
 * ix.profile?.describe().adds.length;
 * ```
 */
export interface X12Profile {
  readonly name: string;
  readonly description?: string;
  readonly lineage: readonly string[];
  readonly quirks: readonly X12ProfileQuirk[];
  readonly describe: () => X12ProfileDescription;
}

/**
 * Input accepted by `defineProfile()`. Every field except `name` is
 * optional; `extends` composes parent profiles (lineage + quirks merge) the
 * same way hl7's `extends` does.
 *
 * @example
 * ```ts
 * import { defineProfile, profiles, type X12ProfileSpec } from "@cosyte/x12";
 * const spec: X12ProfileSpec = {
 *   name: "my-bcbs-regional",
 *   extends: profiles.bcbsCommon,
 *   quirks: [
 *     {
 *       id: "service-line-ref-f8",
 *       effect: "adds",
 *       summary: "Service line carries a REF*F8 original-reference identifier.",
 *       fixture: "remit/835-availity-quirk.edi",
 *       sourceCategory: "regional BCBS 835 companion guide",
 *     },
 *   ],
 * };
 * const profile = defineProfile(spec);
 * ```
 */
export interface X12ProfileSpec {
  readonly name: string;
  readonly description?: string;
  readonly quirks?: readonly X12ProfileQuirk[];
  readonly extends?: X12Profile | readonly X12Profile[];
}
