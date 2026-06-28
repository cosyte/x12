/**
 * Public entry point for the `@cosyte/x12` package. Phase 1 lands the
 * envelope decoder (ISA / GS / GE / IEA + delimiter detection); Phase 2+
 * adds segment/element/composite decode, the warning-code registry
 * expansion, and the public `defineLoopSpec`. Per-transaction helpers
 * (`get835`, `get837Claims`, ...) arrive in Phases 4+.
 */

/**
 * Library version string, synced with `package.json#version` at build
 * time by downstream phases. Exported now so consumers (and the
 * type-check pipeline) have at least one symbol to resolve through the
 * `exports` map.
 *
 * @example
 * ```ts
 * import { VERSION } from "@cosyte/x12";
 * console.log(VERSION);
 * ```
 */
export const VERSION: string = "0.0.0";

// Phase 1 — envelope parser surface.
export { parseX12 } from "./parser/index.js";
export { detectDelimiters, DELIMITER_POSITIONS, ISA_MIN_LENGTH } from "./parser/delimiters.js";
export { FATAL_CODES, X12ParseError } from "./parser/errors.js";
export type { X12FatalCode } from "./parser/errors.js";
export {
  WARNING_CODES,
  controlNumberMismatch,
  danglingReleaseChar,
  groupCountMismatch,
  hlParentLevelInvalid,
  hlParentMismatch,
  missingGe,
  missingIea,
  missingRequiredLoop,
  missingSe,
  pre005010,
  remitBalanceMismatch,
  trailingGarbage,
  transactionCountMismatch,
  unexpectedSegment,
  unknown837Variant,
  unknownCarc,
  unknownClaimStatus,
  unknownClaimStatusCategory,
  unknownHiQualifier,
  unknownMaintenanceType,
  unknownRarc,
} from "./parser/warnings.js";
export type { X12ParseWarning, X12WarningCode } from "./parser/warnings.js";
export type {
  Delimiters,
  GeSegment,
  GsSegment,
  IeaSegment,
  IsaSegment,
  OnWarningCallback,
  Ta1Segment,
  X12FunctionalGroup,
  X12Interchange,
  X12ParseOptions,
  X12Position,
  X12TransactionSet,
} from "./parser/types.js";

// Phase 2 — segment / element / composite / repetition decode surface.
export { escapeRelease, RELEASE_CHAR, unescapeRelease } from "./parser/release.js";
export {
  collectElementValues,
  componentOptional,
  decodeSegment,
  elementDecimal,
  elementDecimalOrZero,
  elementOptional,
  elementValue,
  getAllSegmentValues,
  getSegmentValue,
} from "./parser/segment.js";
export type { X12Segment } from "./parser/segment.js";

// Phase 2 — loop-spec authoring surface (dogfooded by built-in transaction
// specs in Phases 3+).
export { defineLoopSpec, LoopSpecDefinitionError } from "./loops/define.js";
export type { DefineLoopSpecInput } from "./loops/define.js";
export type { LoopMax, LoopSegmentSpec, LoopSpec, LoopUsage } from "./loops/types.js";

// Phase 4 — money + bundled code-list snapshots used by 835.
export { X12Decimal } from "./decimal.js";
export {
  CARC,
  CLAIM_ADJUSTMENT_GROUP_CODES,
  CLAIM_STATUS_CATEGORY_CODES,
  CLAIM_STATUS_CODES,
  CLP_STATUS,
  MAINTENANCE_TYPE_CODES,
  RARC,
  HI_QUALIFIERS,
  SERVICE_TYPE_CODES,
  isClaimAdjustmentGroupCode,
  isDiagnosisQualifier,
  isProcedureQualifier,
  lookupCarc,
  lookupClaimStatus,
  lookupClaimStatusCategory,
  lookupClpStatus,
  lookupMaintenanceType,
  lookupRarc,
  lookupServiceType,
  resolveHiQualifier,
  type ClaimAdjustmentGroupCode,
  type CodeListEntry,
  type CodeListMeta,
  type CodeListSnapshot,
  type X12HiCategory,
  type X12HiCodeSystem,
  type X12HiQualifier,
} from "./code-lists/index.js";

