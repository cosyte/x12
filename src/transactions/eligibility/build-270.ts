/**
 * `build270` - pure-function builder for a 005010X279A1 Health Care
 * Eligibility Benefit Inquiry. NEVER auto-sends, NEVER opens a socket, NEVER
 * touches the filesystem. The library mechanically emits the inquiry it is
 * told; a spec whose informationSources / receivers / subscribers /
 * (dependents) tree cannot form a valid HL hierarchy is REFUSED via {@link
 * "./build-270-errors.js".Eligibility270BuildError}.
 *
 * The HL spine is the inquiry's safety primitive, so the builder OWNS it: it
 * computes every HL-01 id (sequential within the transaction), HL-02 parent
 * pointer (20 to 21 to 22 to 23) and HL-04 has-child flag from the nested
 * tree. Callers never hand-code the spine, a structurally inconsistent
 * hierarchy is therefore unrepresentable, and the SE-01 segment count is
 * correct by construction.
 *
 * **Spec-clean by construction is the whole contract, so the builder refuses
 * anything it cannot make spec-clean.** A subscriber or dependent with no name
 * loop, a level whose only inquiry asks nothing at all, a receiver with no
 * subscriber: each is a document a payer would have to repair, so it is
 * refused rather than emitted. That is also why the emit side and the read
 * side disagree deliberately. {@link "./get-270.js".get270Inquiry} is lenient
 * and returns a model with the incomplete region ABSENT and a warning beside
 * it; handing such a model back to this builder refuses, because the region it
 * is missing is one this builder would have to invent to emit. A caller that
 * must reproduce a knowingly-malformed artifact drops to {@link
 * "../../builder/build-interchange.js".buildInterchange}, which applies no
 * domain guard.
 *
 * Output shape: a complete {@link X12Interchange} wrapping a single GS..GE
 * functional group (GS-01 `"HS"`) containing a single ST..SE 270 transaction
 * set (ST-03 `005010X279A1`), spec-clean and round-trippable through
 * `parseX12`. The builder emits segments in TR3 loop order so a well-formed
 * spec round-trips through `get270Inquiry` field for field.
 */

import { requireCallerArray } from "../../builder/caller-array.js";
import { requireControlNumber } from "../../builder/caller-control-number.js";
import { makeCallerEscaper } from "../../builder/caller-string.js";
import { requireCallerSegment } from "../../builder/caller-segment.js";
import { renderCallerValue } from "../../builder/caller-value.js";
import { parseX12 } from "../../parser/index.js";
import type { X12Interchange } from "../../parser/types.js";

import { ELIGIBILITY_270_BUILD_ERROR_CODES, Eligibility270BuildError } from "./build-270-errors.js";
import type {
  Build270AddressSpec,
  Build270DependentSpec,
  Build270InformationReceiverSpec,
  Build270InformationSourceSpec,
  Build270InquirySpec,
  Build270NameSpec,
  Build270ReferenceSpec,
  Build270Spec,
  Build270SubscriberSpec,
} from "./build-270-types.js";

/**
 * Refuse with this module's typed error, for {@link requireCallerArray}. A
 * forged array-like where the HL spine expects a list makes the hierarchy
 * structurally impossible, so it reuses `X12_270_BUILD_INVALID_HIERARCHY`
 * rather than minting a code. @internal
 */
function refuseHierarchy(message: string): never {
  throw new Eligibility270BuildError(
    ELIGIBILITY_270_BUILD_ERROR_CODES.X12_270_BUILD_INVALID_HIERARCHY,
    message,
  );
}

/**
 * Refuse with this module's typed error, for {@link makeCallerEscaper} and for
 * every non-hierarchy precondition. A non-string element value is not a
 * hierarchy defect, so it takes `X12_270_BUILD_INVALID_SPEC`. @internal
 */
function refuseSpec(message: string): never {
  throw new Eligibility270BuildError(
    ELIGIBILITY_270_BUILD_ERROR_CODES.X12_270_BUILD_INVALID_SPEC,
    message,
  );
}

/** GS-08 / ST-03 version and release emitted for every 270 - the WPC TR3. @internal */
const X279A1_VERSION_RELEASE = "005010X279A1";

/** GS-01 functional identifier code for the 270. `HS` = Eligibility, Coverage or Benefit Inquiry. @internal */
const X12_270_FUNCTIONAL_ID = "HS";

/** GS-07 standards agency code - `X` for ASC X12. @internal */
const X12_AGENCY_CODE = "X";

