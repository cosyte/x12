/**
 * 837 TR3 loop specifications — authored through the **public**
 * {@link "../../loops/define.js".defineLoopSpec} API (the Phase 2
 * dogfooding gate: the built-in 837 loop hierarchy goes through the SAME
 * factory consumers use for payer-specific companion-guide loops).
 *
 * Three variants share most of the structure; differences are concentrated
 * in the service-line loop (Loop 2400 → SV1/SV2/SV3) and the
 * 837I-specific 2010AC Pay-To Plan / 2410 / 2420 sub-loops. The 837P spec
 * is the canonical shape; 837I / 837D are written as separate exports
 * because their service-line trigger differs.
 *
 * Hierarchy (per WPC TR3s X222A2 / X223A3 / X224A2):
 *
 * ```text
 *  Header
 *    BHT       Beginning of Hierarchical Transaction
 *  Loop 1000A — Submitter Name           (NM1*41) required, max 1
 *  Loop 1000B — Receiver Name            (NM1*40) required, max 1
 *  Loop 2000A — Billing Provider HL      (HL*..*20) required, max >1
 *    Loop 2010AA — Billing Provider Name (NM1*85)
 *    Loop 2010AB — Pay-To Address        (NM1*87) situational
 *    Loop 2010AC — Pay-To Plan (837I)    (NM1*PE) situational
 *    Loop 2000B — Subscriber HL          (HL*..*22) required, max >1
 *      Loop 2010BA — Subscriber Name     (NM1*IL)
 *      Loop 2010BB — Payer Name          (NM1*PR)
 *      Loop 2000C — Patient HL           (HL*..*23) situational
 *        Loop 2010CA — Patient Name      (NM1*QC)
 *        Loop 2300 — Claim Information   (CLM)
 *          Loop 2310x — multiple provider roles (NM1)
 *          Loop 2320 — Other Subscriber Information (SBR)
 *          Loop 2330x — Other Subscriber / Other Payer (NM1)
 *          Loop 2400 — Service Line      (LX → SV1/SV2/SV3)
 *            Loop 2410 — Drug Identification (LIN) 837P
 *            Loop 2420x — Service-Line Provider Names (NM1)
 *            Loop 2430 — Line Adjudication (SVD)
 *  Trailer
 *    SE
 * ```
 *
 * Phase 5 surfaces the three loop specs as frozen artifacts (consumers can
 * read them and assert they match their companion-guide expectations); the
 * walker in `./get-837.ts` consults them to guide its state machine.
 * Phase 9's profile system overlays vendor-specific quirks on top.
 */

import { defineLoopSpec } from "../../loops/define.js";
import type { LoopSpec } from "../../loops/types.js";

// ---------------------------------------------------------------------------
// Shared sub-loops (identical across variants except where called out).
// ---------------------------------------------------------------------------

/**
 * 837 Loop 2010AA — Billing Provider Name. Triggered by `NM1` with
 * `NM1-01 = "85"`. The trigger qualifier value is enforced in the walker
 * (the loop spec keys off the segment id, not the element value).
 *
 * @example
 * ```ts
 * import { CLAIM_837_LOOP_2010AA } from "@cosyte/x12";
 * CLAIM_837_LOOP_2010AA.trigger; // "NM1"
 * ```
 */
export const CLAIM_837_LOOP_2010AA: LoopSpec = defineLoopSpec({
  id: "2010AA",
  description: "837 Loop 2010AA — Billing Provider Name",
  trigger: "NM1",
  segments: [
    { id: "NM1", usage: "required", max: 1 },
    { id: "N3", usage: "required", max: 1 },
    { id: "N4", usage: "required", max: 1 },
    { id: "REF", usage: "situational", max: ">1" },
    { id: "PER", usage: "situational", max: 2 },
  ],
});

/**
 * 837 Loop 2010BA — Subscriber Name (NM1*IL). The subscriber identity
 * + member id; address is situational.
 *
 * @example
 * ```ts
 * import { CLAIM_837_LOOP_2010BA } from "@cosyte/x12";
 * CLAIM_837_LOOP_2010BA.id; // "2010BA"
 * ```
 */
