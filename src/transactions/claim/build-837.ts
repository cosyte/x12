/**
 * `build837P` / `build837I` / `build837D` - pure-function builders for a
 * 005010 837 Healthcare Claim (Professional `X222A2`, Institutional
 * `X223A3`, Dental `X224A2`). NEVER auto-sends, NEVER opens a socket, NEVER
 * touches the filesystem. The library mechanically emits the claim it is
 * told; a spec whose billing-provider → subscriber → (claims | patient)
 * tree cannot form a valid HL hierarchy is REFUSED via {@link
 * "./build-errors.js".Claim837BuildError}.
 *
 * The HL spine is the 837's safety primitive, so the builder OWNS it: it
 * computes every HL-01 id (sequential within the transaction), HL-02 parent
 * pointer (20 → 22 → 23), and HL-04 has-child flag from the nested tree.
 * Callers never hand-code the spine - a structurally inconsistent hierarchy
 * is therefore unrepresentable, and the SE-01 segment count is correct by
 * construction (it counts the segments actually emitted, ST/SE inclusive).
 *
 * The read side ({@link "./get-837.js".get837Claims}) is lenient - a real
 * 837 with a broken HL parent pointer is WARNED, never rejected. The builder
 * takes the opposite stance: it REFUSES rather than emit a hierarchy a
 * downstream payer would have to repair. A caller that must reproduce a
 * knowingly-malformed payer artifact drops to {@link
 * "../../builder/build-interchange.js".buildInterchange}, which applies no
 * domain guard.
 *
 * Output shape: a complete {@link X12Interchange} wrapping a single GS..GE
 * functional group (GS-01 `"HC"`) containing a single ST..SE 837
 * transaction set, spec-clean and round-trippable through {@link parseX12}.
 * The builder emits segments in TR3 loop order so a well-formed spec
 * round-trips through `get837Claims` field-for-field.
 */

import { CLAIM_837_BUILD_ERROR_CODES, Claim837BuildError } from "./build-errors.js";
import type {
  Build837AddressSpec,
  Build837AdjudicationSpec,
  Build837AdjustmentSpec,
  Build837AmountSpec,
  Build837BillingProviderSpec,
  Build837ClaimSpec,
  Build837ContactSpec,
  Build837DateSpec,
  Build837EntitySpec,
  Build837HiCodeSpec,
  Build837NoteSpec,
  Build837OtherSubscriberSpec,
  Build837PatientSpec,
  Build837ReferenceSpec,
  Build837ServiceLineSpec,
  Build837Spec,
  Build837SubscriberSpec,
} from "./build-837-types.js";
import { parseX12 } from "../../parser/index.js";
import type { X12Interchange } from "../../parser/types.js";
import { escapeRelease } from "../../parser/release.js";

/**
 * GS-08 / ST-03 version + release emitted per variant - the WPC TR3
 * implementation guides. @internal
 */
const VERSION_BY_VARIANT: Readonly<Record<"P" | "I" | "D", string>> = {
  P: "005010X222A2",
  I: "005010X223A3",
  D: "005010X224A2",
};

/** GS-01 functional identifier code for the 837. `HC` = Health Care Claim. @internal */
const X12_837_FUNCTIONAL_ID = "HC";

/** GS-07 standards agency code - `X` for ASC X12. @internal */
const X12_AGENCY_CODE = "X";

/** HL-03 level codes for the spine the builder computes. @internal */
const HL_LEVEL = { BILLING: "20", SUBSCRIBER: "22", PATIENT: "23" } as const;