/** BHT-01 default: the 270's hierarchical structure code. @internal */
const BHT_STRUCTURE_CODE = "0022";

/** BHT-02 default: `13` is Request, which is what a 270 is. @internal */
const BHT_PURPOSE_REQUEST = "13";

/** HL-03 level codes for the spine the builder computes. @internal */
const HL_LEVEL = { SOURCE: "20", RECEIVER: "21", SUBSCRIBER: "22", DEPENDENT: "23" } as const;

/**
 * `build270` - assemble a 005010X279A1 270 around the supplied spec.
 *
 * Refused via {@link "./build-270-errors.js".Eligibility270BuildError}:
 * - No information sources, a source with no receivers, a receiver with no
 *   subscribers, or a list slot handed something that is not a list, gives
 *   `X12_270_BUILD_INVALID_HIERARCHY`.
 * - A subscriber or dependent with no name loop, a subscriber with neither an
 *   inquiry nor a dependent, a dependent with no inquiry, an inquiry that asks
 *   nothing, an empty or over-long control number, or a non-string element
 *   value, gives `X12_270_BUILD_INVALID_SPEC`.
 *
 * Every refusal message names structural indices and counts. None of them
 * names a member identifier, a member name, a patient name, a trace value or a
 * diagnosis code, and the one caller value any of them renders (a control
 * number) goes through the package's bounded renderer.
 *
 * @example
 * ```ts
 * import { build270 } from "@cosyte/x12";
 * const ix = build270({
 *   envelope: {
 *     senderId: "ANYTOWNCLINIC", receiverId: "MEDPAY",
 *     interchangeDate: "260601", interchangeTime: "1200",
 *     interchangeControlNumber: "000000001",
 *     groupControlNumber: "1", transactionSetControlNumber: "0001",
 *   },
 *   informationSources: [{
 *     name: { entityIdentifierCode: "PR", entityTypeQualifier: "2", lastNameOrOrganizationName: "MEDPAY INSURANCE", idQualifier: "PI", idCode: "PAYER01" },
 *     receivers: [{
 *       name: { entityIdentifierCode: "1P", entityTypeQualifier: "2", lastNameOrOrganizationName: "ANYTOWN CLINIC", idQualifier: "XX", idCode: "1234567890" },
 *       subscribers: [{
 *         traces: [{ traceTypeCode: "1", referenceId: "ELIG0001" }],
 *         name: { entityIdentifierCode: "IL", entityTypeQualifier: "1", lastNameOrOrganizationName: "DOE", firstName: "JANE", idQualifier: "MI", idCode: "MBR0001" },
 *         inquiries: [{ serviceTypeCodes: [{ code: "30" }] }],
 *       }],
 *     }],
 *   }],
 * });
 * ```
 */
