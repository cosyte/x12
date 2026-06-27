/**
 * Claim Adjustment Group Code (CAGC) — the spec-fixed 4-value code list
 * that lives on **`CAS-01`** (group code) for every CAS adjustment in an
 * 835 or in an 837 COB segment. **`CAGC` is the safety primitive that
 * tells a cash-poster who owes the unpaid balance** — patient vs. payer
 * vs. third party. Misreading the group code flips the bill to the wrong
 * party. Spec-fixed: this list never grows or churns (unlike WPC CARC /
 * RARC), so it ships as a frozen literal union, not as a snapshot.
 *
 * Spec source: X12 005010X221A1 TR3 §"CAS Claim Adjustment", Element
 * `CAS-01` (Code Source: X12 internal); ASC X12 Data Element 1033.
 */

/**
 * The 4 spec-fixed Claim Adjustment Group Codes. Frozen literal union via
 * `as const` so consumers compare `code === CLAIM_ADJUSTMENT_GROUP_CODES.PR`
 * and TypeScript narrows exhaustively.
 *
 * - `CO` — **Contractual Obligation.** The provider's contracted write-off
 *   (e.g. payer fee schedule below billed charges). **The PROVIDER eats
 *   this.** Posting `CO` to patient responsibility is the wrong-party bug.
 * - `PR` — **Patient Responsibility.** Patient deductible / coinsurance /
 *   copay / non-covered. **The PATIENT owes this.** This is the
 *   patient-statement total.
 * - `OA` — **Other Adjustment.** Used when neither CO nor PR fits —
 *   typically prior-payer payments, COB adjustments, withholding for
 *   refund. Use is fact-pattern-specific.
 * - `PI` — **Payer Initiated Reductions.** Payer-side reduction the
 *   provider may not dispute under the contract — e.g. bundling edits,
 *   prepayment review reductions.
 *
 * @example
 * ```ts
 * import { CLAIM_ADJUSTMENT_GROUP_CODES } from "@cosyte/x12";
 * function bucketFor(group: string): "provider" | "patient" | "other" | "payer-edit" | "unknown" {
 *   switch (group) {
 *     case CLAIM_ADJUSTMENT_GROUP_CODES.CO: return "provider";
 *     case CLAIM_ADJUSTMENT_GROUP_CODES.PR: return "patient";
 *     case CLAIM_ADJUSTMENT_GROUP_CODES.OA: return "other";
 *     case CLAIM_ADJUSTMENT_GROUP_CODES.PI: return "payer-edit";
 *     default: return "unknown";
 *   }
 * }
 * ```
 */
export const CLAIM_ADJUSTMENT_GROUP_CODES = {
  CO: "CO",
  PR: "PR",
  OA: "OA",
  PI: "PI",
} as const;

/**
 * Discriminant type for a known Claim Adjustment Group Code. Used to
 * narrow the `group` field on a parsed claim adjustment; unknown
 * inbound values keep the verbatim string (NEVER coerced) and consumers
 * can distinguish via `isClaimAdjustmentGroupCode`.
 *
 * @example
 * ```ts
 * import type { ClaimAdjustmentGroupCode } from "@cosyte/x12";
 * const code: ClaimAdjustmentGroupCode = "PR";
 * ```
 */
export type ClaimAdjustmentGroupCode =
  (typeof CLAIM_ADJUSTMENT_GROUP_CODES)[keyof typeof CLAIM_ADJUSTMENT_GROUP_CODES];

/**
 * Narrow an inbound CAS-01 string to a {@link ClaimAdjustmentGroupCode}.
 * `false` means the inbound code is not one of the 4 spec-defined values
 * (e.g. a typo `"CR"` from a quirky payer); the verbatim value is still
 * preserved on the parsed model, and the consumer can branch on the
 * narrow result.
 *
 * @example
 * ```ts
 * import { isClaimAdjustmentGroupCode } from "@cosyte/x12";
 * isClaimAdjustmentGroupCode("PR"); // true
 * isClaimAdjustmentGroupCode("CR"); // false (unknown)
 * ```
 */
export function isClaimAdjustmentGroupCode(value: string): value is ClaimAdjustmentGroupCode {
  return value in CLAIM_ADJUSTMENT_GROUP_CODES;
}
