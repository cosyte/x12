/**
 * `build835` - pure-function builder for a 005010X221A1 Health Care Claim
 * Payment/Advice (ERA). NEVER auto-sends, NEVER opens a socket, NEVER
 * touches the filesystem. The library mechanically emits the remittance it
 * is told; a spec that violates a TR3 §1.10.2 balance invariant is REFUSED
 * via {@link "./build-errors.js".Remit835BuildError} - emitting an
 * out-of-balance 835 would tell a downstream cash-poster that money math
 * holds when it does not (mirrors `build999`'s accept-with-errors refusal).
 *
 * The read side ({@link "./get-835.js".get835}) is lenient - a real,
 * payer-issued, out-of-balance 835 is WARNED, never rejected. The builder
 * takes the opposite stance: it REFUSES rather than emit. A caller that
 * must reproduce a knowingly-imbalanced payer artifact drops to {@link
 * "../../builder/build-interchange.js".buildInterchange}, which applies no
 * domain guard.
 *
 * Output shape: a complete {@link X12Interchange} wrapping a single GS..GE
 * functional group (GS-01 `"HP"`) containing a single ST..SE 835
 * transaction set (ST-03 `005010X221A1`), spec-clean and round-trippable
 * through {@link parseX12}. The builder emits segments in TR3 loop order so
 * a balanced spec round-trips through `get835` field-for-field.
 */

import { REMIT_835_BUILD_ERROR_CODES, Remit835BuildError } from "./build-errors.js";
import { checkClaimBalance, checkRemitTotalBalance, checkServiceLineBalance } from "./balance.js";
import type {
  Build835AdjustmentSpec,
  Build835ClaimSpec,
  Build835ContactSpec,
  Build835PartySpec,
  Build835PersonSpec,
  Build835ProviderAdjustmentSpec,
  Build835ProviderSpec,
  Build835ReferenceSpec,
  Build835ServiceLineSpec,
  Build835Spec,
} from "./build-835-types.js";
import type {
  X12RemitAdjustment,
  X12RemitClaim,
  X12RemitProviderAdjustment,
  X12RemitServiceLine,
} from "./types.js";
import { parseX12 } from "../../parser/index.js";
import type { X12Interchange, X12Position } from "../../parser/types.js";
import { escapeRelease } from "../../parser/release.js";

/**
 * GS-08 / ST-03 version + release emitted for every 835 the library builds
 * - the WPC TR3 `005010X221A1` implementation guide.
 * @internal
 */
const X221A1_VERSION_RELEASE = "005010X221A1";

/**
 * GS-01 functional identifier code for the 835. `HP` = Health Care Claim
 * Payment/Advice.
 * @internal
 */
const X12_835_FUNCTIONAL_ID = "HP";

/**
 * The single ASC X12 standards agency code emitted at GS-07 - `X` for ASC
 * X12 itself.
 * @internal
 */
const X12_AGENCY_CODE = "X";

/**
 * `build835` - assemble a 005010X221A1 835 around the supplied spec.
 *
 * Refused via {@link "./build-errors.js".Remit835BuildError}:
 * - No trace supplied, or a claim with no patient-control number, etc. →
 *   `X12_835_BUILD_INVALID_SPEC`.
 * - Any §1.10.2 balance invariant violated (service-line `SVC-02 ==
 *   SVC-03 + Σ(line CAS)`, claim `CLP-03 == CLP-04 + Σ(claim+line CAS)`,
 *   or top-of-remit `BPR-02 == Σ(CLP-04) − Σ(PLB)`) →
 *   `X12_835_BUILD_BALANCE_MISMATCH`.
 *
 * @example
 * ```ts
 * import { build835, X12Decimal } from "@cosyte/x12";
 * const ix = build835({
 *   envelope: {
 *     senderId: "MEDICARE", receiverId: "SUBMITTER",
 *     interchangeDate: "260601", interchangeTime: "1200",
 *     interchangeControlNumber: "000000001",
 *     groupControlNumber: "1", transactionSetControlNumber: "0001",
 *   },
 *   payment: {
 *     transactionHandlingCode: "I",
 *     totalActualPayment: X12Decimal.fromString("450.00")!,
 *     creditDebitFlag: "C", method: "ACH", paymentDate: "20260601",
 *   },
 *   traces: [{ traceTypeCode: "1", referenceId: "0012345", originatingCompanyId: "1512345678" }],
 *   claims: [
 *     {
 *       patientControlNumber: "PT-ACCT-001", claimStatusCode: "1",
 *       totalChargeAmount: X12Decimal.fromString("500.00")!,
 *       totalPaymentAmount: X12Decimal.fromString("450.00")!,
 *       patientResponsibilityAmount: X12Decimal.fromString("50.00")!,
 *       adjustments: [{ groupCode: "PR", reasonCode: "1", amount: X12Decimal.fromString("50.00")! }],
 *     },
 *   ],
 * });
 * ```
 */
