/**
 * **Claim Status Category Code (CSCC)** — X12 external code source 507.
 * The first component of an `STC-01` (and `STC-10` / `STC-11`) composite
 * in a 277 Claim Status Response (`005010X212`) or 277CA Claim
 * Acknowledgment (`005010X214`). The CSCC is the *category* of a claim's
 * status — acknowledged, pending, finalized, returned, error. Paired with
 * a {@link "./claim-status.js".CLAIM_STATUS_CODES} (CSC) that carries the
 * specific status detail.
 *
 * **Safety:** the CSCC `A`-family (`A1`..`A8`) distinguishes *accepted into
 * adjudication* (`A2`) from *rejected / returned unprocessable* (`A3`,
 * `A6`, `A7`, `A8`). Misreading a category flips a rejected claim to an
 * accepted one in a provider's follow-up workflow — a real
 * cash-flow / timely-filing hazard. The parser surfaces the verbatim CSCC
 * and never derives an accept/reject boolean (that interpretation belongs
 * to the consumer's business rules).
 *
 * Spec source: ASC X12 / Washington Publishing Company "Claim Status
 * Category Codes" (Code Source 507), as referenced by TR3s 005010X212 and
 * 005010X214. WPC updates this list periodically (roughly thrice yearly).
 */

import { makeLookup, type CodeListEntry, type CodeListSnapshot } from "./meta.js";

/**
 * Bundled Claim Status Category Code (CSCC) snapshot. Used by the 277 and
 * 277CA helpers to surface a human-readable category alongside each
 * verbatim CSCC parsed from an STC composite.
 *
 * @example
 * ```ts
 * import { CLAIM_STATUS_CATEGORY_CODES } from "@cosyte/x12";
 * CLAIM_STATUS_CATEGORY_CODES.codes["A2"]; // "Acknowledgement/Acceptance into adjudication system"
 * CLAIM_STATUS_CATEGORY_CODES.codes["F2"]; // "Finalized/Denial"
 * ```
 */
export const CLAIM_STATUS_CATEGORY_CODES: CodeListSnapshot = Object.freeze({
  meta: Object.freeze({
    id: "CLAIM-STATUS-CATEGORY",
    description: "277/277CA STC Claim Status Category Code (X12 external code source 507)",
    source:
      "ASC X12 / WPC Claim Status Category Codes (Code Source 507); referenced by TR3 005010X212 + 005010X214",
    publishedDate: "2023-11-01",
    snapshotDate: "2026-06-27",
    note: "Common A/P/F/D/E-family subset; WPC-maintained list refreshed on the Phase 10 release cadence, never at runtime.",
  }),
  codes: Object.freeze({
    A0: "Acknowledgement/Forwarded - The claim/encounter has been forwarded to another entity.",
    A1: "Acknowledgement/Receipt - The claim/encounter has been received.",
    A2: "Acknowledgement/Acceptance into adjudication system - The claim/encounter has been accepted.",
    A3: "Acknowledgement/Returned as unprocessable claim - The claim/encounter has been rejected and has not been entered into the adjudication system.",
    A4: "Acknowledgement/Not Found - The claim/encounter cannot be found in the adjudication system.",
    A5: "Acknowledgement/Split Claim - The claim/encounter has been split upon acceptance into the adjudication system.",
    A6: "Acknowledgement/Rejected for Missing Information.",
    A7: "Acknowledgement/Rejected for Invalid Information.",
    A8: "Acknowledgement/Rejected for relational field in error.",
    D0: "Data Search Unsuccessful - The payer is unable to return status on the requested claim(s).",
    E0: "Response not possible - error on submitted request data.",
    E1: "Response not possible - System Status.",
    E2: "Information Holder is not responding; resubmit at a later time.",
    E3: "Correction required - relational fields in error.",
    E4: "Trading partner agreement specific requirement not met.",
    F0: "Finalized - The claim/encounter has completed the adjudication cycle and no more action will be taken.",
    F1: "Finalized/Payment - The claim/line has been paid.",
    F2: "Finalized/Denial - The claim/line has been denied.",
    F3: "Finalized/Revised - Adjudication information has been changed.",
    F3F: "Finalized/Forwarded - The claim/encounter processing has been completed. Any payment information is forwarded with this transaction.",
    F4: "Finalized/Adjudication Complete - No payment forthcoming.",
    P0: "Pending - The claim/encounter is in the adjudication system but no decision has been made.",
    P1: "Pending/In Process - The claim or encounter is in the adjudication system.",
    P2: "Pending/Payer Review - The claim/encounter is suspended and is pending review.",
    P3: "Pending/Provider Requested Information - The claim or encounter is waiting for information that has already been requested from the provider.",
    P4: "Pending/Patient Requested Information - The claim or encounter is waiting for information that has already been requested from the patient/subscriber.",
    P5: "Pending/Payer Administrative/System hold.",
    R0: "Requests for additional Information - General requests.",
    R1: "Requests for additional Information - Entity Information.",
  }),
});

/**
 * Look up a Claim Status Category Code (CSCC) description from the bundled
 * snapshot. Returns `undefined` for codes outside the subset; the verbatim
 * code is always preserved on the parsed status model.
 *
 * @example
 * ```ts
 * import { lookupClaimStatusCategory } from "@cosyte/x12";
 * lookupClaimStatusCategory("A2")?.description; // "Acknowledgement/Acceptance..."
 * lookupClaimStatusCategory("ZZ");              // undefined (outside subset)
 * ```
 */
export const lookupClaimStatusCategory: (code: string) => CodeListEntry | undefined = makeLookup(
  CLAIM_STATUS_CATEGORY_CODES,
);
