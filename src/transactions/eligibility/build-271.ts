/**
 * `build271` - pure-function builder for a 005010X279A1 Health Care
 * Eligibility Benefit Response. NEVER auto-sends, NEVER opens a socket,
 * NEVER touches the filesystem. The library mechanically emits the response
 * it is told; a spec whose informationSources → receivers → subscribers →
 * (dependents) tree cannot form a valid HL hierarchy is REFUSED via {@link
 * "./build-errors.js".Eligibility271BuildError}.
 *
 * The HL spine is the 271's safety primitive, so the builder OWNS it: it
 * computes every HL-01 id (sequential within the transaction), HL-02 parent
 * pointer (20 → 21 → 22 → 23), and HL-04 has-child flag from the nested
 * tree. Callers never hand-code the spine - a structurally inconsistent
 * hierarchy is therefore unrepresentable, and the SE-01 segment count is
 * correct by construction.
 *
 * The read side ({@link "./get-271.js".get271Eligibility}) is lenient - a
 * real 271 with a broken HL parent pointer is WARNED, never rejected. The
 * builder takes the opposite stance: it REFUSES rather than emit a
 * hierarchy a downstream consumer would have to repair. A caller that must
 * reproduce a knowingly-malformed payer artifact drops to {@link
 * "../../builder/build-interchange.js".buildInterchange}, which applies no
 * domain guard.
 *
 * Output shape: a complete {@link X12Interchange} wrapping a single GS..GE
 * functional group (GS-01 `"HB"`) containing a single ST..SE 271
 * transaction set (ST-03 `005010X279A1`), spec-clean and round-trippable
 * through {@link parseX12}. The builder emits segments in TR3 loop order so
 * a well-formed spec round-trips through `get271Eligibility`
 * field-for-field.
 */

import { ELIGIBILITY_271_BUILD_ERROR_CODES, Eligibility271BuildError } from "./build-errors.js";
import type {
  Build271AddressSpec,
  Build271BenefitSpec,
  Build271DependentSpec,
  Build271EntitySpec,
  Build271InformationReceiverSpec,
  Build271InformationSourceSpec,
  Build271MemberSpec,
  Build271ReferenceSpec,
  Build271Spec,
  Build271SubscriberSpec,
} from "./build-271-types.js";
import { parseX12 } from "../../parser/index.js";
import type { X12Interchange } from "../../parser/types.js";
import type { X12Decimal } from "../../decimal.js";
import { requireCallerArray } from "../../builder/caller-array.js";
import { requireCallerDecimal } from "../../builder/caller-decimal.js";
import { requireCallerSegment } from "../../builder/caller-segment.js";
import { renderCallerValue } from "../../builder/caller-value.js";
import { makeCallerEscaper } from "../../builder/caller-string.js";
import { requireControlNumber } from "../../builder/caller-control-number.js";

/**
 * Refuse with this module's typed error, for {@link requireCallerArray}. A
 * forged array-like where the HL spine expects a list makes the hierarchy
 * structurally impossible, so it reuses `X12_271_BUILD_INVALID_HIERARCHY`
 * rather than minting a code. @internal
 */
function refuseHierarchy(message: string): never {
  throw new Eligibility271BuildError(
    ELIGIBILITY_271_BUILD_ERROR_CODES.X12_271_BUILD_INVALID_HIERARCHY,
    message,
  );
}

/**
 * Refuse with this module's typed error, for {@link makeCallerEscaper}. A
 * non-string element value is a non-hierarchy precondition failure, so it takes
 * `X12_271_BUILD_INVALID_SPEC` rather than the hierarchy code. @internal
 */
function refuseSpec(message: string): never {
  throw new Eligibility271BuildError(
    ELIGIBILITY_271_BUILD_ERROR_CODES.X12_271_BUILD_INVALID_SPEC,
    message,
  );
}

/**
 * Escape a caller-supplied `X12Decimal` into an element, refusing a raw
 * `number` instead of emitting its JavaScript rendering
 * (`X12-DECIMAL-BYPASSES-THE-GUARD`). @internal
 */