/**
 * `build837P` - assemble a 005010X222A2 Professional 837 around the spec.
 *
 * @example
 * ```ts
 * import { build837P, X12Decimal } from "@cosyte/x12";
 * const ix = build837P({
 *   envelope: {
 *     senderId: "SUBMITTER", receiverId: "RECEIVER",
 *     interchangeDate: "260601", interchangeTime: "1200",
 *     interchangeControlNumber: "000000001",
 *     groupControlNumber: "1", transactionSetControlNumber: "0001",
 *   },
 *   submitter: { entityIdentifierCode: "41", entityTypeQualifier: "2", name: "SUBMITTER ONE", idQualifier: "46", idCode: "SUB001" },
 *   receiver: { entityIdentifierCode: "40", entityTypeQualifier: "2", name: "RECEIVER ONE", idQualifier: "46", idCode: "REC001" },
 *   billingProviders: [{
 *     provider: { entityIdentifierCode: "85", entityTypeQualifier: "2", name: "BILLING CLINIC INC", idQualifier: "XX", idCode: "1234567890" },
 *     subscribers: [{
 *       info: { payerResponsibilityCode: "P", individualRelationshipCode: "18", claimFilingIndicator: "MB" },
 *       subscriber: { entityIdentifierCode: "IL", entityTypeQualifier: "1", name: "PATIENT", firstName: "TEST", idQualifier: "MI", idCode: "MEMBER001" },
 *       payer: { entityIdentifierCode: "PR", entityTypeQualifier: "2", name: "PAYER ONE", idQualifier: "PI", idCode: "PAYER01" },
 *       claims: [{
 *         claimId: "PT-ACCT-001", totalCharge: X12Decimal.fromString("150.00")!,
 *         diagnoses: [{ qualifier: "ABK", code: "J20.9" }],
 *         serviceLines: [{ variant: "P", procedureQualifier: "HC", procedureCode: "99213", charge: X12Decimal.fromString("150.00")!, unitOfMeasure: "UN", units: X12Decimal.fromString("1")!, diagnosisPointers: ["1"] }],
 *       }],
 *     }],
 *   }],
 * });
 * ```
 */
export function build837P(spec: Build837Spec): X12Interchange {
  return buildClaim837("P", spec);
}

/**
 * `build837I` - assemble a 005010X223A3 Institutional 837 around the spec.
 * Service lines must be `variant: "I"` (SV2).
 *
 * @example
 * ```ts
 * import { build837I, X12Decimal } from "@cosyte/x12";
 * declare const spec: import("@cosyte/x12").Build837Spec;
 * const ix = build837I(spec); // each serviceLine: { variant: "I", revenueCode: "0120", ... }
 * ```
 */
export function build837I(spec: Build837Spec): X12Interchange {
  return buildClaim837("I", spec);
}

/**
 * `build837D` - assemble a 005010X224A2 Dental 837 around the spec. Service
 * lines must be `variant: "D"` (SV3); per-line tooth detail rides on TOO.
 *
 * @example
 * ```ts
 * import { build837D, X12Decimal } from "@cosyte/x12";
 * declare const spec: import("@cosyte/x12").Build837Spec;
 * const ix = build837D(spec); // each serviceLine: { variant: "D", procedureQualifier: "AD", ... }
 * ```
 */
export function build837D(spec: Build837Spec): X12Interchange {
  return buildClaim837("D", spec);
}

/**
 * Shared emit path for all three variants. `variant` fixes the TR3 version,
 * the GS-08 / ST-03 reference, and the SVx segment id; everything else is
 * driven by the spec. @internal
 */
