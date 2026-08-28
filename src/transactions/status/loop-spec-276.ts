/**
 * 276 Health Care Claim Status Request loop specification - authored through
 * the **public** {@link "../../loops/define.js".defineLoopSpec} API, exactly as
 * the 277 and 270 specs are. That is the dogfooding gate: the built-in 276
 * hierarchy goes through the SAME factory a consumer uses for a payer-specific
 * companion-guide loop, so a regression in `defineLoopSpec` cannot hide from the
 * built-in reader.
 *
 * The 276 is the REQUEST half of the `005010X212` pair whose response half is
 * the 277, and it shares that pair's HL spine (`20` Information Source → `21`
 * Information Receiver → `19` Service Provider → `22` Subscriber → `23`
 * Dependent). `./loop-spec.ts` documents the same spine for the response, and
 * it is the structural authority this file mirrors: one spine, two directions.
 *
 * Hierarchy:
 *
 * ```text
 *  Header (ST, BHT)
 *  Loop 2000A - Information Source HL (HL*..*20)
 *    Loop 2100A - Payer Name (NM1*PR)
 *  Loop 2000B - Information Receiver HL (HL*..*21)
 *    Loop 2100B - Information Receiver Name (NM1*41)
 *  Loop 2000C - Service Provider HL (HL*..*19)
 *    Loop 2100C - Provider Name (NM1*1P)
 *  Loop 2000D - Subscriber HL (HL*..*22)
 *    Loop 2100D - Subscriber Name (NM1*IL) + DMG
 *      Loop 2200D - Claim Submitter Trace Number  [TRN REF AMT DTP]
 *        Loop 2210D - Service Line Information    [SVC REF DTP]
 *  Loop 2000E - Dependent HL (HL*..*23)
 *    Loop 2100E - Dependent Name (NM1*QC) + DMG
 *      Loop 2200E - Claim Submitter Trace Number + Loop 2210E
 * ```
 *
 * @remarks
 * The loop spec is surfaced as a frozen artifact; the walker in `./get-276.ts`
 * keys off the HL level codes and the TRN / SVC triggers. Loop 2200 (the claim
 * a submitter is asking about) and Loop 2210 (its service lines) are shared
 * across the subscriber and dependent branches - one spec each, reused, the way
 * the 277's 2200 / 2220 pair is.
 *
 * **Where the two directions differ, and it is the service-line loop id.** The
 * response nests its service-line status at Loop 2220 and the request nests its
 * service-line inquiry at Loop 2210; the claim loop is 2200 in both. The ids
 * here are the request's own.
 */

import { defineLoopSpec } from "../../loops/define.js";
import type { LoopSpec } from "../../loops/types.js";

/**
 * 276 Loop 2210 - Service Line Information. Triggered by `SVC`. Reused under
 * both the subscriber (2210D) and dependent (2210E) claim loops.
 *
 * @example
 * ```ts
 * import { STATUS_276_LOOP_2210 } from "@cosyte/x12";
 * STATUS_276_LOOP_2210.trigger; // "SVC"
 * ```
 */
export const STATUS_276_LOOP_2210: LoopSpec = defineLoopSpec({
  id: "2210",
  description: "276 Loop 2210D/E - Service Line Information",
  trigger: "SVC",
  segments: [
    { id: "SVC", usage: "required", max: 1 },
    { id: "REF", usage: "situational", max: ">1" },
    { id: "DTP", usage: "situational", max: ">1" },
  ],
});

/**
 * 276 Loop 2200 - Claim Submitter Trace Number, the loop that carries ONE
 * claim the submitter is asking about. Triggered by `TRN`, whose TRN-02 is the
 * value the answering 277 echoes back. Nests {@link STATUS_276_LOOP_2210}.
 *
 * @example
 * ```ts
 * import { STATUS_276_LOOP_2200 } from "@cosyte/x12";
 * STATUS_276_LOOP_2200.children[0]?.trigger; // "SVC"
 * ```
 */