function escDec(value: X12Decimal, esc: (value: string) => string): string {
  return esc(requireCallerDecimal(value, "build271", refuseSpec).toString());
}

/** GS-08 / ST-03 version + release emitted for every 271 - the WPC TR3 `005010X279A1`. @internal */
const X279A1_VERSION_RELEASE = "005010X279A1";

/** GS-01 functional identifier code for the 271. `HB` = Eligibility, Coverage or Benefit Information. @internal */
const X12_271_FUNCTIONAL_ID = "HB";

/** GS-07 standards agency code - `X` for ASC X12. @internal */
const X12_AGENCY_CODE = "X";

/** HL-03 level codes for the spine the builder computes. @internal */
const HL_LEVEL = { SOURCE: "20", RECEIVER: "21", SUBSCRIBER: "22", DEPENDENT: "23" } as const;

/**
 * `build271` - assemble a 005010X279A1 271 around the supplied spec.
 *
 * Refused via {@link "./build-errors.js".Eligibility271BuildError}:
 * - No information sources, a source with no receivers, or a receiver with
 *   no subscribers → `X12_271_BUILD_INVALID_HIERARCHY`.
 * - An over-long (>9 char) interchange control number →
 *   `X12_271_BUILD_INVALID_SPEC`.
 *
 * @example
 * ```ts
 * import { build271, X12Decimal } from "@cosyte/x12";
 * const ix = build271({
 *   envelope: {
 *     senderId: "MEDPAY", receiverId: "PROVIDER",
 *     interchangeDate: "260601", interchangeTime: "1200",
 *     interchangeControlNumber: "000000001",
 *     groupControlNumber: "1", transactionSetControlNumber: "0001",
 *   },
 *   informationSources: [{
 *     entity: { entityIdentifierCode: "PR", entityTypeQualifier: "2", name: "MEDPAY INSURANCE", idQualifier: "PI", idCode: "00123" },
 *     receivers: [{
 *       entity: { entityIdentifierCode: "1P", entityTypeQualifier: "2", name: "ANYTOWN CLINIC", idQualifier: "XX", idCode: "1234567890" },
 *       subscribers: [{
 *         traces: [{ traceTypeCode: "2", referenceId: "ELIG001" }],
 *         name: { entityIdentifierCode: "IL", entityTypeQualifier: "1", lastName: "DOE", firstName: "JANE", idQualifier: "MI", idCode: "MBR0001" },
 *         benefits: [{ eligibilityCode: "1", coverageLevelCode: "IND", serviceTypeCodes: [{ code: "30" }], monetaryAmount: X12Decimal.fromString("1000.00")! }],
 *       }],
 *     }],
 *   }],
 * });
 * ```
 */
