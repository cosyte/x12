/**
 * 835 balance-invariant validators. Money is the largest blast radius in
 * a remit parser — a dropped decimal or a wrong-sign adjustment posts
 * cash to the wrong dollar. These checks NEVER silently rebalance: a
 * failed invariant emits an {@link
 * "../../parser/warnings.js".WARNING_CODES.X12_835_REMIT_BALANCE_MISMATCH}
 * carrying the side-by-side spec'd vs computed values + delta, and the
 * model still resolves with the verbatim inbound amounts.
 *
 * Three invariants per TR3 005010X221A1 §1.10.2 ("Balancing"):
 *
 * 1. **Service-line:** `SVC-02 === SVC-03 + Σ(line CAS amounts)` per
 *    Loop 2110 service line. "Submitted charge = paid + adjustments."
 *
 * 2. **Claim-level:** `CLP-03 === CLP-04 + Σ(all CAS in claim, claim AND
 *    line level)` per Loop 2100. The X12 spec balance — every adjustment
 *    inside the claim, regardless of whether it sits on the CLP loop
 *    directly or under a nested SVC. (CLP-05 / Patient Responsibility
 *    Amount is informational, NOT part of the balance — it equals
 *    `Σ(PR-group CAS)` separately; spec note in JSDoc on the per-claim
 *    check.)
 *
 * 3. **Top-of-remit:** `BPR-02 === Σ(CLP-04) - Σ(PLB amounts)` across
 *    every claim + every provider-level adjustment. PLB amounts carry
 *    the **raw EDI sign**: positive PLB = take-back from provider
 *    (reduces BPR-02), negative PLB = credit to provider (increases
 *    BPR-02). So subtraction is what makes the equation balance.
 *
 * > Phase 4 implementation note: the cosyte roadmap (`operations/roadmaps/x12.md`
 * > §4) sketched these invariants slightly differently — that sketch was a
 * > simplification. The implementation here matches the **X12 005010X221A1
 * > TR3 §1.10.2 spec text** directly; the roadmap is updated in the same
 * > slice with a forward-pointer to this module so the contract stays
 * > consistent.
 *
 * **PHI discipline:** mismatch messages echo only the invariant label +
 * the X12Decimal text values (numeric — no PHI by shape). Patient
 * control numbers / member ids are NOT in the message — consumers
 * locate the offending claim via the warning's `position` + the claim's
 * sequence in `remit.claims`.
 */

import { X12Decimal } from "../../decimal.js";
import { remitBalanceMismatch, type X12ParseWarning } from "../../parser/warnings.js";
import type { X12Position } from "../../parser/types.js";
import type {
  X12RemitAdjustment,
  X12RemitClaim,
  X12RemitProviderAdjustment,
  X12RemitServiceLine,
} from "./types.js";

/**
 * Check the claim-level invariant `CLP-03 === CLP-04 + Σ(all CAS in
 * claim, both claim and line level)`. Returns the warning when out of
 * balance, or `undefined` otherwise. Pure — no side effects.
 *
 * @example
 * ```ts
 * import { checkClaimBalance } from "@cosyte/x12";
 * declare const claim: X12RemitClaim;
 * const w = checkClaimBalance(claim, { segmentIndex: 12 });
 * if (w !== undefined) {
 *   // not balanced — w.message names invariant + spec + computed + delta
 * }
 * ```
 */
export function checkClaimBalance(
  claim: X12RemitClaim,
  position: X12Position,
): X12ParseWarning | undefined {
  const claimCasSum = sumAmounts(claim.adjustments);
  const lineCasSum = claim.serviceLines.reduce<X12Decimal>(
    (acc: X12Decimal, sl: X12RemitServiceLine) => acc.add(sumAmounts(sl.adjustments)),
    X12Decimal.ZERO,
  );
  const computed = claim.totalPaymentAmount.add(claimCasSum).add(lineCasSum);
  if (computed.equals(claim.totalChargeAmount)) return undefined;
  const delta = computed.subtract(claim.totalChargeAmount);
  return remitBalanceMismatch(
    position,
    "CLP-04 + Σ(claim CAS + line CAS) == CLP-03",
    claim.totalChargeAmount.toString(),
    computed.toString(),
    delta.toString(),
  );
}