// Phase 4 — 835 Healthcare Claim Payment/Advice (ERA) surface (TR3 005010X221A1).
export {
  REMIT_835_LOOP_1000A,
  REMIT_835_LOOP_1000B,
  REMIT_835_LOOP_2000,
  REMIT_835_LOOP_2100,
  REMIT_835_LOOP_2110,
  checkClaimBalance,
  checkRemitTotalBalance,
  checkServiceLineBalance,
  get835,
  type X12RemitAddress,
  type X12RemitAdjustment,
  type X12RemitAmount,
  type X12RemitClaim,
  type X12RemitContact,
  type X12RemitParty,
  type X12RemitPaymentHeader,
  type X12RemitPerson,
  type X12RemitProvider,
  type X12RemitProviderAdjustment,
  type X12RemitReference,
  type X12RemitRemark,
  type X12RemitServiceLine,
  type X12RemitTrace,
  type X12Remittance,
} from "./transactions/remit/index.js";

// Phase 5 — 837 Healthcare Claim surface (TR3s 005010X222A2 / X223A3 / X224A2).
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
  HL_LEVEL_CODES,
  NM1_QUALIFIERS,
  get837Claims,
  type X12Claim,
  type X12Claim837Variant,
  type X12ClaimAddress,
  type X12ClaimAmount,
  type X12ClaimContact,
  type X12ClaimDate,
  type X12ClaimEntity,
  type X12ClaimHiCode,
  type X12ClaimMember,
  type X12ClaimNote,
  type X12ClaimReference,
  type X12HierarchicalLevel,
  type X12LineAdjudication,
  type X12LineDrug,
  type X12OtherSubscriber,
  type X12SubscriberInfo,
  type X12ToothInformation,
  type X12_837ServiceLine,
  type X12_837ServiceLineDental,
  type X12_837ServiceLineInstitutional,
  type X12_837ServiceLineProfessional,
  type X12_837Submission,
} from "./transactions/claim/index.js";

// Phase 6 — 271 Health Care Eligibility Benefit Response surface (TR3 005010X279A1).
export {
  ELIGIBILITY_271_LOOP_2000A,
  ELIGIBILITY_271_LOOP_2000B,
  ELIGIBILITY_271_LOOP_2000C,
  ELIGIBILITY_271_LOOP_2000D,
  ELIGIBILITY_271_LOOP_2100C,
  ELIGIBILITY_271_LOOP_2100D,
  ELIGIBILITY_271_LOOP_2110,
  get271Eligibility,
  type X12Eligibility,
  type X12EligibilityAddress,
  type X12EligibilityBenefit,
  type X12EligibilityDate,
  type X12EligibilityDependent,
  type X12EligibilityEntity,
  type X12EligibilityMember,
  type X12EligibilityReference,
  type X12EligibilityServiceType,
  type X12EligibilitySubscriber,
  type X12EligibilityTrace,
} from "./transactions/eligibility/index.js";

// Phase 6 — 277 / 277CA Claim Status surface (TR3s 005010X212 / X214).
export {
  STATUS_277_LOOP_2000A,
  STATUS_277_LOOP_2000B,
  STATUS_277_LOOP_2000C,
  STATUS_277_LOOP_2000D,
  STATUS_277_LOOP_2000E,
  STATUS_277_LOOP_2200,
  STATUS_277_LOOP_2220,
  get277CADisposition,
  get277Status,
  type X12ClaimStatus,
  type X12ClaimStatusResponse,
  type X12ServiceLineStatus,
  type X12StatusCode,
  type X12StatusDate,
  type X12StatusEntity,
  type X12StatusInfo,
  type X12StatusMember,
  type X12StatusReference,
  type X12StatusTrace,
} from "./transactions/status/index.js";