function buildClaim837(variant: "P" | "I" | "D", spec: Build837Spec): X12Interchange {
  const { envelope } = spec;
  const versionRelease = VERSION_BY_VARIANT[variant];

  // ---- Structural preconditions (refuse an impossible spine) ------------

  enforceStructuralSpec(variant, spec);

  // ---- Delimiter resolution + escape helper -----------------------------

  const elementSeparator = envelope.elementSeparator ?? "*";
  const repetitionSeparator = envelope.repetitionSeparator ?? "^";
  const componentSeparator = envelope.componentSeparator ?? ":";
  const segmentTerminator = envelope.segmentTerminator ?? "~";
  const delimiters = {
    element: elementSeparator,
    repetition: repetitionSeparator,
    component: componentSeparator,
    segment: segmentTerminator,
  };
  const esc = (value: string): string => escapeRelease(value, delimiters);

  const seg = (parts: readonly string[]): string => {
    let end = parts.length;
    while (end > 1 && parts[end - 1] === "") end -= 1;
    return parts.slice(0, end).join(elementSeparator) + segmentTerminator;
  };

  const comp = (components: readonly string[]): string => {
    const escaped = components.map(esc);
    let end = escaped.length;
    while (end > 0 && escaped[end - 1] === "") end -= 1;
    return escaped.slice(0, end).join(componentSeparator);
  };

  const ctx: EmitContext = { seg, esc, comp };

  // ---- ISA envelope -----------------------------------------------------

  const senderQualifier = envelope.senderQualifier ?? "ZZ";
  const receiverQualifier = envelope.receiverQualifier ?? "ZZ";
  const usageIndicator = envelope.usageIndicator ?? "P";
  const interchangeControlNumber = padControl(envelope.interchangeControlNumber, 9);
  const isa =
    [
      "ISA",
      "00",
      pad(" ", 10),
      "00",
      pad(" ", 10),
      pad(senderQualifier, 2),
      pad(envelope.senderId, 15),
      pad(receiverQualifier, 2),
      pad(envelope.receiverId, 15),
      pad(envelope.interchangeDate, 6),
      pad(envelope.interchangeTime, 4),
      repetitionSeparator,
      "00501",
      interchangeControlNumber,
      "0",
      usageIndicator,
      componentSeparator,
    ].join(elementSeparator) + segmentTerminator;

  // ---- GS / ST ----------------------------------------------------------

  const groupDate = envelope.groupDate ?? expandYY(envelope.interchangeDate);
  const groupTime = envelope.groupTime ?? envelope.interchangeTime;
  const applicationSenderCode = envelope.applicationSenderCode ?? envelope.senderId;
  const applicationReceiverCode = envelope.applicationReceiverCode ?? envelope.receiverId;

  const gs = seg([
    "GS",
    X12_837_FUNCTIONAL_ID,
    esc(applicationSenderCode),
    esc(applicationReceiverCode),
    groupDate,
    groupTime,
    esc(envelope.groupControlNumber),
    X12_AGENCY_CODE,
    versionRelease,
  ]);

  const stControlNumber = envelope.transactionSetControlNumber;
  const st = seg(["ST", "837", esc(stControlNumber), versionRelease]);

  // ---- Body segments ----------------------------------------------------

  const body: string[] = [];

  // BHT - required beginning-of-hierarchical-transaction header.
  body.push(
    seg([
      "BHT",
      "0019",
      "00",
      esc(envelope.transactionReferenceId ?? stControlNumber),
      esc(envelope.transactionDate ?? groupDate),
      esc(envelope.transactionTime ?? groupTime),
      esc(envelope.claimOrEncounterIndicator ?? "CH"),
    ]),
  );

  // Loop 1000A submitter (NM1*41 + PER) and Loop 1000B receiver (NM1*40).
  emitEntity(spec.submitter, body, ctx);
  emitEntity(spec.receiver, body, ctx);

  // Loops 2000A/B/C - emit the computed HL spine depth-first.
  const hlCounter: HlCounter = { next: 1 };
  for (const billing of spec.billingProviders) {
    emitBillingProvider(variant, billing, body, ctx, hlCounter);
  }

  // ---- SE / GE / IEA ----------------------------------------------------

  const seCount = body.length + 2;
  const se = seg(["SE", String(seCount), esc(stControlNumber)]);
  const ge = seg(["GE", "1", esc(envelope.groupControlNumber)]);
  const iea = seg(["IEA", "1", interchangeControlNumber]);

  const raw = isa + gs + st + body.join("") + se + ge + iea;

  // Final round-trip through `parseX12` so the returned interchange is
  // bit-identical with the parsed form every other helper consumes.
  return parseX12(raw);
}

// ---------------------------------------------------------------------------
// Structural guards.
// ---------------------------------------------------------------------------

/**
 * Refuse a structurally impossible spec before any emit. Covers both the HL
 * spine (no billing providers / childless nodes) and per-claim
 * preconditions (empty id, no lines, variant mismatch). PHI-clean: messages
 * carry indices + level codes + counts, never names. @internal
 */
