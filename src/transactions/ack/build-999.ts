/**
 * `build999` - pure-function builder for a 005010X231A1 Implementation
 * Acknowledgment. NEVER auto-sends, NEVER opens a socket, NEVER touches
 * the filesystem. The library mechanically builds the disposition it is
 * told; an inconsistent spec (an `Accept` paired with errors) is REFUSED
 * via {@link "./errors.js".AckBuildError} - the safety invariant the
 * cosyte ack archetype enforces (mirrors `@cosyte/hl7`'s `buildAck`
 * boundary and `@cosyte/mllp`'s commit-contract pattern).
 *
 * Output shape: a complete {@link X12Interchange} wrapping a single
 * GS..GE functional group containing a single ST..SE 999 transaction set,
 * spec-clean and round-trippable through {@link parseX12}. Defaults match
 * the cosyte parser archetype (`*^:~` delimiters, `P` usage indicator,
 * `005010X231A1` ST-03) - every override is keyed by the spec field name
 * so the caller's intent reads off the spec at the call site.
 */

import { X12_ACK_DISPOSITION_CODES } from "./codes.js";
import { ACK_BUILD_ERROR_CODES, AckBuildError } from "./errors.js";
import type { Build999EnvelopeSpec, Build999Spec } from "./types.js";
import { FUNCTIONAL_IDENTIFIER_BY_TRANSACTION_SET } from "../../code-lists/functional-identifier.js";
import { SegmentLog, builtInterchange } from "../../builder/assemble.js";
import type { X12Interchange } from "../../parser/types.js";
import { requireCallerSegment } from "../../builder/caller-segment.js";
import { renderCallerValue } from "../../builder/caller-value.js";
import { makeCallerEscaper } from "../../builder/caller-string.js";
import { requireControlNumber } from "../../builder/caller-control-number.js";
import { requireCallerEntries } from "../../builder/caller-array.js";
import { padIsaElement, padIsaUsageIndicator } from "../../builder/caller-isa.js";

/**
 * Refuse with this module's typed error, for {@link makeCallerEscaper}. A
 * non-string element value is a structurally impossible spec rather than an
 * inconsistent disposition, so it reuses `X12_ACK_INVALID_SPEC` rather than
 * minting a code. @internal
 */
function refuseSpec(message: string): never {
  throw new AckBuildError(ACK_BUILD_ERROR_CODES.X12_ACK_INVALID_SPEC, message);
}

/**
 * The version string emitted at GS-08 and ST-03 for every 999 the library
 * builds. The 005010X231A1 errata-applied TR3 is the HIPAA-cited
 * implementation guide for the 999 Implementation Acknowledgment.
 *
 * @internal
 */
const X231A1_VERSION_RELEASE = "005010X231A1";

/**
 * The single ASC X12 standard agency-code value the library emits at
 * GS-07 - `X` for ASC X12 itself. (TIBCO / vendor traffic occasionally
 * uses `T` but that is non-conformant for healthcare; the library refuses
 * to mirror that quirk on emit, per Postel's Law.)
 *
 * @internal
 */
const X12_AGENCY_CODE = "X";

/**
 * GS-08 of every 997 the library builds: the ASC X12 base standard version
 * and release, with no implementation guide suffix, because no guide names
 * the 997. ISA-12 is `00501`, so the group is `005010`.
 *
 * @internal
 */
const BASE_STANDARD_VERSION = "005010";

/**
 * GS-01 of every 999 the library builds: `FA`, the functional identifier
 * every acknowledgment group travels under. The 997 reads the same code from
 * the cited element 479 table, so this literal is that row's corroboration.
 *
 * @internal
 */
const X12_ACK_FUNCTIONAL_ID = "FA";

