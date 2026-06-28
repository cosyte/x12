/**
 * 278 TR3 `005010X217` (request) / `005010X216` (response) loop
 * specification — authored through the **public** {@link
 * "../../loops/define.js".defineLoopSpec} API (the Phase 7 dogfooding gate).
 * The built-in 278 HL hierarchy goes through the SAME factory consumers use
 * for payer-specific companion-guide loops.
 *
 * Hierarchy (per WPC TR3 §1.4, request + response share the HL spine; the
 * response adds the `HCR` decision under the event / service levels):
 *
 * ```text
 *  Header (ST, BHT)
 *  Loop 2000A — Utilization Management Organization (UMO) HL (HL*..*20)
 *    Loop 2010A — UMO Name (NM1*X3)
 *  Loop 2000B — Requester HL (HL*..*21)
 *    Loop 2010B — Requester Name (NM1*1P/FA/…)
 *  Loop 2000C — Subscriber HL (HL*..*22)
 *    Loop 2010C — Subscriber Name (NM1*IL) + DMG/REF
 *  Loop 2000D — Dependent HL (HL*..*23)
 *    Loop 2010D — Dependent Name (NM1*QC/03) + DMG/REF
 *  Loop 2000E — Patient Event HL (HL*..*EV)
 *    UM (services review) · HCR (decision, response) · HI (diagnoses) · TRN
 *    REF · DTP · MSG · Loop 2010E* (service-provider NM1s)
 *  Loop 2000F — Service HL (HL*..*SS)
 *    UM · HCR · SV1/SV2/SV3 · REF · DTP
 * ```
 *
 * @remarks
 * The HL spine `20 → 21 → 22 → 23` is validated for parent-pointer
 * integrity; the `EV` / `SS` event + service levels are intentionally
 * **omitted from the expected-parent map** — the 278 attaches them under a
 * subscriber **or** a dependent (and clearinghouses vary), so the walker is
 * tolerant there rather than emitting false `X12_HL_PARENT_MISMATCH`
 * warnings. Detailed sub-loops (PWK attachments, the full 2010E provider
 * family, HSD service-delivery, SV1/SV2/SV3 line detail) are preserved
 * verbatim on `tx.segments` but not yet destructured onto the model — a
 * documented Phase 7 limitation.
 */

import { defineLoopSpec } from "../../loops/define.js";
import type { LoopSpec } from "../../loops/types.js";

/**
 * 278 Loop 2000F — Service HL. Triggered by `HL` (`HL-03 = "SS"`). Carries a
 * service-level `UM` review and, in a response, its `HCR` decision.
 *
 * @example
 * ```ts
 * import { AUTH_278_LOOP_2000F } from "@cosyte/x12";
 * AUTH_278_LOOP_2000F.trigger; // "HL"
 * ```
 */
export const AUTH_278_LOOP_2000F: LoopSpec = defineLoopSpec({
  id: "2000F",
  description: "278 Loop 2000F — Service HL",
  trigger: "HL",
  segments: [
    { id: "HL", usage: "required", max: 1 },
    { id: "UM", usage: "situational", max: 1 },
    { id: "HCR", usage: "situational", max: 1 },
    { id: "REF", usage: "situational", max: ">1" },
    { id: "DTP", usage: "situational", max: ">1" },
    { id: "SV1", usage: "situational", max: 1 },
    { id: "SV2", usage: "situational", max: 1 },
    { id: "SV3", usage: "situational", max: 1 },
    { id: "MSG", usage: "situational", max: ">1" },
  ],
});

/**
 * 278 Loop 2000E — Patient Event HL. Triggered by `HL` (`HL-03 = "EV"`).
 * Anchors the `UM` services-review information, the `HCR` decision (response
 * only), `HI` diagnoses, the echoed `TRN`, and the service-provider NM1s.
 * Nests {@link AUTH_278_LOOP_2000F}.
 *
 * @example
 * ```ts
 * import { AUTH_278_LOOP_2000E } from "@cosyte/x12";
 * AUTH_278_LOOP_2000E.children[0]?.id; // "2000F"
 * ```
 */