/**
 * Check the per-service-line invariant `SVC-02 === SVC-03 + Σ(line CAS)`.
 * Returns one warning per out-of-balance service line. Header-only
 * adjudications (claims with zero service lines) produce no per-line
 * warning. Pure — no side effects.
 *
 * @example
 * ```ts
 * import { checkServiceLineBalance } from "@cosyte/x12";
 * declare const claim: X12RemitClaim;
 * const warnings = checkServiceLineBalance(claim, { segmentIndex: 14 });
 * ```
 */
export function checkServiceLineBalance(
  claim: X12RemitClaim,
  position: X12Position,
): readonly X12ParseWarning[] {
  const out: X12ParseWarning[] = [];
  for (let i = 0; i < claim.serviceLines.length; i += 1) {
    const line = claim.serviceLines[i];
    if (line === undefined) continue;
    const lineCasSum = sumAmounts(line.adjustments);
    const computed = line.paymentAmount.add(lineCasSum);
    if (computed.equals(line.chargeAmount)) continue;
    const delta = computed.subtract(line.chargeAmount);
    out.push(
      remitBalanceMismatch(
        { ...position, segmentIndex: position.segmentIndex + i + 1 },
        "SVC-03 + Σ(line CAS) == SVC-02",
        line.chargeAmount.toString(),
        computed.toString(),
        delta.toString(),
      ),
    );
  }
  return out;
}

/**
 * Check the top-of-remit invariant `BPR-02 === Σ(CLP-04) - Σ(PLB
 * amounts)`. PLB amounts are preserved with their **raw EDI sign**
 * (positive = take-back from provider; negative = credit to provider —
 * see {@link "./types.js".X12RemitProviderAdjustment}), so the
 * *subtraction* is what makes the equation balance. Returns the warning
 * when out of balance, or `undefined` when balanced.
 *
 * @example
 * ```ts
 * import { checkRemitTotalBalance } from "@cosyte/x12";
 * declare const remit: import("./types.js").X12Remittance;
 * const w = checkRemitTotalBalance(
 *   remit.payment.totalActualPayment,
 *   remit.claims,
 *   remit.providerAdjustments,
 *   { segmentIndex: 2, transactionIndex: 0 },
 * );
 * ```
 */
export function checkRemitTotalBalance(
  bpr02: X12Decimal,
  claims: readonly X12RemitClaim[],
  providerAdjustments: readonly X12RemitProviderAdjustment[],
  position: X12Position,
): X12ParseWarning | undefined {
  const claimSum = claims.reduce<X12Decimal>(
    (acc: X12Decimal, c: X12RemitClaim) => acc.add(c.totalPaymentAmount),
    X12Decimal.ZERO,
  );
  const plbSum = providerAdjustments.reduce<X12Decimal>(
    (acc: X12Decimal, p: X12RemitProviderAdjustment) => acc.add(p.amount),
    X12Decimal.ZERO,
  );
  const computed = claimSum.subtract(plbSum);
  if (computed.equals(bpr02)) return undefined;
  const delta = computed.subtract(bpr02);
  return remitBalanceMismatch(
    position,
    "Σ(CLP-04) - Σ(PLB amounts) == BPR-02",
    bpr02.toString(),
    computed.toString(),
    delta.toString(),
  );
}

/**
 * Sum a list of CAS adjustments. Helper for both claim-level + service-
 * line CAS aggregation. @internal
 */
function sumAmounts(adjustments: readonly X12RemitAdjustment[]): X12Decimal {
  return adjustments.reduce<X12Decimal>(
    (acc: X12Decimal, a: X12RemitAdjustment) => acc.add(a.amount),
    X12Decimal.ZERO,
  );
}
