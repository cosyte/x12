/**
 * Typed-model surface for the X12 acknowledgment transactions surfaced
 * by Phase 3 — `005010X231A1` 999 (Implementation Acknowledgment) and the
 * envelope-level TA1 (Interchange Acknowledgment).
 *
 * Two kinds of types live here:
 *
 * 1. **Parsed-model types** (`X12Ack999`, `X12AckTA1`, and their nested
 *    pieces) — the immutable result returned by `parse999` / `parseTA1`.
 * 2. **Build-spec types** (`Build999Spec`, `BuildTA1Spec`, …) — the input
 *    accepted by `build999` / `buildTA1`. Builds are PURE FUNCTIONS — they
 *    never auto-send, never open sockets, never touch the filesystem.
 *
 * Per ASC X12 standard 999 + TR3 005010X231A1, the 999 hierarchy is:
 * ```
 *   ST → AK1 → AK2 → (IK3 [→ CTX] (IK4 [→ CTX])*)* → IK5 → AK9 → SE
 * ```
 * Per the ASC X12 standard, TA1 is a 5-element envelope-level segment, not
 * a transaction set.
 */

import type { X12Interchange, Ta1Segment } from "../../parser/types.js";
import type { X12ParseWarning } from "../../parser/warnings.js";

import type {
  Ik304Code,
  Ik403Code,
  Ta1AckCode,
  Ta1NoteCode,
  X12AckDispositionCode,
} from "./codes.js";

// ---------------------------------------------------------------------------
// Parsed 999 model.
// ---------------------------------------------------------------------------

/**
 * The decoded AK1 functional group response header (loop 1).
 *
 * - `functionalIdCode` — AK1-01: echoes the inbound GS-01 (e.g. `HC` for a
 *   claim group).
 * - `groupControlNumber` — AK1-02: echoes the inbound GS-06.
 * - `versionRelease` — AK1-03: echoes the inbound GS-08 (e.g.
 *   `005010X222A2`). Situational at the standard level, ALWAYS present in
 *   X231A1; surfaced as `string | undefined` to remain lenient on parse.
 *
 * @example
 * ```ts
 * import type { X12Ack999Ak1 } from "@cosyte/x12";
 * declare const ak1: X12Ack999Ak1;
 * ak1.functionalIdCode; // "HC"
 * ak1.versionRelease;   // "005010X222A2" | undefined
 * ```
 */
export interface X12Ack999Ak1 {
  readonly functionalIdCode: string;
  readonly groupControlNumber: string;
  readonly versionRelease: string | undefined;
}

/**
 * The decoded AK2 transaction set response header (loop 2000).
 *
 * - `transactionSetIdCode` — AK2-01: echoes the inbound ST-01 (e.g. `837`,
 *   `270`).
 * - `transactionSetControlNumber` — AK2-02: echoes the inbound ST-02.
 * - `implementationConventionReference` — AK2-03: echoes the inbound ST-03
 *   (the TR3 ID, e.g. `005010X222A2`); situational.
 *
 * @example
 * ```ts
 * import type { X12Ack999Ak2 } from "@cosyte/x12";
 * declare const ak2: X12Ack999Ak2;
 * ak2.transactionSetIdCode; // "837"
 * ```
 */
export interface X12Ack999Ak2 {
  readonly transactionSetIdCode: string;
  readonly transactionSetControlNumber: string;
  readonly implementationConventionReference: string | undefined;
}

/**
 * The decoded IK3 implementation data segment note (loop 2100).
 *
 * - `segmentIdCode` — IK3-01: the X12 segment identifier (e.g. `NM1`,
 *   `CLP`, `HL`).
 * - `segmentPositionInTransactionSet` — IK3-02: 1-indexed position of the
 *   offending segment inside the inbound ST..SE.
 * - `loopIdentifier` — IK3-03: situational; the loop identifier
 *   (e.g. `2010BA`) where the offending segment lives.
 * - `syntaxErrorCode` — IK3-04: situational; one of
 *   {@link Ik304Code}. `undefined` when the parent IK3 is purely a
 *   context wrapper for nested IK4s (the per-element error path).
 *
 * @example
 * ```ts
 * import type { X12Ack999SegmentNote } from "@cosyte/x12";
 * declare const note: X12Ack999SegmentNote;
 * note.ik3.segmentIdCode;                  // "NM1"
 * note.ik3.segmentPositionInTransactionSet; // 8
 * ```
 */
