/**
 * `build820` — pure-function builder for a 005010X218 Payroll Deducted and
 * Other Group Premium Payment for Insurance Products (820). NEVER
 * auto-sends, NEVER opens a socket, NEVER touches the filesystem. The
 * library mechanically emits the premium payment it is told; a spec whose
 * remittance loops cannot form a self-consistent structure is REFUSED via
 * {@link "./build-errors.js".Premium820BuildError}.
 *
 * The read side ({@link "./get-820.js".get820Payments}) is lenient — a real
 * 820 with a stray, un-openable RMR is preserved verbatim, never rejected.
 * The builder takes the opposite stance: it REFUSES rather than emit a
 * remittance a downstream cash-poster would silently drop or merge into the
 * next loop. A caller that must reproduce a knowingly-malformed payer
 * artifact drops to {@link "../../builder/build-interchange.js".buildInterchange},
 * which applies no domain guard.
 *
 * Output shape: a complete {@link X12Interchange} wrapping a single GS..GE
 * functional group (GS-01 `"RA"`) containing a single ST..SE 820
 * transaction set (ST-03 `005010X218`), spec-clean and round-trippable
 * through {@link parseX12}. The builder emits segments in TR3 loop order so
 * a well-formed spec round-trips through `get820Payments` field-for-field.
 *
 * Known limitation: the 820 carries no hard TR3 balance equation (BPR-02 is
 * not required to equal Σ of the RMR open items), so the builder emits all
 * monetary amounts verbatim and never raises a balance-mismatch refusal — a
 * deliberate contrast with `build835`.
 */

import { PREMIUM_820_BUILD_ERROR_CODES, Premium820BuildError } from "./build-errors.js";
import type {
  Build820AddressSpec,
  Build820OpenItemSpec,
  Build820PartySpec,
  Build820PersonSpec,
  Build820ReferenceSpec,
  Build820RemittanceSpec,
  Build820Spec,
} from "./build-820-types.js";
import { parseX12 } from "../../parser/index.js";
import type { X12Interchange } from "../../parser/types.js";
import { escapeRelease } from "../../parser/release.js";

/** GS-08 / ST-03 version + release emitted for every 820 — the WPC TR3 `005010X218`. @internal */
const X218_VERSION_RELEASE = "005010X218";

/** GS-01 functional identifier code for the 820. `RA` = Payment Order/Remittance Advice. @internal */
const X12_820_FUNCTIONAL_ID = "RA";

/** GS-07 standards agency code — `X` for ASC X12. @internal */
const X12_AGENCY_CODE = "X";

/**
 * `build820` — assemble a 005010X218 820 around the supplied spec.
 *
 * Refused via {@link "./build-errors.js".Premium820BuildError} with code
 * `X12_820_BUILD_INVALID_SPEC`:
 * - no TRN trace, or no remittance loop;
 * - a remittance with neither an `entity` nor an `individual` (nothing opens
 *   its loop), or with no `openItems`;
 * - an open item with empty `qualifier` AND empty `referenceId` (the read
 *   side drops it);
 * - an over-long (> 9 char) interchange control number.
 *
 * @example
 * ```ts
 * import { build820, X12Decimal } from "@cosyte/x12";
 * const ix = build820({
 *   envelope: {
 *     senderId: "EMPLOYERCO", receiverId: "MEDPAY",
 *     interchangeDate: "260601", interchangeTime: "1200",
 *     interchangeControlNumber: "000000001",
 *     groupControlNumber: "1", transactionSetControlNumber: "0001",
 *   },
 *   payment: {
 *     transactionHandlingCode: "I",
 *     totalPremiumAmount: X12Decimal.fromString("250.00")!,
 *     creditDebitFlag: "C", method: "ACH", paymentDate: "20260601",
 *   },
 *   traces: [{ traceTypeCode: "1", referenceId: "PREM-202606" }],
 *   remittances: [{
 *     individual: { entityIdentifierCode: "IL", lastName: "DOE", idQualifier: "34", idCode: "MBR0001" },
 *     openItems: [{ qualifier: "AZ", referenceId: "POL-0001", amountPaid: X12Decimal.fromString("250.00")! }],
 *   }],
 * });
 * ```
 */
