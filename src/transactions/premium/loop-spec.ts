/**
 * 820 TR3 `005010X218` loop specification — authored through the **public**
 * {@link "../../loops/define.js".defineLoopSpec} API, the same dogfooding
 * gate the 835 / 837 / 271 / 277 specs go through. A regression in
 * `defineLoopSpec` cannot hide from the built-in 820 extractor.
 *
 * Hierarchy (per WPC TR3 `005010X218` §3, §4):
 *
 * ```text
 *  Header (transaction set, ST..SE)
 *    BPR  (Financial Information)              — required, max 1
 *    NTE  (Note)                               — situational, max >1
 *    TRN  (Reassociation Trace Number)         — situational, max 1
 *    CUR  (Currency)                           — situational, max 1
 *    REF  (Premium Receiver / Payer ID Key)    — situational, max >1
 *    DTM  (Date/Time — process / coverage)     — situational, max >1
 *  Loop 1000A — Premium Receiver's Name        — required, max 1
 *    N1 (PE)  N2  N3  N4  PER  RDM
 *  Loop 1000B — Premium Payer's Name           — required, max 1
 *    N1 (PR / RM)  N2  N3  N4  PER
 *  Loop 2000A — Organization Summary Remittance — situational, max >1
 *    ENT
 *    Loop 2100A — Party Name                    — situational, max >1
 *      NM1  N1  REF
 *    Loop 2300A — Organization Summary Detail   — situational, max >1
 *      RMR  REF  DTM
 *      Loop 2310A — Adjustment                  — situational, max >1
 *        ADX
 *  Trailer
 *    SE   (Transaction Set Trailer)             — required, max 1
 * ```
 *
 * @remarks
 * The walker in `./get-820.js` is a flat state machine; these specs are the
 * frozen introspection artifacts a consumer reads to assert their
 * companion-guide expectations. An 820 may carry detail either at the
 * organization-summary level (`ENT` → `RMR`) or as bare individual
 * remittances (`NM1` → `RMR`); the walker handles both — `NM1` outside an
 * `ENT` opens an individual remittance.
 */

import { defineLoopSpec } from "../../loops/define.js";
import type { LoopSpec } from "../../loops/types.js";

/**
 * 820 Loop 2310A — Adjustment. Triggered by `ADX`. Innermost detail loop:
 * a signed monetary adjustment tied to the enclosing `RMR` open item.
 *
 * Cited as Loop 2310A in TR3 X218.
 *
 * @example
 * ```ts
 * import { PREMIUM_820_LOOP_2310A } from "@cosyte/x12";
 * PREMIUM_820_LOOP_2310A.trigger; // "ADX"
 * ```
 */
export const PREMIUM_820_LOOP_2310A: LoopSpec = defineLoopSpec({
  id: "2310A",
  description: "820 Loop 2310A — Organization Summary Remittance Adjustment",
  trigger: "ADX",
  segments: [{ id: "ADX", usage: "situational", max: ">1" }],
});

/**
 * 820 Loop 2300A — Organization Summary Remittance Detail. Triggered by
 * `RMR` (the premium-line open-item reference). Nests Loop 2310A.
 *
 * Cited as Loop 2300A in TR3 X218.
 *
 * @example
 * ```ts
 * import { PREMIUM_820_LOOP_2300A } from "@cosyte/x12";
 * PREMIUM_820_LOOP_2300A.trigger;          // "RMR"
 * PREMIUM_820_LOOP_2300A.children[0]?.trigger; // "ADX"
 * ```
 */
export const PREMIUM_820_LOOP_2300A: LoopSpec = defineLoopSpec({
  id: "2300A",
  description: "820 Loop 2300A — Organization Summary Remittance Detail",
  trigger: "RMR",
  segments: [
    { id: "RMR", usage: "situational", max: 1 },
    { id: "REF", usage: "situational", max: ">1" },
    { id: "DTM", usage: "situational", max: ">1" },
  ],
  children: [PREMIUM_820_LOOP_2310A],
});

/**
 * 820 Loop 2100A — Party Name (member / entity inside an organization
 * summary). Triggered by `NM1`.
 *
 * Cited as Loop 2100A in TR3 X218.
 *
 * @example
 * ```ts
 * import { PREMIUM_820_LOOP_2100A } from "@cosyte/x12";
 * PREMIUM_820_LOOP_2100A.trigger; // "NM1"
 * ```
 */
export const PREMIUM_820_LOOP_2100A: LoopSpec = defineLoopSpec({
  id: "2100A",
  description: "820 Loop 2100A — Party Name",
  trigger: "NM1",
  segments: [
    { id: "NM1", usage: "situational", max: 1 },
    { id: "N1", usage: "situational", max: 1 },
    { id: "REF", usage: "situational", max: ">1" },
  ],
});

/**
 * 820 Loop 2000A — Organization Summary Remittance. Triggered by `ENT`.
 * Nests Loop 2100A (party name) and Loop 2300A (remittance detail).
 *
 * Cited as Loop 2000A in TR3 X218.
 *
 * @example
 * ```ts
 * import { PREMIUM_820_LOOP_2000A } from "@cosyte/x12";
 * PREMIUM_820_LOOP_2000A.trigger;          // "ENT"
 * PREMIUM_820_LOOP_2000A.children.length;  // 2 (2100A, 2300A)
 * ```
 */
export const PREMIUM_820_LOOP_2000A: LoopSpec = defineLoopSpec({
  id: "2000A",
  description: "820 Loop 2000A — Organization Summary Remittance",
  trigger: "ENT",
  segments: [{ id: "ENT", usage: "situational", max: 1 }],
  children: [PREMIUM_820_LOOP_2100A, PREMIUM_820_LOOP_2300A],
});

/**
 * 820 Loop 1000A — Premium Receiver's Name. Triggered by `N1` with
 * `N1-01 = "PE"`. The qualifier check happens in the walker;
 * `defineLoopSpec` keys off the segment id, not the element value.
 *
 * @example
 * ```ts
 * import { PREMIUM_820_LOOP_1000A } from "@cosyte/x12";
 * PREMIUM_820_LOOP_1000A.id; // "1000A"
 * ```
 */
export const PREMIUM_820_LOOP_1000A: LoopSpec = defineLoopSpec({
  id: "1000A",
  description: "820 Loop 1000A — Premium Receiver's Name",
  trigger: "N1",
  segments: [
    { id: "N1", usage: "required", max: 1 },
    { id: "N2", usage: "situational", max: 1 },
    { id: "N3", usage: "situational", max: ">1" },
    { id: "N4", usage: "situational", max: 1 },
    { id: "PER", usage: "situational", max: ">1" },
    { id: "RDM", usage: "situational", max: 1 },
  ],
});

/**
 * 820 Loop 1000B — Premium Payer's Name (remitter). Triggered by `N1` with
 * `N1-01 = "PR"` or `"RM"`. Same shape as Loop 1000A minus `RDM`.
 *
 * @example
 * ```ts
 * import { PREMIUM_820_LOOP_1000B } from "@cosyte/x12";
 * PREMIUM_820_LOOP_1000B.id; // "1000B"
 * ```
 */
export const PREMIUM_820_LOOP_1000B: LoopSpec = defineLoopSpec({
  id: "1000B",
  description: "820 Loop 1000B — Premium Payer's Name",
  trigger: "N1",
  segments: [
    { id: "N1", usage: "required", max: 1 },
    { id: "N2", usage: "situational", max: 1 },
    { id: "N3", usage: "situational", max: ">1" },
    { id: "N4", usage: "situational", max: 1 },
    { id: "PER", usage: "situational", max: ">1" },
  ],
});
