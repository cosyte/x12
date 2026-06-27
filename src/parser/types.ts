/**
 * Shared type definitions consumed across the `@cosyte/x12` parser pipeline.
 * Every type here is deliberately readonly — the parser produces immutable
 * data structures and consumers must not mutate them. Narrowing is done via
 * the `X12ParseWarning.code` and `X12ParseError.code` discriminants defined
 * in sibling files.
 */

// Forward reference to the warning shape owned by `./warnings.ts`. Declared
// with `import type` so it contributes zero runtime cost and `./warnings.ts`
// remains the single source of truth for `X12ParseWarning`.
import type { X12Segment } from "./segment.js";
import type { X12ParseWarning } from "./warnings.js";

/**
 * Positional context attached to every warning and fatal error. Fields are
 * 1-indexed against the X12 spec convention (interchange first, then group,
 * then transaction, then segment, then element within that segment, then
 * component within that element).
 *
 * All fields past `segmentIndex` are optional — for a top-level fatal like
 * `X12_EMPTY_INPUT` only `segmentIndex: 0` is populated; for a per-element
 * warning deep inside a transaction every field may be set.
 *
 * @remarks
 * With `exactOptionalPropertyTypes: true`, do not pass `interchangeIndex:
 * undefined` explicitly — omit the key instead.
 *
 * @example
 * ```ts
 * import type { X12Position } from "@cosyte/x12";
 * const pos: X12Position = { segmentIndex: 0, interchangeIndex: 0 };
 * ```
 */
export interface X12Position {
  readonly segmentIndex: number;
  readonly interchangeIndex?: number;
  readonly groupIndex?: number;
  readonly transactionIndex?: number;
  readonly elementIndex?: number;
  readonly componentIndex?: number;
  readonly repetitionIndex?: number;
}

/**
 * Callback invoked inline each time the parser emits a Tier-2 warning.
 * Always fires BEFORE the warning is appended to `X12Interchange.warnings`
 * so consumers observe warnings in the same order the parser discovered them.
 *
 * @example
 * ```ts
 * import { parseX12, type OnWarningCallback } from "@cosyte/x12";
 * const onWarning: OnWarningCallback = (w) => {
 *   console.warn(w.code, w.message);
 * };
 * parseX12(raw, { onWarning });
 * ```
 */
export type OnWarningCallback = (warning: X12ParseWarning) => void;

/**
 * Options accepted by `parseX12` to tune lenient/strict behaviour. Every
 * field is optional; `parseX12(raw, {})` is valid and produces the library
 * defaults.
 *
 * @remarks
 * With `exactOptionalPropertyTypes: true`, callers cannot pass
 * `{ strict: undefined }` — either omit the key or pass a boolean.
 *
 * @example
 * ```ts
 * import { parseX12, type X12ParseOptions } from "@cosyte/x12";
 * const opts: X12ParseOptions = {
 *   strict: true,
 *   onWarning: (w) => console.warn(w.code),
 * };
 * parseX12(raw, opts);
 * ```
 */
export interface X12ParseOptions {
  readonly strict?: boolean;
  readonly onWarning?: OnWarningCallback;
}

/**
 * The four X12 delimiter classes discovered from fixed byte positions inside
 * the ISA envelope. Phase 1 detects all four from the ISA itself — they are
 * NEVER assumed (in particular, `component` is rarely `:` outside Medicare).
 *
 * - `element` — ISA byte 4 (1-indexed); separates the 16 ISA elements.
 * - `repetition` — ISA-11 (byte 83, 1-indexed); separates repetitions inside
 *   an element. Carries the legacy Control Standards Identifier
 *   (typically `U`) for pre-005010 inputs; Phase 1 surfaces it verbatim.
 * - `component` — ISA-16 (byte 105, 1-indexed); separates sub-elements of a
 *   composite. Real-world senders use `:`, `\\`, `^`, `|`, and more.
 * - `segment` — the byte immediately after ISA-16 (byte 106, 1-indexed);
 *   terminates each segment. Typically `~`, often followed by optional
 *   `\r\n` which is silently tolerated.
 *
 * @example
 * ```ts
 * import type { Delimiters } from "@cosyte/x12";
 * const medicare: Delimiters = {
 *   element: "*",
 *   repetition: "^",
 *   component: ":",
 *   segment: "~",
 * };
 * ```
 */