export function build270(spec: Build270Spec): X12Interchange {
  const { envelope } = spec;

  // ---- Structural preconditions (refuse an impossible spine) ------------

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
  const esc = makeCallerEscaper(delimiters, "build270", refuseSpec);

  const seg = (parts: readonly string[]): string => {
    requireCallerSegment(parts, "build270", refuseSpec);
    let end = parts.length;
    while (end > 1 && parts[end - 1] === "") end -= 1;
    return parts.slice(0, end).join(elementSeparator) + segmentTerminator;
  };

  const ctx: EmitContext = { seg, esc, repetitionSeparator, componentSeparator };

  // ---- Envelope control numbers -----------------------------------------
  //
  // Refused before the envelope is assembled, for the reason
  // `src/builder/caller-control-number.ts` records: `padControl("", 9)`
  // FABRICATES `"000000000"` into ISA-13 / IEA-02, while GS-06 / GE-02 and
  // ST-02 / SE-02 reach the wire through `esc`, which early-returns on `""`.
  // This builder's `seg` trims a trailing empty element, so an empty
  // transaction control number left the trailer with no SE-02 at all and
  // `warnings: []` throughout.
  requireControlNumber(
    envelope.interchangeControlNumber,
    "ISA-13 / IEA-02",
    "interchangeControlNumber",
    "build270",
    refuseSpec,
  );
  requireControlNumber(
    envelope.groupControlNumber,
    "GS-06 / GE-02",
    "groupControlNumber",
    "build270",
    refuseSpec,
  );
  requireControlNumber(
    envelope.transactionSetControlNumber,
    "ST-02 / SE-02",
    "transactionSetControlNumber",
    "build270",
    refuseSpec,
  );

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

  // ---- GS / ST / BHT ----------------------------------------------------

  const groupDate = envelope.groupDate ?? expandYY(envelope.interchangeDate);
  const groupTime = envelope.groupTime ?? envelope.interchangeTime;
  const applicationSenderCode = envelope.applicationSenderCode ?? envelope.senderId;
  const applicationReceiverCode = envelope.applicationReceiverCode ?? envelope.receiverId;

  const gs = seg([
    "GS",
    X12_270_FUNCTIONAL_ID,
    esc(applicationSenderCode),
    esc(applicationReceiverCode),
    esc(groupDate),
    esc(groupTime),
    esc(envelope.groupControlNumber),
    X12_AGENCY_CODE,
    X279A1_VERSION_RELEASE,
  ]);

  const stControlNumber = envelope.transactionSetControlNumber;
  const st = seg(["ST", "270", esc(stControlNumber), X279A1_VERSION_RELEASE]);

  const header = spec.header ?? {};
  const bht = seg([
    "BHT",
    esc(header.hierarchicalStructureCode ?? BHT_STRUCTURE_CODE),
    esc(header.purposeCode ?? BHT_PURPOSE_REQUEST),
    esc(header.referenceId ?? ""),
    esc(header.date ?? groupDate),
    esc(header.time ?? groupTime),
  ]);

  // ---- Body segments - emit the computed HL spine depth-first -----------

  const body: string[] = [bht];
  const hlCounter: HlCounter = { next: 1 };
  for (const source of spec.informationSources) {
    emitSource(source, body, ctx, hlCounter);
  }

  // ---- SE / GE / IEA ----------------------------------------------------

  const seCount = body.length + 2;
  const se = seg(["SE", String(seCount), esc(stControlNumber)]);
  const ge = seg(["GE", "1", esc(envelope.groupControlNumber)]);
  const iea = seg(["IEA", "1", interchangeControlNumber]);

  const raw = isa + gs + st + body.join("") + se + ge + iea;

  // Final round trip through `parseX12` so the returned interchange is
  // identical to the parsed form every other helper consumes.
  return parseX12(raw);
}

// ---------------------------------------------------------------------------
// Structural guards.
// ---------------------------------------------------------------------------

/**
 * Refuse a structurally impossible or un-emittable spec before any emit.
 *
 * Every list is read through {@link requireCallerArray} and every indexed loop
 * takes its bound from that checked binding, never from a caller-supplied
 * `.length`: a forged `{ length: "9".repeat(120_000) }` coerces to `Infinity`
 * in a `<` comparison, which turns a bounded loop into an unbounded one and
 * hangs the caller instead of refusing. Messages carry structural indices and
 * counts and nothing read out of the inquiry. @internal
 */
function enforceStructuralSpec(spec: Build270Spec): void {
  const sources = requireCallerArray(
    spec.informationSources,
    "build270: spec.informationSources",
    refuseHierarchy,
  );
  if (sources.length === 0) {
    throw new Eligibility270BuildError(
      ELIGIBILITY_270_BUILD_ERROR_CODES.X12_270_BUILD_INVALID_HIERARCHY,
      "build270: at least one information source (HL level 20) is required.",
    );
  }
  for (let s = 0; s < sources.length; s += 1) {
    const source = sources[s];
    if (source === undefined) continue;
    const receivers = requireCallerArray(
      source.receivers,
      `build270: spec.informationSources[${String(s)}].receivers`,
      refuseHierarchy,
    );
    if (receivers.length === 0) {
      throw new Eligibility270BuildError(
        ELIGIBILITY_270_BUILD_ERROR_CODES.X12_270_BUILD_INVALID_HIERARCHY,
        `build270: information source at index ${String(s)} has no receiver (HL level 21) child.`,
      );
    }
    for (let r = 0; r < receivers.length; r += 1) {
      const receiver = receivers[r];
      if (receiver === undefined) continue;
      const subscribers = requireCallerArray(
        receiver.subscribers,
        `build270: spec.informationSources[${String(s)}].receivers[${String(r)}].subscribers`,
        refuseHierarchy,
      );
      if (subscribers.length === 0) {
        throw new Eligibility270BuildError(
          ELIGIBILITY_270_BUILD_ERROR_CODES.X12_270_BUILD_INVALID_HIERARCHY,
          `build270: receiver at source[${String(s)}].receiver[${String(r)}] has no subscriber (HL level 22) child.`,
        );
      }
      for (let u = 0; u < subscribers.length; u += 1) {
        const subscriber = subscribers[u];
        if (subscriber === undefined) continue;
        enforceSubscriber(
          subscriber,
          `source[${String(s)}].receiver[${String(r)}].subscriber[${String(u)}]`,
        );
      }
    }
  }
}

