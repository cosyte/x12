/**
 * 835 TR3 `005010X221A1` loop specification — authored through the
 * **public** {@link "../../loops/define.js".defineLoopSpec} API. This is
 * the Phase 4 dogfooding gate: the built-in 835 loop hierarchy goes
 * through the SAME factory consumers use for payer-specific companion-
 * guide loops. A regression in `defineLoopSpec` cannot hide from the
 * built-in extractors.
 *
 * Hierarchy (per WPC TR3 §3, §4):
 *
 * ```text
 *  Header (transaction set, ST..SE)
 *    BPR  (Financial Information)            — required, max 1
 *    NTE  (Note)                              — situational, max >1
 *    TRN  (Reassociation Trace Number)        — required, max 1
 *    CUR  (Foreign Currency)                  — situational, max 1
 *    REF  (Receiver Identifier / Version)     — situational, max >1
 *    DTM  (Production Date)                   — situational, max 1
 *  Loop 1000A — Payer Identification        — required, max 1
 *    N1 (PR)  N3  N4  REF  PER
 *  Loop 1000B — Payee Identification        — required, max 1
 *    N1 (PE)  N3  N4  REF  RDM
 *  Loop 2000 — Header Number                — situational, max >1
 *    LX  TS3  TS2
 *    Loop 2100 — Claim Payment Info         — situational, max >1
 *      CLP  CAS  NM1(QC,IL,74,82,77,TT,PR,GB,…)  MIA  MOA  REF  DTM  PER  AMT  QTY  LQ
 *      Loop 2110 — Service Payment Info     — situational, max >1
 *        SVC  DTM  CAS  REF  AMT  QTY  LQ
 *  Trailer
 *    PLB  (Provider-Level Adjustments)        — situational, max >1
 *    SE   (Transaction Set Trailer)           — required, max 1
 * ```
 *
 * @remarks
 * Phase 4 surfaces the loop spec as a frozen artifact (consumers can read
 * it and assert it matches their companion-guide expectations); the
 * walker in `./get-835.ts` consults the spec to guide its state machine.
 * Phase 9's profile system overlays vendor-specific quirks on top of
 * this baseline.
 */

import { defineLoopSpec } from "../../loops/define.js";
import type { LoopSpec } from "../../loops/types.js";

/**
 * 835 Loop 2110 — Service Payment Information. Triggered by `SVC`.
 *
 * Cited as Loop 2110 in TR3 X221A1.
 *
 * @example
 * ```ts
 * import { REMIT_835_LOOP_2110 } from "@cosyte/x12";
 * REMIT_835_LOOP_2110.id;       // "2110"
 * REMIT_835_LOOP_2110.trigger;  // "SVC"
 * ```
 */
export const REMIT_835_LOOP_2110: LoopSpec = defineLoopSpec({
  id: "2110",
  description: "835 Loop 2110 — Service Payment Information",
  trigger: "SVC",
  segments: [
    { id: "SVC", usage: "required", max: 1 },
    { id: "DTM", usage: "situational", max: ">1" },
    { id: "CAS", usage: "situational", max: ">1" },
    { id: "REF", usage: "situational", max: ">1" },
    { id: "AMT", usage: "situational", max: ">1" },
    { id: "QTY", usage: "situational", max: ">1" },
    { id: "LQ", usage: "situational", max: ">1" },
  ],
});

/**
 * 835 Loop 2100 — Claim Payment Information. Triggered by `CLP`. Nests
 * Loop 2110.
 *
 * Cited as Loop 2100 in TR3 X221A1.
 *
 * @example
 * ```ts
 * import { REMIT_835_LOOP_2100 } from "@cosyte/x12";
 * REMIT_835_LOOP_2100.trigger;          // "CLP"
 * REMIT_835_LOOP_2100.children.length;  // 1 (Loop 2110)
 * ```
 */
