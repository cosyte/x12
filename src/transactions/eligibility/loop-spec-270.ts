/**
 * 270 TR3 `005010X279A1` loop specification - authored through the **public**
 * {@link "../../loops/define.js".defineLoopSpec} API, exactly as the 271's is.
 * That is the dogfooding gate: the built-in 270 hierarchy goes through the
 * SAME factory a consumer uses for a payer-specific companion-guide loop, so a
 * regression in `defineLoopSpec` cannot hide from the built-in reader.
 *
 * Hierarchy (per WPC TR3 section 1.4.2; the request tree the 271's response
 * tree mirrors):
 *
 * ```text
 *  Header (ST, BHT)
 *  Loop 2000A - Information Source HL (HL*..*20)        - required, max >1
 *    Loop 2100A - Information Source Name (NM1*PR)      - required, max 1
 *  Loop 2000B - Information Receiver HL (HL*..*21)      - required, max >1
 *    Loop 2100B - Information Receiver Name (NM1*1P)    - required, max 1
 *  Loop 2000C - Subscriber HL (HL*..*22)                - required, max >1
 *    TRN  (Subscriber Trace - the 271 echoes it back)   - situational, max >1
 *    Loop 2100C - Subscriber Name (NM1*IL) + REF/N3/N4/DMG/INS/DTP
 *      Loop 2110C - Subscriber Eligibility Inquiry      - situational, max >1
 *        EQ  AMT  III  REF  DTP
 *  Loop 2000D - Dependent HL (HL*..*23)                 - situational, max >1
 *    TRN
 *    Loop 2100D - Dependent Name (NM1*03) + REF/N3/N4/DMG/INS/DTP
 *      Loop 2110D - Dependent Eligibility Inquiry       - situational, max >1
 * ```
 *
 * @remarks
 * The spec is a frozen artifact a consumer can read and assert against their
 * companion guide. The walker in `./get-270.ts` consults the HL level codes;
 * Loops 2110C and 2110D share one EQ-anchored shape, so a single
 * {@link INQUIRY_270_LOOP_2110} is reused under both name loops.
 */

import { defineLoopSpec } from "../../loops/define.js";
import type { LoopSpec } from "../../loops/types.js";

/**
 * 270 Loop 2110 - Eligibility or Benefit Inquiry. Triggered by `EQ`. Reused
 * under both the subscriber (2110C) and dependent (2110D) name loops: the
 * segment shape is identical.
 *
 * @example
 * ```ts
 * import { INQUIRY_270_LOOP_2110 } from "@cosyte/x12";
 * INQUIRY_270_LOOP_2110.trigger; // "EQ"
 * ```
 */
export const INQUIRY_270_LOOP_2110: LoopSpec = defineLoopSpec({
  id: "2110",
  description: "270 Loop 2110C/D - Eligibility or Benefit Inquiry",
  trigger: "EQ",
  segments: [
    { id: "EQ", usage: "required", max: 1 },
    { id: "AMT", usage: "situational", max: ">1" },
    { id: "III", usage: "situational", max: ">1" },
    { id: "REF", usage: "situational", max: ">1" },
    { id: "DTP", usage: "situational", max: ">1" },
  ],
});

/**
 * 270 Loop 2100C - Subscriber Name. Triggered by `NM1` (`NM1-01 = "IL"`); the
 * qualifier check happens in the walker, not the spec. Nests
 * {@link INQUIRY_270_LOOP_2110}.
 *
 * @example
 * ```ts
 * import { INQUIRY_270_LOOP_2100C } from "@cosyte/x12";
 * INQUIRY_270_LOOP_2100C.children[0]?.trigger; // "EQ"
 * ```
 */
export const INQUIRY_270_LOOP_2100C: LoopSpec = defineLoopSpec({
  id: "2100C",
  description: "270 Loop 2100C - Subscriber Name",
  trigger: "NM1",
  segments: [
    { id: "NM1", usage: "required", max: 1 },
    { id: "REF", usage: "situational", max: ">1" },
    { id: "N3", usage: "situational", max: ">1" },
    { id: "N4", usage: "situational", max: 1 },
    { id: "DMG", usage: "situational", max: 1 },
    { id: "INS", usage: "situational", max: 1 },
    { id: "DTP", usage: "situational", max: ">1" },
  ],
  children: [INQUIRY_270_LOOP_2110],
});

