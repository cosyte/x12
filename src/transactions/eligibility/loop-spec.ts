/**
 * 271 TR3 `005010X279A1` loop specification - authored through the
 * **public** {@link "../../loops/define.js".defineLoopSpec} API. This is
 * the Phase 6 dogfooding gate: the built-in 271 loop hierarchy goes
 * through the SAME factory consumers use for payer-specific companion-
 * guide loops, so a regression in `defineLoopSpec` cannot hide from the
 * built-in extractor.
 *
 * Hierarchy (per WPC TR3 §1.4.2, the HL tree mirrors the 270 request):
 *
 * ```text
 *  Header (ST, BHT)
 *  Loop 2000A - Information Source HL (HL*..*20)        - required, max >1
 *    Loop 2100A - Information Source Name (NM1*PR)       - required, max 1
 *  Loop 2000B - Information Receiver HL (HL*..*21)       - required, max >1
 *    Loop 2100B - Information Receiver Name (NM1*1P)      - required, max 1
 *  Loop 2000C - Subscriber HL (HL*..*22)                - required, max >1
 *    TRN  (Subscriber Trace - echoed verbatim from 270)  - situational, max >1
 *    Loop 2100C - Subscriber Name (NM1*IL) + REF/N3/N4/DMG/DTP
 *      Loop 2110C - Subscriber Eligibility / Benefit     - situational, max >1
 *        EB  HSD  REF  DTP  MSG  III  (Loop 2120C NM1)
 *  Loop 2000D - Dependent HL (HL*..*23)                 - situational, max >1
 *    TRN
 *    Loop 2100D - Dependent Name (NM1*03) + REF/N3/N4/DMG/DTP
 *      Loop 2110D - Dependent Eligibility / Benefit      - situational, max >1
 * ```
 *
 * @remarks
 * Phase 6 surfaces the loop spec as a frozen artifact (consumers can read
 * it and assert it matches their companion-guide expectations); the walker
 * in `./get-271.ts` consults the HL level codes to guide its state
 * machine. Loop 2110C and 2110D share the identical EB-anchored shape - a
 * single {@link ELIGIBILITY_271_LOOP_2110} spec is reused under both the
 * subscriber and dependent name loops.
 */

import { defineLoopSpec } from "../../loops/define.js";
import type { LoopSpec } from "../../loops/types.js";

/**
 * 271 Loop 2110 - Eligibility or Benefit Information. Triggered by `EB`.
 * Reused under both the subscriber (2110C) and dependent (2110D) name
 * loops - the segment shape is identical.
 *
 * @example
 * ```ts
 * import { ELIGIBILITY_271_LOOP_2110 } from "@cosyte/x12";
 * ELIGIBILITY_271_LOOP_2110.trigger; // "EB"
 * ```
 */
export const ELIGIBILITY_271_LOOP_2110: LoopSpec = defineLoopSpec({
  id: "2110",
  description: "271 Loop 2110C/D - Eligibility or Benefit Information",
  trigger: "EB",
  segments: [
    { id: "EB", usage: "required", max: 1 },
    { id: "HSD", usage: "situational", max: ">1" },
    { id: "REF", usage: "situational", max: ">1" },
    { id: "DTP", usage: "situational", max: ">1" },
    { id: "MSG", usage: "situational", max: ">1" },
    { id: "III", usage: "situational", max: ">1" },
    { id: "NM1", usage: "situational", max: ">1" },
  ],
});

/**
 * 271 Loop 2100C - Subscriber Name. Triggered by `NM1` (`NM1-01 = "IL"`);
 * the qualifier check happens in the walker, not the spec. Nests
 * {@link ELIGIBILITY_271_LOOP_2110}.
 *
 * @example
 * ```ts
 * import { ELIGIBILITY_271_LOOP_2100C } from "@cosyte/x12";
 * ELIGIBILITY_271_LOOP_2100C.children[0]?.trigger; // "EB"
 * ```
 */
export const ELIGIBILITY_271_LOOP_2100C: LoopSpec = defineLoopSpec({
  id: "2100C",
  description: "271 Loop 2100C - Subscriber Name",
  trigger: "NM1",
  segments: [
    { id: "NM1", usage: "required", max: 1 },
    { id: "REF", usage: "situational", max: ">1" },
    { id: "N3", usage: "situational", max: ">1" },
    { id: "N4", usage: "situational", max: 1 },
    { id: "DMG", usage: "situational", max: 1 },
    { id: "DTP", usage: "situational", max: ">1" },
  ],
  children: [ELIGIBILITY_271_LOOP_2110],
});

