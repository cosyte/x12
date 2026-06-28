/**
 * 277 / 277CA loop specification — authored through the **public**
 * {@link "../../loops/define.js".defineLoopSpec} API (the Phase 6
 * dogfooding gate). The 277 Claim Status Response (`005010X212`) and the
 * 277CA Claim Acknowledgment (`005010X214`) share the same HL spine
 * (`20` Information Source → `21` Information Receiver → `19` Service
 * Provider → `22` Subscriber → `23` Dependent) and the same STC-anchored
 * Loop 2200 status-tracking shape; they differ only by `ST-03` and by
 * which levels carry status (277CA can acknowledge at the provider level).
 *
 * Hierarchy (per WPC TR3 X212 §1.4 / X214 §1.4):
 *
 * ```text
 *  Header (ST, BHT)
 *  Loop 2000A — Information Source HL (HL*..*20)
 *    Loop 2100A — Payer Name (NM1*PR)
 *  Loop 2000B — Information Receiver HL (HL*..*21)
 *    Loop 2100B — Information Receiver Name (NM1*41)
 *  Loop 2000C — Service Provider HL (HL*..*19)
 *    Loop 2100C — Provider Name (NM1*1P)
 *    Loop 2200C — Claim Status Tracking (277CA batch ack)  [STC TRN REF DTP]
 *  Loop 2000D — Subscriber HL (HL*..*22)
 *    Loop 2100D — Subscriber Name (NM1*IL)
 *    Loop 2200D — Claim Status Tracking  [TRN STC REF DTP]
 *      Loop 2220D — Service Line Status  [SVC STC REF DTP]
 *  Loop 2000E — Dependent HL (HL*..*23)
 *    Loop 2100E — Dependent Name (NM1*QC)
 *    Loop 2200E — Claim Status Tracking + Loop 2220E Service Line Status
 * ```
 *
 * @remarks
 * The loop spec is surfaced as a frozen artifact; the walker in
 * `./get-277.ts` keys off the HL level codes + the STC/TRN/SVC triggers.
 * Loop 2200 (claim status) and Loop 2220 (service-line status) are shared
 * across the subscriber and dependent branches — one spec each, reused.
 */

import { defineLoopSpec } from "../../loops/define.js";
import type { LoopSpec } from "../../loops/types.js";

/**
 * 277 Loop 2220 — Service Line Status Information. Triggered by `SVC`.
 * Reused under both the subscriber (2220D) and dependent (2220E) claim
 * status loops.
 *
 * @example
 * ```ts
 * import { STATUS_277_LOOP_2220 } from "@cosyte/x12";
 * STATUS_277_LOOP_2220.trigger; // "SVC"
 * ```
 */
export const STATUS_277_LOOP_2220: LoopSpec = defineLoopSpec({
  id: "2220",
  description: "277 Loop 2220 — Service Line Status Information",
  trigger: "SVC",
  segments: [
    { id: "SVC", usage: "required", max: 1 },
    { id: "STC", usage: "required", max: ">1" },
    { id: "REF", usage: "situational", max: ">1" },
    { id: "DTP", usage: "situational", max: ">1" },
  ],
});

/**
 * 277 Loop 2200 — Claim Status Tracking. Triggered by `TRN` (a 277 claim
 * status) — in a 277CA provider-level batch acknowledgment the same loop
 * may open on a standalone `STC`; the walker handles both. Nests
 * {@link STATUS_277_LOOP_2220}.
 *
 * @example
 * ```ts
 * import { STATUS_277_LOOP_2200 } from "@cosyte/x12";
 * STATUS_277_LOOP_2200.children[0]?.trigger; // "SVC"
 * ```
 */
export const STATUS_277_LOOP_2200: LoopSpec = defineLoopSpec({
  id: "2200",
  description: "277 Loop 2200 — Claim Status Tracking",
  trigger: "TRN",
  segments: [
    { id: "TRN", usage: "situational", max: 1 },
    { id: "STC", usage: "required", max: ">1" },
    { id: "REF", usage: "situational", max: ">1" },
    { id: "DTP", usage: "situational", max: ">1" },
  ],
  children: [STATUS_277_LOOP_2220],
});