function enforceStructuralSpec(variant: "P" | "I" | "D", spec: Build837Spec): void {
  if (spec.billingProviders.length === 0) {
    throw new Claim837BuildError(
      CLAIM_837_BUILD_ERROR_CODES.X12_837_BUILD_INVALID_HIERARCHY,
      "build837: at least one billing provider (HL level 20) is required.",
    );
  }
  for (let b = 0; b < spec.billingProviders.length; b += 1) {
    const billing = spec.billingProviders[b];
    if (billing === undefined) continue;
    if (billing.subscribers.length === 0) {
      throw new Claim837BuildError(
        CLAIM_837_BUILD_ERROR_CODES.X12_837_BUILD_INVALID_HIERARCHY,
        `build837: billing provider at index ${String(b)} has no subscriber (HL level 22) child.`,
      );
    }
    for (let s = 0; s < billing.subscribers.length; s += 1) {
      const subscriber = billing.subscribers[s];
      if (subscriber === undefined) continue;
      const directClaims = subscriber.claims ?? [];
      const patients = subscriber.patients ?? [];
      if (directClaims.length === 0 && patients.length === 0) {
        throw new Claim837BuildError(
          CLAIM_837_BUILD_ERROR_CODES.X12_837_BUILD_INVALID_HIERARCHY,
          `build837: subscriber at billing[${String(b)}].subscriber[${String(s)}] has neither a claim nor a dependent patient.`,
        );
      }
      for (let c = 0; c < directClaims.length; c += 1) {
        const claim = directClaims[c];
        if (claim !== undefined) {
          enforceClaim(
            variant,
            claim,
            `billing[${String(b)}].subscriber[${String(s)}].claim[${String(c)}]`,
          );
        }
      }
      for (let p = 0; p < patients.length; p += 1) {
        const patient = patients[p];
        if (patient === undefined) continue;
        if (patient.claims.length === 0) {
          throw new Claim837BuildError(
            CLAIM_837_BUILD_ERROR_CODES.X12_837_BUILD_INVALID_HIERARCHY,
            `build837: dependent patient at billing[${String(b)}].subscriber[${String(s)}].patient[${String(p)}] has no claim.`,
          );
        }
        for (let c = 0; c < patient.claims.length; c += 1) {
          const claim = patient.claims[c];
          if (claim !== undefined) {
            enforceClaim(
              variant,
              claim,
              `billing[${String(b)}].subscriber[${String(s)}].patient[${String(p)}].claim[${String(c)}]`,
            );
          }
        }
      }
    }
  }
}

/**
 * Refuse an impossible claim (empty id, no lines, variant mismatch). The
 * `locator` is a PHI-clean structural path (`billing[0].subscriber[0].claim[2]`);
 * the message NEVER echoes the `claimId`, which is the provider's
 * patient-account number (PHI-adjacent). @internal
 */
function enforceClaim(variant: "P" | "I" | "D", claim: Build837ClaimSpec, locator: string): void {
  if (claim.claimId === "") {
    throw new Claim837BuildError(
      CLAIM_837_BUILD_ERROR_CODES.X12_837_BUILD_INVALID_SPEC,
      `build837: claim at ${locator} has an empty claimId (CLM-01 is required).`,
    );
  }
  if (claim.serviceLines.length === 0) {
    throw new Claim837BuildError(
      CLAIM_837_BUILD_ERROR_CODES.X12_837_BUILD_INVALID_SPEC,
      `build837: claim at ${locator} has no service line (a CLM requires at least one LX/SVx loop).`,
    );
  }
  for (let l = 0; l < claim.serviceLines.length; l += 1) {
    const line = claim.serviceLines[l];
    if (line === undefined) continue;
    if (line.variant !== variant) {
      throw new Claim837BuildError(
        CLAIM_837_BUILD_ERROR_CODES.X12_837_BUILD_INVALID_SPEC,
        `build837${variant}: claim at ${locator} has a "${line.variant}" service line at index ${String(l)}; every line must be "${variant}".`,
      );
    }
    const code = line.variant === "I" ? line.revenueCode : line.procedureCode;
    if (code === "") {
      throw new Claim837BuildError(
        CLAIM_837_BUILD_ERROR_CODES.X12_837_BUILD_INVALID_SPEC,
        `build837${variant}: claim at ${locator} has a service line at index ${String(l)} with an empty ${line.variant === "I" ? "revenue" : "procedure"} code.`,
      );
    }
  }
}

// ---------------------------------------------------------------------------
// Loop emitters.
// ---------------------------------------------------------------------------

interface EmitContext {
  readonly seg: (parts: readonly string[]) => string;
  readonly esc: (value: string) => string;
  readonly comp: (components: readonly string[]) => string;
}

interface HlCounter {
  next: number;
}

