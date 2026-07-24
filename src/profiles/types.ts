/**
 * Type definitions for the `@cosyte/x12` profile subsystem (Phase 9).
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
}

/**
 * Structured `describe()` output - the "what this profile relaxes / adds /
 * requires" record published with the package. Returned as DATA (not a
 * formatted string, unlike hl7) so downstream tooling - docs generators,
 * the `pathways` engine - can consume it programmatically.
 *
 * @example
 * ```ts
 * import { profiles } from "@cosyte/x12";
 * const d = profiles.availity.describe();
 * d.adds.map((q) => q.id);          // ["payer-loop-ref-2u", "service-line-ref-f8"]
 * d.expectedWarnings;               // readonly X12WarningCode[]
 * ```
 */
export interface X12ProfileDescription {
  readonly name: string;
  readonly description?: string;
  readonly lineage: readonly string[];
  readonly relaxes: readonly X12ProfileQuirk[];
  readonly adds: readonly X12ProfileQuirk[];
  readonly requires: readonly X12ProfileQuirk[];
  /** Sorted, de-duplicated union of every quirk's `expectedWarnings`. */
  readonly expectedWarnings: readonly X12WarningCode[];
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