/**
 * `build999` - assemble a 005010X231A1 Implementation Acknowledgment
 * around the supplied envelope + functional-group spec.
 *
 * Safety guards (refused via {@link AckBuildError}):
 * - Functional-level `A` disposition paired with any per-transaction
 *   non-`A` response, or any per-transaction segment-error / syntax-error
 *   payload anywhere in the spec → {@link
 *   "./errors.js".ACK_BUILD_ERROR_CODES.X12_ACK_ACCEPT_WITH_ERRORS}.
 * - Per-transaction `A` disposition paired with non-empty
 *   `segmentErrors` / `syntaxErrorCodes` → same.
 * - AK9-04 (accepted) > AK9-03 (received), AK9-03 > AK9-02 (declared),
 *   or response-list length not equal to AK9-03 → {@link
 *   "./errors.js".ACK_BUILD_ERROR_CODES.X12_ACK_COUNT_MISMATCH}.
 *
 * @example
 * ```ts
 * import { build999 } from "@cosyte/x12";
 * const ix = build999({
 *   envelope: {
 *     senderId: "SENDER", receiverId: "RECEIVER",
 *     interchangeDate: "250101", interchangeTime: "1200",
 *     interchangeControlNumber: "000000001",
 *     groupControlNumber: "1", transactionSetControlNumber: "0001",
 *   },
 *   functionalGroup: {
 *     functionalIdCode: "HC", groupControlNumber: "1", versionRelease: "005010X222A2",
 *     disposition: "A",
 *     numberOfTransactionSets: 1, numberOfReceivedTransactionSets: 1, numberOfAcceptedTransactionSets: 1,
 *     transactionResponses: [
 *       { transactionSetIdCode: "837", transactionSetControlNumber: "0001", disposition: "A" },
 *     ],
 *   },
 * });
 * ```
 */
export function build999(spec: Build999Spec): X12Interchange {
  return buildAcknowledgment(spec, "999", joinSeg);
}

/**
 * Which acknowledgment {@link buildAcknowledgment} writes: `999` (IK3 / IK4 /
 * IK5, GS-08 and ST-03 `005010X231A1`) or `997` (AK3 / AK4 / AK5, GS-08 the
 * base standard version `005010`, no ST-03, no CTX). @internal
 */
export type AckVariant = "999" | "997";

/** An element note as {@link buildAcknowledgment} writes it, IK4 or AK4. @internal */
export interface AckElementErrorSpec {
  readonly position: {
    readonly element: number;
    readonly component?: number | undefined;
    readonly repetition?: number | undefined;
  };
  readonly dataElementReferenceNumber?: string | undefined;
  readonly syntaxErrorCode: string;
  readonly copyOfBadDataElement?: string | undefined;
  readonly contexts?: readonly string[] | undefined;
}

/** A segment note as {@link buildAcknowledgment} writes it, IK3 or AK3. @internal */
export interface AckSegmentErrorSpec {
  readonly segmentIdCode: string;
  readonly segmentPositionInTransactionSet: number;
  readonly loopIdentifier?: string | undefined;
  readonly syntaxErrorCode?: string | undefined;
  readonly contexts?: readonly string[] | undefined;
  readonly elementErrors?: readonly AckElementErrorSpec[] | undefined;
}

/** A transaction set response, AK2 to IK5 or AK5. @internal */
export interface AckTransactionResponseSpec {
  readonly transactionSetIdCode: string;
  readonly transactionSetControlNumber: string;
  readonly implementationConventionReference?: string | undefined;
  readonly disposition: string;
  readonly syntaxErrorCodes?: readonly string[] | undefined;
  readonly segmentErrors?: readonly AckSegmentErrorSpec[] | undefined;
}

/** The AK1 and AK9 pair with the responses between them. @internal */
export interface AckFunctionalGroupSpec {
  readonly functionalIdCode: string;
  readonly groupControlNumber: string;
  readonly versionRelease?: string | undefined;
  readonly disposition: string;
  readonly numberOfTransactionSets: number;
  readonly numberOfReceivedTransactionSets: number;
  readonly numberOfAcceptedTransactionSets: number;
  readonly syntaxErrorCodes?: readonly string[] | undefined;
  readonly transactionResponses: readonly AckTransactionResponseSpec[];
}

/**
 * A builder's own segment joiner: type-checks every element through
 * `requireCallerSegment` under that builder's name, then joins. Each builder
 * module declares its own, so a refusal names the builder that refused.
 *
 * @internal
 */
export type AckSegmentJoiner = (
  parts: readonly string[],
  elementSeparator: string,
  segmentTerminator: string,
) => string;

/** What {@link buildAcknowledgment} takes: either builder's spec. @internal */
export interface AckSpec {
  readonly envelope: Build999EnvelopeSpec;
  readonly functionalGroup: AckFunctionalGroupSpec;
}