/** Emit a Loop 2000A billing provider HL + its subscriber subtree. @internal */
function emitBillingProvider(
  variant: "P" | "I" | "D",
  billing: Build837BillingProviderSpec,
  body: string[],
  ctx: EmitContext,
  counter: HlCounter,
): void {
  const hlId = String(counter.next);
  counter.next += 1;
  body.push(ctx.seg(["HL", hlId, "", HL_LEVEL.BILLING, "1"]));
  emitEntity(billing.provider, body, ctx);
  if (billing.payToAddress !== undefined) {
    body.push(ctx.seg(["NM1", "87", "2"]));
    emitAddress(billing.payToAddress, body, ctx);
  }
  if (billing.payToPlan !== undefined && variant === "I") {
    emitEntity(billing.payToPlan, body, ctx);
  }
  for (const subscriber of billing.subscribers) {
    emitSubscriber(variant, subscriber, hlId, body, ctx, counter);
  }
}

/** Emit a Loop 2000B subscriber HL + claims / dependent patients. @internal */
function emitSubscriber(
  variant: "P" | "I" | "D",
  subscriber: Build837SubscriberSpec,
  parentHlId: string,
  body: string[],
  ctx: EmitContext,
  counter: HlCounter,
): void {
  const hlId = String(counter.next);
  counter.next += 1;
  const patients = subscriber.patients ?? [];
  const hasChild = patients.length > 0 ? "1" : "0";
  body.push(ctx.seg(["HL", hlId, parentHlId, HL_LEVEL.SUBSCRIBER, hasChild]));
  const info = subscriber.info;
  body.push(
    ctx.seg([
      "SBR",
      ctx.esc(info.payerResponsibilityCode),
      ctx.esc(info.individualRelationshipCode ?? ""),
      ctx.esc(info.groupNumber ?? ""),
      ctx.esc(info.groupName ?? ""),
      "",
      "",
      "",
      "",
      ctx.esc(info.claimFilingIndicator ?? ""),
    ]),
  );
  emitEntity(subscriber.subscriber, body, ctx);
  emitEntity(subscriber.payer, body, ctx);
  for (const claim of subscriber.claims ?? []) {
    emitClaim(variant, claim, body, ctx);
  }
  for (const patient of patients) {
    emitPatient(variant, patient, hlId, body, ctx, counter);
  }
}

/** Emit a Loop 2000C dependent patient HL + its claims. @internal */
function emitPatient(
  variant: "P" | "I" | "D",
  patient: Build837PatientSpec,
  parentHlId: string,
  body: string[],
  ctx: EmitContext,
  counter: HlCounter,
): void {
  const hlId = String(counter.next);
  counter.next += 1;
  body.push(ctx.seg(["HL", hlId, parentHlId, HL_LEVEL.PATIENT, "0"]));
  if (patient.individualRelationshipCode !== undefined) {
    body.push(ctx.seg(["PAT", ctx.esc(patient.individualRelationshipCode)]));
  }
  emitEntity(patient.patient, body, ctx);
  for (const claim of patient.claims) {
    emitClaim(variant, claim, body, ctx);
  }
}

/** Emit a Loop 2300 claim (CLM + DTP/HI/NTE/AMT/REF + 2310x + 2320 + 2400). @internal */
function emitClaim(
  variant: "P" | "I" | "D",
  claim: Build837ClaimSpec,
  body: string[],
  ctx: EmitContext,
): void {
  body.push(
    ctx.seg([
      "CLM",
      ctx.esc(claim.claimId),
      ctx.esc(claim.totalCharge.toString()),
      "",
      "",
      ctx.comp([
        claim.placeOfServiceCode ?? "",
        claim.facilityCodeQualifier ?? "",
        claim.claimFrequencyCode ?? "",
      ]),
      ctx.esc(claim.providerSignatureOnFile ?? ""),
      ctx.esc(claim.providerAcceptAssignment ?? ""),
      ctx.esc(claim.benefitsAssignment ?? ""),
      ctx.esc(claim.releaseOfInformationCode ?? ""),
    ]),
  );

  for (const date of claim.dates ?? []) emitDate(date, body, ctx);
  for (const hi of claim.diagnoses ?? []) emitHi(hi, body, ctx);
  for (const hi of claim.procedures ?? []) emitHi(hi, body, ctx);
  for (const hi of claim.otherHi ?? []) emitHi(hi, body, ctx);
  for (const note of claim.notes ?? []) emitNote(note, body, ctx);
  for (const amt of claim.amounts ?? []) emitAmount(amt, body, ctx);
  for (const ref of claim.references ?? []) body.push(emitRef(ref, ctx));
  for (const provider of claim.providers ?? []) emitEntity(provider, body, ctx);
  for (const other of claim.otherSubscribers ?? []) emitOtherSubscriber(other, body, ctx);

  let lineNumber = 0;
  for (const line of claim.serviceLines) {
    lineNumber += 1;
    emitServiceLine(variant, line, lineNumber, body, ctx);
  }
}

