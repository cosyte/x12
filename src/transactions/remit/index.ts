/**
 * Barrel for the 835 Healthcare Claim Payment/Advice (ERA) surface — TR3
 * `005010X221A1`. The public entry point is {@link get835}; types
 * surface the typed result shape; the loop spec is exported so consumers
 * can introspect or extend it. {@link build835} is the emit counterpart —
 * it REFUSES an out-of-balance spec rather than emit a cash-posting hazard.
 *
 * @example
 * ```ts
 * import { parseX12, get835 } from "@cosyte/x12";
 * const ix = parseX12(raw);
 * const tx = ix.groups[0]?.transactions.find((t) => t.st.elements[1] === "835");
 * const remit = tx === undefined ? undefined : get835(ix.delimiters, tx);
 * remit?.payment.totalActualPayment.toString();
 * ```
 */

export { get835 } from "./get-835.js";
export { build835 } from "./build-835.js";
export {
  REMIT_835_BUILD_ERROR_CODES,
  Remit835BuildError,
  type Remit835BuildErrorCode,
} from "./build-errors.js";
export type {
  Build835AddressSpec,
  Build835AdjustmentSpec,
  Build835AmountSpec,
  Build835ClaimSpec,
  Build835ContactSpec,
  Build835EnvelopeSpec,
  Build835PartySpec,
  Build835PaymentSpec,
  Build835PersonSpec,
  Build835ProviderAdjustmentSpec,
  Build835ProviderSpec,
  Build835ReferenceSpec,
  Build835RemarkSpec,
  Build835ServiceLineSpec,
  Build835Spec,
  Build835TraceSpec,
} from "./build-835-types.js";
export {
  REMIT_835_LOOP_1000A,
  REMIT_835_LOOP_1000B,
  REMIT_835_LOOP_2000,
  REMIT_835_LOOP_2100,
  REMIT_835_LOOP_2110,
} from "./loop-spec.js";
export { checkClaimBalance, checkRemitTotalBalance, checkServiceLineBalance } from "./balance.js";
export type {
  X12RemitAdjustment,
  X12RemitAddress,
  X12RemitAmount,
  X12RemitClaim,
  X12RemitContact,
  X12RemitParty,
  X12RemitPaymentHeader,
  X12RemitPerson,
  X12RemitProvider,
  X12RemitProviderAdjustment,
  X12RemitReference,
  X12RemitRemark,
  X12RemitServiceLine,
  X12RemitTrace,
  X12Remittance,
} from "./types.js";