export const CLAIM_837_LOOP_2010BA: LoopSpec = defineLoopSpec({
  id: "2010BA",
  description: "837 Loop 2010BA — Subscriber Name",
  trigger: "NM1",
  segments: [
    { id: "NM1", usage: "required", max: 1 },
    { id: "N3", usage: "situational", max: 1 },
    { id: "N4", usage: "situational", max: 1 },
    { id: "DMG", usage: "situational", max: 1 },
    { id: "REF", usage: "situational", max: ">1" },
    { id: "PER", usage: "situational", max: 1 },
  ],
});

/**
 * 837 Loop 2010BB — Payer Name (NM1*PR). Identifies the payer the
 * provider is billing for this hierarchy.
 *
 * @example
 * ```ts
 * import { CLAIM_837_LOOP_2010BB } from "@cosyte/x12";
 * CLAIM_837_LOOP_2010BB.id; // "2010BB"
 * ```
 */
export const CLAIM_837_LOOP_2010BB: LoopSpec = defineLoopSpec({
  id: "2010BB",
  description: "837 Loop 2010BB — Payer Name",
  trigger: "NM1",
  segments: [
    { id: "NM1", usage: "required", max: 1 },
    { id: "N3", usage: "situational", max: 1 },
    { id: "N4", usage: "situational", max: 1 },
    { id: "REF", usage: "situational", max: ">1" },
    { id: "PER", usage: "situational", max: ">1" },
  ],
});

/**
 * 837 Loop 2010CA — Patient Name (NM1*QC). Triggered only when Loop 2000C
 * (patient HL) is present (patient ≠ subscriber).
 *
 * @example
 * ```ts
 * import { CLAIM_837_LOOP_2010CA } from "@cosyte/x12";
 * CLAIM_837_LOOP_2010CA.id; // "2010CA"
 * ```
 */
export const CLAIM_837_LOOP_2010CA: LoopSpec = defineLoopSpec({
  id: "2010CA",
  description: "837 Loop 2010CA — Patient Name",
  trigger: "NM1",
  segments: [
    { id: "NM1", usage: "required", max: 1 },
    { id: "N3", usage: "required", max: 1 },
    { id: "N4", usage: "required", max: 1 },
    { id: "DMG", usage: "required", max: 1 },
    { id: "REF", usage: "situational", max: ">1" },
  ],
});

/**
 * 837P Loop 2410 — Drug Identification. Triggered by `LIN` inside the
 * 2400 service-line loop. Carries the NDC + dispensed quantity for a
 * professional pharmacy / injectable claim line.
 *
 * @example
 * ```ts
 * import { CLAIM_837P_LOOP_2410 } from "@cosyte/x12";
 * CLAIM_837P_LOOP_2410.trigger; // "LIN"
 * ```
 */
export const CLAIM_837P_LOOP_2410: LoopSpec = defineLoopSpec({
  id: "2410",
  description: "837P Loop 2410 — Drug Identification",
  trigger: "LIN",
  segments: [
    { id: "LIN", usage: "required", max: 1 },
    { id: "CTP", usage: "situational", max: 1 },
    { id: "REF", usage: "situational", max: 1 },
  ],
});

/**
 * 837 Loop 2430 — Line Adjudication Information. Triggered by `SVD`.
 * Captures a prior payer's adjudication of this line for COB.
 *
 * @example
 * ```ts
 * import { CLAIM_837_LOOP_2430 } from "@cosyte/x12";
 * CLAIM_837_LOOP_2430.trigger; // "SVD"
 * ```
 */
export const CLAIM_837_LOOP_2430: LoopSpec = defineLoopSpec({
  id: "2430",
  description: "837 Loop 2430 — Line Adjudication Information",
  trigger: "SVD",
  segments: [
    { id: "SVD", usage: "required", max: 1 },
    { id: "CAS", usage: "situational", max: ">1" },
    { id: "DTP", usage: "required", max: 1 },
    { id: "AMT", usage: "situational", max: 1 },
  ],
});

