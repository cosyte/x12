/**
 * Barrel for the 834 Benefit Enrollment and Maintenance surface — TR3
 * `005010X220A1`. The header reads synchronously via {@link get834Header};
 * the member-level detail streams via {@link get834Enrollments} (an
 * `AsyncIterable` — one member per `INS` loop). The loop specs are exported
 * so consumers can introspect or extend the hierarchy.
 *
 * @example
 * ```ts
 * import { parseX12, get834Header, get834Enrollments } from "@cosyte/x12";
 * const ix = parseX12(raw);
 * const tx = ix.groups[0]?.transactions.find((t) => t.st.elements[1] === "834");
 * if (tx !== undefined) {
 *   const header = get834Header(ix.delimiters, tx);
 *   header?.sponsor?.name;
 *   for await (const member of get834Enrollments(ix.delimiters, tx)) {
 *     member.maintenanceTypeCode;
 *   }
 * }
 * ```
 */

export { get834Enrollments, get834Header } from "./get-834.js";
export { build834 } from "./build-834.js";
export {
  ENROLLMENT_834_BUILD_ERROR_CODES,
  Enrollment834BuildError,
  type Enrollment834BuildErrorCode,
} from "./build-errors.js";
export type {
  Build834AddressSpec,
  Build834AmountSpec,
  Build834CoordinationOfBenefitsSpec,
  Build834CoverageSpec,
  Build834DateSpec,
  Build834EnvelopeSpec,
  Build834HeaderSpec,
  Build834MemberNameSpec,
  Build834MemberSpec,
  Build834PartySpec,
  Build834ReferenceSpec,
  Build834Spec,
} from "./build-834-types.js";
export {
  ENROLLMENT_834_LOOP_1000A,
  ENROLLMENT_834_LOOP_1000B,
  ENROLLMENT_834_LOOP_2000,
  ENROLLMENT_834_LOOP_2100A,
  ENROLLMENT_834_LOOP_2300,
  ENROLLMENT_834_LOOP_2320,
} from "./loop-spec.js";
export type {
  X12CoordinationOfBenefits,
  X12Enrollment,
  X12EnrollmentAddress,
  X12EnrollmentAmount,
  X12EnrollmentDate,
  X12EnrollmentHeader,
  X12EnrollmentMember,
  X12EnrollmentParty,
  X12EnrollmentReference,
  X12HealthCoverage,
} from "./types.js";
