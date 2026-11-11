/**
 * Code-list registries for the X12 acknowledgment surface (999 + TA1).
 *
 * Every code list here is an {@link https://x12.org/codes ASC X12 standard
 * code list} used by the 999 (005010X231A1) or by the TA1. We carry the code
 * values alone, without their published definitions; the note beside each
 * says what the code makes this library do. The registries are FROZEN
 * string-literal unions so
 * consumers narrow exhaustively on `disposition: X12AckDispositionCode`
 * and the like - adding a code is an additive public-surface change; a
 * rename is breaking (locked by the warning/code-snapshot tripwires).
 *
 * Per the cosyte parser archetype, every code list is **structural** -
 * control numbers, segment IDs, position counters, error-condition codes.
 * **Acknowledgments carry no PHI by design.** This is the safety property
 * that makes the "library mechanically builds the disposition it is told"
 * pattern safe.
 */

/**
 * AK9-01 (functional group) + IK5-01 (transaction set) disposition codes.
 * Sourced from ASC X12 code list 715. The implementation acknowledges the
 * inbound functional group / transaction set with one of these dispositions;
 * the LIBRARY does not decide accept-vs-reject - the application does.
 * `build999` / `buildTA1` MECHANICALLY build the cited disposition; a
 * fabricated `A` against a non-empty error list is a bug and refused at
 * build time (see {@link "./errors.js".AckBuildError}).
 *
 * - `A` - {@link isAcceptDisposition} answers `true`; `build999` refuses it
 *   beside a non-empty error list.
 * - `E` - {@link isAcceptDisposition} answers `true`.
 * - `P` - {@link isAcceptDisposition} answers `true`.
 * - `R` - {@link isAcceptDisposition} answers `false`.
 * - `M` - {@link isAcceptDisposition} answers `false`.
 * - `W` - {@link isAcceptDisposition} answers `false`.
 * - `X` - {@link isAcceptDisposition} answers `false`.
 *
 * @example
 * ```ts
 * import type { X12AckDispositionCode } from "@cosyte/x12";
 * const accept: X12AckDispositionCode = "A";
 * ```
 */
export const X12_ACK_DISPOSITION_CODES = {
  A: "A",
  E: "E",
  P: "P",
  R: "R",
  M: "M",
  W: "W",
  X: "X",
} as const;

/**
 * String-literal union over {@link X12_ACK_DISPOSITION_CODES}. Used as the
 * type of `AK9-01`, `IK5-01`, and the `disposition` field on the
 * ack-spec/parsed-ack models.
 *
 * @example
 * ```ts
 * import type { X12AckDispositionCode } from "@cosyte/x12";
 * function isReject(code: X12AckDispositionCode): boolean {
 *   return code === "R" || code === "M" || code === "W" || code === "X";
 * }
 * ```
 */
export type X12AckDispositionCode =
  (typeof X12_ACK_DISPOSITION_CODES)[keyof typeof X12_ACK_DISPOSITION_CODES];

/**
 * AK5-01 transaction set disposition codes of the 997 Functional
 * Acknowledgment, ASC X12 code list 717. The six codes code list 715 shares
 * with it, without `P`: partial acceptance is a functional group outcome, so
 * a 997 states it at AK9-01 and never for one transaction set. AK9-01 of a
 * 997 takes the seven codes of {@link X12_ACK_DISPOSITION_CODES}.
 *
 * Code values only, carried as the base standard spells them; no guide
 * table is bundled.
 *
 * @example
 * ```ts
 * import { X12_997_SET_DISPOSITION_CODES, type X12Ack997SetDispositionCode } from "@cosyte/x12";
 * const rejected: X12Ack997SetDispositionCode = X12_997_SET_DISPOSITION_CODES.R;
 * ```
 */
export const X12_997_SET_DISPOSITION_CODES = {
  A: "A",
  E: "E",
  M: "M",
  R: "R",
  W: "W",
  X: "X",
} as const;

