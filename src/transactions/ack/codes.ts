/**
 * Code-list registries for the X12 acknowledgment surface (999 + TA1).
 *
 * Every code list here is a {@link https://x12.org/codes ASC X12 standard
 * code list} cited by TR3 005010X231A1 (999) or by the ASC X12 standard
 * itself (TA1). The registries are FROZEN string-literal unions so
 * consumers narrow exhaustively on `disposition: X12AckDispositionCode`
 * and the like — adding a code is an additive public-surface change; a
 * rename is breaking (locked by the warning/code-snapshot tripwires).
 *
 * Per the cosyte parser archetype, every code list is **structural** —
 * control numbers, segment IDs, position counters, error-condition codes.
 * **Acknowledgments carry no PHI by design.** This is the safety property
 * that makes the "library mechanically builds the disposition it is told"
 * pattern safe.
 */

/**
 * AK9-01 (functional group) + IK5-01 (transaction set) disposition codes.
 * Sourced from ASC X12 code list 715. The implementation acknowledges the
 * inbound functional group / transaction set with one of these dispositions;
 * the LIBRARY does not decide accept-vs-reject — the application does.
 * `build999` / `buildTA1` MECHANICALLY build the cited disposition; a
 * fabricated `A` against a non-empty error list is a bug and refused at
 * build time (see {@link "./errors.js".AckBuildError}).
 *
 * - `A` — Accepted.
 * - `E` — Accepted, but errors were noted.
 * - `P` — Partially accepted: at least one transaction set was rejected
 *   while the functional group as a whole was accepted.
 * - `R` — Rejected.
 * - `M` — Rejected: message authentication code (MAC) failed.
 * - `W` — Rejected: assurance failed validity tests.
 * - `X` — Rejected: content after decryption could not be analyzed.
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
 * The four disposition codes that flag rejection — `R`, `M`, `W`, `X`. A
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
 * inbound segment. The library NEVER auto-classifies — the application
 * supplies the code; the library mechanically builds the IK3 around it.
 *
 * - `1` — Unrecognized segment ID.
 * - `2` — Unexpected segment.
 * - `3` — Required segment missing.
 * - `4` — Loop occurs over maximum times.
 * - `5` — Segment exceeds maximum use.
 * - `6` — Segment not in defined transaction set.
 * - `7` — Segment not in proper sequence.
 * - `8` — Segment has data element errors.
 * - `I4` — Implementation "Not Used" segment present.
 * - `I6` — Implementation dependent segment missing.
 * - `I7` — Implementation loop occurs under minimum times.
 * - `I8` — Implementation segment below minimum use.
 * - `I9` — Implementation dependent "Not Used" segment present.
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
 * - `1` — Required data element missing.
 * - `2` — Conditional required data element missing.
 * - `3` — Too many data elements.
 * - `4` — Data element too short.
 * - `5` — Data element too long.
 * - `6` — Invalid character in data element.
 * - `7` — Invalid code value.
 * - `8` — Invalid date.
 * - `9` — Invalid time.
 * - `10` — Exclusion condition violated.
 * - `12` — Too many repetitions.
 * - `13` — Too many components.
 * - `I6` — Code value not used in implementation.
 * - `I9` — Implementation dependent data element missing.
 * - `I10` — Implementation "Not Used" data element present.
 * - `I11` — Implementation too few repetitions.
 * - `I12` — Implementation pattern match failure.
 * - `I13` — Implementation dependent "Not Used" data element present.
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
 * from the 999 disposition (no `M`/`W`/`X` here — TA1 covers only the
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
 * TA1-05 interchange note code (ASC X12 code list I18). Codes `000`–`028`
 * are defined by the standard; values past `028` exist in some standard
 * revisions and are accepted on parse (Postel's Law) but not enumerated
 * here — the parsed model carries the raw string for verbatim preservation.
 *
 * `000` is the canonical "no error" note paired with a `TA1-04 == 'A'`
 * acceptance. The build-time safety guard refuses a fabricated `A` paired
 * with any non-`000` note (see {@link "./errors.js".AckBuildError}).
 *
 * Standard-issued values:
 * - `000` — No error.
 * - `001` — Interchange Control Number in the Header and Trailer do not match.
 * - `002` — Standard as noted in the Control Standards Identifier is not supported.
 * - `003` — Version of the controls is not supported.
 * - `004` — Segment Terminator is invalid.
 * - `005` — Invalid Interchange ID Qualifier for Sender.
 * - `006` — Invalid Interchange Sender ID.
 * - `007` — Invalid Interchange ID Qualifier for Receiver.
 * - `008` — Invalid Interchange Receiver ID.
 * - `009` — Unknown Interchange Receiver ID.
 * - `010` — Invalid Authorization Information Qualifier value.
 * - `011` — Invalid Authorization Information value.
 * - `012` — Invalid Security Information Qualifier value.
 * - `013` — Invalid Security Information value.
 * - `014` — Invalid Interchange Date value.
 * - `015` — Invalid Interchange Time value.
 * - `016` — Invalid Interchange Standards Identifier value.
 * - `017` — Invalid Interchange Version ID value.
 * - `018` — Invalid Interchange Control Number value.
 * - `019` — Invalid Acknowledgment Requested value.
 * - `020` — Invalid Test Indicator value.
 * - `021` — Invalid Number of Included Groups value.
 * - `022` — Invalid Control Structure.
 * - `023` — Improper (premature) end-of-file (transmission).
 * - `024` — Invalid Interchange Content (e.g., invalid GS segment).
 * - `025` — Duplicate Interchange Control Number.
 * - `026` — Invalid Data Element Separator.
 * - `027` — Invalid Component Element Separator.
 * - `028` — Invalid Delivery Date in Deferred Delivery Request.
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
 * String-literal union over {@link TA1_NOTE_CODES} — the standard-issued
 * note codes `000`–`028`. Real-world inbound TA1 may carry a value past
 * `028` (some revisions extend the list); `parseTA1` exposes the raw
 * string in that case so the verbatim value survives even when the union
 * cannot statically type it.
 */
export type Ta1NoteCode = (typeof TA1_NOTE_CODES)[keyof typeof TA1_NOTE_CODES];