/**
 * The 999 and the 997 written by one path: the envelope, the AK1, AK2 and
 * AK9 segments, the segment and element notes, the response trailer and every
 * guard. `variant` picks the segment names and the version stamps, and names
 * the builder in every refusal, so `build999` refuses exactly as it did
 * before the 997 shared this code.
 *
 * @internal
 */
export function buildAcknowledgment(
  spec: AckSpec,
  variant: AckVariant,
  joinSeg: AckSegmentJoiner,
): X12Interchange {
  const { envelope, functionalGroup } = spec;
  const builder = `build${variant}`;

  // ---- Safety guards (refuse inconsistent dispositions) -----------------

  enforceAcceptIsClean(functionalGroup, variant);
  enforceCountInvariants(functionalGroup, variant);

  // ---- Delimiter resolution + escape helper -----------------------------

  // `*` is the only element separator the cosyte builder emits. The ISA
  // itself declares it (ISA byte 4) and the build path needs no override:
  // overriding `elementSeparator` is offered for testing parity with
  // unusual companion guides but is not advertised on the public API.
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

  /**
   * Apply `?`-release-character escape to a single data element so that
   * any occurrence of the active delimiters inside the value survives the
   * emit step. The output is always spec-clean (Postel's-Law conservative
   * emit) and round-trippable through the parser's lenient mode.
   */
  const esc = makeCallerEscaper(delimiters, builder, refuseSpec);
  const join = (parts: readonly string[]): string =>
    joinSeg(parts, elementSeparator, segmentTerminator);

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
  // early-returns on `""` and emits the required element EMPTY on both ends of
  // the pair, so each pair still reconciled against itself.
  //
  // 🛑 THAT LAST CLAUSE IS TRUE HERE AND FALSE IN THE SEVEN DOMAIN BUILDERS, so
  // do not copy it out of this file: `joinSeg` keeps a trailing empty element
  // (`GE*1*~`), while their `seg` trims it and the trailer loses GE-02 / SE-02
  // outright. `warnings: []` is the property that holds in both. The
  // measurement and the refuse-rather-than-warn reasoning are in
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
    builder,
    refuseSpec,
  );
  requireControlNumber(
    envelope.groupControlNumber,
    "GS-06 / GE-02",
    "groupControlNumber",
    builder,
    refuseSpec,
  );
  requireControlNumber(
    envelope.transactionSetControlNumber,
    "ST-02 / SE-02",
    "transactionSetControlNumber",
    builder,
    refuseSpec,
  );

  const interchangeControlNumber = padControl(envelope.interchangeControlNumber, 9, variant);
  const isa =
    [
      "ISA",
      "00", // ISA-01 - Authorization Info Qualifier
      " ".repeat(10), // ISA-02 - Authorization Info (blank when ISA-01 == "00")
      "00", // ISA-03 - Security Info Qualifier
      " ".repeat(10), // ISA-04 - Security Info (blank when ISA-03 == "00")
      padIsaElement(senderQualifier, 2, "ISA-05", "senderQualifier", builder, refuseSpec), // ISA-05
      padIsaElement(envelope.senderId, 15, "ISA-06", "senderId", builder, refuseSpec), // ISA-06
      padIsaElement(receiverQualifier, 2, "ISA-07", "receiverQualifier", builder, refuseSpec), // ISA-07
      padIsaElement(envelope.receiverId, 15, "ISA-08", "receiverId", builder, refuseSpec), // ISA-08
      padIsaElement(envelope.interchangeDate, 6, "ISA-09", "interchangeDate", builder, refuseSpec), // ISA-09 - YYMMDD
      padIsaElement(envelope.interchangeTime, 4, "ISA-10", "interchangeTime", builder, refuseSpec), // ISA-10 - HHMM
      repetitionSeparator, // ISA-11 - repetition separator
      "00501", // ISA-12 - interchange version
      interchangeControlNumber, // ISA-13
      "0", // ISA-14 - ack requested (0 = no inbound TA1)
      padIsaUsageIndicator(usageIndicator, builder, refuseSpec), // ISA-15
      componentSeparator, // ISA-16 - component separator
    ].join(elementSeparator) + segmentTerminator;

  // ---- Body segments ----------------------------------------------------

  const groupDate = envelope.groupDate ?? expandYY(envelope.interchangeDate);
  const groupTime = envelope.groupTime ?? envelope.interchangeTime;
  const groupResponsibleAgency = envelope.groupResponsibleAgency ?? X12_AGENCY_CODE;

  // GS-08 carries the version + release of the acknowledgment itself (the 999
  // guide, or the base standard version for a 997), not the inbound
  // functional group's version (which travels on AK1-03).
  const version = variant === "999" ? X231A1_VERSION_RELEASE : BASE_STANDARD_VERSION;
  const gs = join([
    "GS",
    variant === "999" ? X12_ACK_FUNCTIONAL_ID : FUNCTIONAL_IDENTIFIER_BY_TRANSACTION_SET["997"], // GS-01 - "FA"
    esc(envelope.senderId), // GS-02
    esc(envelope.receiverId), // GS-03
    esc(groupDate), // GS-04 - CCYYMMDD
    esc(groupTime), // GS-05 - HHMM
    esc(envelope.groupControlNumber), // GS-06
    esc(groupResponsibleAgency), // GS-07
    version, // GS-08
  ]);

  const stControlNumber = envelope.transactionSetControlNumber;
  // A 997 names no implementation guide, so its ST carries no ST-03.
  const st = join(
    variant === "999"
      ? ["ST", variant, esc(stControlNumber), X231A1_VERSION_RELEASE]
      : ["ST", variant, esc(stControlNumber)],
  );

  // AK1-02 is not this ack's own control number: it ECHOES the GS-06 of the
  // group being acknowledged, and it is the whole reason the sender can match
  // this 999 to what they sent. An empty one emitted `AK1*HC**005010X222A2~`
  // and acknowledged nothing, with no error and no warning. Same class as the
  // envelope trio above and refused the same way. An inbound GS-06 that really
  // is absent is not this case: the caller supplies what they read, and there
  // is no value to read out of an absent element either.
  requireControlNumber(
    functionalGroup.groupControlNumber,
    "AK1-02",
    "functionalGroup.groupControlNumber",
    builder,
    refuseSpec,
  );

  // AK1-03 is required on a 999 and situational on a 997: a 999 writes it
  // always (and refuses a missing one through `esc`), a 997 only when given.
  const ak1Parts = [
    "AK1",
    esc(functionalGroup.functionalIdCode),
    esc(functionalGroup.groupControlNumber),
  ];
  if (variant === "999" || functionalGroup.versionRelease !== undefined) {
    ak1Parts.push(esc(functionalGroup.versionRelease as string));
  }
  const ak1 = join(ak1Parts);

  const responseSegments: string[] = [];
  for (const response of requireCallerEntries(
    functionalGroup.transactionResponses,
    `${builder}: functionalGroup.transactionResponses`,
    refuseSpec,
  )) {
    responseSegments.push(buildAk2(response, esc, join, builder));
    for (const segError of requireCallerEntries(
      response.segmentErrors,
      `${builder}: response.segmentErrors`,
      refuseSpec,
    )) {
      responseSegments.push(
        ...buildSegmentNote(segError, esc, delimiters.component, join, variant),
      );
    }
    responseSegments.push(buildResponseTrailer(response, esc, join, variant));
  }

  const ak9 = buildAk9(functionalGroup, esc, join, variant);

  // SE-01 includes ST and SE themselves.
  const bodySegments = [st, ak1, ...responseSegments, ak9];
  const seCount = bodySegments.length + 1;
  const se = join(["SE", String(seCount), esc(stControlNumber)]);

  const ge = join(["GE", "1", esc(envelope.groupControlNumber)]);

  const iea = join(["IEA", "1", interchangeControlNumber]);

  // The interchange the bytes read as, exactly what `parseX12` answers for
  // them: the reader's own envelope walk runs over the segments written, so
  // any self-build-self-parse divergence still surfaces as Tier-2 warnings on
  // the returned interchange's `warnings` array.
  return builtInterchange(isa, [gs, ...bodySegments, se, ge, iea], new SegmentLog());
}

