/**
 * Re-derive a {@link Build276Spec} from a decoded {@link X12StatusInquiry}, so
 * a document read off the wire can be emitted again.
 *
 * Shared by `test/transactions-status-276-build.test.ts` (which uses it for the
 * golden byte-for-byte reproduction) and
 * `test/property/inquiry-round-trip.property.test.ts` (which uses it for the
 * fixed point). One copy, so the two cannot drift into asserting different
 * mappings and each calling the other's the round trip.
 *
 * **Every optional field is spread conditionally rather than written as
 * `undefined`**: the package compiles with `exactOptionalPropertyTypes`, so an
 * explicit `undefined` is a different thing from an absent key, and only the
 * absent key means "the sender said nothing".
 *
 * The HL spine is deliberately NOT carried across. The builder owns it and
 * recomputes every HL-01, HL-02 and HL-04 from the nested tree, which is what
 * makes an inconsistent hierarchy unrepresentable; a spec that carried the
 * decoded pointers would be able to smuggle one back in.
 */

import type {
  Build276ClaimSpec,
  Build276DateSpec,
  Build276NameSpec,
  Build276ReferenceSpec,
  Build276ServiceLineSpec,
  Build276Spec,
  Build276TraceSpec,
  X12StatusInquiry,
  X12StatusInquiryClaim,
  X12StatusInquiryDate,
  X12StatusInquiryName,
  X12StatusInquiryReference,
  X12StatusInquiryServiceLine,
  X12StatusInquiryTrace,
} from "../../src/index.js";

export function nameSpec(name: X12StatusInquiryName | undefined): Build276NameSpec {
  if (name === undefined) throw new Error("status-inquiry-spec: a level came back with no name");
  return {
    entityIdentifierCode: name.entityIdentifierCode,
    entityTypeQualifier: name.entityTypeQualifier,
    ...(name.lastNameOrOrganizationName === undefined
      ? {}
      : { lastNameOrOrganizationName: name.lastNameOrOrganizationName }),
    ...(name.firstName === undefined ? {} : { firstName: name.firstName }),
    ...(name.middleName === undefined ? {} : { middleName: name.middleName }),
    ...(name.suffix === undefined ? {} : { suffix: name.suffix }),
    ...(name.idQualifier === undefined ? {} : { idQualifier: name.idQualifier }),
    ...(name.idCode === undefined ? {} : { idCode: name.idCode }),
    ...(name.dateOfBirth === undefined ? {} : { dateOfBirth: name.dateOfBirth }),
    ...(name.genderCode === undefined ? {} : { genderCode: name.genderCode }),
  };
}

export function traceSpec(trace: X12StatusInquiryTrace | undefined): Build276TraceSpec {
  if (trace === undefined) throw new Error("status-inquiry-spec: a claim came back with no trace");
  return {
    traceTypeCode: trace.traceTypeCode,
    referenceId: trace.referenceId,
    ...(trace.originatingCompanyId === undefined
      ? {}
      : { originatingCompanyId: trace.originatingCompanyId }),
    ...(trace.supplementalReferenceId === undefined
      ? {}
      : { supplementalReferenceId: trace.supplementalReferenceId }),
  };
}

export function referenceSpec(ref: X12StatusInquiryReference): Build276ReferenceSpec {
  return {
    qualifier: ref.qualifier,
    value: ref.value,
    ...(ref.description === undefined ? {} : { description: ref.description }),
  };
}

export function dateSpec(date: X12StatusInquiryDate): Build276DateSpec {
  return { qualifier: date.qualifier, formatQualifier: date.formatQualifier, value: date.value };
}

export function serviceLineSpec(line: X12StatusInquiryServiceLine): Build276ServiceLineSpec {
  return {
    ...(line.procedure === undefined
      ? {}
      : {
          procedure: {
            qualifier: line.procedure.qualifier,
            ...(line.procedure.code === undefined ? {} : { code: line.procedure.code }),
            modifiers: [...line.procedure.modifiers],
            ...(line.procedure.description === undefined
              ? {}
              : { description: line.procedure.description }),
          },
        }),
    ...(line.lineChargeAmount === undefined ? {} : { lineChargeAmount: line.lineChargeAmount }),
    ...(line.revenueCode === undefined ? {} : { revenueCode: line.revenueCode }),
    ...(line.unitsOfService === undefined ? {} : { unitsOfService: line.unitsOfService }),
    references: line.references.map(referenceSpec),
    dates: line.dates.map(dateSpec),
  };
}

export function claimSpec(claim: X12StatusInquiryClaim): Build276ClaimSpec {
  return {
    trace: traceSpec(claim.trace),
    references: claim.references.map(referenceSpec),
    amounts: claim.amounts.map((a) => ({ qualifier: a.qualifier, amount: a.amount })),
    dates: claim.dates.map(dateSpec),
    serviceLines: claim.serviceLines.map(serviceLineSpec),
  };
}

/** Re-derive the build spec from a decoded model, so the emit can be re-run. */
export function specFromModel(
  model: X12StatusInquiry,
  envelope: Build276Spec["envelope"],
): Build276Spec {
  return {
    envelope,
    ...(model.header === undefined
      ? {}
      : {
          header: {
            hierarchicalStructureCode: model.header.hierarchicalStructureCode,
            purposeCode: model.header.purposeCode,
            ...(model.header.referenceId === undefined
              ? {}
              : { referenceId: model.header.referenceId }),
            ...(model.header.date === undefined ? {} : { date: model.header.date }),
            ...(model.header.time === undefined ? {} : { time: model.header.time }),
          },
        }),
    informationSources: model.informationSources.map((source) => ({
      name: nameSpec(source.name),
      receivers: source.receivers.map((receiver) => ({
        name: nameSpec(receiver.name),
        providers: receiver.providers.map((provider) => ({
          name: nameSpec(provider.name),
          subscribers: provider.subscribers.map((subscriber) => ({
            name: nameSpec(subscriber.name),
            claims: subscriber.claims.map(claimSpec),
            dependents: subscriber.dependents.map((dependent) => ({
              name: nameSpec(dependent.name),
              claims: dependent.claims.map(claimSpec),
            })),
          })),
        })),
      })),
    })),
  };
}
