/**
 * X12 release-character (`?`) escape handling for the `@cosyte/x12` parser
 * pipeline. ASC X12 §"Release Character" reserves a single character to
 * suppress the special meaning of the next delimiter. In HIPAA 005010 it is
 * conventionally `?`: `?~` is a literal `~`, `?*` a literal `*`, and `??` a
 * literal `?`. The release character itself is NOT transmitted as a fifth
 * ISA-level delimiter — its slot in the standard is informational and most
 * 005010 traffic omits release sequences entirely, so the parser keeps `?`
 * hardcoded as the conventional release character and only consumes it when
 * the next byte is one of the four detected delimiters or another `?`.
 *
 * Postel's Law applies: an isolated `?` followed by a non-delimiter (e.g.
 * `?A`) is preserved verbatim — the spec leaves this case ambiguous and the
 * most defensible behavior is to keep the bytes the sender sent. A trailing
 * `?` with nothing after (a dangling release character at end-of-input or
 * end-of-element) is preserved verbatim AND warned (Tier-2
 * `X12_DANGLING_RELEASE_CHAR`) so consumers can flag truncated input.
 *
 * The pair `{ unescapeRelease, escapeRelease }` is bijective on inputs that
 * either contain no release-relevant characters OR are already a clean
 * round-trip — this gives the Phase 2 lossless round-trip property: for any
 * value `v` and delimiter set `d`, `unescapeRelease(escapeRelease(v, d), d)`
 * deep-equals `v`.
 */

import type { Delimiters } from "./types.js";
import type { X12Position } from "./types.js";
import { danglingReleaseChar, type X12ParseWarning } from "./warnings.js";

/**
 * The release character is conventionally `?` per ASC X12; HIPAA 005010
 * does not transmit it as a fifth ISA delimiter. The library accepts `?` as
 * the universal release character — a non-`?` release sequence has never
 * been observed in real-world US healthcare X12 traffic. If a future
 * consumer needs a different release character, the constant is `as const`
 * so a parameterized variant can be added without breaking the public API.
 *
 * @example
 * ```ts
 * import { RELEASE_CHAR } from "@cosyte/x12";
 * // `?~` is an escaped segment terminator inside a value, not a real one:
 * "PER*IC*ACME?~BILLING".includes(RELEASE_CHAR); // true
 * ```
 *
 * @internal
 */
export const RELEASE_CHAR = "?" as const;

/**
 * Reverse a single X12 release-character escape sequence. Consumes `?` plus
 * its target byte when the target is one of the four detected delimiters or
 * another `?`; preserves the `?` verbatim when the target is anything else
 * (Postel's-Law tolerance — the spec leaves the `?A` case ambiguous and
 * preserving the bytes is the most defensible behavior).
 *
 * Emits a single Tier-2 `X12_DANGLING_RELEASE_CHAR` warning when the input
 * ends with a bare `?` (no target byte to escape) — the bytes are preserved
 * verbatim so round-trip is still byte-exact.
 *
 * @example
 * ```ts
 * import { unescapeRelease } from "@cosyte/x12";
 * const d = { element: "*", repetition: "^", component: ":", segment: "~" };
 * unescapeRelease("a?~b", d, () => {}, { segmentIndex: 0 }); // "a~b"
 * unescapeRelease("a??b", d, () => {}, { segmentIndex: 0 }); // "a?b"
 * unescapeRelease("a?Xb", d, () => {}, { segmentIndex: 0 }); // "a?Xb" (preserved)
 * ```
 */
export function unescapeRelease(
  input: string,
  delimiters: Delimiters,
  emit: (w: X12ParseWarning) => void,
  position: X12Position,
): string {
  if (!input.includes(RELEASE_CHAR)) return input;
  let out = "";
  let i = 0;
  while (i < input.length) {
    const ch = input.charAt(i);
    if (ch !== RELEASE_CHAR) {
      out += ch;
      i += 1;
      continue;
    }
    if (i + 1 === input.length) {
      emit(danglingReleaseChar(position));
      out += RELEASE_CHAR;
      break;
    }
    const next = input.charAt(i + 1);
    if (
      next === delimiters.element ||
      next === delimiters.repetition ||
      next === delimiters.component ||
      next === delimiters.segment ||
      next === RELEASE_CHAR
    ) {
      out += next;
      i += 2;
    } else {
      out += RELEASE_CHAR;
      i += 1;
    }
  }
  return out;
}

/**
 * Apply X12 release-character escapes to a value so it can be emitted
 * inside a segment without ambiguity. Every occurrence of the four
 * delimiters (or the release character itself) is preceded by `?`; other
 * bytes pass through verbatim. The companion to {@link unescapeRelease}.
 *
 * @example
 * ```ts
 * import { escapeRelease } from "@cosyte/x12";
 * const d = { element: "*", repetition: "^", component: ":", segment: "~" };
 * escapeRelease("ab~cd*ef:gh", d); // "ab?~cd?*ef?:gh"
 * escapeRelease("a?b", d);          // "a??b"
 * ```
 */
export function escapeRelease(value: string, delimiters: Delimiters): string {
  if (value.length === 0) return value;
  let out = "";
  for (let i = 0; i < value.length; i++) {
    const ch = value.charAt(i);
    if (
      ch === delimiters.element ||
      ch === delimiters.repetition ||
      ch === delimiters.component ||
      ch === delimiters.segment ||
      ch === RELEASE_CHAR
    ) {
      out += RELEASE_CHAR + ch;
    } else {
      out += ch;
    }
  }
  return out;
}

/**
 * Split a string by `sep`, honouring the `?`-release-character escape so
 * an escaped separator (`?sep`) is treated as part of the surrounding token.
 * Dangling-release warnings are NOT emitted here — the caller (which knows
 * the right positional context) re-runs {@link unescapeRelease} on each
 * resulting token to surface them.
 *
 * @internal
 */
export function splitWithRelease(input: string, sep: string): string[] {
  if (input.length === 0) return [""];
  if (sep.length !== 1) return input.split(sep);
  if (!input.includes(sep)) return [input];
  const out: string[] = [];
  let buf = "";
  let i = 0;
  while (i < input.length) {
    const ch = input.charAt(i);
    if (ch === RELEASE_CHAR && i + 1 < input.length) {
      buf += ch + input.charAt(i + 1);
      i += 2;
      continue;
    }
    if (ch === sep) {
      out.push(buf);
      buf = "";
      i += 1;
      continue;
    }
    buf += ch;
    i += 1;
  }
  out.push(buf);
  return out;
}
