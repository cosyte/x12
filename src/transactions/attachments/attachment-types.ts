/**
 * Typed model for the 275 Additional Information to Support a Health Care
 * Claim or Encounter, implementation guide `006020X314`: a provider sending the
 * documentation a health plan asked for, each document carried as the binary
 * data of a BDS segment.
 *
 * **The attachment data is a clinical document and refuses to print.** It is
 * held in an {@link X12AttachmentData}, whose string form, JSON form and
 * `util.inspect` form say how many octets it holds and nothing else, so a log
 * line, an error report or a serialized reading carries no octet of it. The
 * octets are one explicit call away, verbatim, through
 * {@link X12AttachmentData.readOctets}. Nothing here decodes them: BDS-01's
 * filter (`B64`, for one) is not applied and nothing inside the data is parsed.
 *
 * **What is typed is the base X12 006020 275, and no TR3 usage is asserted.**
 * The heading's BGN and NM1 names and each LX line's TRN, STC and REF are
 * carried verbatim; every other segment stays verbatim on the transaction set.
 */

import type { X12Decimal } from "../../decimal.js";
import type { X12ParseWarning } from "../../parser/warnings.js";

/** The text every printing route of an {@link X12AttachmentData} shares. @internal */
function withheld(octets: number): string {
  return `[X12AttachmentData: ${String(octets)} octets withheld]`;
}

/**
 * Binary data from a BDS-03, held so that it cannot be printed by accident.
 *
 * `String(data)`, a template literal, `JSON.stringify` and Node's `util.inspect`
 * (and so `console.log`) all render `[X12AttachmentData: <n> octets withheld]`.
 * The octets themselves are held in a private field that no enumeration,
 * spread or structured clone reaches, and are returned only by
 * {@link readOctets}, exactly as the parser framed them: one character per
 * octet, no filter applied, no release unescape, no split.
 *
 * @example
 * ```ts
 * import { parseX12, get275Attachments } from "@cosyte/x12";
 * const ix = parseX12(buffer);
 * const tx = ix.groups[0]?.transactions[0];
 * const reading = tx === undefined ? undefined : get275Attachments(ix.delimiters, tx);
 * const data = reading?.attachments[0]?.data;
 * String(data);        // "[X12AttachmentData: 1336 octets withheld]"
 * data?.octetCount;    // 1336
 * data?.readOctets();  // the 1336 octets, one character each, verbatim
 * ```
 */
export class X12AttachmentData {
  readonly #octets: string;

  /**
   * Wrap `octets`, one character per octet. Readers construct these; a caller
   * building a 275 passes plain data to the builder instead.
   *
   * @internal
   */
  public constructor(octets: string) {
    this.#octets = octets;
  }

  /** How many characters, one per octet, the data holds. */
  public get octetCount(): number {
    return this.#octets.length;
  }

  /**
   * The data, verbatim: exactly the characters the parser framed as BDS-03,
   * one per octet. This is the only route to them.
   *
   * @example
   * ```ts
   * import type { X12AttachmentData } from "@cosyte/x12";
   * declare const data: X12AttachmentData;
   * const octets = data.readOctets();
   * Buffer.from(octets, "latin1"); // the bytes, where every character is at or below U+00FF
   * ```
   */
  public readOctets(): string {
    return this.#octets;
  }