export interface Delimiters {
  readonly element: string;
  readonly repetition: string;
  readonly component: string;
  readonly segment: string;
}

/**
 * The decoded ISA interchange header. `raw` preserves the exact 106-byte
 * ISA + terminator string from input so round-trip serialization is
 * byte-exact regardless of any lenient normalization downstream. `elements`
 * is the 16 ISA values, 1-indexed (`elements[0]` is the literal `"ISA"`
 * name placeholder, `elements[1]` is ISA-01, ..., `elements[16]` is ISA-16).
 *
 * @example
 * ```ts
 * import type { IsaSegment } from "@cosyte/x12";
 * declare const isa: IsaSegment;
 * isa.elements[12]; // ISA-12 — version, expected "00501"
 * isa.elements[13]; // ISA-13 — interchange control number
 * ```
 */
export interface IsaSegment {
  readonly raw: string;
  readonly elements: readonly string[];
}

/**
 * The decoded IEA interchange trailer. `raw` is the exact segment string
 * (without the segment terminator) and `elements` is the IEA values,
 * 1-indexed (`elements[0]` = `"IEA"`, `elements[1]` = IEA-01 group count,
 * `elements[2]` = IEA-02 interchange control number — must match ISA-13).
 *
 * @example
 * ```ts
 * import type { IeaSegment } from "@cosyte/x12";
 * declare const iea: IeaSegment;
 * iea.elements[2]; // IEA-02 — must equal ISA-13
 * ```
 */
export interface IeaSegment {
  readonly raw: string;
  readonly elements: readonly string[];
}

/**
 * The decoded GS functional group header. `elements[0]` = `"GS"`,
 * `elements[1]` = GS-01 functional ID code (`HC` for claims, `HP` for
 * remittance, etc.), `elements[6]` = GS-06 group control number (must match
 * GE-02), `elements[8]` = GS-08 version (e.g. `005010X222A2`).
 *
 * @example
 * ```ts
 * import type { GsSegment } from "@cosyte/x12";
 * declare const gs: GsSegment;
 * gs.elements[1]; // GS-01 — functional ID code
 * gs.elements[6]; // GS-06 — group control number
 * ```
 */
export interface GsSegment {
  readonly raw: string;
  readonly elements: readonly string[];
}

/**
 * The decoded GE functional group trailer. `elements[0]` = `"GE"`,
 * `elements[1]` = GE-01 transaction count (must equal the number of ST/SE
 * pairs inside this group), `elements[2]` = GE-02 group control number
 * (must equal GS-06).
 *
 * @example
 * ```ts
 * import type { GeSegment } from "@cosyte/x12";
 * declare const ge: GeSegment;
 * ge.elements[2]; // GE-02 — must equal GS-06
 * ```
 */
export interface GeSegment {
  readonly raw: string;
  readonly elements: readonly string[];
}

