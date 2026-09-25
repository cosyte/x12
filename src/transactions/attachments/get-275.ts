/**
 * `get275Attachments` - read a 275 Additional Information to Support a Health
 * Care Claim or Encounter (`006020X314`) into a typed
 * {@link X12AttachmentSubmission}.
 *
 * **Every BDS is one attachment, in document order,** associated with the LX
 * line it was sent under and carrying BDS-01, BDS-02 and BDS-03 as sent. BDS-03
 * is exactly the octets the parser framed: no filter is applied, no release
 * escape is resolved and nothing is split, and it is held in an
 * {@link X12AttachmentData} that refuses to print it. Nothing here decodes an
 * attachment, and no C-CDA or other content inside one is parsed.
 *
 * **The binary framing is the parser's, consumed and not repeated.** Where the
 * parser could not honour a BDS-02 count (the input ends inside the span, the
 * count is absent, empty or malformed, the span is not followed by the segment
 * terminator, or it holds a character above U+00FF), the warning it raised is
 * carried on this reading, anchored at that BDS, and the attachment's
 * `lengthVerified` is `false`. The warnings are recovered by handing the
 * segment's raw text back to the parser's own segment decoder, the one place a
 * length element is read, so this reader cannot frame a BDS differently from
 * the parse that produced it.
 *
 * **It warns and returns, as the other readers do.** A 275 declaring any guide
 * other than `006020X314`, or none, is still read, and carries
 * `X12_GUIDE_NOT_IMPLEMENTED` or `X12_GUIDE_NOT_DECLARED`. A 275 carrying no
 * BDS returns an empty attachment list and `X12_275_ATTACHMENT_ABSENT`.
 * `undefined` is returned only for a transaction set whose ST-01 is not `275`.
 *
 * **What is not typed.** The base X12 006020 275 is typed and no TR3 usage is
 * asserted: the heading's BGN and names, and each line's LX, TRN, STC and REF,
 * are carried verbatim; DTM, IN1, DMG, PRV, PER, NX1 and the line's NM1, HI,
 * SVC, DTP, CAT, PID and OOI stay verbatim on the transaction set.
 */

import { decodeSegment, elementDecimal, elementOptional, componentOptional } from "../../parser/segment.js";
import type { X12DecimalWarningSink, X12Segment } from "../../parser/segment.js";
import { unescapeRelease } from "../../parser/release.js";
import type { Delimiters, X12Position, X12TransactionSet } from "../../parser/types.js";
import { WARNING_CODES, attachmentAbsent, type X12ParseWarning } from "../../parser/warnings.js";
import { declaredGuideWarning, implementedGuides } from "../shared/declared-guide.js";
import { decodeSt03 } from "../shared/st03.js";
import {
  X12AttachmentData,
  type X12Attachment,
  type X12AttachmentBeginning,
  type X12AttachmentEntity,
  type X12AttachmentLine,
  type X12AttachmentReference,
  type X12AttachmentStatus,
  type X12AttachmentStatusCode,
  type X12AttachmentSubmission,
  type X12AttachmentTrace,
} from "./attachment-types.js";

/**
 * The guides this reader implements: the 275 row of `X12_TR3_CONFORMANCE`.
 * A `Set`, because the declaration is document bytes. @internal
 */
const IMPLEMENTED_GUIDES_275 = implementedGuides("275");

/** The ST, transaction-relative: where the no-attachment warning is anchored. @internal */
const ST_POSITION: X12Position = Object.freeze({ segmentIndex: 0, transactionIndex: 0 });

/** The four warnings the parser raises about a binary segment's framing. @internal */
const BINARY_FRAMING_CODES: ReadonlySet<string> = new Set<string>([
  WARNING_CODES.X12_BINARY_DATA_TRUNCATED,
  WARNING_CODES.X12_BINARY_LENGTH_INVALID,
  WARNING_CODES.X12_BINARY_LENGTH_MISMATCH,
  WARNING_CODES.X12_BINARY_LENGTH_UNVERIFIABLE,
]);

/** The three C043 composites of an STC, in the order they are published. @internal */
const STC_COMPOSITES = [1, 10, 11] as const;

