/**
 * 835 balance-invariant validators. Money is the largest blast radius in
 * a remit parser - a dropped decimal or a wrong-sign adjustment posts
 * cash to the wrong dollar. These checks NEVER silently rebalance: a
 * failed invariant emits an {@link
 * "../../parser/warnings.js".WARNING_CODES.X12_835_REMIT_BALANCE_MISMATCH}
 * naming which TR3 equation broke, and the model still resolves with the
 * verbatim inbound amounts. The amounts themselves are NOT rendered into
 * the message: an EDI amount is a consumer-controlled element like any
 * other, and the spec'd / computed / delta trio used to be interpolated
 * unbounded. Recompute them from the model, which carries every one of
 * them as an `X12Decimal`.
 *
 * Three invariants per TR3 005010X221A1 §1.10.2 ("Balancing"):
 *
 * 1. **Service-line:** `SVC-02 === SVC-03 + Σ(line CAS amounts)` per
 *    Loop 2110 service line. "Submitted charge = paid + adjustments."
 *
 * 2. **Claim-level:** `CLP-03 === CLP-04 + Σ(all CAS in claim, claim AND
 *    line level)` per Loop 2100. The X12 spec balance - every adjustment
 *    inside the claim, regardless of whether it sits on the CLP loop
 *    directly or under a nested SVC. (CLP-05 / Patient Responsibility
 *    Amount is informational, NOT part of the balance - it equals
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
 * > §4) sketched these invariants slightly differently - that sketch was a
 * > simplification. The implementation here matches the **X12 005010X221A1
 * > TR3 §1.10.2 spec text** directly; the roadmap is updated in the same
 * > slice with a forward-pointer to this module so the contract stays
 * > consistent.
 *
 * **A term that did not decode makes the equation UNEVALUABLE, and that is a
 * third outcome, not a failure.** Every amount these three checks read is
 * `X12Decimal | undefined` on the model, and `undefined` means this library
 * decoded no value from that element. Where any term of an invariant is
 * `undefined` the check emits
 * {@link "../../parser/warnings.js".WARNING_CODES.X12_835_BALANCE_NOT_EVALUABLE}
 * and never `X12_835_REMIT_BALANCE_MISMATCH`: the mismatch code asserts a
 * computed inequality between amounts the sender supplied, and there is no
 * such computation to report. Substituting `0` for the absent term is what
 * this library did through `0.0.12`, and it made "the payer paid nothing"
 * and "the payer said nothing" the same reading. An EMPTY list of
 * adjustments is NOT that case: it sums to `X12Decimal.ZERO`, because a
 * claim carrying no CAS really did state no adjustments.
 *
 * **PHI discipline: the message names the equation and carries no value at
 * all**, not even an amount. An EDI amount is a consumer-controlled element
 * like any other: `CLP-03` is whatever the payer sent, so the spec'd /
 * computed / delta trio these messages used to interpolate was an unbounded
 * echo of sender bytes. Recompute the numbers from the model, which carries
 * every one of them as an `X12Decimal`.
 *
 * **Which claim, then?** Three different answers, one per invariant.
 *
 * - **Claim-level** ({@link checkClaimBalance}): `position.segmentIndex` is
 *   the CLP segment's own 1-based index inside the transaction body, so
 *   `tx.segments[position.segmentIndex]` is that exact CLP.
 * - **Service-line** ({@link checkServiceLineBalance}): that CLP index plus
 *   the line's zero-based ordinal plus one, which is a **unique locator, not
 *   a pointer at the SVC**. The segment sitting at that index is usually
 *   something else in the claim's loop. Read it as "the claim whose CLP is at
 *   `segmentIndex - (ordinal + 1)`, service line `ordinal`", or match against
 *   `remit.claims` and `claim.serviceLines`, which carry the decoded model.
 *   What the offset guarantees is non-collision across claims: a claim with
 *   `n` service lines spans at least `n + 1` body segments, so the next CLP
 *   always sits past the previous claim's last line position.
 * - **Remit-level** ({@link checkRemitTotalBalance}): `segmentIndex` is the
 *   **BPR's** own 1-based body index, so `tx.segments[position.segmentIndex]`
 *   is that exact BPR. The equation spans the whole transaction set, so no
 *   single segment is uniquely "at fault" - but BPR-02 is the one element the
 *   invariant compares against, and the BPR is the only segment a reader can
 *   act on. `get835` was passing a literal `0` here, and `0` is not a neutral
 *   sentinel: `tx.segments[0]` is the ST, so a consumer resolving the position
 *   landed on the ST. The one remaining `0` is the transaction that carries no
 *   BPR at all (malformed - TR3 005010X221A1 makes BPR mandatory - but
 *   reachable, since the check still runs against an all-zero payment header).
 *   Take the amounts from `remit.payment.totalActualPayment` and
 *   `remit.claims`; the message names the equation and carries no value.
 *
 * **A caller that constructs the position itself gets whatever it passes.**
 * These three functions are exported, and they do not derive a position - they
 * forward one. `build835` exploits that: it hands in a synthetic position
 * because it has no parsed segment stream to index into, and it uses only
 * `.message`, which is a registry lookup keyed by the invariant and therefore
 * position-independent.
 */