export function build271(spec: Build271Spec): X12Interchange {
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
  const esc = makeCallerEscaper(delimiters, "build271", refuseSpec);

  const seg = (parts: readonly string[]): string => {
    requireCallerSegment(parts, "build271", refuseSpec);
    let end = parts.length;
    while (end > 1 && parts[end - 1] === "") end -= 1;
    return parts.slice(0, end).join(elementSeparator) + segmentTerminator;
  };

  const ctx: EmitContext = { seg, esc, repetitionSeparator };

  // ---- ISA envelope -----------------------------------------------------

  const senderQualifier = envelope.senderQualifier ?? "ZZ";
  const receiverQualifier = envelope.receiverQualifier ?? "ZZ";
  const usageIndicator = envelope.usageIndicator ?? "P";
  // ---- Envelope control numbers -----------------------------------------
  //
  // Refused before the envelope is assembled, because every one of the three
  // pairs was silent on an empty value and two of them were silent in different
  // ways: `padControl("", 9)` FABRICATES `"000000000"` into ISA-13 / IEA-02,
  // while GS-06 / GE-02 and ST-02 / SE-02 reach the wire through `esc`, which
  // early-returns on `""`, so the required element is LOST.
  //
  // 🛑 SAY `warnings: []`, NEVER "the pair reconciled against itself". That is
  // true only of `buildInterchange` and `build999`, which join untrimmed. THIS
  // builder's `seg` trims a trailing empty element, so the trailer carried no
  // GE-02 and no SE-02 at all - measured at `28b417f` in all seven domain
  // builders (`GE*1~`, and `SE*15~`/`17~`/`18~`/`19~`/`21~`/`22~`/`25~`), with
  // GS-06 and ST-02 empty mid-segment and `warnings: []` throughout. A draft
  // published the `buildInterchange` reading as the class and pass 2 measured
  // it false here. The refuse-rather-than-warn reasoning is in
  // `src/builder/caller-control-number.ts`.
  //
  // Placed here rather than at the top of the function, so every guard ABOVE
  // this line keeps its precedence. It does NOT preserve every ordering, and a
  // draft of this comment claimed it did: a defect this builder detects LATER,
  // during body assembly, now reports THIS refusal instead, on this module's
  // own `*_INVALID_SPEC` code. Measured in `build999` and disclosed in
  // `CHANGELOG.md`; do not restate it as "the same first refusal as before".
  requireControlNumber(
    envelope.interchangeControlNumber,
    "ISA-13 / IEA-02",
    "interchangeControlNumber",
    "build271",
    refuseSpec,
  );
  requireControlNumber(
    envelope.groupControlNumber,
    "GS-06 / GE-02",
    "groupControlNumber",
    "build271",
    refuseSpec,
  );
  requireControlNumber(
    envelope.transactionSetControlNumber,
    "ST-02 / SE-02",
    "transactionSetControlNumber",
    "build271",
    refuseSpec,
  );

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
    X12_271_FUNCTIONAL_ID,
    esc(applicationSenderCode),
    esc(applicationReceiverCode),
    esc(groupDate),
    esc(groupTime),
    esc(envelope.groupControlNumber),
    X12_AGENCY_CODE,
    X279A1_VERSION_RELEASE,
  ]);

  const stControlNumber = envelope.transactionSetControlNumber;
  const st = seg(["ST", "271", esc(stControlNumber), X279A1_VERSION_RELEASE]);

  // ---- Body segments - emit the computed HL spine depth-first -----------

  const body: string[] = [];
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

  // Final round-trip through `parseX12` so the returned interchange is
  // bit-identical with the parsed form every other helper consumes.
  return parseX12(raw);
}

// ---------------------------------------------------------------------------
// Structural guards.
// ---------------------------------------------------------------------------

/**
 * Refuse a structurally impossible spec before any emit. Covers the HL
 * spine (no sources / childless source / childless receiver). PHI-clean:
 * messages carry indices + counts, never names / member ids. @internal
 */
function enforceStructuralSpec(spec: Build271Spec): void {
  const sources = requireCallerArray(
    spec.informationSources,
    "build271: spec.informationSources",
    refuseHierarchy,
  );
  if (sources.length === 0) {
    throw new Eligibility271BuildError(
      ELIGIBILITY_271_BUILD_ERROR_CODES.X12_271_BUILD_INVALID_HIERARCHY,
      "build271: at least one information source (HL level 20) is required.",
    );
  }
  for (let s = 0; s < sources.length; s += 1) {
    const source = sources[s];
    if (source === undefined) continue;
    const receivers = requireCallerArray(
      source.receivers,
      `build271: spec.informationSources[${String(s)}].receivers`,
      refuseHierarchy,
    );
    if (receivers.length === 0) {
      throw new Eligibility271BuildError(
        ELIGIBILITY_271_BUILD_ERROR_CODES.X12_271_BUILD_INVALID_HIERARCHY,
        `build271: information source at index ${String(s)} has no receiver (HL level 21) child.`,
      );
    }
    for (let r = 0; r < receivers.length; r += 1) {
      const receiver = receivers[r];
      if (receiver === undefined) continue;
      const subscribers = requireCallerArray(
        receiver.subscribers,
        `build271: spec.informationSources[${String(s)}].receivers[${String(r)}].subscribers`,
        refuseHierarchy,
      );
      if (subscribers.length === 0) {
        throw new Eligibility271BuildError(
          ELIGIBILITY_271_BUILD_ERROR_CODES.X12_271_BUILD_INVALID_HIERARCHY,
          `build271: receiver at source[${String(s)}].receiver[${String(r)}] has no subscriber (HL level 22) child.`,
        );
      }
    }
  }
}

