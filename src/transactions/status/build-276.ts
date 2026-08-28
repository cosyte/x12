/**
 * `build276` - pure-function builder for a 005010X212 Health Care Claim Status
 * Request. NEVER auto-sends, NEVER opens a socket, NEVER touches the
 * filesystem. The library mechanically emits the request it is told; a spec
 * whose informationSources / receivers / providers / subscribers /
 * (dependents) tree cannot form a valid HL hierarchy is REFUSED via {@link
 * "./build-276-errors.js".ClaimStatus276BuildError}.
 *
 * The HL spine is the request's safety primitive, so the builder OWNS it: it
 * computes every HL-01 id (sequential within the transaction), HL-02 parent
 * pointer (20 to 21 to 19 to 22 to 23) and HL-04 has-child flag from the nested
 * tree. Callers never hand-code the spine, a structurally inconsistent
 * hierarchy is therefore unrepresentable, and the SE-01 segment count is
 * correct by construction.
 *
 * **Spec-clean by construction is the whole contract, so the builder refuses
 * anything it cannot make spec-clean.** A level with no name loop, at any of
 * the five levels, a receiver with no service provider, a subscriber that asks
 * about no claim and carries no dependent that does, a claim carrying nothing a
 * payer could look it up by, a service line identifying no service, an empty
 * slot in a list a caller handed over: each is a document a payer would have to
 * repair, so it is refused rather than emitted. That is also why the emit side
 * and the read side disagree deliberately. {@link
 * "./get-276.js".get276StatusInquiry} is lenient and returns a model with the
 * incomplete region ABSENT and a warning beside it; handing such a model back to
 * this builder refuses, because the region it is missing is one this builder
 * would have to invent to emit. A caller that must reproduce a
 * knowingly-malformed artifact drops to {@link
 * "../../builder/build-interchange.js".buildInterchange}, which applies no
 * domain guard.
 *
 * Output shape: a complete {@link X12Interchange} wrapping a single GS..GE
 * functional group (GS-01 `"HR"`) containing a single ST..SE 276 transaction
 * set (ST-01 `276`, ST-03 `005010X212`), spec-clean and round-trippable through
 * `parseX12`. The builder emits segments in TR3 loop order so a well-formed
 * spec round-trips through `get276StatusInquiry` field for field.
 */

import { requireCallerArray } from "../../builder/caller-array.js";
import { requireControlNumber } from "../../builder/caller-control-number.js";
import { requireCallerDecimal } from "../../builder/caller-decimal.js";
import { requireCallerSegment } from "../../builder/caller-segment.js";
import { makeCallerEscaper } from "../../builder/caller-string.js";
import { renderCallerValue } from "../../builder/caller-value.js";
import type { X12Decimal } from "../../decimal.js";
import { parseX12 } from "../../parser/index.js";
import type { X12Interchange } from "../../parser/types.js";

import {
  CLAIM_STATUS_276_BUILD_ERROR_CODES,
  ClaimStatus276BuildError,
} from "./build-276-errors.js";
import type {
  Build276ClaimSpec,
  Build276DependentSpec,
  Build276InformationReceiverSpec,
  Build276InformationSourceSpec,
  Build276NameSpec,
  Build276ProviderSpec,
  Build276ReferenceSpec,
  Build276ServiceLineSpec,
  Build276Spec,
  Build276SubscriberSpec,
} from "./build-276-types.js";

/**
 * Refuse with this module's typed error, for {@link requireCallerArray} on a
 * SPINE list. A forged array-like where the HL spine expects a list makes the
 * hierarchy structurally impossible, so it reuses
 * `X12_276_BUILD_INVALID_HIERARCHY` rather than minting a code. @internal
 */
function refuseHierarchy(message: string): never {
  throw new ClaimStatus276BuildError(
    CLAIM_STATUS_276_BUILD_ERROR_CODES.X12_276_BUILD_INVALID_HIERARCHY,
    message,
  );
}

/**
 * Refuse with this module's typed error, for {@link makeCallerEscaper},
 * {@link requireCallerDecimal} and every non-hierarchy precondition. A
 * non-string element value is not a hierarchy defect, so it takes
 * `X12_276_BUILD_INVALID_SPEC`, and so does a forged array-like in a LEAF list
 * (references, amounts, dates, procedure modifiers): none of those decides
 * where a level hangs. @internal
 */