/**
 * 271 Loop 2100D - Dependent Name. Triggered by `NM1` (`NM1-01 = "03"`).
 * Same shape as 2100C; nests {@link ELIGIBILITY_271_LOOP_2110}.
 *
 * @example
 * ```ts
 * import { ELIGIBILITY_271_LOOP_2100D } from "@cosyte/x12";
 * ELIGIBILITY_271_LOOP_2100D.id; // "2100D"
 * ```
 */
export const ELIGIBILITY_271_LOOP_2100D: LoopSpec = defineLoopSpec({
  id: "2100D",
  description: "271 Loop 2100D - Dependent Name",
  trigger: "NM1",
  segments: [
    { id: "NM1", usage: "required", max: 1 },
    { id: "REF", usage: "situational", max: ">1" },
    { id: "N3", usage: "situational", max: ">1" },
    { id: "N4", usage: "situational", max: 1 },
    { id: "DMG", usage: "situational", max: 1 },
    { id: "DTP", usage: "situational", max: ">1" },
  ],
  children: [ELIGIBILITY_271_LOOP_2110],
});

/**
 * 271 Loop 2000A - Information Source HL (payer). Triggered by `HL`
 * (`HL-03 = "20"`); the level-code check happens in the walker. Nests the
 * Loop 2100A payer name.
 *
 * @example
 * ```ts
 * import { ELIGIBILITY_271_LOOP_2000A } from "@cosyte/x12";
 * ELIGIBILITY_271_LOOP_2000A.trigger; // "HL"
 * ```
 */
export const ELIGIBILITY_271_LOOP_2000A: LoopSpec = defineLoopSpec({
  id: "2000A",
  description: "271 Loop 2000A - Information Source HL",
  trigger: "HL",
  segments: [
    { id: "HL", usage: "required", max: 1 },
    { id: "NM1", usage: "required", max: 1 },
    { id: "PER", usage: "situational", max: ">1" },
    { id: "AAA", usage: "situational", max: ">1" },
  ],
});

/**
 * 271 Loop 2000B - Information Receiver HL (provider). Triggered by `HL`
 * (`HL-03 = "21"`). Carries the receiver NM1 + optional REF/N3/N4/PER and
 * request-validation AAA segments.
 *
 * @example
 * ```ts
 * import { ELIGIBILITY_271_LOOP_2000B } from "@cosyte/x12";
 * ELIGIBILITY_271_LOOP_2000B.id; // "2000B"
 * ```
 */
export const ELIGIBILITY_271_LOOP_2000B: LoopSpec = defineLoopSpec({
  id: "2000B",
  description: "271 Loop 2000B - Information Receiver HL",
  trigger: "HL",
  segments: [
    { id: "HL", usage: "required", max: 1 },
    { id: "NM1", usage: "required", max: 1 },
    { id: "REF", usage: "situational", max: ">1" },
    { id: "N3", usage: "situational", max: ">1" },
    { id: "N4", usage: "situational", max: 1 },
    { id: "PER", usage: "situational", max: ">1" },
    { id: "AAA", usage: "situational", max: ">1" },
  ],
});

/**
 * 271 Loop 2000C - Subscriber HL. Triggered by `HL` (`HL-03 = "22"`).
 * Carries the echoed subscriber TRN traces and nests
 * {@link ELIGIBILITY_271_LOOP_2100C}.
 *
 * @example
 * ```ts
 * import { ELIGIBILITY_271_LOOP_2000C } from "@cosyte/x12";
 * ELIGIBILITY_271_LOOP_2000C.children[0]?.id; // "2100C"
 * ```
 */
export const ELIGIBILITY_271_LOOP_2000C: LoopSpec = defineLoopSpec({
  id: "2000C",
  description: "271 Loop 2000C - Subscriber HL",
  trigger: "HL",
  segments: [
    { id: "HL", usage: "required", max: 1 },
    { id: "TRN", usage: "situational", max: ">1" },
  ],
  children: [ELIGIBILITY_271_LOOP_2100C],
});

/**
 * 271 Loop 2000D - Dependent HL. Triggered by `HL` (`HL-03 = "23"`).
 * Carries the echoed dependent TRN traces and nests
 * {@link ELIGIBILITY_271_LOOP_2100D}.
 *
 * @example
 * ```ts
 * import { ELIGIBILITY_271_LOOP_2000D } from "@cosyte/x12";
 * ELIGIBILITY_271_LOOP_2000D.id; // "2000D"
 * ```
 */
export const ELIGIBILITY_271_LOOP_2000D: LoopSpec = defineLoopSpec({
  id: "2000D",
  description: "271 Loop 2000D - Dependent HL",
  trigger: "HL",
  segments: [
    { id: "HL", usage: "required", max: 1 },
    { id: "TRN", usage: "situational", max: ">1" },
  ],
  children: [ELIGIBILITY_271_LOOP_2100D],
});