/**
 * String-literal union over {@link X12_997_SET_DISPOSITION_CODES}: the type
 * of AK5-01 on a 997.
 *
 * @example
 * ```ts
 * import type { X12Ack997SetDispositionCode } from "@cosyte/x12";
 * const accepted: X12Ack997SetDispositionCode = "A";
 * ```
 */
export type X12Ack997SetDispositionCode =
  (typeof X12_997_SET_DISPOSITION_CODES)[keyof typeof X12_997_SET_DISPOSITION_CODES];

/**
 * The four disposition codes that flag rejection - `R`, `M`, `W`, `X`. A
 * disposition NOT in this set (`A`, `E`, `P`) is some form of acceptance.
 * Used by the build-time safety guard to refuse a fabricated accept
 * against a non-empty error list.
 *
 * @internal
 */
const ACCEPT_DISPOSITIONS = new Set<X12AckDispositionCode>(["A", "E", "P"]);

/**
 * True when the supplied disposition is some form of "accept" (`A`, `E`,
 * `P`) rather than reject (`R`, `M`, `W`, `X`). Used by the build-time
 * safety guard and by consumer code that wants a yes/no on the inbound.
 *
 * @example
 * ```ts
 * import { isAcceptDisposition } from "@cosyte/x12";
 * isAcceptDisposition("A"); // true
 * isAcceptDisposition("R"); // false
 * ```
 */
export function isAcceptDisposition(code: X12AckDispositionCode): boolean {
  return ACCEPT_DISPOSITIONS.has(code);
}

/**
 * IK3-04 implementation segment syntax error codes (ASC X12 code list 716).
 * Cited per IK3 segment to identify the structural issue against the
 * inbound segment. The library NEVER auto-classifies - the application
 * supplies the code; the library mechanically builds the IK3 around it.
 *
 * Code values: `1`, `2`, `3`, `4`, `5`, `6`, `7`, `8`, `I4`, `I6`, `I7`, `I8`,
 * `I9`. Each one does the same thing here: `parse999` narrows IK3-04 to it,
 * and reads any other value as `undefined` (the raw segment keeps the
 * bytes); `build999` writes the code it is given.
 *
 * @example
 * ```ts
 * import type { Ik304Code } from "@cosyte/x12";
 * const required: Ik304Code = "3";
 * ```
 */
export const IK3_SYNTAX_ERROR_CODES = {
  "1": "1",
  "2": "2",
  "3": "3",
  "4": "4",
  "5": "5",
  "6": "6",
  "7": "7",
  "8": "8",
  I4: "I4",
  I6: "I6",
  I7: "I7",
  I8: "I8",
  I9: "I9",
} as const;

/**
 * String-literal union over {@link IK3_SYNTAX_ERROR_CODES}. Used as the
 * type of `IK3-04` on the ack-spec/parsed-ack models.
 */
export type Ik304Code = (typeof IK3_SYNTAX_ERROR_CODES)[keyof typeof IK3_SYNTAX_ERROR_CODES];

/**
 * IK4-03 implementation data element syntax error codes (ASC X12 code list
 * 723). Cited per IK4 segment to identify the issue against the inbound
 * element/component/repetition.
 *
 * Code values: `1`, `2`, `3`, `4`, `5`, `6`, `7`, `8`, `9`, `10`, `12`, `13`,
 * `I6`, `I9`, `I10`, `I11`, `I12`, `I13`. Each one does the same thing here:
 * `parse999` narrows IK4-03 to it, and reads any other value as `undefined`
 * (the raw segment keeps the bytes); `build999` writes the code it is given.
 *
 * @example
 * ```ts
 * import type { Ik403Code } from "@cosyte/x12";
 * const tooShort: Ik403Code = "4";
 * ```
 */