export function build835(spec: Build835Spec): X12Interchange {
  const { envelope } = spec;

  // ---- Structural preconditions -----------------------------------------

  enforceStructuralSpec(spec);

  // ---- Balance guards (refuse an out-of-balance remit) ------------------

  enforceBalance(spec);

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

  /**
   * Join already-escaped/composed element strings into a segment, dropping
   * trailing empty elements (interior empties are positionally meaningful
   * and kept). Never re-escapes - composites arrive pre-escaped.
   */
  const seg = (parts: readonly string[]): string => {
    let end = parts.length;
    while (end > 1 && parts[end - 1] === "") end -= 1;
    return parts.slice(0, end).join(elementSeparator) + segmentTerminator;
  };

  /**
   * Build a composite element: escape each component, drop trailing empty
   * components, join with the component separator. Returns `""` when all
   * components are empty.
   */
  const comp = (components: readonly string[]): string => {
    const escaped = components.map(esc);
    let end = escaped.length;
    while (end > 0 && escaped[end - 1] === "") end -= 1;
    return escaped.slice(0, end).join(componentSeparator);
  };

  // ---- ISA envelope -----------------------------------------------------

  const senderQualifier = envelope.senderQualifier ?? "ZZ";
  const receiverQualifier = envelope.receiverQualifier ?? "ZZ";
  const usageIndicator = envelope.usageIndicator ?? "P";
  const interchangeControlNumber = padControl(envelope.interchangeControlNumber, 9);
  const isa =
    [
      "ISA",
      "00", // ISA-01
      pad(" ", 10), // ISA-02
      "00", // ISA-03
      pad(" ", 10), // ISA-04
      pad(senderQualifier, 2), // ISA-05
      pad(envelope.senderId, 15), // ISA-06
      pad(receiverQualifier, 2), // ISA-07
      pad(envelope.receiverId, 15), // ISA-08
      pad(envelope.interchangeDate, 6), // ISA-09 - YYMMDD
      pad(envelope.interchangeTime, 4), // ISA-10 - HHMM
      repetitionSeparator, // ISA-11
      "00501", // ISA-12
      interchangeControlNumber, // ISA-13
      "0", // ISA-14
      usageIndicator, // ISA-15
      componentSeparator, // ISA-16
    ].join(elementSeparator) + segmentTerminator;

  // ---- GS / ST ----------------------------------------------------------

  const groupDate = envelope.groupDate ?? expandYY(envelope.interchangeDate);
  const groupTime = envelope.groupTime ?? envelope.interchangeTime;
  const applicationSenderCode = envelope.applicationSenderCode ?? envelope.senderId;
  const applicationReceiverCode = envelope.applicationReceiverCode ?? envelope.receiverId;

  const gs = seg([
    "GS",
    X12_835_FUNCTIONAL_ID, // GS-01 - "HP"
    esc(applicationSenderCode), // GS-02
    esc(applicationReceiverCode), // GS-03
    groupDate, // GS-04 - CCYYMMDD
    groupTime, // GS-05 - HHMM
    esc(envelope.groupControlNumber), // GS-06
    X12_AGENCY_CODE, // GS-07
    X221A1_VERSION_RELEASE, // GS-08
  ]);

  const stControlNumber = envelope.transactionSetControlNumber;
  const st = seg(["ST", "835", esc(stControlNumber), X221A1_VERSION_RELEASE]);

  // ---- Body segments ----------------------------------------------------

  const body: string[] = [];

  // BPR - payment header. BPR-16 (payment date) is positionally pinned at
  // element 16, so the interior elements 6..15 are emitted empty and NOT
  // trimmed (the date keeps them in place).
  body.push(
    seg([
      "BPR",
      esc(spec.payment.transactionHandlingCode),
      esc(spec.payment.totalActualPayment.toString()),
      esc(spec.payment.creditDebitFlag),
      esc(spec.payment.method),
      esc(spec.payment.paymentFormatCode ?? ""),
      "", // BPR-06
      "", // BPR-07
      "", // BPR-08
      "", // BPR-09
      "", // BPR-10
      "", // BPR-11
      "", // BPR-12
      "", // BPR-13
      "", // BPR-14
      "", // BPR-15
      esc(spec.payment.paymentDate), // BPR-16
    ]),
  );

  for (const trace of spec.traces) {
    body.push(
      seg([
        "TRN",
        esc(trace.traceTypeCode),
        esc(trace.referenceId),
        esc(trace.originatingCompanyId ?? ""),
        esc(trace.originatingCompanySupplementalCode ?? ""),
      ]),
    );
  }

  if (spec.payer !== undefined) {
    emitParty(spec.payer, body, seg, esc);
  }
  if (spec.payee !== undefined) {
    emitParty(spec.payee, body, seg, esc);
  }

  if (spec.claims.length > 0) {
    body.push(seg(["LX", "1"]));
    for (const claim of spec.claims) {
      emitClaim(claim, body, seg, esc, comp);
    }
  }

  emitProviderAdjustments(spec.providerAdjustments ?? [], body, seg, esc, comp);

  // ---- SE / GE / IEA ----------------------------------------------------

  // SE-01 counts every segment in the set, ST and SE inclusive.
  const seCount = body.length + 2;
  const se = seg(["SE", String(seCount), esc(stControlNumber)]);
  const ge = seg(["GE", "1", esc(envelope.groupControlNumber)]);
  const iea = seg(["IEA", "1", interchangeControlNumber]);

  const raw = isa + gs + st + body.join("") + se + ge + iea;

  // Final round-trip through `parseX12` so the returned interchange is
  // bit-identical with the parsed form every other helper consumes - and
  // so the build path inherits delimiter detection + envelope walking, and
  // any internal builder bug surfaces as Tier-2 warnings on the result.
  return parseX12(raw);
}