export const AUTH_278_LOOP_2000E: LoopSpec = defineLoopSpec({
  id: "2000E",
  description: "278 Loop 2000E — Patient Event HL",
  trigger: "HL",
  segments: [
    { id: "HL", usage: "required", max: 1 },
    { id: "TRN", usage: "situational", max: ">1" },
    { id: "UM", usage: "required", max: 1 },
    { id: "HCR", usage: "situational", max: 1 },
    { id: "HI", usage: "situational", max: ">1" },
    { id: "NM1", usage: "situational", max: ">1" },
    { id: "REF", usage: "situational", max: ">1" },
    { id: "DTP", usage: "situational", max: ">1" },
    { id: "MSG", usage: "situational", max: ">1" },
  ],
  children: [AUTH_278_LOOP_2000F],
});

/**
 * 278 Loop 2000D — Dependent HL. Triggered by `HL` (`HL-03 = "23"`). Carries
 * the dependent name NM1 + DMG demographics.
 *
 * @example
 * ```ts
 * import { AUTH_278_LOOP_2000D } from "@cosyte/x12";
 * AUTH_278_LOOP_2000D.id; // "2000D"
 * ```
 */
export const AUTH_278_LOOP_2000D: LoopSpec = defineLoopSpec({
  id: "2000D",
  description: "278 Loop 2000D — Dependent HL",
  trigger: "HL",
  segments: [
    { id: "HL", usage: "required", max: 1 },
    { id: "NM1", usage: "required", max: 1 },
    { id: "REF", usage: "situational", max: ">1" },
    { id: "DMG", usage: "situational", max: 1 },
  ],
});

/**
 * 278 Loop 2000C — Subscriber HL. Triggered by `HL` (`HL-03 = "22"`).
 * Carries the subscriber name NM1 + DMG demographics.
 *
 * @example
 * ```ts
 * import { AUTH_278_LOOP_2000C } from "@cosyte/x12";
 * AUTH_278_LOOP_2000C.id; // "2000C"
 * ```
 */
export const AUTH_278_LOOP_2000C: LoopSpec = defineLoopSpec({
  id: "2000C",
  description: "278 Loop 2000C — Subscriber HL",
  trigger: "HL",
  segments: [
    { id: "HL", usage: "required", max: 1 },
    { id: "NM1", usage: "required", max: 1 },
    { id: "REF", usage: "situational", max: ">1" },
    { id: "DMG", usage: "situational", max: 1 },
  ],
});

/**
 * 278 Loop 2000B — Requester HL. Triggered by `HL` (`HL-03 = "21"`). The
 * requesting provider / facility.
 *
 * @example
 * ```ts
 * import { AUTH_278_LOOP_2000B } from "@cosyte/x12";
 * AUTH_278_LOOP_2000B.id; // "2000B"
 * ```
 */
export const AUTH_278_LOOP_2000B: LoopSpec = defineLoopSpec({
  id: "2000B",
  description: "278 Loop 2000B — Requester HL",
  trigger: "HL",
  segments: [
    { id: "HL", usage: "required", max: 1 },
    { id: "NM1", usage: "required", max: 1 },
    { id: "REF", usage: "situational", max: ">1" },
    { id: "N3", usage: "situational", max: ">1" },
    { id: "N4", usage: "situational", max: 1 },
    { id: "PER", usage: "situational", max: ">1" },
  ],
});

/**
 * 278 Loop 2000A — Utilization Management Organization (UMO) HL. Triggered by
 * `HL` (`HL-03 = "20"`) — the top of the hierarchy, no parent. Carries the
 * UMO name NM1.
 *
 * @example
 * ```ts
 * import { AUTH_278_LOOP_2000A } from "@cosyte/x12";
 * AUTH_278_LOOP_2000A.trigger; // "HL"
 * ```
 */
export const AUTH_278_LOOP_2000A: LoopSpec = defineLoopSpec({
  id: "2000A",
  description: "278 Loop 2000A — Utilization Management Organization HL",
  trigger: "HL",
  segments: [
    { id: "HL", usage: "required", max: 1 },
    { id: "NM1", usage: "required", max: 1 },
  ],
});