/**
 * Refuse a subscriber this builder could not emit spec-clean, and each of its
 * dependents. Split out so the locator is assembled once. @internal
 */
function enforceSubscriber(subscriber: Build270SubscriberSpec, locator: string): void {
  requireName(subscriber.name, locator);
  const dependents = requireCallerArray(
    subscriber.dependents,
    `build270: ${locator}.dependents`,
    refuseHierarchy,
  );
  const inquiries = requireCallerArray(
    subscriber.inquiries,
    `build270: ${locator}.inquiries`,
    refuseHierarchy,
  );
  if (inquiries.length === 0 && dependents.length === 0) {
    throw new Eligibility270BuildError(
      ELIGIBILITY_270_BUILD_ERROR_CODES.X12_270_BUILD_INVALID_SPEC,
      `build270: subscriber at ${locator} asks nothing: it carries no eligibility inquiry (Loop 2110C) and no dependent that carries one.`,
    );
  }
  for (let q = 0; q < inquiries.length; q += 1) {
    enforceInquiry(inquiries[q], `${locator}.inquiry[${String(q)}]`);
  }
  for (let d = 0; d < dependents.length; d += 1) {
    const dependent = dependents[d];
    if (dependent === undefined) continue;
    enforceDependent(dependent, `${locator}.dependent[${String(d)}]`);
  }
}

/** @internal */
function enforceDependent(dependent: Build270DependentSpec, locator: string): void {
  requireName(dependent.name, locator);
  const inquiries = requireCallerArray(
    dependent.inquiries,
    `build270: ${locator}.inquiries`,
    refuseHierarchy,
  );
  if (inquiries.length === 0) {
    throw new Eligibility270BuildError(
      ELIGIBILITY_270_BUILD_ERROR_CODES.X12_270_BUILD_INVALID_SPEC,
      `build270: dependent at ${locator} carries no eligibility inquiry (Loop 2110D) to ask.`,
    );
  }
  for (let q = 0; q < inquiries.length; q += 1) {
    enforceInquiry(inquiries[q], `${locator}.inquiry[${String(q)}]`);
  }
}

/**
 * Refuse a name loop that is absent or carries neither of the two elements the
 * TR3 makes required on every NM1. @internal
 */
function requireName(name: Build270NameSpec | undefined, locator: string): void {
  if (name === undefined || typeof name !== "object") {
    throw new Eligibility270BuildError(
      ELIGIBILITY_270_BUILD_ERROR_CODES.X12_270_BUILD_INVALID_SPEC,
      `build270: the level at ${locator} has no name loop (NM1), which every level of a 270 requires.`,
    );
  }
}

/**
 * Refuse an inquiry that asks nothing. An EQ with neither a service type nor a
 * procedure is an empty question: emitting it would put a segment on the wire
 * that no payer can answer, and defaulting a service type would be this
 * library asking something the caller did not. @internal
 */
function enforceInquiry(inquiry: Build270InquirySpec | undefined, locator: string): void {
  if (inquiry === undefined) return;
  const serviceTypeCodes = requireCallerArray(
    inquiry.serviceTypeCodes,
    `build270: ${locator}.serviceTypeCodes`,
    refuseHierarchy,
  );
  if (serviceTypeCodes.length === 0 && inquiry.procedure === undefined) {
    throw new Eligibility270BuildError(
      ELIGIBILITY_270_BUILD_ERROR_CODES.X12_270_BUILD_INVALID_SPEC,
      `build270: the inquiry at ${locator} asks nothing: it carries neither a service type code (EQ-01) nor a procedure (EQ-02).`,
    );
  }
}

// ---------------------------------------------------------------------------
// Loop emitters.
// ---------------------------------------------------------------------------

interface EmitContext {
  readonly seg: (parts: readonly string[]) => string;
  readonly esc: (value: string) => string;
  readonly repetitionSeparator: string;
  readonly componentSeparator: string;
}

interface HlCounter {
  next: number;
}