// ---------------------------------------------------------------------------
// Structural + balance guards.
// ---------------------------------------------------------------------------

/**
 * Refuse a structurally impossible spec before any emit. Mirrors
 * `build999`'s precondition guards: the cheap, unambiguous failures that
 * would otherwise emit a malformed 835. @internal
 */
function enforceStructuralSpec(spec: Build835Spec): void {
  if (spec.traces.length === 0) {
    throw new Remit835BuildError(
      REMIT_835_BUILD_ERROR_CODES.X12_835_BUILD_INVALID_SPEC,
      "build835: at least one TRN trace is required (TR3 005010X221A1 Loop header).",
    );
  }
  for (let i = 0; i < spec.claims.length; i += 1) {
    const claim = spec.claims[i];
    if (claim === undefined) continue;
    if (claim.patientControlNumber === "") {
      throw new Remit835BuildError(
        REMIT_835_BUILD_ERROR_CODES.X12_835_BUILD_INVALID_SPEC,
        `build835: claim at index ${String(i)} has an empty patient-control number (CLP-01 is required).`,
      );
    }
  }
}

/**
 * Run the three §1.10.2 balance invariants over the spec and REFUSE on the
 * first violation. Reuses the authoritative read-side validators
 * ({@link checkClaimBalance} / {@link checkServiceLineBalance} /
 * {@link checkRemitTotalBalance}) against a materialized read model so the
 * emit guard and the parse warning share one source of truth. The
 * validators' messages are numeric-only (no PHI). @internal
 */