/** Discards the dangling-release reports a verbatim element read never needs. @internal */
const ignoreWarning = (_w: X12ParseWarning): void => {
  /* a verbatim element read raises nothing a caller acts on */
};

/**
 * Read a 275. Returns `undefined` only when ST-01 is not `275`; every other
 * deviation is read leniently and surfaces on `warnings`, never as a throw.
 * Pure: no I/O, no global state, and the transaction set is not modified.
 *
 * Pass the interchange to `parseX12` as a `Buffer` where the attachments hold
 * octets above 0x7F: a `Buffer` is read one character per octet, so every
 * count is exact.
 *
 * @example
 * ```ts
 * import { parseX12, get275Attachments } from "@cosyte/x12";
 * const ix = parseX12(buffer);
 * for (const tx of ix.groups[0]?.transactions ?? []) {
 *   const reading = get275Attachments(ix.delimiters, tx);
 *   for (const attachment of reading?.attachments ?? []) {
 *     if (!attachment.lengthVerified) continue; // a framing warning names why
 *     const octets = attachment.data.readOctets(); // verbatim, still filtered
 *   }
 * }
 * ```
 */
export function get275Attachments(
  delimiters: Delimiters,
  tx: X12TransactionSet,
): X12AttachmentSubmission | undefined {
  if (tx.st.elements[1] !== "275") return undefined;
  const leading: X12ParseWarning[] = [];
  const guideWarning = declaredGuideWarning(delimiters, tx, IMPLEMENTED_GUIDES_275);
  if (guideWarning !== undefined) leading.push(guideWarning);

  const warnings: X12ParseWarning[] = [];
  const body = tx.se === undefined ? tx.segments.slice(1) : tx.segments.slice(1, -1);
  let beginning: X12AttachmentBeginning | undefined;
  const entities: X12AttachmentEntity[] = [];
  const lines: LineAccumulator[] = [];
  const attachments: AttachmentAccumulator[] = [];
  let line: LineAccumulator | undefined;

  for (const [i, seg] of body.entries()) {
    const position: X12Position = { segmentIndex: i + 1, transactionIndex: 0 };
    switch (seg.id) {
      case "BGN": {
        beginning ??= decodeBeginning(seg, delimiters);
        break;
      }
      case "NM1": {
        // The heading's name loops precede the first LX; an NM1 inside a line
        // is not typed and stays on the transaction set.
        if (line === undefined) entities.push(decodeEntity(seg, delimiters));
        break;
      }
      case "LX": {
        line = {
          lineNumber: elementOptional(seg, 1, delimiters),
          traces: [],
          statuses: [],
          references: [],
        };
        lines.push(line);
        break;
      }
      case "TRN": {
        line?.traces.push(decodeTrace(seg, delimiters));
        break;
      }
      case "STC": {
        line?.statuses.push(decodeStatus(seg, delimiters, { warnings, position }));
        break;
      }
      case "REF": {
        line?.references.push(decodeReference(seg, delimiters));
        break;
      }
      case "BDS": {
        const framing: X12ParseWarning[] = [];
        decodeSegment(
          seg.raw,
          delimiters,
          (w) => {
            if (BINARY_FRAMING_CODES.has(w.code)) framing.push(w);
          },
          position,
        );
        warnings.push(...framing);
        attachments.push({
          filterCode: verbatim(seg.elements[1], delimiters, position),
          declaredLength: verbatim(seg.elements[2], delimiters, position),
          data: new X12AttachmentData(seg.elements[3] ?? ""),
          lengthVerified: framing.length === 0,
          lineIndex: line === undefined ? undefined : lines.length - 1,
          segmentIndex: position.segmentIndex,
        });
        break;
      }
      default:
        break;
    }
  }

  if (attachments.length === 0) leading.push(attachmentAbsent(ST_POSITION));

  const frozenLines = lines.map(freezeLine);
  return Object.freeze({
    implementationConventionReference: decodeSt03(tx.st.elements[3], delimiters, ST_POSITION),
    beginning,
    entities: Object.freeze(entities.slice()),
    lines: Object.freeze(frozenLines),
    attachments: Object.freeze(
      attachments.map(
        (a): X12Attachment =>
          Object.freeze({
            filterCode: a.filterCode,
            declaredLength: a.declaredLength,
            data: a.data,
            lengthVerified: a.lengthVerified,
            line: a.lineIndex === undefined ? undefined : frozenLines[a.lineIndex],
            segmentIndex: a.segmentIndex,
          }),
      ),
    ),
    warnings: Object.freeze([...leading, ...warnings]),
  });
}