// ---------------------------------------------------------------------------
// Variant-specific service-line loops (Loop 2400).
// ---------------------------------------------------------------------------

/**
 * 837P Loop 2400 — Service Line (professional). Triggered by `LX`, body
 * led by `SV1`. Nests Loop 2410 (drug) and Loop 2430 (line adjudication).
 *
 * @example
 * ```ts
 * import { CLAIM_837P_LOOP_2400 } from "@cosyte/x12";
 * CLAIM_837P_LOOP_2400.trigger; // "LX"
 * ```
 */
export const CLAIM_837P_LOOP_2400: LoopSpec = defineLoopSpec({
  id: "2400",
  description: "837P Loop 2400 — Service Line (professional)",
  trigger: "LX",
  segments: [
    { id: "LX", usage: "required", max: 1 },
    { id: "SV1", usage: "required", max: 1 },
    { id: "DTP", usage: "situational", max: ">1" },
    { id: "REF", usage: "situational", max: ">1" },
    { id: "AMT", usage: "situational", max: ">1" },
    { id: "NTE", usage: "situational", max: ">1" },
    { id: "NM1", usage: "situational", max: ">1" },
  ],
  children: [CLAIM_837P_LOOP_2410, CLAIM_837_LOOP_2430],
});

/**
 * 837I Loop 2400 — Service Line (institutional). Body led by `SV2`
 * (revenue code + HCPCS).
 *
 * @example
 * ```ts
 * import { CLAIM_837I_LOOP_2400 } from "@cosyte/x12";
 * CLAIM_837I_LOOP_2400.trigger; // "LX"
 * ```
 */
export const CLAIM_837I_LOOP_2400: LoopSpec = defineLoopSpec({
  id: "2400",
  description: "837I Loop 2400 — Service Line (institutional)",
  trigger: "LX",
  segments: [
    { id: "LX", usage: "required", max: 1 },
    { id: "SV2", usage: "required", max: 1 },
    { id: "DTP", usage: "situational", max: ">1" },
    { id: "REF", usage: "situational", max: ">1" },
    { id: "AMT", usage: "situational", max: ">1" },
    { id: "NTE", usage: "situational", max: ">1" },
  ],
  children: [CLAIM_837_LOOP_2430],
});

/**
 * 837D Loop 2400 — Service Line (dental). Body led by `SV3`; per-line
 * `TOO` segments capture tooth + surface detail.
 *
 * @example
 * ```ts
 * import { CLAIM_837D_LOOP_2400 } from "@cosyte/x12";
 * CLAIM_837D_LOOP_2400.trigger; // "LX"
 * ```
 */
export const CLAIM_837D_LOOP_2400: LoopSpec = defineLoopSpec({
  id: "2400",
  description: "837D Loop 2400 — Service Line (dental)",
  trigger: "LX",
  segments: [
    { id: "LX", usage: "required", max: 1 },
    { id: "SV3", usage: "required", max: 1 },
    { id: "TOO", usage: "situational", max: 32 },
    { id: "DTP", usage: "situational", max: ">1" },
    { id: "REF", usage: "situational", max: ">1" },
    { id: "AMT", usage: "situational", max: ">1" },
    { id: "NTE", usage: "situational", max: ">1" },
  ],
  children: [CLAIM_837_LOOP_2430],
});

// ---------------------------------------------------------------------------
// Shared Loop 2300 (claim information) — children differ by variant.
// ---------------------------------------------------------------------------

/**
 * Build a Loop 2300 spec with a variant-specific Loop 2400 child. The
 * body of 2300 is identical across P/I/D for the segments Phase 5
 * surfaces; service-line nesting differs.
 *
 * @internal
 */