function enforceBalance(spec: Build835Spec): void {
  const position: X12Position = { segmentIndex: 0, transactionIndex: 0 };
  const claims = spec.claims.map(materializeClaim);
  for (const claim of claims) {
    const claimWarn = checkClaimBalance(claim, position);
    if (claimWarn !== undefined) {
      throw new Remit835BuildError(
        REMIT_835_BUILD_ERROR_CODES.X12_835_BUILD_BALANCE_MISMATCH,
        `build835 refuses an out-of-balance claim: ${claimWarn.message}`,
      );
    }
    for (const lineWarn of checkServiceLineBalance(claim, position)) {
      throw new Remit835BuildError(
        REMIT_835_BUILD_ERROR_CODES.X12_835_BUILD_BALANCE_MISMATCH,
        `build835 refuses an out-of-balance service line: ${lineWarn.message}`,
      );
    }
  }
  const totalWarn = checkRemitTotalBalance(
    spec.payment.totalActualPayment,
    claims,
    (spec.providerAdjustments ?? []).map(materializeProviderAdjustment),
    position,
  );
  if (totalWarn !== undefined) {
    throw new Remit835BuildError(
      REMIT_835_BUILD_ERROR_CODES.X12_835_BUILD_BALANCE_MISMATCH,
      `build835 refuses an out-of-balance remit: ${totalWarn.message}`,
    );
  }
}

// ---------------------------------------------------------------------------
// Read-model materializers - only the fields the balance validators read are
// load-bearing; lookup-derived descriptions are left `undefined`.
// ---------------------------------------------------------------------------

/** @internal */
function materializeAdjustment(spec: Build835AdjustmentSpec): X12RemitAdjustment {
  return {
    groupCode: spec.groupCode,
    reasonCode: spec.reasonCode,
    reasonDescription: undefined,
    amount: spec.amount,
    quantity: spec.quantity,
  };
}

/** @internal */
function materializeServiceLine(spec: Build835ServiceLineSpec): X12RemitServiceLine {
  return {
    productServiceIdQualifier: spec.productServiceIdQualifier,
    productServiceId: spec.productServiceId,
    modifiers: spec.modifiers ?? [],
    chargeAmount: spec.chargeAmount,
    paymentAmount: spec.paymentAmount,
    revenueCode: spec.revenueCode,
    paidUnitsOfService: spec.paidUnitsOfService,
    originalServiceId: spec.originalServiceId,
    originalServiceIdQualifier: spec.originalServiceIdQualifier,
    serviceDateStart: spec.serviceDateStart,
    serviceDateEnd: spec.serviceDateEnd,
    adjustments: (spec.adjustments ?? []).map(materializeAdjustment),
    references: [],
    amounts: [],
    remarks: [],
  };
}

/** @internal */
function materializeClaim(spec: Build835ClaimSpec): X12RemitClaim {
  return {
    patientControlNumber: spec.patientControlNumber,
    claimStatusCode: spec.claimStatusCode,
    claimStatusDescription: undefined,
    totalChargeAmount: spec.totalChargeAmount,
    totalPaymentAmount: spec.totalPaymentAmount,
    patientResponsibilityAmount: spec.patientResponsibilityAmount,
    claimFilingIndicatorCode: spec.claimFilingIndicatorCode,
    payerClaimControlNumber: spec.payerClaimControlNumber,
    facilityTypeCode: spec.facilityTypeCode,
    claimFrequencyCode: spec.claimFrequencyCode,
    adjustments: (spec.adjustments ?? []).map(materializeAdjustment),
    patient: undefined,
    subscriber: undefined,
    correctedPatient: undefined,
    serviceProvider: undefined,
    renderingProvider: undefined,
    servicePeriodStart: spec.servicePeriodStart,
    servicePeriodEnd: spec.servicePeriodEnd,
    references: [],
    amounts: [],
    remarks: [],
    serviceLines: (spec.serviceLines ?? []).map(materializeServiceLine),
  };
}

