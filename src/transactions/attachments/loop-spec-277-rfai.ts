/**
 * Loop specification for the 277 Health Care Claim Request for Additional
 * Information (`006020X313`), authored through the public
 * {@link "../../loops/define.js".defineLoopSpec} API.
 *
 * **This is the base X12 006020 277, not the implementation guide.** The
 * guide is sold and no carried source states its loop identifiers, its usages
 * or its repeats, so each loop below carries the base standard's own loop
 * number, `required` where the base standard makes a segment mandatory in its
 * loop and `optional` where it makes it optional, and the base standard's
 * maximum use. The reader in `./get-277-rfai.ts` keys off the HL, TRN, STC and
 * SVC triggers and never off these usages.
 *
 * ```text
 *  Heading  ST, BHT, REF
 *    Loop 1000  NM1 N2 N3 N4 REF PER
 *  Detail
 *    Loop 2000  HL SBR PAT DMG
 *      Loop 2100  NM1 N3 N4 PER
 *      Loop 2200  TRN STC REF DTP QTY AMT
 *        Loop 2210  PWK PER N1 N3 N4
 *        Loop 2220  SVC STC REF DTP TOO
 *          Loop 2225  PWK
 * ```
 *
 * The carried base-standard text ends inside Loop 2220 after its REF, so the
 * maximum use of that loop's DTP and TOO, and every segment of Loop 2225 after
 * its PWK, are not stated by it: the two are recorded as `">1"` and Loop 2225
 * carries its trigger alone.
 */

import { defineLoopSpec } from "../../loops/define.js";
import type { LoopSpec } from "../../loops/types.js";

/**
 * 277 request for additional information, Loop 2220: service line. Triggered
 * by `SVC`.
 *
 * @example
 * ```ts
 * import { RFAI_277_LOOP_2220 } from "@cosyte/x12";
 * RFAI_277_LOOP_2220.trigger; // "SVC"
 * ```
 */
export const RFAI_277_LOOP_2220: LoopSpec = defineLoopSpec({
  id: "2220",
  description: "277 request for additional information, Loop 2220 - service line",
  trigger: "SVC",
  segments: [
    { id: "SVC", usage: "required", max: 1 },
    { id: "STC", usage: "optional", max: ">1" },
    { id: "REF", usage: "optional", max: 9 },
    { id: "DTP", usage: "optional", max: ">1" },
    { id: "TOO", usage: "optional", max: ">1" },
  ],
  children: [
    defineLoopSpec({
      id: "2225",
      description: "277 request for additional information, Loop 2225 - service line paperwork",
      trigger: "PWK",
      segments: [{ id: "PWK", usage: "required", max: 1 }],
    }),
  ],
});

/**
 * 277 request for additional information, Loop 2200: claim-level request.
 * Triggered by `TRN`, which the base standard makes mandatory in the loop.
 *
 * @example
 * ```ts
 * import { RFAI_277_LOOP_2200 } from "@cosyte/x12";
 * RFAI_277_LOOP_2200.trigger; // "TRN"
 * ```
 */
export const RFAI_277_LOOP_2200: LoopSpec = defineLoopSpec({
  id: "2200",
  description: "277 request for additional information, Loop 2200 - claim-level request",
  trigger: "TRN",
  segments: [
    { id: "TRN", usage: "required", max: 1 },
    { id: "STC", usage: "optional", max: ">1" },
    { id: "REF", usage: "optional", max: 9 },
    { id: "DTP", usage: "optional", max: 2 },
    { id: "QTY", usage: "optional", max: 5 },
    { id: "AMT", usage: "optional", max: 5 },
  ],
  children: [
    defineLoopSpec({
      id: "2210",
      description: "277 request for additional information, Loop 2210 - paperwork",
      trigger: "PWK",
      segments: [
        { id: "PWK", usage: "required", max: 1 },
        { id: "PER", usage: "optional", max: 1 },
        { id: "N1", usage: "optional", max: 1 },
        { id: "N3", usage: "optional", max: 1 },
        { id: "N4", usage: "optional", max: 1 },
      ],
    }),
    RFAI_277_LOOP_2220,
  ],
});

/**
 * 277 request for additional information, Loop 2100: a name under a
 * hierarchical level. Triggered by `NM1`.
 *
 * @example
 * ```ts
 * import { RFAI_277_LOOP_2100 } from "@cosyte/x12";
 * RFAI_277_LOOP_2100.trigger; // "NM1"
 * ```
 */
export const RFAI_277_LOOP_2100: LoopSpec = defineLoopSpec({
  id: "2100",
  description: "277 request for additional information, Loop 2100 - name",
  trigger: "NM1",
  segments: [
    { id: "NM1", usage: "required", max: 1 },
    { id: "N3", usage: "optional", max: 2 },
    { id: "N4", usage: "optional", max: 1 },
    { id: "PER", usage: "optional", max: 1 },
  ],
});

/**
 * 277 request for additional information, Loop 2000: hierarchical level.
 * Triggered by `HL`; the level code is the sender's and is not checked here.
 *
 * @example
 * ```ts
 * import { RFAI_277_LOOP_2000 } from "@cosyte/x12";
 * RFAI_277_LOOP_2000.children.map((loop) => loop.id); // ["2100", "2200"]
 * ```
 */
export const RFAI_277_LOOP_2000: LoopSpec = defineLoopSpec({
  id: "2000",
  description: "277 request for additional information, Loop 2000 - hierarchical level",
  trigger: "HL",
  segments: [
    { id: "HL", usage: "required", max: 1 },
    { id: "SBR", usage: "optional", max: 1 },
    { id: "PAT", usage: "optional", max: 1 },
    { id: "DMG", usage: "optional", max: 1 },
  ],
  children: [RFAI_277_LOOP_2100, RFAI_277_LOOP_2200],
});

/**
 * 277 request for additional information, Loop 1000: a name in the heading.
 * Triggered by `NM1`. The reader does not type this loop; its segments stay
 * verbatim on the transaction set.
 *
 * @example
 * ```ts
 * import { RFAI_277_LOOP_1000 } from "@cosyte/x12";
 * RFAI_277_LOOP_1000.trigger; // "NM1"
 * ```
 */
export const RFAI_277_LOOP_1000: LoopSpec = defineLoopSpec({
  id: "1000",
  description: "277 request for additional information, Loop 1000 - heading name",
  trigger: "NM1",
  segments: [
    { id: "NM1", usage: "required", max: 1 },
    { id: "N2", usage: "optional", max: 2 },
    { id: "N3", usage: "optional", max: 2 },
    { id: "N4", usage: "optional", max: 1 },
    { id: "REF", usage: "optional", max: 2 },
    { id: "PER", usage: "optional", max: 1 },
  ],
});