// ---------------------------------------------------------------------------
// Loop emitters.
// ---------------------------------------------------------------------------

interface EmitContext {
  readonly seg: (parts: readonly string[]) => string;
  readonly esc: (value: string) => string;
  readonly repetitionSeparator: string;
}

interface HlCounter {
  next: number;
}

/** Emit a Loop 2000A information source HL + its receiver subtree. @internal */
function emitSource(
  source: Build271InformationSourceSpec,
  body: string[],
  ctx: EmitContext,
  counter: HlCounter,
): void {
  const hlId = String(counter.next);
  counter.next += 1;
  body.push(ctx.seg(["HL", hlId, "", HL_LEVEL.SOURCE, "1"]));
  emitEntity(source.entity, body, ctx);
  for (const receiver of source.receivers) {
    emitReceiver(receiver, hlId, body, ctx, counter);
  }
}

/** Emit a Loop 2000B information receiver HL + its subscriber subtree. @internal */
function emitReceiver(
  receiver: Build271InformationReceiverSpec,
  parentHlId: string,
  body: string[],
  ctx: EmitContext,
  counter: HlCounter,
): void {
  const hlId = String(counter.next);
  counter.next += 1;
  body.push(ctx.seg(["HL", hlId, parentHlId, HL_LEVEL.RECEIVER, "1"]));
  emitEntity(receiver.entity, body, ctx);
  for (const subscriber of receiver.subscribers) {
    emitSubscriber(subscriber, hlId, body, ctx, counter);
  }
}

/** Emit a Loop 2000C subscriber HL + traces / name / refs / dates / benefits / dependents. @internal */
function emitSubscriber(
  subscriber: Build271SubscriberSpec,
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
  if (subscriber.name !== undefined) emitMember(subscriber.name, body, ctx);
  for (const ref of subscriber.references ?? []) body.push(emitRef(ref, ctx));
  for (const date of subscriber.dates ?? []) emitDate(date, body, ctx);
  for (const benefit of subscriber.benefits ?? []) emitBenefit(benefit, body, ctx);

  for (const dependent of dependents) {
    emitDependent(dependent, hlId, body, ctx, counter);
  }
}

/** Emit a Loop 2000D dependent HL + traces / name / refs / dates / benefits. @internal */
function emitDependent(
  dependent: Build271DependentSpec,
  parentHlId: string,
  body: string[],
  ctx: EmitContext,
  counter: HlCounter,
): void {
  const hlId = String(counter.next);
  counter.next += 1;
  body.push(ctx.seg(["HL", hlId, parentHlId, HL_LEVEL.DEPENDENT, "0"]));

  for (const trace of dependent.traces ?? []) emitTrace(trace, body, ctx);
  if (dependent.name !== undefined) emitMember(dependent.name, body, ctx);
  for (const ref of dependent.references ?? []) body.push(emitRef(ref, ctx));
  for (const date of dependent.dates ?? []) emitDate(date, body, ctx);
  for (const benefit of dependent.benefits ?? []) emitBenefit(benefit, body, ctx);
}

/** Emit an NM1 entity (payer / provider / benefit-related). @internal */
function emitEntity(entity: Build271EntitySpec, body: string[], ctx: EmitContext): void {
  body.push(
    ctx.seg([
      "NM1",
      ctx.esc(entity.entityIdentifierCode),
      ctx.esc(entity.entityTypeQualifier),
      ctx.esc(entity.name),
      "",
      "",
      "",
      "",
      ctx.esc(entity.idQualifier ?? ""),
      ctx.esc(entity.idCode ?? ""),
    ]),
  );
}

