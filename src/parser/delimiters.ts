/**
 * ISA delimiter-detection stage for the `@cosyte/x12` parser pipeline.
 * Reads the four delimiters from FIXED byte positions inside the ISA
 * envelope (per ASC X12 .5, Interchange Control Structures) and throws a
 * Tier-3 `X12ParseError` if the structural preconditions fail. Downstream
 * stages (`envelope.ts`) consume the returned {@link Delimiters} verbatim
 * and NEVER assume any delimiter — in particular the component separator
 * (ISA-16) is rarely `:` outside Medicare; clearinghouses commonly use
 * `\`, `^`, or `|`.
 *
 * Three of the four Tier-3 fatal codes originate here —
 * `X12_NO_ISA_HEADER`, `X12_ISA_TOO_SHORT`, `X12_INVALID_DELIMITERS`. The
 * fourth, `X12_EMPTY_INPUT`, is owned by the top-level `parseX12` entry.
 */

import { FATAL_CODES, X12ParseError, snippet } from "./errors.js";
import type { Delimiters } from "./types.js";

/**
 * Minimum number of bytes a valid ISA segment occupies. ASC X12 .5 fixes
 * the ISA at 106 bytes total, **including** the trailing segment
 * terminator: 3 ("ISA") + 16 element separators + 86 element-value bytes
 * (sum of fixed widths 2+10+2+10+2+15+2+15+6+4+1+5+9+1+1+1) + 1
 * terminator = 106. Anything shorter cannot carry the 16 ISA elements and
 * is Tier-3 `X12_ISA_TOO_SHORT`.
 *
 * @example
 * ```ts
 * import { ISA_MIN_LENGTH } from "@cosyte/x12";
 * ISA_MIN_LENGTH; // 106 — a raw interchange shorter than this is X12_ISA_TOO_SHORT
 * ```
 */
export const ISA_MIN_LENGTH = 106;

/**
 * Zero-indexed byte positions of the four delimiter classes inside the
 * 106-byte ISA. Locked by ASC X12 .5; do NOT make these configurable.
 *
 * - `element` at byte 3 — the byte immediately after the literal `"ISA"`.
 * - `repetition` at byte 82 — ISA-11 (the Control Standards Identifier
 *   slot, repurposed as the repetition separator in 005010+).
 * - `component` at byte 104 — ISA-16 (the LAST element).
 * - `segment` at byte 105 — the byte immediately after ISA-16.
 *
 * @example
 * ```ts
 * import { DELIMITER_POSITIONS } from "@cosyte/x12";
 * // The element separator is always the 4th byte of a well-formed ISA:
 * raw.charAt(DELIMITER_POSITIONS.element); // e.g. "*"
 * ```
 *
 * @internal
 */
export const DELIMITER_POSITIONS = {
  element: 3,
  repetition: 82,
  component: 104,
  segment: 105,
} as const;

/**
 * Detect the four X12 delimiters from a raw input string by reading fixed
 * byte positions inside the ISA envelope. Validates that:
 *
 * - the input is at least {@link ISA_MIN_LENGTH} bytes (else
 *   `X12_ISA_TOO_SHORT`),
 * - the input begins with the literal `"ISA"` (else `X12_NO_ISA_HEADER`),
 * - each delimiter is a single visible (non-whitespace, non-control)
 *   character and the four are mutually distinct (else
 *   `X12_INVALID_DELIMITERS`),
 * - the detected element separator actually appears at every fixed ISA
 *   element-separator position (else `X12_INVALID_DELIMITERS`) — guards
 *   against an input that begins with `"ISA"` followed by structurally
 *   wrong bytes (e.g. a tab as element separator with `:` further in).
 *
 * Phase 1 is liberal in what it accepts AFTER the ISA — downstream
 * envelope walking emits Tier-2 warnings rather than throwing. But the
 * ISA itself MUST be structurally readable; otherwise no later stage has
 * a delimiter set to work with.
 *
 * @example
 * ```ts
 * import { detectDelimiters } from "@cosyte/x12";
 * const d = detectDelimiters("ISA*00*          *00*          *ZZ*SENDER         *ZZ*RECEIVER       *250101*1200*^*00501*000000001*0*P*:~GS*HC*S*R*20250101*1200*1*X*005010X222A2~...");
 * d.element;   // "*"
 * d.repetition; // "^"
 * d.component; // ":"
 * d.segment;   // "~"
 * ```
 */