function makeLoop2300(loop2400: LoopSpec, variantLabel: string): LoopSpec {
  return defineLoopSpec({
    id: "2300",
    description: `837${variantLabel} Loop 2300 — Claim Information`,
    trigger: "CLM",
    segments: [
      { id: "CLM", usage: "required", max: 1 },
      { id: "DTP", usage: "situational", max: ">1" },
      { id: "PWK", usage: "situational", max: ">1" },
      { id: "CN1", usage: "situational", max: 1 },
      { id: "AMT", usage: "situational", max: ">1" },
      { id: "REF", usage: "situational", max: ">1" },
      { id: "NTE", usage: "situational", max: ">1" },
      { id: "HI", usage: "situational", max: ">1" },
      { id: "K3", usage: "situational", max: ">1" },
    ],
    children: [loop2400],
  });
}

/**
 * 837P Loop 2300 — Claim Information (professional). Triggered by `CLM`.
 * Nests {@link CLAIM_837P_LOOP_2400} (SV1-led service lines).
 *
 * @example
 * ```ts
 * import { CLAIM_837P_LOOP_2300 } from "@cosyte/x12";
 * CLAIM_837P_LOOP_2300.trigger; // "CLM"
 * ```
 */
export const CLAIM_837P_LOOP_2300: LoopSpec = makeLoop2300(CLAIM_837P_LOOP_2400, "P");

/**
 * 837I Loop 2300 — Claim Information (institutional). Triggered by `CLM`.
 * Nests {@link CLAIM_837I_LOOP_2400} (SV2-led service lines).
 *
 * @example
 * ```ts
 * import { CLAIM_837I_LOOP_2300 } from "@cosyte/x12";
 * CLAIM_837I_LOOP_2300.trigger; // "CLM"
 * ```
 */
export const CLAIM_837I_LOOP_2300: LoopSpec = makeLoop2300(CLAIM_837I_LOOP_2400, "I");

/**
 * 837D Loop 2300 — Claim Information (dental). Triggered by `CLM`.
 * Nests {@link CLAIM_837D_LOOP_2400} (SV3-led service lines).
 *
 * @example
 * ```ts
 * import { CLAIM_837D_LOOP_2300 } from "@cosyte/x12";
 * CLAIM_837D_LOOP_2300.trigger; // "CLM"
 * ```
 */
export const CLAIM_837D_LOOP_2300: LoopSpec = makeLoop2300(CLAIM_837D_LOOP_2400, "D");

// ---------------------------------------------------------------------------
// HL group loops 2000A / 2000B / 2000C.
// ---------------------------------------------------------------------------

/**
 * Build a Loop 2000C (Patient HL) spec carrying a variant-specific Loop
 * 2300. @internal
 */
function makeLoop2000C(loop2300: LoopSpec, variantLabel: string): LoopSpec {
  return defineLoopSpec({
    id: "2000C",
    description: `837${variantLabel} Loop 2000C — Patient Hierarchical Level`,
    trigger: "HL",
    segments: [
      { id: "HL", usage: "required", max: 1 },
      { id: "PAT", usage: "required", max: 1 },
    ],
    children: [CLAIM_837_LOOP_2010CA, loop2300],
  });
}

/**
 * Build a Loop 2000B (Subscriber HL) spec carrying the variant's Loop
 * 2000C + Loop 2300. @internal
 */
function makeLoop2000B(loop2300: LoopSpec, loop2000C: LoopSpec, variantLabel: string): LoopSpec {
  return defineLoopSpec({
    id: "2000B",
    description: `837${variantLabel} Loop 2000B — Subscriber Hierarchical Level`,
    trigger: "HL",
    segments: [
      { id: "HL", usage: "required", max: 1 },
      { id: "SBR", usage: "required", max: 1 },
      { id: "PAT", usage: "situational", max: 1 },
    ],
    children: [CLAIM_837_LOOP_2010BA, CLAIM_837_LOOP_2010BB, loop2000C, loop2300],
  });
}

/**
 * Build a Loop 2000A (Billing Provider HL) spec carrying the variant's
 * Loop 2010AA + Loop 2000B. @internal
 */