/**
 * A decoded envelope-level TA1 Interchange Acknowledgment segment. TA1 is
 * NOT a transaction set — per the ASC X12 standard it lives at the envelope
 * level, between ISA and the first GS, or alone inside an ISA..IEA with no
 * GS at all (a TA1-only interchange). One interchange may carry multiple
 * TA1 segments, each acknowledging a prior inbound interchange.
 *
 * `elements[0]` = `"TA1"`; `elements[1]` = TA1-01 (echoes the prior
 * interchange's ISA-13 control number); `elements[2]` = TA1-02 (interchange
 * date YYMMDD, echoes ISA-09); `elements[3]` = TA1-03 (interchange time
 * HHMM, echoes ISA-10); `elements[4]` = TA1-04 (Interchange Acknowledgment
 * Code, code list I13: `A` accepted, `E` accepted with errors, `R`
 * rejected); `elements[5]` = TA1-05 (Interchange Note Code, code list I18,
 * `000`–`028+`).
 *
 * The Phase 3 envelope walker captures TA1 segments here verbatim; the
 * typed-ack model is built on top by `parseTA1`. TA1 contains only
 * structural control / disposition codes — by spec it carries NO PHI.
 *
 * @example
 * ```ts
 * import type { Ta1Segment } from "@cosyte/x12";
 * declare const ta1: Ta1Segment;
 * ta1.elements[1]; // TA1-01 — echoes inbound ISA-13
 * ta1.elements[4]; // TA1-04 — "A" | "E" | "R"
 * ```
 */
export interface Ta1Segment {
  readonly raw: string;
  readonly elements: readonly string[];
}

/**
 * A single ST..SE transaction set inside a functional group. Phase 2
 * decodes every body segment via {@link "./segment.js".decodeSegment} so
 * `segments` carries typed {@link X12Segment} entries (ST through SE,
 * inclusive). `rawSegments` mirrors the same list as the verbatim raw
 * segment strings (terminator stripped) so a byte-exact round-trip survives
 * any downstream consumer that needs to re-emit the source.
 *
 * `elements` on the ST and SE segments themselves IS decoded at envelope
 * time so envelope invariants can be checked (ST-02 ↔ SE-02 control-number
 * reconciliation, SE-01 segment count).
 *
 * @example
 * ```ts
 * import type { X12TransactionSet } from "@cosyte/x12";
 * declare const tx: X12TransactionSet;
 * tx.st.elements[1];             // ST-01 — transaction set ID (e.g. "835")
 * tx.segments[1]?.id;            // first body segment id
 * tx.rawSegments[1];             // first body segment raw text
 * ```
 */
export interface X12TransactionSet {
  readonly st: { readonly raw: string; readonly elements: readonly string[] };
  readonly se: { readonly raw: string; readonly elements: readonly string[] } | undefined;
  readonly segments: readonly X12Segment[];
  readonly rawSegments: readonly string[];
}

/**
 * A single GS..GE functional group inside an interchange. `transactions`
 * is the ordered list of ST..SE transaction sets inside it (opaque bodies
 * at Phase 1 — see {@link X12TransactionSet}).
 *
 * @example
 * ```ts
 * import type { X12FunctionalGroup } from "@cosyte/x12";
 * declare const group: X12FunctionalGroup;
 * group.gs.elements[1]; // GS-01 — functional ID code
 * group.transactions.length;
 * ```
 */
export interface X12FunctionalGroup {
  readonly gs: GsSegment;
  readonly ge: GeSegment | undefined;
  readonly transactions: readonly X12TransactionSet[];
}

/**
 * The top-level X12 interchange returned by `parseX12`. `isa` carries the
 * envelope header verbatim; `delimiters` is the four-class delimiter set
 * detected from fixed positions inside `isa.raw`; `groups` is the ordered
 * GS..GE list; `warnings` accumulates every Tier-2 deviation observed
 * during the parse (lenient mode); `trailingBytes` (when present) is any
 * non-empty content after IEA — preserved verbatim so a consumer can
 * inspect or re-emit it.
 *
 * @example
 * ```ts
 * import { parseX12 } from "@cosyte/x12";
 * const ix = parseX12(raw);
 * for (const w of ix.warnings) console.warn(w.code, w.position);
 * ```
 */
export interface X12Interchange {
  readonly isa: IsaSegment;
  readonly iea: IeaSegment | undefined;
  readonly delimiters: Delimiters;
  readonly groups: readonly X12FunctionalGroup[];
  readonly ta1Segments: readonly Ta1Segment[];
  readonly warnings: readonly X12ParseWarning[];
  readonly trailingBytes?: string;
}