export interface X12Ack999Ik3 {
  readonly segmentIdCode: string;
  readonly segmentPositionInTransactionSet: number;
  readonly loopIdentifier: string | undefined;
  readonly syntaxErrorCode: Ik304Code | undefined;
}

/**
 * Position of an element/component/repetition inside a parent segment for
 * an IK4 element note. Element is 1-indexed (the TR3 convention);
 * component and repetition are surfaced exactly as encoded in IK4-01's
 * composite — see TR3 `005010X231A1` §IK4.
 *
 * @example
 * ```ts
 * import type { X12Ack999Ik4Position } from "@cosyte/x12";
 * const pos: X12Ack999Ik4Position = { element: 1, component: 2 };
 * ```
 */
export interface X12Ack999Ik4Position {
  readonly element: number;
  readonly component: number | undefined;
  readonly repetition: number | undefined;
}

/**
 * The decoded IK4 implementation data element note (loop 2110).
 *
 * - `position` — IK4-01: composite carrying element / component /
 *   repetition (1-indexed).
 * - `dataElementReferenceNumber` — IK4-02: situational; the ASC X12
 *   element reference number (e.g. `66` for NM1-08).
 * - `syntaxErrorCode` — IK4-03: required; one of {@link Ik403Code}.
 * - `copyOfBadDataElement` — IK4-04: situational; the verbatim offending
 *   element value. By spec it may be omitted entirely; callers building a
 *   999 SHOULD omit it whenever the offending bytes are PHI (medical IDs,
 *   names, dates). The library never auto-populates this field.
 *
 * @example
 * ```ts
 * import type { X12Ack999ElementNote } from "@cosyte/x12";
 * declare const note: X12Ack999ElementNote;
 * note.ik4.syntaxErrorCode; // "7" (invalid code value)
 * ```
 */
export interface X12Ack999Ik4 {
  readonly position: X12Ack999Ik4Position;
  readonly dataElementReferenceNumber: string | undefined;
  readonly syntaxErrorCode: Ik403Code;
  readonly copyOfBadDataElement: string | undefined;
}

/**
 * One IK4 element-level error wrapped with its (optional) IK3-paired CTX
 * context strings — surfaced verbatim because CTX uses a composite syntax
 * the X231A1 implementer typically writes as `ELEMENT*NM1*8*1`. The
 * library does not try to over-decompose the CTX value at this phase.
 */
export interface X12Ack999ElementNote {
  readonly ik4: X12Ack999Ik4;
  readonly contexts: readonly string[];
}

/**
 * One IK3 segment-level error wrapped with its (optional) CTX context
 * strings and any nested IK4 element-level errors. Lifting the IK3 / IK4
 * groups into nested arrays mirrors the X231A1 loop hierarchy exactly so
 * the typed model maps 1:1 onto the wire shape.
 */
export interface X12Ack999SegmentNote {
  readonly ik3: X12Ack999Ik3;
  readonly contexts: readonly string[];
  readonly elementNotes: readonly X12Ack999ElementNote[];
}

/**
 * The decoded IK5 implementation transaction set response trailer.
 *
 * - `disposition` — IK5-01: one of {@link X12AckDispositionCode}.
 * - `syntaxErrorCodes` — IK5-02..IK5-06: situational; up to five
 *   transaction-set syntax error codes (code list 718).
 */
export interface X12Ack999Ik5 {
  readonly disposition: X12AckDispositionCode;
  readonly syntaxErrorCodes: readonly string[];
}

/** One AK2..IK5 transaction-set response inside a 999. */
export interface X12Ack999TransactionResponse {
  readonly ak2: X12Ack999Ak2;
  readonly segmentNotes: readonly X12Ack999SegmentNote[];
  readonly ik5: X12Ack999Ik5;
}