// ---------------------------------------------------------------------------
// Accumulators and decoders.
// ---------------------------------------------------------------------------

/** @internal */
interface LineAccumulator {
  readonly lineNumber: string | undefined;
  readonly traces: X12AttachmentTrace[];
  readonly statuses: X12AttachmentStatus[];
  readonly references: X12AttachmentReference[];
}

/** @internal */
interface AttachmentAccumulator {
  readonly filterCode: string | undefined;
  readonly declaredLength: string | undefined;
  readonly data: X12AttachmentData;
  readonly lengthVerified: boolean;
  readonly lineIndex: number | undefined;
  readonly segmentIndex: number;
}

/**
 * An element exactly as sent: the whole element, with only its release escapes
 * resolved, `undefined` where the segment has no such element and `""` where it
 * is empty. Not split on the repetition or component separator. @internal
 */
function verbatim(
  raw: string | undefined,
  delimiters: Delimiters,
  position: X12Position,
): string | undefined {
  return raw === undefined ? undefined : unescapeRelease(raw, delimiters, ignoreWarning, position);
}

/** @internal */
function freezeLine(acc: LineAccumulator): X12AttachmentLine {
  return Object.freeze({
    lineNumber: acc.lineNumber,
    traces: Object.freeze(acc.traces.slice()),
    statuses: Object.freeze(acc.statuses.slice()),
    references: Object.freeze(acc.references.slice()),
  });
}

/** @internal */
function decodeBeginning(seg: X12Segment, delimiters: Delimiters): X12AttachmentBeginning {
  return Object.freeze({
    transactionSetPurposeCode: elementOptional(seg, 1, delimiters),
    referenceId: elementOptional(seg, 2, delimiters),
    date: elementOptional(seg, 3, delimiters),
    time: elementOptional(seg, 4, delimiters),
    timeCode: elementOptional(seg, 5, delimiters),
    secondReferenceId: elementOptional(seg, 6, delimiters),
    transactionTypeCode: elementOptional(seg, 7, delimiters),
    actionCode: elementOptional(seg, 8, delimiters),
    securityLevelCode: elementOptional(seg, 9, delimiters),
  });
}

/** @internal */
function decodeEntity(seg: X12Segment, delimiters: Delimiters): X12AttachmentEntity {
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
function decodeTrace(seg: X12Segment, delimiters: Delimiters): X12AttachmentTrace {
  return Object.freeze({
    traceTypeCode: elementOptional(seg, 1, delimiters),
    referenceId: elementOptional(seg, 2, delimiters),
    originatingCompanyId: elementOptional(seg, 3, delimiters),
    supplementalReferenceId: elementOptional(seg, 4, delimiters),
  });
}

/** @internal */
function decodeReference(seg: X12Segment, delimiters: Delimiters): X12AttachmentReference {
  return Object.freeze({
    qualifier: elementOptional(seg, 1, delimiters),
    value: elementOptional(seg, 2, delimiters),
    description: elementOptional(seg, 3, delimiters),
  });
}

/**
 * Decode one STC, its composites verbatim and nothing looked up: on a 275 the
 * STC echoes an item a request named, whatever code source C043-04 names.
 * @internal
 */
function decodeStatus(
  seg: X12Segment,
  delimiters: Delimiters,
  sink: X12DecimalWarningSink,
): X12AttachmentStatus {
  const codes: X12AttachmentStatusCode[] = [];
  for (const n of STC_COMPOSITES) {
    const code: X12AttachmentStatusCode = {
      categoryCode: componentOptional(seg, n, 1, delimiters),
      statusCode: componentOptional(seg, n, 2, delimiters),
      entityCode: componentOptional(seg, n, 3, delimiters),
      codeListQualifier: componentOptional(seg, n, 4, delimiters),
    };
    if (Object.values(code).some((v) => v !== undefined)) codes.push(Object.freeze(code));
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
