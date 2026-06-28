/**
 * 834 TR3 `005010X220A1` loop specification — authored through the
 * **public** {@link "../../loops/define.js".defineLoopSpec} API, the same
 * dogfooding gate every other built-in transaction spec goes through.
 *
 * Hierarchy (per WPC TR3 `005010X220A1` §3, §4):
 *
 * ```text
 *  Header (transaction set, ST..SE)
 *    BGN  (Beginning Segment)                  — required, max 1
 *    REF  (Transaction Set Policy Number)      — situational, max >1
 *    DTP  (File Effective Date)                — situational, max >1
 *    QTY  (Transaction Set Control Totals)     — situational, max >1
 *  Loop 1000A — Sponsor Name (N1*P5)           — required, max 1
 *  Loop 1000B — Payer (N1*IN)                  — required, max 1
 *  Loop 1000C — TPA / Broker (N1*BO / N1*TV)   — situational, max >1
 *  Loop 2000 — Member Level Detail (INS)       — required, max >1
 *    INS  REF  DTP
 *    Loop 2100A — Member Name (NM1*IL)         — required, max 1
 *      NM1  N3  N4  DMG
 *    Loop 2300 — Health Coverage (HD)          — situational, max >1
 *      HD  DTP  AMT
 *      Loop 2320 — Coordination of Benefits    — situational, max >1
 *        COB
 *  Trailer
 *    SE   (Transaction Set Trailer)            — required, max 1
 * ```
 *
 * @remarks
 * The v1 typed surface flattens Loop 2320 (COB) onto the member
 * (`X12Enrollment.coordinationOfBenefits`) rather than nesting it under each
 * health-coverage loop; the spec below reflects the TR3 nesting truth so a
 * consumer's companion-guide introspection still matches the standard.
 */

import { defineLoopSpec } from "../../loops/define.js";
import type { LoopSpec } from "../../loops/types.js";

/**
 * 834 Loop 2320 — Coordination of Benefits. Triggered by `COB`.
 *
 * @example
 * ```ts
 * import { ENROLLMENT_834_LOOP_2320 } from "@cosyte/x12";
 * ENROLLMENT_834_LOOP_2320.trigger; // "COB"
 * ```
 */
export const ENROLLMENT_834_LOOP_2320: LoopSpec = defineLoopSpec({
  id: "2320",
  description: "834 Loop 2320 — Coordination of Benefits",
  trigger: "COB",
  segments: [{ id: "COB", usage: "situational", max: 1 }],
});

/**
 * 834 Loop 2300 — Health Coverage. Triggered by `HD`. Nests Loop 2320.
 *
 * @example
 * ```ts
 * import { ENROLLMENT_834_LOOP_2300 } from "@cosyte/x12";
 * ENROLLMENT_834_LOOP_2300.trigger;          // "HD"
 * ENROLLMENT_834_LOOP_2300.children[0]?.trigger; // "COB"
 * ```
 */
export const ENROLLMENT_834_LOOP_2300: LoopSpec = defineLoopSpec({
  id: "2300",
  description: "834 Loop 2300 — Health Coverage",
  trigger: "HD",
  segments: [
    { id: "HD", usage: "situational", max: 1 },
    { id: "DTP", usage: "situational", max: ">1" },
    { id: "AMT", usage: "situational", max: ">1" },
  ],
  children: [ENROLLMENT_834_LOOP_2320],
});

/**
 * 834 Loop 2100A — Member Name. Triggered by `NM1` with `NM1-01 = "IL"`.
 *
 * @example
 * ```ts
 * import { ENROLLMENT_834_LOOP_2100A } from "@cosyte/x12";
 * ENROLLMENT_834_LOOP_2100A.trigger; // "NM1"
 * ```
 */
export const ENROLLMENT_834_LOOP_2100A: LoopSpec = defineLoopSpec({
  id: "2100A",
  description: "834 Loop 2100A — Member Name",
  trigger: "NM1",
  segments: [
    { id: "NM1", usage: "required", max: 1 },
    { id: "N3", usage: "situational", max: ">1" },
    { id: "N4", usage: "situational", max: 1 },
    { id: "DMG", usage: "situational", max: 1 },
  ],
});

/**
 * 834 Loop 2000 — Member Level Detail. Triggered by `INS`. The streaming
 * unit of {@link "./get-834.js".get834Enrollments} — one yielded
 * `X12Enrollment` per `INS`. Nests Loop 2100A (member name) and Loop 2300
 * (health coverage).
 *
 * @example
 * ```ts
 * import { ENROLLMENT_834_LOOP_2000 } from "@cosyte/x12";
 * ENROLLMENT_834_LOOP_2000.trigger;          // "INS"
 * ENROLLMENT_834_LOOP_2000.children.map((c) => c.trigger); // ["NM1", "HD"]
 * ```
 */
export const ENROLLMENT_834_LOOP_2000: LoopSpec = defineLoopSpec({
  id: "2000",
  description: "834 Loop 2000 — Member Level Detail",
  trigger: "INS",
  segments: [
    { id: "INS", usage: "required", max: 1 },
    { id: "REF", usage: "situational", max: ">1" },
    { id: "DTP", usage: "situational", max: ">1" },
  ],
  children: [ENROLLMENT_834_LOOP_2100A, ENROLLMENT_834_LOOP_2300],
});

/**
 * 834 Loop 1000A — Sponsor Name. Triggered by `N1` with `N1-01 = "P5"`.
 *
 * @example
 * ```ts
 * import { ENROLLMENT_834_LOOP_1000A } from "@cosyte/x12";
 * ENROLLMENT_834_LOOP_1000A.id; // "1000A"
 * ```
 */
export const ENROLLMENT_834_LOOP_1000A: LoopSpec = defineLoopSpec({
  id: "1000A",
  description: "834 Loop 1000A — Sponsor Name",
  trigger: "N1",
  segments: [{ id: "N1", usage: "required", max: 1 }],
});

/**
 * 834 Loop 1000B — Payer. Triggered by `N1` with `N1-01 = "IN"`.
 *
 * @example
 * ```ts
 * import { ENROLLMENT_834_LOOP_1000B } from "@cosyte/x12";
 * ENROLLMENT_834_LOOP_1000B.id; // "1000B"
 * ```
 */
export const ENROLLMENT_834_LOOP_1000B: LoopSpec = defineLoopSpec({
  id: "1000B",
  description: "834 Loop 1000B — Payer",
  trigger: "N1",
  segments: [{ id: "N1", usage: "required", max: 1 }],
});
