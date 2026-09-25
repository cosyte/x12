/**
 * `get277RequestForAdditionalInformation` - read a 277 Health Care Claim
 * Request for Additional Information (`006020X313`) into a typed
 * {@link X12AdditionalInformationRequest}.
 *
 * **It reads nothing else.** A transaction set whose ST-01 is not `277`, or a
 * 277 whose declared guide is not `006020X313` (a claim status response, a
 * claim acknowledgment, or one declaring nothing), returns `undefined`. The
 * declared guide is the package's one rule: ST-03 decoded where it is
 * non-empty, else GS-08 decoded, else none. A second 277 reader that warned
 * and returned would hand a claim status answer to code written for a
 * documentation request, which is the one confusion this reader exists to
 * prevent. `get277Status` keeps labelling a `006020X313` document
 * `"unrecognized-guide"`; the two never both claim a document.
 *
 * **What is read.** The BHT; every HL in document order with its HL elements
 * verbatim; the NM1 of each name loop sent under a level before its first
 * claim-level request; and under the level it was sent in, each claim-level
 * request with its TRN, STC, REF, DTP, QTY and AMT segments and its SVC service
 * lines with their own STC, REF and DTP. A request opens on a TRN, and on an
 * STC or SVC arriving under a level with no request open, so a status is never
 * dropped for want of a trace; such a request's `traces` list is empty.
 *
 * **C043-04 decides whether C043-02 is a claim status code.** It names the code
 * source of C043-02, so where it is non-empty C043-02 is not looked up in the
 * claim status code list, gets no description and raises no unknown-status
 * warning: a LOINC code naming the attachment requested is not a claim status
 * code, and describing it as one would misread the request.
 *
 * **What is not read.** No TR3 usage is asserted, so no qualifier or level code
 * is checked and nothing is refused. SBR, PAT, DMG, the PWK loops, TOO, the
 * heading's name loop, and any segment arriving before the first HL, are not
 * typed and stay verbatim on the transaction set. HL parent pointers are
 * carried as sent and are not validated, because no carried source states the
 * guide's hierarchy.
 */

import { lookupClaimStatus } from "../../code-lists/claim-status.js";
import { lookupClaimStatusCategory } from "../../code-lists/claim-status-category.js";
import {
  componentOptional,
  elementDecimal,
  elementOptional,
  type X12DecimalWarningSink,
  type X12Segment,
} from "../../parser/segment.js";
import type { Delimiters, X12Position, X12TransactionSet } from "../../parser/types.js";
import {
  rfaiHeaderAbsent,
  rfaiLevelAbsent,
  rfaiRequestAbsent,
  unknownClaimStatus,
  unknownClaimStatusCategory,
  type X12ParseWarning,
} from "../../parser/warnings.js";
import { declaredGuide, implementedGuides } from "../shared/declared-guide.js";
import { decodeSt03 } from "../shared/st03.js";
import type {
  X12AdditionalInformationRequest,
  X12AdditionalInformationRequestAmount,
  X12AdditionalInformationRequestClaim,
  X12AdditionalInformationRequestDate,
  X12AdditionalInformationRequestEntity,
  X12AdditionalInformationRequestHeader,
  X12AdditionalInformationRequestLevel,
  X12AdditionalInformationRequestQuantity,
  X12AdditionalInformationRequestReference,
  X12AdditionalInformationRequestServiceLine,
  X12AdditionalInformationRequestStatus,
  X12AdditionalInformationRequestStatusCode,
  X12AdditionalInformationRequestTrace,
} from "./rfai-types.js";

/**
 * The guides this reader implements: the request for additional information
 * row of `X12_TR3_CONFORMANCE` alone. A `Set`, because the declaration is
 * document bytes. @internal
 */
const IMPLEMENTED_GUIDES_RFAI = implementedGuides("277", "RFAI");

/** The ST, transaction-relative: where every absence is anchored. @internal */
const ST_POSITION: X12Position = Object.freeze({ segmentIndex: 0, transactionIndex: 0 });

/** The three C043 composites of an STC, in the order they are published. @internal */
const STC_COMPOSITES = [1, 10, 11] as const;

/**
 * Read a 277 request for additional information. Returns `undefined` unless
 * ST-01 is `277` and the declared guide is `006020X313`; every other deviation
 * is read leniently and surfaces on `warnings`, never as a throw. Pure: no I/O,
 * no global state, and the transaction set is not modified.
 *
 * @example
 * ```ts
 * import { parseX12, get277RequestForAdditionalInformation } from "@cosyte/x12";
 * const ix = parseX12(raw);
 * for (const tx of ix.groups[0]?.transactions ?? []) {
 *   const rfai = get277RequestForAdditionalInformation(ix.delimiters, tx);
 *   if (rfai === undefined) continue; // not a 006020X313 277
 *   for (const level of rfai.levels) {
 *     for (const request of level.requests) {
 *       request.traces[0]?.referenceId;
 *       request.statuses[0]?.codes[0]?.statusCode; // e.g. a LOINC code
 *     }
 *   }
 * }
 * ```
 */