/** @internal */
function materializeProviderAdjustment(
  spec: Build835ProviderAdjustmentSpec,
): X12RemitProviderAdjustment {
  return {
    providerId: spec.providerId,
    fiscalPeriodDate: spec.fiscalPeriodDate,
    reasonCode: spec.reasonCode,
    subCode: spec.subCode,
    amount: spec.amount,
  };
}

// ---------------------------------------------------------------------------
// Segment emitters. Each pushes spec-clean segment strings onto `body` in
// TR3 005010X221A1 loop order so the result round-trips through `get835`.
// ---------------------------------------------------------------------------

/** Emit a Loop 1000A/1000B party (N1 + N3 + N4 + REF* + PER*). @internal */
function emitParty(
  party: Build835PartySpec,
  body: string[],
  seg: (parts: readonly string[]) => string,
  esc: (value: string) => string,
): void {
  body.push(
    seg([
      "N1",
      esc(party.entityIdentifierCode),
      esc(party.name),
      esc(party.idQualifier ?? ""),
      esc(party.idCode ?? ""),
    ]),
  );
  const address = party.address;
  if (address !== undefined) {
    if (address.lines.length > 0) {
      body.push(seg(["N3", ...address.lines.map(esc)]));
    }
    if (
      address.city !== undefined ||
      address.state !== undefined ||
      address.postalCode !== undefined ||
      address.countryCode !== undefined
    ) {
      body.push(
        seg([
          "N4",
          esc(address.city ?? ""),
          esc(address.state ?? ""),
          esc(address.postalCode ?? ""),
          esc(address.countryCode ?? ""),
        ]),
      );
    }
  }
  for (const ref of party.additionalIdentifiers ?? []) {
    body.push(emitRef(ref, seg, esc));
  }
  for (const contact of party.contacts ?? []) {
    body.push(emitContact(contact, seg, esc));
  }
}

/** @internal */
function emitRef(
  ref: Build835ReferenceSpec,
  seg: (parts: readonly string[]) => string,
  esc: (value: string) => string,
): string {
  return seg(["REF", esc(ref.qualifier), esc(ref.value), esc(ref.description ?? "")]);
}

/** @internal */
function emitContact(
  contact: Build835ContactSpec,
  seg: (parts: readonly string[]) => string,
  esc: (value: string) => string,
): string {
  const parts: string[] = ["PER", esc(contact.contactFunctionCode), esc(contact.name ?? "")];
  for (const comm of contact.communications ?? []) {
    parts.push(esc(comm.qualifier), esc(comm.value));
  }
  return seg(parts);
}

/** Emit a Loop 2100 claim (CLP + CAS* + NM1* + DTM* + REF* + AMT* + LQ* + Loop 2110). @internal */
function emitClaim(
  claim: Build835ClaimSpec,
  body: string[],
  seg: (parts: readonly string[]) => string,
  esc: (value: string) => string,
  comp: (components: readonly string[]) => string,
): void {
  body.push(
    seg([
      "CLP",
      esc(claim.patientControlNumber),
      esc(claim.claimStatusCode),
      esc(claim.totalChargeAmount.toString()),
      esc(claim.totalPaymentAmount.toString()),
      esc(claim.patientResponsibilityAmount.toString()),
      esc(claim.claimFilingIndicatorCode ?? ""),
      esc(claim.payerClaimControlNumber ?? ""),
      comp([claim.facilityTypeCode ?? "", "", claim.claimFrequencyCode ?? ""]),
    ]),
  );

  emitCasGroup(claim.adjustments ?? [], body, seg, esc);

  if (claim.patient !== undefined) body.push(emitPerson(claim.patient, seg, esc));
  if (claim.subscriber !== undefined) body.push(emitPerson(claim.subscriber, seg, esc));
  if (claim.correctedPatient !== undefined) body.push(emitPerson(claim.correctedPatient, seg, esc));
  if (claim.serviceProvider !== undefined) body.push(emitProvider(claim.serviceProvider, seg, esc));
  if (claim.renderingProvider !== undefined) {
    body.push(emitProvider(claim.renderingProvider, seg, esc));
  }

  if (claim.servicePeriodStart !== undefined) {
    body.push(seg(["DTM", "232", esc(claim.servicePeriodStart)]));
  }
  if (claim.servicePeriodEnd !== undefined) {
    body.push(seg(["DTM", "233", esc(claim.servicePeriodEnd)]));
  }

  for (const ref of claim.references ?? []) body.push(emitRef(ref, seg, esc));
  for (const amt of claim.amounts ?? []) {
    body.push(seg(["AMT", esc(amt.qualifier), esc(amt.amount.toString())]));
  }
  for (const remark of claim.remarks ?? []) {
    body.push(seg(["LQ", esc(remark.system), esc(remark.code)]));
  }

  for (const line of claim.serviceLines ?? []) {
    emitServiceLine(line, body, seg, esc, comp);
  }
}