export function detectDelimiters(raw: string): Delimiters {
  const fatalPosition = { segmentIndex: 0, interchangeIndex: 0 };
  const snip = snippet(raw);

  if (raw.length < 3 || raw.slice(0, 3) !== "ISA") {
    throw new X12ParseError(
      FATAL_CODES.X12_NO_ISA_HEADER,
      "Input does not begin with an ISA segment — X12 interchanges must start with ISA.",
      fatalPosition,
      snip,
    );
  }

  if (raw.length < ISA_MIN_LENGTH) {
    throw new X12ParseError(
      FATAL_CODES.X12_ISA_TOO_SHORT,
      `ISA segment is truncated — need ${String(ISA_MIN_LENGTH)} bytes including the segment terminator, got ${String(raw.length)}.`,
      fatalPosition,
      snip,
    );
  }

  const element = raw.charAt(DELIMITER_POSITIONS.element);
  const repetition = raw.charAt(DELIMITER_POSITIONS.repetition);
  const component = raw.charAt(DELIMITER_POSITIONS.component);
  const segment = raw.charAt(DELIMITER_POSITIONS.segment);

  // Per-character predicate: visible, single-byte at the delimiter
  // position, and not whitespace/control. `noUncheckedIndexedAccess`
  // already narrows charAt() to `string`; the prior `raw.length <
  // ISA_MIN_LENGTH` guard ensures every charAt() above is in bounds and
  // returns exactly one UTF-16 code unit.
  const isValidDelimiterChar = (c: string): boolean => {
    const code = c.charCodeAt(0);
    // Reject ASCII control chars (0x00–0x1F) and DEL (0x7F).
    if (code < 0x20 || code === 0x7f) return false;
    // Reject any whitespace per Unicode property.
    if (/\s/u.test(c)) return false;
    return true;
  };

  for (const [name, ch] of [
    ["element", element],
    ["repetition", repetition],
    ["component", component],
    ["segment", segment],
  ] as const) {
    if (!isValidDelimiterChar(ch)) {
      throw new X12ParseError(
        FATAL_CODES.X12_INVALID_DELIMITERS,
        `Delimiter "${name}" at ISA byte ${String(DELIMITER_POSITIONS[name] + 1)} is whitespace, control, or empty.`,
        fatalPosition,
        snip,
      );
    }
  }

  const distinct = new Set([element, repetition, component, segment]);
  if (distinct.size !== 4) {
    throw new X12ParseError(
      FATAL_CODES.X12_INVALID_DELIMITERS,
      "Detected ISA delimiters (element, repetition, component, segment) must all be distinct.",
      fatalPosition,
      snip,
    );
  }

  // Verify the element separator actually appears at every fixed ISA
  // element-separator position — guards against an input that begins
  // with `"ISA"` followed by structurally wrong bytes. ISA has 16
  // elements, so there are 16 element separators (one before each
  // element). Positions: 3, 6, 17, 20, 31, 34, 50, 53, 69, 76, 81, 83,
  // 89, 99, 101, 103 (zero-indexed). The byte AT position 105 is the
  // segment terminator, not an element separator.
  const ELEMENT_SEP_POSITIONS = [3, 6, 17, 20, 31, 34, 50, 53, 69, 76, 81, 83, 89, 99, 101, 103];
  for (const pos of ELEMENT_SEP_POSITIONS) {
    if (raw.charAt(pos) !== element) {
      throw new X12ParseError(
        FATAL_CODES.X12_INVALID_DELIMITERS,
        `Element separator "${element}" was detected at ISA byte 4 but is missing at fixed ISA byte ${String(pos + 1)} — ISA element layout is not 005010-conformant.`,
        fatalPosition,
        snip,
      );
    }
  }

  return { element, repetition, component, segment };
}