export function get277RequestForAdditionalInformation(
  delimiters: Delimiters,
  tx: X12TransactionSet,
): X12AdditionalInformationRequest | undefined {
  if (tx.st.elements[1] !== "277") return undefined;
  const declared = declaredGuide(delimiters, tx);
  if (declared === undefined || !IMPLEMENTED_GUIDES_RFAI.has(declared)) return undefined;
  return walk(delimiters, tx);
}

// ---------------------------------------------------------------------------
// Mutable accumulators, frozen into the readonly public shape at the end.
// ---------------------------------------------------------------------------

/** @internal */
interface LevelAccumulator {
  readonly id: string | undefined;
  readonly parentId: string | undefined;
  readonly levelCode: string | undefined;
  readonly childCode: string | undefined;
  readonly entities: X12AdditionalInformationRequestEntity[];
  readonly requests: RequestAccumulator[];
}

/** @internal */
interface RequestAccumulator {
  readonly traces: X12AdditionalInformationRequestTrace[];
  readonly statuses: X12AdditionalInformationRequestStatus[];
  readonly references: X12AdditionalInformationRequestReference[];
  readonly dates: X12AdditionalInformationRequestDate[];
  readonly quantities: X12AdditionalInformationRequestQuantity[];
  readonly amounts: X12AdditionalInformationRequestAmount[];
  readonly serviceLines: ServiceLineAccumulator[];
}

/** @internal */
interface ServiceLineAccumulator {
  readonly head: Omit<X12AdditionalInformationRequestServiceLine, "statuses" | "references" | "dates">;
  readonly statuses: X12AdditionalInformationRequestStatus[];
  readonly references: X12AdditionalInformationRequestReference[];
  readonly dates: X12AdditionalInformationRequestDate[];
}

/** @internal */
function openRequest(): RequestAccumulator {
  return {
    traces: [],
    statuses: [],
    references: [],
    dates: [],
    quantities: [],
    amounts: [],
    serviceLines: [],
  };
}

/**
 * The walk. Segment positions are transaction-relative, the ST being 0, which
 * is how every typed reader in this package anchors a warning. @internal
 */
function walk(delimiters: Delimiters, tx: X12TransactionSet): X12AdditionalInformationRequest {
  const warnings: X12ParseWarning[] = [];
  const body = tx.se === undefined ? tx.segments.slice(1) : tx.segments.slice(1, -1);

  let header: X12AdditionalInformationRequestHeader | undefined;
  const levels: LevelAccumulator[] = [];
  let level: LevelAccumulator | undefined;
  let request: RequestAccumulator | undefined;
  let line: ServiceLineAccumulator | undefined;

  /** The request STC, SVC, REF, DTP, QTY and AMT attach to, opening one on STC / SVC. */
  const requestFor = (open: boolean): RequestAccumulator | undefined => {
    if (request !== undefined || level === undefined || !open) return request;
    request = openRequest();
    level.requests.push(request);
    return request;
  };

  for (const [i, seg] of body.entries()) {
    const position: X12Position = { segmentIndex: i + 1, transactionIndex: 0 };
    const sink: X12DecimalWarningSink = { warnings, position };
    switch (seg.id) {
      case "BHT": {
        header ??= decodeHeader(seg, delimiters);
        break;
      }
      case "HL": {
        level = {
          id: elementOptional(seg, 1, delimiters),
          parentId: elementOptional(seg, 2, delimiters),
          levelCode: elementOptional(seg, 3, delimiters),
          childCode: elementOptional(seg, 4, delimiters),
          entities: [],
          requests: [],
        };
        levels.push(level);
        request = undefined;
        line = undefined;
        break;
      }
      case "NM1": {
        // A name loop precedes the level's requests; an NM1 after one has
        // opened is not typed and stays on the transaction set.
        if (level !== undefined && request === undefined) {
          level.entities.push(decodeEntity(seg, delimiters));
        }
        break;
      }
      case "TRN": {
        if (level === undefined) break;
        request = openRequest();
        level.requests.push(request);
        line = undefined;
        request.traces.push(decodeTrace(seg, delimiters));
        break;
      }
      case "STC": {
        const target = line ?? requestFor(true);
        if (target === undefined) break;
        target.statuses.push(decodeStatus(seg, delimiters, warnings, position));
        break;
      }
      case "SVC": {
        const target = requestFor(true);
        if (target === undefined) break;
        line = openServiceLine(seg, delimiters, sink);
        target.serviceLines.push(line);
        break;
      }
      case "REF": {
        (line ?? requestFor(false))?.references.push(decodeReference(seg, delimiters));
        break;
      }
      case "DTP": {
        (line ?? requestFor(false))?.dates.push(decodeDate(seg, delimiters));
        break;
      }
      case "QTY": {
        requestFor(false)?.quantities.push(
          Object.freeze({
            qualifier: elementOptional(seg, 1, delimiters),
            quantity: elementDecimal(seg, 2, delimiters, sink),
          }),
        );
        break;
      }
      case "AMT": {
        requestFor(false)?.amounts.push(
          Object.freeze({
            qualifier: elementOptional(seg, 1, delimiters),
            amount: elementDecimal(seg, 2, delimiters, sink),
          }),
        );
        break;
      }
      default:
        break;
    }
  }

  const absences: X12ParseWarning[] = [];
  if (header === undefined) absences.push(rfaiHeaderAbsent(ST_POSITION));
  if (levels.length === 0) absences.push(rfaiLevelAbsent(ST_POSITION));
  if (levels.every((l) => l.requests.length === 0)) absences.push(rfaiRequestAbsent(ST_POSITION));

  return Object.freeze({
    transactionType: "request-for-additional-information",
    implementationConventionReference: decodeSt03(tx.st.elements[3], delimiters, ST_POSITION),
    header,
    levels: Object.freeze(levels.map(freezeLevel)),
    warnings: Object.freeze([...absences, ...warnings]),
  });
}