/** Emit a Loop 2000A information source HL and its receiver subtree. @internal */
function emitSource(
  source: Build270InformationSourceSpec,
  body: string[],
  ctx: EmitContext,
  counter: HlCounter,
): void {
  const hlId = String(counter.next);
  counter.next += 1;
  body.push(ctx.seg(["HL", hlId, "", HL_LEVEL.SOURCE, "1"]));
  emitName(source.name, body, ctx);
  for (const ref of source.references ?? []) body.push(emitRef(ref, ctx));
  for (const receiver of source.receivers) {
    emitReceiver(receiver, hlId, body, ctx, counter);
  }
}

/** Emit a Loop 2000B information receiver HL and its subscriber subtree. @internal */
function emitReceiver(
  receiver: Build270InformationReceiverSpec,
  parentHlId: string,
  body: string[],
  ctx: EmitContext,
  counter: HlCounter,
): void {
  const hlId = String(counter.next);
  counter.next += 1;
  body.push(ctx.seg(["HL", hlId, parentHlId, HL_LEVEL.RECEIVER, "1"]));
  emitName(receiver.name, body, ctx);
  for (const ref of receiver.references ?? []) body.push(emitRef(ref, ctx));
  for (const subscriber of receiver.subscribers) {
    emitSubscriber(subscriber, hlId, body, ctx, counter);
  }
}

/** Emit a Loop 2000C subscriber HL with its traces, name, refs, dates and inquiries. @internal */
function emitSubscriber(
  subscriber: Build270SubscriberSpec,
  parentHlId: string,
  body: string[],
  ctx: EmitContext,
  counter: HlCounter,
): void {
  const hlId = String(counter.next);
  counter.next += 1;
  const dependents = subscriber.dependents ?? [];
  const hasChild = dependents.length > 0 ? "1" : "0";
  body.push(ctx.seg(["HL", hlId, parentHlId, HL_LEVEL.SUBSCRIBER, hasChild]));

  for (const trace of subscriber.traces ?? []) emitTrace(trace, body, ctx);
  emitName(subscriber.name, body, ctx);
  for (const ref of subscriber.references ?? []) body.push(emitRef(ref, ctx));
  for (const date of subscriber.dates ?? []) emitDate(date, body, ctx);
  for (const inquiry of subscriber.inquiries ?? []) emitInquiry(inquiry, body, ctx);

  for (const dependent of dependents) {
    emitDependent(dependent, hlId, body, ctx, counter);
  }
}

/** Emit a Loop 2000D dependent HL with its traces, name, refs, dates and inquiries. @internal */
function emitDependent(
  dependent: Build270DependentSpec,
  parentHlId: string,
  body: string[],
  ctx: EmitContext,
  counter: HlCounter,
): void {
  const hlId = String(counter.next);
  counter.next += 1;
  body.push(ctx.seg(["HL", hlId, parentHlId, HL_LEVEL.DEPENDENT, "0"]));

  for (const trace of dependent.traces ?? []) emitTrace(trace, body, ctx);
  emitName(dependent.name, body, ctx);
  for (const ref of dependent.references ?? []) body.push(emitRef(ref, ctx));
  for (const date of dependent.dates ?? []) emitDate(date, body, ctx);
  for (const inquiry of dependent.inquiries) emitInquiry(inquiry, body, ctx);
}

/** Emit an NM1 name loop, plus the N3 / N4 address and DMG demographics. @internal */
function emitName(name: Build270NameSpec, body: string[], ctx: EmitContext): void {
  body.push(
    ctx.seg([
      "NM1",
      ctx.esc(name.entityIdentifierCode),
      ctx.esc(name.entityTypeQualifier),
      ctx.esc(name.lastNameOrOrganizationName ?? ""),
      ctx.esc(name.firstName ?? ""),
      ctx.esc(name.middleName ?? ""),
      "",
      ctx.esc(name.suffix ?? ""),
      ctx.esc(name.idQualifier ?? ""),
      ctx.esc(name.idCode ?? ""),
    ]),
  );
  if (name.address !== undefined) emitAddress(name.address, body, ctx);
  if (name.dateOfBirth !== undefined || name.genderCode !== undefined) {
    body.push(
      ctx.seg(["DMG", "D8", ctx.esc(name.dateOfBirth ?? ""), ctx.esc(name.genderCode ?? "")]),
    );
  }
}