/** Emit an NM1 member name (+ N3/N4 address, DMG demographics). @internal */
function emitMember(member: Build271MemberSpec, body: string[], ctx: EmitContext): void {
  body.push(
    ctx.seg([
      "NM1",
      ctx.esc(member.entityIdentifierCode),
      ctx.esc(member.entityTypeQualifier),
      ctx.esc(member.lastName ?? ""),
      ctx.esc(member.firstName ?? ""),
      ctx.esc(member.middleName ?? ""),
      "",
      ctx.esc(member.suffix ?? ""),
      ctx.esc(member.idQualifier ?? ""),
      ctx.esc(member.idCode ?? ""),
    ]),
  );
  if (member.address !== undefined) emitAddress(member.address, body, ctx);
  if (member.dateOfBirth !== undefined || member.genderCode !== undefined) {
    body.push(
      ctx.seg(["DMG", "D8", ctx.esc(member.dateOfBirth ?? ""), ctx.esc(member.genderCode ?? "")]),
    );
  }
}

/** Emit N3 + N4 for an address block. @internal */
function emitAddress(address: Build271AddressSpec, body: string[], ctx: EmitContext): void {
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
 * Emit a Loop 2110 EB benefit line + its nested benefit-related entities,
 * REF / DTP, and MSG. EB-03 is a repeating simple element: each Service
 * Type Code is escaped and joined with the raw repetition separator, then
 * passed into `seg` ALREADY-FORMED (never re-escaped). @internal
 */
function emitBenefit(benefit: Build271BenefitSpec, body: string[], ctx: EmitContext): void {
  const serviceTypeElement = (benefit.serviceTypeCodes ?? [])
    .map((s) => ctx.esc(s.code))
    .join(ctx.repetitionSeparator);
  body.push(
    ctx.seg([
      "EB",
      ctx.esc(benefit.eligibilityCode),
      ctx.esc(benefit.coverageLevelCode ?? ""),
      serviceTypeElement,
      ctx.esc(benefit.insuranceTypeCode ?? ""),
      ctx.esc(benefit.planCoverageDescription ?? ""),
      ctx.esc(benefit.timePeriodQualifier ?? ""),
      benefit.monetaryAmount === undefined ? "" : escDec(benefit.monetaryAmount, ctx.esc),
      benefit.percent === undefined ? "" : escDec(benefit.percent, ctx.esc),
      ctx.esc(benefit.quantityQualifier ?? ""),
      benefit.quantity === undefined ? "" : escDec(benefit.quantity, ctx.esc),
      ctx.esc(benefit.authorizationRequired ?? ""),
      ctx.esc(benefit.inPlanNetwork ?? ""),
    ]),
  );

  for (const related of benefit.relatedEntities ?? []) emitEntity(related, body, ctx);
  for (const ref of benefit.references ?? []) body.push(emitRef(ref, ctx));
  for (const date of benefit.dates ?? []) emitDate(date, body, ctx);
  for (const message of benefit.messages ?? []) {
    body.push(ctx.seg(["MSG", ctx.esc(message)]));
  }
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
function emitRef(ref: Build271ReferenceSpec, ctx: EmitContext): string {
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
// String helpers - mirror the `build835` / `build837` emit primitives.
// ---------------------------------------------------------------------------

/** @internal */
function pad(value: string, width: number): string {
  if (value.length === width) return value;
  if (value.length < width) return value + " ".repeat(width - value.length);
  return value.slice(0, width);
}

/**
 * Zero-pad a control number to `width` chars (ISA-13 / IEA-02 are always
 * 9). Throws {@link Eligibility271BuildError} if the value already exceeds
 * the width. @internal
 */
function padControl(value: string, width: number): string {
  if (value.length === width) return value;
  if (value.length < width) return "0".repeat(width - value.length) + value;
  throw new Eligibility271BuildError(
    ELIGIBILITY_271_BUILD_ERROR_CODES.X12_271_BUILD_INVALID_SPEC,
    `build271: control number ${renderCallerValue(value)} exceeds the ${String(width)}-char spec limit.`,
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