/**
 * 277 Loop 2000A — Information Source HL (payer). Triggered by `HL`
 * (`HL-03 = "20"`); the level-code check happens in the walker.
 *
 * @example
 * ```ts
 * import { STATUS_277_LOOP_2000A } from "@cosyte/x12";
 * STATUS_277_LOOP_2000A.trigger; // "HL"
 * ```
 */
export const STATUS_277_LOOP_2000A: LoopSpec = defineLoopSpec({
  id: "2000A",
  description: "277 Loop 2000A — Information Source HL",
  trigger: "HL",
  segments: [
    { id: "HL", usage: "required", max: 1 },
    { id: "NM1", usage: "required", max: 1 },
    { id: "PER", usage: "situational", max: ">1" },
  ],
});

/**
 * 277 Loop 2000B — Information Receiver HL. Triggered by `HL`
 * (`HL-03 = "21"`).
 *
 * @example
 * ```ts
 * import { STATUS_277_LOOP_2000B } from "@cosyte/x12";
 * STATUS_277_LOOP_2000B.id; // "2000B"
 * ```
 */
export const STATUS_277_LOOP_2000B: LoopSpec = defineLoopSpec({
  id: "2000B",
  description: "277 Loop 2000B — Information Receiver HL",
  trigger: "HL",
  segments: [
    { id: "HL", usage: "required", max: 1 },
    { id: "NM1", usage: "required", max: 1 },
  ],
});

/**
 * 277 Loop 2000C — Service Provider HL. Triggered by `HL` (`HL-03 = "19"`).
 * In a 277CA this level can also carry a Loop 2200 batch acknowledgment
 * (provider-level STC) — nested here as {@link STATUS_277_LOOP_2200}.
 *
 * @example
 * ```ts
 * import { STATUS_277_LOOP_2000C } from "@cosyte/x12";
 * STATUS_277_LOOP_2000C.children[0]?.id; // "2200"
 * ```
 */
export const STATUS_277_LOOP_2000C: LoopSpec = defineLoopSpec({
  id: "2000C",
  description: "277 Loop 2000C — Service Provider HL",
  trigger: "HL",
  segments: [
    { id: "HL", usage: "required", max: 1 },
    { id: "NM1", usage: "required", max: 1 },
  ],
  children: [STATUS_277_LOOP_2200],
});

/**
 * 277 Loop 2000D — Subscriber HL. Triggered by `HL` (`HL-03 = "22"`).
 * Carries the subscriber name (2100D) and its claim status tracking
 * (Loop 2200).
 *
 * @example
 * ```ts
 * import { STATUS_277_LOOP_2000D } from "@cosyte/x12";
 * STATUS_277_LOOP_2000D.children[0]?.id; // "2200"
 * ```
 */
export const STATUS_277_LOOP_2000D: LoopSpec = defineLoopSpec({
  id: "2000D",
  description: "277 Loop 2000D — Subscriber HL",
  trigger: "HL",
  segments: [
    { id: "HL", usage: "required", max: 1 },
    { id: "NM1", usage: "required", max: 1 },
  ],
  children: [STATUS_277_LOOP_2200],
});

/**
 * 277 Loop 2000E — Dependent HL. Triggered by `HL` (`HL-03 = "23"`).
 * Carries the dependent name (2100E) and its claim status tracking
 * (Loop 2200).
 *
 * @example
 * ```ts
 * import { STATUS_277_LOOP_2000E } from "@cosyte/x12";
 * STATUS_277_LOOP_2000E.id; // "2000E"
 * ```
 */
export const STATUS_277_LOOP_2000E: LoopSpec = defineLoopSpec({
  id: "2000E",
  description: "277 Loop 2000E — Dependent HL",
  trigger: "HL",
  segments: [
    { id: "HL", usage: "required", max: 1 },
    { id: "NM1", usage: "required", max: 1 },
  ],
  children: [STATUS_277_LOOP_2200],
});