/**
 * The decoded AK9 functional group response trailer.
 *
 * - `disposition` — AK9-01: functional-group-level disposition.
 * - `numberOfTransactionSets` — AK9-02: echoes the inbound GE-01.
 * - `numberOfReceivedTransactionSets` — AK9-03: how many ST..SE pairs
 *   actually arrived.
 * - `numberOfAcceptedTransactionSets` — AK9-04: how many were accepted.
 *   By construction `0 <= accepted <= received <= numberOfTransactionSets`.
 * - `syntaxErrorCodes` — AK9-05..AK9-09: situational; up to five
 *   functional-group syntax error codes (code list 716).
 */
export interface X12Ack999Ak9 {
  readonly disposition: X12AckDispositionCode;
  readonly numberOfTransactionSets: number;
  readonly numberOfReceivedTransactionSets: number;
  readonly numberOfAcceptedTransactionSets: number;
  readonly syntaxErrorCodes: readonly string[];
}

/**
 * The decoded 999 Implementation Acknowledgment. Returned by
 * `parse999(raw)`. Carries every loop the wire produced and the underlying
 * parsed envelope (so byte-exact round-trip is reachable through
 * `interchange.isa.raw`).
 *
 * `warnings` collects both envelope-level warnings (from `parseX12`) AND
 * any 999-specific warnings (e.g. an unknown disposition code, an AK9
 * count mismatch). The set is additive — never throws on a real-world
 * 999.
 */
export interface X12Ack999 {
  readonly interchange: X12Interchange;
  readonly ak1: X12Ack999Ak1;
  readonly transactionResponses: readonly X12Ack999TransactionResponse[];
  readonly ak9: X12Ack999Ak9;
  readonly warnings: readonly X12ParseWarning[];
}

// ---------------------------------------------------------------------------
// Parsed TA1 model.
// ---------------------------------------------------------------------------

/**
 * The decoded TA1 Interchange Acknowledgment.
 *
 * - `interchangeControlNumber` — TA1-01: echoes the inbound ISA-13.
 * - `interchangeDate` — TA1-02: YYMMDD (echoes inbound ISA-09).
 * - `interchangeTime` — TA1-03: HHMM (echoes inbound ISA-10).
 * - `ackCode` — TA1-04: {@link Ta1AckCode}.
 * - `noteCode` — TA1-05: typed when the value is a known I18 code
 *   ({@link Ta1NoteCode}); the raw string is preserved verbatim alongside
 *   so unknown extensions round-trip.
 * - `noteCodeRaw` — verbatim TA1-05 string. Equal to `noteCode` when the
 *   value is a known I18 code; equal to the raw inbound text when not.
 * - `raw` — the underlying envelope-level {@link Ta1Segment}, for
 *   byte-exact round-trip.
 *
 * @example
 * ```ts
 * import type { X12AckTA1 } from "@cosyte/x12";
 * declare const ta1: X12AckTA1;
 * ta1.ackCode;      // "A" | "E" | "R"
 * ta1.noteCode;     // "000" | "001" | ...
 * ```
 */
export interface X12AckTA1 {
  readonly interchangeControlNumber: string;
  readonly interchangeDate: string;
  readonly interchangeTime: string;
  readonly ackCode: Ta1AckCode;
  readonly noteCode: Ta1NoteCode | undefined;
  readonly noteCodeRaw: string;
  readonly raw: Ta1Segment;
}

// ---------------------------------------------------------------------------
// Build specs.
// ---------------------------------------------------------------------------

/**
 * Element-level error spec — the input shape for an IK4 the library will
 * build. `copyOfBadDataElement` is OPTIONAL by design: when the offending
 * value is PHI (medical record number, name, date of birth), callers
 * SHOULD omit it. The library never auto-populates this field.
 */