/** Emit a Loop 2320 other-subscriber surface (SBR + NM1*IL + NM1*PR). @internal */
function emitOtherSubscriber(
  other: Build837OtherSubscriberSpec,
  body: string[],
  ctx: EmitContext,
): void {
  body.push(
    ctx.seg([
      "SBR",
      ctx.esc(other.payerResponsibilityCode),
      ctx.esc(other.individualRelationshipCode ?? ""),
      "",
      "",
      "",
      "",
      "",
      "",
      ctx.esc(other.claimFilingIndicator ?? ""),
    ]),
  );
  if (other.otherSubscriber !== undefined) emitEntity(other.otherSubscriber, body, ctx);
  if (other.otherPayer !== undefined) emitEntity(other.otherPayer, body, ctx);
}

/** Emit a Loop 2400 service line (LX + SVx + dates/drug/tooth/notes/amts/refs/providers/2430). @internal */
function emitServiceLine(
  variant: "P" | "I" | "D",
  line: Build837ServiceLineSpec,
  lineNumber: number,
  body: string[],
  ctx: EmitContext,
): void {
  body.push(ctx.seg(["LX", line.lineNumber ?? String(lineNumber)]));

  const units = line.units === undefined ? "0" : line.units.toString();
  if (line.variant === "P") {
    const proc = ctx.comp([line.procedureQualifier, line.procedureCode, ...(line.modifiers ?? [])]);
    const pointers = ctx.comp(line.diagnosisPointers ?? []);
    body.push(
      ctx.seg([
        "SV1",
        proc,
        ctx.esc(line.charge.toString()),
        ctx.esc(line.unitOfMeasure ?? ""),
        ctx.esc(units),
        ctx.esc(line.placeOfServiceCode ?? ""),
        "",
        pointers,
        "",
        ctx.esc(line.emergencyIndicator ?? ""),
        "",
        ctx.esc(line.epsdtIndicator ?? ""),
        ctx.esc(line.familyPlanningIndicator ?? ""),
      ]),
    );
  } else if (line.variant === "I") {
    const proc = ctx.comp([
      line.procedureQualifier ?? "",
      line.procedureCode ?? "",
      ...(line.modifiers ?? []),
    ]);
    body.push(
      ctx.seg([
        "SV2",
        ctx.esc(line.revenueCode),
        proc,
        ctx.esc(line.charge.toString()),
        ctx.esc(line.unitOfMeasure ?? ""),
        ctx.esc(units),
        line.serviceLineRate === undefined ? "" : ctx.esc(line.serviceLineRate.toString()),
        line.nonCoveredCharge === undefined ? "" : ctx.esc(line.nonCoveredCharge.toString()),
      ]),
    );
  } else {
    const proc = ctx.comp([line.procedureQualifier, line.procedureCode, ...(line.modifiers ?? [])]);
    const cavity = ctx.comp(line.oralCavityArea ?? []);
    body.push(
      ctx.seg([
        "SV3",
        proc,
        ctx.esc(line.charge.toString()),
        ctx.esc(line.placeOfServiceCode ?? ""),
        cavity,
        ctx.esc(line.prosthesisCrownInlayCode ?? ""),
        ctx.esc(units),
      ]),
    );
  }

  for (const date of line.dates ?? []) emitDate(date, body, ctx);

  if (line.variant === "P" && line.drug !== undefined) {
    const drug = line.drug;
    body.push(ctx.seg(["LIN", "", ctx.esc(drug.qualifier), ctx.esc(drug.code)]));
    if (drug.quantity !== undefined || drug.unitOfMeasure !== undefined) {
      body.push(
        ctx.seg([
          "CTP",
          "",
          "",
          "",
          drug.quantity === undefined ? "" : ctx.esc(drug.quantity.toString()),
          ctx.esc(drug.unitOfMeasure ?? ""),
        ]),
      );
    }
  }

  if (line.variant === "D") {
    for (const tooth of line.toothInformation ?? []) {
      body.push(
        ctx.seg([
          "TOO",
          ctx.esc(tooth.qualifier),
          ctx.esc(tooth.toothCode),
          ctx.comp(tooth.surfaces ?? []),
        ]),
      );
    }
  }

  for (const note of line.notes ?? []) emitNote(note, body, ctx);
  for (const amt of line.amounts ?? []) emitAmount(amt, body, ctx);
  for (const ref of line.references ?? []) body.push(emitRef(ref, ctx));
  for (const provider of line.providers ?? []) emitEntity(provider, body, ctx);
  for (const adj of line.adjudications ?? []) emitAdjudication(adj, body, ctx);
}