export function build820(spec: Build820Spec): X12Interchange {
  const { envelope } = spec;

  // ---- Structural preconditions (refuse an impossible remittance) -------

  enforceStructuralSpec(spec);

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
   * Join already-escaped element strings into a segment, dropping trailing
   * empty elements (interior empties are positionally meaningful and kept).
   */
  const seg = (parts: readonly string[]): string => {
    let end = parts.length;
    while (end > 1 && parts[end - 1] === "") end -= 1;
    return parts.slice(0, end).join(elementSeparator) + segmentTerminator;
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
      pad(envelope.interchangeDate, 6), // ISA-09 — YYMMDD
      pad(envelope.interchangeTime, 4), // ISA-10 — HHMM
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
    X12_820_FUNCTIONAL_ID, // GS-01 — "RA"
    esc(applicationSenderCode), // GS-02
    esc(applicationReceiverCode), // GS-03
    groupDate, // GS-04 — CCYYMMDD
    groupTime, // GS-05 — HHMM
    esc(envelope.groupControlNumber), // GS-06
    X12_AGENCY_CODE, // GS-07
    X218_VERSION_RELEASE, // GS-08
  ]);

  const stControlNumber = envelope.transactionSetControlNumber;
  const st = seg(["ST", "820", esc(stControlNumber), X218_VERSION_RELEASE]);

  // ---- Body segments ----------------------------------------------------

  const body: string[] = [];

  // BPR — payment header. BPR-16 (payment date) is positionally pinned at
  // element 16, so interior elements 6..15 are emitted empty and held in
  // place by the trailing date.
  body.push(
    seg([
      "BPR",
      esc(spec.payment.transactionHandlingCode),
      esc(spec.payment.totalPremiumAmount.toString()),
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

  // Header parties — receiver (Loop 1000A, N1*PE) then remitter (Loop
  // 1000B, N1*PR / N1*RM). The read side keys on the N1 qualifier, not the
  // order, but each party's N3/N4/REF must immediately follow its N1.
  if (spec.receiver !== undefined) emitParty(spec.receiver, body, seg, esc);
  if (spec.remitter !== undefined) emitParty(spec.remitter, body, seg, esc);

  for (const remittance of spec.remittances) {
    emitRemittance(remittance, body, seg, esc);
  }

  // ---- SE / GE / IEA ----------------------------------------------------

  // SE-01 counts every segment in the set, ST and SE inclusive.
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
 * Refuse a structurally impossible spec before any emit. PHI-clean: messages
 * carry indices + counts, never a member id / name. @internal
 */
function enforceStructuralSpec(spec: Build820Spec): void {
  if (spec.traces.length === 0) {
    throw new Premium820BuildError(
      PREMIUM_820_BUILD_ERROR_CODES.X12_820_BUILD_INVALID_SPEC,
      "build820: at least one TRN trace is required (TR3 005010X218 header).",
    );
  }
  if (spec.remittances.length === 0) {
    throw new Premium820BuildError(
      PREMIUM_820_BUILD_ERROR_CODES.X12_820_BUILD_INVALID_SPEC,
      "build820: at least one remittance (Loop 2000) is required.",
    );
  }
  for (let r = 0; r < spec.remittances.length; r += 1) {
    const remittance = spec.remittances[r];
    if (remittance === undefined) continue;
    if (remittance.entity === undefined && remittance.individual === undefined) {
      throw new Premium820BuildError(
        PREMIUM_820_BUILD_ERROR_CODES.X12_820_BUILD_INVALID_SPEC,
        `build820: remittance at index ${String(r)} has neither an entity (ENT) nor an individual (NM1) to open its loop.`,
      );
    }
    if (remittance.openItems.length === 0) {
      throw new Premium820BuildError(
        PREMIUM_820_BUILD_ERROR_CODES.X12_820_BUILD_INVALID_SPEC,
        `build820: remittance at index ${String(r)} has no RMR open item.`,
      );
    }
    for (let o = 0; o < remittance.openItems.length; o += 1) {
      const item = remittance.openItems[o];
      if (item === undefined) continue;
      if (item.qualifier === "" && item.referenceId === "") {
        throw new Premium820BuildError(
          PREMIUM_820_BUILD_ERROR_CODES.X12_820_BUILD_INVALID_SPEC,
          `build820: open item at remittance[${String(r)}].openItems[${String(o)}] has no identity (empty RMR-01 qualifier and RMR-02 reference id).`,
        );
      }
    }
  }
}

// ---------------------------------------------------------------------------
// Segment emitters. Each pushes spec-clean segment strings onto `body` in
// TR3 005010X218 loop order so the result round-trips through `get820Payments`.
// ---------------------------------------------------------------------------

/** Emit a Loop 1000A/1000B party (N1 + N3 + N4 + REF*). @internal */
function emitParty(
  party: Build820PartySpec,
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
  emitAddress(party.address, body, seg, esc);
  for (const ref of party.references ?? []) body.push(emitRef(ref, seg, esc));
}

/** Emit N3 + N4 for an address block, only the present lines / fields. @internal */
function emitAddress(
  address: Build820AddressSpec | undefined,
  body: string[],
  seg: (parts: readonly string[]) => string,
  esc: (value: string) => string,
): void {
  if (address === undefined) return;
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

/**
 * Emit a Loop 2000 remittance. The ENT (if any) opens an organization
 * summary; an NM1 immediately after it (before any RMR) names the loop's
 * individual on the read side, so the NM1 MUST precede the open items. REF /
 * DTM / RMR / ADX then attach to the open loop. @internal
 */
function emitRemittance(
  remittance: Build820RemittanceSpec,
  body: string[],
  seg: (parts: readonly string[]) => string,
  esc: (value: string) => string,
): void {
  if (remittance.entity !== undefined) {
    const e = remittance.entity;
    body.push(
      seg([
        "ENT",
        esc(e.assignedNumber ?? ""),
        esc(e.entityIdentifierCode ?? ""),
        esc(e.idQualifier ?? ""),
        esc(e.idCode ?? ""),
      ]),
    );
  }
  if (remittance.individual !== undefined) {
    body.push(emitPerson(remittance.individual, seg, esc));
  }
  for (const ref of remittance.references ?? []) body.push(emitRef(ref, seg, esc));
  for (const date of remittance.dates ?? []) {
    body.push(seg(["DTM", esc(date.qualifier), esc(date.value)]));
  }
  for (const item of remittance.openItems) body.push(emitOpenItem(item, seg, esc));
  for (const adjustment of remittance.adjustments ?? []) {
    body.push(
      seg([
        "ADX",
        esc(adjustment.amount.toString()),
        esc(adjustment.reasonCode),
        esc(adjustment.referenceQualifier ?? ""),
        esc(adjustment.referenceId ?? ""),
      ]),
    );
  }
}

/** Emit an NM1 individual (entity type qualifier `"1"`, ignored on read). @internal */
function emitPerson(
  person: Build820PersonSpec,
  seg: (parts: readonly string[]) => string,
  esc: (value: string) => string,
): string {
  return seg([
    "NM1",
    esc(person.entityIdentifierCode),
    "1", // NM1-02 entity type qualifier — not read by get820Payments
    esc(person.lastName ?? ""),
    esc(person.firstName ?? ""),
    esc(person.middleName ?? ""),
    "", // NM1-06 name prefix
    esc(person.suffix ?? ""),
    esc(person.idQualifier ?? ""),
    esc(person.idCode ?? ""),
  ]);
}

/** Emit an RMR open item. RMR-05 amount due is emitted only when supplied. @internal */
function emitOpenItem(
  item: Build820OpenItemSpec,
  seg: (parts: readonly string[]) => string,
  esc: (value: string) => string,
): string {
  return seg([
    "RMR",
    esc(item.qualifier),
    esc(item.referenceId),
    esc(item.paymentActionCode ?? ""),
    esc(item.amountPaid.toString()),
    item.amountDue === undefined ? "" : esc(item.amountDue.toString()),
  ]);
}

/** @internal */
function emitRef(
  ref: Build820ReferenceSpec,
  seg: (parts: readonly string[]) => string,
  esc: (value: string) => string,
): string {
  return seg(["REF", esc(ref.qualifier), esc(ref.value), esc(ref.description ?? "")]);
}

// ---------------------------------------------------------------------------
// String helpers — mirror the `build835` emit primitives.
// ---------------------------------------------------------------------------

/** @internal */
function pad(value: string, width: number): string {
  if (value.length === width) return value;
  if (value.length < width) return value + " ".repeat(width - value.length);
  return value.slice(0, width);
}

/**
 * Zero-pad a control number to `width` chars (ISA-13 / IEA-02 are always 9).
 * Throws {@link Premium820BuildError} if the value already exceeds the
 * width — a silently-truncated control number would break ISA-13↔IEA-02
 * reconciliation. @internal
 */
function padControl(value: string, width: number): string {
  if (value.length === width) return value;
  if (value.length < width) return "0".repeat(width - value.length) + value;
  throw new Premium820BuildError(
    PREMIUM_820_BUILD_ERROR_CODES.X12_820_BUILD_INVALID_SPEC,
    `build820: control number "${value}" exceeds the ${String(width)}-char spec limit.`,
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