export interface Build999ElementErrorSpec {
  readonly position: {
    readonly element: number;
    readonly component?: number;
    readonly repetition?: number;
  };
  readonly dataElementReferenceNumber?: string;
  readonly syntaxErrorCode: Ik403Code;
  readonly copyOfBadDataElement?: string;
  /**
   * Optional CTX context strings emitted between this IK4 and the next.
   * Each entry becomes a single CTX segment with the given value as its
   * first composite element. Pass `[]` (default) for no context.
   */
  readonly contexts?: readonly string[];
}

/** Segment-level error spec — input for an IK3 (with optional nested IK4s). */
export interface Build999SegmentErrorSpec {
  readonly segmentIdCode: string;
  readonly segmentPositionInTransactionSet: number;
  readonly loopIdentifier?: string;
  readonly syntaxErrorCode?: Ik304Code;
  /**
   * Optional CTX context strings emitted between this IK3 and the first
   * nested IK4 (or the next IK3 / IK5 if no IK4s). Each entry becomes a
   * single CTX segment with the given value as its first composite
   * element.
   */
  readonly contexts?: readonly string[];
  readonly elementErrors?: readonly Build999ElementErrorSpec[];
}

/** Transaction-set response spec — input for one AK2..IK5 block. */
export interface Build999TransactionResponseSpec {
  readonly transactionSetIdCode: string;
  readonly transactionSetControlNumber: string;
  readonly implementationConventionReference?: string;
  readonly disposition: X12AckDispositionCode;
  readonly syntaxErrorCodes?: readonly string[];
  readonly segmentErrors?: readonly Build999SegmentErrorSpec[];
}

/** Functional-group response spec — input for the AK1 + AK9 pair. */
export interface Build999FunctionalGroupSpec {
  readonly functionalIdCode: string;
  readonly groupControlNumber: string;
  readonly versionRelease: string;
  readonly disposition: X12AckDispositionCode;
  readonly numberOfTransactionSets: number;
  readonly numberOfReceivedTransactionSets: number;
  readonly numberOfAcceptedTransactionSets: number;
  readonly syntaxErrorCodes?: readonly string[];
  readonly transactionResponses: readonly Build999TransactionResponseSpec[];
}

/**
 * Envelope spec for `build999` — the ISA + GS + ST + matching trailers
 * that wrap the 999 transaction set. Defaults are spec-conformant for a
 * minimal 999 envelope:
 *
 * - `senderQualifier` / `receiverQualifier` default to `ZZ` (mutually
 *   defined).
 * - `usageIndicator` defaults to `P` (production).
 * - `repetitionSeparator` defaults to `^`; `componentSeparator` defaults
 *   to `:`; `segmentTerminator` defaults to `~`. Override for trading-
 *   partner companion-guide requirements (e.g. Medicare uses `:` component,
 *   BCBS some shapes use `\\`).
 * - `interchangeControlNumber` is the 9-character ISA-13 value (zero-
 *   padded if needed). `groupControlNumber` is the GS-06 numeric string
 *   (1–9 digits). `transactionSetControlNumber` is the ST-02 string (4–9
 *   digits per X12 .5).
 */
export interface Build999EnvelopeSpec {
  readonly senderId: string;
  readonly senderQualifier?: string;
  readonly receiverId: string;
  readonly receiverQualifier?: string;
  readonly interchangeDate: string;
  readonly interchangeTime: string;
  readonly interchangeControlNumber: string;
  readonly usageIndicator?: "P" | "T";
  readonly groupControlNumber: string;
  readonly groupDate?: string;
  readonly groupTime?: string;
  readonly groupResponsibleAgency?: string;
  readonly transactionSetControlNumber: string;
  readonly repetitionSeparator?: string;
  readonly componentSeparator?: string;
  readonly segmentTerminator?: string;
  readonly elementSeparator?: string;
}

/** Top-level spec for `build999`. */
export interface Build999Spec {
  readonly envelope: Build999EnvelopeSpec;
  readonly functionalGroup: Build999FunctionalGroupSpec;
}

/** Top-level spec for `buildTA1`. */
export interface BuildTA1Spec {
  readonly interchangeControlNumber: string;
  readonly interchangeDate: string;
  readonly interchangeTime: string;
  readonly ackCode: Ta1AckCode;
  readonly noteCode: Ta1NoteCode;
}