/** Emit a Loop 2110 service line (SVC + DTM* + CAS* + REF* + AMT* + LQ*). @internal */
function emitServiceLine(
  line: Build835ServiceLineSpec,
  body: string[],
  seg: (parts: readonly string[]) => string,
  esc: (value: string) => string,
  comp: (components: readonly string[]) => string,
): void {
  const svc01 = comp([
    line.productServiceIdQualifier,
    line.productServiceId,
    ...(line.modifiers ?? []),
  ]);
  const svc06 = comp([line.originalServiceIdQualifier ?? "", line.originalServiceId ?? ""]);
  body.push(
    seg([
      "SVC",
      svc01,
      esc(line.chargeAmount.toString()),
      esc(line.paymentAmount.toString()),
      "", // SVC-04 - revenue code is SVC-05 in X221A1; SVC-04 unused
      esc(line.revenueCode ?? ""),
      svc06,
      line.paidUnitsOfService === undefined ? "" : esc(line.paidUnitsOfService.toString()),
    ]),
  );

  emitServiceLineDtm(line, body, seg, esc);
  emitCasGroup(line.adjustments ?? [], body, seg, esc);
  for (const ref of line.references ?? []) body.push(emitRef(ref, seg, esc));
  for (const amt of line.amounts ?? []) {
    body.push(seg(["AMT", esc(amt.qualifier), esc(amt.amount.toString())]));
  }
  for (const remark of line.remarks ?? []) {
    body.push(seg(["LQ", esc(remark.system), esc(remark.code)]));
  }
}

/**
 * Emit service-line service dates. When start == end a single DTM*472
 * round-trips both; otherwise DTM*150 (start) and DTM*151 (end) carry them
 * independently. @internal
 */
function emitServiceLineDtm(
  line: Build835ServiceLineSpec,
  body: string[],
  seg: (parts: readonly string[]) => string,
  esc: (value: string) => string,
): void {
  const { serviceDateStart: start, serviceDateEnd: end } = line;
  if (start !== undefined && end !== undefined && start === end) {
    body.push(seg(["DTM", "472", esc(start)]));
    return;
  }
  if (start !== undefined) body.push(seg(["DTM", "150", esc(start)]));
  if (end !== undefined) body.push(seg(["DTM", "151", esc(end)]));
}

/**
 * Emit CAS segments for a flat adjustment list. Consecutive adjustments
 * sharing a `groupCode` pack into one CAS (≤ 6 triples each), mirroring the
 * read side's flatten. @internal
 */