export const REMIT_835_LOOP_2100: LoopSpec = defineLoopSpec({
  id: "2100",
  description: "835 Loop 2100 — Claim Payment Information",
  trigger: "CLP",
  segments: [
    { id: "CLP", usage: "required", max: 1 },
    { id: "CAS", usage: "situational", max: ">1" },
    { id: "NM1", usage: "situational", max: ">1" },
    { id: "MIA", usage: "situational", max: 1 },
    { id: "MOA", usage: "situational", max: 1 },
    { id: "REF", usage: "situational", max: ">1" },
    { id: "DTM", usage: "situational", max: ">1" },
    { id: "PER", usage: "situational", max: ">1" },
    { id: "AMT", usage: "situational", max: ">1" },
    { id: "QTY", usage: "situational", max: ">1" },
    { id: "LQ", usage: "situational", max: ">1" },
  ],
  children: [REMIT_835_LOOP_2110],
});

/**
 * 835 Loop 2000 — Header Number. Triggered by `LX`. Nests Loop 2100.
 *
 * Cited as Loop 2000 in TR3 X221A1; situational because some payers
 * (notably Medicare FFS) omit the LX header entirely and ship CLP loops
 * directly under the transaction set header. The Phase 4 walker handles
 * both shapes — claims appear inside Loop 2000 if `LX` is present, at
 * top level otherwise.
 *
 * @example
 * ```ts
 * import { REMIT_835_LOOP_2000 } from "@cosyte/x12";
 * REMIT_835_LOOP_2000.trigger;          // "LX"
 * REMIT_835_LOOP_2000.children[0]?.trigger; // "CLP" (Loop 2100)
 * ```
 */
export const REMIT_835_LOOP_2000: LoopSpec = defineLoopSpec({
  id: "2000",
  description: "835 Loop 2000 — Header Number",
  trigger: "LX",
  segments: [
    { id: "LX", usage: "required", max: 1 },
    { id: "TS3", usage: "situational", max: 1 },
    { id: "TS2", usage: "situational", max: 1 },
  ],
  children: [REMIT_835_LOOP_2100],
});

/**
 * 835 Loop 1000A — Payer Identification. Triggered by `N1` with
 * `N1-01 = "PR"`. The trigger validation against the qualifier value
 * (PR vs PE) happens in the walker, not the loop spec — `defineLoopSpec`
 * keys off the segment id, not the element-level qualifier.
 *
 * @example
 * ```ts
 * import { REMIT_835_LOOP_1000A } from "@cosyte/x12";
 * REMIT_835_LOOP_1000A.id;      // "1000A"
 * REMIT_835_LOOP_1000A.trigger; // "N1"
 * ```
 */
export const REMIT_835_LOOP_1000A: LoopSpec = defineLoopSpec({
  id: "1000A",
  description: "835 Loop 1000A — Payer Identification",
  trigger: "N1",
  segments: [
    { id: "N1", usage: "required", max: 1 },
    { id: "N3", usage: "situational", max: ">1" },
    { id: "N4", usage: "situational", max: 1 },
    { id: "REF", usage: "situational", max: ">1" },
    { id: "PER", usage: "situational", max: ">1" },
  ],
});

/**
 * 835 Loop 1000B — Payee Identification. Triggered by `N1` with
 * `N1-01 = "PE"`. Shape is the same as Loop 1000A (plus optional `RDM`)
 * but the role is the payment recipient.
 *
 * @example
 * ```ts
 * import { REMIT_835_LOOP_1000B } from "@cosyte/x12";
 * REMIT_835_LOOP_1000B.id; // "1000B"
 * ```
 */
export const REMIT_835_LOOP_1000B: LoopSpec = defineLoopSpec({
  id: "1000B",
  description: "835 Loop 1000B — Payee Identification",
  trigger: "N1",
  segments: [
    { id: "N1", usage: "required", max: 1 },
    { id: "N3", usage: "situational", max: ">1" },
    { id: "N4", usage: "situational", max: 1 },
    { id: "REF", usage: "situational", max: ">1" },
    { id: "RDM", usage: "situational", max: 1 },
  ],
});