// ---------------------------------------------------------------------------
// Safety guards - refuse inconsistent dispositions.
// ---------------------------------------------------------------------------

/**
 * Refuse an `Accept` disposition paired with errors anywhere in the spec.
 * Enforces the cosyte ack archetype's safety invariant: a library that
 * silently fabricates an accept against a non-empty error list lies to the
 * inbound sender that their input passed when it did not - a real
 * patient-safety hazard. Mirrors the hl7 `buildAck` boundary +
 * `@cosyte/mllp`'s commit contract.
 *
 * @internal
 */
function enforceAcceptIsClean(group: AckFunctionalGroupSpec, variant: AckVariant): void {
  const functionalIsAccept = group.disposition === X12_ACK_DISPOSITION_CODES.A;
  const functionalHasErrorCodes = (group.syntaxErrorCodes ?? []).length > 0;
  if (functionalIsAccept && functionalHasErrorCodes) {
    throw new AckBuildError(
      ACK_BUILD_ERROR_CODES.X12_ACK_ACCEPT_WITH_ERRORS,
      `build${variant}: AK9-01 was 'A' (Accept) but AK9-05..AK9-09 carried ${renderCallerValue(
        /* v8 ignore next -- only reached when `syntaxErrorCodes` is non-empty, so `?? []` never runs */
        (group.syntaxErrorCodes ?? []).length,
      )} syntax error code(s). Use 'E' (Accept, with errors noted) or a reject disposition instead.`,
    );
  }
  for (const response of requireCallerEntries(
    group.transactionResponses,
    `build${variant}: functionalGroup.transactionResponses`,
    refuseSpec,
  )) {
    const responseIsAccept = response.disposition === X12_ACK_DISPOSITION_CODES.A;
    const responseHasErrors = responseHasAnyError(response);
    if (responseIsAccept && responseHasErrors) {
      throw new AckBuildError(
        ACK_BUILD_ERROR_CODES.X12_ACK_ACCEPT_WITH_ERRORS,
        `build${variant}: AK2 (ST-02 ${renderCallerValue(response.transactionSetControlNumber)}) ${variant === "999" ? "IK5" : "AK5"}-01 was 'A' (Accept) but the response carried error payload. Use 'E' (Accept, with errors noted) or a reject disposition instead.`,
      );
    }
    if (functionalIsAccept && (!responseIsAccept || responseHasErrors)) {
      throw new AckBuildError(
        ACK_BUILD_ERROR_CODES.X12_ACK_ACCEPT_WITH_ERRORS,
        `build${variant}: AK9-01 was 'A' (Accept) but transaction response (ST-02 ${renderCallerValue(response.transactionSetControlNumber)}) reported a non-accept disposition or carried errors. Lift the functional disposition to 'P' (Partial), 'E' (Accept, errors noted), or a reject.`,
      );
    }
  }
}