function emitCasGroup(
  adjustments: readonly Build835AdjustmentSpec[],
  body: string[],
  seg: (parts: readonly string[]) => string,
  esc: (value: string) => string,
): void {
  let i = 0;
  while (i < adjustments.length) {
    const first = adjustments[i];
    if (first === undefined) {
      i += 1;
      continue;
    }
    const groupCode = first.groupCode;
    const parts: string[] = ["CAS", esc(groupCode)];
    let triples = 0;
    while (i < adjustments.length && triples < 6) {
      const adj = adjustments[i];
      if (adj === undefined || adj.groupCode !== groupCode) break;
      parts.push(
        esc(adj.reasonCode),
        esc(adj.amount.toString()),
        adj.quantity === undefined ? "" : esc(adj.quantity.toString()),
      );
      triples += 1;
      i += 1;
    }
    body.push(seg(parts));
  }
}

/** Emit an NM1 person (entity type qualifier `"1"`). @internal */
function emitPerson(
  person: Build835PersonSpec,
  seg: (parts: readonly string[]) => string,
  esc: (value: string) => string,
): string {
  return seg([
    "NM1",
    esc(person.entityIdentifierCode),
    "1",
    esc(person.lastName ?? ""),
    esc(person.firstName ?? ""),
    esc(person.middleName ?? ""),
    "", // NM1-06 name prefix
    esc(person.suffix ?? ""),
    esc(person.idQualifier ?? ""),
    esc(person.idCode ?? ""),
  ]);
}

/** Emit an NM1 provider/organization (entity type qualifier `"2"`). @internal */
function emitProvider(
  provider: Build835ProviderSpec,
  seg: (parts: readonly string[]) => string,
  esc: (value: string) => string,
): string {
  return seg([
    "NM1",
    esc(provider.entityIdentifierCode),
    "2",
    esc(provider.name ?? ""),
    "", // NM1-04
    "", // NM1-05
    "", // NM1-06
    "", // NM1-07
    esc(provider.idQualifier ?? ""),
    esc(provider.idCode ?? ""),
  ]);
}

/**
 * Emit PLB segments. Consecutive provider adjustments sharing both
 * `providerId` and `fiscalPeriodDate` pack into one PLB (≤ 6 pairs each),
 * mirroring the read side's flatten. @internal
 */
function emitProviderAdjustments(
  adjustments: readonly Build835ProviderAdjustmentSpec[],
  body: string[],
  seg: (parts: readonly string[]) => string,
  esc: (value: string) => string,
  comp: (components: readonly string[]) => string,
): void {
  let i = 0;
  while (i < adjustments.length) {
    const first = adjustments[i];
    if (first === undefined) {
      i += 1;
      continue;
    }
    const { providerId, fiscalPeriodDate } = first;
    const parts: string[] = ["PLB", esc(providerId), esc(fiscalPeriodDate)];
    let pairs = 0;
    while (i < adjustments.length && pairs < 6) {
      const adj = adjustments[i];
      if (
        adj === undefined ||
        adj.providerId !== providerId ||
        adj.fiscalPeriodDate !== fiscalPeriodDate
      ) {
        break;
      }
      parts.push(comp([adj.reasonCode, adj.subCode ?? ""]), esc(adj.amount.toString()));
      pairs += 1;
      i += 1;
    }
    body.push(seg(parts));
  }
}

// ---------------------------------------------------------------------------
// String helpers - mirror the `build999` / `buildInterchange` emit primitives.
// ---------------------------------------------------------------------------

/** @internal */
function pad(value: string, width: number): string {
  if (value.length === width) return value;
  if (value.length < width) return value + " ".repeat(width - value.length);
  return value.slice(0, width);
}

/**
 * Zero-pad a control number to `width` chars (ISA-13 / IEA-02 are always
 * 9). Throws {@link Remit835BuildError} if the value already exceeds the
 * width - a silently-truncated control number would break ISA-13↔IEA-02
 * reconciliation. @internal
 */
function padControl(value: string, width: number): string {
  if (value.length === width) return value;
  if (value.length < width) return "0".repeat(width - value.length) + value;
  throw new Remit835BuildError(
    REMIT_835_BUILD_ERROR_CODES.X12_835_BUILD_INVALID_SPEC,
    `build835: control number "${value}" exceeds the ${String(width)}-char spec limit.`,
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
