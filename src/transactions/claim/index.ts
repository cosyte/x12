/**
 * Barrel for the 837 Healthcare Claim surface - TR3s `005010X222A2` (P),
 * `005010X223A3` (I), `005010X224A2` (D). The public entry point is
 * {@link get837Claims}; types surface the typed result shape; the loop
 * specs are exported so consumers can introspect or extend them.
 *
 * @example
 * ```ts
 * import { parseX12, get837Claims } from "@cosyte/x12";
 * const ix = parseX12(raw);
 * const tx = ix.groups[0]?.transactions.find((t) => t.st.elements[1] === "837");
 * const sub = tx === undefined ? undefined : get837Claims(ix.delimiters, tx);
 * for (const claim of sub?.claims ?? []) {
 *   claim.totalCharge.toString();
 *   claim.diagnoses[0]?.codeSystem; // "ICD-10-CM" / "ICD-10-PCS" / ...
 * }
 * ```
 */

export { HL_LEVEL_CODES, NM1_QUALIFIERS, get837Claims } from "./get-837.js";
export { build837D, build837I, build837P } from "./build-837.js";
export {
  CLAIM_837_BUILD_ERROR_CODES,
  Claim837BuildError,
  type Claim837BuildErrorCode,
} from "./build-errors.js";
export type {
  Build837AddressSpec,
  Build837AdjudicationSpec,
  Build837AdjustmentSpec,
  Build837AmountSpec,
  Build837BillingProviderSpec,
  Build837ClaimSpec,
  Build837ContactSpec,
  Build837DateSpec,
  Build837DrugSpec,
  Build837EntitySpec,
  Build837EnvelopeSpec,
  Build837HiCodeSpec,
  Build837NoteSpec,
  Build837OtherSubscriberSpec,
  Build837PatientSpec,
  Build837ReferenceSpec,
  Build837ServiceLineBaseSpec,
  Build837ServiceLineDentalSpec,
  Build837ServiceLineInstitutionalSpec,
  Build837ServiceLineProfessionalSpec,
  Build837ServiceLineSpec,
  Build837Spec,
  Build837SubscriberInfoSpec,
  Build837SubscriberSpec,
  Build837ToothSpec,
} from "./build-837-types.js";
export {
  CLAIM_837D_LOOP_2000A,
  CLAIM_837D_LOOP_2300,
  CLAIM_837D_LOOP_2400,
  CLAIM_837I_LOOP_2000A,
  CLAIM_837I_LOOP_2300,
  CLAIM_837I_LOOP_2400,
  CLAIM_837P_LOOP_2000A,
  CLAIM_837P_LOOP_2300,
  CLAIM_837P_LOOP_2400,
  CLAIM_837P_LOOP_2410,
  CLAIM_837_LOOP_1000A,
  CLAIM_837_LOOP_1000B,
  CLAIM_837_LOOP_2010AA,
  CLAIM_837_LOOP_2010BA,
  CLAIM_837_LOOP_2010BB,
  CLAIM_837_LOOP_2010CA,
  CLAIM_837_LOOP_2430,
} from "./loop-spec.js";
export type {
  X12Claim,
  X12ClaimAddress,
  X12ClaimAmount,
  X12ClaimContact,
  X12ClaimDate,
  X12ClaimEntity,
  X12ClaimHiCode,
  X12ClaimMember,
  X12ClaimNote,
  X12ClaimReference,
  X12Claim837Variant,
  X12HierarchicalLevel,
  X12LineAdjudication,
  X12LineDrug,
  X12OtherSubscriber,
  X12SubscriberInfo,
  X12ToothInformation,
  X12_837ServiceLine,
  X12_837ServiceLineBase,
  X12_837ServiceLineDental,
  X12_837ServiceLineInstitutional,
  X12_837ServiceLineProfessional,
  X12_837Submission,
} from "./types.js";