/** Emit N3 + N4 for an address block. @internal */
function emitAddress(address: Build270AddressSpec, body: string[], ctx: EmitContext): void {
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

/**
 * Emit a Loop 2110 EQ inquiry with its REF and DTP. EQ-01 is a repeating
 * simple element and EQ-02 / EQ-05 are composites: each component is escaped
 * first and joined with the RAW separator, then handed to `seg` already
 * formed, so a separator this library writes is never itself escaped.
 * @internal
 */
function emitInquiry(inquiry: Build270InquirySpec, body: string[], ctx: EmitContext): void {
  const serviceTypeElement = (inquiry.serviceTypeCodes ?? [])
    .map((s) => ctx.esc(s.code))
    .join(ctx.repetitionSeparator);
  const procedure = inquiry.procedure;
  const procedureElement =
    procedure === undefined
      ? ""
      : trimComponents([
          ctx.esc(procedure.qualifier),
          ctx.esc(procedure.code ?? ""),
          ...(procedure.modifiers ?? []).map(ctx.esc),
          ctx.esc(procedure.description ?? ""),
        ]).join(ctx.componentSeparator);
  const pointerElement = trimComponents((inquiry.diagnosisCodePointers ?? []).map(ctx.esc)).join(
    ctx.componentSeparator,
  );

  body.push(
    ctx.seg([
      "EQ",
      serviceTypeElement,
      procedureElement,
      ctx.esc(inquiry.coverageLevelCode ?? ""),
      ctx.esc(inquiry.insuranceTypeCode ?? ""),
      pointerElement,
    ]),
  );

  for (const ref of inquiry.references ?? []) body.push(emitRef(ref, ctx));
  for (const date of inquiry.dates ?? []) emitDate(date, body, ctx);
}

/**
 * Drop trailing empty components so a composite is not padded with separators
 * the caller did not ask for. Mirrors what `seg` does for elements. @internal
 */
function trimComponents(parts: readonly string[]): readonly string[] {
  let end = parts.length;
  while (end > 0 && parts[end - 1] === "") end -= 1;
  return parts.slice(0, end);
}

/** @internal */
function emitTrace(
  trace: {
    traceTypeCode: string;
    referenceId: string;
    originatingCompanyId?: string;
    supplementalReferenceId?: string;
  },
  body: string[],
  ctx: EmitContext,
): void {
  body.push(
    ctx.seg([
      "TRN",
      ctx.esc(trace.traceTypeCode),
      ctx.esc(trace.referenceId),
      ctx.esc(trace.originatingCompanyId ?? ""),
      ctx.esc(trace.supplementalReferenceId ?? ""),
    ]),
  );
}

/** @internal */
function emitRef(ref: Build270ReferenceSpec, ctx: EmitContext): string {
  return ctx.seg([
    "REF",
    ctx.esc(ref.qualifier),
    ctx.esc(ref.value),
    ctx.esc(ref.description ?? ""),
  ]);
}

/** @internal */
function emitDate(
  date: { qualifier: string; formatQualifier: string; value: string },
  body: string[],
  ctx: EmitContext,
): void {
  body.push(
    ctx.seg(["DTP", ctx.esc(date.qualifier), ctx.esc(date.formatQualifier), ctx.esc(date.value)]),
  );
}

// ---------------------------------------------------------------------------
// String helpers - the same emit primitives `build271` uses.
// ---------------------------------------------------------------------------

/** @internal */
function pad(value: string, width: number): string {
  if (value.length === width) return value;
  if (value.length < width) return value + " ".repeat(width - value.length);
  return value.slice(0, width);
}

/**
 * Zero-pad a control number to `width` chars (ISA-13 / IEA-02 are always 9).
 * Throws {@link Eligibility270BuildError} if the value already exceeds the
 * width. @internal
 */
function padControl(value: string, width: number): string {
  if (value.length === width) return value;
  if (value.length < width) return "0".repeat(width - value.length) + value;
  throw new Eligibility270BuildError(
    ELIGIBILITY_270_BUILD_ERROR_CODES.X12_270_BUILD_INVALID_SPEC,
    `build270: control number ${renderCallerValue(value)} exceeds the ${String(width)}-char spec limit.`,
  );
}

/**
 * Expand a 6-digit YYMMDD into CCYYMMDD for GS-04. Years `00` to `49` are
 * 21st century, `50` to `99` are 20th. A value already in CCYYMMDD form passes
 * through unchanged. @internal
 */
function expandYY(yymmdd: string): string {
  if (yymmdd.length !== 6) return yymmdd;
  const yy = parseInt(yymmdd.slice(0, 2), 10);
  if (Number.isNaN(yy)) return yymmdd;
  const century = yy < 50 ? "20" : "19";
  return century + yymmdd;
}