/** Emit a Loop 2430 line adjudication (SVD + CAS* + DTP*573). @internal */
function emitAdjudication(adj: Build837AdjudicationSpec, body: string[], ctx: EmitContext): void {
  const proc = ctx.comp([adj.procedureQualifier ?? "", adj.procedureCode ?? ""]);
  body.push(
    ctx.seg([
      "SVD",
      ctx.esc(adj.otherPayerId),
      ctx.esc(adj.amountPaid.toString()),
      proc,
      "",
      adj.paidUnits === undefined ? "" : ctx.esc(adj.paidUnits.toString()),
    ]),
  );
  emitCasGroup(adj.adjustments ?? [], body, ctx);
  if (adj.dateAdjudicated !== undefined) {
    body.push(ctx.seg(["DTP", "573", "D8", ctx.esc(adj.dateAdjudicated)]));
  }
}

/**
 * Emit CAS segments for a flat adjustment list. Consecutive adjustments
 * sharing a `groupCode` pack into one CAS (≤ 6 triples each). @internal
 */
function emitCasGroup(
  adjustments: readonly Build837AdjustmentSpec[],
  body: string[],
  ctx: EmitContext,
): void {
  let i = 0;
  while (i < adjustments.length) {
    const first = adjustments[i];
    if (first === undefined) {
      i += 1;
      continue;
    }
    const groupCode = first.groupCode;
    const parts: string[] = ["CAS", ctx.esc(groupCode)];
    let triples = 0;
    while (i < adjustments.length && triples < 6) {
      const adj = adjustments[i];
      if (adj === undefined || adj.groupCode !== groupCode) break;
      parts.push(
        ctx.esc(adj.reasonCode),
        ctx.esc(adj.amount.toString()),
        adj.quantity === undefined ? "" : ctx.esc(adj.quantity.toString()),
      );
      triples += 1;
      i += 1;
    }
    body.push(ctx.seg(parts));
  }
}

// ---------------------------------------------------------------------------
// Entity + cross-cutting segment emitters.
// ---------------------------------------------------------------------------

/** Emit an NM1 entity (+ N3/N4 address, PER contacts, REF identifiers). @internal */
function emitEntity(entity: Build837EntitySpec, body: string[], ctx: EmitContext): void {
  body.push(
    ctx.seg([
      "NM1",
      ctx.esc(entity.entityIdentifierCode),
      ctx.esc(entity.entityTypeQualifier),
      ctx.esc(entity.name),
      ctx.esc(entity.firstName ?? ""),
      ctx.esc(entity.middleName ?? ""),
      "",
      ctx.esc(entity.suffix ?? ""),
      ctx.esc(entity.idQualifier ?? ""),
      ctx.esc(entity.idCode ?? ""),
    ]),
  );
  if (entity.address !== undefined) emitAddress(entity.address, body, ctx);
  for (const contact of entity.contacts ?? []) body.push(emitContact(contact, ctx));
  for (const ref of entity.references ?? []) body.push(emitRef(ref, ctx));
}