/**
 * 270 Loop 2100D - Dependent Name. Triggered by `NM1` (`NM1-01 = "03"`). Same
 * shape as 2100C; nests {@link INQUIRY_270_LOOP_2110}.
 *
 * @example
 * ```ts
 * import { INQUIRY_270_LOOP_2100D } from "@cosyte/x12";
 * INQUIRY_270_LOOP_2100D.id; // "2100D"
 * ```
 */
export const INQUIRY_270_LOOP_2100D: LoopSpec = defineLoopSpec({
  id: "2100D",
  description: "270 Loop 2100D - Dependent Name",
  trigger: "NM1",
  segments: [
    { id: "NM1", usage: "required", max: 1 },
    { id: "REF", usage: "situational", max: ">1" },
    { id: "N3", usage: "situational", max: ">1" },
    { id: "N4", usage: "situational", max: 1 },
    { id: "DMG", usage: "situational", max: 1 },
    { id: "INS", usage: "situational", max: 1 },
    { id: "DTP", usage: "situational", max: ">1" },
  ],
  children: [INQUIRY_270_LOOP_2110],
});

/**
 * 270 Loop 2000A - Information Source HL (the payer being asked). Triggered
 * by `HL` (`HL-03 = "20"`); the level-code check happens in the walker.
 *
 * @example
 * ```ts
 * import { INQUIRY_270_LOOP_2000A } from "@cosyte/x12";
 * INQUIRY_270_LOOP_2000A.trigger; // "HL"
 * ```
 */
export const INQUIRY_270_LOOP_2000A: LoopSpec = defineLoopSpec({
  id: "2000A",
  description: "270 Loop 2000A - Information Source HL",
  trigger: "HL",
  segments: [
    { id: "HL", usage: "required", max: 1 },
    { id: "NM1", usage: "required", max: 1 },
    { id: "PER", usage: "situational", max: ">1" },
    { id: "AAA", usage: "situational", max: ">1" },
  ],
});

/**
 * 270 Loop 2000B - Information Receiver HL (the provider asking). Triggered
 * by `HL` (`HL-03 = "21"`).
 *
 * @example
 * ```ts
 * import { INQUIRY_270_LOOP_2000B } from "@cosyte/x12";
 * INQUIRY_270_LOOP_2000B.id; // "2000B"
 * ```
 */
export const INQUIRY_270_LOOP_2000B: LoopSpec = defineLoopSpec({
  id: "2000B",
  description: "270 Loop 2000B - Information Receiver HL",
  trigger: "HL",
  segments: [
    { id: "HL", usage: "required", max: 1 },
    { id: "NM1", usage: "required", max: 1 },
    { id: "REF", usage: "situational", max: ">1" },
    { id: "N3", usage: "situational", max: ">1" },
    { id: "N4", usage: "situational", max: 1 },
    { id: "PER", usage: "situational", max: ">1" },
    { id: "PRV", usage: "situational", max: 1 },
  ],
});

/**
 * 270 Loop 2000C - Subscriber HL. Triggered by `HL` (`HL-03 = "22"`). Carries
 * the TRN traces a 271 must echo back and nests
 * {@link INQUIRY_270_LOOP_2100C}.
 *
 * @example
 * ```ts
 * import { INQUIRY_270_LOOP_2000C } from "@cosyte/x12";
 * INQUIRY_270_LOOP_2000C.children[0]?.id; // "2100C"
 * ```
 */
export const INQUIRY_270_LOOP_2000C: LoopSpec = defineLoopSpec({
  id: "2000C",
  description: "270 Loop 2000C - Subscriber HL",
  trigger: "HL",
  segments: [
    { id: "HL", usage: "required", max: 1 },
    { id: "TRN", usage: "situational", max: ">1" },
  ],
  children: [INQUIRY_270_LOOP_2100C],
});

/**
 * 270 Loop 2000D - Dependent HL. Triggered by `HL` (`HL-03 = "23"`). Carries
 * the dependent's own TRN traces and nests {@link INQUIRY_270_LOOP_2100D}.
 *
 * @example
 * ```ts
 * import { INQUIRY_270_LOOP_2000D } from "@cosyte/x12";
 * INQUIRY_270_LOOP_2000D.id; // "2000D"
 * ```
 */
export const INQUIRY_270_LOOP_2000D: LoopSpec = defineLoopSpec({
  id: "2000D",
  description: "270 Loop 2000D - Dependent HL",
  trigger: "HL",
  segments: [
    { id: "HL", usage: "required", max: 1 },
    { id: "TRN", usage: "situational", max: ">1" },
  ],
  children: [INQUIRY_270_LOOP_2100D],
});