/**
 * Refuse internally inconsistent AK9-02 / AK9-03 / AK9-04 counts. Enforces
 * `0 ≤ accepted ≤ received ≤ declared` and `responses.length == received`.
 *
 * @internal
 */
function enforceCountInvariants(group: AckFunctionalGroupSpec, variant: AckVariant): void {
  const declared = group.numberOfTransactionSets;
  const received = group.numberOfReceivedTransactionSets;
  const accepted = group.numberOfAcceptedTransactionSets;
  if (declared < 0 || received < 0 || accepted < 0) {
    throw new AckBuildError(
      ACK_BUILD_ERROR_CODES.X12_ACK_COUNT_MISMATCH,
      `build${variant}: AK9 counts must be non-negative (declared=${renderCallerValue(declared)}, received=${renderCallerValue(received)}, accepted=${renderCallerValue(accepted)}).`,
    );
  }
  if (accepted > received) {
    throw new AckBuildError(
      ACK_BUILD_ERROR_CODES.X12_ACK_COUNT_MISMATCH,
      `build${variant}: AK9-04 accepted (${renderCallerValue(accepted)}) cannot exceed AK9-03 received (${renderCallerValue(received)}).`,
    );
  }
  if (received > declared) {
    throw new AckBuildError(
      ACK_BUILD_ERROR_CODES.X12_ACK_COUNT_MISMATCH,
      `build${variant}: AK9-03 received (${renderCallerValue(received)}) cannot exceed AK9-02 declared (${renderCallerValue(declared)}).`,
    );
  }
  if (group.transactionResponses.length !== received) {
    throw new AckBuildError(
      ACK_BUILD_ERROR_CODES.X12_ACK_COUNT_MISMATCH,
      `build${variant}: AK9-03 received (${renderCallerValue(received)}) must equal the number of supplied transaction responses (${renderCallerValue(group.transactionResponses.length)}).`,
    );
  }
  // No cross-check of AK9-04 vs the count of IK5-01='A' responses: TR3
  // 005010X231A1 is ambiguous on whether IK5='E' (accept with errors)
  // counts toward AK9-04. The accept-clean guard above already refuses
  // the load-bearing safety case (functional `A` against any non-accept
  // response); finer disposition-vs-count consistency is the caller's
  // call.
}