function makeLoop2000A(loop2000B: LoopSpec, variantLabel: string): LoopSpec {
  return defineLoopSpec({
    id: "2000A",
    description: `837${variantLabel} Loop 2000A — Billing Provider Hierarchical Level`,
    trigger: "HL",
    segments: [
      { id: "HL", usage: "required", max: 1 },
      { id: "PRV", usage: "situational", max: 1 },
      { id: "CUR", usage: "situational", max: 1 },
    ],
    children: [CLAIM_837_LOOP_2010AA, loop2000B],
  });
}

const PROFESSIONAL_2000C = makeLoop2000C(CLAIM_837P_LOOP_2300, "P");
const PROFESSIONAL_2000B = makeLoop2000B(CLAIM_837P_LOOP_2300, PROFESSIONAL_2000C, "P");

const INSTITUTIONAL_2000C = makeLoop2000C(CLAIM_837I_LOOP_2300, "I");
const INSTITUTIONAL_2000B = makeLoop2000B(CLAIM_837I_LOOP_2300, INSTITUTIONAL_2000C, "I");

const DENTAL_2000C = makeLoop2000C(CLAIM_837D_LOOP_2300, "D");
const DENTAL_2000B = makeLoop2000B(CLAIM_837D_LOOP_2300, DENTAL_2000C, "D");

/**
 * 837P Loop 2000A — Billing Provider Hierarchical Level (professional).
 * Top of the HL tree for professional claims. Nests Loop 2010AA (Billing
 * Provider Name) and Loop 2000B (Subscriber HL).
 *
 * @example
 * ```ts
 * import { CLAIM_837P_LOOP_2000A } from "@cosyte/x12";
 * CLAIM_837P_LOOP_2000A.id; // "2000A"
 * ```
 */
export const CLAIM_837P_LOOP_2000A: LoopSpec = makeLoop2000A(PROFESSIONAL_2000B, "P");

/**
 * 837I Loop 2000A — Billing Provider Hierarchical Level (institutional).
 *
 * @example
 * ```ts
 * import { CLAIM_837I_LOOP_2000A } from "@cosyte/x12";
 * CLAIM_837I_LOOP_2000A.id; // "2000A"
 * ```
 */
export const CLAIM_837I_LOOP_2000A: LoopSpec = makeLoop2000A(INSTITUTIONAL_2000B, "I");

/**
 * 837D Loop 2000A — Billing Provider Hierarchical Level (dental).
 *
 * @example
 * ```ts
 * import { CLAIM_837D_LOOP_2000A } from "@cosyte/x12";
 * CLAIM_837D_LOOP_2000A.id; // "2000A"
 * ```
 */
export const CLAIM_837D_LOOP_2000A: LoopSpec = makeLoop2000A(DENTAL_2000B, "D");

/**
 * 837 Loop 1000A — Submitter Name. Same across variants.
 *
 * @example
 * ```ts
 * import { CLAIM_837_LOOP_1000A } from "@cosyte/x12";
 * CLAIM_837_LOOP_1000A.id; // "1000A"
 * ```
 */
export const CLAIM_837_LOOP_1000A: LoopSpec = defineLoopSpec({
  id: "1000A",
  description: "837 Loop 1000A — Submitter Name",
  trigger: "NM1",
  segments: [
    { id: "NM1", usage: "required", max: 1 },
    { id: "PER", usage: "required", max: 2 },
  ],
});

/**
 * 837 Loop 1000B — Receiver Name. Same across variants.
 *
 * @example
 * ```ts
 * import { CLAIM_837_LOOP_1000B } from "@cosyte/x12";
 * CLAIM_837_LOOP_1000B.id; // "1000B"
 * ```
 */
export const CLAIM_837_LOOP_1000B: LoopSpec = defineLoopSpec({
  id: "1000B",
  description: "837 Loop 1000B — Receiver Name",
  trigger: "NM1",
  segments: [{ id: "NM1", usage: "required", max: 1 }],
});