// ---------------------------------------------------------------------------
// Segment decoders. Every element through the package's value readers, so a
// release escape is resolved and an empty element reads `undefined`.
// ---------------------------------------------------------------------------

/** @internal */
function decodeHeader(
  seg: X12Segment,
  delimiters: Delimiters,
): X12AdditionalInformationRequestHeader {
  return Object.freeze({
    hierarchicalStructureCode: elementOptional(seg, 1, delimiters),
    transactionSetPurposeCode: elementOptional(seg, 2, delimiters),
    referenceId: elementOptional(seg, 3, delimiters),
    date: elementOptional(seg, 4, delimiters),
    time: elementOptional(seg, 5, delimiters),
    transactionTypeCode: elementOptional(seg, 6, delimiters),
  });
}

/** @internal */
function decodeEntity(
  seg: X12Segment,
  delimiters: Delimiters,
): X12AdditionalInformationRequestEntity {
  return Object.freeze({
    entityIdentifierCode: elementOptional(seg, 1, delimiters),
    entityTypeQualifier: elementOptional(seg, 2, delimiters),
    lastOrOrganizationName: elementOptional(seg, 3, delimiters),
    firstName: elementOptional(seg, 4, delimiters),
    middleName: elementOptional(seg, 5, delimiters),
    namePrefix: elementOptional(seg, 6, delimiters),
    nameSuffix: elementOptional(seg, 7, delimiters),
    idQualifier: elementOptional(seg, 8, delimiters),
    idCode: elementOptional(seg, 9, delimiters),
  });
}

/** @internal */
function decodeTrace(seg: X12Segment, delimiters: Delimiters): X12AdditionalInformationRequestTrace {
  return Object.freeze({
    traceTypeCode: elementOptional(seg, 1, delimiters),
    referenceId: elementOptional(seg, 2, delimiters),
    originatingCompanyId: elementOptional(seg, 3, delimiters),
    supplementalReferenceId: elementOptional(seg, 4, delimiters),
  });
}

/** @internal */
function decodeReference(
  seg: X12Segment,
  delimiters: Delimiters,
): X12AdditionalInformationRequestReference {
  return Object.freeze({
    qualifier: elementOptional(seg, 1, delimiters),
    value: elementOptional(seg, 2, delimiters),
    description: elementOptional(seg, 3, delimiters),
  });
}

/** @internal */
function decodeDate(seg: X12Segment, delimiters: Delimiters): X12AdditionalInformationRequestDate {
  return Object.freeze({
    qualifier: elementOptional(seg, 1, delimiters),
    formatQualifier: elementOptional(seg, 2, delimiters),
    value: elementOptional(seg, 3, delimiters),
  });
}

/**
 * Decode one STC: its C043 composites at STC-01, STC-10 and STC-11 (each one
 * present when any of its four components is), and its other elements.
 * @internal
 */
function decodeStatus(
  seg: X12Segment,
  delimiters: Delimiters,
  warnings: X12ParseWarning[],
  position: X12Position,
): X12AdditionalInformationRequestStatus {
  const sink: X12DecimalWarningSink = { warnings, position };
  const codes: X12AdditionalInformationRequestStatusCode[] = [];
  for (const n of STC_COMPOSITES) {
    const code = decodeStatusCode(seg, n, delimiters, warnings, { ...position, elementIndex: n });
    if (code !== undefined) codes.push(code);
  }
  return Object.freeze({
    codes: Object.freeze(codes),
    statusEffectiveDate: elementOptional(seg, 2, delimiters),
    actionCode: elementOptional(seg, 3, delimiters),
    totalChargeAmount: elementDecimal(seg, 4, delimiters, sink),
    paymentAmount: elementDecimal(seg, 5, delimiters, sink),
    paymentDate: elementOptional(seg, 6, delimiters),
    paymentMethodCode: elementOptional(seg, 7, delimiters),
    checkIssueDate: elementOptional(seg, 8, delimiters),
    checkNumber: elementOptional(seg, 9, delimiters),
    message: elementOptional(seg, 12, delimiters),
  });
}