/** @internal */
function responseHasAnyError(response: AckTransactionResponseSpec): boolean {
  if ((response.syntaxErrorCodes ?? []).length > 0) return true;
  if ((response.segmentErrors ?? []).length > 0) return true;
  return false;
}

// ---------------------------------------------------------------------------
// Segment builders.
// ---------------------------------------------------------------------------

/** One segment as `[id, ...elements]`, joined and terminated. @internal */
type Join = (parts: readonly string[]) => string;

/** @internal */
function buildAk2(
  response: AckTransactionResponseSpec,
  esc: (value: string) => string,
  join: Join,
  builder: string,
): string {
  // AK2-02 echoes the ST-02 of the transaction set being acknowledged, the same
  // role AK1-02 plays one level up. An empty one emitted `AK2*837*~` and the
  // IK5 that follows it then reported a disposition for a transaction set the
  // sender cannot identify.
  requireControlNumber(
    response.transactionSetControlNumber,
    "AK2-02",
    "transactionResponses[].transactionSetControlNumber",
    builder,
    refuseSpec,
  );

  const parts: string[] = [
    "AK2",
    esc(response.transactionSetIdCode),
    esc(response.transactionSetControlNumber),
  ];
  if (response.implementationConventionReference !== undefined) {
    parts.push(esc(response.implementationConventionReference));
  }
  return join(parts);
}

/** The contexts a 997 writes: none. @internal */
const NO_CONTEXTS: readonly string[] = Object.freeze([]);

/**
 * The segment note (IK3 on a 999, AK3 on a 997) with its CTX contexts and its
 * element notes. A 997 has no CTX segment; its specs carry no contexts.
 *
 * @internal
 */
function buildSegmentNote(
  segError: AckSegmentErrorSpec,
  esc: (value: string) => string,
  componentSeparator: string,
  join: Join,
  variant: AckVariant,
): readonly string[] {
  const ik3Parts: string[] = [
    variant === "999" ? "IK3" : "AK3",
    esc(segError.segmentIdCode),
    String(segError.segmentPositionInTransactionSet),
  ];
  if (segError.loopIdentifier !== undefined || segError.syntaxErrorCode !== undefined) {
    ik3Parts.push(esc(segError.loopIdentifier ?? ""));
  }
  if (segError.syntaxErrorCode !== undefined) {
    ik3Parts.push(esc(segError.syntaxErrorCode));
  }
  const out: string[] = [join(ik3Parts)];
  // CTX is a 999 segment. A 997 has none, so its contexts are never read,
  // whatever the spec holds: this, not build997's refusal, is the guarantee.
  for (const ctxValue of variant === "999" ? (segError.contexts ?? []) : NO_CONTEXTS) {
    out.push(join(["CTX", esc(ctxValue)]));
  }
  for (const elemError of requireCallerEntries(
    segError.elementErrors,
    `build${variant}: segError.elementErrors`,
    refuseSpec,
  )) {
    out.push(buildElementNote(elemError, esc, componentSeparator, join, variant));
    for (const ctxValue of variant === "999" ? (elemError.contexts ?? []) : NO_CONTEXTS) {
      out.push(join(["CTX", esc(ctxValue)]));
    }
  }
  return out;
}

