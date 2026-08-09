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
import type {
  Build999ElementErrorSpec,
  Build999FunctionalGroupSpec,
  Build999SegmentErrorSpec,
  Build999Spec,
  Build999TransactionResponseSpec,
} from "./types.js";
import { parseX12 } from "../../parser/index.js";
import type { X12Interchange } from "../../parser/types.js";
import { requireCallerSegment } from "../../builder/caller-segment.js";
import { renderCallerValue } from "../../builder/caller-value.js";
import { makeCallerEscaper } from "../../builder/caller-string.js";
import { requireControlNumber } from "../../builder/caller-control-number.js";

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
  const { envelope, functionalGroup } = spec;

  // ---- Safety guards (refuse inconsistent dispositions) -----------------

  enforceAcceptIsClean(functionalGroup);
  enforceCountInvariants(functionalGroup);

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
  const esc = makeCallerEscaper(delimiters, "build999", refuseSpec);

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
  // the pair, so each pair still reconciled against itself. The measurement and
  // the refuse-rather-than-warn reasoning are in
  // `src/builder/caller-control-number.ts`.
  //
  // Placed here rather than at the top of the function so every guard that
  // already ran keeps its precedence: a spec that is wrong in two ways reports
  // the same first refusal it reported before.
  requireControlNumber(
    envelope.interchangeControlNumber,
    "ISA-13 / IEA-02",
    "interchangeControlNumber",
    "build999",
    refuseSpec,
  );
  requireControlNumber(
    envelope.groupControlNumber,
    "GS-06 / GE-02",
    "groupControlNumber",
    "build999",
    refuseSpec,
  );
  requireControlNumber(
    envelope.transactionSetControlNumber,
    "ST-02 / SE-02",
    "transactionSetControlNumber",
    "build999",
    refuseSpec,
  );

  const interchangeControlNumber = padControl(envelope.interchangeControlNumber, 9);
  const isa =
    [
      "ISA",
      "00", // ISA-01 - Authorization Info Qualifier
      pad(" ", 10), // ISA-02 - Authorization Info (blank when ISA-01 == "00")
      "00", // ISA-03 - Security Info Qualifier
      pad(" ", 10), // ISA-04 - Security Info (blank when ISA-03 == "00")
      pad(senderQualifier, 2), // ISA-05
      pad(envelope.senderId, 15), // ISA-06
      pad(receiverQualifier, 2), // ISA-07
      pad(envelope.receiverId, 15), // ISA-08
      pad(envelope.interchangeDate, 6), // ISA-09 - YYMMDD
      pad(envelope.interchangeTime, 4), // ISA-10 - HHMM
      repetitionSeparator, // ISA-11 - repetition separator
      "00501", // ISA-12 - interchange version
      interchangeControlNumber, // ISA-13
      "0", // ISA-14 - ack requested (0 = no inbound TA1)
      usageIndicator, // ISA-15
      componentSeparator, // ISA-16 - component separator
    ].join(elementSeparator) + segmentTerminator;

  // ---- Body segments ----------------------------------------------------

  const groupDate = envelope.groupDate ?? expandYY(envelope.interchangeDate);
  const groupTime = envelope.groupTime ?? envelope.interchangeTime;
  const groupResponsibleAgency = envelope.groupResponsibleAgency ?? X12_AGENCY_CODE;

  // GS-08 carries the version + release of the 999 itself (005010X231A1),
  // not the inbound functional group's version (which travels on AK1-03).
  const gs = joinSeg(
    [
      "GS",
      "FA", // GS-01 - functional ID code "FA" for ack
      esc(envelope.senderId), // GS-02
      esc(envelope.receiverId), // GS-03
      esc(groupDate), // GS-04 - CCYYMMDD
      esc(groupTime), // GS-05 - HHMM
      esc(envelope.groupControlNumber), // GS-06
      esc(groupResponsibleAgency), // GS-07
      X231A1_VERSION_RELEASE, // GS-08 - the 999 TR3
    ],
    elementSeparator,
    segmentTerminator,
  );

  const stControlNumber = envelope.transactionSetControlNumber;
  const st = joinSeg(
    ["ST", "999", esc(stControlNumber), X231A1_VERSION_RELEASE],
    elementSeparator,
    segmentTerminator,
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
    "build999",
    refuseSpec,
  );

  const ak1 = joinSeg(
    [
      "AK1",
      esc(functionalGroup.functionalIdCode),
      esc(functionalGroup.groupControlNumber),
      esc(functionalGroup.versionRelease),
    ],
    elementSeparator,
    segmentTerminator,
  );

  const responseSegments: string[] = [];
  for (const response of functionalGroup.transactionResponses) {
    responseSegments.push(buildAk2(response, esc, elementSeparator, segmentTerminator));
    for (const segError of response.segmentErrors ?? []) {
      responseSegments.push(
        ...buildIk3WithChildren(
          segError,
          esc,
          delimiters.component,
          elementSeparator,
          segmentTerminator,
        ),
      );
    }
    responseSegments.push(buildIk5(response, esc, elementSeparator, segmentTerminator));
  }

  const ak9 = buildAk9(functionalGroup, esc, elementSeparator, segmentTerminator);

  // SE-01 includes ST and SE themselves.
  const bodySegments = [st, ak1, ...responseSegments, ak9];
  const seCount = bodySegments.length + 1;
  const se = joinSeg(
    ["SE", String(seCount), esc(stControlNumber)],
    elementSeparator,
    segmentTerminator,
  );

  const ge = joinSeg(
    ["GE", "1", esc(envelope.groupControlNumber)],
    elementSeparator,
    segmentTerminator,
  );

  const iea = joinSeg(["IEA", "1", interchangeControlNumber], elementSeparator, segmentTerminator);

  const raw = isa + gs + bodySegments.join("") + se + ge + iea;

  // Final round-trip through `parseX12` so the returned `X12Interchange`
  // is bit-identical with the parsed form the consumer's other helpers
  // operate on - and so the build path inherits delimiter detection,
  // envelope walking, and any future Phase-1+ refinements for free. This
  // also catches any internal builder bug at the call boundary (any
  // self-build-self-parse divergence surfaces as Tier-2 warnings on the
  // returned interchange's `warnings` array).
  return parseX12(raw);
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
function enforceAcceptIsClean(group: Build999FunctionalGroupSpec): void {
  const functionalIsAccept = group.disposition === X12_ACK_DISPOSITION_CODES.A;
  const functionalHasErrorCodes = (group.syntaxErrorCodes ?? []).length > 0;
  if (functionalIsAccept && functionalHasErrorCodes) {
    throw new AckBuildError(
      ACK_BUILD_ERROR_CODES.X12_ACK_ACCEPT_WITH_ERRORS,
      `build999: AK9-01 was 'A' (Accept) but AK9-05..AK9-09 carried ${renderCallerValue(
        (group.syntaxErrorCodes ?? []).length,
      )} syntax error code(s). Use 'E' (Accept, with errors noted) or a reject disposition instead.`,
    );
  }
  for (const response of group.transactionResponses) {
    const responseIsAccept = response.disposition === X12_ACK_DISPOSITION_CODES.A;
    const responseHasErrors = responseHasAnyError(response);
    if (responseIsAccept && responseHasErrors) {
      throw new AckBuildError(
        ACK_BUILD_ERROR_CODES.X12_ACK_ACCEPT_WITH_ERRORS,
        `build999: AK2 (ST-02 ${renderCallerValue(response.transactionSetControlNumber)}) IK5-01 was 'A' (Accept) but the response carried error payload. Use 'E' (Accept, with errors noted) or a reject disposition instead.`,
      );
    }
    if (functionalIsAccept && (!responseIsAccept || responseHasErrors)) {
      throw new AckBuildError(
        ACK_BUILD_ERROR_CODES.X12_ACK_ACCEPT_WITH_ERRORS,
        `build999: AK9-01 was 'A' (Accept) but transaction response (ST-02 ${renderCallerValue(response.transactionSetControlNumber)}) reported a non-accept disposition or carried errors. Lift the functional disposition to 'P' (Partial), 'E' (Accept, errors noted), or a reject.`,
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
function enforceCountInvariants(group: Build999FunctionalGroupSpec): void {
  const declared = group.numberOfTransactionSets;
  const received = group.numberOfReceivedTransactionSets;
  const accepted = group.numberOfAcceptedTransactionSets;
  if (declared < 0 || received < 0 || accepted < 0) {
    throw new AckBuildError(
      ACK_BUILD_ERROR_CODES.X12_ACK_COUNT_MISMATCH,
      `build999: AK9 counts must be non-negative (declared=${renderCallerValue(declared)}, received=${renderCallerValue(received)}, accepted=${renderCallerValue(accepted)}).`,
    );
  }
  if (accepted > received) {
    throw new AckBuildError(
      ACK_BUILD_ERROR_CODES.X12_ACK_COUNT_MISMATCH,
      `build999: AK9-04 accepted (${renderCallerValue(accepted)}) cannot exceed AK9-03 received (${renderCallerValue(received)}).`,
    );
  }
  if (received > declared) {
    throw new AckBuildError(
      ACK_BUILD_ERROR_CODES.X12_ACK_COUNT_MISMATCH,
      `build999: AK9-03 received (${renderCallerValue(received)}) cannot exceed AK9-02 declared (${renderCallerValue(declared)}).`,
    );
  }
  if (group.transactionResponses.length !== received) {
    throw new AckBuildError(
      ACK_BUILD_ERROR_CODES.X12_ACK_COUNT_MISMATCH,
      `build999: AK9-03 received (${renderCallerValue(received)}) must equal the number of supplied transaction responses (${renderCallerValue(group.transactionResponses.length)}).`,
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
function responseHasAnyError(response: Build999TransactionResponseSpec): boolean {
  if ((response.syntaxErrorCodes ?? []).length > 0) return true;
  if ((response.segmentErrors ?? []).length > 0) return true;
  return false;
}

// ---------------------------------------------------------------------------
// Segment builders.
// ---------------------------------------------------------------------------

/** @internal */
function buildAk2(
  response: Build999TransactionResponseSpec,
  esc: (value: string) => string,
  elementSeparator: string,
  segmentTerminator: string,
): string {
  // AK2-02 echoes the ST-02 of the transaction set being acknowledged, the same
  // role AK1-02 plays one level up. An empty one emitted `AK2*837*~` and the
  // IK5 that follows it then reported a disposition for a transaction set the
  // sender cannot identify.
  requireControlNumber(
    response.transactionSetControlNumber,
    "AK2-02",
    "transactionResponses[].transactionSetControlNumber",
    "build999",
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
  return joinSeg(parts, elementSeparator, segmentTerminator);
}

/** @internal */
function buildIk3WithChildren(
  segError: Build999SegmentErrorSpec,
  esc: (value: string) => string,
  componentSeparator: string,
  elementSeparator: string,
  segmentTerminator: string,
): readonly string[] {
  const ik3Parts: string[] = [
    "IK3",
    esc(segError.segmentIdCode),
    String(segError.segmentPositionInTransactionSet),
  ];
  if (segError.loopIdentifier !== undefined || segError.syntaxErrorCode !== undefined) {
    ik3Parts.push(esc(segError.loopIdentifier ?? ""));
  }
  if (segError.syntaxErrorCode !== undefined) {
    ik3Parts.push(segError.syntaxErrorCode);
  }
  const out: string[] = [joinSeg(ik3Parts, elementSeparator, segmentTerminator)];
  for (const ctxValue of segError.contexts ?? []) {
    out.push(joinSeg(["CTX", esc(ctxValue)], elementSeparator, segmentTerminator));
  }
  for (const elemError of segError.elementErrors ?? []) {
    out.push(buildIk4(elemError, esc, componentSeparator, elementSeparator, segmentTerminator));
    for (const ctxValue of elemError.contexts ?? []) {
      out.push(joinSeg(["CTX", esc(ctxValue)], elementSeparator, segmentTerminator));
    }
  }
  return out;
}

/** @internal */
function buildIk4(
  elemError: Build999ElementErrorSpec,
  esc: (value: string) => string,
  componentSeparator: string,
  elementSeparator: string,
  segmentTerminator: string,
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
  const parts: string[] = ["IK4", positionComposite];
  // IK4-02 is situational. We always emit it (empty when not supplied) so
  // IK4-03 stays positionally pinned at element index 3.
  parts.push(esc(elemError.dataElementReferenceNumber ?? ""));
  parts.push(elemError.syntaxErrorCode);
  if (elemError.copyOfBadDataElement !== undefined) {
    parts.push(esc(elemError.copyOfBadDataElement));
  }
  return joinSeg(parts, elementSeparator, segmentTerminator);
}

/** @internal */
function buildIk5(
  response: Build999TransactionResponseSpec,
  esc: (value: string) => string,
  elementSeparator: string,
  segmentTerminator: string,
): string {
  const parts: string[] = ["IK5", esc(response.disposition)];
  const codes = response.syntaxErrorCodes ?? [];
  if (codes.length > 5) {
    throw new AckBuildError(
      ACK_BUILD_ERROR_CODES.X12_ACK_COUNT_MISMATCH,
      `build999: IK5 accepts up to 5 syntax error codes (IK5-02..IK5-06); ${renderCallerValue(codes.length)} supplied.`,
    );
  }
  for (const code of codes) parts.push(esc(code));
  return joinSeg(parts, elementSeparator, segmentTerminator);
}

/** @internal */
function buildAk9(
  group: Build999FunctionalGroupSpec,
  esc: (value: string) => string,
  elementSeparator: string,
  segmentTerminator: string,
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
      `build999: AK9 accepts up to 5 syntax error codes (AK9-05..AK9-09); ${renderCallerValue(codes.length)} supplied.`,
    );
  }
  for (const code of codes) parts.push(esc(code));
  return joinSeg(parts, elementSeparator, segmentTerminator);
}

// ---------------------------------------------------------------------------
// String helpers.
// ---------------------------------------------------------------------------

/** @internal */
function joinSeg(
  parts: readonly string[],
  elementSeparator: string,
  segmentTerminator: string,
): string {
  requireCallerSegment(parts, "build999", refuseSpec);
  return parts.join(elementSeparator) + segmentTerminator;
}

/** @internal */
function pad(value: string, width: number): string {
  if (value.length === width) return value;
  if (value.length < width) return value + " ".repeat(width - value.length);
  return value.slice(0, width);
}

/**
 * Zero-pad a control number to `width` chars. Used for ISA-13 / IEA-02
 * (always 9 chars). Throws if the value is already too long.
 *
 * @internal
 */
function padControl(value: string, width: number): string {
  if (value.length === width) return value;
  if (value.length < width) return "0".repeat(width - value.length) + value;
  throw new AckBuildError(
    ACK_BUILD_ERROR_CODES.X12_ACK_INVALID_SPEC,
    `build999: control number ${renderCallerValue(value)} exceeds the ${String(width)}-char spec limit.`,
  );
}

/**
 * Expand a 6-digit YYMMDD into CCYYMMDD. GS-04 carries the 4-digit year
 * form even when ISA-09 carries the 2-digit form. Years `00`–`49` are
 * 21st century (e.g. `25` → `2025`); `50`–`99` are 20th century - the
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