/**
 * Decode one C043 composite at element `n`, or `undefined` where none of its
 * four components is present. C043-01 is always a claim status category code
 * and is described from the bundled list. C043-02 is described as a claim
 * status code ONLY where C043-04 is empty, because C043-04 names the code
 * source of C043-02: where it is present the code is not looked up at all, so
 * it is never described or warned as a claim status code. @internal
 */
function decodeStatusCode(
  seg: X12Segment,
  n: number,
  delimiters: Delimiters,
  warnings: X12ParseWarning[],
  position: X12Position,
): X12AdditionalInformationRequestStatusCode | undefined {
  const categoryCode = componentOptional(seg, n, 1, delimiters);
  const statusCode = componentOptional(seg, n, 2, delimiters);
  const entityCode = componentOptional(seg, n, 3, delimiters);
  const codeListQualifier = componentOptional(seg, n, 4, delimiters);
  if (
    categoryCode === undefined &&
    statusCode === undefined &&
    entityCode === undefined &&
    codeListQualifier === undefined
  ) {
    return undefined;
  }
  const category = categoryCode === undefined ? undefined : lookupClaimStatusCategory(categoryCode);
  if (categoryCode !== undefined && category === undefined) {
    warnings.push(unknownClaimStatusCategory(position));
  }
  let statusDescription: string | undefined;
  if (codeListQualifier === undefined && statusCode !== undefined) {
    const status = lookupClaimStatus(statusCode);
    if (status === undefined) warnings.push(unknownClaimStatus(position));
    else statusDescription = status.description;
  }
  return Object.freeze({
    categoryCode,
    categoryDescription: category?.description,
    statusCode,
    statusDescription,
    entityCode,
    codeListQualifier,
  });
}

/** @internal */
function openServiceLine(
  seg: X12Segment,
  delimiters: Delimiters,
  sink: X12DecimalWarningSink,
): ServiceLineAccumulator {
  const modifiers: string[] = [];
  for (const component of [3, 4, 5, 6]) {
    const modifier = componentOptional(seg, 1, component, delimiters);
    if (modifier !== undefined) modifiers.push(modifier);
  }
  return {
    head: {
      serviceIdQualifier: componentOptional(seg, 1, 1, delimiters),
      procedureCode: componentOptional(seg, 1, 2, delimiters),
      modifiers: Object.freeze(modifiers),
      lineChargeAmount: elementDecimal(seg, 2, delimiters, sink),
      linePaymentAmount: elementDecimal(seg, 3, delimiters, sink),
      revenueCode: elementOptional(seg, 4, delimiters),
      quantity: elementDecimal(seg, 5, delimiters, sink),
      unitsOfService: elementDecimal(seg, 7, delimiters, sink),
    },
    statuses: [],
    references: [],
    dates: [],
  };
}

// ---------------------------------------------------------------------------
// Freezing.
// ---------------------------------------------------------------------------

/** @internal */
function freezeLevel(acc: LevelAccumulator): X12AdditionalInformationRequestLevel {
  return Object.freeze({
    id: acc.id,
    parentId: acc.parentId,
    levelCode: acc.levelCode,
    childCode: acc.childCode,
    entities: Object.freeze(acc.entities.slice()),
    requests: Object.freeze(acc.requests.map(freezeRequest)),
  });
}

/** @internal */
function freezeRequest(acc: RequestAccumulator): X12AdditionalInformationRequestClaim {
  return Object.freeze({
    traces: Object.freeze(acc.traces.slice()),
    statuses: Object.freeze(acc.statuses.slice()),
    references: Object.freeze(acc.references.slice()),
    dates: Object.freeze(acc.dates.slice()),
    quantities: Object.freeze(acc.quantities.slice()),
    amounts: Object.freeze(acc.amounts.slice()),
    serviceLines: Object.freeze(acc.serviceLines.map(freezeServiceLine)),
  });
}

/** @internal */
function freezeServiceLine(
  acc: ServiceLineAccumulator,
): X12AdditionalInformationRequestServiceLine {
  return Object.freeze({
    ...acc.head,
    statuses: Object.freeze(acc.statuses.slice()),
    references: Object.freeze(acc.references.slice()),
    dates: Object.freeze(acc.dates.slice()),
  });
}