function refuseSpec(message: string): never {
  throw new ClaimStatus276BuildError(
    CLAIM_STATUS_276_BUILD_ERROR_CODES.X12_276_BUILD_INVALID_SPEC,
    message,
  );
}

/**
 * Escape a caller-supplied `X12Decimal` into an element, refusing a raw
 * `number` instead of emitting its JavaScript rendering. Guessing the scale of
 * money is what `X12Decimal` exists to prevent. @internal
 */
function escDec(value: X12Decimal, esc: (value: string) => string): string {
  return esc(requireCallerDecimal(value, "build276", refuseSpec).toString());
}

/**
 * Refuse a HOLE in a caller-supplied list: a slot standing empty where the
 * list's own element type says a value stands.
 *
 * {@link requireCallerArray} answers "is this a list at all". This answers "is
 * every slot in it filled", and they are different defects from the same caller
 * class. A `JSON.parse`d payload with a dropped record, or a `map` that returned
 * nothing for one row, produces a REAL array with a hole in it, so the
 * chokepoint passes it through. Left unguarded the hole reaches an emitter,
 * which dereferences it and throws an untyped `TypeError` carrying no `code` a
 * consumer can branch on.
 *
 * `at` is a library-owned structural locator, never caller text and never a
 * document value. @internal
 */
function requireSlot<T>(
  value: T | null | undefined,
  at: string,
  refuse: (message: string) => never,
): T {
  if (value === undefined || value === null) {
    return refuse(
      `build276: ${at} is an empty list slot. Received ${value === null ? "null" : "undefined"}, and this builder invents nothing to fill a hole in a list.`,
    );
  }
  return value;
}

/**
 * Read an OPTIONAL nested object, treating `null` as absent. `JSON.parse`
 * renders an omitted object as `null` far more often than as `undefined`, and
 * without this a `procedure: null` read as PRESENT and the emitter dereferenced
 * it for an untyped `TypeError`. A missing optional is not a defect, so this
 * normalises rather than refuses. @internal
 */
function absentIfNull<T>(value: T | null | undefined): T | undefined {
  return value ?? undefined;
}

/** Refuse a hole at any index of a list already known to BE a list. @internal */
function requireDenseList<T>(
  items: readonly T[],
  at: string,
  refuse: (message: string) => never,
): void {
  for (const [i, item] of items.entries()) {
    requireSlot(item, `${at}[${String(i)}]`, refuse);
  }
}

/**
 * Read a caller-supplied LEAF list through the package's array chokepoint, and
 * check it for holes at the same point. `at` is a library-owned structural
 * locator, never caller text and never a document value. @internal
 */
function leafList<T>(value: readonly T[] | null | undefined, at: string): readonly T[] {
  const items = requireCallerArray(value, `build276: ${at}`, refuseSpec);
  requireDenseList(items, at, refuseSpec);
  return items;
}

/**
 * GS-08 / ST-03 version and release emitted for every 276 - the WPC TR3 the
 * 277 declarations in this directory already name for this pair. @internal
 */
const X212_VERSION_RELEASE = "005010X212";

/**
 * GS-01 functional identifier code for the 276. `HR` = Health Care Claim Status
 * Request, X12 data element 479. It is deliberately NOT the 277's `HN` (Health
 * Care Claim Status Notification): the two directions of this pair carry
 * different functional identifiers exactly as the eligibility pair's `HS`
 * inquiry and `HB` information do, and reusing the response's code would put a
 * request in a group a receiver routes to its response handler. @internal
 */
const X12_276_FUNCTIONAL_ID = "HR";

/** ST-01 transaction set identifier code for the claim status REQUEST. @internal */
const X12_276_TRANSACTION_SET_ID = "276";

/** GS-07 standards agency code - `X` for ASC X12. @internal */
const X12_AGENCY_CODE = "X";

/**
 * BHT-01 default: the hierarchical structure code the claim-status family
 * carries, taken from the 277 corpus already committed here rather than
 * invented. @internal
 */