/** Emit N3 + N4 for an address block. @internal */
function emitAddress(address: Build837AddressSpec, body: string[], ctx: EmitContext): void {
  if (address.lines.length > 0) {
    body.push(ctx.seg(["N3", ...address.lines.map(ctx.esc)]));
  }
  if (
    address.city !== undefined ||
    address.state !== undefined ||
    address.postalCode !== undefined ||
    address.countryCode !== undefined
  ) {
    body.push(
      ctx.seg([
        "N4",
        ctx.esc(address.city ?? ""),
        ctx.esc(address.state ?? ""),
        ctx.esc(address.postalCode ?? ""),
        ctx.esc(address.countryCode ?? ""),
      ]),
    );
  }
}

/** @internal */
function emitContact(contact: Build837ContactSpec, ctx: EmitContext): string {
  const parts: string[] = [
    "PER",
    ctx.esc(contact.contactFunctionCode),
    ctx.esc(contact.name ?? ""),
  ];
  for (const comm of contact.communications ?? []) {
    parts.push(ctx.esc(comm.qualifier), ctx.esc(comm.value));
  }
  return ctx.seg(parts);
}

/** @internal */
function emitRef(ref: Build837ReferenceSpec, ctx: EmitContext): string {
  return ctx.seg([
    "REF",
    ctx.esc(ref.qualifier),
    ctx.esc(ref.value),
    ctx.esc(ref.description ?? ""),
  ]);
}

/** @internal */
function emitDate(date: Build837DateSpec, body: string[], ctx: EmitContext): void {
  body.push(
    ctx.seg(["DTP", ctx.esc(date.qualifier), ctx.esc(date.formatQualifier), ctx.esc(date.value)]),
  );
}

/** @internal */
function emitNote(note: Build837NoteSpec, body: string[], ctx: EmitContext): void {
  body.push(ctx.seg(["NTE", ctx.esc(note.noteReferenceCode), ctx.esc(note.description)]));
}

/** @internal */
function emitAmount(amt: Build837AmountSpec, body: string[], ctx: EmitContext): void {
  body.push(ctx.seg(["AMT", ctx.esc(amt.qualifier), ctx.esc(amt.amount.toString())]));
}

/**
 * Emit one HI composite as a standalone HI segment. The read side
 * concatenates across HI segments, so emitting one composite per segment
 * round-trips the per-bucket order. @internal
 */
function emitHi(hi: Build837HiCodeSpec, body: string[], ctx: EmitContext): void {
  const composite = ctx.comp([
    hi.qualifier,
    hi.code,
    hi.dateQualifier ?? "",
    hi.date ?? "",
    hi.monetaryAmount === undefined ? "" : hi.monetaryAmount.toString(),
    hi.quantity === undefined ? "" : hi.quantity.toString(),
    hi.versionId ?? "",
    "",
    hi.poaIndicator ?? "",
  ]);
  body.push(ctx.seg(["HI", composite]));
}

// ---------------------------------------------------------------------------
// String helpers - mirror the `build835` emit primitives.
// ---------------------------------------------------------------------------

/** @internal */
function pad(value: string, width: number): string {
  if (value.length === width) return value;
  if (value.length < width) return value + " ".repeat(width - value.length);
  return value.slice(0, width);
}

/**
 * Zero-pad a control number to `width` chars (ISA-13 / IEA-02 are always
 * 9). Throws {@link Claim837BuildError} if the value already exceeds the
 * width. @internal
 */
function padControl(value: string, width: number): string {
  if (value.length === width) return value;
  if (value.length < width) return "0".repeat(width - value.length) + value;
  throw new Claim837BuildError(
    CLAIM_837_BUILD_ERROR_CODES.X12_837_BUILD_INVALID_SPEC,
    `build837: control number "${value}" exceeds the ${String(width)}-char spec limit.`,
  );
}

/**
 * Expand a 6-digit YYMMDD into CCYYMMDD for GS-04. Years `00`–`49` are 21st
 * century, `50`–`99` are 20th. A value already in CCYYMMDD form passes
 * through unchanged. @internal
 */
function expandYY(yymmdd: string): string {
  if (yymmdd.length !== 6) return yymmdd;
  const yy = parseInt(yymmdd.slice(0, 2), 10);
  if (Number.isNaN(yy)) return yymmdd;
  const century = yy < 50 ? "20" : "19";
  return century + yymmdd;
}
