/**
 * Barrel for the 820 Payroll Deducted and Other Group Premium Payment
 * surface - TR3 `005010X218`. The public entry point is
 * {@link get820Payments}; types surface the typed result shape; the loop
 * specs are exported so consumers can introspect or extend the hierarchy.
 *
 * @example
 * ```ts
 * import { parseX12, get820Payments } from "@cosyte/x12";
 * const ix = parseX12(raw);
 * const tx = ix.groups[0]?.transactions.find((t) => t.st.elements[1] === "820");
 * const prem = tx === undefined ? undefined : get820Payments(ix.delimiters, tx);
 * prem?.payment.totalPremiumAmount.toString();
 * ```
 */

export { get820Payments } from "./get-820.js";
export { build820 } from "./build-820.js";
export {
  PREMIUM_820_BUILD_ERROR_CODES,
  Premium820BuildError,
  type Premium820BuildErrorCode,
} from "./build-errors.js";
export type {
  Build820AddressSpec,
  Build820AdjustmentSpec,
  Build820DateSpec,
  Build820EntitySpec,
  Build820EnvelopeSpec,
  Build820OpenItemSpec,
  Build820PartySpec,
  Build820PaymentSpec,
  Build820PersonSpec,
  Build820ReferenceSpec,
  Build820RemittanceSpec,
  Build820Spec,
  Build820TraceSpec,
} from "./build-820-types.js";
export {
  PREMIUM_820_LOOP_1000A,
  PREMIUM_820_LOOP_1000B,
  PREMIUM_820_LOOP_2000A,
  PREMIUM_820_LOOP_2100A,
  PREMIUM_820_LOOP_2300A,
  PREMIUM_820_LOOP_2310A,
} from "./loop-spec.js";
export type {
  X12PremiumAddress,
  X12PremiumAdjustment,
  X12PremiumDate,
  X12PremiumEntity,
  X12PremiumOpenItem,
  X12PremiumParty,
  X12PremiumPaymentHeader,
  X12PremiumPayments,
  X12PremiumPerson,
  X12PremiumReference,
  X12PremiumRemittance,
  X12PremiumTrace,
} from "./types.js";