  /** The withheld form, never the data. */
  public toString(): string {
    return withheld(this.#octets.length);
  }

  /** The withheld form, so `JSON.stringify` carries no octet. */
  public toJSON(): string {
    return withheld(this.#octets.length);
  }

  /** The withheld form for every coercion hint. */
  public [Symbol.toPrimitive](): string {
    return withheld(this.#octets.length);
  }

  /** The withheld form for Node's `util.inspect`, and so for `console.log`. */
  public [Symbol.for("nodejs.util.inspect.custom")](): string {
    return withheld(this.#octets.length);
  }
}

/**
 * A 275 read by `get275Attachments`: the heading's BGN and names, every LX
 * line, and every BDS as one attachment, in document order.
 *
 * @example
 * ```ts
 * import { parseX12, get275Attachments } from "@cosyte/x12";
 * const ix = parseX12(buffer);
 * const tx = ix.groups[0]?.transactions[0];
 * const reading = tx === undefined ? undefined : get275Attachments(ix.delimiters, tx);
 * for (const attachment of reading?.attachments ?? []) {
 *   attachment.filterCode;     // BDS-01, e.g. "B64"
 *   attachment.declaredLength; // BDS-02, as sent
 *   attachment.lengthVerified; // false where a framing warning was raised
 *   attachment.line?.lineNumber; // LX-01 of the line it was sent under
 * }
 * ```
 */
export interface X12AttachmentSubmission {
  /** ST-03, decoded of any release escape. */
  readonly implementationConventionReference: string | undefined;
  /** The heading's BGN, or `undefined` where the transaction set carries none. */
  readonly beginning: X12AttachmentBeginning | undefined;
  /** Every NM1 in the heading, before the first LX, in document order. */
  readonly entities: readonly X12AttachmentEntity[];
  /** Every LX line, in document order. */
  readonly lines: readonly X12AttachmentLine[];
  /** Every BDS, in document order. Empty where the transaction set carries none. */
  readonly attachments: readonly X12Attachment[];
  /** Every warning raised while reading, including each BDS's framing warnings. */
  readonly warnings: readonly X12ParseWarning[];
}

/**
 * The heading's BGN Beginning Segment, verbatim.
 *
 * @example
 * ```ts
 * import type { X12AttachmentBeginning } from "@cosyte/x12";
 * declare const b: X12AttachmentBeginning;
 * b.referenceId; // BGN-02
 * ```
 */
export interface X12AttachmentBeginning {
  /** BGN-01, transaction set purpose code. */
  readonly transactionSetPurposeCode: string | undefined;
  /** BGN-02, reference identification. */
  readonly referenceId: string | undefined;
  /** BGN-03, date, as sent. */
  readonly date: string | undefined;
  /** BGN-04, time, as sent. */
  readonly time: string | undefined;
  /** BGN-05, time code. */
  readonly timeCode: string | undefined;
  /** BGN-06, a second reference identification. */
  readonly secondReferenceId: string | undefined;
  /** BGN-07, transaction type code. */
  readonly transactionTypeCode: string | undefined;
  /** BGN-08, action code. */
  readonly actionCode: string | undefined;
  /** BGN-09, security level code. */
  readonly securityLevelCode: string | undefined;
}

/**
 * One NM1 of the heading, verbatim.
 *
 * @example
 * ```ts
 * import type { X12AttachmentEntity } from "@cosyte/x12";
 * declare const e: X12AttachmentEntity;
 * e.entityIdentifierCode; // NM1-01
 * ```
 */
export interface X12AttachmentEntity {
  /** NM1-01, entity identifier code. */
  readonly entityIdentifierCode: string | undefined;
  /** NM1-02, entity type qualifier. */
  readonly entityTypeQualifier: string | undefined;
  /** NM1-03, last name or organization name. */
  readonly lastOrOrganizationName: string | undefined;
  /** NM1-04, first name. */
  readonly firstName: string | undefined;
  /** NM1-05, middle name. */
  readonly middleName: string | undefined;
  /** NM1-06, name prefix. */
  readonly namePrefix: string | undefined;
  /** NM1-07, name suffix. */
  readonly nameSuffix: string | undefined;
  /** NM1-08, identification code qualifier. */
  readonly idQualifier: string | undefined;
  /** NM1-09, identification code. */
  readonly idCode: string | undefined;
}

/**
 * One LX line: its number and the TRN, STC and REF segments sent under it,
 * verbatim. The attachments sent under it point back at it through
 * {@link X12Attachment.line}.
 *
 * @example
 * ```ts
 * import type { X12AttachmentLine } from "@cosyte/x12";
 * declare const line: X12AttachmentLine;
 * line.lineNumber;                 // LX-01
 * line.statuses[0]?.codes[0]?.statusCode; // the requested item's code, echoed
 * ```
 */
export interface X12AttachmentLine {
  /** LX-01, assigned number. */
  readonly lineNumber: string | undefined;
  /** Every TRN sent under this line. */
  readonly traces: readonly X12AttachmentTrace[];
  /** Every STC sent under this line. */
  readonly statuses: readonly X12AttachmentStatus[];
  /** Every REF sent under this line. */
  readonly references: readonly X12AttachmentReference[];
}

/**
 * One TRN, verbatim.
 *
 * @example
 * ```ts
 * import type { X12AttachmentTrace } from "@cosyte/x12";
 * declare const t: X12AttachmentTrace;
 * t.referenceId; // TRN-02
 * ```
 */
export interface X12AttachmentTrace {
  /** TRN-01, trace type code. */
  readonly traceTypeCode: string | undefined;
  /** TRN-02, reference identification. */
  readonly referenceId: string | undefined;
  /** TRN-03, originating company identifier. */
  readonly originatingCompanyId: string | undefined;
  /** TRN-04, supplemental reference identification. */
  readonly supplementalReferenceId: string | undefined;
}

/**
 * One STC, its C043 composites verbatim. Nothing is looked up or described: on
 * a 275 the STC echoes the item a request named, and C043-02 is whatever code
 * source C043-04 names.
 *
 * @example
 * ```ts
 * import type { X12AttachmentStatus } from "@cosyte/x12";
 * declare const s: X12AttachmentStatus;
 * s.codes[0]?.codeListQualifier; // C043-04 of STC-01
 * ```
 */
export interface X12AttachmentStatus {
  /** The C043 composites present, STC-01 first, then STC-10 and STC-11. */
  readonly codes: readonly X12AttachmentStatusCode[];
  /** STC-02, status effective date, as sent. */
  readonly statusEffectiveDate: string | undefined;
  /** STC-03, action code. */
  readonly actionCode: string | undefined;
  /** STC-04, total charge amount. */
  readonly totalChargeAmount: X12Decimal | undefined;
  /** STC-05, amount paid. */
  readonly paymentAmount: X12Decimal | undefined;
  /** STC-06, paid date, as sent. */
  readonly paymentDate: string | undefined;
  /** STC-07, payment method code. */
  readonly paymentMethodCode: string | undefined;
  /** STC-08, check issue date, as sent. */
  readonly checkIssueDate: string | undefined;
  /** STC-09, check number. */
  readonly checkNumber: string | undefined;
  /** STC-12, free-form message text. */
  readonly message: string | undefined;
}

/**
 * One C043 composite of a 275 STC, all four components verbatim.
 *
 * @example
 * ```ts
 * import type { X12AttachmentStatusCode } from "@cosyte/x12";
 * declare const c: X12AttachmentStatusCode;
 * c.statusCode; // C043-02
 * ```
 */
export interface X12AttachmentStatusCode {
  /** C043-01. */
  readonly categoryCode: string | undefined;
  /** C043-02. */
  readonly statusCode: string | undefined;
  /** C043-03. */
  readonly entityCode: string | undefined;
  /** C043-04, naming the code source of C043-02. */
  readonly codeListQualifier: string | undefined;
}

/**
 * One REF, verbatim.
 *
 * @example
 * ```ts
 * import type { X12AttachmentReference } from "@cosyte/x12";
 * declare const r: X12AttachmentReference;
 * r.value; // REF-02
 * ```
 */
export interface X12AttachmentReference {
  /** REF-01, reference identification qualifier. */
  readonly qualifier: string | undefined;
  /** REF-02, reference identification. */
  readonly value: string | undefined;
  /** REF-03, description. */
  readonly description: string | undefined;
}

/**
 * One BDS Binary Data Structure, read as one attachment.
 *
 * `lengthVerified` is `true` only where the parser framed BDS-03 by a valid
 * BDS-02 count, the count was met exactly, the segment ended where the count
 * said, and every character is one octet. Where any of those failed, the
 * matching binary framing warning is on the reading's `warnings`, anchored at
 * this BDS, and `lengthVerified` is `false`, so a caller can tell a
 * length-verified attachment from the others without reading the warnings.
 * BDS-02 is then still exactly what was sent, and the data is only the octets
 * that were present.
 *
 * @example
 * ```ts
 * import type { X12Attachment } from "@cosyte/x12";
 * declare const a: X12Attachment;
 * if (a.lengthVerified) a.data.readOctets(); // exactly BDS-02 octets
 * ```
 */
export interface X12Attachment {
  /** BDS-01, the filter id code, as sent. Not applied. */
  readonly filterCode: string | undefined;
  /** BDS-02, the declared length, exactly as sent. */
  readonly declaredLength: string | undefined;
  /** BDS-03, withheld from printing; `readOctets()` returns it verbatim. */
  readonly data: X12AttachmentData;
  /** Whether the data's length was verified against BDS-02 with no framing warning. */
  readonly lengthVerified: boolean;
  /** The LX line this BDS was sent under, or `undefined` before the first LX. */
  readonly line: X12AttachmentLine | undefined;
  /** Where the BDS sits, transaction-relative, the ST being segment 0. */
  readonly segmentIndex: number;
}