const BHT_STRUCTURE_CODE = "0010";

/** BHT-02 default: `13` is Request, which is what a 276 is. @internal */
const BHT_PURPOSE_REQUEST = "13";

/** HL-03 level codes for the spine the builder computes. @internal */
const HL_LEVEL = {
  SOURCE: "20",
  RECEIVER: "21",
  PROVIDER: "19",
  SUBSCRIBER: "22",
  DEPENDENT: "23",
} as const;

/**
 * `build276` - assemble a 005010X212 276 Health Care Claim Status Request
 * around the supplied spec.
 *
 * Refused via {@link "./build-276-errors.js".ClaimStatus276BuildError}:
 * - No information sources, a source with no receivers, a receiver with no
 *   service providers, a provider with no subscribers, or a SPINE list slot
 *   (`informationSources`, `receivers`, `providers`, `subscribers`,
 *   `dependents`, `claims`, `serviceLines`) handed something that is not a list
 *   or left with an empty slot in it, gives
 *   `X12_276_BUILD_INVALID_HIERARCHY`.
 * - A level with no name loop, at ANY of the five levels, a subscriber that
 *   asks about no claim and carries no dependent that does, a dependent with no
 *   claim, a claim carrying nothing a payer could look it up by, a service line
 *   identifying no service, an empty or over-long control number, a non-string
 *   element value, a non-`X12Decimal` amount, or a LEAF list slot
 *   (`references`, `amounts`, `dates`, `procedure.modifiers`) handed something
 *   that is not a list or left with an empty slot in it, gives
 *   `X12_276_BUILD_INVALID_SPEC`.
 *
 * EVERY list slot on the spec is read through the package's array chokepoint
 * and checked for holes at the same point, so a forged array-like, and equally
 * a real list with a gap in it, draws one of those two typed refusals wherever
 * it stands.
 *
 * Every refusal message names structural indices and counts. None of them names
 * a member identifier, a member name, a patient name, a trace value, a claim
 * number or a diagnosis code, and the one caller value any of them renders (a
 * control number) goes through the package's bounded renderer.
 *
 * @example
 * ```ts
 * import { build276 } from "@cosyte/x12";
 * const ix = build276({
 *   envelope: {
 *     senderId: "ANYTOWNCLINIC", receiverId: "MEDPAY",
 *     interchangeDate: "260601", interchangeTime: "1200",
 *     interchangeControlNumber: "000000001",
 *     groupControlNumber: "1", transactionSetControlNumber: "0001",
 *   },
 *   informationSources: [{
 *     name: { entityIdentifierCode: "PR", entityTypeQualifier: "2", lastNameOrOrganizationName: "MEDPAY INSURANCE", idQualifier: "PI", idCode: "PAYER01" },
 *     receivers: [{
 *       name: { entityIdentifierCode: "41", entityTypeQualifier: "2", lastNameOrOrganizationName: "ANYTOWN CLINIC", idQualifier: "46", idCode: "RECVR01" },
 *       providers: [{
 *         name: { entityIdentifierCode: "1P", entityTypeQualifier: "2", lastNameOrOrganizationName: "ANYTOWN CLINIC", idQualifier: "XX", idCode: "1234567890" },
 *         subscribers: [{
 *           name: { entityIdentifierCode: "IL", entityTypeQualifier: "1", lastNameOrOrganizationName: "DOE", firstName: "JANE", idQualifier: "MI", idCode: "MBR0001" },
 *           claims: [{
 *             trace: { traceTypeCode: "1", referenceId: "STATUS0001" },
 *             references: [{ qualifier: "1K", value: "PCN0001" }],
 *           }],
 *         }],
 *       }],
 *     }],
 *   }],
 * });
 * ```
 */