import { X12Decimal } from "../../decimal.js";
import {
  BALANCE_INVARIANTS,
  balanceNotEvaluable,
  remitBalanceMismatch,
  type X12ParseWarning,
} from "../../parser/warnings.js";
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
 * balance, or `undefined` otherwise. Pure - no side effects.
 *
 * @example
 * ```ts
 * import { checkClaimBalance } from "@cosyte/x12";
 * declare const claim: X12RemitClaim;
 * const w = checkClaimBalance(claim, { segmentIndex: 12 });
 * if (w !== undefined) {
 *   // not balanced - w.message names the TR3 equation; the amounts are on `claim`,
 *   // and w.position.segmentIndex is the CLP's own index in the transaction body
 * }
 * ```
 */
export function checkClaimBalance(
  claim: X12RemitClaim,
  position: X12Position,
): X12ParseWarning | undefined {
  const claimCasSum = sumAmounts(claim.adjustments);
  const lineCasSum = sumOptional(
    claim.serviceLines.map((sl: X12RemitServiceLine) => sumAmounts(sl.adjustments)),
  );
  const computed = sumOptional([claim.totalPaymentAmount, claimCasSum, lineCasSum]);
  if (computed === undefined || claim.totalChargeAmount === undefined) {
    return balanceNotEvaluable(position, BALANCE_INVARIANTS.CLAIM);
  }
  if (computed.equals(claim.totalChargeAmount)) return undefined;
  return remitBalanceMismatch(position, BALANCE_INVARIANTS.CLAIM);
}

/**
 * Check the per-service-line invariant `SVC-02 === SVC-03 + Σ(line CAS)`.
 * Returns one warning per out-of-balance service line. Header-only
 * adjudications (claims with zero service lines) produce no per-line
 * warning. Pure - no side effects.
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
    const linePosition = { ...position, segmentIndex: position.segmentIndex + i + 1 };
    const computed = sumOptional([line.paymentAmount, lineCasSum]);
    if (computed === undefined || line.chargeAmount === undefined) {
      out.push(balanceNotEvaluable(linePosition, BALANCE_INVARIANTS.SERVICE_LINE));
      continue;
    }
    if (computed.equals(line.chargeAmount)) continue;
    out.push(remitBalanceMismatch(linePosition, BALANCE_INVARIANTS.SERVICE_LINE));
  }
  return out;
}

/**
 * Check the top-of-remit invariant `BPR-02 === Σ(CLP-04) - Σ(PLB
 * amounts)`. PLB amounts are preserved with their **raw EDI sign**
 * (positive = take-back from provider; negative = credit to provider -
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
  bpr02: X12Decimal | undefined,
  claims: readonly X12RemitClaim[],
  providerAdjustments: readonly X12RemitProviderAdjustment[],
  position: X12Position,
): X12ParseWarning | undefined {
  const claimSum = sumOptional(claims.map((c: X12RemitClaim) => c.totalPaymentAmount));
  const plbSum = sumOptional(providerAdjustments.map((p: X12RemitProviderAdjustment) => p.amount));
  if (bpr02 === undefined || claimSum === undefined || plbSum === undefined) {
    return balanceNotEvaluable(position, BALANCE_INVARIANTS.REMIT_TOTAL);
  }
  const computed = claimSum.subtract(plbSum);
  if (computed.equals(bpr02)) return undefined;
  return remitBalanceMismatch(position, BALANCE_INVARIANTS.REMIT_TOTAL);
}

/**
 * Sum a list of CAS adjustments. Helper for both claim-level + service-
 * line CAS aggregation. @internal
 */
function sumAmounts(adjustments: readonly X12RemitAdjustment[]): X12Decimal | undefined {
  return sumOptional(adjustments.map((a: X12RemitAdjustment) => a.amount));
}

/**
 * Add a list of terms, answering `undefined` the moment ONE of them is
 * `undefined`. An empty list sums to `X12Decimal.ZERO`, which is the
 * additive identity and not a stand-in for anything: a claim with no CAS
 * adjustments really did state no adjustments, whereas a CAS triple whose
 * amount element did not decode states nothing about its amount. Those are
 * different facts and only the second one poisons the equation.
 * @internal
 */
function sumOptional(terms: readonly (X12Decimal | undefined)[]): X12Decimal | undefined {
  let acc = X12Decimal.ZERO;
  for (const term of terms) {
    if (term === undefined) return undefined;
    acc = acc.add(term);
  }
  return acc;
}