export const IK4_SYNTAX_ERROR_CODES = {
  "1": "1",
  "2": "2",
  "3": "3",
  "4": "4",
  "5": "5",
  "6": "6",
  "7": "7",
  "8": "8",
  "9": "9",
  "10": "10",
  "12": "12",
  "13": "13",
  I6: "I6",
  I9: "I9",
  I10: "I10",
  I11: "I11",
  I12: "I12",
  I13: "I13",
} as const;

/**
 * String-literal union over {@link IK4_SYNTAX_ERROR_CODES}. Used as the
 * type of `IK4-03` on the ack-spec/parsed-ack models.
 */
export type Ik403Code = (typeof IK4_SYNTAX_ERROR_CODES)[keyof typeof IK4_SYNTAX_ERROR_CODES];

/**
 * TA1-04 interchange acknowledgment code (ASC X12 code list I13). Three
 * values: `A` accepted, `E` accepted with errors, `R` rejected. Distinct
 * from the 999 disposition (no `M`/`W`/`X` here - TA1 covers only the
 * interchange envelope, not crypto failures of contained groups).
 *
 * @example
 * ```ts
 * import type { Ta1AckCode } from "@cosyte/x12";
 * const accept: Ta1AckCode = "A";
 * ```
 */
export const TA1_ACK_CODES = {
  A: "A",
  E: "E",
  R: "R",
} as const;

/** String-literal union over {@link TA1_ACK_CODES}. */
export type Ta1AckCode = (typeof TA1_ACK_CODES)[keyof typeof TA1_ACK_CODES];

/**
 * TA1-05 interchange note code (ASC X12 code list I18). Codes `000` to `028`
 * are defined by the standard; values past `028` exist in some standard
 * revisions and are accepted on parse (Postel's Law) but not enumerated
 * here - the parsed model carries the un-narrowed string on `noteCodeRaw`,
 * post-`?`-unescape as of a later release. **A clause here said "verbatim"
 * and is deleted rather than reworded**; `raw.elements[5]` is the byte surface.
 *
 * `000` is the canonical "no error" note paired with a `TA1-04 == 'A'`
 * acceptance. The build-time safety guard refuses a fabricated `A` paired
 * with any non-`000` note (see {@link "./errors.js".AckBuildError}).
 *
 * Standard-issued values, `000` to `028`:
 * - `000` - the one note `buildTA1` accepts beside TA1-04 `A`.
 * - `001` to `028` - `parseTA1` narrows TA1-05 to the value; `buildTA1`
 *   refuses any of them beside TA1-04 `A`.
 *
 * @example
 * ```ts
 * import { TA1_NOTE_CODES, type Ta1NoteCode } from "@cosyte/x12";
 * const noError: Ta1NoteCode = TA1_NOTE_CODES["000"];
 * ```
 */
export const TA1_NOTE_CODES = {
  "000": "000",
  "001": "001",
  "002": "002",
  "003": "003",
  "004": "004",
  "005": "005",
  "006": "006",
  "007": "007",
  "008": "008",
  "009": "009",
  "010": "010",
  "011": "011",
  "012": "012",
  "013": "013",
  "014": "014",
  "015": "015",
  "016": "016",
  "017": "017",
  "018": "018",
  "019": "019",
  "020": "020",
  "021": "021",
  "022": "022",
  "023": "023",
  "024": "024",
  "025": "025",
  "026": "026",
  "027": "027",
  "028": "028",
} as const;

/**
 * String-literal union over {@link TA1_NOTE_CODES} - the standard-issued
 * note codes `000` to `028`. Real-world inbound TA1 may carry a value past
 * `028` (some revisions extend the list); `parseTA1` exposes the
 * un-narrowed string on `noteCodeRaw` in that case, so the value survives
 * even when the union cannot statically type it. **It is post-`?`-unescape
 * as of a later release, and a clause here calling it VERBATIM is
 * deleted rather than reworded** - `raw.elements[5]` is the byte surface.
 */
export type Ta1NoteCode = (typeof TA1_NOTE_CODES)[keyof typeof TA1_NOTE_CODES];
