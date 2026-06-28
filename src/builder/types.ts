/**
 * Spec types for the general-purpose interchange builder
 * ({@link "./build-interchange.js".buildInterchange}). The builder is
 * segment-level: a caller supplies the ISA envelope identity, the functional
 * groups, and — inside each transaction set — the body segments as raw
 * element arrays. The builder owns the envelope mechanics (ISA fixed-width
 * layout, GS/GE/SE/IEA control segments, and the SE-01 / GE-01 / IEA-01
 * counts), so the caller never hand-counts a segment total or a group total.
 *
 * The domain-specific builders (`build835`, `build837P`, …) sit ON TOP of
 * this primitive in a later phase: each maps its typed domain model down to
 * {@link TransactionSetSpec} segment arrays and delegates the envelope to
 * `buildInterchange`. This file is the shared floor they all stand on.
 */

/**
 * A single body segment as a raw element array: `[segmentId, ...elements]`,
 * 1-indexed against the X12 spec convention once placed (i.e. `spec[1]` is
 * element 1). Element values are LOGICAL — the builder applies the
 * `?`-release-character escape on emit so any active delimiter inside a value
 * survives. The segment id (`spec[0]`) is emitted verbatim. ST and SE are NOT
 * included here — the builder synthesizes them from {@link TransactionSetSpec}.
 *
 * @example
 * ```ts
 * const nm1: SegmentSpec = ["NM1", "IL", "1", "DOE", "JANE"];
 * ```
 */
export type SegmentSpec = readonly string[];

/**
 * A single ST..SE transaction set. The builder emits `ST{idCode}{control}`,
 * then each body {@link SegmentSpec}, then `SE{count}{control}` with the
 * segment count (ST..SE inclusive) computed for you.
 *
 * @example
 * ```ts
 * const tx: TransactionSetSpec = {
 *   transactionSetIdCode: "837",
 *   transactionSetControlNumber: "0001",
 *   implementationConventionReference: "005010X222A2",
 *   segments: [["BHT", "0019", "00", "REF", "20250101", "1200", "CH"]],
 * };
 * ```
 */
export interface TransactionSetSpec {
  /** ST-01 — transaction set ID code (e.g. `"837"`, `"835"`, `"271"`). */
  readonly transactionSetIdCode: string;
  /** ST-02 / SE-02 — transaction set control number (echoed on SE-02). */
  readonly transactionSetControlNumber: string;
  /** ST-03 — implementation convention reference (optional, e.g. `"005010X222A2"`). */
  readonly implementationConventionReference?: string;
  /** Body segments between ST and SE (excludes ST and SE themselves). */
  readonly segments: readonly SegmentSpec[];
}

/**
 * A single GS..GE functional group. The builder emits the GS header, each
 * transaction set, then `GE{count}{control}` with GE-01 (the transaction
 * count) computed for you.
 *
 * @example
 * ```ts
 * const group: FunctionalGroupSpec = {
 *   functionalIdCode: "HC",
 *   groupControlNumber: "1",
 *   versionRelease: "005010X222A2",
 *   transactions: [tx],
 * };
 * ```
 */
export interface FunctionalGroupSpec {
  /** GS-01 — functional identifier code (`HC` claims, `HP` remittance, …). */
  readonly functionalIdCode: string;
  /** GS-06 / GE-02 — group control number (echoed on GE-02). */
  readonly groupControlNumber: string;
  /** GS-08 — version / release / industry identifier code (e.g. `"005010X222A2"`). */
  readonly versionRelease: string;
  /** The ordered ST..SE transaction sets inside this group. */
  readonly transactions: readonly TransactionSetSpec[];
  /** GS-02 — application sender code. Defaults to the interchange sender id. */
  readonly applicationSenderCode?: string;
  /** GS-03 — application receiver code. Defaults to the interchange receiver id. */
  readonly applicationReceiverCode?: string;
  /** GS-04 — group date CCYYMMDD. Defaults to the century-expanded ISA-09. */
  readonly groupDate?: string;
  /** GS-05 — group time HHMM. Defaults to the interchange time (ISA-10). */
  readonly groupTime?: string;
  /** GS-07 — responsible agency code. Defaults to `"X"` (ASC X12). */
  readonly responsibleAgencyCode?: string;
}

/**
 * The top-level spec for {@link "./build-interchange.js".buildInterchange}.
 * The required fields name the interchange identity; everything else has a
 * conformant default (`*^:~` delimiters, `ZZ` qualifiers, `P` usage
 * indicator, `00501` version).
 *
 * @example
 * ```ts
 * const spec: InterchangeSpec = {
 *   senderId: "SENDER",
 *   receiverId: "RECEIVER",
 *   interchangeDate: "250101",
 *   interchangeTime: "1200",
 *   interchangeControlNumber: "000000001",
 *   groups: [group],
 * };
 * ```
 */
export interface InterchangeSpec {
  /** ISA-06 — interchange sender id (padded to 15 on emit). */
  readonly senderId: string;
  /** ISA-08 — interchange receiver id (padded to 15 on emit). */
  readonly receiverId: string;
  /** ISA-09 — interchange date YYMMDD. */
  readonly interchangeDate: string;
  /** ISA-10 — interchange time HHMM. */
  readonly interchangeTime: string;
  /** ISA-13 / IEA-02 — interchange control number (zero-padded to 9 on emit). */
  readonly interchangeControlNumber: string;
  /** The ordered GS..GE functional groups inside this interchange. */
  readonly groups: readonly FunctionalGroupSpec[];
  /** ISA-05 — interchange sender qualifier. Default `"ZZ"`. */
  readonly senderQualifier?: string;
  /** ISA-07 — interchange receiver qualifier. Default `"ZZ"`. */
  readonly receiverQualifier?: string;
  /** ISA-15 — usage indicator (`P` production, `T` test). Default `"P"`. */
  readonly usageIndicator?: string;
  /** ISA-12 — interchange control version number. Default `"00501"`. */
  readonly version?: string;
  /** Element separator (ISA byte 4). Default `"*"`. */
  readonly elementSeparator?: string;
  /** Repetition separator (ISA-11). Default `"^"`. */
  readonly repetitionSeparator?: string;
  /** Component (sub-element) separator (ISA-16). Default `":"`. */
  readonly componentSeparator?: string;
  /** Segment terminator (ISA byte 106). Default `"~"`. */
  readonly segmentTerminator?: string;
}