export const STATUS_276_LOOP_2200: LoopSpec = defineLoopSpec({
  id: "2200",
  description: "276 Loop 2200D/E - Claim Submitter Trace Number",
  trigger: "TRN",
  segments: [
    { id: "TRN", usage: "required", max: 1 },
    { id: "REF", usage: "situational", max: ">1" },
    { id: "AMT", usage: "situational", max: ">1" },
    { id: "DTP", usage: "situational", max: ">1" },
  ],
  children: [STATUS_276_LOOP_2210],
});

/**
 * 276 Loop 2000A - Information Source HL (the payer being asked). Triggered by
 * `HL` (`HL-03 = "20"`); the level-code check happens in the walker.
 *
 * @example
 * ```ts
 * import { STATUS_276_LOOP_2000A } from "@cosyte/x12";
 * STATUS_276_LOOP_2000A.trigger; // "HL"
 * ```
 */
export const STATUS_276_LOOP_2000A: LoopSpec = defineLoopSpec({
  id: "2000A",
  description: "276 Loop 2000A - Information Source HL",
  trigger: "HL",
  segments: [
    { id: "HL", usage: "required", max: 1 },
    { id: "NM1", usage: "required", max: 1 },
  ],
});

/**
 * 276 Loop 2000B - Information Receiver HL. Triggered by `HL`
 * (`HL-03 = "21"`).
 *
 * @example
 * ```ts
 * import { STATUS_276_LOOP_2000B } from "@cosyte/x12";
 * STATUS_276_LOOP_2000B.id; // "2000B"
 * ```
 */
export const STATUS_276_LOOP_2000B: LoopSpec = defineLoopSpec({
  id: "2000B",
  description: "276 Loop 2000B - Information Receiver HL",
  trigger: "HL",
  segments: [
    { id: "HL", usage: "required", max: 1 },
    { id: "NM1", usage: "required", max: 1 },
  ],
});

/**
 * 276 Loop 2000C - Service Provider HL, the provider whose claim is being
 * asked about. Triggered by `HL` (`HL-03 = "19"`).
 *
 * @example
 * ```ts
 * import { STATUS_276_LOOP_2000C } from "@cosyte/x12";
 * STATUS_276_LOOP_2000C.id; // "2000C"
 * ```
 */
export const STATUS_276_LOOP_2000C: LoopSpec = defineLoopSpec({
  id: "2000C",
  description: "276 Loop 2000C - Service Provider HL",
  trigger: "HL",
  segments: [
    { id: "HL", usage: "required", max: 1 },
    { id: "NM1", usage: "required", max: 1 },
  ],
});

/**
 * 276 Loop 2000D - Subscriber HL. Triggered by `HL` (`HL-03 = "22"`). Carries
 * the subscriber name loop, its demographics, and the claims asked about under
 * it via {@link STATUS_276_LOOP_2200}.
 *
 * @example
 * ```ts
 * import { STATUS_276_LOOP_2000D } from "@cosyte/x12";
 * STATUS_276_LOOP_2000D.children[0]?.id; // "2200"
 * ```
 */
export const STATUS_276_LOOP_2000D: LoopSpec = defineLoopSpec({
  id: "2000D",
  description: "276 Loop 2000D - Subscriber HL",
  trigger: "HL",
  segments: [
    { id: "HL", usage: "required", max: 1 },
    { id: "NM1", usage: "required", max: 1 },
    { id: "DMG", usage: "situational", max: 1 },
  ],
  children: [STATUS_276_LOOP_2200],
});

/**
 * 276 Loop 2000E - Dependent HL. Triggered by `HL` (`HL-03 = "23"`). Carries
 * the dependent's OWN name loop, demographics and claims; nothing it carries is
 * merged onto the subscriber it hangs under.
 *
 * @example
 * ```ts
 * import { STATUS_276_LOOP_2000E } from "@cosyte/x12";
 * STATUS_276_LOOP_2000E.id; // "2000E"
 * ```
 */
export const STATUS_276_LOOP_2000E: LoopSpec = defineLoopSpec({
  id: "2000E",
  description: "276 Loop 2000E - Dependent HL",
  trigger: "HL",
  segments: [
    { id: "HL", usage: "required", max: 1 },
    { id: "NM1", usage: "required", max: 1 },
    { id: "DMG", usage: "situational", max: 1 },
  ],
  children: [STATUS_276_LOOP_2200],
});