/** The element note: IK4 on a 999, AK4 on a 997. @internal */
function buildElementNote(
  elemError: AckElementErrorSpec,
  esc: (value: string) => string,
  componentSeparator: string,
  join: Join,
  variant: AckVariant,
): string {
  const positionComponents: string[] = [String(elemError.position.element)];
  if (elemError.position.component !== undefined) {
    positionComponents.push(String(elemError.position.component));
  } else if (elemError.position.repetition !== undefined) {
    positionComponents.push("");
  }
  if (elemError.position.repetition !== undefined) {
    positionComponents.push(String(elemError.position.repetition));
  }
  const positionComposite = positionComponents.join(componentSeparator);
  const parts: string[] = [variant === "999" ? "IK4" : "AK4", positionComposite];
  // IK4-02 is situational. We always emit it (empty when not supplied) so
  // IK4-03 stays positionally pinned at element index 3.
  parts.push(esc(elemError.dataElementReferenceNumber ?? ""));
  parts.push(esc(elemError.syntaxErrorCode));
  if (elemError.copyOfBadDataElement !== undefined) {
    parts.push(esc(elemError.copyOfBadDataElement));
  }
  return join(parts);
}

/** The response trailer: IK5 on a 999, AK5 on a 997. @internal */
function buildResponseTrailer(
  response: AckTransactionResponseSpec,
  esc: (value: string) => string,
  join: Join,
  variant: AckVariant,
): string {
  const parts: string[] = [variant === "999" ? "IK5" : "AK5", esc(response.disposition)];
  const codes = response.syntaxErrorCodes ?? [];
  if (codes.length > 5) {
    throw new AckBuildError(
      ACK_BUILD_ERROR_CODES.X12_ACK_COUNT_MISMATCH,
      `build${variant}: ${variant === "999" ? "IK5 accepts up to 5 syntax error codes (IK5-02..IK5-06)" : "AK5 accepts up to 5 syntax error codes (AK5-02..AK5-06)"}; ${renderCallerValue(codes.length)} supplied.`,
    );
  }
  for (const code of codes) parts.push(esc(code));
  return join(parts);
}

/** @internal */
function buildAk9(
  group: AckFunctionalGroupSpec,
  esc: (value: string) => string,
  join: Join,
  variant: AckVariant,
): string {
  const parts: string[] = [
    "AK9",
    esc(group.disposition),
    String(group.numberOfTransactionSets),
    String(group.numberOfReceivedTransactionSets),
    String(group.numberOfAcceptedTransactionSets),
  ];
  const codes = group.syntaxErrorCodes ?? [];
  if (codes.length > 5) {
    throw new AckBuildError(
      ACK_BUILD_ERROR_CODES.X12_ACK_COUNT_MISMATCH,
      `build${variant}: AK9 accepts up to 5 syntax error codes (AK9-05..AK9-09); ${renderCallerValue(codes.length)} supplied.`,
    );
  }
  for (const code of codes) parts.push(esc(code));
  return join(parts);
}

// ---------------------------------------------------------------------------
// String helpers.
// ---------------------------------------------------------------------------

/** This builder's {@link AckSegmentJoiner}. @internal */
function joinSeg(
  parts: readonly string[],
  elementSeparator: string,
  segmentTerminator: string,
): string {
  requireCallerSegment(parts, "build999", refuseSpec);
  return parts.join(elementSeparator) + segmentTerminator;
}

/**
 * Zero-pad a control number to `width` chars. Used for ISA-13 / IEA-02
 * (always 9 chars). Throws if the value is already too long.
 *
 * @internal
 */
function padControl(value: string, width: number, variant: AckVariant): string {
  if (value.length === width) return value;
  if (value.length < width) return "0".repeat(width - value.length) + value;
  throw new AckBuildError(
    ACK_BUILD_ERROR_CODES.X12_ACK_INVALID_SPEC,
    `build${variant}: control number ${renderCallerValue(value)} exceeds the ${String(width)}-char spec limit.`,
  );
}

/**
 * Expand a 6-digit YYMMDD into CCYYMMDD. GS-04 carries the 4-digit year
 * form even when ISA-09 carries the 2-digit form. Years `00` to `49` are
 * 21st century (e.g. `25` → `2025`); `50` to `99` are 20th century - the
 * conventional X12 century-expansion window.
 *
 * @internal
 */
function expandYY(yymmdd: string): string {
  if (yymmdd.length !== 6) return yymmdd; // pass-through if caller already supplied CCYYMMDD
  const yy = parseInt(yymmdd.slice(0, 2), 10);
  if (Number.isNaN(yy)) return yymmdd;
  const century = yy < 50 ? "20" : "19";
  return century + yymmdd;
}

// The TA1 sibling lives in build-ta1.ts; this builder owns only the 999.