// Phase 7 — 820 Premium Payment surface (TR3 005010X218).
export {
  PREMIUM_820_LOOP_1000A,
  PREMIUM_820_LOOP_1000B,
  PREMIUM_820_LOOP_2000A,
  PREMIUM_820_LOOP_2100A,
  PREMIUM_820_LOOP_2300A,
  PREMIUM_820_LOOP_2310A,
  get820Payments,
  type X12PremiumAddress,
  type X12PremiumAdjustment,
  type X12PremiumDate,
  type X12PremiumEntity,
  type X12PremiumOpenItem,
  type X12PremiumParty,
  type X12PremiumPaymentHeader,
  type X12PremiumPayments,
  type X12PremiumPerson,
  type X12PremiumReference,
  type X12PremiumRemittance,
  type X12PremiumTrace,
} from "./transactions/premium/index.js";

// Phase 7 — 834 Benefit Enrollment and Maintenance surface (TR3 005010X220A1).
export {
  ENROLLMENT_834_LOOP_1000A,
  ENROLLMENT_834_LOOP_1000B,
  ENROLLMENT_834_LOOP_2000,
  ENROLLMENT_834_LOOP_2100A,
  ENROLLMENT_834_LOOP_2300,
  ENROLLMENT_834_LOOP_2320,
  get834Enrollments,
  get834Header,
  type X12CoordinationOfBenefits,
  type X12Enrollment,
  type X12EnrollmentAddress,
  type X12EnrollmentAmount,
  type X12EnrollmentDate,
  type X12EnrollmentHeader,
  type X12EnrollmentMember,
  type X12EnrollmentParty,
  type X12EnrollmentReference,
  type X12HealthCoverage,
} from "./transactions/enrollment/index.js";

// Phase 7 — 278 Health Care Services Review surface (request TR3 005010X217 /
// response TR3 005010X216).
export {
  AUTH_278_LOOP_2000A,
  AUTH_278_LOOP_2000B,
  AUTH_278_LOOP_2000C,
  AUTH_278_LOOP_2000D,
  AUTH_278_LOOP_2000E,
  AUTH_278_LOOP_2000F,
  get278Request,
  get278Response,
  type X12AuthDate,
  type X12AuthDiagnosis,
  type X12AuthEntity,
  type X12AuthHeader,
  type X12AuthMember,
  type X12AuthReference,
  type X12AuthTrace,
  type X12ReviewDecision,
  type X12ServiceReview,
  type X12ServicesReview,
} from "./transactions/auth/index.js";

// Phase 6 — shared HL hierarchy primitive (271 / 277 / 277CA walkers).
export type { X12Hl } from "./transactions/shared/hl.js";

// Phase 3 — acknowledgments surface: parse / build 999 (005010X231A1) and
// envelope-level TA1 as pure functions. See `src/transactions/ack/index.ts`
// for the full barrel.
export {
  ACK_BUILD_ERROR_CODES,
  AckBuildError,
  IK3_SYNTAX_ERROR_CODES,
  IK4_SYNTAX_ERROR_CODES,
  TA1_ACK_CODES,
  TA1_NOTE_CODES,
  X12_ACK_DISPOSITION_CODES,
  build999,
  buildTA1,
  isAcceptDisposition,
  parse999,
  parseTA1,
  type AckBuildErrorCode,
  type Build999ElementErrorSpec,
  type Build999EnvelopeSpec,
  type Build999FunctionalGroupSpec,
  type Build999SegmentErrorSpec,
  type Build999Spec,
  type Build999TransactionResponseSpec,
  type BuildTA1Options,
  type BuildTA1Spec,
  type Ik304Code,
  type Ik403Code,
  type Ta1AckCode,
  type Ta1NoteCode,
  type X12Ack999,
  type X12Ack999Ak1,
  type X12Ack999Ak2,
  type X12Ack999Ak9,
  type X12Ack999ElementNote,
  type X12Ack999Ik3,
  type X12Ack999Ik4,
  type X12Ack999Ik4Position,
  type X12Ack999Ik5,
  type X12Ack999SegmentNote,
  type X12Ack999TransactionResponse,
  type X12AckDispositionCode,
  type X12AckTA1,
} from "./transactions/ack/index.js";