export function build276(spec: Build276Spec): X12Interchange {
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
  const esc = makeCallerEscaper(delimiters, "build276", refuseSpec);

  const seg = (parts: readonly string[]): string => {
    requireCallerSegment(parts, "build276", refuseSpec);
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

  // ---- Envelope control numbers -----------------------------------------
  //
  // Refused before the envelope is assembled, for the reason
  // `src/builder/caller-control-number.ts` records: `padControl("", 9)`
  // FABRICATES `"000000000"` into ISA-13 / IEA-02, while GS-06 / GE-02 and
  // ST-02 / SE-02 reach the wire through `esc`, which early-returns on `""`.
  // This builder's `seg` trims a trailing empty element, so an empty
  // transaction control number left the trailer with no SE-02 at all.
  requireControlNumber(
    envelope.interchangeControlNumber,
    "ISA-13 / IEA-02",
    "interchangeControlNumber",
    "build276",
    refuseSpec,
  );
  requireControlNumber(
    envelope.groupControlNumber,
    "GS-06 / GE-02",
    "groupControlNumber",
    "build276",
    refuseSpec,
  );
  requireControlNumber(
    envelope.transactionSetControlNumber,
    "ST-02 / SE-02",
    "transactionSetControlNumber",
    "build276",
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
    X12_276_FUNCTIONAL_ID,
    esc(applicationSenderCode),
    esc(applicationReceiverCode),
    esc(groupDate),
    esc(groupTime),
    esc(envelope.groupControlNumber),
    X12_AGENCY_CODE,
    X212_VERSION_RELEASE,
  ]);

  const stControlNumber = envelope.transactionSetControlNumber;
  const st = seg(["ST", X12_276_TRANSACTION_SET_ID, esc(stControlNumber), X212_VERSION_RELEASE]);

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
  const sources = requireCallerArray(
    spec.informationSources,
    "build276: spec.informationSources",
    refuseHierarchy,
  );
  for (const [s, source] of sources.entries()) {
    emitSource(source, body, ctx, hlCounter, `source[${String(s)}]`);
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
 * `.length`: a forged `{ length: "9".repeat(120_000) }` coerces to `Infinity` in
 * a `<` comparison, which turns a bounded loop into an unbounded one and hangs
 * the caller instead of refusing. Messages carry structural indices and counts
 * and nothing read out of the request. @internal
 */
function enforceStructuralSpec(spec: Build276Spec): void {
  const sources = requireCallerArray(
    spec.informationSources,
    "build276: spec.informationSources",
    refuseHierarchy,
  );
  if (sources.length === 0) {
    throw new ClaimStatus276BuildError(
      CLAIM_STATUS_276_BUILD_ERROR_CODES.X12_276_BUILD_INVALID_HIERARCHY,
      "build276: at least one information source (HL level 20) is required.",
    );
  }
  for (let s = 0; s < sources.length; s += 1) {
    const source = requireSlot(
      sources[s],
      `spec.informationSources[${String(s)}]`,
      refuseHierarchy,
    );
    requireName(source.name, `source[${String(s)}]`);
    const receivers = requireCallerArray(
      source.receivers,
      `build276: spec.informationSources[${String(s)}].receivers`,
      refuseHierarchy,
    );
    if (receivers.length === 0) {
      throw new ClaimStatus276BuildError(
        CLAIM_STATUS_276_BUILD_ERROR_CODES.X12_276_BUILD_INVALID_HIERARCHY,
        `build276: information source at index ${String(s)} has no receiver (HL level 21) child.`,
      );
    }
    for (let r = 0; r < receivers.length; r += 1) {
      const locator = `source[${String(s)}].receiver[${String(r)}]`;
      const receiver = requireSlot(
        receivers[r],
        `spec.informationSources[${String(s)}].receivers[${String(r)}]`,
        refuseHierarchy,
      );
      requireName(receiver.name, locator);
      enforceReceiver(receiver, locator);
    }
  }
}

/**
 * Refuse a receiver that leads to no subscriber. The 276 spine puts a SERVICE
 * PROVIDER between the receiver and the subscriber, so "a receiver with no
 * subscriber" is two links: a receiver with no provider, and a provider with no
 * subscriber. Both are refused, and neither level is defaulted into
 * existence. @internal
 */
function enforceReceiver(receiver: Build276InformationReceiverSpec, locator: string): void {
  const providers = requireCallerArray(
    receiver.providers,
    `build276: ${locator}.providers`,
    refuseHierarchy,
  );
  if (providers.length === 0) {
    throw new ClaimStatus276BuildError(
      CLAIM_STATUS_276_BUILD_ERROR_CODES.X12_276_BUILD_INVALID_HIERARCHY,
      `build276: receiver at ${locator} has no service provider (HL level 19) child, so it reaches no subscriber.`,
    );
  }
  for (let p = 0; p < providers.length; p += 1) {
    const provider = requireSlot(
      providers[p],
      `${locator}.provider[${String(p)}]`,
      refuseHierarchy,
    );
    enforceProvider(provider, `${locator}.provider[${String(p)}]`);
  }
}

/** @internal */
function enforceProvider(provider: Build276ProviderSpec, locator: string): void {
  requireName(provider.name, locator);
  const subscribers = requireCallerArray(
    provider.subscribers,
    `build276: ${locator}.subscribers`,
    refuseHierarchy,
  );
  if (subscribers.length === 0) {
    throw new ClaimStatus276BuildError(
      CLAIM_STATUS_276_BUILD_ERROR_CODES.X12_276_BUILD_INVALID_HIERARCHY,
      `build276: service provider at ${locator} has no subscriber (HL level 22) child.`,
    );
  }
  for (let u = 0; u < subscribers.length; u += 1) {
    const subscriber = requireSlot(
      subscribers[u],
      `${locator}.subscriber[${String(u)}]`,
      refuseHierarchy,
    );
    enforceSubscriber(subscriber, `${locator}.subscriber[${String(u)}]`);
  }
}

/**
 * Refuse a subscriber this builder could not emit spec-clean, and each of its
 * dependents. Split out so the locator is assembled once. @internal
 */
function enforceSubscriber(subscriber: Build276SubscriberSpec, locator: string): void {
  requireName(subscriber.name, locator);
  const dependents = requireCallerArray(
    subscriber.dependents,
    `build276: ${locator}.dependents`,
    refuseHierarchy,
  );
  const claims = requireCallerArray(
    subscriber.claims,
    `build276: ${locator}.claims`,
    refuseHierarchy,
  );
  if (claims.length === 0 && dependents.length === 0) {
    throw new ClaimStatus276BuildError(
      CLAIM_STATUS_276_BUILD_ERROR_CODES.X12_276_BUILD_INVALID_SPEC,
      `build276: subscriber at ${locator} asks nothing: it carries no claim (Loop 2200D) and no dependent that carries one.`,
    );
  }
  for (let c = 0; c < claims.length; c += 1) {
    enforceClaim(claims[c], `${locator}.claim[${String(c)}]`);
  }
  for (let d = 0; d < dependents.length; d += 1) {
    const dependent = requireSlot(
      dependents[d],
      `${locator}.dependent[${String(d)}]`,
      refuseHierarchy,
    );
    enforceDependent(dependent, `${locator}.dependent[${String(d)}]`);
  }
}

/** @internal */
function enforceDependent(dependent: Build276DependentSpec, locator: string): void {
  requireName(dependent.name, locator);
  const claims = requireCallerArray(
    dependent.claims,
    `build276: ${locator}.claims`,
    refuseHierarchy,
  );
  if (claims.length === 0) {
    throw new ClaimStatus276BuildError(
      CLAIM_STATUS_276_BUILD_ERROR_CODES.X12_276_BUILD_INVALID_SPEC,
      `build276: dependent at ${locator} carries no claim (Loop 2200E) to ask about.`,
    );
  }
  for (let c = 0; c < claims.length; c += 1) {
    enforceClaim(claims[c], `${locator}.claim[${String(c)}]`);
  }
}

/**
 * Refuse a name loop that is absent or is not an object at all.
 *
 * Called for EVERY level of the hierarchy, which is what the message says: an
 * information source, an information receiver and a service provider each carry
 * a Loop 2100 NM1 exactly as a subscriber and a dependent do. `null` is refused
 * beside `undefined` because `typeof null` is `"object"`, so a `JSON.parse`d
 * level whose name came through as `null` would otherwise clear this guard and
 * crash the NM1 emitter with an untyped `TypeError`. @internal
 */
function requireName(name: Build276NameSpec | null | undefined, locator: string): void {
  if (name === undefined || name === null || typeof name !== "object") {
    throw new ClaimStatus276BuildError(
      CLAIM_STATUS_276_BUILD_ERROR_CODES.X12_276_BUILD_INVALID_SPEC,
      `build276: the level at ${locator} has no name loop (NM1), which every level of a 276 requires.`,
    );
  }
}

/**
 * Refuse a claim that asks nothing.
 *
 * A Loop 2200 carrying only its trace gives the payer no way to find the claim:
 * a trace is what the ANSWER is reassociated by, not what the claim is looked up
 * by. At least one identifier, amount, date or service line has to be there, and
 * defaulting one would be this library asking about a claim the caller did not
 * name. @internal
 */
function enforceClaim(raw: Build276ClaimSpec | undefined, locator: string): void {
  const claim = requireSlot(raw, locator, refuseHierarchy);
  requireTrace(claim, locator);
  const references = leafList(claim.references, `${locator}.references`);
  const amounts = leafList(claim.amounts, `${locator}.amounts`);
  const dates = leafList(claim.dates, `${locator}.dates`);
  const serviceLines = requireCallerArray(
    claim.serviceLines,
    `build276: ${locator}.serviceLines`,
    refuseHierarchy,
  );
  requireDenseList(serviceLines, `${locator}.serviceLines`, refuseHierarchy);
  if (
    references.length === 0 &&
    amounts.length === 0 &&
    dates.length === 0 &&
    serviceLines.length === 0
  ) {
    throw new ClaimStatus276BuildError(
      CLAIM_STATUS_276_BUILD_ERROR_CODES.X12_276_BUILD_INVALID_SPEC,
      `build276: the claim at ${locator} asks nothing: beyond its trace it carries no identifier (REF), no amount (AMT), no date (DTP) and no service line (Loop 2210) a payer could find it by.`,
    );
  }
  for (let l = 0; l < serviceLines.length; l += 1) {
    enforceServiceLine(serviceLines[l], `${locator}.line[${String(l)}]`);
  }
}

/**
 * Refuse a claim with no trace. Only a TRN opens a Loop 2200 on read, so a
 * claim without one would fold its identifiers, amounts and dates into the
 * claim before it, silently. @internal
 */
function requireTrace(claim: Build276ClaimSpec, locator: string): void {
  const trace = absentIfNull(claim.trace);
  if (trace === undefined || typeof trace !== "object") {
    throw new ClaimStatus276BuildError(
      CLAIM_STATUS_276_BUILD_ERROR_CODES.X12_276_BUILD_INVALID_SPEC,
      `build276: the claim at ${locator} has no trace (TRN), which is what opens its loop and what the answering 277 echoes back.`,
    );
  }
}

/** @internal */
function enforceServiceLine(raw: Build276ServiceLineSpec | undefined, locator: string): void {
  const line = requireSlot(raw, locator, refuseHierarchy);
  const procedure = absentIfNull(line.procedure);
  if (procedure === undefined && line.revenueCode === undefined) {
    throw new ClaimStatus276BuildError(
      CLAIM_STATUS_276_BUILD_ERROR_CODES.X12_276_BUILD_INVALID_SPEC,
      `build276: the service line at ${locator} identifies no service: it carries neither a procedure (SVC-01) nor a revenue code (SVC-04).`,
    );
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

/** Emit a Loop 2000A information source HL and its receiver subtree. @internal */
function emitSource(
  source: Build276InformationSourceSpec,
  body: string[],
  ctx: EmitContext,
  counter: HlCounter,
  locator: string,
): void {
  const hlId = String(counter.next);
  counter.next += 1;
  body.push(ctx.seg(["HL", hlId, "", HL_LEVEL.SOURCE, "1"]));
  emitName(source.name, body, ctx);
  const receivers = requireCallerArray(
    source.receivers,
    `build276: ${locator}.receivers`,
    refuseHierarchy,
  );
  for (const [r, receiver] of receivers.entries()) {
    emitReceiver(receiver, hlId, body, ctx, counter, `${locator}.receiver[${String(r)}]`);
  }
}

/** Emit a Loop 2000B information receiver HL and its provider subtree. @internal */
function emitReceiver(
  receiver: Build276InformationReceiverSpec,
  parentHlId: string,
  body: string[],
  ctx: EmitContext,
  counter: HlCounter,
  locator: string,
): void {
  const hlId = String(counter.next);
  counter.next += 1;
  body.push(ctx.seg(["HL", hlId, parentHlId, HL_LEVEL.RECEIVER, "1"]));
  emitName(receiver.name, body, ctx);
  const providers = requireCallerArray(
    receiver.providers,
    `build276: ${locator}.providers`,
    refuseHierarchy,
  );
  for (const [p, provider] of providers.entries()) {
    emitProvider(provider, hlId, body, ctx, counter, `${locator}.provider[${String(p)}]`);
  }
}

/** Emit a Loop 2000C service provider HL and its subscriber subtree. @internal */
function emitProvider(
  provider: Build276ProviderSpec,
  parentHlId: string,
  body: string[],
  ctx: EmitContext,
  counter: HlCounter,
  locator: string,
): void {
  const hlId = String(counter.next);
  counter.next += 1;
  body.push(ctx.seg(["HL", hlId, parentHlId, HL_LEVEL.PROVIDER, "1"]));
  emitName(provider.name, body, ctx);
  const subscribers = requireCallerArray(
    provider.subscribers,
    `build276: ${locator}.subscribers`,
    refuseHierarchy,
  );
  for (const [u, subscriber] of subscribers.entries()) {
    emitSubscriber(subscriber, hlId, body, ctx, counter, `${locator}.subscriber[${String(u)}]`);
  }
}

/** Emit a Loop 2000D subscriber HL with its name and claims. @internal */
function emitSubscriber(
  subscriber: Build276SubscriberSpec,
  parentHlId: string,
  body: string[],
  ctx: EmitContext,
  counter: HlCounter,
  locator: string,
): void {
  const hlId = String(counter.next);
  counter.next += 1;
  const dependents = requireCallerArray(
    subscriber.dependents,
    `build276: ${locator}.dependents`,
    refuseHierarchy,
  );
  const hasChild = dependents.length > 0 ? "1" : "0";
  body.push(ctx.seg(["HL", hlId, parentHlId, HL_LEVEL.SUBSCRIBER, hasChild]));
  emitName(subscriber.name, body, ctx);
  const claims = requireCallerArray(
    subscriber.claims,
    `build276: ${locator}.claims`,
    refuseHierarchy,
  );
  for (const [c, claim] of claims.entries()) {
    emitClaim(claim, body, ctx, `${locator}.claim[${String(c)}]`);
  }
  for (const [d, dependent] of dependents.entries()) {
    emitDependent(dependent, hlId, body, ctx, counter, `${locator}.dependent[${String(d)}]`);
  }
}

/** Emit a Loop 2000E dependent HL with its name and claims. @internal */
function emitDependent(
  dependent: Build276DependentSpec,
  parentHlId: string,
  body: string[],
  ctx: EmitContext,
  counter: HlCounter,
  locator: string,
): void {
  const hlId = String(counter.next);
  counter.next += 1;
  body.push(ctx.seg(["HL", hlId, parentHlId, HL_LEVEL.DEPENDENT, "0"]));
  emitName(dependent.name, body, ctx);
  const claims = requireCallerArray(
    dependent.claims,
    `build276: ${locator}.claims`,
    refuseHierarchy,
  );
  for (const [c, claim] of claims.entries()) {
    emitClaim(claim, body, ctx, `${locator}.claim[${String(c)}]`);
  }
}

/** Emit an NM1 name loop plus the DMG demographics that follow it. @internal */
function emitName(name: Build276NameSpec, body: string[], ctx: EmitContext): void {
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
  if (name.dateOfBirth !== undefined || name.genderCode !== undefined) {
    body.push(
      ctx.seg(["DMG", "D8", ctx.esc(name.dateOfBirth ?? ""), ctx.esc(name.genderCode ?? "")]),
    );
  }
}

/** Emit a Loop 2200 claim: its TRN, then REF / AMT / DTP, then Loop 2210. @internal */
function emitClaim(
  claim: Build276ClaimSpec,
  body: string[],
  ctx: EmitContext,
  locator: string,
): void {
  const { trace } = claim;
  body.push(
    ctx.seg([
      "TRN",
      ctx.esc(trace.traceTypeCode),
      ctx.esc(trace.referenceId),
      ctx.esc(trace.originatingCompanyId ?? ""),
      ctx.esc(trace.supplementalReferenceId ?? ""),
    ]),
  );
  for (const ref of leafList(claim.references, `${locator}.references`)) {
    body.push(emitRef(ref, ctx));
  }
  for (const amount of leafList(claim.amounts, `${locator}.amounts`)) {
    body.push(ctx.seg(["AMT", ctx.esc(amount.qualifier), escDec(amount.amount, ctx.esc)]));
  }
  for (const date of leafList(claim.dates, `${locator}.dates`)) emitDate(date, body, ctx);
  const serviceLines = requireCallerArray(
    claim.serviceLines,
    `build276: ${locator}.serviceLines`,
    refuseHierarchy,
  );
  for (const [l, line] of serviceLines.entries()) {
    emitServiceLine(line, body, ctx, `${locator}.line[${String(l)}]`);
  }
}

/**
 * Emit a Loop 2210 service line: the SVC and its REF / DTP. SVC-01 is a
 * composite whose components are escaped first and joined with the RAW
 * separator, so a separator this library writes is never itself escaped.
 * SVC-03, SVC-05 and SVC-06 are emitted empty, for the reason the read model
 * gives: this is the REQUEST direction and a submitter states what it billed
 * rather than what was paid. @internal
 */
function emitServiceLine(
  line: Build276ServiceLineSpec,
  body: string[],
  ctx: EmitContext,
  locator: string,
): void {
  const procedure = absentIfNull(line.procedure);
  const procedureElement =
    procedure === undefined
      ? ""
      : ctx.comp([
          procedure.qualifier,
          procedure.code ?? "",
          ...leafList(procedure.modifiers, `${locator}.procedure.modifiers`),
          procedure.description ?? "",
        ]);
  body.push(
    ctx.seg([
      "SVC",
      procedureElement,
      line.lineChargeAmount === undefined ? "" : escDec(line.lineChargeAmount, ctx.esc),
      "",
      ctx.esc(line.revenueCode ?? ""),
      "",
      "",
      line.unitsOfService === undefined ? "" : escDec(line.unitsOfService, ctx.esc),
    ]),
  );
  for (const ref of leafList(line.references, `${locator}.references`)) {
    body.push(emitRef(ref, ctx));
  }
  for (const date of leafList(line.dates, `${locator}.dates`)) emitDate(date, body, ctx);
}

/** @internal */
function emitRef(ref: Build276ReferenceSpec, ctx: EmitContext): string {
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
// String helpers - the same emit primitives `build277` uses.
// ---------------------------------------------------------------------------

/** @internal */
function pad(value: string, width: number): string {
  if (value.length === width) return value;
  if (value.length < width) return value + " ".repeat(width - value.length);
  return value.slice(0, width);
}

/**
 * Zero-pad a control number to `width` chars (ISA-13 / IEA-02 are always 9).
 * Throws {@link ClaimStatus276BuildError} if the value already exceeds the
 * width. @internal
 */
function padControl(value: string, width: number): string {
  if (value.length === width) return value;
  if (value.length < width) return "0".repeat(width - value.length) + value;
  throw new ClaimStatus276BuildError(
    CLAIM_STATUS_276_BUILD_ERROR_CODES.X12_276_BUILD_INVALID_SPEC,
    `build276: control number ${renderCallerValue(value)} exceeds the ${String(width)}-char spec limit.`,
  );
}

/**
 * Expand a 6-digit YYMMDD into CCYYMMDD for GS-04. Years `00` to `49` are 21st
 * century, `50` to `99` are 20th. A value already in CCYYMMDD form passes
 * through unchanged. @internal
 */
function expandYY(yymmdd: string): string {
  if (yymmdd.length !== 6) return yymmdd;
  const yy = parseInt(yymmdd.slice(0, 2), 10);
  if (Number.isNaN(yy)) return yymmdd;
  const century = yy < 50 ? "20" : "19";
  return century + yymmdd;
}
